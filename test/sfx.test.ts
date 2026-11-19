import { describe, expect, it } from "vitest";
import { validateFilm, type Film } from "../src/index.js";
import { layoutFor } from "../src/render/layout.js";
import { seededRandom } from "../src/render/music.js";
import { buildPage } from "../src/render/page.js";
import { SOUNDS, SYNTHS, buildSoundEffects, filmCues, mixInto, speaking } from "../src/render/sfx.js";
import { loadStyle } from "../src/render/style.js";
import { buildTimeline } from "../src/render/timeline.js";

function film(scenes: unknown[], extra: object = {}): Film {
  const result = validateFilm({ spec: 1, title: "Test", style: "data-story", scenes, ...extra });
  if (!result.ok) throw new Error(result.errors.join("\n"));
  return result.film;
}

const style = await loadStyle("data-story");

describe("sound cues", () => {
  it("whoosh between scenes, but not into the first or on a cut", () => {
    const f = film([
      { type: "title", title: "A", duration: 3 },
      { type: "title", title: "B", duration: 3 },
      { type: "title", title: "C", duration: 3, transition: "cut" },
    ]);
    const whooshes = filmCues(f, style, buildTimeline(f)).filter((c) => c.sound === "whoosh");
    expect(whooshes.map((c) => c.at)).toEqual([3]);
  });

  it("land on the same moment as their element's entrance", () => {
    const f = film([{ type: "points", heading: "Why", points: ["One", "Two", "Three"], duration: 6 }]);
    const timeline = buildTimeline(f);
    const html = buildPage(f, style, timeline, layoutFor(f));
    const pointDelays = [...html.matchAll(/<li class="slide" style="--d:(\d+)ms/g)].map((m) => Number(m[1]) / 1000);
    const swishes = filmCues(f, style, timeline).filter((c) => c.sound === "swish").map((c) => c.at);
    expect(swishes).toHaveLength(3);
    swishes.forEach((at, i) => expect(at).toBeCloseTo(pointDelays[i]!, 2));
  });

  it("tick faster at first, then slower, then ding as the number lands", () => {
    const f = film([{ type: "stat", value: "48,210", label: "cups", duration: 4 }]);
    const cues = filmCues(f, style, buildTimeline(f));
    const ticks = cues.filter((c) => c.sound === "tick").map((c) => c.at);
    expect(ticks.length).toBeGreaterThan(6);
    const gaps = ticks.slice(1).map((t, i) => t - ticks[i]!);
    expect(gaps.at(-1)!).toBeGreaterThan(gaps[0]! * 2);
    const ding = cues.find((c) => c.sound === "ding")!;
    expect(ding.at).toBeCloseTo(0.25 + 1.5 * 0.7, 5); // when the runtime pulses a lively number
    expect(ding.at).toBeGreaterThan(ticks.at(-1)!);
  });

  it("don't tick for a stat that isn't a number", () => {
    const f = film([{ type: "stat", value: "Top", label: "rated", duration: 3 }]);
    const sounds = filmCues(f, style, buildTimeline(f)).map((c) => c.sound);
    expect(sounds).toContain("pop");
    expect(sounds).not.toContain("tick");
    expect(sounds).not.toContain("ding");
  });

  it("know when someone is speaking", () => {
    const lines = [{ text: "Hi", start: 2, end: 4 }];
    expect(speaking(lines, 1.8)).toBe(true);
    expect(speaking(lines, 3)).toBe(true);
    expect(speaking(lines, 4.5)).toBe(false);
  });
});

describe("sound effects track", () => {
  const f = film([
    { type: "title", title: "A", duration: 3 },
    { type: "stat", value: 42, label: "B", duration: 3 },
  ]);
  const timeline = buildTimeline(f);

  it("is on by default at the tuned volume", () => {
    expect(f.sfx.volume).toBe(0.5);
    expect(buildSoundEffects(f, style, timeline)).not.toBeNull();
  });

  it("can be switched off", () => {
    const off = film([{ type: "title", title: "A", duration: 3 }], { sfx: { volume: 0 } });
    expect(buildSoundEffects(off, style, buildTimeline(off))).toBeNull();
  });

  it("sounds the same every time", () => {
    const a = buildSoundEffects(f, style, timeline)!;
    const b = buildSoundEffects(f, style, timeline)!;
    expect(Buffer.from(a.left.buffer).equals(Buffer.from(b.left.buffer))).toBe(true);
  });

  it("never clips", () => {
    const { left, right } = buildSoundEffects(film(f.scenes, { sfx: { volume: 1 } }), style, timeline)!;
    for (const channel of [left, right]) expect(channel.reduce((peak, v) => Math.max(peak, Math.abs(v)), 0)).toBeLessThan(0.5);
  });

  it("is added to the music, or used alone without it", () => {
    const music = { left: new Float32Array([0.1, 0.1]), right: new Float32Array([0.1, 0.1]) };
    const sfx = { left: new Float32Array([0.2, 0]), right: new Float32Array([0, 0.2]) };
    expect(mixInto(null, sfx)).toBe(sfx);
    expect(mixInto(music, null)).toBe(music);
    const mixed = mixInto(music, sfx)!;
    expect([...mixed.left].map((v) => +v.toFixed(3))).toEqual([0.3, 0.1]);
  });

  it("rejects a volume outside 0 to 1", () => {
    expect(validateFilm({ spec: 1, title: "T", style: "data-story", sfx: { volume: 2 }, scenes: [{ type: "title", title: "A", duration: 2 }] }).ok).toBe(false);
  });
});

describe("each sound", () => {
  it("starts and ends in silence, so nothing clicks", () => {
    for (const name of SOUNDS) {
      const samples = SYNTHS[name](1, seededRandom(name));
      expect(Math.abs(samples[0]!), name).toBeLessThan(0.01);
      expect(Math.abs(samples.at(-1)!), name).toBeLessThan(1e-4);
    }
  });
});
