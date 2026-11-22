import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { PRESETS, readPresetList } from "../src/spec/formats.js";
import { validateFilm } from "../src/spec/validate.js";
import { launchBrowser } from "../src/render/browser.js";
import { filmFor, openFilmPage } from "../src/render/index.js";
import { loadStyle } from "../src/render/style.js";
import { buildTimeline } from "../src/render/timeline.js";

/**
 * Saves a still of every scene in every platform format, for checking layouts by eye
 * without rendering whole videos. Each still is taken once the scene has settled,
 * with its first caption showing. Scenes whose items arrive with the narration
 * (points, timelines, roadmaps, maps) are taken just before they end, with every item in.
 *
 *   npm run stills -- films/welcome/film.json [tiktok,reels] [--safe-zones]
 */
const [file, list, ...rest] = process.argv.slice(2);
if (!file) throw new Error("Give a film file, e.g. npm run stills -- examples/northside-coffee/film.json");
const result = validateFilm(JSON.parse(await readFile(file, "utf8")));
if (!result.ok) throw new Error(result.errors.join("\n"));
const presets = list && !list.startsWith("--") ? readPresetList(list).presets : PRESETS;
const showSafeZones = [list, ...rest].includes("--safe-zones");

const style = await loadStyle(result.film.style);
const browser = await launchBrowser();
const out = "stills";
await mkdir(out, { recursive: true });
try {
  for (const preset of presets) {
    const film = filmFor(result.film, preset);
    const timeline = buildTimeline(film);
    const page = await openFilmPage(browser, film, style, timeline, { showSafeZones, baseDir: dirname(file) });
    for (const scene of timeline.scenes) {
      const paced = ["points", "timeline", "roadmap", "map"].includes(scene.scene.type);
      const t = paced ? scene.end - 0.3 : Math.min(scene.end - 0.05, scene.start + 2.2);
      await page.evaluate((s) => (globalThis as any).__bezel.seek(s), t);
      await writeFile(join(out, `${preset}-${scene.index + 1}-${scene.scene.type}.png`), await page.screenshot({ type: "png" }));
    }
    await page.context().close();
    console.log(`✓ ${preset}`);
  }
} finally {
  await browser.close();
}
