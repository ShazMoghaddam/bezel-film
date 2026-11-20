import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MUSIC_MOODS, MUSIC_TRACKS } from "../src/spec/schema.js";
import { validateFilm } from "../src/index.js";
import { MOOD_MUSIC, TRACKS, TRACK_LUFS, pickTrack, trackFile, trackGain, trackManifest, trackUrl, type RecordedTrack } from "../src/render/tracks.js";

const ids = Object.keys(TRACKS) as RecordedTrack[];

describe("the music catalogue", () => {
  it("covers every track the schema allows, and nothing more", () => {
    expect(["composed", ...ids].sort()).toEqual([...MUSIC_TRACKS].sort());
  });

  it("gives every mood at least two options, and uses every track", () => {
    for (const mood of MUSIC_MOODS) expect(MOOD_MUSIC[mood].length, mood).toBeGreaterThanOrEqual(2);
    expect(new Set(Object.values(MOOD_MUSIC).flat())).toEqual(new Set(["composed", ...ids]));
  });

  it("has a built file for every track, matching its fingerprint", async () => {
    const { tracks } = await trackManifest();
    for (const id of ids) {
      const bytes = await readFile(new URL(`../music/${tracks[id].file}`, import.meta.url));
      expect(createHash("sha256").update(bytes).digest("hex"), id).toBe(tracks[id].sha256);
      expect(tracks[id].seconds, id).toBeGreaterThan(90);
    }
  });

  it("brings every track to the composed music's loudness", async () => {
    const { tracks } = await trackManifest();
    for (const id of ids) {
      expect(20 * Math.log10(await trackGain(id)) + tracks[id].lufs, id).toBeCloseTo(TRACK_LUFS, 5);
    }
  });
});

describe("picking music", () => {
  it("picks one of the mood's options from the title, the same one every time", () => {
    const pick = pickTrack("Northside Coffee", "calm");
    expect(MOOD_MUSIC.calm).toContain(pick);
    expect(pickTrack("Northside Coffee", "calm")).toBe(pick);
  });

  it("spreads films across a mood's options", () => {
    const picks = new Set(Array.from({ length: 40 }, (_, i) => pickTrack(`Film ${i}`, "epic")));
    expect(picks).toEqual(new Set(MOOD_MUSIC.epic));
  });

  it("plays the track a film asks for", () => {
    expect(pickTrack("Any", "calm", "the-drama")).toBe("the-drama");
    expect(pickTrack("Any", "dramatic", "composed")).toBe("composed");
  });

  it("rejects a track that doesn't exist", () => {
    const film = (track: string) => validateFilm({ spec: 1, title: "T", style: "data-story", music: { track }, scenes: [{ type: "title", title: "A", duration: 2 }] });
    expect(film("city-sunshine").ok).toBe(true);
    expect(film("not-a-track").ok).toBe(false);
  });
});

describe("downloading music", () => {
  let cache: string;
  afterEach(async () => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.resetModules();
    if (cache) await rm(cache, { recursive: true, force: true });
  });

  it("downloads from this release's own copy in the repo", async () => {
    const { version } = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8")) as { version: string };
    expect(await trackUrl("city-sunshine.opus")).toBe(`https://raw.githubusercontent.com/ShazMoghaddam/bezel-film/v${version}/music/city-sunshine.opus`);
  });

  /** trackFile, as an installed package sees it: no music/ folder, only the cache. */
  async function installedTrackFile(response: Response) {
    cache = await mkdtemp(join(tmpdir(), "bezel-music-"));
    vi.stubEnv("BEZEL_FILM_CACHE", cache);
    vi.stubGlobal("fetch", vi.fn(async () => response));
    vi.doMock("node:fs", async (original) => {
      const fs = await original<typeof import("node:fs")>();
      // Pretend the repo's music/ folder isn't there, as in an npm install.
      return { ...fs, existsSync: (path: string) => (String(path).includes("/music/") && !String(path).startsWith(cache) ? false : fs.existsSync(path)) };
    });
    const tracks = await import("../src/render/tracks.js");
    return tracks.trackFile("the-drama");
  }

  it("downloads a track once, checks it and keeps it in the cache", async () => {
    const bytes = await readFile(new URL("../music/the-drama.opus", import.meta.url));
    const path = await installedTrackFile(new Response(bytes));
    expect(path.startsWith(cache)).toBe(true);
    expect(await readFile(path)).toEqual(bytes);
  });

  it("refuses a download that doesn't match its fingerprint", async () => {
    await expect(installedTrackFile(new Response("not music"))).rejects.toThrow("didn't download correctly");
  });

  it("says plainly when a download fails", async () => {
    await expect(installedTrackFile(new Response("", { status: 404 }))).rejects.toThrow('Couldn\'t download the music "The Drama" (404)');
  });

  it("reads the repo's own copy in a clone, without downloading", async () => {
    const path = await trackFile("the-drama");
    expect(path).toContain("/music/the-drama.opus");
  });
});

describe("when a track can't be had", () => {
  afterEach(() => {
    vi.doUnmock("../src/render/tracks.js");
    vi.resetModules();
  });

  it("composes music for the film instead, and says how to get the track", async () => {
    vi.doMock("../src/render/tracks.js", async (original) => ({
      ...(await original<typeof import("../src/render/tracks.js")>()),
      trackFile: async () => {
        throw new Error('Couldn\'t download the music "The Drama" (offline)');
      },
    }));
    const { buildMusic } = await import("../src/render/soundtrack.js");
    const { buildTimeline } = await import("../src/render/timeline.js");
    const { findFfmpeg } = await import("../src/render/ffmpeg.js");
    const result = validateFilm({ spec: 1, title: "T", style: "data-story", music: { mood: "dramatic", track: "the-drama" }, scenes: [{ type: "title", title: "A", duration: 3 }] });
    if (!result.ok) throw new Error(result.errors.join("\n"));
    const warnings: string[] = [];
    const music = await buildMusic({ film: result.film, timeline: buildTimeline(result.film), ffmpeg: findFfmpeg(), baseDir: ".", onWarning: (w) => warnings.push(w) });
    expect(music!.left.some((v) => v !== 0)).toBe(true);
    expect(warnings).toEqual([expect.stringContaining("uses music composed for it instead")]);
    expect(warnings[0]).toContain("npx bezel-film setup");
  });
});
