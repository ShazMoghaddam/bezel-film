/**
 * Sound effects that land with the movement.
 *
 * Every sound is a CC0 recording from a well-known sound pack (see sounds/CREDITS.md),
 * shipped inside the package as a small lossless FLAC file and read with ffmpeg.
 * Cues come from the same code that times each entrance (see `sceneCues` in page.ts),
 * so a tap always lands on the frame its element does.
 */
import { fileURLToPath } from "node:url";
import type { Film } from "../spec/schema.js";
import { decodeAudio } from "./ffmpeg.js";
import { COUNT_PATTERN, MOTION_FEELS, countFor } from "./motion.js";
import { MUSIC_SAMPLE_RATE } from "./music.js";
import { motionLevel, sceneCues } from "./page.js";
import { packageRoot, type Style } from "./style.js";
import type { Line, Timeline } from "./timeline.js";

/**
 * whoosh: soft air as one scene fades into the next.
 * sweep: a fuller pass of air as one scene slides or wipes in.
 * swish: a quick swish for each point sliding in, and a title's line growing.
 * tap: a soft, tuned tap for the main reveal: a big number, a chart, code.
 * pop: a round drop for small extras: chips and buttons.
 * click: a gentle click for quiet touches like a quote mark or a web address.
 * tick: a tiny click, many of them, while a number counts up.
 * ding: a small chime as a number lands.
 */
export const SOUNDS = ["whoosh", "sweep", "swish", "tap", "pop", "click", "tick", "ding"] as const;
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

/**
 * How loud each sound peaks at the tuned volume, in decibels below full scale. Set by
 * ear against the calm music at its default volume: quieter for sounds that repeat.
 */
export const PEAK_DB: Record<SoundName, number> = {
  whoosh: -20,
  sweep: -20,
  swish: -24,
  tap: -19,
  pop: -20,
  click: -22,
  tick: -28,
  ding: -22,
};

/** Every sound in the film, in time order. */
export function filmCues(film: Film, style: Style, timeline: Timeline): Cue[] {
  const cues: Cue[] = [];
  for (const timed of timeline.scenes) {
    const scene = timed.scene;
    const transition = scene.transition ?? style.motion.transition;

    // The move between scenes: soft air for a fade, a fuller pass for a slide or wipe.
    if (timed.index > 0 && transition !== "cut") {
      cues.push({ at: timed.start, sound: transition === "fade" ? "whoosh" : "sweep" });
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

/** A recording, in stereo. */
export type Stereo = { left: Float32Array; right: Float32Array };

/** Reads the recordings a film needs from the package's sounds/ folder. */
export async function loadSounds(ffmpeg: string, names: Iterable<SoundName> = SOUNDS): Promise<Map<SoundName, Stereo>> {
  const sounds = new Map<SoundName, Stereo>();
  await Promise.all(
    [...new Set(names)].map(async (name) => {
      const file = fileURLToPath(new URL(`sounds/${name}.flac`, packageRoot));
      sounds.set(name, await decodeAudio(ffmpeg, file, SR));
    }),
  );
  return sounds;
}

/** Plays a recording faster or slower to move its pitch, the way a tape does. */
export function repitch(sound: Stereo, semitones: number): Stereo {
  if (!semitones) return sound;
  const rate = 2 ** (semitones / 12);
  const length = Math.floor((sound.left.length - 1) / rate);
  const shift = (channel: Float32Array) => {
    const out = new Float32Array(length);
    for (let i = 0; i < length; i++) {
      const at = i * rate;
      const j = Math.floor(at);
      out[i] = channel[j]! + (channel[j + 1]! - channel[j]!) * (at - j);
    }
    return out;
  };
  return { left: shift(sound.left), right: shift(sound.right) };
}

/**
 * The film's sound effects as one stereo track, quieter under every spoken line.
 * Returns null when they're switched off.
 */
export async function buildSoundEffects(film: Film, style: Style, timeline: Timeline, ffmpeg: string): Promise<Stereo | null> {
  if (film.sfx.volume === 0) return null;
  const cues = filmCues(film, style, timeline);
  const sounds = await loadSounds(ffmpeg, cues.map((cue) => cue.sound));
  return mixCues(cues, sounds, { seconds: timeline.duration, lines: timeline.scenes.flatMap((scene) => scene.lines), volume: film.sfx.volume });
}

/** Lays each cue's recording on one track at its level, pitch and place in the stereo field. */
export function mixCues(cues: Cue[], sounds: Map<SoundName, Stereo>, o: { seconds: number; lines: Line[]; volume: number }): Stereo {
  const length = Math.ceil(o.seconds * SR);
  const left = new Float32Array(length);
  const right = new Float32Array(length);
  const volume = o.volume / TUNED_VOLUME;
  // Each recording peaks just under full scale, so this sets it to its own level.
  const peakGain = (name: SoundName) => 10 ** (PEAK_DB[name] / 20) / 0.89;

  for (const cue of cues) {
    const sound = repitch(sounds.get(cue.sound)!, cue.pitch ?? 0);
    const gain = peakGain(cue.sound) * (cue.gain ?? 1) * volume * (speaking(o.lines, cue.at) ? UNDER_VOICE : 1);
    const start = Math.round(cue.at * SR);
    // Panning turns one side down; the centre stays at full level.
    const angle = (((cue.pan ?? 0) + 1) * Math.PI) / 4;
    const toLeft = Math.min(1, Math.cos(angle) * Math.SQRT2);
    const toRight = Math.min(1, Math.sin(angle) * Math.SQRT2);
    for (let i = 0; i < sound.left.length && start + i < length; i++) {
      left[start + i]! += sound.left[i]! * gain * toLeft;
      right[start + i]! += sound.right[i]! * gain * toRight;
    }
  }
  return { left, right };
}

/** Is someone speaking at this moment (or about to)? */
export function speaking(lines: Line[], at: number): boolean {
  return lines.some((line) => at >= line.start - 0.25 && at <= line.end);
}

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
