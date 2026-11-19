/**
 * Sound effects that land with the movement.
 *
 * Every sound is made in code, like the music: no audio files, nothing to license,
 * nothing extra to install. Cues come from the same code that times each entrance
 * (see `sceneCues` in page.ts), so a pop always lands on the frame its element does.
 *
 * Noise comes from a seeded random generator, so the same film always sounds the same.
 */
import type { Film } from "../spec/schema.js";
import { COUNT_PATTERN, MOTION_FEELS, countFor } from "./motion.js";
import { MUSIC_SAMPLE_RATE, seededRandom } from "./music.js";
import { motionLevel, sceneCues } from "./page.js";
import type { Style } from "./style.js";
import type { Line, Timeline } from "./timeline.js";

/**
 * whoosh: a sweep of air as one scene gives way to the next.
 * swish: a lighter, shorter whoosh, for things that slide in.
 * pop: a soft, tuned blip, for things that grow in.
 * tick: a tiny click, many of them, while a number counts up.
 * ding: a small bell as a number lands.
 */
export const SOUNDS = ["whoosh", "swish", "pop", "tick", "ding"] as const;
export type SoundName = (typeof SOUNDS)[number];

/** A sound an entrance makes, `ms` into its scene. */
export interface SceneCue {
  ms: number;
  sound: SoundName;
  /** Semitones above or below the sound's usual pitch. */
  pitch?: number;
  /** -1 is left, 1 is right. */
  pan?: number;
  /** Relative loudness, 1 by default. */
  gain?: number;
}

/** A sound at a moment in the film. */
export interface Cue extends Omit<SceneCue, "ms"> {
  /** Seconds from the start of the film. */
  at: number;
}

const SR = MUSIC_SAMPLE_RATE;

/** Sounds while someone is speaking play at this share of their usual level. */
export const UNDER_VOICE = 0.6;
/** Ticks while a number counts. They thin out as the count slows, like a dial settling. */
const TICKS = 12;
/** `volume` 0.5 is the level each sound was tuned at. */
const TUNED_VOLUME = 0.5;

/** Every sound in the film, in time order. */
export function filmCues(film: Film, style: Style, timeline: Timeline): Cue[] {
  const cues: Cue[] = [];
  for (const timed of timeline.scenes) {
    const scene = timed.scene;
    const transition = scene.transition ?? style.motion.transition;

    // The move between scenes. Fades are quieter than slides and wipes.
    if (timed.index > 0 && transition !== "cut") {
      cues.push({ at: timed.start, sound: "whoosh", gain: transition === "fade" ? 0.55 : 1, pan: transition === "fade" ? 0 : 0.3 });
    }

    for (const cue of sceneCues(film, timed, style)) {
      const { ms, ...rest } = cue;
      cues.push({ ...rest, at: timed.start + ms / 1000 });
    }

    // A big number ticks as it counts, then dings as it lands.
    if (scene.type === "stat" && new RegExp(COUNT_PATTERN).test(String(scene.value))) {
      const count = countFor(MOTION_FEELS[motionLevel(film, scene, style)]);
      const root = count.curve === "quart" ? 4 : 3;
      const from = timed.start + count.delay;
      for (let i = 1; i <= TICKS; i++) {
        // When the count reaches i/(TICKS+1) of the way: the count curve, worked backwards.
        const x = 1 - (1 - i / (TICKS + 1)) ** (1 / root);
        if (x < count.landsAt) cues.push({ at: from + x * count.seconds, sound: "tick", pitch: i % 2 ? 0 : 2 });
      }
      cues.push({ at: from + count.landsAt * count.seconds, sound: "ding" });
    }
  }
  return cues.filter((cue) => cue.at < timeline.duration).sort((a, b) => a.at - b.at);
}

/**
 * The film's sound effects as one stereo track, quieter under every spoken line.
 * Returns null when they're switched off.
 */
export function buildSoundEffects(film: Film, style: Style, timeline: Timeline): { left: Float32Array; right: Float32Array } | null {
  if (film.sfx.volume === 0) return null;
  const length = Math.ceil(timeline.duration * SR);
  const left = new Float32Array(length);
  const right = new Float32Array(length);
  const lines = timeline.scenes.flatMap((scene) => scene.lines);
  const volume = film.sfx.volume / TUNED_VOLUME;

  filmCues(film, style, timeline).forEach((cue, n) => {
    const random = seededRandom(`${film.title}:sfx:${n}`);
    const samples = SYNTHS[cue.sound](2 ** ((cue.pitch ?? 0) / 12), random);
    const gain = (cue.gain ?? 1) * volume * (speaking(lines, cue.at) ? UNDER_VOICE : 1);
    const start = Math.round(cue.at * SR);
    const pan = cue.pan ?? 0;
    for (let i = 0; i < samples.length && start + i < length; i++) {
      // Whooshes travel across the stereo field; everything else stays put.
      const p = cue.sound === "whoosh" ? pan * (1 - (2 * i) / samples.length) : pan;
      const angle = ((p + 1) * Math.PI) / 4;
      left[start + i]! += samples[i]! * gain * Math.cos(angle);
      right[start + i]! += samples[i]! * gain * Math.sin(angle);
    }
  });
  return { left, right };
}

