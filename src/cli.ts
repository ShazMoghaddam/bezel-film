#!/usr/bin/env node
import { mkdir, readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { basename, dirname, extname, join } from "node:path";
import { lengthNotes, PLATFORMS, PRESETS, readPresetList, type PresetName } from "./spec/formats.js";
import { estimateFilmSeconds, validateFilm } from "./spec/validate.js";

const HELP = `Bezel Film: make short films in code.

Usage
  bezel-film init                   Set up this folder: install, agent instructions, a welcome film
  bezel-film validate <film.json>   Check a film file and show a summary
  bezel-film render <film.json>     Render the film to an MP4
  bezel-film formats                List the platform presets, e.g. tiktok, linkedin-mobile
  bezel-film voices                 Hear a short line in each recommended voice
  bezel-film setup                  Do the one-time downloads now (browser, voice and music)
  bezel-film schema                 Print the film file's JSON Schema

Options
  -o, --output <path>   Where render saves the video (default: next to the film file),
                        or where voices saves its samples (default: voice-samples)
  --for <list>          render: make a version for each platform, e.g. tiktok,reels,x
                        (or "all"). -o is then a folder.
  --show-safe-zones     render: shade the parts each platform's app covers
  --quality high        render: true motion blur, for final versions. About five
                        times slower (default: standard)
  --no-cover            render: don't save a cover image
  -y, --yes             init: skip the questions and use the defaults
  --agents <list>       init: agents to add instructions for, e.g. claude,cursor
                        (claude, codex, gemini, cursor, copilot, windsurf)
  --no-sample           init: don't make the welcome film
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
  const preset = film.format.preset ? ` · for ${PLATFORMS[film.format.preset].label}` : "";
  console.log(`  "${film.title}" · ${film.style} · ${film.format.aspect} ${film.format.resolution} ${film.format.fps}fps${preset}`);
  const scenes = film.scenes.length;
  const seconds = estimateFilmSeconds(film);
  console.log(`  ${scenes} scene${scenes === 1 ? "" : "s"} · about ${formatSeconds(seconds)}`);
  if (film.format.preset) for (const note of lengthNotes(film.format.preset, seconds)) console.log(`  ! ${note}`);
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

function parsePresets(list: string): PresetName[] {
  const { presets, unknown } = readPresetList(list);
  if (unknown) throw new UsageError(`Unknown platform "${unknown}". Choose from: ${PRESETS.join(", ")}, or all`);
  return presets;
}

interface RenderFlags {
  output?: string;
  for?: string;
  showSafeZones: boolean;
  cover: boolean;
  quality?: string;
}

function formats(): number {
  console.log("Platform presets. Put one in your film file (\"format\": { \"preset\": \"tiktok\" })");
  console.log("or make several at once with: bezel-film render film.json --for tiktok,linkedin-mobile\n");
  const width = Math.max(...PRESETS.map((name) => name.length));
  for (const name of PRESETS) {
    const { label, aspect, why } = PLATFORMS[name];
    console.log(`  ${name.padEnd(width)}  ${aspect.padEnd(4)}  ${label}: ${why}`);
  }
  return 0;
}

async function render(path: string | undefined, flags: RenderFlags): Promise<number> {
  const result = validateFilm(await loadFilmFile(path));
  if (!result.ok) {
    console.error(`✗ ${path} has ${result.errors.length} problem${result.errors.length === 1 ? "" : "s"}. Run bezel-film validate ${path} to see them.`);
    return 1;
  }
  const { RENDER_QUALITIES } = await import("./render/index.js");
  const quality = (flags.quality ?? "standard") as (typeof RENDER_QUALITIES)[number];
  if (!RENDER_QUALITIES.includes(quality)) {
    console.error(`✗ --quality can be ${RENDER_QUALITIES.join(" or ")}, not "${flags.quality}".`);
    return 1;
  }
  const name = basename(path!, extname(path!));
  const presets = flags.for ? parsePresets(flags.for) : [];
  const folder = flags.output ?? dirname(path!);
  if (presets.length) await mkdir(folder, { recursive: true });
  const targets = presets.map((preset) => ({ preset, output: join(folder, `${name}-${preset}.mp4`) }));
  const target = flags.output && !presets.length ? flags.output : join(dirname(path!), `${name}.mp4`);
  const status = statusLine();
  const started = Date.now();
  console.log(`Rendering "${result.film.title}"${quality === "high" ? " at high quality (true motion blur, so it takes longer)" : ""}`);
  const { renderFilm } = await import("./render/index.js");
  try {
    const done = await renderFilm(result.film, {
      output: target,
      targets,
      cover: flags.cover,
      showSafeZones: flags.showSafeZones,
      quality,
      baseDir: dirname(path!),
      onProgress: status.update,
      onWarning: (message) => {
        status.done();
        console.log(`  ! ${message}`);
      },
    });
    status.done();
    for (const video of done.videos) {
      const platform = video.preset && presets.length ? `${PLATFORMS[video.preset].label}: ` : "";
      console.log(`✓ ${platform}${video.output}${video.cover ? ` (cover: ${basename(video.cover)})` : ""}`);
    }
    console.log(`  ${formatSeconds(done.seconds)} long · rendered in ${formatSeconds((Date.now() - started) / 1000)}`);
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
  console.log("Setting up Bezel Film. This downloads about 230 MB, once.");
  await installBrowser(status.update);
  status.done();
  console.log("  ✓ Headless browser");
  const voice = await kokoroVoice({ onProgress: status.update });
  await voice.dispose?.();
  status.done();
  console.log(`  ✓ Voice model (saved in ${cacheDir()})`);
  const { downloadTracks } = await import("./render/tracks.js");
  await downloadTracks(status.update);
  status.done();
  console.log("  ✓ Music");
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
      yes: { type: "boolean", short: "y" },
      agents: { type: "string" },
      "no-sample": { type: "boolean" },
      for: { type: "string" },
      "show-safe-zones": { type: "boolean" },
      "no-cover": { type: "boolean" },
      quality: { type: "string" },
      "no-install": { type: "boolean" },
      "no-downloads": { type: "boolean" },
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
      return render(file, {
        output: values.output,
        for: values.for,
        showSafeZones: !!values["show-safe-zones"],
        cover: !values["no-cover"],
        quality: values.quality,
      });
    case "formats":
      return formats();
    case "init": {
      const { init } = await import("./init.js");
      const { AGENT_IDS } = await import("./agents.js");
      const agents = values.agents?.split(",").map((name) => name.trim().toLowerCase()).filter(Boolean);
      const unknown = agents?.filter((name) => !(AGENT_IDS as readonly string[]).includes(name));
      if (unknown?.length) throw new UsageError(`Unknown agent "${unknown[0]}". Choose from: ${AGENT_IDS.join(", ")}`);
      return init({
        cwd: process.cwd(),
        yes: !!values.yes,
        agents: agents as import("./agents.js").AgentId[] | undefined,
        sample: !values["no-sample"],
        // For tests only: skip the install and the downloads.
        install: !values["no-install"],
        downloads: !values["no-downloads"],
      });
    }
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
