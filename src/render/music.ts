import { closestRecording, type InstrumentName, type Instruments } from "./instruments.js";
import { NATURE_SOUNDS, natureSound, type NatureSound } from "./nature.js";
import { choir, frameDrum, whistle, type WhistleNote } from "./colours.js";
import type { Line } from "./timeline.js";

/**
 * Background music, composed for each film. Recorded instruments (piano, strings,
 * harp, timpani) play alongside a few sounds made in code (pads, drums, bass).
 * Each mood has its own tempo, instruments, arrangement and way in. The key and
 * chord progression come from a seed (the film's title), so every film sounds a
 * little different, but the same film always sounds the same.
 */

export const MUSIC_SAMPLE_RATE = 44_100;
export type Mood = "calm" | "upbeat" | "dramatic" | "epic" | "ambient" | "reflective";

/** The recorded instruments each mood uses, so only those get loaded. */
export const MOOD_INSTRUMENTS: Record<Mood, InstrumentName[]> = {
  calm: ["piano-soft", "cellos", "violins"],
  upbeat: ["piano", "violins", "cymbal-swell"],
  dramatic: ["cellos", "violins", "solo-violin", "timpani", "timpani-roll", "bass-drum", "cymbal-swell"],
  epic: ["cellos", "violins", "solo-violin", "timpani", "timpani-roll", "bass-drum", "cymbal-swell"],
  ambient: ["piano-soft", "harp"],
  reflective: ["piano", "piano-soft", "cellos", "violins"],
};

const SCALES = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10] };
/** Keys that sit well under a voice: A, C, D, F and G. */
const ROOTS = [57, 60, 62, 53, 55];

/** Small, fast, seeded random numbers, so the same seed always gives the same music. */
export function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
  let a = (h << 13) | (h >>> 19);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const midiToHz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

/** Notes of a key: `note(step)` gives the MIDI note for any scale step, going up through octaves. */
function keyOf(root: number, scale: number[]) {
  return (step: number) => root + scale[((step % 7) + 7) % 7]! + 12 * Math.floor(step / 7);
}

// One cycle of each sound made in code, looked up by phase. Much faster than adding sines per sample.
const TABLE_SIZE = 4096;
function wavetable(harmonics: number[]): Float32Array {
  const table = new Float32Array(TABLE_SIZE);
  harmonics.forEach((amp, i) => {
    for (let s = 0; s < TABLE_SIZE; s++) table[s]! += amp * Math.sin((2 * Math.PI * (i + 1) * s) / TABLE_SIZE);
  });
  const peak = table.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
  return table.map((v) => v / peak);
}
const BASS = wavetable([1, 0.55, 0.3, 0.18, 0.1, 0.05]);

const pan = (p: number) => [Math.cos(((p + 1) * Math.PI) / 4), Math.sin(((p + 1) * Math.PI) / 4)] as const;

class Track {
  readonly left: Float32Array;
  readonly right: Float32Array;
  constructor(
    readonly length: number,
    readonly instruments: Instruments,
  ) {
    this.left = new Float32Array(length);
    this.right = new Float32Array(length);
  }

  /** Plays a recorded instrument, shifted to the note. Held notes release smoothly at `length`. */
  play(o: { instrument: InstrumentName; midi?: number; start: number; amp: number; length?: number; release?: number; attack?: number; pan?: number; pick?: number }) {
    const recordings = this.instruments.get(o.instrument);
    if (!recordings) throw new Error(`The music needs the "${o.instrument}" instrument, which isn't loaded`);
    const recording = closestRecording(recordings, o.midi, o.pick);
    const recorded = recording.midi === undefined ? 0 : recording.midi + recording.cents / 100;
    const rate = o.midi === undefined || recording.midi === undefined ? 1 : 2 ** ((o.midi - recorded) / 12);
    const sr = MUSIC_SAMPLE_RATE;
    const release = o.release ?? 0.6;
    const from = Math.max(0, Math.floor(o.start * sr));
    const playable = Math.floor((recording.left.length - 1) / rate);
    const held = o.length === undefined ? playable : Math.min(playable, Math.floor((o.length + release) * sr));
    const to = Math.min(this.length, from + held);
    const [gl, gr] = pan(o.pan ?? 0);
    // At least 3 ms, so no note can start with a click.
    const attack = Math.max(0.003, o.attack ?? 0) * sr;
    for (let i = from; i < to; i++) {
      const n = i - from;
      const position = n * rate;
      const k = position | 0;
      const f = position - k;
      let env = n < attack ? n / attack : 1;
      if (o.length !== undefined && n > o.length * sr) env *= Math.max(0, 1 - (n - o.length * sr) / (release * sr)) ** 2;
      const l = recording.left[k]! + (recording.left[k + 1]! - recording.left[k]!) * f;
      const r = recording.right[k]! + (recording.right[k + 1]! - recording.right[k]!) * f;
      this.left[i]! += l * env * o.amp * gl * 1.41;
      this.right[i]! += r * env * o.amp * gr * 1.41;
    }
  }

