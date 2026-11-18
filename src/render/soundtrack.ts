import { resolve } from "node:path";
import type { Film } from "../spec/schema.js";
import { decodeAudio } from "./ffmpeg.js";
import { loadInstruments } from "./instruments.js";
import { MOOD_INSTRUMENTS, MUSIC_SAMPLE_RATE, applyGain, composeMusic, musicGain } from "./music.js";
import type { Timeline } from "./timeline.js";
import type { Progress } from "./voice.js";

/** The music fades out over the film's last few seconds, ending with the picture. */
const MUSIC_FADE_OUT_SECONDS = 2.5;
/** Your own track fades in over this long, so it never starts with a jolt. */
const OWN_TRACK_FADE_IN_SECONDS = 0.5;

/**
 * The film's music, ready to mix: composed for the film, or your own track, set to the
 * film's length, dipped under every spoken line and faded out at the end.
 * Returns null when the film has no music.
 */
export async function buildMusic(o: {
  film: Film;
  timeline: Timeline;
  ffmpeg: string;
  /** Folder the film file is in. A music file path is relative to it. */
  baseDir: string;
  onProgress?: Progress;
  onWarning?: (message: string) => void;
}): Promise<{ left: Float32Array; right: Float32Array } | null> {
  const { film, timeline } = o;
  const seconds = timeline.duration;
  let music: { left: Float32Array; right: Float32Array };

  if (film.music.source === "none") return null;
  if (film.music.source === "generated") {
    o.onProgress?.(`Composing the ${film.music.mood} music…`);
    const instruments = await loadInstruments(MOOD_INSTRUMENTS[film.music.mood], o.ffmpeg);
    music = composeMusic({ mood: film.music.mood, seconds, seed: film.title, instruments, nature: film.music.nature });
  } else {
    const path = resolve(o.baseDir, film.music.file!);
    o.onProgress?.("Reading your music…");
    music = fitToLength(await decodeAudio(o.ffmpeg, path, MUSIC_SAMPLE_RATE), seconds, (trackSeconds) =>
      o.onWarning?.(`Your music is ${trackSeconds.toFixed(0)}s long but the film is ${seconds.toFixed(0)}s, so the music ends early with a fade.`),
    );
  }

  const lines = timeline.scenes.flatMap((scene) => scene.lines);
  return applyGain(music, musicGain({ lines, seconds, volume: film.music.volume, fadeOutSeconds: MUSIC_FADE_OUT_SECONDS }));
}

/** Trims or pads a track to the film's length, with a gentle fade in, and a fade out if it ends early. */
export function fitToLength(
  track: { left: Float32Array; right: Float32Array },
  seconds: number,
  onShort?: (trackSeconds: number) => void,
): { left: Float32Array; right: Float32Array } {
  const sr = MUSIC_SAMPLE_RATE;
  const length = Math.ceil(seconds * sr);
  const left = new Float32Array(length);
  const right = new Float32Array(length);
  const available = Math.min(length, track.left.length);
  const short = track.left.length < length;
  if (short) onShort?.(track.left.length / sr);
  const fadeIn = OWN_TRACK_FADE_IN_SECONDS * sr;
  const fadeOut = Math.min(available, 2 * sr);
  for (let i = 0; i < available; i++) {
    let g = i < fadeIn ? i / fadeIn : 1;
    if (short && i > available - fadeOut) g *= (available - i) / fadeOut;
    left[i] = track.left[i]! * g;
    right[i] = track.right[i]! * g;
  }
  return { left, right };
}
