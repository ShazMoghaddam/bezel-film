import { describe, expect, it } from "vitest";
import { validateFilm, type Film } from "../src/index.js";
import { encodeWav, mixToWav } from "../src/render/audio.js";
import { buildPage, escapeHtml, runtimeData, sceneCues } from "../src/render/page.js";
import { layoutFor } from "../src/render/layout.js";
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
    const html = buildPage(f, style, buildTimeline(f), layoutFor(f));
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
    const html = buildPage(f, style, buildTimeline(f), layoutFor(f));
    for (const type of ["title", "stat", "chart", "points", "code", "quote", "outro"]) expect(html).toContain(`scene-${type}`);
  });

  it("gives a custom scene a full-frame layer, the kit and its own file, before the runtime", () => {
    const f = film([
      { type: "title", title: "T", duration: 2 },
      { type: "custom", file: "scenes/steps.js", props: { steps: ["a"] }, narration: "One. Two." },
    ]);
    const html = buildPage(f, style, buildTimeline(f), layoutFor(f));
    expect(html).toContain('<div class="custom-root" data-custom="1"></div>');
    const kit = html.indexOf('<script src="/kit.js">');
    const scene = html.indexOf('<script src="/scenes/1.js" data-scene="1">');
    expect(kit).toBeGreaterThan(-1);
    expect(scene).toBeGreaterThan(kit);
    expect(html.indexOf('<script src="/runtime.js">')).toBeGreaterThan(scene);
  });

  it("tells a custom scene its narration's timing from its own start, and its props", () => {
    const f = film([
      { type: "title", title: "T", duration: 2 },
      { type: "custom", file: "scenes/steps.js", props: { steps: ["a"] }, narration: "One. Two." },
    ]);
    const timeline = buildTimeline(f);
    const data = runtimeData(f, style, timeline, layoutFor(f));
    expect(data.customs).toHaveLength(1);
    const custom = data.customs[0]!;
    expect(custom).toMatchObject({ scene: 1, file: "scenes/steps.js", props: { steps: ["a"] } });
    expect(custom.lines.map((l) => l.text)).toEqual(["One.", "Two."]);
    expect(custom.lines[0]!.start).toBeGreaterThanOrEqual(0);
    expect(custom.lines[0]!.start).toBeLessThan(1);
    expect(custom.duration).toBeCloseTo(timeline.scenes[1]!.end - timeline.scenes[1]!.start);
  });

  it("leaves pages without custom scenes alone", () => {
    const f = film([{ type: "title", title: "T", duration: 2 }]);
    expect(buildPage(f, style, buildTimeline(f), layoutFor(f))).not.toContain("/kit.js");
  });

  it("plays a custom scene's sounds when it says", () => {
    const f = film([{ type: "custom", file: "a.js", duration: 3, sounds: [{ at: 1.5, sound: "pop", gain: 0.8 }, { at: 0.2, sound: "tap" }] }]);
    const cues = sceneCues(f, buildTimeline(f).scenes[0]!, style);
    expect(cues).toEqual([{ ms: 200, sound: "tap" }, { ms: 1500, sound: "pop", gain: 0.8 }].map((c) => expect.objectContaining(c)));
  });
});

describe("loadStyle", () => {
  it("names the styles there are when one doesn't exist", async () => {
    await expect(loadStyle("watercolour")).rejects.toThrow('There\'s no "watercolour" style. Choose from: blueprint, data-story, isometric, stick-figures, whiteboard.');
  });

  it("loads the style's own CSS", async () => {
    const style = await loadStyle("data-story");
    expect(style.css).toContain(".backdrop");
  });
});