  /** A note made in code, with attack, hold and release, and optional decay and slow swell. */
  tone(o: { hz: number; start: number; length: number; amp: number; wave: Float32Array; attack: number; release: number; pan?: number; decay?: number; swell?: number }) {
    const sr = MUSIC_SAMPLE_RATE;
    const from = Math.max(0, Math.floor(o.start * sr));
    const to = Math.min(this.length, Math.floor((o.start + o.length + o.release) * sr));
    const step = (o.hz * TABLE_SIZE) / sr;
    const [gl, gr] = pan(o.pan ?? 0);
    let phase = 0;
    for (let i = from; i < to; i++) {
      // Rounding can put the first sample a hair before the start; never let time go negative.
      const t = Math.max(0, i / sr - o.start);
      let env = t < o.attack ? (t / o.attack) ** 1.5 : 1;
      if (o.decay) env *= Math.exp(-t / o.decay);
      if (o.swell) env *= 0.85 + 0.15 * Math.sin((2 * Math.PI * t) / o.swell);
      if (t > o.length) env *= Math.max(0, 1 - (t - o.length) / o.release) ** 2;
      const v = o.wave[phase | 0]! * env * o.amp;
      phase = (phase + step) % TABLE_SIZE;
      this.left[i]! += v * gl;
      this.right[i]! += v * gr;
    }
  }

  /** Punchy kick: a sine that drops fast in pitch, with a short click on top. */
  kick(start: number, amp: number) {
    const sr = MUSIC_SAMPLE_RATE;
    const from = Math.floor(start * sr);
    const to = Math.min(this.length, from + Math.floor(0.45 * sr));
    let phase = 0;
    for (let i = from; i < to; i++) {
      const t = (i - from) / sr;
      const hz = 48 + 130 * Math.exp(-t / 0.035);
      phase += (2 * Math.PI * hz) / sr;
      const body = Math.sin(phase) * Math.exp(-t / 0.16);
      const click = t < 0.004 ? (1 - t / 0.004) * 0.5 : 0;
      const v = Math.tanh((body + click) * 1.6) * amp;
      this.left[i]! += v;
      this.right[i]! += v;
    }
  }

  /** A tuned drum (snare body or tom): a sine falling from one pitch to another. */
  drum(start: number, amp: number, fromHz: number, toHz: number, decay: number) {
    const sr = MUSIC_SAMPLE_RATE;
    const from = Math.floor(start * sr);
    const to = Math.min(this.length, from + Math.floor(decay * 6 * sr));
    let phase = 0;
    for (let i = from; i < to; i++) {
      const t = (i - from) / sr;
      phase += (2 * Math.PI * (toHz + (fromHz - toHz) * Math.exp(-t / 0.03))) / sr;
      const v = Math.sin(phase) * Math.exp(-t / decay) * amp;
      this.left[i]! += v;
      this.right[i]! += v;
    }
  }

  /** Noise shaped into a clap (several quick bursts) or a hi-hat (bright, short). */
  noise(o: { start: number; amp: number; length: number; bright: number; bursts?: number; pan?: number; random: () => number }) {
    const sr = MUSIC_SAMPLE_RATE;
    const [gl, gr] = pan(o.pan ?? 0);
    const bursts = o.bursts ?? 1;
    for (let b = 0; b < bursts; b++) {
      const from = Math.floor((o.start + b * 0.011) * sr);
      const length = b === bursts - 1 ? o.length : 0.01;
      const to = Math.min(this.length, from + Math.floor(length * 4 * sr));
      let low = 0;
      for (let i = from; i < to; i++) {
        const white = o.random() * 2 - 1;
        low += (white - low) * (1 - o.bright);
        const v = (white - low) * Math.exp(-(i - from) / sr / length) * o.amp;
        this.left[i]! += v * gl;
        this.right[i]! += v * gr;
      }
    }
  }
}

