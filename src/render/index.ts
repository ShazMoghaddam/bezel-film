import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { availableParallelism, tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { lengthNotes, PLATFORMS, type Platform, type PresetName } from "../spec/formats.js";
import type { Film } from "../spec/schema.js";
import { clipSeconds, encodeStereoWav, mixToWav } from "./audio.js";
import { MUSIC_SAMPLE_RATE } from "./music.js";
import { buildMusic } from "./soundtrack.js";
import { buildSoundEffects, mixInto } from "./sfx.js";
import type { Browser, Page } from "playwright-core";
import { launchBrowser } from "./browser.js";
import { findFfmpeg, startEncoder } from "./ffmpeg.js";
import { drawScale, layoutFor, videoSize } from "./layout.js";
import { buildPage, type PageOptions } from "./page.js";
import { RUNTIME_JS } from "./runtime.js";
import { fontAssets, pairingFor } from "./fonts.js";
import { loadStyle, type Style } from "./style.js";
import { buildTimeline, overlongNarration, splitSentences, type Timeline } from "./timeline.js";
import { voiceForFilm, type Clip, type Progress, type Voice } from "./voice.js";

export type { Voice, Clip } from "./voice.js";

export const RENDER_QUALITIES = ["standard", "high"] as const;
export type RenderQuality = (typeof RENDER_QUALITIES)[number];

/** At high quality, each frame is blended from this many snapshots... */
export const HIGH_QUALITY_SNAPSHOTS = 5;
/** ...spread across this much of a frame: a film camera's classic half-frame shutter. */
export const HIGH_QUALITY_SHUTTER = 0.5;

/**
 * When a snapshot is taken: frame `frame`, snapshot `k` of `snapshots`. Snapshots
 * spread evenly over the shutter, ending on the frame's own moment.
 */
export function snapshotTime(frame: number, k: number, snapshots: number, fps: number, shutter = HIGH_QUALITY_SHUTTER): number {
  if (snapshots <= 1) return frame / fps;
  return Math.max(0, (frame - shutter * (1 - k / (snapshots - 1))) / fps);
}

export interface RenderOptions {
  /** Where to write the finished video, e.g. "out/film.mp4". */
  output: string;
  /**
   * Make a version for each of these platforms instead, each to its own file.
   * The voice and music are made once and shared, so this is much quicker than
   * rendering each one separately.
   */
  targets?: { preset: PresetName; output: string }[];
  /** Save a cover image next to each video, for platforms that show one before play. Default: true. */
  cover?: boolean;
  /** Shade the parts of the frame each platform covers, to check a film by eye. */
  showSafeZones?: boolean;
  /**
   * "high" draws true motion blur: each frame is blended from several snapshots,
   * which looks the most natural but takes about five times as long. Default "standard".
   */
  quality?: RenderQuality;
  /** Use your own voice engine instead of the one the film names. */
  voice?: Voice | null;
  /** Called with short status updates, e.g. for a progress line in the terminal. */
  onProgress?: Progress;
  /** Folder the film file is in, so a music file path can be relative to it. Defaults to the current folder. */
  baseDir?: string;
  /** Called with notes the user should see, such as a scene being lengthened. */
  onWarning?: (message: string) => void;
}

export interface RenderedVideo {
  preset?: PresetName;
  output: string;
  /** The cover image, if one was saved. */
  cover?: string;
  frames: number;
}

export interface RenderResult {
  /** The first (or only) video. */
  output: string;
  seconds: number;
  frames: number;
  videos: RenderedVideo[];
}

/** The film as it should be drawn for one platform: same story, that platform's frame. */
export function filmFor(film: Film, preset: PresetName): Film {
  const target: Platform = PLATFORMS[preset];
  return { ...film, format: { ...film.format, preset, aspect: target.aspect, resolution: target.resolution ?? film.format.resolution } };
}

/** "films/demo/film.mp4" → "films/demo/film-cover.png". */
export const coverPath = (video: string) => video.replace(/\.[^./\\]+$/, "") + "-cover.png";

const require = createRequire(import.meta.url);

/** What runtime.ts adds to the page. */
interface BezelPage {
  __bezel: { ready(): Promise<void>; seek(seconds: number, still?: boolean): void };
}
/** A private address the page is served from. Nothing on it touches the network. */
const ORIGIN = "https://bezel-film.local";

/** Files the page may load, mapped to where they are on disk. Everything else is blocked. */
function assetFiles(film: Film, style: Style): Record<string, string> {
  return {
    ...fontAssets(pairingFor(film, style)),
    "/bezel-charts.js": join(dirname(require.resolve("bezel-charts")), "bezel-charts.iife.js"),
  };
}

const CONTENT_TYPES: Record<string, string> = { ".woff2": "font/woff2", ".js": "text/javascript", ".html": "text/html" };
const contentType = (path: string) => CONTENT_TYPES[path.slice(path.lastIndexOf("."))] ?? "application/octet-stream";

/**
 * Opens the film's page in the browser, ready to seek. Only our own files are served;
 * every other request is blocked, so rendering never touches the network.
 */
export async function openFilmPage(browser: Browser, film: Film, style: Style, timeline: Timeline, options: PageOptions = {}): Promise<Page> {
  const layout = layoutFor(film);
  const context = await browser.newContext({
    viewport: { width: layout.width, height: layout.height },
    deviceScaleFactor: drawScale(layout),
    reducedMotion: "no-preference",
  });
  const files: Record<string, string> = { "/index.html": buildPage(film, style, timeline, layout, options), "/runtime.js": RUNTIME_JS };
  const disk = assetFiles(film, style);
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
  snapshots = 1,
): Promise<void> {
  // With true motion blur, each frame is several snapshots in a row, and the encoder blends them.
  const shots = frames * snapshots;
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
      if (next % snapshots === 0) onFrame(next / snapshots);
      const wake = waiting;
      waiting = [];
      wake.forEach((resolve) => resolve());
    }
  };

  await Promise.all(
    pages.map(async (page, k) => {
      const cdp = await page.context().newCDPSession(page);
      for (let i = k; i < shots; i += pages.length) {
        while (i - next >= maxAhead) await new Promise<void>((resolve) => waiting.push(resolve));
        const t = snapshotTime(Math.floor(i / snapshots), i % snapshots, snapshots, fps);
        await page.evaluate((s) => (globalThis as unknown as BezelPage).__bezel.seek(s), t);
        const shot = (await cdp.send("Page.captureScreenshot", { format: "png", optimizeForSpeed: true })) as { data: string };
        ready.set(i, Buffer.from(shot.data, "base64"));
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
 * The moment used for the cover: the first scene once everything has risen in,
 * which is usually the title.
 */
export function coverSeconds(timeline: Timeline): number {
  const first = timeline.scenes[0]!;
  return first.start + Math.min(2, (first.end - first.start) * 0.6);
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
  const presets = options.targets?.length ? options.targets.map((t) => t.preset) : film.format.preset ? [film.format.preset] : [];
  for (const preset of presets) for (const note of lengthNotes(preset, timeline.duration)) onWarning?.(note);

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
    const track = mixInto(
      await buildMusic({ film, timeline, ffmpeg, baseDir: options.baseDir ?? process.cwd(), onProgress, onWarning }),
      await buildSoundEffects(film, style, timeline, ffmpeg),
    );
    if (track) {
      music = join(work, "music.wav");
      await writeFile(music, encodeStereoWav(track.left, track.right, MUSIC_SAMPLE_RATE));
    }

    const targets = options.targets?.length
      ? options.targets.map(({ preset, output }) => ({ film: filmFor(film, preset), preset, output }))
      : [{ film, preset: film.format.preset, output: options.output }];
    const fps = film.format.fps;
    const frames = Math.round(timeline.duration * fps);
    const videos: RenderedVideo[] = [];

    for (const [n, target] of targets.entries()) {
      const label = targets.length > 1 ? `${PLATFORMS[target.preset!].label} (${n + 1} of ${targets.length}): ` : "";
      const snapshots = options.quality === "high" ? HIGH_QUALITY_SNAPSHOTS : 1;
      // The page draws its own blur unless the snapshots are blended instead.
      const pageOptions = { showSafeZones: options.showSafeZones, trueBlur: snapshots > 1 };
      const layout = layoutFor(target.film);
      const page = await openFilmPage(browser, target.film, style, timeline, pageOptions);
      const limit = target.preset ? (PLATFORMS[target.preset] as Platform).maxMegabytes : undefined;
      encoder = startEncoder({
        ffmpeg,
        fps,
        narration,
        music,
        output: target.output,
        sizeLimit: limit ? { megabytes: limit, seconds: timeline.duration } : undefined,
        size: layout.scale < 1 ? videoSize(layout) : undefined,
        blend: snapshots,
      });
      const extraPages = await Promise.all(
        Array.from({ length: Math.min(workerCount(), frames) - 1 }, () => openFilmPage(browser, target.film, style, timeline, pageOptions)),
      );
      const pages = [page, ...extraPages];
      await captureFrames(pages, frames, fps, encoder.write, (done) => {
        if (done % fps === 0 || done === frames) onProgress?.(`${label}Drawing frames: ${done} of ${frames}`);
      }, snapshots);
      onProgress?.(`${label}Encoding the video…`);
      await encoder.finish();
      encoder = undefined;

      let cover: string | undefined;
      if (options.cover !== false) {
        cover = coverPath(target.output);
        await page.evaluate((t) => (globalThis as unknown as BezelPage).__bezel.seek(t, true), coverSeconds(timeline));
        await writeFile(cover, await page.screenshot({ type: "png" }));
      }
      await Promise.all(pages.map((p) => p.context().close()));
      videos.push({ preset: target.preset, output: target.output, cover, frames });
    }
    return { output: videos[0]!.output, seconds: timeline.duration, frames, videos };
  } finally {
    encoder?.abort();
    await browser.close();
    await rm(work, { recursive: true, force: true });
  }
}
