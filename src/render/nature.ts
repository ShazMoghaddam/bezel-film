/**
 * Nature sounds made in code, for the ambient mood: rain, sea waves, a stream and
 * wind in the leaves. Each is shaped noise, built from a few simple filters, with
 * slow, uneven changes so it never sounds like an obvious loop.
 */

import { NATURE_SOUNDS } from "../spec/schema.js";

export { NATURE_SOUNDS };
export type NatureSound = (typeof NATURE_SOUNDS)[number];

/** A standard two-pole audio filter (the "RBJ cookbook" biquad). */
export class Filter {
  private b0 = 0;
  private b1 = 0;
  private b2 = 0;
  private a1 = 0;
  private a2 = 0;
  private x1 = 0;
  private x2 = 0;
  private y1 = 0;
  private y2 = 0;

  constructor(
    private readonly type: "lowpass" | "highpass" | "bandpass",
    hz: number,
    private readonly q = 0.707,
    private readonly sampleRate = 44_100,
  ) {
    this.tune(hz);
  }

  /** Moves the filter's frequency, so sounds can open and close over time. */
  tune(hz: number) {
    const w = (2 * Math.PI * Math.min(hz, this.sampleRate * 0.45)) / this.sampleRate;
    const alpha = Math.sin(w) / (2 * this.q);
    const cos = Math.cos(w);
    const a0 = 1 + alpha;
    if (this.type === "lowpass") {
      this.b0 = (1 - cos) / 2 / a0;
      this.b1 = (1 - cos) / a0;
      this.b2 = this.b0;
    } else if (this.type === "highpass") {
      this.b0 = (1 + cos) / 2 / a0;
      this.b1 = -(1 + cos) / a0;
      this.b2 = this.b0;
    } else {
      this.b0 = alpha / a0;
      this.b1 = 0;
      this.b2 = -alpha / a0;
    }
    this.a1 = (-2 * cos) / a0;
    this.a2 = (1 - alpha) / a0;
  }

  run(x: number): number {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1;
    this.x1 = x;
    this.y2 = this.y1;
    this.y1 = y;
    return y;
  }
}

/** A value that drifts smoothly and unevenly between 0 and 1, for gusts, swells and intensity. */
function drift(random: () => number, length: number, sampleRate: number, secondsPerChange: number): Float32Array {
  const out = new Float32Array(length);
  const step = Math.max(1, Math.floor(secondsPerChange * sampleRate));
  let from = random();
  let to = random();
  for (let i = 0; i < length; i++) {
    const k = i % step;
    if (k === 0 && i > 0) {
      from = to;
      to = random();
    }
    const t = k / step;
    out[i] = from + (to - from) * (t * t * (3 - 2 * t));
  }
  return out;
}

interface Stereo {
  left: Float32Array;
  right: Float32Array;
}

function rain(seconds: number, random: () => number, sr: number): Stereo {
  const length = Math.ceil(seconds * sr);
  const left = new Float32Array(length);
  const right = new Float32Array(length);
  // The steady hiss of rain everywhere: noise with the harshest highs and the rumble taken out.
  // Soft, not harsh: the hiss is rolled off well below the top of hearing.
  const bed = [new Filter("lowpass", 3200, 0.6, sr), new Filter("lowpass", 3000, 0.6, sr)];
  const air = [new Filter("highpass", 500, 0.7, sr), new Filter("highpass", 520, 0.7, sr)];
  const intensity = drift(random, length, sr, 6);
  for (let i = 0; i < length; i++) {
    const level = 0.11 + 0.05 * intensity[i]!;
    left[i] = air[0]!.run(bed[0]!.run(random() * 2 - 1)) * level;
    right[i] = air[1]!.run(bed[1]!.run(random() * 2 - 1)) * level;
  }
  // Droplets: thousands of tiny ticks, each with its own pitch and place.
  const drops = Math.floor(seconds * 90);
  for (let d = 0; d < drops; d++) {
    const at = Math.floor(random() * length);
    const hz = 1800 + random() * 4500;
    const filter = new Filter("bandpass", hz, 4 + random() * 6, sr);
    const amp = (0.08 + random() * 0.25) * (random() < 0.06 ? 2.2 : 1);
    const decay = (0.002 + random() * 0.006) * sr;
    const p = random();
    for (let k = 0; k < decay * 6 && at + k < length; k++) {
      const v = filter.run((random() * 2 - 1) * Math.exp(-k / decay)) * amp;
      left[at + k]! += v * (1 - p);
      right[at + k]! += v * p;
    }
  }
  return { left, right };
}