/** Freeverb-style reverb: parallel comb filters into series all-pass filters. */
function reverb(input: Float32Array, spread: number, room = 0.84, damp = 0.3): Float32Array {
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map((n) => n + spread);
  const allpasses = [556, 441, 341, 225].map((n) => n + spread);
  const out = new Float32Array(input.length);
  for (const size of combs) {
    const buffer = new Float32Array(size);
    let index = 0;
    let store = 0;
    for (let i = 0; i < input.length; i++) {
      const y = buffer[index]!;
      store = y * (1 - damp) + store * damp;
      buffer[index] = input[i]! * 0.015 + store * room;
      index = (index + 1) % size;
      out[i]! += y;
    }
  }
  for (const size of allpasses) {
    const buffer = new Float32Array(size);
    let index = 0;
    for (let i = 0; i < out.length; i++) {
      const b = buffer[index]!;
      const x = out[i]!;
      buffer[index] = x + b * 0.5;
      out[i] = b - x;
      index = (index + 1) % size;
    }
  }
  return out;
}

interface Plan {
  track: Track;
  /** A second track for parts that should "pump": dip slightly on every kick, as in modern dance and product music. */
  bed: Track;
  /** The pump's volume curve, if the arrangement sets one. */
  pump?: Float32Array;
  /** Epic: dramatic music with a frame drum groove and a choir swelling in. */
  epic: boolean;
  note: (step: number) => number;
  /** Scale steps of each chord's root, in order. */
  progression: number[];
  chordSeconds: number;
  beat: number;
  chords: number;
  seconds: number;
  random: () => number;
}

/** Calm: flowing piano broken chords and a gentle melody over warm cellos, with violins softly above. */
function calm(p: Plan) {
  const { track, note, beat, chordSeconds, random } = p;
  // Uneven broken chords that flow rather than tick.
  const shape = [
    [0, 0], [1.5, 2], [3, 4], [4.5, 2], [6, 7],
  ] as const;
  let melody = 4;
  for (let c = 0; c < p.chords; c++) {
    const start = c * chordSeconds;
    const r = p.progression[c % p.progression.length]!;
    track.play({ instrument: "piano-soft", midi: note(r - 7), start, amp: 0.5, pan: -0.2 });
    for (const [at, step] of shape) {
      if (random() < 0.15 && at > 0) continue;
      track.play({ instrument: "piano-soft", midi: note(r + step), start: start + at * beat + random() * 0.03, amp: 0.38 + random() * 0.08, pan: 0.1 });
    }
    // A gentle melody note at the start and middle of each chord, moving by small steps.
    for (const at of [0, 4]) {
      melody = Math.max(2, Math.min(9, melody + [-1, 0, 1, 2, -2][Math.floor(random() * 5)]!));
      const chordTones = [r, r + 2, r + 4, r + 7, r + 9].map((s) => s % 7);
      while (!chordTones.includes(((melody % 7) + 7) % 7)) melody++;
      track.play({ instrument: "piano-soft", midi: note(melody + 7), start: start + at * beat, amp: 0.5, pan: 0.25 });
    }
    track.play({ instrument: "cellos", midi: note(r - 7), start, amp: 0.2, attack: c === 0 ? 2.5 : 1.2, length: chordSeconds, release: 1.5, pan: -0.3 });
    track.play({ instrument: "violins", midi: note(r + 9), start, amp: c === 0 ? 0.06 : 0.1, attack: 2, length: chordSeconds, release: 1.5, pan: 0.35 });
  }
}

