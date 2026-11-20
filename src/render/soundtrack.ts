import { resolve } from "node:path";
import type { Film } from "../spec/schema.js";
import { decodeAudio } from "./ffmpeg.js";
import { loadInstruments } from "./instruments.js";
import { MOOD_INSTRUMENTS, MUSIC_SAMPLE_RATE, applyGain, composeMusic, musicGain } from "./music.js";
import { levelTo, natureBed, pickNature, type Stereo } from "./nature.js";
import { TRACKS, pickTrack, trackFile, trackGain } from "./tracks.js";
import type { Timeline } from "./timeline.js";
import type { Progress } from "./voice.js";

/** The music fades out over the film's last few seconds, ending with the picture. */
const MUSIC_FADE_OUT_SECONDS = 2.5;
/** Your own track fades in over this long, so it never starts with a jolt. */
const OWN_TRACK_FADE_IN_SECONDS = 0.5;
/** When a recorded track is shorter than the film, it plays again, blending over this long. */
const LOOP_BLEND_SECONDS = 3;
/** Under a recorded ambient track, the nature sound sits about 8 dB below the music. */
const NATURE_UNDER_TRACK = 0.4;

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
    const { mood } = film.music;
    let choice = pickTrack(film.title, mood, film.music.track);
    let track: Stereo | undefined;
    if (choice !== "composed") {
      try {
        const file = await trackFile(choice, o.onProgress);
        o.onProgress?.(`Playing "${TRACKS[choice].title}"…`);
        track = scale(loopToLength(await decodeAudio(o.ffmpeg, file, MUSIC_SAMPLE_RATE), seconds), await trackGain(choice));
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        o.onWarning?.(`${reason}. The film uses music composed for it instead. Run \`npx bezel-film setup\` while online to download the music.`);
        choice = "composed";
      }
    }
    // Ambient music sits on a real nature recording.
    const nature = mood === "ambient"
      ? await natureBed({ kind: pickNature(film.title, film.music.nature), seed: film.title, seconds, ffmpeg: o.ffmpeg, sampleRate: MUSIC_SAMPLE_RATE })
      : undefined;
    if (track) {
      music = nature ? mixUnder(track, nature) : track;
    } else {
      o.onProgress?.(`Composing the ${mood} music…`);
      const instruments = await loadInstruments(MOOD_INSTRUMENTS[mood], o.ffmpeg);
      music = composeMusic({ mood, seconds, seed: film.title, instruments, nature });
    }
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

/**
 * A recorded track set to the film's length. A longer track is cut short (the film's
 * fade-out ends it); a shorter one plays again from the start, blending into itself.
 */
export function loopToLength(track: Stereo, seconds: number): Stereo {
  const sr = MUSIC_SAMPLE_RATE;
  const length = Math.ceil(seconds * sr);
  const left = new Float32Array(length);
  const right = new Float32Array(length);
  const blend = Math.min(Math.floor(track.left.length / 4), LOOP_BLEND_SECONDS * sr);
  // Each pass starts `step` samples after the last, so passes overlap by `blend`.
  const step = track.left.length - blend;
  for (let start = 0; start < length; start += step) {
    for (let i = 0; i < track.left.length && start + i < length; i++) {
      // Equal-power blend in and out where passes overlap (but not at the very start).
      const fadeIn = start > 0 && i < blend ? Math.sin((Math.PI / 2) * (i / blend)) : 1;
      const fadeOut = start + step < length && i >= step ? Math.cos((Math.PI / 2) * ((i - step) / blend)) : 1;
      left[start + i]! += track.left[i]! * fadeIn * fadeOut;
      right[start + i]! += track.right[i]! * fadeIn * fadeOut;
    }
  }
  // 20 ms in, so the first sample never clicks.
  const edge = Math.round(0.02 * sr);
  for (let i = 0; i < Math.min(edge, length); i++) {
    left[i]! *= i / edge;
    right[i]! *= i / edge;
  }
  return { left, right };
}

function scale(sound: Stereo, gain: number): Stereo {
  for (let i = 0; i < sound.left.length; i++) {
    sound.left[i]! *= gain;
    sound.right[i]! *= gain;
  }
  return sound;
}

/** A recorded track with a nature sound underneath, set a fixed distance below the music. */
function mixUnder(track: Stereo, nature: Stereo): Stereo {
  let sum = 0;
  for (let i = 0; i < track.left.length; i++) sum += track.left[i]! ** 2 + track.right[i]! ** 2;
  const bed = levelTo(nature, Math.sqrt(sum / (2 * track.left.length)) * NATURE_UNDER_TRACK);
  for (let i = 0; i < track.left.length; i++) {
    track.left[i]! += bed.left[i] ?? 0;
    track.right[i]! += bed.right[i] ?? 0;
  }
  return track;
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
