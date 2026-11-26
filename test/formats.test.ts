import { describe, expect, it } from "vitest";
import { lengthNotes, PLATFORMS, PRESETS, readPresetList } from "../src/spec/formats.js";
import { validateFilm, type Film } from "../src/index.js";
import { bitrateForSize } from "../src/render/ffmpeg.js";
import { coverPath, coverSeconds, filmFor } from "../src/render/index.js";
import { layoutFor, videoSize } from "../src/render/layout.js";
import { buildPage } from "../src/render/page.js";
import { loadStyle } from "../src/render/style.js";
import { buildTimeline } from "../src/render/timeline.js";

const base = {
  spec: 1,
  title: "Test",
  style: "data-story",
  scenes: [{ type: "title", title: "Hello", duration: 3 }],
};

function film(format: Record<string, unknown> = {}): Film {
  const result = validateFilm({ ...base, format });
  if (!result.ok) throw new Error(result.errors.join("\n"));
  return result.film;
}

describe("format presets", () => {
  it("defaults to a 16:9, 1080p film for anywhere", () => {
    expect(film().format).toMatchObject({ aspect: "16:9", resolution: "1080p", fps: 30 });
    expect(film().format.preset).toBeUndefined();
  });

  it("takes the shape, and sometimes the size, from the preset", () => {
    expect(film({ preset: "tiktok" }).format).toMatchObject({ aspect: "9:16", resolution: "1080p" });
    expect(film({ preset: "linkedin-mobile" }).format.aspect).toBe("4:5");
    expect(film({ preset: "whatsapp" }).format).toMatchObject({ aspect: "9:16", resolution: "720p" });
    expect(film({ preset: "whatsapp", resolution: "1080p" }).format.resolution).toBe("1080p");
  });

  it("explains when the aspect doesn't match the preset", () => {
    const result = validateFilm({ ...base, format: { preset: "tiktok", aspect: "16:9" } });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]).toBe("format.aspect: TikTok films are 9:16. Leave aspect out, or choose another preset");
  });

  it("keeps every safe zone inside the frame, with room left in the middle", () => {
    for (const name of PRESETS) {
      const safe = (PLATFORMS[name] as { safe?: { top: number; right: number; bottom: number; left: number } }).safe;
      if (!safe) continue;
      expect(safe.top + safe.bottom, name).toBeLessThan(0.6);
      expect(safe.left + safe.right, name).toBeLessThan(0.4);
    }
  });
});

describe("readPresetList", () => {
  it("reads names in any case, drops repeats and expands all", () => {
    expect(readPresetList(" TikTok, reels,tiktok ")).toEqual({ presets: ["tiktok", "reels"], unknown: undefined });
    expect(readPresetList("all").presets).toEqual(PRESETS);
  });

  it("returns the first unknown name", () => {
    expect(readPresetList("tiktok,facebook").unknown).toBe("facebook");
  });
});

describe("lengthNotes", () => {
  it("says when a film is too long for a platform", () => {
    expect(lengthNotes("shorts", 200)).toEqual(["At about 3m 20s, this film is longer than YouTube Shorts allows (3m). Cut some narration or scenes."]);
    expect(lengthNotes("x", 150)[0]).toContain("longer than X allows (2m 20s)");
  });

  it("suggests keeping it short where that works best, and is quiet otherwise", () => {
    expect(lengthNotes("tiktok", 75)).toEqual(["At about 1m 15s, this film is long for TikTok, where under 1m tends to hold viewers best."]);
    expect(lengthNotes("tiktok", 45)).toEqual([]);
    expect(lengthNotes("youtube", 300)).toEqual([]);
  });
});

describe("layouts", () => {
  it("sizes the frame for each shape and resolution", () => {
    expect(videoSize(layoutFor(film({ preset: "tiktok" })))).toEqual([1080, 1920]);
    expect(videoSize(layoutFor(film({ preset: "whatsapp" })))).toEqual([720, 1280]);
    expect(videoSize(layoutFor(film({ preset: "instagram" })))).toEqual([1080, 1350]);
    expect(videoSize(layoutFor(film({ aspect: "1:1", resolution: "4k" })))).toEqual([2160, 2160]);
    expect(layoutFor(film({ preset: "reels" })).shape).toBe("tall");
    expect(layoutFor(film({ preset: "linkedin-desktop" })).safe).toBeUndefined();
  });

  it("keeps content inside the platform's safe zone, and only shades it when asked", async () => {
    const style = await loadStyle("data-story");
    const f = film({ preset: "reels" });
    const html = buildPage(f, style, buildTimeline(f), layoutFor(f));
    expect(html).toContain("--st:14vh");
    expect(html).toContain('class="shape-tall"');
    expect(html).not.toContain('class="safe-overlay"');
    expect(buildPage(f, style, buildTimeline(f), layoutFor(f), { showSafeZones: true })).toContain('class="safe-overlay"');
  });

  it("keeps content centred, with the same margin on both sides", async () => {
    const style = await loadStyle("data-story");
    for (const preset of ["tiktok", "shorts"] as const) {
      const f = film({ preset });
      const html = buildPage(f, style, buildTimeline(f), layoutFor(f));
      const left = html.match(/--sl:([\d.]+vw)/)?.[1];
      expect(left, preset).toBeTruthy();
      expect(html, preset).toContain(`--sr:${left}`);
    }
  });
});

describe("several formats from one film", () => {
  it("redraws the same story in each platform's frame", () => {
    const source = film({ aspect: "16:9", resolution: "4k" });
    expect(filmFor(source, "whatsapp").format).toMatchObject({ preset: "whatsapp", aspect: "9:16", resolution: "720p" });
    expect(filmFor(source, "reels").format).toMatchObject({ aspect: "9:16", resolution: "4k" });
    expect(filmFor(source, "reels").scenes).toBe(source.scenes);
  });

  it("names covers after their video and takes them once the opening has settled", () => {
    expect(coverPath("films/demo/film-tiktok.mp4")).toBe("films/demo/film-tiktok-cover.png");
    const timeline = buildTimeline(film());
    const first = timeline.scenes[0]!;
    expect(coverSeconds(timeline)).toBeCloseTo(first.start + (first.end - first.start) * 0.75);
  });

  it("takes the cover from the scene the film names, by id or number", () => {
    const scenes = [
      { type: "title", id: "intro", title: "Hi", narration: "Hello there, everyone, and welcome." },
      { type: "stat", id: "big", value: 5, label: "things", narration: "There are five things to know." },
    ];
    const make = (cover: unknown) => {
      const result = validateFilm({ ...base, scenes, cover });
      if (!result.ok) throw new Error(result.errors.join("\n"));
      return result.film;
    };
    const byId = make({ scene: "big", at: 1 });
    const timeline = buildTimeline(byId);
    expect(coverSeconds(timeline, byId.cover)).toBeCloseTo(timeline.scenes[1]!.start + 1);
    const byNumber = make({ scene: 2 });
    const second = timeline.scenes[1]!;
    expect(coverSeconds(buildTimeline(byNumber), byNumber.cover)).toBeCloseTo(second.start + (second.end - second.start) * 0.75);
    expect(validateFilm({ ...base, scenes, cover: { scene: "nope" } }).ok).toBe(false);
    expect(validateFilm({ ...base, scenes, cover: { scene: 3 } }).ok).toBe(false);
  });

  it("keeps WhatsApp videos under 16 MB", () => {
    const kbps = bitrateForSize(16, 60);
    expect(((kbps + 96) * 60) / 8000).toBeLessThan(16);
    expect(bitrateForSize(16, 3600)).toBe(150);
  });
});
