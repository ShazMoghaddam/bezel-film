import { describe, expect, it } from "vitest";
import { validateFilm, type Film } from "../src/index.js";
import { layoutFor } from "../src/render/layout.js";
import {
  MOTION_FEELS,
  SPRINGS,
  WORD_REVEAL_MAX_MS,
  motionVars,
  overshoot,
  settleSeconds,
  springAt,
  springCss,
  wordStagger,
} from "../src/render/motion.js";
import { buildPage, motionLevel, runtimeData } from "../src/render/page.js";
import { loadStyle } from "../src/render/style.js";
import { buildTimeline } from "../src/render/timeline.js";

function film(scenes: unknown[], extra: object = {}): Film {
  const result = validateFilm({ spec: 1, title: "Test", style: "data-story", scenes, ...extra });
  if (!result.ok) throw new Error(result.errors.join("\n"));
  return result.film;
}

describe("springs", () => {
  it("start at 0 and settle at 1", () => {
    for (const spring of Object.values(SPRINGS)) {
      expect(springAt(spring, 0)).toBe(0);
      expect(springAt(spring, settleSeconds(spring))).toBeCloseTo(1, 2);
    }
  });

  it("overshoot by the intended amount", () => {
    expect(overshoot(SPRINGS.gentle)).toBe(0);
    expect(overshoot(SPRINGS.snappy)).toBeGreaterThan(0.02);
    expect(overshoot(SPRINGS.snappy)).toBeLessThan(0.07);
    expect(overshoot(SPRINGS.bouncy)).toBeGreaterThan(0.08);
    expect(overshoot(SPRINGS.bouncy)).toBeLessThan(0.18);
  });

  it("settle within a second, so entrances never drag", () => {
    for (const spring of Object.values(SPRINGS)) expect(settleSeconds(spring)).toBeLessThan(1);
  });

  it("become a CSS linear() curve from 0 to 1", () => {
    const { easing, ms } = springCss(SPRINGS.bouncy);
    expect(easing).toMatch(/^linear\(0, [\d., ]+, 1\)$/);
    expect(Math.max(...easing.slice(7, -1).split(", ").map(Number))).toBeGreaterThan(1);
    expect(ms).toBe(Math.round(settleSeconds(SPRINGS.bouncy) * 1000));
  });
});

describe("motion levels", () => {
  const style = { easing: "cubic-bezier(0.22, 1, 0.36, 1)", enterMs: 600 };

  it("calm uses the style's own easing, so films look as they did before", () => {
    const vars = motionVars("calm", style);
    expect(vars).toContain(`--move-ease:${style.easing}`);
    expect(vars).toContain("--move-ms:600ms");
    expect(vars).not.toContain("linear(");
  });

  it("lively and punchy use springs", () => {
    expect(motionVars("lively", style)).toContain("--move-ease:linear(");
    expect(motionVars("punchy", style)).toContain("--pop-ease:linear(");
  });

  it("squeezes the word gap so long headings still finish quickly", () => {
    const feel = MOTION_FEELS.lively;
    expect(wordStagger(feel, 1)).toBe(0);
    expect(wordStagger(feel, 3)).toBe(feel.wordStaggerMs);
    expect(wordStagger(feel, 20) * 19).toBeCloseTo(WORD_REVEAL_MAX_MS);
  });
});

