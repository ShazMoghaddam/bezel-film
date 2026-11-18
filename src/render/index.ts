import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { availableParallelism, tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type { Film } from "../spec/schema.js";
import { clipSeconds, encodeStereoWav, mixToWav } from "./audio.js";
import { MUSIC_SAMPLE_RATE } from "./music.js";
import { buildMusic } from "./soundtrack.js";
import type { Browser, Page } from "playwright-core";
import { launchBrowser } from "./browser.js";
import { findFfmpeg, startEncoder } from "./ffmpeg.js";
import { buildPage } from "./page.js";
import { RUNTIME_JS } from "./runtime.js";
import { loadStyle, type Style } from "./style.js";
import { buildTimeline, overlongNarration, splitSentences, type Timeline } from "./timeline.js";
import { voiceForFilm, type Clip, type Progress, type Voice } from "./voice.js";

export type { Voice, Clip } from "./voice.js";

export interface RenderOptions {
  /** Where to write the finished video, e.g. "out/film.mp4". */
  output: string;
  /** Use your own voice engine instead of the one the film names. */
  voice?: Voice | null;
  /** Called with short status updates, e.g. for a progress line in the terminal. */
  onProgress?: Progress;
  /** Folder the film file is in, so a music file path can be relative to it. Defaults to the current folder. */
  baseDir?: string;
  /** Called with notes the user should see, such as a scene being lengthened. */
  onWarning?: (message: string) => void;
}

export interface RenderResult {
  output: string;
  seconds: number;
  frames: number;
}

const require = createRequire(import.meta.url);

/** What runtime.ts adds to the page. */
interface BezelPage {
  __bezel: { ready(): Promise<void>; seek(seconds: number): void };
}
/** A private address the page is served from. Nothing on it touches the network. */
const ORIGIN = "https://bezel-film.local";

const SIZES = { "16:9": [1920, 1080], "9:16": [1080, 1920], "1:1": [1080, 1080] } as const;

/** Files the page may load, mapped to where they are on disk. Everything else is blocked. */
function assetFiles(style: Style): Record<string, string> {
  const font = (pkg: string, file: string) => require.resolve(`@fontsource/${pkg}/files/${file}`);
  const fontPackage = (name: string) => name.toLowerCase().replace(/\s+/g, "-");
  const [heading, body, mono] = [style.fonts.heading, style.fonts.body, style.fonts.mono].map(fontPackage);
  return {
    "/fonts/heading-600.woff2": font(heading!, `${heading}-latin-600-normal.woff2`),
    "/fonts/heading-700.woff2": font(heading!, `${heading}-latin-700-normal.woff2`),
    "/fonts/body-400.woff2": font(body!, `${body}-latin-400-normal.woff2`),
    "/fonts/body-600.woff2": font(body!, `${body}-latin-600-normal.woff2`),
    "/fonts/mono-400.woff2": font(mono!, `${mono}-latin-400-normal.woff2`),
    "/bezel-charts.js": join(dirname(require.resolve("bezel-charts")), "bezel-charts.iife.js"),
  };
}

const CONTENT_TYPES: Record<string, string> = { ".woff2": "font/woff2", ".js": "text/javascript", ".html": "text/html" };
const contentType = (path: string) => CONTENT_TYPES[path.slice(path.lastIndexOf("."))] ?? "application/octet-stream";

/**
 * Opens the film's page in the browser, ready to seek. Only our own files are served;
 * every other request is blocked, so rendering never touches the network.
 */
export async function openFilmPage(browser: Browser, film: Film, style: Style, timeline: Timeline): Promise<Page> {
  const [width, height] = SIZES[film.format.aspect];
  const scale = film.format.resolution === "4k" ? 2 : 1;
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: scale, reducedMotion: "no-preference" });
  const files: Record<string, string> = { "/index.html": buildPage(film, style, timeline), "/runtime.js": RUNTIME_JS };
  const disk = assetFiles(style);
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    if (url.origin !== ORIGIN) return route.abort("blockedbyclient");
    if (path in files) return route.fulfill({ body: files[path]!, contentType: contentType(path) });
    if (path in disk) return route.fulfill({ body: await readFile(disk[path]!), contentType: contentType(path) });
    return route.fulfill({ status: 404, body: "Not found" });
  });

  const page = await context.newPage();
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto(`${ORIGIN}/index.html`);
  await page.evaluate(() => (globalThis as unknown as BezelPage).__bezel.ready());
  if (pageErrors.length) throw new Error(`The film page hit an error: ${pageErrors[0]}`);

  return page;
}

/** One page per spare CPU core, up to four. Each extra page draws every Nth frame. */
function workerCount(): number {
  const fromEnv = Number(process.env.BEZEL_FILM_WORKERS);
  if (fromEnv >= 1) return Math.floor(fromEnv);
  return Math.max(1, Math.min(4, availableParallelism() - 1));
}

/**
 * Seeks and screenshots every frame. With several pages, page k takes frames
 * k, k + n, k + 2n…, and a small reorder buffer hands frames to ffmpeg in order.
 * Pages never run more than a few frames ahead, so memory stays small.
 */
