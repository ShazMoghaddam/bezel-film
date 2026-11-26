/**
 * Font pairings: the choices for a film's `font` setting.
 *
 * People pick a pairing, not single fonts, so a heading and its body text always
 * suit each other. Each style has a default pairing, and a film can choose another.
 * The font files ship inside the package (fonts/), so rendering stays offline.
 */

export const FONT_NAMES = ["grotesk", "editorial", "condensed", "bold", "technical", "friendly", "handwritten", "mono", "swiss", "pixel", "terminal", "chalk"] as const;
export type FontName = (typeof FONT_NAMES)[number];

/** One font in a pairing, and which of its files to use for each weight the page asks for. */
export interface FontFace {
  /** The Fontsource id, which is also its folder in fonts/. */
  id: string;
  /** The font's own name, for people. */
  family: string;
  /** Font files by the weight the page asks for: the page's 600 may use the font's 500. */
  weights: Record<number, number>;
  /**
   * How much to scale the font so it looks the same size as the others, as a CSS
   * `size-adjust` percentage. Some fonts, like handwriting, are drawn small.
   */
  size?: number;
}

export interface FontPairing {
  name: FontName;
  description: string;
  /** Headings, big numbers and quotes. The page uses weights 600 and 700. */
  heading: FontFace;
  /** Everything else. The page uses weights 400 and 600. */
  body: FontFace;
  /** Code, links and stickers. The page uses weights 400 and 600. */
  mono: FontFace;
}

const face = (id: string, family: string, weights: Record<number, number>, size?: number): FontFace => ({ id, family, weights, ...(size ? { size } : {}) });

const SPACE_GROTESK = face("space-grotesk", "Space Grotesk", { 600: 600, 700: 700 });
const INTER = face("inter", "Inter", { 400: 400, 600: 600 });
// Mono text at 600 (stickers) uses the bold file: it matches the weight stickers have always had.
const JETBRAINS_MONO = face("jetbrains-mono", "JetBrains Mono", { 400: 400, 600: 700 });
// VT323 has one weight, and is drawn small for its size.
const VT323 = face("vt323", "VT323", { 400: 400, 600: 400 }, 135);
const VT323_HEADING = face("vt323", "VT323", { 600: 400, 700: 400 }, 135);

export const FONT_PAIRINGS: Record<FontName, FontPairing> = {
  grotesk: {
    name: "grotesk",
    description: "Modern and confident. Tech, data and product stories.",
    heading: SPACE_GROTESK,
    body: INTER,
    mono: JETBRAINS_MONO,
  },
  editorial: {
    name: "editorial",
    description: "A magazine serif. Considered, classic and calm.",
    heading: face("fraunces", "Fraunces", { 600: 600, 700: 700 }),
    body: face("source-serif-4", "Source Serif 4", { 400: 400, 600: 600 }),
    mono: JETBRAINS_MONO,
  },
  condensed: {
    name: "condensed",
    description: "Tall and narrow, like a news headline. Fits long titles.",
    heading: face("oswald", "Oswald", { 600: 500, 700: 600 }),
    body: face("barlow", "Barlow", { 400: 400, 600: 600 }),
    mono: JETBRAINS_MONO,
  },
  bold: {
    name: "bold",
    description: "Heavy, poster-like headings with a clean body.",
    // Archivo Black has a single, very heavy weight.
    heading: face("archivo-black", "Archivo Black", { 600: 400, 700: 400 }),
    body: INTER,
    mono: JETBRAINS_MONO,
  },
  technical: {
    name: "technical",
    description: "Precise and engineered. Plans, systems and specs.",
    heading: face("ibm-plex-sans", "IBM Plex Sans", { 600: 600, 700: 700 }),
    body: face("ibm-plex-sans", "IBM Plex Sans", { 400: 400, 600: 600 }),
    mono: face("ibm-plex-mono", "IBM Plex Mono", { 400: 400, 600: 700 }),
  },
  friendly: {
    name: "friendly",
    description: "Soft and rounded. Warm explainers for everyone.",
    heading: face("nunito", "Nunito", { 600: 700, 700: 800 }),
    body: face("nunito", "Nunito", { 400: 400, 600: 600 }),
    mono: JETBRAINS_MONO,
  },
  handwritten: {
    name: "handwritten",
    description: "Written by hand, like a whiteboard or a notebook.",
    heading: face("caveat", "Caveat", { 600: 600, 700: 700 }, 135),
    // Patrick Hand has one weight.
    body: face("patrick-hand", "Patrick Hand", { 400: 400, 600: 400 }, 118),
    mono: JETBRAINS_MONO,
  },
  mono: {
    name: "mono",
    description: "Typewriter and terminal. Best with short headings.",
    heading: face("space-mono", "Space Mono", { 600: 700, 700: 700 }),
    body: face("jetbrains-mono", "JetBrains Mono", { 400: 400, 600: 600 }),
    mono: JETBRAINS_MONO,
  },
  swiss: {
    name: "swiss",
    description: "Neutral and exact, like a Swiss poster. Events, posters and grids.",
    heading: face("inter", "Inter", { 600: 700, 700: 700 }),
    body: INTER,
    mono: JETBRAINS_MONO,
  },
  chalk: {
    name: "chalk",
    description: "Chalk on a blackboard: sketched headings and neat classroom handwriting.",
    // Fredericka the Great has one weight.
    heading: face("fredericka-the-great", "Fredericka the Great", { 600: 400, 700: 400 }),
    body: face("kalam", "Kalam", { 400: 400, 600: 700 }),
    mono: JETBRAINS_MONO,
  },
  pixel: {
    name: "pixel",
    description: "A 90s video game: blocky pixel headings and screen-text body.",
    // Press Start 2P and VT323 each have one weight. Press Start is drawn wide, VT323 small.
    heading: face("press-start-2p", "Press Start 2P", { 600: 400, 700: 400 }, 82),
    body: VT323,
    mono: VT323,
  },
  terminal: {
    name: "terminal",
    description: "An old green-screen monitor. Logs, systems and hacker stories.",
    heading: VT323_HEADING,
    body: VT323,
    mono: VT323,
  },
};

/**
 * The character sets bundled for every font: Latin, and Latin Extended for names like
 * Ştefan or Łódź. fonts/manifest.json records which characters each file covers.
 */
export const FONT_SUBSETS = ["latin", "latin-ext"] as const;
export type FontSubset = (typeof FONT_SUBSETS)[number];

/** Where a font file lives in the package, e.g. "fonts/inter/inter-latin-400-normal.woff2". */
export const fontFile = (id: string, subset: FontSubset, weight: number) => `fonts/${id}/${id}-${subset}-${weight}-normal.woff2`;

/** Every font file any pairing uses. */
export function allFontFiles(): string[] {
  const files = new Set<string>();
  for (const pairing of Object.values(FONT_PAIRINGS)) {
    for (const font of [pairing.heading, pairing.body, pairing.mono]) {
      for (const weight of Object.values(font.weights)) {
        for (const subset of FONT_SUBSETS) files.add(fontFile(font.id, subset, weight));
      }
    }
  }
  return [...files].sort();
}
