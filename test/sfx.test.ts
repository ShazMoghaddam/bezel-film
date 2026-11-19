import { describe, expect, it } from "vitest";
import { validateFilm, type Film } from "../src/index.js";
import { layoutFor } from "../src/render/layout.js";
import { readFile } from "node:fs/promises";
import { findFfmpeg } from "../src/render/ffmpeg.js";
import { buildPage } from "../src/render/page.js";
import { PEAK_DB, SOUNDS, buildSoundEffects, filmCues, loadSounds, mixCues, mixInto, repitch, speaking } from "../src/render/sfx.js";
import { loadStyle } from "../src/render/style.js";
import { buildTimeline } from "../src/render/timeline.js";

function film(scenes: unknown[], extra: object = {}): Film {
  const result = validateFilm({ spec: 1, title: "Test", style: "data-story", scenes, ...extra });
  if (!result.ok) throw new Error(result.errors.join("\n"));
  return result.film;
}

const style = await loadStyle("data-story");
const ffmpeg = findFfmpeg();
const sounds = await loadSounds(ffmpeg);
const peakOf = (track: { left: Float32Array; right: Float32Array }) =>
  [track.left, track.right].reduce((peak, channel) => channel.reduce((p, v) => Math.max(p, Math.abs(v)), peak), 0);

describe("sound cues", () => {
  it("whoosh into a fade, sweep into a slide or wipe, and stay quiet on a cut or the first scene", () => {
    const f = film([
      { type: "title", title: "A", duration: 3 },
      { type: "title", title: "B", duration: 3, transition: "fade" },
      { type: "title", title: "C", duration: 3, transition: "slide" },
      { type: "title", title: "D", duration: 3, transition: "wipe" },
      { type: "title", title: "E", duration: 3, transition: "cut" },
    ]);
    const moves = filmCues(f, style, buildTimeline(f)).filter((c) => c.sound === "whoosh" || c.sound === "sweep");
    expect(moves.map((c) => [c.at, c.sound])).toEqual([
      [3, "whoosh"],
      [6, "sweep"],
      [9, "sweep"],
    ]);
  });

  it("give each element its own sound", () => {
    const f = film([
      { type: "stat", value: 42, label: "A", context: "up", duration: 3 },
      { type: "quote", quote: "Lovely", duration: 3 },
      { type: "outro", title: "Bye", cta: "Try it", url: "https://example.com", duration: 3 },
    ]);
    const sounds = (index: number) =>
      filmCues(f, style, buildTimeline(f))
        .filter((c) => c.at >= index * 3 && c.at < index * 3 + 3 && !["tick", "ding", "whoosh", "sweep"].includes(c.sound))
        .map((c) => c.sound);
    expect(sounds(0)).toEqual(["tap", "pop"]);
    expect(sounds(1)).toEqual(["click"]);
    expect(sounds(2)).toEqual(["pop", "click"]);
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
    expect(sounds).toContain("tap");
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

  it("is on by default at the tuned volume", async () => {
    expect(f.sfx.volume).toBe(0.5);
    expect(await buildSoundEffects(f, style, timeline, ffmpeg)).not.toBeNull();
  });

  it("can be switched off", async () => {
    const off = film([{ type: "title", title: "A", duration: 3 }], { sfx: { volume: 0 } });
    expect(await buildSoundEffects(off, style, buildTimeline(off), ffmpeg)).toBeNull();
  });

  it("sounds the same every time", async () => {
    const a = (await buildSoundEffects(f, style, timeline, ffmpeg))!;
    const b = (await buildSoundEffects(f, style, timeline, ffmpeg))!;
    expect(Buffer.from(a.left.buffer).equals(Buffer.from(b.left.buffer))).toBe(true);
  });

  it("sets each sound to its own level", () => {
    for (const name of SOUNDS) {
      const track = mixCues([{ at: 0, sound: name }], sounds, { seconds: 3, lines: [], volume: 0.5 });
      expect(20 * Math.log10(peakOf(track)), name).toBeCloseTo(PEAK_DB[name], 0);
    }
  });

  it("plays quieter while someone is speaking", () => {
    const quiet = mixCues([{ at: 1, sound: "tap" }], sounds, { seconds: 3, lines: [{ text: "Hi", start: 0.5, end: 2 }], volume: 0.5 });
    const full = mixCues([{ at: 1, sound: "tap" }], sounds, { seconds: 3, lines: [], volume: 0.5 });
    expect(peakOf(quiet) / peakOf(full)).toBeCloseTo(0.6, 3);
  });

  it("never clips, even at full volume", async () => {
    expect(peakOf((await buildSoundEffects(film(f.scenes, { sfx: { volume: 1 } }), style, timeline, ffmpeg))!)).toBeLessThan(0.5);
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

describe("the recordings", () => {
  it("are all in the package", () => {
    expect([...sounds.keys()].sort()).toEqual([...SOUNDS].sort());
  });

  it("start and end in silence, so nothing clicks", () => {
    for (const [name, { left, right }] of sounds) {
      for (const channel of [left, right]) {
        expect(Math.abs(channel[0]!), name).toBeLessThan(0.05);
        expect(Math.abs(channel.at(-1)!), name).toBeLessThan(0.001);
      }
    }
  });

  it("are all credited", async () => {
    const credits = await readFile(new URL("../sounds/CREDITS.md", import.meta.url), "utf8");
    for (const name of SOUNDS) expect(credits).toContain(`\`${name}.flac\``);
    expect(credits).toContain("CC0");
  });

  it("move up in pitch by playing faster", () => {
    const tap = sounds.get("tap")!;
    expect(repitch(tap, 12).left.length).toBeCloseTo(tap.left.length / 2, -1);
    expect(repitch(tap, 0)).toBe(tap);
  });
});
