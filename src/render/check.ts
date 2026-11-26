import type { Page } from "playwright-core";
import type { Film } from "../spec/schema.js";
import { contrast } from "./contrast.js";
import type { Timeline } from "./timeline.js";

/**
 * Checks on custom scenes, before a render and in `bezel-film preview`.
 *
 * A custom scene is code an agent wrote, so it's checked the way a careful editor
 * would look at a cut: does it draw the same picture every time, does it keep its
 * words where the platform won't cover them, can the words be read, and is it quick
 * enough to render. Each problem says which scene, what's wrong and how to fix it,
 * so the agent can fix it without a person stepping in.
 */

export interface Problem {
  /** 1-based scene number, as people count. */
  scene: number;
  file: string;
  /** Errors stop a render; warnings are worth fixing but don't. */
  level: "error" | "warning";
  message: string;
}

/** Contrast below this, for text of any size, is hard to read. WCAG asks 3 for large text, 4.5 for body text. */
const MIN_CONTRAST = 3;
/**
 * Two draws of the same moment count as the same picture if no more than this share of
 * pixels clearly differs. The browser can smooth an edge a little differently depending
 * on where something was the moment before, which changes a few pixels and nothing else.
 */
const SAME_PICTURE = 0.0005;
/** A frame that takes longer than this to draw makes renders slow. */
const SLOW_MS = 120;

interface BezelPage {
  __bezel: {
    seek(seconds: number, still?: boolean): void;
    inspect(index: number): { safe: Box & { top: number; right: number; bottom: number; left: number }; texts: { text: string; colour: string; background: string | null; rect: Box }[] } | null;
    captionBox(): Box | null;
  };
}
interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Whether two boxes overlap by more than a sliver. */
const overlaps = (a: Box, b: Box, sliver: number) =>
  a.x < b.x + b.width - sliver && b.x < a.x + a.width - sliver && a.y < b.y + b.height - sliver && b.y < a.y + a.height - sliver;

const seek = (page: Page, t: number) => page.evaluate((t) => (globalThis as unknown as BezelPage).__bezel.seek(t, true), t);
const shot = (page: Page) => page.screenshot({ type: "png", scale: "css" });

