import { FRAME_SIZES, PLATFORMS, RESOLUTION_SCALE, type SafeZone } from "../spec/formats.js";
import type { Film } from "../spec/schema.js";

/** The frame a film is drawn in, and where its content is allowed to go. */
export interface Layout {
  /** Frame size in CSS pixels. */
  width: number;
  height: number;
  /** Device pixels per CSS pixel, so 720p and 4K keep the same layout. */
  scale: number;
  /** wide: 16:9. square: 1:1 and 4:5. tall: 9:16. Each gets its own scene layouts. */
  shape: "wide" | "square" | "tall";
  /** The platform's safe zone, if it covers part of the frame. */
  safe?: SafeZone;
}

export function layoutFor(film: Film): Layout {
  const { aspect, resolution, preset } = film.format;
  const [width, height] = FRAME_SIZES[aspect];
  const shape = aspect === "16:9" ? "wide" : aspect === "9:16" ? "tall" : "square";
  const safe = preset ? (PLATFORMS[preset] as { safe?: SafeZone }).safe : undefined;
  return { width, height, scale: RESOLUTION_SCALE[resolution], shape, safe };
}

/**
 * How sharp the browser draws. Browsers can draw larger than the page (4K) but not
 * smaller, so 720p is drawn at 1080p and shrunk when encoding, which also looks sharper.
 */
export const drawScale = (layout: Layout) => Math.max(1, layout.scale);

/** Video size in real pixels, rounded to even numbers as video encoders need. */
export function videoSize(layout: Layout): [number, number] {
  const even = (n: number) => Math.round((n * layout.scale) / 2) * 2;
  return [even(layout.width), even(layout.height)];
}