function waves(seconds: number, random: () => number, sr: number): Stereo {
  const length = Math.ceil(seconds * sr);
  const left = new Float32Array(length);
  const right = new Float32Array(length);
  // Each wave swells, breaks and drains away over 6 to 11 seconds, never quite in time.
  const envelope = new Float32Array(length);
  const brightness = new Float32Array(length);
  for (let at = -random() * 4; at < seconds; ) {
    const period = 6 + random() * 5;
    const size = 0.6 + random() * 0.4;
    for (let i = Math.max(0, Math.floor(at * sr)); i < Math.min(length, Math.floor((at + period * 1.3) * sr)); i++) {
      const t = (i / sr - at) / period;
      const rise = t < 0.35 ? Math.sin((t / 0.35) * (Math.PI / 2)) ** 2 : Math.exp(-(t - 0.35) * 3.2);
      envelope[i] = Math.max(envelope[i]!, rise * size);
      brightness[i] = Math.max(brightness[i]!, t > 0.3 && t < 0.55 ? Math.sin(((t - 0.3) / 0.25) * Math.PI) * size : 0);
    }
    at += period;
  }
  const body = [new Filter("lowpass", 600, 0.7, sr), new Filter("lowpass", 600, 0.7, sr)];
  const foam = [new Filter("highpass", 2500, 0.7, sr), new Filter("highpass", 2600, 0.7, sr)];
  const lag = Math.floor(0.12 * sr);
  for (let i = 0; i < length; i++) {
    if (i % 64 === 0) {
      body[0]!.tune(300 + 1600 * envelope[i]!);
      body[1]!.tune(300 + 1600 * envelope[Math.max(0, i - lag)]!);
    }
    const e = [envelope[i]!, envelope[Math.max(0, i - lag)]!];
    const b = [brightness[i]!, brightness[Math.max(0, i - lag)]!];
    left[i] = body[0]!.run(random() * 2 - 1) * (0.05 + 0.5 * e[0]!) + foam[0]!.run(random() * 2 - 1) * 0.12 * b[0]!;
    right[i] = body[1]!.run(random() * 2 - 1) * (0.05 + 0.5 * e[1]!) + foam[1]!.run(random() * 2 - 1) * 0.12 * b[1]!;
  }
  return { left, right };
}

function stream(seconds: number, random: () => number, sr: number): Stereo {
  const length = Math.ceil(seconds * sr);
  const left = new Float32Array(length);
  const right = new Float32Array(length);
  // A soft rush of water underneath.
  const rush = [new Filter("bandpass", 900, 0.5, sr), new Filter("bandpass", 1000, 0.5, sr)];
  for (let i = 0; i < length; i++) {
    left[i] = rush[0]!.run(random() * 2 - 1) * 0.12;
    right[i] = rush[1]!.run(random() * 2 - 1) * 0.12;
  }
  // Babbling: lots of little bubbles, each a quick rising chirp.
  const bubbles = Math.floor(seconds * 55);
  for (let n = 0; n < bubbles; n++) {
    const at = Math.floor(random() * length);
    const hz = 450 + random() ** 2 * 1600;
    const rise = 1.3 + random() * 1.2;
    const life = (0.012 + random() * 0.03) * sr;
    const amp = 0.05 + random() * 0.09;
    const p = 0.2 + random() * 0.6;
    let phase = 0;
    for (let k = 0; k < life && at + k < length; k++) {
      const t = k / life;
      phase += (2 * Math.PI * hz * (1 + (rise - 1) * t)) / sr;
      const v = Math.sin(phase) * Math.sin(Math.PI * t) * amp;
      left[at + k]! += v * (1 - p);
      right[at + k]! += v * p;
    }
  }
  return { left, right };
}

function wind(seconds: number, random: () => number, sr: number): Stereo {
  const length = Math.ceil(seconds * sr);
  const left = new Float32Array(length);
  const right = new Float32Array(length);
  const gusts = drift(random, length, sr, 4.5);
  const swirl = drift(random, length, sr, 2.2);
  // The wind itself: a low, breathy whoosh that rises and falls with the gusts.
  const air = [new Filter("bandpass", 400, 0.8, sr), new Filter("bandpass", 450, 0.8, sr)];
  // The leaves: bright crackles of rustle, busier when the wind is stronger.
  const leaves = [new Filter("highpass", 3000, 0.7, sr), new Filter("highpass", 3200, 0.7, sr)];
  let rustle = 0;
  for (let i = 0; i < length; i++) {
    const g = gusts[i]! ** 1.5;
    if (i % 64 === 0) {
      air[0]!.tune(220 + 650 * g + 120 * swirl[i]!);
      air[1]!.tune(240 + 620 * g + 140 * (1 - swirl[i]!));
    }
    // Rustle comes in short, random bursts, more of them in a gust.
    if (random() < 0.0015 + 0.01 * g) rustle = 0.6 + random() * 0.4;
    rustle *= 0.9993;
    const crackle = random() < 0.35 ? random() * 2 - 1 : 0;
    left[i] = air[0]!.run(random() * 2 - 1) * (0.08 + 0.45 * g) + leaves[0]!.run(crackle) * rustle * (0.05 + 0.25 * g);
    right[i] = air[1]!.run(random() * 2 - 1) * (0.08 + 0.45 * g) + leaves[1]!.run(random() < 0.35 ? random() * 2 - 1 : 0) * rustle * (0.05 + 0.25 * g);
  }
  return { left, right };
}

const MAKERS: Record<NatureSound, (seconds: number, random: () => number, sampleRate: number) => Stereo> = { rain, waves, stream, wind };

/** Makes a nature sound, levelled to a steady loudness so every one sits the same under the music. */
export function natureSound(kind: NatureSound, seconds: number, random: () => number, sampleRate = 44_100): Stereo {
  const sound = MAKERS[kind](seconds, random, sampleRate);
  let sum = 0;
  for (let i = 0; i < sound.left.length; i++) sum += sound.left[i]! ** 2 + sound.right[i]! ** 2;
  const gain = 0.1 / (Math.sqrt(sum / (2 * sound.left.length)) || 1);
  for (let i = 0; i < sound.left.length; i++) {
    sound.left[i]! *= gain;
    sound.right[i]! *= gain;
  }
  return sound;
}
