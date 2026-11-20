/**
 * Nature sounds for the ambient mood: rain, sea waves, a stream and wind. Each is a
 * real field recording, released as CC0 or public domain (see nature/CREDITS.md),
 * cut into a seamless loop and shipped inside the package as a small Opus file.
 *
 * Some sounds have more than one recording, so two rainy films needn't sound the
 * same. A film gets one, picked from its title.
 */
import { fileURLToPath } from "node:url";
import { NATURE_SOUNDS } from "../spec/schema.js";
import { decodeAudio } from "./ffmpeg.js";
import { seededRandom } from "./music.js";
import { packageRoot } from "./style.js";

export { NATURE_SOUNDS };
export type NatureSound = (typeof NATURE_SOUNDS)[number];

export interface Stereo {
  left: Float32Array;
  right: Float32Array;
}

export interface NatureRecording {
  /** The file in nature/, without its extension. */
  id: string;
  title: string;
  by: string;
  /** The original recording's page. */
  page: string;
  licence: "CC0 1.0" | "Public domain";
  /** Where the loop was cut from: a pinned copy in one of the PACKS. */
  pack: "omarchy" | "brown-noise";
  path: string;
  sha256: string;
  /** Where in the source the loop starts, in seconds. */
  from: number;
}

export const NATURE_RECORDINGS: Record<NatureSound, NatureRecording[]> = {
  rain: [
    { id: "rain-tile-roof", title: "Soft rain on a tile roof", by: "richwise", page: "https://freesound.org/s/466241/", licence: "CC0 1.0", pack: "omarchy", path: "sounds/rain.ogg", sha256: "b29bb359af8f9569e7b409bb025aac4dcee1a4c2ef491920ec0c4d9c2a378f3f", from: 30 },
    { id: "rain-window", title: "Rain against the window", by: "cori", page: "https://commons.wikimedia.org/wiki/File:Rain_against_the_window.ogg", licence: "Public domain", pack: "brown-noise", path: "sounds/rain-window.ogg", sha256: "0d86a169803660b5930b23d110213162d3bb2644557abd7884efb5ff476b2d6c", from: 5 },
    { id: "rain-woods", title: "Light rain, distant thunder", by: "kvgarlic", page: "https://commons.wikimedia.org/wiki/File:Light_Rain_Distant_Thunder_July_5th_2016.wav", licence: "CC0 1.0", pack: "brown-noise", path: "sounds/light-rain-woods.ogg", sha256: "3c436824bf10481b70f90b91e41ac9326816739249ac4e15e47dbb54e06bfd99", from: 5 },
  ],
  waves: [
    { id: "waves-pacific", title: "Crashing waves, Pacific Ocean", by: "SecureSubset", page: "https://freesound.org/s/817075/", licence: "CC0 1.0", pack: "omarchy", path: "sounds/waves.ogg", sha256: "738c325c88a41dd544c7940b3b402c8d3a7bb5c59ec83b3e83600d3a0e59f82d", from: 30 },
  ],
  stream: [
    { id: "stream-river", title: "Relaxing river", by: "IceVFX", page: "https://freesound.org/s/722875/", licence: "CC0 1.0", pack: "omarchy", path: "sounds/stream.ogg", sha256: "511255b980efa5bcbb554492ab3c823f5e29df640ed213382d303f0c4bf91d0d", from: 30 },
    { id: "stream-mountain", title: "Snowmelt flowing into a lake", by: "Extemporalist", page: "https://commons.wikimedia.org/wiki/File:Snowmelt_flowing_into_lake_at_Okanagan_Mountain_Provincial_Park.flac", licence: "CC0 1.0", pack: "brown-noise", path: "sounds/mountain-stream.ogg", sha256: "6fe8cc615fda045221b3362153d30d4a69c5e9c195a7c310901613c8f2b0d1da", from: 5 },
    { id: "stream-weir", title: "River weir", by: "Juandev", page: "https://commons.wikimedia.org/wiki/File:Vojn%C3%ADkov,_3._jez,_st%C5%99eda.ogg", licence: "Public domain", pack: "brown-noise", path: "sounds/river-weir.ogg", sha256: "f3f2e587d0d092cbde6f4c0e6cd10fcbc15a27aef57bc13dfea6b382ac3d93f2", from: 5 },
  ],
  wind: [
    { id: "wind-bushes", title: "Wind on bushes", by: "felix.blume", page: "https://freesound.org/s/711106/", licence: "CC0 1.0", pack: "omarchy", path: "sounds/wind.ogg", sha256: "038aa5449ccfe210ca04c73234b02fbfa3a494c995751da60e6be6cb8f2b51ab", from: 30 },
    { id: "wind-trees", title: "Wind in the trees, Grunewald", by: "dbspin", page: "https://commons.wikimedia.org/wiki/File:245286_dbspin_grunewald.wav", licence: "CC0 1.0", pack: "brown-noise", path: "sounds/wind-in-trees.ogg", sha256: "77422ad235f153c4436969af9fd39a0771dba041c55829f369a1be4561d3122f", from: 5 },
  ],
};

/** The nature sound an ambient film gets: the one it asks for, or one picked from its title. */
export function pickNature(seed: string, nature?: NatureSound): NatureSound {
  return nature ?? NATURE_SOUNDS[Math.floor(seededRandom(`${seed}:nature`)() * NATURE_SOUNDS.length)]!;
}

/** Which recording of that sound the film gets, picked from its title. */
export function pickRecording(seed: string, kind: NatureSound): NatureRecording {
  const options = NATURE_RECORDINGS[kind];
  return options[Math.floor(seededRandom(`${seed}:nature-recording`)() * options.length)]!;
}

/**
 * A nature sound for the whole film: the recording's loop played round as often as
 * needed (each loop's end already blends into its start), levelled so every sound
 * sits the same under the music.
 */
export async function natureBed(o: { kind: NatureSound; seed: string; seconds: number; ffmpeg: string; sampleRate?: number }): Promise<Stereo> {
  const recording = pickRecording(o.seed, o.kind);
  const file = fileURLToPath(new URL(`nature/${recording.id}.opus`, packageRoot));
  const loop = await decodeAudio(o.ffmpeg, file, o.sampleRate ?? 44_100);
  const length = Math.ceil(o.seconds * (o.sampleRate ?? 44_100));
  const left = new Float32Array(length);
  const right = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    left[i] = loop.left[i % loop.left.length]!;
    right[i] = loop.right[i % loop.right.length]!;
  }
  return levelTo({ left, right }, NATURE_RMS);
}

/** How loud a nature bed is: the same steady level the code-made sounds had. */
export const NATURE_RMS = 0.1;

/** Scales a sound to an average (RMS) level. */
export function levelTo(sound: Stereo, rms: number): Stereo {
  let sum = 0;
  for (let i = 0; i < sound.left.length; i++) sum += sound.left[i]! ** 2 + sound.right[i]! ** 2;
  const gain = rms / (Math.sqrt(sum / (2 * sound.left.length)) || 1);
  for (let i = 0; i < sound.left.length; i++) {
    sound.left[i]! *= gain;
    sound.right[i]! *= gain;
  }
  return sound;
}
