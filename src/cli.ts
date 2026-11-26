#!/usr/bin/env node
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { basename, dirname, extname, join, relative, resolve } from "node:path";
import { FONT_PAIRINGS } from "./spec/fonts.js";
import { STYLE_INFO } from "./spec/styles.js";
import { lengthNotes, PLATFORMS, PRESETS, readPresetList, type PresetName } from "./spec/formats.js";
import { estimateFilmSeconds, validateFilm } from "./spec/validate.js";

const HELP = `Bezel Film: make short films in code.

Usage
  bezel-film init                   Set up this folder: install, agent instructions, a welcome film
  bezel-film draft <source>         Draft a film about a project from its folder, README
                                    or GitHub repository (e.g. owner/repo)
  bezel-film validate <film.json>   Check a film file and show a summary
  bezel-film preview <film.json>    Stills of every scene and checks on custom scenes,
                                    in seconds. Look before you render
  bezel-film render <film.json>     Render the film to an MP4
  bezel-film formats                List the platform presets, e.g. tiktok, linkedin-mobile
  bezel-film styles                 List the styles and font pairings
  bezel-film guide [name]           Read a guide for agents: director, scenes,
                                    or a style's own guide, e.g. whiteboard
  bezel-film icons <word>           Find line drawings for custom scenes, e.g. coffee
  bezel-film voices                 Hear a short line in each recommended voice
  bezel-film setup                  Do the one-time downloads now (browser, voice and music)
  bezel-film schema                 Print the film file's JSON Schema

Options
  -o, --output <path>   Where render saves the video (default: next to the film file),
                        where draft saves the film (default: film.json), where
                        preview saves its stills (default: <film>-preview next to
                        the film file), or where voices saves its samples
                        (default: voice-samples)
  --for <list>          render: make a version for each platform, e.g. tiktok,reels,x
                        (or "all"). -o is then a folder, or a file name
                        such as promo-linkedin.mp4 for one platform.
                        draft: the platform the film is for, e.g. tiktok
                        preview: the platform to see the film on, e.g. tiktok
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
  // Custom scenes' files live next to the film file, so check they're there.
  const missing = film.scenes.flatMap((scene, i) => (scene.type === "custom" && !existsSync(join(dirname(path!), scene.file)) ? [`scenes.${i}.file: can't find ${scene.file} next to the film file`] : []));
  if (missing.length) {
    console.error(`✗ ${path} has ${missing.length} problem${missing.length === 1 ? "" : "s"}:`);
    for (const error of missing) console.error(`  • ${error}`);
    return 1;
  }
  console.log(`✓ ${path} is a valid film`);
  const preset = film.format.preset ? ` · for ${PLATFORMS[film.format.preset].label}` : "";
  console.log(`  "${film.title}" · ${film.style}${film.font ? ` · ${film.font} fonts` : ""} · ${film.format.aspect} ${film.format.resolution} ${film.format.fps}fps${preset}`);
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

function styles(): number {
  console.log("Styles. Put one in your film file (\"style\": \"data-story\").\n");
  const styleWidth = Math.max(...STYLE_INFO.map((style) => style.name.length));
  for (const { name, label, description, theme, font } of STYLE_INFO) {
    console.log(`  ${name.padEnd(styleWidth)}  ${label}: ${description}`);
    // Styles made for custom scenes have a guide for agents.
    const guided = existsSync(new URL(`styles/${name}/guide.md`, root));
    console.log(`  ${"".padEnd(styleWidth)}  ${theme}, ${font} fonts${guided ? `. Guide: bezel-film guide ${name}` : ""}`);
  }
  console.log("\nFont pairings. Each style has a default; choose another with \"font\": \"editorial\".\n");
  const pairings = Object.values(FONT_PAIRINGS);
  const fontWidth = Math.max(...pairings.map((pairing) => pairing.name.length));
  for (const { name, description, heading, body } of pairings) {
    const fonts = heading.family === body.family ? heading.family : `${heading.family} and ${body.family}`;
    console.log(`  ${name.padEnd(fontWidth)}  ${fonts}: ${description}`);
  }
  return 0;
}

