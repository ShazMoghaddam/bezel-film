import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MUSIC_MOODS, NATURE_SOUNDS, validateFilm } from "../src/index.js";
import { whistle } from "../src/render/colours.js";
import { closestRecording, type InstrumentName, type Instruments } from "../src/render/instruments.js";
import { DUCK_LEVEL, MOOD_INSTRUMENTS, MUSIC_SAMPLE_RATE, composeMusic, musicGain, seededRandom } from "../src/render/music.js";
import { findFfmpeg } from "../src/render/ffmpeg.js";
import { NATURE_RECORDINGS, NATURE_RMS, natureBed, pickNature, pickRecording } from "../src/render/nature.js";
import { fitToLength, loopToLength } from "../src/render/soundtrack.js";

const SR = MUSIC_SAMPLE_RATE;

/** Tiny stand-in instruments: half a second of sine at a known note, so tests run fast. */
function fakeInstruments(): Instruments {
  const tone = (midi: number | undefined) => {
    const hz = midi === undefined ? 100 : 440 * 2 ** ((midi - 69) / 12);
    const left = new Float32Array(SR / 2).map((_, i) => 0.3 * Math.sin((2 * Math.PI * hz * i) / SR) * (1 - i / (SR / 2)));
    return { midi, cents: 0, left, right: left.slice() };
  };
  const all = new Set(Object.values(MOOD_INSTRUMENTS).flat());
  const drums = new Set<InstrumentName>(["timpani", "timpani-roll", "bass-drum", "cymbal-swell"]);
  return new Map([...all].map((name) => [name, drums.has(name) ? [tone(undefined)] : [tone(48), tone(60), tone(72), tone(84)]]));
}

const rms = (samples: Float32Array, from = 0, to = samples.length) => {
  let sum = 0;
  for (let i = from; i < to; i++) sum += samples[i]! ** 2;
  return Math.sqrt(sum / (to - from));
};

describe("seededRandom", () => {
  it("gives the same numbers for the same seed, and different ones for another", () => {
    const a = seededRandom("film");
    const b = seededRandom("film");
    const c = seededRandom("other film");
    const first = [a(), a(), a()];
    expect([b(), b(), b()]).toEqual(first);
    expect([c(), c(), c()]).not.toEqual(first);
  });
});

describe("composeMusic", () => {
  const instruments = fakeInstruments();

  it.each(MUSIC_MOODS)("makes %s music of the right length, with no broken samples", (mood) => {
    const music = composeMusic({ mood, seconds: 12, seed: "Test film", instruments });
    expect(music.left.length).toBe(12 * SR);
    expect(music.left.every(Number.isFinite) && music.right.every(Number.isFinite)).toBe(true);
    expect(rms(music.left)).toBeGreaterThan(0.05);
  });

  it("always composes the same music for the same film", () => {
    const a = composeMusic({ mood: "calm", seconds: 6, seed: "Same title", instruments });
    const b = composeMusic({ mood: "calm", seconds: 6, seed: "Same title", instruments });
    expect(Buffer.from(a.left.buffer).equals(Buffer.from(b.left.buffer))).toBe(true);
  });

  it("composes different music for a different film", () => {
    const a = composeMusic({ mood: "calm", seconds: 6, seed: "One title", instruments });
    const b = composeMusic({ mood: "calm", seconds: 6, seed: "Another title", instruments });
    expect(Buffer.from(a.left.buffer).equals(Buffer.from(b.left.buffer))).toBe(false);
  });
});

describe("musicGain", () => {
  const lines = [{ text: "Hello.", start: 2, end: 4 }];
  const gain = musicGain({ lines, seconds: 8, volume: 0.5, fadeOutSeconds: 1 });

  it("plays at the set volume in the gaps", () => {
    expect(gain[Math.floor(1 * SR)]).toBeCloseTo(0.5, 2);
  });

  it("dips while someone is speaking", () => {
    expect(gain[Math.floor(3.5 * SR)]).toBeCloseTo(0.5 * DUCK_LEVEL, 2);
  });

  it("starts dipping just before the line, not after", () => {
    expect(gain[Math.floor(2 * SR)]!).toBeLessThan(0.5 * 0.6);
  });

  it("fades to silence at the end", () => {
    expect(gain[gain.length - 1]).toBeLessThan(0.001);
  });
});