describe("motion in the film", async () => {
  const style = await loadStyle("data-story");
  const page = (f: Film) => buildPage(f, style, buildTimeline(f), layoutFor(f));

  it("defaults to the style's level, lively", () => {
    const f = film([{ type: "title", title: "Hello", duration: 3 }]);
    expect(motionLevel(f, f.scenes[0]!, style)).toBe("lively");
  });

  it("lets a scene override the film", () => {
    const f = film(
      [
        { type: "title", title: "A", duration: 3 },
        { type: "title", title: "B", duration: 3, motion: "punchy" },
      ],
      { motion: "calm" },
    );
    const html = page(f);
    expect(html).toContain('class="scene scene-title m-calm"');
    expect(html).toContain('class="scene scene-title m-punchy"');
    expect(html).not.toContain(".m-lively{");
  });

  it("reveals headings word by word, except in calm", () => {
    const lively = page(film([{ type: "title", title: "A year in numbers", duration: 3 }]));
    expect(lively.match(/class="word"/g)).toHaveLength(4);
    const calm = page(film([{ type: "title", title: "A year in numbers", duration: 3 }], { motion: "calm" }));
    expect(calm).not.toContain('class="word"');
    expect(calm).toContain('class="rise display"');
  });

  it("escapes every word", () => {
    const html = page(film([{ type: "title", title: "<b>Bold</b> & brave", duration: 3 }]));
    expect(html).toContain("&lt;b&gt;Bold&lt;/b&gt;");
    expect(html).toContain(">&amp;</span>");
    expect(html).not.toContain("<b>Bold");
  });

  it("tells the runtime how each scene's number counts up", () => {
    const f = film(
      [
        { type: "stat", value: 42, label: "A", duration: 3 },
        { type: "stat", value: 42, label: "B", duration: 3, motion: "calm" },
      ],
    );
    const [lively, calm] = runtimeData(f, style, buildTimeline(f), layoutFor(f)).scenes;
    expect(lively!.count).toEqual({ delay: 0.25, seconds: 1.5, curve: "quart", landsAt: 0.7, pulse: true });
    expect(calm!.count).toEqual({ delay: 0.25, seconds: 1.4, curve: "cubic", landsAt: 0.7, pulse: false });
  });

  it("rejects a motion level that doesn't exist", () => {
    const result = validateFilm({ spec: 1, title: "T", style: "data-story", motion: "wild", scenes: [{ type: "title", title: "A", duration: 2 }] });
    expect(result.ok).toBe(false);
  });
});

describe("motion blur", async () => {
  const { encoderArgs } = await import("../src/render/ffmpeg.js");
  const { snapshotTime, HIGH_QUALITY_SHUTTER } = await import("../src/render/index.js");
  const style = await loadStyle("data-story");

  it("is off for calm, so calm films look exactly as before", () => {
    expect(MOTION_FEELS.calm.shutter).toBe(0);
    expect(MOTION_FEELS.lively.shutter).toBe(0.5);
    expect(MOTION_FEELS.punchy.shutter).toBeGreaterThan(MOTION_FEELS.lively.shutter);
  });

  it("tells the page each scene's shutter, and whether to draw blur itself", () => {
    const f = film([
      { type: "title", title: "A", duration: 3 },
      { type: "title", title: "B", duration: 3, motion: "calm" },
    ]);
    const data = runtimeData(f, style, buildTimeline(f), layoutFor(f));
    expect(data.fps).toBe(f.format.fps);
    expect(data.pageBlur).toBe(true);
    expect(data.scenes.map((s) => s.shutter)).toEqual([0.5, 0]);
    expect(runtimeData(f, style, buildTimeline(f), layoutFor(f), { trueBlur: true }).pageBlur).toBe(false);
  });

  it("spreads high-quality snapshots across the shutter, ending on the frame", () => {
    const times = [0, 1, 2, 3, 4].map((k) => snapshotTime(30, k, 5, 30));
    expect(times.at(-1)).toBe(1);
    expect(times[0]).toBeCloseTo((30 - HIGH_QUALITY_SHUTTER) / 30, 10);
    for (let k = 1; k < 5; k++) expect(times[k]! - times[k - 1]!).toBeCloseTo(HIGH_QUALITY_SHUTTER / 4 / 30, 10);
    expect(snapshotTime(0, 0, 5, 30)).toBe(0); // never before the film starts
    expect(snapshotTime(12, 0, 1, 30)).toBe(12 / 30); // standard quality: one snapshot, on the frame
  });

  it("leaves the encoder as it was at standard quality", () => {
    const args = encoderArgs({ fps: 30, output: "film.mp4" });
    expect(args.slice(0, 12)).toEqual(["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", "30", "-c:v", "png", "-i", "-", "-c:v"]);
    expect(args.join(" ")).not.toContain("tmix");
  });

  it("blends each group of snapshots into one frame at high quality", () => {
    const args = encoderArgs({ fps: 30, output: "film.mp4", blend: 5, size: [1280, 720] }).join(" ");
    expect(args).toContain("-framerate 150");
    expect(args).toContain("-vf tmix=frames=5,select='eq(mod(n,5),4)',setpts=N/(30*TB),scale=1280:720:flags=lanczos");
    expect(args).toContain("-r 30");
  });

  it("blends the picture alongside the voice and music too", () => {
    const args = encoderArgs({ fps: 30, output: "film.mp4", blend: 5, narration: "voice.wav", music: "music.wav" });
    const graph = args[args.indexOf("-filter_complex") + 1]!;
    expect(graph.startsWith("[0:v]tmix=frames=5,")).toBe(true);
    expect(args).toContain("[video]");
  });
});