/** Upbeat: a driving, grown-up groove. A full drum kit, a deep pulsing bass, dark piano chords and strings. */
function upbeat(p: Plan) {
  const { track, bed, note, beat, chordSeconds, random } = p;
  const sr = MUSIC_SAMPLE_RATE;
  const pump = new Float32Array(bed.length).fill(1);
  const kickAt = (at: number, amp: number) => {
    track.kick(at, amp);
    // Duck the bed under each kick, then let it swell back: the "pump".
    const from = Math.floor(at * sr);
    for (let k = 0; k < beat * sr && from + k < pump.length; k++) pump[from + k] = Math.min(pump[from + k]!, 1 - 0.55 * Math.exp(-k / (0.09 * sr)));
  };
  const snare = (at: number, amp: number) => {
    track.drum(at, amp * 0.9, 190, 120, 0.07);
    track.noise({ start: at, amp: amp * 0.55, length: 0.14, bright: 0.5, random });
    track.noise({ start: at + 0.005, amp: amp * 0.35, length: 0.1, bright: 0.65, bursts: 3, pan: 0.1, random });
  };
  for (let c = 0; c < p.chords; c++) {
    const start = c * chordSeconds;
    const r = p.progression[c % p.progression.length]!;
    const fill = c % 4 === 3;
    if (c % 4 === 0 && c > 0) track.noise({ start, amp: 0.16, length: 1.4, bright: 0.85, pan: -0.2, random });
    for (let b = 0; b < 8; b++) {
      const at = start + b * beat;
      const last = fill && b >= 6;
      if (!last) {
        kickAt(at, 0.62);
        if (b % 4 === 1) kickAt(at + beat * 0.75, 0.38);
        if (b % 2 === 1) snare(at, 0.5);
      }
      // Sixteenth-note hi-hats with a lilt: accented, ghosted, and an open hat on the off-beat.
      for (let s16 = 0; s16 < 4; s16++) {
        const swing = s16 % 2 ? 0.02 : 0;
        const open = s16 === 2;
        track.noise({
          start: at + (s16 * beat) / 4 + swing, amp: open ? 0.07 : s16 === 0 ? 0.06 : 0.035, length: open ? 0.16 : 0.025,
          bright: 0.93, pan: 0.35, random,
        });
      }
      // Bass: deep, driving eighth notes on the root, slightly overdriven.
      for (const half of [0, 0.5]) {
        bed.tone({ hz: midiToHz(note(r - 14)), start: at + half * beat, length: beat * 0.42, amp: 0.3, wave: BASS, attack: 0.004, release: 0.05, decay: 0.5 });
      }
    }
    // A tom fill into every fourth chord, falling in pitch.
    if (fill) [6, 6.25, 6.5, 6.75, 7, 7.25, 7.5, 7.75].forEach((at, i) => track.drum(start + at * beat, 0.42, 210 - i * 15, 90 - i * 5, 0.18));
    // Dark, low piano chords: on the beat, then pushed just before the third.
    for (const at of [0, 1.5, 4, 5.5]) {
      for (const step of [r, r + 2, r + 4]) {
        bed.play({ instrument: "piano", midi: note(step), start: start + at * beat, amp: 0.2, length: beat * 1.2, release: 0.3, pan: -0.15 });
      }
    }
    // Strings hold the harmony above, from the second chord on.
    if (c >= 1) {
      bed.play({ instrument: "violins", midi: note(r + 4), start, amp: 0.13, attack: 0.5, length: chordSeconds, release: 0.8, pan: 0.35 });
      bed.play({ instrument: "violins", midi: note(r + 7), start, amp: 0.1, attack: 0.5, length: chordSeconds, release: 0.8, pan: 0.5 });
    }
  }
  p.pump = pump;
}

/**
 * Dramatic: a low rumble, then cellos and violins building, with timpani, a solo violin and swells.
 * Epic is the same piece with a frame drum groove and a choir added.
 */
