import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { PresetName } from "../spec/formats.js";
import type { Film } from "../spec/schema.js";
import { launchBrowser } from "./browser.js";
import { checkCustomScenes, type Problem } from "./check.js";
import { filmFor, openFilmPage } from "./index.js";
import { loadStyle } from "./style.js";
import { buildTimeline } from "./timeline.js";
import type { Progress } from "./voice.js";

/**
 * `bezel-film preview`: stills of every scene and a contact sheet of them all, plus
 * the checks on custom scenes, in seconds rather than the minutes a render takes.
 * It's how an agent looks at its own work before rendering, and fixes what it sees.
 *
 * Timing comes from the narration's length estimated from its words, not the real
 * voice, so moments can sit a little earlier or later than in the final film.
 */

export interface PreviewOptions {
  /** The film file's folder, for custom scene files. */
  baseDir: string;
  /** Where the stills go. Old previews there are replaced. */
  outDir: string;
  /** See the film as it will look on this platform. */
  preset?: PresetName;
  onProgress?: Progress;
}

export interface PreviewResult {
  stills: string[];
  sheet: string;
  problems: Problem[];
}

/** Moments to show, as seconds into a scene. Custom scenes get three: they're the ones to check. */
function moments(type: string, length: number): number[] {
  const settled = Math.max(0, length - 0.15);
  if (type === "custom") return [length * 0.35, length * 0.7, settled];
  // Lists, timelines and maps fill in as they're spoken, so show them full.
  if (["points", "timeline", "roadmap", "map"].includes(type)) return [Math.max(0, length - 0.3)];
  return [Math.min(settled, 2.2)];
}

export async function previewFilm(source: Film, options: PreviewOptions): Promise<PreviewResult> {
  const film = options.preset ? filmFor(source, options.preset) : source;
  const style = await loadStyle(film.style);
  const timeline = buildTimeline(film);
  await mkdir(options.outDir, { recursive: true });
  for (const name of await readdir(options.outDir)) {
    if (/^\d{2}-.*\.png$/.test(name) || name === "contact-sheet.png") await rm(join(options.outDir, name));
  }

  const browser = await launchBrowser(options.onProgress);
  try {
    options.onProgress?.("Opening the film");
    const page = await openFilmPage(browser, film, style, timeline, { baseDir: options.baseDir });
    options.onProgress?.("Checking custom scenes");
    const problems = await checkCustomScenes(page, film, timeline);

    const stills: string[] = [];
    const tiles: { label: string; png: string }[] = [];
    for (const timed of timeline.scenes) {
      options.onProgress?.(`Taking stills: scene ${timed.index + 1} of ${timeline.scenes.length}`);
      const name = timed.scene.id ?? timed.scene.type;
      for (const [k, at] of moments(timed.scene.type, timed.end - timed.start).entries()) {
        await page.evaluate((t) => (globalThis as unknown as { __bezel: { seek(t: number): void } }).__bezel.seek(t), timed.start + at);
        const png = await page.screenshot({ type: "png", scale: "css" });
        const path = join(options.outDir, `${String(timed.index + 1).padStart(2, "0")}-${name}-${"abc"[k]}.png`);
        await writeFile(path, png);
        stills.push(path);
        tiles.push({ label: `${timed.index + 1} · ${name} · ${at.toFixed(1)}s`, png: png.toString("base64") });
      }
    }

    // One picture of the whole film, three stills to a row, each labelled.
    const sheet = join(options.outDir, "contact-sheet.png");
    const data = await page.evaluate(async (tiles) => {
      // Browser code: the page's own canvas (this project's types are for Node).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const browser = globalThis as any;
      const images = await Promise.all(
        tiles.map(async (tile) => {
          const img = new browser.Image();
          img.src = "data:image/png;base64," + tile.png;
          await img.decode();
          return img;
        }),
      );
      const cols = 3;
      const width = 560;
      const height = Math.round((width * images[0].height) / images[0].width);
      const label = 34;
      const gap = 12;
      const rows = Math.ceil(images.length / cols);
      const canvas = browser.document.createElement("canvas");
      canvas.width = cols * width + (cols + 1) * gap;
      canvas.height = rows * (height + label) + (rows + 1) * gap;
      const g = canvas.getContext("2d");
      g.fillStyle = "#11141C";
      g.fillRect(0, 0, canvas.width, canvas.height);
      g.font = "600 18px system-ui, sans-serif";
      images.forEach((img: { width: number; height: number }, i: number) => {
        const x = gap + (i % cols) * (width + gap);
        const y = gap + Math.floor(i / cols) * (height + label + gap);
        g.fillStyle = "#C9CEDB";
        g.fillText(tiles[i]!.label, x + 2, y + 22);
        g.drawImage(img, x, y + label, width, height);
      });
      return canvas.toDataURL("image/png").split(",")[1];
    }, tiles);
    await writeFile(sheet, Buffer.from(data, "base64"));
    await page.context().close();
    return { stills, sheet, problems };
  } finally {
    await browser.close();
  }
}
