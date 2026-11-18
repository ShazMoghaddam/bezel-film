import { readFile } from "node:fs/promises";

export interface Style {
  name: string;
  label: string;
  description: string;
  colours: { background: string; surface: string; text: string; muted: string; accent: string; palette: string[] };
  fonts: { heading: string; body: string; mono: string };
  motion: { easing: string; enterMs: number; staggerMs: number; transition: string; transitionMs: number };
  layout: { safeArea: number; captionPosition: string };
}

/** The package root, the same two levels up from src/render and dist/render. */
export const packageRoot = new URL("../../", import.meta.url);

/** Styles with a finished renderer. The others are in the spec but not built yet. */
export const BUILT_STYLES = ["data-story"];

export async function loadStyle(name: string): Promise<Style> {
  if (!BUILT_STYLES.includes(name)) {
    throw new Error(`The "${name}" style isn't built yet. Ready now: ${BUILT_STYLES.join(", ")}.`);
  }
  return JSON.parse(await readFile(new URL(`styles/${name}/style.json`, packageRoot), "utf8")) as Style;
}