async function captureFrames(
  pages: Page[],
  frames: number,
  fps: number,
  write: (frame: Buffer) => Promise<void>,
  onFrame: (done: number) => void,
): Promise<void> {
  const ready = new Map<number, Buffer>();
  const maxAhead = pages.length * 3;
  let next = 0;
  let waiting: (() => void)[] = [];
  let writing = Promise.resolve();

  const flush = async () => {
    while (ready.has(next)) {
      const frame = ready.get(next)!;
      ready.delete(next);
      await write(frame);
      next++;
      onFrame(next);
      const wake = waiting;
      waiting = [];
      wake.forEach((resolve) => resolve());
    }
  };

  await Promise.all(
    pages.map(async (page, k) => {
      const cdp = await page.context().newCDPSession(page);
      for (let frame = k; frame < frames; frame += pages.length) {
        while (frame - next >= maxAhead) await new Promise<void>((resolve) => waiting.push(resolve));
        await page.evaluate((t) => (globalThis as unknown as BezelPage).__bezel.seek(t), frame / fps);
        const shot = (await cdp.send("Page.captureScreenshot", { format: "png", optimizeForSpeed: true })) as { data: string };
        ready.set(frame, Buffer.from(shot.data, "base64"));
        writing = writing.then(flush);
      }
    }),
  );
  await writing;
}

/** Voices every sentence. Returns the clips and each sentence's length, scene by scene. */
async function speakFilm(film: Film, voice: Voice | null, onProgress?: Progress) {
  const clips: (Clip | null)[][] = [];
  const seconds: (number | undefined)[][] = [];
  const total = film.scenes.reduce((sum, scene) => sum + (scene.narration ? splitSentences(scene.narration).length : 0), 0);
  let done = 0;
  for (const scene of film.scenes) {
    const sentences = scene.narration ? splitSentences(scene.narration) : [];
    const sceneClips: (Clip | null)[] = [];
    for (const sentence of sentences) {
      if (voice) onProgress?.(`Voicing narration: ${++done} of ${total} sentences`);
      sceneClips.push(voice ? await voice.speak(sentence) : null);
    }
    clips.push(sceneClips);
    seconds.push(sceneClips.map((clip) => (clip ? clipSeconds(clip) : undefined)));
  }
  return { clips, seconds };
}

/**
 * Turns a validated film into an MP4.
 *
 *   1. Voice: each sentence becomes audio, and its length sets the scene timing.
 *   2. Page: every scene is laid out in a hidden browser page.
 *   3. Frames: the page's clock is frozen and stepped one frame at a time, with a
 *      screenshot of each, so the result is smooth and identical on any computer.
 *   4. Music: composed for the film (or your own track), dipping under every spoken line.
 *   5. Video: ffmpeg joins the frames, voice and music into an MP4.
 */
export async function renderFilm(film: Film, options: RenderOptions): Promise<RenderResult> {
  const { onProgress, onWarning } = options;
  const style = await loadStyle(film.style);
  const ffmpeg = findFfmpeg();

  // A voice passed in belongs to the caller; one we load ourselves, we also clean up.
  const ownVoice = options.voice === undefined;
  const voice = ownVoice ? await voiceForFilm(film, onProgress) : (options.voice ?? null);
  let speech: Awaited<ReturnType<typeof speakFilm>>;
  try {
    speech = await speakFilm(film, voice, onProgress);
  } finally {
    if (ownVoice) await voice?.dispose?.();
  }
  const timeline = buildTimeline(film, speech.seconds);
  for (const warning of overlongNarration(film, timeline)) onWarning?.(warning);

  const work = await mkdtemp(join(tmpdir(), "bezel-film-"));
  const browser = await launchBrowser(onProgress);
  let encoder: ReturnType<typeof startEncoder> | undefined;

  try {
    let narration: string | undefined;
    const placed = timeline.scenes.flatMap((timed) =>
      timed.lines.flatMap((line, i) => {
        const clip = speech.clips[timed.index]?.[i];
        return clip ? [{ clip, start: line.start }] : [];
      }),
    );
    if (placed.length) {
      narration = join(work, "narration.wav");
      await writeFile(narration, mixToWav(placed, timeline.duration));
    }
    let music: string | undefined;
    const track = await buildMusic({ film, timeline, ffmpeg, baseDir: options.baseDir ?? process.cwd(), onProgress, onWarning });
    if (track) {
      music = join(work, "music.wav");
      await writeFile(music, encodeStereoWav(track.left, track.right, MUSIC_SAMPLE_RATE));
    }

    const page = await openFilmPage(browser, film, style, timeline);
    const fps = film.format.fps;
    const frames = Math.round(timeline.duration * fps);
    encoder = startEncoder({ ffmpeg, fps, narration, music, output: options.output });
    const extraPages = await Promise.all(
      Array.from({ length: Math.min(workerCount(), frames) - 1 }, () => openFilmPage(browser, film, style, timeline)),
    );
    await captureFrames([page, ...extraPages], frames, fps, encoder.write, (done) => {
      if (done % fps === 0 || done === frames) onProgress?.(`Drawing frames: ${done} of ${frames}`);
    });
    onProgress?.("Encoding the video…");
    await encoder.finish();
    encoder = undefined;
    return { output: options.output, seconds: timeline.duration, frames };
  } finally {
    encoder?.abort();
    await browser.close();
    await rm(work, { recursive: true, force: true });
  }
}