function dramatic(p: Plan) {
  const { track, note, chordSeconds, random } = p;
  track.play({ instrument: "timpani-roll", start: 0, amp: 0.45, attack: 1.5, length: chordSeconds * 0.7, release: 1.5 });
  const swell = track.instruments.get("cymbal-swell")?.[0];
  const swellSeconds = swell ? swell.left.length / MUSIC_SAMPLE_RATE : 0;
  let melody = 9;
  for (let c = 0; c < p.chords; c++) {
    const start = c * chordSeconds;
    const r = p.progression[c % p.progression.length]!;
    // Builds across the film: quieter at first, fuller by the end.
    const build = 0.6 + 0.4 * Math.min(1, c / Math.max(1, p.chords - 1));
    track.play({ instrument: "cellos", midi: note(r - 7), start, amp: 0.3 * build, attack: c === 0 ? 3 : 0.8, length: chordSeconds, release: 1.2, pan: -0.3 });
    track.play({ instrument: "cellos", midi: note(r - 3), start, amp: 0.18 * build, attack: c === 0 ? 3 : 0.8, length: chordSeconds, release: 1.2, pan: -0.1 });
    if (c >= 1) {
      track.play({ instrument: "violins", midi: note(r + 2), start, amp: 0.16 * build, attack: 1.2, length: chordSeconds, release: 1.2, pan: 0.3 });
      track.play({ instrument: "violins", midi: note(r + 4), start, amp: 0.13 * build, attack: 1.2, length: chordSeconds, release: 1.2, pan: 0.4 });
      track.play({ instrument: "timpani", start, amp: 0.4 * build, pick: c });
      track.play({ instrument: "bass-drum", start, amp: 0.35 * build });
    }
    if (c >= 2) {
      // A long, singing solo violin line: two notes per chord.
      for (const half of [0, 0.5]) {
        melody = Math.max(7, Math.min(12, melody + [-1, 1, 0, 2, -2][Math.floor(random() * 5)]!));
        track.play({ instrument: "solo-violin", midi: note(melody + 7), start: start + half * chordSeconds, amp: 0.22 * build, attack: 0.4, length: chordSeconds / 2 - 0.2, release: 0.8, pan: 0.1 });
      }
    }
    // A cymbal swell rising into every fourth chord.
    if (swell && c % 4 === 3 && c + 1 < p.chords) {
      track.play({ instrument: "cymbal-swell", start: start + chordSeconds - swellSeconds * 0.9, amp: 0.3 });
    }
    if (p.epic) {
      // A frame drum in a rolling six-eight groove from the second chord, and a choir swelling in from the third.
      if (c >= 1) {
        const eighth = chordSeconds / 12;
        const groove: ["dum" | "tak", number][] = [["dum", 1], ["tak", 0], ["tak", 0.7], ["dum", 0.8], ["tak", 0.9], ["tak", 0.5]];
        for (let e = 0; e < 12; e++) {
          const [stroke, weight] = groove[e % 6]!;
          if (weight) frameDrum(track, start + e * eighth, stroke, 0.32 * weight * build, random);
        }
      }
      if (c >= 2) choir(track, [note(r), note(r + 2), note(r + 4)], start, chordSeconds, 0.05 * build, random);
    }
  }
}

/** Ambient: nature sounds with a few slow, distant piano and harp notes. No beat and no pads. */
function ambient(p: Plan) {
  const { track, note, chordSeconds, random } = p;
  for (let c = 0; c < p.chords; c++) {
    const start = c * chordSeconds;
    const r = p.progression[c % p.progression.length]!;
    // A soft low note to ground each chord, then a few notes drifting above it.
    track.play({ instrument: "piano-soft", midi: note(r - 7), start: start + 0.5, amp: 0.3, pan: -0.2 });
    const notes = 2 + Math.floor(random() * 2);
    for (let n = 0; n < notes; n++) {
      track.play({
        // Mid-range notes, warm rather than bright.
        instrument: random() < 0.65 ? "piano-soft" : "harp", midi: note(r + [0, 2, 4, 7][Math.floor(random() * 4)]!),
        start: start + 1.5 + (n + random() * 0.8) * ((chordSeconds - 3) / notes), amp: 0.3, pan: random() * 1.2 - 0.6,
      });
    }
  }
}

/**
 * Reflective: expressive solo piano with a singing line, strings creeping in underneath,
 * a breath, and then a lone whistle with slow vibrato, slides and the odd quarter-tone bend,
 * answered by the piano. Timing breathes freely (rubato) rather than following a grid.
 */
