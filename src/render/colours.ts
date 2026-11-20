import { Filter } from "./filter.js";

/**
 * Extra tone colours for the music: a lone whistle with slow vibrato, slides and the odd
 * quarter-flat bend; a daf-style frame drum; and a choir-like "aah". All melodies that
 * use them are generated, not borrowed.
 */

const SR = 44_100;
const midiToHz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

export interface Stereo {
  left: Float32Array;
  right: Float32Array;
  length: number;
}

export interface WhistleNote {
  start: number;
  length: number;
  /** May be fractional: 0.5 is a quarter tone. */
  midi: number;
  /** Seconds spent sliding into this note from the one before. */
  glide?: number;
  /** A dip and return inside the note, e.g. a quarter-flat koron bend. */
  bend?: { at: number; by: number; time: number };
  /** A sighing fall at the very end of the note, in semitones, as the breath runs out. */
  fall?: number;
}

const smooth = (x: number) => x * x * (3 - 2 * x);

/**
 * A whistled phrase: one continuous breath through all its notes, so it slides
 * between them like a real whistler. A near-pure tone, a breath of air around it,
 * and vibrato that blooms the longer a note is held.
 */
export function whistle(out: Stereo, phrase: WhistleNote[], amp: number, random: () => number) {
  if (!phrase.length) return;
  const first = phrase[0]!;
  const last = phrase.at(-1)!;
  const from = Math.floor(first.start * SR);
  const end = last.start + last.length;
  const to = Math.min(out.length, Math.floor((end + 0.4) * SR));
  const breath = new Filter("bandpass", midiToHz(first.midi), 9, SR);
  const air = new Filter("highpass", 3500, 0.7, SR);
  const rate = 4.4 + random() * 0.5;
  let phase = 0;
  let index = 0;
  for (let i = from; i < to; i++) {
    const t = i / SR;
    while (index < phrase.length - 1 && t >= phrase[index + 1]!.start) index++;
    const note = phrase[index]!;
    const into = t - note.start;
    let midi = note.midi;
    const prev = phrase[index - 1];
    if (prev && note.glide && into < note.glide) midi = prev.midi + (note.midi - prev.midi) * smooth(Math.max(0, into) / note.glide);
    if (note.bend && into > note.bend.at && into < note.bend.at + note.bend.time) {
      midi += note.bend.by * Math.sin((Math.PI * (into - note.bend.at)) / note.bend.time);
    }
    const fallStart = note.length - 0.55;
    if (note.fall && into > fallStart) midi -= note.fall * smooth(Math.min(1, (into - fallStart) / 0.95));
    // Vibrato starts still and blooms over the first 0.7 seconds of each note.
    const depth = 0.35 * smooth(Math.min(1, Math.max(0, into - 0.15) / 0.7));
    const wobble = Math.sin(2 * Math.PI * rate * t);
    const hz = midiToHz(midi + depth * wobble);
    phase += (2 * Math.PI * hz) / SR;

    // Breath shape: swell in, a slight lift with each vibrato, fade out at the end.
    const intoPhrase = t - first.start;
    let env = smooth(Math.min(1, intoPhrase / 0.28)) * (1 + 0.05 * wobble * (depth / 0.35));
    if (t > end) env *= Math.max(0, 1 - (t - end) / 0.4) ** 2;
    const tone = Math.sin(phase) + 0.035 * Math.sin(2 * phase);
    if (i % 64 === 0) breath.tune(hz);
    const noise = random() * 2 - 1;
    const v = (tone * 0.85 + breath.run(noise) * 0.9 + air.run(noise) * 0.015) * env * amp;
    out.left[i]! += v * 0.92;
    out.right[i]! += v * 1.0;
  }
}

/** A frame drum stroke: "dum" is the deep centre, "tak" the sharp edge. Both ring with the jingles inside the frame. */
export function frameDrum(out: Stereo, start: number, stroke: "dum" | "tak", amp: number, random: () => number) {
  const from = Math.floor(start * SR);
  const to = Math.min(out.length, from + Math.floor(0.9 * SR));
  const skin = new Filter("lowpass", stroke === "dum" ? 900 : 2400, 0.7, SR);
  const jingles = new Filter("bandpass", 7200, 2.2, SR);
  const [body, fall, decay] = stroke === "dum" ? [78, 40, 0.32] : [230, 60, 0.07];
  let phase = 0;
  for (let i = from; i < to; i++) {
    const t = (i - from) / SR;
    phase += (2 * Math.PI * (body + fall * Math.exp(-t / 0.02))) / SR;
    const noise = random() * 2 - 1;
    const v =
      Math.sin(phase) * Math.exp(-t / decay) * (stroke === "dum" ? 1 : 0.45) +
      skin.run(noise) * Math.exp(-t / (stroke === "dum" ? 0.04 : 0.025)) * 0.6 +
      jingles.run(noise) * Math.exp(-t / 0.16) * 0.5;
    out.left[i]! += v * amp * 0.95;
    out.right[i]! += v * amp;
  }
}

const SAW = (() => {
  const size = 4096;
  const table = new Float32Array(size);
  for (let h = 1; h <= 18; h++) for (let s = 0; s < size; s++) table[s]! += Math.sin((2 * Math.PI * h * s) / size) / h;
  return table;
})();

/**
 * A choir-like "aah": rich tones shaped by the three resonances of the vowel,
 * several slightly different voices per note, swelling slowly in and out.
 */
export function choir(out: Stereo, notes: number[], start: number, length: number, amp: number, random: () => number) {
  const from = Math.floor(start * SR);
  const to = Math.min(out.length, Math.floor((start + length + 1.5) * SR));
  for (const midi of notes) {
    for (let v = 0; v < 3; v++) {
      const formants = [new Filter("bandpass", 730, 6, SR), new Filter("bandpass", 1090, 7, SR), new Filter("bandpass", 2440, 9, SR)];
      const detune = (v - 1) * 0.09 + (random() - 0.5) * 0.04;
      const rate = 4.6 + random() * 0.8;
      const pan = (v - 1) * 0.5 + (random() - 0.5) * 0.3;
      let phase = random() * 4096;
      for (let i = from; i < to; i++) {
        const t = (i - from) / SR;
        const hz = midiToHz(midi + detune + 0.12 * Math.sin(2 * Math.PI * rate * t));
        phase = (phase + (hz * 4096) / SR) % 4096;
        const src = SAW[phase | 0]!;
        let env = smooth(Math.min(1, t / 1.6));
        if (t > length) env *= Math.max(0, 1 - (t - length) / 1.5) ** 2;
        const voice = (formants[0]!.run(src) + formants[1]!.run(src) * 0.6 + formants[2]!.run(src) * 0.3) * env * amp;
        out.left[i]! += voice * (1 - pan) * 0.5;
        out.right[i]! += voice * (1 + pan) * 0.5;
      }
    }
  }
}
