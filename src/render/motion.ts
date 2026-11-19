/**
 * Springs and motion levels.
 *
 * A spring is worked out here as maths, then sampled into a CSS `linear()` easing
 * curve. The page still moves with ordinary CSS animations, so the runtime can seek
 * to any frame exactly, and the same frame always looks the same.
 */

import type { MotionLevel } from "../spec/schema.js";

export interface Spring {
  /** How strongly the spring pulls towards its end point. */
  stiffness: number;
  /** How quickly the movement calms down. Less damping means more bounce. */
  damping: number;
  mass: number;
}

/**
 * gentle: settles without passing its end point.
 * snappy: quick, with a barely visible overshoot.
 * bouncy: a small, playful overshoot and settle.
 */
export const SPRINGS = {
  gentle: { stiffness: 120, damping: 22, mass: 1 },
  snappy: { stiffness: 260, damping: 23, mass: 1 },
  bouncy: { stiffness: 220, damping: 16, mass: 1 },
} as const satisfies Record<string, Spring>;

export type SpringName = keyof typeof SPRINGS;

/** Where a spring is at `t` seconds, moving from 0 to 1. Can pass 1 on the way. */
export function springAt(spring: Spring, t: number): number {
  if (t <= 0) return 0;
  const w0 = Math.sqrt(spring.stiffness / spring.mass);
  const zeta = spring.damping / (2 * Math.sqrt(spring.stiffness * spring.mass));
  if (zeta < 1) {
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    return 1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + ((zeta * w0) / wd) * Math.sin(wd * t));
  }
  if (zeta === 1) return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
  const root = Math.sqrt(zeta * zeta - 1);
  const r1 = -w0 * (zeta - root);
  const r2 = -w0 * (zeta + root);
  return 1 - (r2 * Math.exp(r1 * t) - r1 * Math.exp(r2 * t)) / (r2 - r1);
}

/** Close enough to the end that nobody could see the difference. */
const SETTLED = 0.002;

/** Seconds until the spring stays within a hair of its end point. */
export function settleSeconds(spring: Spring): number {
  let last = 0;
  for (let ms = 0; ms <= 10_000; ms++) {
    if (Math.abs(springAt(spring, ms / 1000) - 1) >= SETTLED) last = ms;
  }
  return (last + 1) / 1000;
}

/** How far past its end point the spring goes, as a fraction (0.05 is 5%). */
export function overshoot(spring: Spring): number {
  let peak = 0;
  for (let ms = 0; ms <= 3000; ms++) peak = Math.max(peak, springAt(spring, ms / 1000));
  return Math.max(0, peak - 1);
}

/** Points in each curve. Enough for smooth overshoot, small enough to keep the page light. */
const SAMPLES = 64;

/** A spring as CSS: a `linear()` easing curve and how long it lasts. */
export function springCss(spring: Spring): { easing: string; ms: number } {
  const seconds = settleSeconds(spring);
  const points: string[] = [];
  for (let i = 0; i <= SAMPLES; i++) {
    const value = i === SAMPLES ? 1 : springAt(spring, (i / SAMPLES) * seconds);
    points.push(String(+value.toFixed(4)));
  }
  return { easing: `linear(${points.join(", ")})`, ms: Math.round(seconds * 1000) };
}


/** How one motion level moves. Sizes are in frame units (1u is 1% of the shorter side). */
export interface MotionFeel {
  /** Easing for things that slide into place. "style" uses the style's own curve. */
  move: SpringName | "style";
  /** Easing for things that grow into place: numbers, chips, buttons. */
  pop: SpringName | "style";
  /** How far things travel as they come in. */
  distance: number;
  /** The size things grow from, where 1 means they don't grow. */
  growFrom: number;
  /** List points slide in from the side rather than rising. */
  slidePoints: boolean;
  /** Headings appear word by word. */
  words: boolean;
  /** Gap between words, before it's squeezed to fit long headings. */
  wordStaggerMs: number;
  /** Multiplies the style's gap between elements. */
  staggerScale: number;
  /** How long a big number takes to count up. */
  countMs: number;
  /** quart lands more decisively than cubic. */
  countCurve: "cubic" | "quart";
  /** The number gives a small pulse as it lands. */
  pulse: boolean;
}

