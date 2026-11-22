import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { FONT_PAIRINGS, FONT_SUBSETS, fontFile, type FontFace, type FontPairing } from "../spec/fonts.js";
import type { Film } from "../spec/schema.js";
import { packageRoot } from "./style.js";
import type { Style } from "./style.js";

/** The characters each bundled font file covers, written by `npm run fonts`. */
const RANGES: Record<string, string> = JSON.parse(readFileSync(new URL("fonts/manifest.json", packageRoot), "utf8")).ranges;

/** The film's own choice, or else its style's. */
export const pairingFor = (film: Film, style: Style): FontPairing => FONT_PAIRINGS[film.font ?? style.font];

/**
 * The page's names for the three roles. Using a name per role, not the font's own name,
 * means a pairing can use one font for two roles (Nunito for headings and body) with
 * different files for the same weight, and the page's CSS never changes with the font.
 */
const ROLES = { heading: "bf-heading", body: "bf-body", mono: "bf-mono" } as const;
type Role = keyof typeof ROLES;

const faces = (pairing: FontPairing) => Object.entries(ROLES).map(([role, family]) => ({ family, font: pairing[role as Role] as FontFace }));

/** The font files the page may load, as URL path → file in the package. */
export function fontAssets(pairing: FontPairing): Record<string, string> {
  const files: Record<string, string> = {};
  for (const { font } of faces(pairing)) {
    for (const weight of Object.values(font.weights)) {
      for (const subset of FONT_SUBSETS) {
        const file = fontFile(font.id, subset, weight);
        files[`/${file}`] = fileURLToPath(new URL(file, packageRoot));
      }
    }
  }
  return files;
}

/**
 * One @font-face per role, weight and character set. The browser loads a file only
 * when the text needs its characters, so Latin Extended costs nothing until a name uses it.
 */
export function fontFaceCss(pairing: FontPairing): string {
  const rules: string[] = [];
  for (const { family, font } of faces(pairing)) {
    for (const [weight, fileWeight] of Object.entries(font.weights)) {
      for (const subset of FONT_SUBSETS) {
        const file = fontFile(font.id, subset, fileWeight);
        const range = RANGES[file];
        if (!range) throw new Error(`${file} is missing from fonts/manifest.json. Run npm run fonts.`);
        const size = font.size ? `;size-adjust:${font.size}%` : "";
        rules.push(`@font-face{font-family:"${family}";font-weight:${weight};font-display:block;src:url(/${file}) format("woff2");unicode-range:${range}${size}}`);
      }
    }
  }
  return rules.join("\n");
}

/** The CSS variables the page's styles use for each role. */
export const fontVars = () =>
  `--heading:"${ROLES.heading}",system-ui,sans-serif;--body:"${ROLES.body}",system-ui,sans-serif;--mono:"${ROLES.mono}",ui-monospace,monospace;`;
