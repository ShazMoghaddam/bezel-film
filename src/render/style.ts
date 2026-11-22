import { readFile } from "node:fs/promises";
import type { FontName } from "../spec/fonts.js";
import type { MotionLevel } from "../spec/schema.js";
import { STYLES } from "../spec/styles.js";

/**
 * A style is a folder in styles/:
 *   style.json   its colours, default fonts, motion and layout
 *   style.css    how it looks: backdrop, texture, cards, lines (optional)
 *   filters.svg  SVG filters its CSS can use, like wobbly ink or print grain (optional)
 * See styles/README.md for how to make one.
 */
export interface Style {
  name: string;
  label: string;
  description: string;
  /** Light or dark: sets the charts' theme and the browser's own colours. */
  theme: "dark" | "light";
  /** The font pairing films use unless they choose another. */
  font: FontName;
  colours: { background: string; surface: string; text: string; muted: string; accent: string; palette: string[] };
  motion: {
    /** The film's motion unless the film or a scene chooses another. */
    level: MotionLevel;
    /** Used by the calm level, and for anything without a spring. */
    easing: string; enterMs: number; staggerMs: number; transition: string; transitionMs: number };
  layout: { safeArea: number; captionPosition: string };
  /** The style's own CSS, added after the page's shared CSS. */
  css: string;
  /** The style's SVG filters, added to the page as they are. */
  filters: string;
}

/** The package root, the same two levels up from src/render and dist/render. */
export const packageRoot = new URL("../../", import.meta.url);

const optional = (url: URL) => readFile(url, "utf8").catch(() => "");

export async function loadStyle(name: string): Promise<Style> {
  if (!(STYLES as readonly string[]).includes(name)) {
    throw new Error(`There's no "${name}" style. Choose from: ${STYLES.join(", ")}.`);
  }
  const folder = new URL(`styles/${name}/`, packageRoot);
  const [json, css, filters] = await Promise.all([
    readFile(new URL("style.json", folder), "utf8"),
    optional(new URL("style.css", folder)),
    optional(new URL("filters.svg", folder)),
  ]);
  return { ...(JSON.parse(json) as Omit<Style, "css" | "filters">), css, filters };
}