/**
 * calm: the original Bezel Film motion, unchanged.
 * lively: springy and polished. The default.
 * punchy: bigger, bouncier, faster. Good for short social films.
 */
export const MOTION_FEELS: Record<MotionLevel, MotionFeel> = {
  calm: {
    move: "style",
    pop: "style",
    distance: 3,
    growFrom: 1,
    slidePoints: false,
    words: false,
    wordStaggerMs: 0,
    staggerScale: 1,
    countMs: 1400,
    countCurve: "cubic",
    pulse: false,
  },
  lively: {
    move: "snappy",
    pop: "bouncy",
    distance: 4,
    growFrom: 0.88,
    slidePoints: true,
    words: true,
    wordStaggerMs: 70,
    staggerScale: 0.85,
    countMs: 1500,
    countCurve: "quart",
    pulse: true,
  },
  punchy: {
    move: "bouncy",
    pop: "bouncy",
    distance: 6,
    growFrom: 0.72,
    slidePoints: true,
    words: true,
    wordStaggerMs: 55,
    staggerScale: 0.7,
    countMs: 1100,
    countCurve: "quart",
    pulse: true,
  },
};

/** Big numbers start counting this long after their scene starts. */
export const COUNT_DELAY_SECONDS = 0.25;
/**
 * How far through the count the number lands and pulses. With a quart curve the
 * number is all but there at 70% of the count.
 */
export const COUNT_LANDS_AT = 0.7;
/** A big number that counts up: optional text, a number (commas and decimals allowed), optional text. */
export const COUNT_PATTERN = String.raw`^(\D*?)(\d[\d,]*(?:\.\d+)?)(.*)$`;

/** How a scene's big number counts up, for the page and the sound effects alike. */
export function countFor(feel: MotionFeel) {
  return { delay: COUNT_DELAY_SECONDS, seconds: feel.countMs / 1000, curve: feel.countCurve, landsAt: COUNT_LANDS_AT, pulse: feel.pulse };
}

/** How far a count has got (0 to 1) when it is `x` of the way through its time. */
export function countProgress(curve: MotionFeel["countCurve"], x: number): number {
  return 1 - (1 - x) ** (curve === "quart" ? 4 : 3);
}

/** The longest a heading takes to finish appearing, however many words it has. */
export const WORD_REVEAL_MAX_MS = 650;

/** The gap between words for a heading of `count` words. Long headings get tighter gaps. */
export function wordStagger(feel: MotionFeel, count: number): number {
  if (count < 2) return 0;
  return Math.min(feel.wordStaggerMs, WORD_REVEAL_MAX_MS / (count - 1));
}

/**
 * CSS variables for one motion level, set on each scene that uses it.
 * `style` is the style's own easing and entrance length, used by "calm".
 */
export function motionVars(level: MotionLevel, style: { easing: string; enterMs: number }): string {
  const feel = MOTION_FEELS[level];
  const curve = (name: SpringName | "style") => (name === "style" ? { easing: style.easing, ms: style.enterMs } : springCss(SPRINGS[name]));
  const move = curve(feel.move);
  const pop = curve(feel.pop);
  const d = `calc(var(--u)*${feel.distance})`;
  return [
    `--move-ease:${move.easing}`,
    `--move-ms:${move.ms}ms`,
    `--pop-ease:${pop.easing}`,
    `--pop-ms:${pop.ms}ms`,
    `--rule-ms:${Math.round(move.ms * 1.6)}ms`,
    `--rise-y:${d}`,
    // Calm keeps its original rise for everything; the others grow and slide.
    `--grow-from:${feel.growFrom}`,
    `--grow-y:${feel.growFrom === 1 ? d : "0px"}`,
    `--slide-x:${feel.slidePoints ? `calc(var(--u)*-${feel.distance})` : "0px"}`,
    `--slide-y:${feel.slidePoints ? "0px" : d}`,
    `--word-y:.35em`,
  ].join(";");
}