function reflective(p: Plan) {
  const { track, note, random, seconds, progression } = p;
  // A minor key with a raised seventh on the fifth chord, for a stronger pull home.
  const tone = (r: number, k: number) => note(r + k) + (((r % 7) + 7) % 7 === 4 && k === 2 ? 1 : 0);
  const pianoNote = (midi: number, start: number, amp: number, pan = 0.1) =>
    track.play({ instrument: amp > 0.48 ? "piano" : "piano-soft", midi, start, amp: Math.min(amp, 0.62), pan });

  // Chords whose lengths stretch and shrink a little, like a player taking their time.
  const chords: { start: number; length: number; r: number }[] = [];
  for (let t = 0, c = 0; t < seconds + 2; c++) {
    const length = p.chordSeconds * (1 + 0.12 * Math.sin(c * 1.7) + (random() - 0.5) * 0.1);
    chords.push({ start: t, length, r: progression[c % progression.length]! });
    t += length;
  }
  // The breath comes a little before halfway, on a chord change, then the whistle enters.
  const target = Math.min(Math.max(seconds * 0.45, 9), seconds - 10);
  const breath = chords.reduce((best, c) => (Math.abs(c.start - target) < Math.abs(best - target) ? c.start : best), chords[1]?.start ?? 0);
  const whistleStart = breath + 2.4;

  let melody = 9;
  chords.forEach(({ start, length, r }, c) => {
    const rolled = (amp: number) =>
      [r - 7, r - 3, r + 2].forEach((step, i) => pianoNote(tone(r, step - r), start + i * 0.09 + random() * 0.02, amp, -0.25));
    if (start < breath) {
      // Act one: piano alone, then strings creeping in underneath.
      rolled(0.42);
      pianoNote(tone(r, -3), start + length * 0.5, 0.26, -0.3);
      const phrasePos = (c % 2) + 0.5;
      const count = 2 + Math.floor(random() * 3);
      const weights = Array.from({ length: count }, () => 0.6 + random());
      const total = weights.reduce((a, b) => a + b, 0);
      let at = start + 0.05;
      weights.forEach((w, i) => {
        // An arch: rising through the first chord of each pair, falling through the second.
        const lean = c % 2 === 0 ? 1 : -1;
        melody = Math.max(7, Math.min(13, melody + lean * (random() < 0.7 ? 1 : 2) * (random() < 0.2 ? -1 : 1)));
        const last = i === count - 1;
        if (last && c % 2 === 1) while (![0, 2, 4].includes((((melody - r) % 7) + 7) % 7)) melody--;
        const amp = 0.36 + 0.16 * Math.sin((Math.PI * (phrasePos + i / count)) / 2);
        const when = at + (random() - 0.5) * 0.06 + (last && c % 2 === 1 ? 0.15 : 0);
        if (random() < 0.25) pianoNote(tone(r, melody + 1 - r), when - 0.09, amp * 0.55, 0.2);
        pianoNote(tone(r, melody - r), when, amp, 0.2);
        at += (length * w) / total;
      });
      if (start >= breath * 0.3) {
        track.play({ instrument: "cellos", midi: tone(r, -7), start, amp: 0.13, attack: 2, length, release: 1.5, pan: -0.3 });
        track.play({ instrument: "violins", midi: tone(r, 2), start, amp: 0.06, attack: 2.5, length, release: 1.5, pan: 0.35 });
      }
    } else {
      // Act two: strings hold the ground, the piano returns softly once the whistle is settled.
      if (start === breath) pianoNote(tone(r, -7), start, 0.34, -0.2);
      track.play({ instrument: "cellos", midi: tone(r, -7), start, amp: start === breath ? 0.09 : 0.15, attack: 1.8, length, release: 1.5, pan: -0.3 });
      if (start > breath) track.play({ instrument: "violins", midi: tone(r, 2), start, amp: 0.07, attack: 2, length, release: 1.5, pan: 0.35 });
      if (start >= whistleStart + 3) rolled(0.28);
    }
  });

  // The whistle: phrases of three to five long notes, one breath each, with rests the piano answers.
  const chordAt = (t: number) => chords.reduce((found, c) => (c.start <= t ? c : found), chords[0]!);
  // High and clear, like the reference whistle: roughly 1.2 to 2.6 kHz.
  let w = 19;
  let phraseIndex = 0;
  for (let t = whistleStart; t < seconds - 4; phraseIndex++) {
    const phrase: WhistleNote[] = [];
    const count = 3 + Math.floor(random() * 3);
    let at = t;
    for (let i = 0; i < count && at < seconds - 3; i++) {
      const last = i === count - 1;
      const r = chordAt(at).r;
      w = Math.max(17, Math.min(23, w + (i < count / 2 ? 1 : -1) * (random() < 0.75 ? 1 : 2)));
      if (last) while (![0, 2, 4].includes((((w - r) % 7) + 7) % 7)) w--;
      const length = Math.min(last ? 3 + random() * 1.5 : 1.3 + random() * 1.3, seconds - 1.5 - at);
      const noteOut: WhistleNote = { start: at, length, midi: tone(r, w - r), glide: i ? 0.2 + random() * 0.15 : 0 };
      // A subtle colour: on every other phrase, the long last note dips a quarter tone and returns.
      if (last && phraseIndex % 2 === 1) noteOut.bend = { at: length * 0.35, by: -0.5, time: 0.8 };
      // And on the others, the last note sighs downwards as the breath runs out.
      if (last && phraseIndex % 2 === 0) noteOut.fall = 1 + random();
      phrase.push(noteOut);
      at += length;
    }
    whistle(track, phrase, 0.12, random);
    const rest = 1.4 + random() * 0.8;
    // The piano answers in the gap: two soft notes.
    const r = chordAt(at).r;
    [0.35, 0.85].forEach((offset, i) => pianoNote(tone(r, 7 + [4, 2][i]!), at + offset, 0.3, 0.2));
    t = at + rest;
  }
  pianoNote(tone(chords[0]!.r, -7), Math.max(0, seconds - 3.5), 0.3, -0.2);
}