async function preview(path: string | undefined, output: string | undefined, preset: string | undefined): Promise<number> {
  const result = validateFilm(await loadFilmFile(path));
  if (!result.ok) {
    console.error(`✗ ${path} has ${result.errors.length} problem${result.errors.length === 1 ? "" : "s"}. Run bezel-film validate ${path} to see them.`);
    return 1;
  }
  const presets = preset ? parsePresets(preset) : [];
  if (presets.length > 1) throw new UsageError("preview takes one platform at a time, e.g. --for tiktok");
  const outDir = output ?? join(dirname(path!), `${basename(path!, extname(path!))}-preview`);
  const { previewFilm } = await import("./render/preview.js");
  const { describeProblems } = await import("./render/check.js");
  const status = statusLine();
  try {
    const done = await previewFilm(result.film, { baseDir: dirname(path!), outDir, preset: presets[0], onProgress: status.update });
    status.done();
    console.log(`✓ ${done.stills.length} stills in ${relative(process.cwd(), outDir) || "."}`);
    console.log(`  All of them on one page: ${relative(process.cwd(), done.sheet)}`);
    console.log("  Timing is estimated from the narration's words, so moments can be a little off from the final film.");
    if (done.problems.length) {
      console.log(`\n${done.problems.length} thing${done.problems.length === 1 ? "" : "s"} to fix:`);
      for (const line of describeProblems(done.problems)) console.log(`  ${line}`);
    } else if (result.film.scenes.some((scene) => scene.type === "custom")) {
      console.log("  Custom scenes passed their checks.");
    }
    return done.problems.some((p) => p.level === "error") ? 1 : 0;
  } catch (error) {
    status.done();
    throw error;
  }
}

/** Search the line drawings kit.icon() can draw, by name and tags. */
async function iconsSearch(words: string | undefined): Promise<number> {
  const tags = JSON.parse(await readFile(new URL("icons/tags.json", root), "utf8")) as Record<string, string>;
  if (!words) throw new UsageError("Say what to look for, e.g. bezel-film icons coffee");
  const terms = words.toLowerCase().split(/[\s,]+/).filter(Boolean);
  // Names that contain the word first, then drawings tagged with it.
  const scored = Object.entries(tags)
    .map(([name, tagText]) => {
      let score = 0;
      for (const term of terms) {
        if (name === term) score += 10;
        else if (name.split("-").includes(term)) score += 6;
        else if (name.includes(term)) score += 3;
        else if (tagText.split(" ").includes(term)) score += 2;
        else return [name, 0] as const;
      }
      return [name, score - name.length / 100] as const;
    })
    .filter(([, score]) => score > 0)
    .sort((a, b) => b[1] - a[1]);
  if (!scored.length) {
    console.log(`No drawings for "${words}". Try a simpler or different word.`);
    return 1;
  }
  const shown = scored.slice(0, 40).map(([name]) => name);
  console.log(`${scored.length} drawing${scored.length === 1 ? "" : "s"} for "${words}"${scored.length > 40 ? ", best 40" : ""}. Draw one with kit.icon("name").\n`);
  console.log(`  ${shown.join("\n  ")}`);
  return 0;
}

