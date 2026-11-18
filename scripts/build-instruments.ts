import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { findFfmpeg } from "../src/render/ffmpeg.js";
import { cacheDir } from "../src/render/voice.js";

/**
 * Builds the instrument pack in instruments/ from the VS Chamber Orchestra:
 * Community Edition (CC0), pinned to one commit so it never changes underneath us.
 *
 * For each recording it trims the silence at the start, shortens long notes with a
 * fade, measures the real pitch (the set's note names use mixed octave conventions),
 * evens out the volume, and saves a small Opus file. Run with `npm run instruments`.
 * Only maintainers need to run it; the result is committed.
 */

const root = fileURLToPath(new URL("..", import.meta.url));
const OUT = join(root, "instruments");
const REPO = "sgossner/VSCO-2-CE";
const COMMIT = "440300901dfe9275fd84e0b7763af1f8443ae62e";
const RATE = 44_100;

interface Source {
  instrument: string;
  path: string;
  /** Seconds to keep. Longer recordings fade out. */
  keep: number;
  /** The note recorded, as a MIDI number, for pitched instruments. Drums have none. */
  midi?: number;
}

const PITCH_CLASSES: Record<string, number> = { C: 0, "C#": 1, D: 2, "D#": 3, E: 4, F: 5, "F#": 6, G: 7, "G#": 8, A: 9, "A#": 10, B: 11 };
/** "F#3" to its MIDI number. `octaveShift` corrects sets whose names are an octave out. */
function noteToMidi(name: string, octaveShift = 0): number {
  const [, letter, octave] = name.match(/^([A-G]#?)(-?\d)$/)!;
  return 12 * (Number(octave) + 1 + octaveShift) + PITCH_CLASSES[letter!]!;
}

// The piano's mapping chart: file 000 is MIDI 21 (bottom A), and each file is two semitones up.
const pianoFiles = Array.from({ length: 16 }, (_, i) => 6 + i * 2);
const pianoFile = (n: number) => String(n).padStart(3, "0");
const SOURCES: Source[] = [
  ...pianoFiles.map((n) => ({ instrument: "piano-soft", path: `Keys/Upright Piano/Player_dyn1_rr1_${pianoFile(n)}.wav`, keep: 6, midi: 21 + n * 2 })),
  ...pianoFiles.map((n) => ({ instrument: "piano", path: `Keys/Upright Piano/Player_dyn2_rr1_${pianoFile(n)}.wav`, keep: 5, midi: 21 + n * 2 })),
  ...["A2", "A3", "B2", "B4", "C4", "D3", "D5", "E4", "F#3", "G2", "G4"].map((n) => ({
    // Named an octave low in this set (G2 is really the violin's open G3).
    instrument: "violins", path: `Strings/Violin Section/susVib/VlnEns_susVib_${n}_v1.wav`, keep: 9, midi: noteToMidi(n, 1),
  })),
  ...["A2", "B1", "B3", "C1", "C3", "D2", "D4", "E1", "E3", "F2", "F4", "G1", "G3"].map((n) => ({
    // Also named an octave low (C1 is really the cello's open C2).
    instrument: "cellos", path: `Strings/Cello Section/susvib/susvib_${n}_v1_1.wav`, keep: 9, midi: noteToMidi(n, 1),
  })),
  ...["G3", "C4", "E4", "G4", "A4", "C5", "E5", "G5", "A5", "C6"].map((n) => ({
    instrument: "solo-violin", path: `Strings/Solo Violin/Arco Vib/LLVln_ArcoVib_${n}_p.wav`, keep: 6, midi: noteToMidi(n),
  })),
  ...["G1", "D2", "F2", "A2", "C3", "E3", "G3", "B3", "D4", "F4", "A4", "C5", "E5", "G5", "B5", "D6"].map((n) => ({
    instrument: "harp", path: `Strings/Harp/KSHarp_${n}_${n === "G1" ? "mp" : "mf"}.wav`, keep: 5, midi: noteToMidi(n),
  })),
  ...[1, 2, 3, 4, 5].map((n) => ({ instrument: "timpani", path: `Percussion/Timpani/Timpani${n}_Hit_v3_rr1_Sum.wav`, keep: 4 })),
  ...[1, 3, 5].map((n) => ({ instrument: "timpani-roll", path: `Percussion/Timpani/Rolls/Timpani${n}_Roll_v3_rr1_Sum.wav`, keep: 6 })),
  { instrument: "bass-drum", path: "Percussion/BDrumNewhit_v4_rr1_Sum.wav", keep: 4 },
  { instrument: "cymbal-swell", path: "Percussion/susCymb1-cresc-Median_v1.wav", keep: 8 },
];

async function download(path: string): Promise<string> {
  const file = join(cacheDir(), "vsco", COMMIT, path);
  if (existsSync(file)) return file;
  const url = `https://raw.githubusercontent.com/${REPO}/${COMMIT}/${path.split("/").map(encodeURIComponent).join("/")}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download failed (${response.status}): ${path}`);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, Buffer.from(await response.arrayBuffer()));
  return file;
}