interface MoodRecipe {
  bpm: number;
  beatsPerChord: number;
  scale: "major" | "minor";
  progressions: number[][];
  /** Reverb amount, 0 to 1. */
  wet: number;
  /** How the music comes in, in seconds: calm drifts in, upbeat kicks straight in. */
  fadeIn: number;
  /** A small level trim so every mood sounds equally loud (noise sounds louder than notes at the same energy). */
  trim: number;
  arrange: (plan: Plan) => void;
}

const RECIPES: Record<Mood, MoodRecipe> = {
  calm: { bpm: 68, beatsPerChord: 8, scale: "major", wet: 0.38, fadeIn: 3, trim: 1, arrange: calm, progressions: [[0, 4, 5, 3], [0, 5, 3, 4], [5, 3, 0, 4], [0, 3, 5, 4]] },
  upbeat: { bpm: 120, beatsPerChord: 8, scale: "minor", wet: 0.14, fadeIn: 0.02, trim: 1.15, arrange: upbeat, progressions: [[0, 5, 2, 6], [0, 6, 5, 6], [5, 6, 0, 0], [0, 3, 5, 6]] },
  epic: { bpm: 64, beatsPerChord: 8, scale: "minor", wet: 0.4, fadeIn: 0.5, trim: 0.95, arrange: dramatic, progressions: [[0, 5, 2, 6], [0, 6, 5, 4], [0, 3, 5, 4]] },
  dramatic: { bpm: 64, beatsPerChord: 8, scale: "minor", wet: 0.4, fadeIn: 0.5, trim: 0.95, arrange: dramatic, progressions: [[0, 5, 2, 6], [0, 6, 5, 4], [0, 3, 5, 4]] },
  reflective: { bpm: 58, beatsPerChord: 6, scale: "minor", wet: 0.42, fadeIn: 0.3, trim: 0.72, arrange: reflective, progressions: [[0, 5, 3, 4], [0, 3, 5, 4], [0, 6, 5, 4], [0, 3, 6, 4]] },
  ambient: { bpm: 52, beatsPerChord: 12, scale: "major", wet: 0.5, fadeIn: 5, trim: 0.78, arrange: ambient, progressions: [[0, 3], [0, 5, 3, 4], [3, 0]] },
};

export interface MusicOptions {
  mood: Mood;
  seconds: number;
  seed: string;
  instruments: Instruments;
  /** The nature sound under ambient music. Picked from the seed if not given. */
  nature?: NatureSound;
}

/** The nature sound an ambient film gets: the one it asks for, or one picked from its seed. */
export function pickNature(seed: string, nature?: NatureSound): NatureSound {
  return nature ?? NATURE_SOUNDS[Math.floor(seededRandom(`${seed}:nature`)() * NATURE_SOUNDS.length)]!;
}

