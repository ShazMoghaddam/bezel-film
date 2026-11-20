import { execFileSync } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { MOTION_LEVELS, type MotionLevel } from "../src/spec/schema.js";
import { readPresetList } from "../src/spec/formats.js";
import { validateFilm } from "../src/spec/validate.js";
import { launchBrowser } from "../src/render/browser.js";
import { findFfmpeg } from "../src/render/ffmpeg.js";
import { filmFor, openFilmPage } from "../src/render/index.js";
import { loadStyle } from "../src/render/style.js";
import { buildTimeline } from "../src/render/timeline.js";

/**
 * Checks motion without rendering whole videos.
 *
 * 1. Saves a strip of frames across each scene's entrance, one strip per motion level,
 *    so you can judge the movement by eye.
 * 2. Checks the renderer is exact: seeking to the same moment, in any order and on a
 *    fresh page, must give the same picture. Fails if it doesn't.
 * 3. Checks motion blur: things coming in are blurred in lively and punchy, never in
 *    calm, and never in a still (the cover).
 *
 *   npm run motion -- examples/northside-coffee/film.json [youtube] [lively,punchy]
 */
const FRAMES = 12;
const SPAN_SECONDS = 1.65;

const [file, presetArg = "youtube", levelArg] = process.argv.slice(2);
if (!file) throw new Error("Give a film file, e.g. npm run motion -- examples/northside-coffee/film.json");
const result = validateFilm(JSON.parse(await readFile(file, "utf8")));
if (!result.ok) throw new Error(result.errors.join("\n"));
const preset = readPresetList(presetArg).presets[0]!;
const levels = (levelArg ? levelArg.split(",") : [...MOTION_LEVELS]) as MotionLevel[];
for (const level of levels) if (!MOTION_LEVELS.includes(level)) throw new Error(`Unknown motion level "${level}"`);

const style = await loadStyle(result.film.style);
const ffmpeg = findFfmpeg();
const browser = await launchBrowser();
const out = "motion";
const scratch = join(out, ".frames");
await mkdir(scratch, { recursive: true });

const seek = (page: Awaited<ReturnType<typeof openFilmPage>>, t: number) =>
  page.evaluate((s) => (globalThis as any).__bezel.seek(s), t);

try {
  for (const level of levels) {
    const film = filmFor({ ...result.film, motion: level, scenes: result.film.scenes.map(({ motion: _, ...scene }) => scene) }, preset);
    const timeline = buildTimeline(film);
    const page = await openFilmPage(browser, film, style, timeline);

    for (const scene of timeline.scenes) {
      const span = Math.min(SPAN_SECONDS, scene.end - scene.start - 0.05);
      for (let i = 0; i < FRAMES; i++) {
        await seek(page, scene.start + (i / (FRAMES - 1)) * span);
        await writeFile(join(scratch, `${i}.png`), await page.screenshot({ type: "png" }));
      }
      const name = join(out, `${level}-${preset}-${scene.index + 1}-${scene.scene.type}.png`);
      execFileSync(ffmpeg, ["-y", "-loglevel", "error", "-i", join(scratch, "%d.png"), "-vf", `scale=480:-2,tile=${FRAMES / 2}x2:padding=6:color=white`, "-frames:v", "1", name]);
    }

    // Exactness: the same moment, reached from different places and on a fresh page.
    const moments = timeline.scenes.map((s) => s.start + 0.4);
    const first: Buffer[] = [];
    for (const t of moments) {
      await seek(page, t);
      first.push(await page.screenshot({ type: "png" }));
    }
    const fresh = await openFilmPage(browser, film, style, timeline);
    for (const [i, t] of [...moments.entries()].reverse()) {
      await seek(fresh, t);
      if (!first[i]!.equals(await fresh.screenshot({ type: "png" }))) {
        throw new Error(`${level}: scene ${i + 1} looked different the second time at ${t.toFixed(2)}s`);
      }
    }
    await fresh.context().close();

    // Motion blur: count blurred elements just after each scene starts, when things are moving.
    const blurredAt = async (t: number, still = false) => {
      await page.evaluate(([s, st]) => (globalThis as any).__bezel.seek(s, st), [t, still] as const);
      // Runs in the page, so it reaches the page's document through globalThis.
      return page.evaluate(() => [...(globalThis as any).document.querySelectorAll("*")].filter((el: any) => el.style.filter.includes("motion-blur")).length);
    };
    let moving = 0;
    for (const scene of timeline.scenes) moving += await blurredAt(scene.start + 0.06);
    const still = await blurredAt(timeline.scenes[0]!.start + 0.06, true);
    if (level === "calm" ? moving > 0 : moving === 0) throw new Error(`${level}: ${moving} blurred elements during entrances`);
    if (still > 0) throw new Error(`${level}: a still (the cover) had motion blur`);
    await page.context().close();
    console.log(`✓ ${level}: strips saved, every frame exact, ${level === "calm" ? "no blur" : `blur on ${moving} moving elements`}, stills sharp`);
  }
} finally {
  await browser.close();
  await rm(scratch, { recursive: true, force: true });
}
