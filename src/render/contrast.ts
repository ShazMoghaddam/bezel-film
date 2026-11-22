/**
 * Keeps colours readable on any style's background.
 *
 * A film can bring its own colours (a brand's, say), and the same colour can vanish on
 * one style and shout on another: pale yellow disappears on Whiteboard's white board,
 * deep navy on Blueprint's blue. So each colour is checked against the background and,
 * if it's too faint, made lighter or darker just enough to stand out. Only its
 * lightness changes, in OKLab, so it stays recognisably the same colour.
 */

type Rgb = [number, number, number];

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const fromLinear = (c: number) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);

export function parseHex(hex: string): Rgb {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function toHex(rgb: Rgb): string {
  return "#" + rgb.map((c) => Math.round(Math.min(1, Math.max(0, c)) * 255).toString(16).padStart(2, "0")).join("").toUpperCase();
}

/** WCAG relative luminance, from 0 (black) to 1 (white). */
export function luminance(hex: string): number {
  const [r, g, b] = parseHex(hex).map(toLinear) as Rgb;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio, from 1 (the same) to 21 (black on white). */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

// sRGB ↔ OKLab (Björn Ottosson's matrices).
function toOklab(hex: string): Rgb {
  const [r, g, b] = parseHex(hex).map(toLinear) as Rgb;
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}

function fromOklab([L, a, b]: Rgb): Rgb {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map(fromLinear) as Rgb;
}

/** The colour at a new lightness, with its chroma eased off until it fits in sRGB. */
function withLightness(lab: Rgb, L: number): string {
  for (let k = 1; k >= 0; k -= 0.05) {
    const rgb = fromOklab([L, lab[1] * k, lab[2] * k]);
    if (rgb.every((c) => c >= -0.001 && c <= 1.001)) return toHex(rgb);
  }
  return toHex(fromOklab([L, 0, 0]));
}

/**
 * The colour, or the nearest lighter or darker version of it that reaches `min`
 * contrast against `background`. 3 to 1 is WCAG's level for large text and shapes.
 */
export function readableOn(colour: string, background: string, min = 3): string {
  if (contrast(colour, background) >= min) return colour;
  const lab = toOklab(colour);
  const darker = luminance(background) > 0.18;
  for (let step = 1; step <= 100; step++) {
    const L = lab[0] + (darker ? -step : step) / 100;
    if (L <= 0 || L >= 1) break;
    const candidate = withLightness(lab, L);
    if (contrast(candidate, background) >= min) return candidate;
  }
  return darker ? "#000000" : "#FFFFFF";
}