/** Composes and plays the music. Returns stereo samples at MUSIC_SAMPLE_RATE, at a steady loudness for every mood. */
export function composeMusic({ mood, seconds, seed, instruments, nature }: MusicOptions): { left: Float32Array; right: Float32Array } {
  const recipe = RECIPES[mood];
  const random = seededRandom(`${seed}:${mood}`);
  const root = ROOTS[Math.floor(random() * ROOTS.length)]!;
  const progression = recipe.progressions[Math.floor(random() * recipe.progressions.length)]!;
  const beat = 60 / recipe.bpm;
  const chordSeconds = beat * recipe.beatsPerChord;
  const track = new Track(Math.ceil((seconds + 6) * MUSIC_SAMPLE_RATE), instruments);
  const plan: Plan = {
    track, bed: new Track(track.length, instruments), note: keyOf(root, SCALES[recipe.scale]), progression, chordSeconds, beat, random, seconds,
    chords: Math.ceil(seconds / chordSeconds) + 1, epic: mood === "epic",
  };
  recipe.arrange(plan);
  for (let i = 0; i < track.length; i++) {
    const pump = plan.pump?.[i] ?? 1;
    track.left[i]! += plan.bed.left[i]! * pump;
    track.right[i]! += plan.bed.right[i]! * pump;
  }

  // Reverb, with different delay lengths per side for width.
  const wetLeft = reverb(track.left, 0);
  const wetRight = reverb(track.right, 23);
  const length = Math.ceil(seconds * MUSIC_SAMPLE_RATE);
  const left = new Float32Array(length);
  const right = new Float32Array(length);
  const fadeIn = recipe.fadeIn * MUSIC_SAMPLE_RATE;
  for (let i = 0; i < length; i++) {
    const g = i < fadeIn ? (i / fadeIn) ** 2 : 1;
    left[i] = (track.left[i]! * (1 - recipe.wet * 0.5) + wetLeft[i]! * recipe.wet) * g;
    right[i] = (track.right[i]! * (1 - recipe.wet * 0.5) + wetRight[i]! * recipe.wet) * g;
  }

  // Ambient music sits on a bed of nature sound, added after the reverb so it stays close and clear.
  if (mood === "ambient") {
    // Level the piano on its own first, so its notes always sit clearly above the nature sound.
    let notes = 0;
    for (let i = 0; i < length; i++) notes += left[i]! ** 2 + right[i]! ** 2;
    const level = 0.08 / (Math.sqrt(notes / (2 * length)) || 1);
    const bed = natureSound(pickNature(seed, nature), seconds, seededRandom(`${seed}:nature-sound`));
    for (let i = 0; i < length; i++) {
      const g = i < fadeIn ? (i / fadeIn) ** 2 : 1;
      left[i] = left[i]! * level + bed.left[i]! * g;
      right[i] = right[i]! * level + bed.right[i]! * g;
    }
  }

  // Same loudness whatever the mood: scale to a fixed RMS level.
  let sum = 0;
  for (let i = 0; i < length; i++) sum += left[i]! ** 2 + right[i]! ** 2;
  if (!Number.isFinite(sum)) throw new Error(`The ${mood} music went wrong (a sample wasn't a number). Please report this as a bug.`);
  const gain = (0.2 * recipe.trim) / (Math.sqrt(sum / (2 * length)) || 1);
  for (let i = 0; i < length; i++) {
    left[i]! *= gain;
    right[i]! *= gain;
  }
  return { left, right };
}

/** How far the music drops while someone is speaking (about -10 dB). */
export const DUCK_LEVEL = 0.32;
const DUCK_DOWN_SECONDS = 0.25;
const DUCK_UP_SECONDS = 0.8;

/**
 * The music's volume over time: `volume` in the gaps, dipping under every spoken line,
 * and fading out at the end with the picture.
 */
export function musicGain(o: { lines: Line[]; seconds: number; volume: number; fadeOutSeconds: number; sampleRate?: number }): Float32Array {
  const sr = o.sampleRate ?? MUSIC_SAMPLE_RATE;
  const length = Math.ceil(o.seconds * sr);
  const target = new Float32Array(length).fill(1);
  // Start dipping a moment before each line, so the voice never fights the music.
  for (const line of o.lines) {
    const from = Math.max(0, Math.floor((line.start - DUCK_DOWN_SECONDS) * sr));
    const to = Math.min(length, Math.ceil(line.end * sr));
    target.fill(DUCK_LEVEL, from, to);
  }
  const gain = new Float32Array(length);
  const down = 1 - Math.exp(-1 / ((DUCK_DOWN_SECONDS * sr) / 4));
  const up = 1 - Math.exp(-1 / ((DUCK_UP_SECONDS * sr) / 4));
  let level = target[0]!;
  for (let i = 0; i < length; i++) {
    const want = target[i]!;
    level += (want - level) * (want < level ? down : up);
    const fadeOut = Math.min(1, Math.max(0, (o.seconds - i / sr) / o.fadeOutSeconds));
    gain[i] = level * o.volume * fadeOut ** 2;
  }
  return gain;
}

/** Applies a gain curve to stereo music. tanh leaves quiet sound alone and only rounds off peaks. */
export function applyGain(music: { left: Float32Array; right: Float32Array }, gain: Float32Array) {
  for (let i = 0; i < music.left.length; i++) {
    const g = gain[Math.min(i, gain.length - 1)]!;
    music.left[i] = Math.tanh(music.left[i]! * g);
    music.right[i] = Math.tanh(music.right[i]! * g);
  }
  return music;
}
