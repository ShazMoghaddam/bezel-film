#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { basename, dirname, extname, join } from "node:path";
import { estimateFilmSeconds, validateFilm } from "./spec/validate.js";

const HELP = `Bezel Film: make short films in code.

Usage
  bezel-film validate <film.json>   Check a film file and show a summary
  bezel-film render <film.json>     Render the film to an MP4
  bezel-film voices                 Hear a short line in each recommended voice
  bezel-film setup                  Do the one-time downloads now (voice and browser)
  bezel-film schema                 Print the film file's JSON Schema

Options
  -o, --output <path>   Where render saves the video (default: next to the film file),
                        or where voices saves its samples (default: voice-samples)
  -h, --help            Show this help
  -v, --version         Show the version
`;

const root = new URL("..", import.meta.url);

async function readJson(path: string | URL): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf8"));
}

async function loadFilmFile(path: string | undefined): Promise<unknown> {
  if (!path) throw new UsageError("Give the path to a film file, e.g. bezel-film validate film.json");
  try {
    return await readJson(path);
  } catch (error) {
    const reason = error instanceof SyntaxError ? `is not valid JSON (${error.message})` : "could not be read";
    throw new UsageError(`${path} ${reason}`);
  }
}

class UsageError extends Error {}

function formatSeconds(seconds: number): string {
  const total = Math.round(seconds);
  return total < 60 ? `${total}s` : `${Math.floor(total / 60)}m ${String(total % 60).padStart(2, "0")}s`;
}

async function validate(path: string | undefined): Promise<number> {
  const result = validateFilm(await loadFilmFile(path));
  if (!result.ok) {
    console.error(`✗ ${path} has ${result.errors.length} problem${result.errors.length === 1 ? "" : "s"}:`);
    for (const error of result.errors) console.error(`  • ${error}`);
    return 1;
  }
  const { film } = result;
  console.log(`✓ ${path} is a valid film`);
  console.log(`  "${film.title}" · ${film.style} · ${film.format.aspect} ${film.format.resolution} ${film.format.fps}fps`);
  console.log(`  ${film.scenes.length} scenes · about ${formatSeconds(estimateFilmSeconds(film))}`);
  return 0;
}

/** One status line that rewrites itself in a terminal, or plain lines elsewhere (e.g. CI logs). */
function statusLine() {
  const tty = process.stdout.isTTY;
  let last = "";
  let lastPrinted = 0;
  return {
    update(message: string) {
      if (message === last) return;
      last = message;
      if (tty) return void process.stdout.write(`\r\x1b[2K  ${message}`);
      // In logs (e.g. CI), a line every few seconds is plenty.
      if (Date.now() - lastPrinted < 5000) return;
      lastPrinted = Date.now();
      console.log(`  ${message}`);
    },
    done() {
      if (tty && last) process.stdout.write("\r\x1b[2K");
      last = "";
    },
  };
}

async function render(path: string | undefined, output: string | undefined): Promise<number> {
  const result = validateFilm(await loadFilmFile(path));
  if (!result.ok) {
    console.error(`✗ ${path} has ${result.errors.length} problem${result.errors.length === 1 ? "" : "s"}. Run bezel-film validate ${path} to see them.`);
    return 1;
  }
  const target = output ?? join(dirname(path!), `${basename(path!, extname(path!))}.mp4`);
  const status = statusLine();
  const started = Date.now();
  console.log(`Rendering "${result.film.title}"`);
  const { renderFilm } = await import("./render/index.js");
  try {
    const done = await renderFilm(result.film, {
      output: target,
      baseDir: dirname(path!),
      onProgress: status.update,
      onWarning: (message) => {
        status.done();
        console.log(`  ! ${message}`);
      },
    });
    status.done();
    console.log(`✓ Saved ${done.output} · ${formatSeconds(done.seconds)} · rendered in ${formatSeconds((Date.now() - started) / 1000)}`);
    return 0;
  } catch (error) {
    status.done();
    throw error;
  }
}

async function voices(folder: string): Promise<number> {
  const status = statusLine();
  const { kokoroSpeaker } = await import("./render/voice.js");
  const { sampleVoices } = await import("./render/samples.js");
  const speaker = await kokoroSpeaker(status.update);
  try {
    const { files, all } = await sampleVoices({ speaker, folder, onProgress: status.update });
    status.done();
    console.log("Voice samples:");
    for (const { voice, path } of files) {
      console.log(`  ${voice.name.padEnd(8)} ${voice.gender.padEnd(7)} ${voice.accent.padEnd(9)} grade ${voice.grade.padEnd(3)} ${path}`);
    }
    const play = process.platform === "darwin" ? `open ${all}` : all;
    console.log(`\nHear them all in a row: ${play}`);
    console.log(`To use one, add it to your film file, e.g. "voice": { "voice": "${files[3]?.voice.id ?? "bf_emma"}" }`);
    return 0;
  } finally {
    status.done();
    await speaker.dispose();
  }
}

async function setup(): Promise<number> {
  const status = statusLine();
  const { installBrowser } = await import("./render/browser.js");
  const { kokoroVoice, cacheDir } = await import("./render/voice.js");
  const { findFfmpeg } = await import("./render/ffmpeg.js");
  console.log("Setting up Bezel Film. This downloads about 200 MB, once.");
  await installBrowser(status.update);
  status.done();
  console.log("  ✓ Headless browser");
  const voice = await kokoroVoice({ onProgress: status.update });
  await voice.dispose?.();
  status.done();
  console.log(`  ✓ Voice model (saved in ${cacheDir()})`);
  findFfmpeg();
  console.log("  ✓ ffmpeg");
  console.log("All set. Everything now works offline.");
  return 0;
}

async function main(argv: string[]): Promise<number> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      help: { type: "boolean", short: "h" },
      version: { type: "boolean", short: "v" },
      output: { type: "string", short: "o" },
    },
  });

  if (values.version) {
    const pkg = (await readJson(new URL("package.json", root))) as { version: string };
    console.log(pkg.version);
    return 0;
  }

  const [command, file] = positionals;
  if (values.help || !command) {
    console.log(HELP);
    return values.help ? 0 : 1;
  }

  switch (command) {
    case "validate":
      return validate(file);
    case "render":
      return render(file, values.output);
    case "setup":
      return setup();
    case "voices":
      return voices(values.output ?? "voice-samples");
    case "schema":
      console.log(JSON.stringify(await readJson(new URL("schema/film.schema.json", root)), null, 2));
      return 0;
    default:
      throw new UsageError(`Unknown command "${command}". Run bezel-film --help to see the commands.`);
  }
}

// Set the exit code and let Node finish by itself, rather than calling process.exit(),
// so native code (the voice engine) shuts down cleanly first.
main(process.argv.slice(2)).then(
  (code) => {
    process.exitCode = code;
  },
  (error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = error instanceof UsageError ? 2 : 1;
  },
);