function run(ffmpeg: string, args: string[], input?: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpeg, args, { stdio: ["pipe", "pipe", "pipe"] });
    const chunks: Buffer[] = [];
    let errors = "";
    child.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
    child.stderr.on("data", (chunk) => (errors += chunk));
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? resolve(Buffer.concat(chunks)) : reject(new Error(errors))));
    child.stdin.end(input);
  });
}

/** Decodes any audio file to interleaved stereo floats at 44.1 kHz. */
async function decode(ffmpeg: string, file: string): Promise<Float32Array> {
  const raw = await run(ffmpeg, ["-v", "error", "-i", file, "-f", "f32le", "-ac", "2", "-ar", String(RATE), "-"]);
  return new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
}

/** Fundamental frequency by normalised autocorrelation over a steady part of the note. */
function measurePitch(stereo: Float32Array): number {
  const start = Math.round(0.15 * RATE);
  const size = Math.round(0.25 * RATE);
  const mono = new Float32Array(size);
  for (let i = 0; i < size; i++) mono[i] = (stereo[(start + i) * 2] ?? 0) + (stereo[(start + i) * 2 + 1] ?? 0);
  const minLag = Math.floor(RATE / 2200);
  const maxLag = Math.floor(RATE / 30);
  const scores: number[] = [];
  for (let lag = minLag; lag <= maxLag; lag++) {
    let sum = 0;
    let energy = 0;
    for (let i = 0; i + lag < size; i++) {
      sum += mono[i]! * mono[i + lag]!;
      energy += mono[i]! ** 2 + mono[i + lag]! ** 2;
    }
    scores.push(energy ? (2 * sum) / energy : 0);
  }
  // The first strong peak is the fundamental; later peaks are its multiples.
  const best = Math.max(...scores);
  let index = scores.findIndex((score, i) => score > best * 0.9 && score >= (scores[i - 1] ?? 0) && score >= (scores[i + 1] ?? 0));
  // Refine between samples with a parabola through the peak and its neighbours.
  const a = scores[index - 1] ?? 0;
  const b = scores[index]!;
  const c = scores[index + 1] ?? 0;
  const shift = (a - c) / (2 * (a - 2 * b + c) || 1);
  return RATE / (minLag + index + shift);
}