export async function checkCustomScenes(page: Page, film: Film, timeline: Timeline): Promise<Problem[]> {
  const problems: Problem[] = [];
  for (const timed of timeline.scenes) {
    if (timed.scene.type !== "custom") continue;
    const scene = timed.index + 1;
    const file = timed.scene.file;
    const add = (level: Problem["level"], message: string) => problems.push({ scene, file, level, message });
    const length = timed.end - timed.start;

    // The same moment must always look the same, whatever was drawn before it.
    for (const at of [0.3, 0.75].map((f) => timed.start + length * f)) {
      await seek(page, at);
      const first = await shot(page);
      await seek(page, timed.start + 0.02);
      await seek(page, at);
      const second = await shot(page);
      if (!first.equals(second) && (await changedShare(page, first, second)) > SAME_PICTURE) {
        add(
          "error",
          `draws a different picture each time it's asked for ${(at - timed.start).toFixed(1)}s. Draw each frame from t alone: no Math.random() or Date.now() in draw, and nothing that adds up from one frame to the next.`,
        );
        break;
      }
    }

    // Speed: a few frames across the scene.
    const times = Array.from({ length: 8 }, (_, i) => timed.start + (length * (i + 0.5)) / 8);
    // One frame first, untimed, so a cold browser doesn't count against the scene.
    await seek(page, times[0]!);
    const started = performance.now();
    for (const t of times) await seek(page, t);
    const perFrame = (performance.now() - started) / times.length;
    if (perFrame > SLOW_MS) add("warning", `takes about ${Math.round(perFrame)} ms to draw each frame, which makes renders slow. Build things once when the scene starts, and only move them in draw.`);

    // Where the captions go during this scene: each sentence, early and late, as a long
    // one is shown in parts.
    const captions: Box[] = [];
    if (film.captions) {
      for (const line of timed.lines) {
        for (const f of [0.15, 0.85]) {
          const box = await page.evaluate((t) => {
            const bezel = (globalThis as unknown as BezelPage).__bezel;
            bezel.seek(t);
            return bezel.captionBox();
          }, line.start + (line.end - line.start) * f);
          if (box) captions.push(box);
        }
      }
    }

    // Once it has settled: where its words are, and whether they can be read.
    await seek(page, timed.start + Math.max(0, length - 0.15));
    const view = await page.evaluate((i) => (globalThis as unknown as BezelPage).__bezel.inspect(i), timed.index);
    if (!view) continue;
    const { safe, texts } = view;
    const tolerance = 2;
    for (const t of texts) {
      const r = t.rect;
      if (r.x < safe.x - tolerance || r.y < safe.y - tolerance || r.x + r.width > safe.x + safe.width + tolerance || r.y + r.height > safe.y + safe.height + tolerance) {
        add("warning", `"${t.text}" runs outside the safe area (kit.safe), where the platform's buttons or the captions can cover it. Keep words inside kit.safe.`);
      } else if (captions.some((c) => overlaps(c, r, tolerance))) {
        add("warning", `"${t.text}" sits where the captions show, so they cover it. Move it up, or keep the scene's words higher in kit.safe.`);
      }
    }
    if (!texts.length) continue;
    const picture = (await shot(page)).toString("base64");
    const grounds = await page.evaluate(
      async ({ picture, rects }) => {
        // Browser code: the page's own Image and canvas (this project's types are for Node).
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const browser = globalThis as any;
        const img = new browser.Image();
        img.src = "data:image/png;base64," + picture;
        await img.decode();
        const canvas = browser.document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const g = canvas.getContext("2d", { willReadFrequently: true });
        g.drawImage(img, 0, 0);
        // The background: the most common colour in a thin ring just outside each piece
        // of text, where only what's behind it shows.
        return rects.map(({ rect }) => {
          const pad = 4;
          const x0 = Math.max(0, Math.floor(rect.x) - pad);
          const y0 = Math.max(0, Math.floor(rect.y) - pad);
          const x1 = Math.min(canvas.width, Math.ceil(rect.x + rect.width) + pad);
          const y1 = Math.min(canvas.height, Math.ceil(rect.y + rect.height) + pad);
          const w = x1 - x0;
          const h = y1 - y0;
          if (w < 1 || h < 1) return null;
          const px: Uint8ClampedArray = g.getImageData(x0, y0, w, h).data;
          const counts = new Map<number, { n: number; r: number; g: number; b: number }>();
          for (let yy = 0; yy < h; yy++) {
            for (let xx = 0; xx < w; xx++) {
              if (xx >= pad && xx < w - pad && yy >= pad && yy < h - pad) continue;
              const i = (yy * w + xx) * 4;
              const [r, gg, b] = [px[i]!, px[i + 1]!, px[i + 2]!];
              const key = ((r >> 4) << 8) | ((gg >> 4) << 4) | (b >> 4);
              const bucket = counts.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
              bucket.n++;
              bucket.r += r;
              bucket.g += gg;
              bucket.b += b;
              counts.set(key, bucket);
            }
          }
          let best: { n: number; r: number; g: number; b: number } | null = null;
          for (const bucket of counts.values()) if (!best || bucket.n > best.n) best = bucket;
          return best ? [best.r / best.n, best.g / best.n, best.b / best.n] : null;
        });
      },
      { picture, rects: texts.map((t) => ({ rect: t.rect })) },
    );
    texts.forEach((t, i) => {
      const ink = rgb(t.colour);
      const ground = (t.background && rgb(t.background)) || grounds[i];
      if (!ink || !ground) return;
      const ratio = contrast(hex(ink), hex(ground));
      if (ratio < MIN_CONTRAST) add("warning", `"${t.text}" is hard to read: its colour stands out from the background by only ${ratio.toFixed(1)} to 1. Aim for at least 4.5 to 1 (kit.colours.text on kit.colours.background is safe).`);
    });
  }
  return problems;
}

/** The share of pixels that clearly differ between two screenshots (0 to 1), worked out in the page. */
async function changedShare(page: Page, a: Buffer, b: Buffer): Promise<number> {
  return page.evaluate(
    async ([a, b]) => {
      // Browser code: the page's own Image and canvas (this project's types are for Node).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const browser = globalThis as any;
      // No named functions in here: the dev runner wraps them in a helper the page lacks.
      const [pa, pb] = (await Promise.all(
        [a!, b!].map(async (data) => {
          const img = new browser.Image();
          img.src = "data:image/png;base64," + data;
          await img.decode();
          const canvas = browser.document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const g = canvas.getContext("2d", { willReadFrequently: true });
          g.drawImage(img, 0, 0);
          return g.getImageData(0, 0, img.width, img.height).data;
        }),
      )) as [Uint8ClampedArray, Uint8ClampedArray];
      let changed = 0;
      for (let i = 0; i < pa.length; i += 4) {
        if (Math.abs(pa[i]! - pb[i]!) + Math.abs(pa[i + 1]! - pb[i + 1]!) + Math.abs(pa[i + 2]! - pb[i + 2]!) > 48) changed++;
      }
      return changed / (pa.length / 4);
    },
    [a.toString("base64"), b.toString("base64")],
  );
}

/** "rgb(12, 34, 56)" or "rgba(...)" as numbers; null for anything else. */
function rgb(css: string): [number, number, number] | null {
  const m = /^rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)/.exec(css);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

const hex = (c: number[]) => "#" + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");

/** Problems as lines for a terminal: errors first. */
export function describeProblems(problems: Problem[]): string[] {
  return [...problems]
    .sort((a, b) => (a.level === b.level ? a.scene - b.scene : a.level === "error" ? -1 : 1))
    .map((p) => `${p.level === "error" ? "✗" : "!"} Scene ${p.scene} (${p.file}) ${p.message}`);
}