/** The guides agents read: in guides/, or a style's own guide.md. */
async function guide(name: string | undefined): Promise<number> {
  const available = (await readdir(new URL("guides/", root))).filter((f) => f.endsWith(".md")).map((f) => f.replace(/\.md$/, ""));
  if (!name) {
    console.log("Guides for agents. Read one with bezel-film guide <name>.\n");
    for (const g of available) console.log(`  ${g}`);
    console.log("\nStyles with their own guide are listed by bezel-film styles.");
    return 0;
  }
  if (!/^[a-z0-9-]+$/.test(name)) throw new UsageError(`There's no guide called "${name}".`);
  const candidates = [new URL(`guides/${name}.md`, root), new URL(`styles/${name}/guide.md`, root)];
  for (const url of candidates) {
    if (existsSync(url)) {
      process.stdout.write(await readFile(url, "utf8"));
      return 0;
    }
  }
  throw new UsageError(`There's no guide called "${name}". Guides: ${available.join(", ")}.`);
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
  // With --for, -o is a folder for the videos, or the video's own name for one platform.
  const outputIsFile = !!flags.output && /\.mp4$/i.test(flags.output);
  if (outputIsFile && presets.length > 1) {
    throw new UsageError(`-o ${flags.output} names one video, but you're rendering ${presets.length} platforms. Give a folder instead, e.g. -o ${dirname(flags.output!) === "." ? "videos" : join(dirname(flags.output!), "videos")}`);
  }
  const folder = presets.length && outputIsFile ? dirname(flags.output!) : (flags.output ?? dirname(path!));
  if (presets.length) await mkdir(folder, { recursive: true });
  const targets = presets.map((preset) => ({ preset, output: outputIsFile ? flags.output! : join(folder, `${name}-${preset}.mp4`) }));
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

async function draft(source: string | undefined, output: string, platform: string | undefined): Promise<number> {
  if (!source) throw new UsageError("Give a project to draft from: a folder (e.g. .), a README file, or a GitHub repository such as owner/repo");
  if (existsSync(output)) throw new UsageError(`${output} already exists. Choose another name with -o, e.g. bezel-film draft ${source} -o project-film.json`);
  const presets = platform ? parsePresets(platform) : [];
  if (presets.length > 1) throw new UsageError("draft makes one film; give one platform with --for, and render it for others later");
  const { gatherFacts } = await import("./repo.js");
  const { draftFilm } = await import("./draft.js");
  const facts = await gatherFacts(source);
  const film = draftFilm(facts, { preset: presets[0] });
  // A sanity check: a draft that doesn't validate is a bug in draft, not the user's fault.
  const result = validateFilm(film);
  if (!result.ok) throw new Error(`The draft didn't come out valid. Please report this:\n  ${result.errors.join("\n  ")}`);
  // Point editors at the schema, so they can check the file as it's edited.
  const schema = resolve("node_modules/bezel-film/schema/film.schema.json");
  const file = existsSync(schema) ? { $schema: relative(dirname(resolve(output)), schema), ...film } : film;
  await mkdir(dirname(resolve(output)), { recursive: true });
  await writeFile(output, `${JSON.stringify(file, null, 2)}\n`);

  const types = result.film.scenes.map((scene) => scene.type);
  console.log(`✓ Drafted ${output}: a film about ${facts.name}`);
  console.log(`  From ${facts.sources.join(", ")}`);
  console.log(`  ${types.length} scenes (${types.join(", ")}) · about ${formatSeconds(estimateFilmSeconds(result.film))}`);
  console.log("\nIt's a first draft, built from what the project says about itself. Next:");
  console.log("  • Ask your coding agent to polish it: tighten the narration, keep what matters,");
  console.log("    and add a stat, chart or map if the project has a story to tell.");
  console.log(`  • Or edit it yourself, then render it: npx bezel-film render ${output}`);
  return 0;
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
    case "draft":
      return draft(file, values.output ?? "film.json", values.for);
    case "validate":
      return validate(file);
    case "preview":
      return preview(file, values.output, values.for);
    case "guide":
      return guide(file);
    case "icons":
      return iconsSearch(positionals.slice(1).join(" ") || undefined);
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
    case "styles":
      return styles();
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
    // Errors from inside the film page arrive wrapped with the browser's call stack,
    // which only matters to us. Show the message itself.
    const message = error instanceof Error ? error.message : String(error);
    console.error(message.replace(/^page\.evaluate: (Error: )?/, "").replace(/\n\s+at [\s\S]*$/, ""));
    process.exitCode = error instanceof UsageError ? 2 : 1;
  },
);