/** Trims the silence before the note, keeps `keep` seconds with a short fade, and evens out loudness. */
function shape(stereo: Float32Array, keep: number): Float32Array {
  const frames = stereo.length / 2;
  let first = 0;
  while (first < frames && Math.abs(stereo[first * 2]!) + Math.abs(stereo[first * 2 + 1]!) < 0.003) first++;
  first = Math.max(0, first - Math.round(0.004 * RATE));
  const length = Math.min(frames - first, Math.round(keep * RATE));
  const fade = Math.round(Math.min(0.6, keep / 4) * RATE);
  const out = new Float32Array(length * 2);
  let sum = 0;
  // A 3 ms fade-in: too short to soften the attack, long enough to stop a click.
  const fadeIn = Math.round(0.003 * RATE);
  for (let i = 0; i < length; i++) {
    const g = (i < fadeIn ? i / fadeIn : 1) * (i > length - fade ? (length - i) / fade : 1);
    out[i * 2] = stereo[(first + i) * 2]! * g;
    out[i * 2 + 1] = stereo[(first + i) * 2 + 1]! * g;
  }
  const body = Math.min(length, Math.round(1.5 * RATE));
  for (let i = 0; i < body * 2; i++) sum += out[i]! ** 2;
  const gain = 0.12 / (Math.sqrt(sum / (body * 2)) || 1);
  let peak = 0;
  for (let i = 0; i < out.length; i++) peak = Math.max(peak, Math.abs(out[i]! * gain));
  const safe = peak > 0.95 ? 0.95 / peak : 1;
  for (let i = 0; i < out.length; i++) out[i]! *= gain * safe;
  return out;
}

const ffmpeg = findFfmpeg();
const manifest: Record<string, { file: string; midi?: number; cents?: number }[]> = {};
await rm(OUT, { recursive: true, force: true });

let done = 0;
const checks: string[] = [];
for (const source of SOURCES) {
  const stereo = await decode(ffmpeg, await download(source.path));
  const shaped = shape(stereo, source.keep);
  const name = source.path.split("/").at(-1)!.replace(/\.wav$/i, "").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const file = `${source.instrument}/${name}.opus`;
  await mkdir(join(OUT, source.instrument), { recursive: true });
  const pcm = Buffer.from(shaped.buffer);
  await run(ffmpeg, ["-v", "error", "-y", "-f", "f32le", "-ac", "2", "-ar", String(RATE), "-i", "-", "-c:a", "libopus", "-b:a", "96k", join(OUT, file)], pcm);

  const entry: { file: string; midi?: number; cents?: number } = { file };
  if (source.midi !== undefined) {
    // The name gives the note. The measurement only fine-tunes it, and only when the two
    // agree, because a detector can lock onto an overtone instead of the note itself.
    const exact = 69 + 12 * Math.log2(measurePitch(shaped) / 440);
    entry.midi = source.midi;
    entry.cents = Math.abs(exact - source.midi) < 0.5 ? Math.round((exact - source.midi) * 100) : 0;
    if (!entry.cents && Math.abs(exact - source.midi) >= 0.5) checks.push(`${source.path}: measured ${exact.toFixed(1)}, using ${source.midi}`);
  }
  (manifest[source.instrument] ??= []).push(entry);
  process.stdout.write(`\r${++done} of ${SOURCES.length} ${source.path.padEnd(70)}`);
}

for (const notes of Object.values(manifest)) notes.sort((a, b) => (a.midi ?? 0) - (b.midi ?? 0));
await writeFile(
  join(OUT, "manifest.json"),
  `${JSON.stringify({ source: `https://github.com/${REPO}/tree/${COMMIT}`, licence: "CC0-1.0", instruments: manifest }, null, 2)}\n`,
);
await writeFile(
  join(OUT, "CREDITS.md"),
  `# Instrument credits

These recordings come from the [VS Chamber Orchestra: Community Edition](https://github.com/${REPO}) by Versilian Studios,
released under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) (public domain).

Recorded by Sam Gossner and Simon Dalzell; sample cutting by Elan Hickler (Soundemote). Upright piano sampled by Simon Dalzell of Ivy Audio.
Credit isn't required, but it's given gladly.

Built from commit \`${COMMIT}\` by \`scripts/build-instruments.ts\`: trimmed, shortened with a fade, levelled and saved as Opus.
`,
);
console.log(`\n✓ ${SOURCES.length} recordings in instruments/`);
if (checks.length) console.log(`Pitch measurements that disagreed with the note name (name used):\n  ${checks.join("\n  ")}`);
