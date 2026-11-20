import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { SCENE_TYPES, estimateFilmSeconds, validateFilm } from "../src/index.js";

const minimal = {
  spec: 1,
  title: "Test film",
  style: "data-story",
  scenes: [{ type: "title", title: "Hello", narration: "Hello there." }],
};

function errorsFor(input: unknown): string[] {
  const result = validateFilm(input);
  return result.ok ? [] : result.errors;
}

describe("validateFilm", () => {
  it("accepts a minimal film and fills in the defaults", () => {
    const result = validateFilm(minimal);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.film.format).toEqual({ aspect: "16:9", resolution: "1080p", fps: 30 });
    expect(result.film.voice).toEqual({ engine: "kokoro", gender: "female", speed: 1 });
    expect(result.film.music).toEqual({ source: "generated", mood: "calm", volume: 0.2 });
    expect(result.film.captions).toBe(true);
  });

  it("accepts the example film", async () => {
    const example = JSON.parse(await readFile("examples/northside-coffee/film.json", "utf8"));
    expect(errorsFor(example)).toEqual([]);
  });

  it("gives readable paths in its errors", () => {
    const film = { ...minimal, scenes: [{ type: "chart", narration: "x", chart: { type: "pie", values: [1] } }] };
    expect(errorsFor(film)[0]).toMatch(/^scenes\[0\]\.chart\.type: /);
  });

  it("needs narration or a duration on every scene", () => {
    const film = { ...minimal, scenes: [{ type: "title", title: "Silent" }] };
    expect(errorsFor(film)).toEqual(["scenes[0]: needs narration or a duration, so the renderer knows how long it lasts"]);
    expect(errorsFor({ ...film, scenes: [{ type: "title", title: "Silent", duration: 3 }] })).toEqual([]);
  });

  it("rejects duplicate scene ids", () => {
    const scene = { id: "same", type: "title", title: "A", duration: 2 };
    expect(errorsFor({ ...minimal, scenes: [scene, scene] })).toEqual(['scenes[1].id: "same" is used more than once']);
  });

  it("checks chart labels line up with values", () => {
    const chart = { type: "bars", values: [1, 2, 3], labels: ["a", "b"] };
    const film = { ...minimal, scenes: [{ type: "chart", duration: 3, chart }] };
    expect(errorsFor(film)).toEqual(["scenes[0].chart.labels: has 2 labels but values has 3 numbers"]);
  });

  it("needs a file when music comes from a file", () => {
    expect(errorsFor({ ...minimal, music: { source: "file" } })).toEqual([
      'music.file: is needed when source is "file"',
    ]);
  });

  it("rejects an unknown spec version", () => {
    expect(errorsFor({ ...minimal, spec: 2 })[0]).toMatch(/^spec: /);
  });
});

describe("estimateFilmSeconds", () => {
  it("times scenes from narration at about 150 words a minute", () => {
    const words = Array(30).fill("word").join(" ");
    const result = validateFilm({ ...minimal, scenes: [{ type: "title", title: "T", narration: words }] });
    if (!result.ok) throw new Error(result.errors.join("\n"));
    // 30 words at 150 a minute is 12 seconds, plus 0.6s breathing room.
    expect(estimateFilmSeconds(result.film)).toBeCloseTo(12.6);
  });
});

describe("SCENE_TYPES", () => {
  it("lists every scene type", () => {
    expect(SCENE_TYPES).toEqual(["title", "stat", "chart", "points", "timeline", "roadmap", "map", "code", "quote", "outro", "custom"]);
  });
});
