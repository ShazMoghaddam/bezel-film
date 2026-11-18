import { describe, expect, it } from "vitest";
import { validateFilm, type Film } from "../src/index.js";
import { encodeWav, mixToWav } from "../src/render/audio.js";
import { buildPage, escapeHtml } from "../src/render/page.js";
import { loadStyle } from "../src/render/style.js";
import {
  LEAD_SECONDS,
  MIN_SCENE_SECONDS,
  TAIL_SECONDS,
  buildTimeline,
  overlongNarration,
  splitSentences,
} from "../src/render/timeline.js";

function film(scenes: unknown[], extra: object = {}): Film {
  const result = validateFilm({ spec: 1, title: "Test", style: "data-story", scenes, ...extra });
  if (!result.ok) throw new Error(result.errors.join("\n"));
  return result.film;
}

describe("splitSentences", () => {
  it("splits on sentence endings and keeps the punctuation", () => {
    expect(splitSentences("Hello there. How are you? Great!")).toEqual(["Hello there.", "How are you?", "Great!"]);
  });

  it("keeps text without a full stop", () => {
    expect(splitSentences("No ending here")).toEqual(["No ending here"]);
  });

  it("keeps closing quotes with their sentence", () => {
    expect(splitSentences('She said "yes." Then left.')).toEqual(['She said "yes."', "Then left."]);
  });
});

describe("buildTimeline", () => {
  it("times each scene from its spoken sentences", () => {
    const f = film([
      { type: "title", title: "A", narration: "One. Two." },
      { type: "title", title: "B", narration: "Three." },
    ]);
    const timeline = buildTimeline(f, [[1.5, 2], [3]]);
    const [first, second] = timeline.scenes;
    expect(first!.lines.map((line) => [line.start, line.end])).toEqual([
      [LEAD_SECONDS, LEAD_SECONDS + 1.5],
      [LEAD_SECONDS + 1.5, LEAD_SECONDS + 3.5],
    ]);
    expect(first!.end).toBeCloseTo(LEAD_SECONDS + 3.5 + TAIL_SECONDS);
    expect(second!.start).toBe(first!.end);
    expect(second!.lines[0]!.start).toBeCloseTo(first!.end + LEAD_SECONDS);
  });

  it("never makes a scene shorter than the minimum", () => {
    const timeline = buildTimeline(film([{ type: "title", title: "A", narration: "Hi." }]), [[0.2]]);
    expect(timeline.scenes[0]!.end).toBe(MIN_SCENE_SECONDS);
  });

  it("uses an explicit duration when it's longer than the narration", () => {
    const timeline = buildTimeline(film([{ type: "title", title: "A", narration: "Hi.", duration: 6 }]), [[1]]);
    expect(timeline.scenes[0]!.end).toBe(6);
  });

  it("lengthens a scene rather than cutting off its voice, and says so", () => {
    const f = film([{ id: "intro", type: "title", title: "A", narration: "A long line.", duration: 2 }]);
    const timeline = buildTimeline(f, [[4]]);
    expect(timeline.scenes[0]!.end).toBeCloseTo(LEAD_SECONDS + 4 + TAIL_SECONDS);
    expect(overlongNarration(f, timeline)[0]).toMatch(/^intro: narration needs 5\.2s/);
  });

  it("estimates timing when there's no audio", () => {
    const timeline = buildTimeline(film([{ type: "title", title: "A", narration: "one two three four five" }]));
    // Five words at 150 a minute is two seconds.
    expect(timeline.scenes[0]!.lines[0]!.end - timeline.scenes[0]!.lines[0]!.start).toBeCloseTo(2);
  });

  it("adds a short fade at the end of the film", () => {
    const timeline = buildTimeline(film([{ type: "title", title: "A", duration: 3 }]));
    expect(timeline.duration).toBeCloseTo(3.6);
  });
});

describe("audio", () => {
  it("writes a valid mono 16-bit WAV header", () => {
    const wav = encodeWav(new Float32Array(100), 24_000);
    expect(wav.toString("ascii", 0, 4)).toBe("RIFF");
    expect(wav.toString("ascii", 8, 12)).toBe("WAVE");
    expect(wav.readUInt16LE(22)).toBe(1);
    expect(wav.readUInt32LE(24)).toBe(24_000);
    expect(wav.readUInt32LE(40)).toBe(200);
    expect(wav.length).toBe(244);
  });

  it("places each clip at its start time", () => {
    const clip = { samples: new Float32Array([0.5, 0.5]), sampleRate: 10 };
    const wav = mixToWav([{ clip, start: 0.3 }], 1);
    const sample = (i: number) => wav.readInt16LE(44 + i * 2);
    expect([sample(2), sample(3), sample(4), sample(5)]).toEqual([0, 16384, 16384, 0]);
  });
});

describe("buildPage", async () => {
  const style = await loadStyle("data-story");

  it("escapes text from the film file", () => {
    expect(escapeHtml(`<b>"Tom" & 'Jerry'</b>`)).toBe("&lt;b&gt;&quot;Tom&quot; &amp; &#39;Jerry&#39;&lt;/b&gt;");
    const f = film([{ type: "title", title: "<script>alert(1)</script>", narration: "</script><script>alert(2)</script>" }]);
    const html = buildPage(f, style, buildTimeline(f));
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;alert(1)");
  });

  it("draws every built-in scene type", () => {
    const f = film([
      { type: "title", title: "T", subtitle: "S", duration: 2 },
      { type: "stat", value: "£1.2M", label: "raised", duration: 2 },
      { type: "chart", chart: { type: "bars", values: [1, 2], labels: ["a", "b"], heading: "H" }, duration: 2 },
      { type: "points", heading: "P", points: ["one", "two"], duration: 2 },
      { type: "code", language: "ts", code: "const a = 1;", highlight: [1], duration: 2 },
      { type: "quote", quote: "Q", attribution: "A", duration: 2 },
      { type: "outro", title: "O", url: "https://example.com", cta: "Go", duration: 2 },
    ]);
    const html = buildPage(f, style, buildTimeline(f));
    for (const type of ["title", "stat", "chart", "points", "code", "quote", "outro"]) expect(html).toContain(`scene-${type}`);
  });

  it("says clearly that custom scenes aren't supported yet", () => {
    const f = film([{ type: "custom", module: "./my-scene.js", duration: 2 }]);
    expect(() => buildPage(f, style, buildTimeline(f))).toThrow(/Custom scenes aren't supported/);
  });
});

describe("loadStyle", () => {
  it("names the styles that are ready when one isn't built yet", async () => {
    await expect(loadStyle("whiteboard")).rejects.toThrow('The "whiteboard" style isn\'t built yet. Ready now: data-story.');
  });
});

describe("explicit durations", () => {
  it("can be shorter than the minimum scene length", () => {
    const timeline = buildTimeline(film([{ type: "title", title: "A", duration: 1.2 }]));
    expect(timeline.scenes[0]!.end).toBe(1.2);
  });
});