/** Is someone speaking at this moment (or about to)? */
export function speaking(lines: Line[], at: number): boolean {
  return lines.some((line) => at >= line.start - 0.25 && at <= line.end);
}

// --- The sounds ---------------------------------------------------------------

type Synth = (pitch: number, random: () => number) => Float32Array;

const buffer = (seconds: number) => new Float32Array(Math.round(seconds * SR));

/** Noise through a band-pass filter whose centre glides from `from` to `to` Hz. */
function sweep(seconds: number, from: number, to: number, q: number, level: number, random: () => number): Float32Array {
  const out = buffer(seconds);
  let low = 0;
  let band = 0;
  for (let i = 0; i < out.length; i++) {
    const u = i / out.length;
    const centre = from * (to / from) ** u;
    const f = 2 * Math.sin((Math.PI * centre) / SR);
    // A state-variable filter: cheap, stable at these settings, and smooth to sweep.
    const high = random() * 2 - 1 - low - q * band;
    band += f * high;
    low += f * band;
    // Swells in quickly, fades out slowly.
    const envelope = Math.sin(Math.PI * u ** 0.6) ** 2;
    out[i] = band * envelope * level;
  }
  return out;
}

/** Fades the last few milliseconds to silence, so no sound ends with a click. */
function softEnd(out: Float32Array): Float32Array {
  const fade = Math.min(out.length, Math.round(0.015 * SR));
  for (let i = 0; i < fade; i++) out[out.length - 1 - i]! *= Math.sin((Math.PI / 2) * (i / fade));
  return out;
}

export const SYNTHS: Record<SoundName, Synth> = {
  whoosh: (pitch, random) => sweep(0.45, 320 * pitch, 2400 * pitch, 0.9, 0.16, random),

  swish: (pitch, random) => sweep(0.2, 1400 * pitch, 4200 * pitch, 1.1, 0.09, random),

  // A sine that drops quickly into its note, like a bubble, with a soft second harmonic.
  pop: (pitch) => {
    const out = buffer(0.3);
    const note = 587.33 * pitch; // D5
    let phase = 0;
    for (let i = 0; i < out.length; i++) {
      const t = i / SR;
      phase += (2 * Math.PI * note * (1 + 0.6 * Math.exp(-t / 0.012))) / SR;
      const envelope = (1 - Math.exp(-t / 0.002)) * Math.exp(-t / 0.045);
      out[i] = (Math.sin(phase) + 0.2 * Math.sin(2 * phase)) * envelope * 0.13;
    }
    return softEnd(out);
  },

  tick: (pitch, random) => {
    const out = buffer(0.025);
    const f = 2 * Math.sin((Math.PI * 3200 * pitch) / SR);
    let low = 0;
    let band = 0;
    for (let i = 0; i < out.length; i++) {
      const high = random() * 2 - 1 - low - 0.5 * band;
      band += f * high;
      low += f * band;
      const t = i / SR;
      out[i] = band * (1 - Math.exp(-t / 0.0004)) * Math.exp(-t / 0.004) * 0.05;
    }
    return softEnd(out);
  },

  // A small bell: a few overtones, each fading at its own rate.
  ding: (pitch) => {
    const out = buffer(2.2);
    const note = 1174.66 * pitch; // D6
    const partials = [
      [1, 1, 0.5],
      [2.4, 0.3, 0.22],
      [3.9, 0.12, 0.1],
    ] as const;
    for (let i = 0; i < out.length; i++) {
      const t = i / SR;
      let v = 0;
      for (const [ratio, amp, decay] of partials) v += amp * Math.sin(2 * Math.PI * note * ratio * t) * Math.exp(-t / decay);
      out[i] = v * (1 - Math.exp(-t / 0.003)) * 0.06;
    }
    return softEnd(out);
  },
};

/** Adds the sound effects into the music, or returns them alone if there's no music. */
export function mixInto(
  music: { left: Float32Array; right: Float32Array } | null,
  sfx: { left: Float32Array; right: Float32Array } | null,
): { left: Float32Array; right: Float32Array } | null {
  if (!music || !sfx) return music ?? sfx;
  for (let i = 0; i < Math.min(music.left.length, sfx.left.length); i++) {
    music.left[i]! += sfx.left[i]!;
    music.right[i]! += sfx.right[i]!;
  }
  return music;
}
