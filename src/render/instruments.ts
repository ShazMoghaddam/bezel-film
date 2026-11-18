import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { decodeAudio } from "./ffmpeg.js";
import { packageRoot } from "./style.js";

/**
 * Recorded instruments (piano, strings, harp, timpani and more) from the
 * VS Chamber Orchestra: Community Edition, CC0. They ship inside the package
 * as small Opus files, built by scripts/build-instruments.ts, and ffmpeg decodes
 * them when a film needs them.
 */

export const INSTRUMENT_SAMPLE_RATE = 44_100;

export type InstrumentName =
  | "piano"
  | "piano-soft"
  | "violins"
  | "cellos"
  | "solo-violin"
  | "harp"
  | "timpani"
  | "timpani-roll"
  | "bass-drum"
  | "cymbal-swell";

export interface Recording {
  /** The note recorded, as a MIDI number. Drums have none. */
  midi?: number;
  /** How far the recording sits from that note, in hundredths of a semitone. */
  cents: number;
  left: Float32Array;
  right: Float32Array;
}

export type Instruments = Map<InstrumentName, Recording[]>;

interface Manifest {
  instruments: Record<string, { file: string; midi?: number; cents?: number }[]>;
}

/** Loads just the instruments a piece of music needs. */
export async function loadInstruments(names: InstrumentName[], ffmpeg: string): Promise<Instruments> {
  const folder = new URL("instruments/", packageRoot);
  const manifest = JSON.parse(await readFile(new URL("manifest.json", folder), "utf8")) as Manifest;
  const instruments: Instruments = new Map();
  await Promise.all(
    [...new Set(names)].map(async (name) => {
      const entries = manifest.instruments[name];
      if (!entries?.length) throw new Error(`The instrument "${name}" is missing from the instrument pack`);
      const recordings = await Promise.all(
        entries.map(async (entry) => ({
          midi: entry.midi,
          cents: entry.cents ?? 0,
          ...(await decodeAudio(ffmpeg, fileURLToPath(new URL(entry.file, folder)), INSTRUMENT_SAMPLE_RATE)),
        })),
      );
      instruments.set(name, recordings);
    }),
  );
  return instruments;
}

/** The recording closest to a note, so it needs the least pitch shifting. */
export function closestRecording(recordings: Recording[], midi: number | undefined, pick = 0): Recording {
  if (midi === undefined || recordings[0]?.midi === undefined) return recordings[pick % recordings.length]!;
  let best = recordings[0]!;
  for (const recording of recordings) {
    if (Math.abs(recording.midi! - midi) < Math.abs(best.midi! - midi)) best = recording;
  }
  return best;
}