describe("nature sounds", () => {
  const ffmpeg = findFfmpeg();

  it.each(NATURE_SOUNDS)("plays a real %s recording for the whole film, at a steady level", async (kind) => {
    // 100 seconds is longer than any loop, so this also plays the loop round.
    const bed = await natureBed({ kind, seed: "Test", seconds: 100, ffmpeg });
    expect(bed.left.length).toBe(100 * SR);
    expect(bed.left.every(Number.isFinite)).toBe(true);
    const level = Math.sqrt((rms(bed.left) ** 2 + rms(bed.right) ** 2) / 2);
    expect(level).toBeCloseTo(NATURE_RMS, 3);
    // No gap where the loop comes round: every second has sound in it.
    for (let s = 0; s < 100; s++) expect(rms(bed.left, s * SR, (s + 1) * SR), `second ${s}`).toBeGreaterThan(NATURE_RMS / 10);
  });

  it("has a loop file for every recording", () => {
    for (const recording of Object.values(NATURE_RECORDINGS).flat()) {
      expect(existsSync(new URL(`../nature/${recording.id}.opus`, import.meta.url)), recording.id).toBe(true);
    }
  });

  it("picks a recording from the title, the same one every time", () => {
    const pick = pickRecording("Rainy day", "rain");
    expect(NATURE_RECORDINGS.rain).toContain(pick);
    expect(pickRecording("Rainy day", "rain")).toBe(pick);
  });

  it("lets a film choose its sound, or picks one from its title", () => {
    expect(pickNature("Any title", "waves")).toBe("waves");
    expect(NATURE_SOUNDS).toContain(pickNature("Any title"));
    expect(pickNature("Any title")).toBe(pickNature("Any title"));
  });
});

describe("whistle", () => {
  it("whistles at the note asked for", () => {
    const out = { left: new Float32Array(3 * SR), right: new Float32Array(3 * SR), length: 3 * SR };
    whistle(out, [{ start: 0, length: 2.5, midi: 81 }], 0.2, seededRandom("whistle"));
    // Count rising zero crossings in the first, still part of the note (before the vibrato blooms).
    let crossings = 0;
    for (let i = Math.floor(0.3 * SR); i < Math.floor(0.4 * SR); i++) if (out.left[i - 1]! < 0 && out.left[i]! >= 0) crossings++;
    expect(crossings * 10).toBeGreaterThan(860);
    expect(crossings * 10).toBeLessThan(900);
  });
});

describe("loopToLength", () => {
  const ramp = (seconds: number) => {
    const left = new Float32Array(seconds * SR).fill(0.5);
    return { left, right: left.slice() };
  };

  it("cuts a long track to the film", () => {
    expect(loopToLength(ramp(10), 4).left.length).toBe(4 * SR);
  });

  it("plays a short track again, blending into itself without a dip or a bump", () => {
    const looped = loopToLength(ramp(20), 50);
    expect(looped.left.length).toBe(50 * SR);
    // A steady track stays steady through every join (equal-power blends sum close to 1 for steady sound).
    for (let s = 1; s < 50; s++) {
      const level = rms(looped.left, s * SR, (s + 1) * SR);
      expect(level, `second ${s}`).toBeGreaterThan(0.45);
      expect(level, `second ${s}`).toBeLessThan(0.75);
    }
  });

  it("starts without a click", () => {
    expect(loopToLength(ramp(5), 2).left[0]).toBe(0);
  });
});

describe("fitToLength", () => {
  const track = (seconds: number) => ({ left: new Float32Array(seconds * SR).fill(0.5), right: new Float32Array(seconds * SR).fill(0.5) });

  it("trims a long track to the film", () => {
    expect(fitToLength(track(10), 4).left.length).toBe(4 * SR);
  });

  it("pads a short track with silence, fades it out, and says so", () => {
    let warned = 0;
    const fitted = fitToLength(track(2), 4, (seconds) => (warned = seconds));
    expect(warned).toBe(2);
    expect(fitted.left[3 * SR]).toBe(0);
    expect(fitted.left[2 * SR - 10]!).toBeLessThan(0.01);
  });
});

describe("music settings", () => {
  const film = (music: object) => validateFilm({ spec: 1, title: "T", style: "data-story", music, scenes: [{ type: "title", title: "A", duration: 2 }] });

  it("accepts every mood", () => {
    for (const mood of MUSIC_MOODS) expect(film({ mood }).ok).toBe(true);
  });

  it("only allows a nature sound with ambient music", () => {
    expect(film({ mood: "ambient", nature: "rain" }).ok).toBe(true);
    const result = film({ mood: "calm", nature: "rain" });
    expect(result.ok ? [] : result.errors).toEqual(["music.nature: only applies to the ambient mood"]);
  });
});

describe("instrument pack", () => {
  const manifest = JSON.parse(readFileSync("instruments/manifest.json", "utf8")) as {
    licence: string;
    instruments: Record<string, { file: string; midi?: number }[]>;
  };

  it("is public domain", () => {
    expect(manifest.licence).toBe("CC0-1.0");
  });

  it("has every file it lists", () => {
    for (const notes of Object.values(manifest.instruments)) for (const note of notes) expect(existsSync(`instruments/${note.file}`)).toBe(true);
  });

  it("has every instrument the moods use", () => {
    for (const name of new Set(Object.values(MOOD_INSTRUMENTS).flat())) expect(manifest.instruments[name]?.length).toBeGreaterThan(0);
  });

  it("picks the closest recording to a note", () => {
    const recordings = [48, 60, 72].map((midi) => ({ midi, cents: 0, left: new Float32Array(1), right: new Float32Array(1) }));
    expect(closestRecording(recordings, 63).midi).toBe(60);
    expect(closestRecording(recordings, 70).midi).toBe(72);
  });
});
