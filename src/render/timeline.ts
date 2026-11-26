import type { Film, Scene } from "../spec/schema.js";
import { WORDS_PER_MINUTE } from "../spec/validate.js";

/** Quiet time before the voice starts in each scene, so the visuals land first. */
export const LEAD_SECONDS = 0.5;
/** Quiet time after the voice ends, so each point has a moment to sink in. */
export const TAIL_SECONDS = 0.7;
/** Scenes timed by narration alone are never shorter than this. */
export const MIN_SCENE_SECONDS = 2;
/** The last scene fades to the background over this long. */
export const END_FADE_SECONDS = 0.6;

/** One spoken sentence, used for captions and for placing audio. */
export interface Line {
  text: string;
  /** Seconds from the start of the film. */
  start: number;
  end: number;
}

export interface TimedScene {
  index: number;
  scene: Scene;
  /** Seconds from the start of the film. */
  start: number;
  end: number;
  lines: Line[];
}

export interface Timeline {
  scenes: TimedScene[];
  duration: number;
}

/**
 * Splits narration into sentences, keeping their punctuation. A sentence ends only where
 * its punctuation is followed by a space or the end, so "4.65 km" and "v1.0" stay whole.
 */
export function splitSentences(text: string): string[] {
  const parts = text.match(/(?:[^.!?…]|[.!?…]+(?!["'”’)]*(?:\s|$)))+(?:[.!?…]+["'”’)]*|$)/g) ?? [];
  return parts.map((part) => part.trim()).filter(Boolean);
}

/** Rough speaking time when there's no real audio, e.g. with the voice turned off. */
export function estimateSpeechSeconds(text: string, speed = 1): number {
  const words = text.split(/\s+/).filter(Boolean).length;
  return ((words / WORDS_PER_MINUTE) * 60) / speed;
}

/**
 * Lays scenes end to end. Each scene's length comes from its spoken sentences
 * (real audio lengths when we have them), so voice and visuals stay in sync.
 * An explicit `duration` is respected, but never cuts the voice off.
 */
export function buildTimeline(film: Film, sentenceSeconds: (number | undefined)[][] = []): Timeline {
  let cursor = 0;
  const scenes = film.scenes.map((scene, index): TimedScene => {
    const sentences = scene.narration ? splitSentences(scene.narration) : [];
    const lengths = sentenceSeconds[index] ?? [];
    const lines: Line[] = [];
    let at = cursor + LEAD_SECONDS;
    sentences.forEach((text, i) => {
      const length = lengths[i] ?? estimateSpeechSeconds(text, film.voice.speed);
      lines.push({ text, start: at, end: at + length });
      at += length;
    });
    const spoken = lines.length ? LEAD_SECONDS + (at - cursor - LEAD_SECONDS) + TAIL_SECONDS : 0;
    // A duration you set is respected (unless the voice needs longer); otherwise the minimum applies.
    const length = scene.duration !== undefined ? Math.max(scene.duration, spoken) : Math.max(spoken, MIN_SCENE_SECONDS);
    const timed = { index, scene, start: cursor, end: cursor + length, lines };
    cursor += length;
    return timed;
  });
  const duration = cursor + (scenes.length ? END_FADE_SECONDS : 0);
  return { scenes, duration };
}

/** Scenes whose explicit duration is shorter than their narration. */
export function overlongNarration(film: Film, timeline: Timeline): string[] {
  return timeline.scenes
    .filter(({ scene, start, end }) => scene.duration !== undefined && end - start > scene.duration + 0.01)
    .map(({ scene, index, start, end }) => {
      const name = scene.id ?? `scene ${index + 1}`;
      return `${name}: narration needs ${(end - start).toFixed(1)}s, longer than its duration of ${scene.duration}s, so the scene was lengthened`;
    });
}