describe("fonts on the page", async () => {
  const style = await loadStyle("data-story");
  const page = (extra: object = {}) => {
    const f = film([{ type: "title", title: "T", duration: 2 }], extra);
    return buildPage(f, style, buildTimeline(f), layoutFor(f));
  };

  it("uses the style's pairing unless the film picks one", () => {
    expect(page()).toContain("/fonts/space-grotesk/space-grotesk-latin-700-normal.woff2");
    const html = page({ font: "editorial" });
    expect(html).toContain("/fonts/fraunces/fraunces-latin-700-normal.woff2");
    expect(html).not.toContain("space-grotesk");
  });

  it("includes Latin Extended, loaded only for the characters that need it", () => {
    expect(page()).toMatch(/inter-latin-ext-400-normal\.woff2\) format\("woff2"\);unicode-range:U\+0100/);
  });

  it("scales fonts that are drawn small", () => {
    expect(page({ font: "handwritten" })).toMatch(/caveat-latin-700-normal\.woff2[^}]*size-adjust:135%/);
  });

  it("gives one font two roles without mixing up their weights", () => {
    const html = page({ font: "friendly" });
    expect(html).toContain('font-family:"bf-heading";font-weight:700;font-display:block;src:url(/fonts/nunito/nunito-latin-800-normal.woff2)');
    expect(html).toContain('font-family:"bf-body";font-weight:600;font-display:block;src:url(/fonts/nunito/nunito-latin-600-normal.woff2)');
  });

  it("rejects a pairing that doesn't exist", () => {
    const result = validateFilm({ spec: 1, title: "T", style: "data-story", font: "comic", scenes: [{ type: "title", title: "T", duration: 2 }] });
    expect(result.ok).toBe(false);
  });
});

describe("explicit durations", () => {
  it("can be shorter than the minimum scene length", () => {
    const timeline = buildTimeline(film([{ type: "title", title: "A", duration: 1.2 }]));
    expect(timeline.scenes[0]!.end).toBe(1.2);
  });
});

describe("kokoroVoiceName", async () => {
  const { kokoroVoiceName } = await import("../src/render/voice.js");

  it("uses the best female voice by default", () => {
    expect(kokoroVoiceName(film([{ type: "title", title: "A", duration: 2 }]))).toBe("af_heart");
  });

  it("uses the best male voice when asked", () => {
    expect(kokoroVoiceName(film([{ type: "title", title: "A", duration: 2 }], { voice: { gender: "male" } }))).toBe("am_michael");
  });

  it("lets a named voice override gender", () => {
    const f = film([{ type: "title", title: "A", duration: 2 }], { voice: { gender: "male", voice: "bf_emma" } });
    expect(kokoroVoiceName(f)).toBe("bf_emma");
  });
});

describe("sampleVoices", async () => {
  const { mkdtemp, readFile, readdir, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const { VOICE_SHORTLIST, joinClips, sampleVoices } = await import("../src/render/samples.js");

  it("records every shortlisted voice, plus one file with them all", async () => {
    const folder = await mkdtemp(join(tmpdir(), "voices-"));
    const heard: string[] = [];
    const speaker = {
      voices: VOICE_SHORTLIST.map((voice) => voice.id),
      async speakAs(voice: string, text: string) {
        heard.push(`${voice}: ${text}`);
        return { samples: new Float32Array(240), sampleRate: 24_000 };
      },
      async dispose() {},
    };
    try {
      const result = await sampleVoices({ speaker, folder });
      expect(heard[0]).toBe("af_heart: Hi, I'm Heart. This is how your film's narration would sound.");
      expect(result.files).toHaveLength(VOICE_SHORTLIST.length);
      expect(await readdir(folder)).toContain("01-af_heart.wav");
      // Eight clips of 240 samples, each followed by a 0.8 second gap.
      const all = await readFile(result.all);
      expect(all.readUInt32LE(40)).toBe(8 * (240 + 19_200) * 2);
    } finally {
      await rm(folder, { recursive: true, force: true });
    }
  });

  it("puts a gap of silence between clips", () => {
    const clip = { samples: new Float32Array([0.5]), sampleRate: 4 };
    const wav = joinClips([clip, clip], 0.5);
    const samples = Array.from({ length: 6 }, (_, i) => wav.readInt16LE(44 + i * 2));
    expect(samples).toEqual([16384, 0, 0, 16384, 0, 0]);
  });

  it("only lists voices Kokoro grades C or better", () => {
    expect(VOICE_SHORTLIST.every((voice) => /^[ABC]/.test(voice.grade))).toBe(true);
  });
});

describe("custom scene files", () => {
  const check = (file: string) => validateFilm({ spec: 1, title: "T", style: "data-story", scenes: [{ type: "custom", file, duration: 2 }] }).ok;

  it("takes a .js file in the film's folder", () => {
    for (const file of ["scenes/intro.js", "intro.js", "scenes/part-2/map_view.js"]) expect(check(file), file).toBe(true);
  });

  it("refuses paths that leave the folder, absolute paths and other file types", () => {
    for (const file of ["../intro.js", "scenes/../../x.js", "/home/me/x.js", "C:x.js", "C:\\x.js", "scenes/intro.ts", "scenes/my scene.js"]) expect(check(file), file).toBe(false);
  });
});
