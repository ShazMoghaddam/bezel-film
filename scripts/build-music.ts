import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { findFfmpeg } from "../src/render/ffmpeg.js";
import { MOOD_MUSIC, TRACKS, TRACK_LUFS, type RecordedTrack } from "../src/render/tracks.js";
import { NATURE_RECORDINGS, type NatureRecording } from "../src/render/nature.js";
import { cacheDir } from "../src/render/voice.js";

/**
 * Builds the recorded music in music/ and the nature loops in nature/, from sources
 * pinned to one commit and checked against a fingerprint, so they never change
 * underneath us. Run with `npm run music`. Only maintainers need to run it; the
 * result is committed.
 *
 * Tracks keep their own dynamics: each gets one clean gain to peak at -1 dB, and
 * films level it to match Bezel Film's composed music. Saved as Opus at 128 kb/s. They live in the repo but not the npm package: films download
 * them once, from the release's own copy, checked against music/manifest.json.
 *
 * Nature sounds are cut into 45-second loops whose end blends into their start, and
 * ship inside the package as Opus at 96 kb/s.
 */

const root = fileURLToPath(new URL("..", import.meta.url));
const RATE = 48_000;

const LOOP_SECONDS = 45;
const LOOP_BLEND_SECONDS = 3;

const PACKS = {
  freepd: {
    title: "FreePD",
    home: "https://freepd.com",
    repo: "SoundSafari/CC0-1.0-Music",
    commit: "655388f987eacf6d08d73080fcc3e727f267bfde",
  },
  omarchy: {
    title: "Ambient for Omarchy",
    home: "https://github.com/funcoder/omarchy-ambient",
    repo: "funcoder/omarchy-ambient",
    commit: "2686c861bff26bc7da55dd8e4e858f6d66d39a41",
  },
  "brown-noise": {
    title: "Brown Noise sound library",
    home: "https://github.com/RinvalAi/brown-noise-library",
    repo: "RinvalAi/brown-noise-library",
    commit: "21160674f9ad6e52597620a95675375382a1bd26",
  },
} as const;

const TRACK_SHA256: Record<RecordedTrack, string> = {
  "lovely-piano-song": "4c8e8fbda8f2e6cbfa22db6689faa4eb0fd1bb7f3163ade72aff37fdd0fb9388",
  "study-and-relax": "9cba2a3c2d1c9d364220db1691f618a0f25b8d9cf6f2a857fe389ef614fd18a4",
  "city-sunshine": "e05c1bd683174cff77d492b7ac77262ff4617f99f69d82564b66831cf48352d6",
  "the-drama": "ea747a7c490ac82f4396eaf709ba5eba03c9cc2929f48ddabd974c56a851b26b",
  "driving-concern": "35407f04ab4e982883a62b5bf559cace11404d979e3ebe59e404aef4e988832f",
  "epic-blockbuster-2": "092be72a6750f66979bea319a2d5b39731238da9e5e4118b70f2a00ae5e04fb7",
  "heroic-adventure": "41355a9625e8ee15d678c1c8c512636b6610a750f61b79820b53286a0dc3836a",
  "infinite-wonder": "490f745de87525dd6da563da266c8823804a3f787573ff317b4788d6d5566e54",
  "wisdom-in-the-sun": "07ac4ab1f6d54893615d48aeee8bb3f2e5c1f2d16c6385973c97b28ef83c7ee0",
  "nostalgic-piano": "5d932737a07dc1f0fadc713d188a059964bc156371e1569f5a6267dc39547865",
  "romantic-inspiration": "5d96bd468d1edde0370c2a1d18e9fc5f6b8f208668a772537b7f145ddff8c445",
};

async function download(pack: keyof typeof PACKS, path: string, sha256: string): Promise<string> {
  const { repo, commit } = PACKS[pack];
  const file = join(cacheDir(), "music-sources", commit, path);
  if (!existsSync(file)) {
    const url = `https://raw.githubusercontent.com/${repo}/${commit}/${path.split("/").map(encodeURIComponent).join("/")}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Download failed (${response.status}): ${path}`);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, Buffer.from(await response.arrayBuffer()));
  }
  const actual = createHash("sha256").update(await readFile(file)).digest("hex");
  if (actual !== sha256) throw new Error(`${path} isn't the file we checked (fingerprint ${actual})`);
  return file;
}

function run(ffmpeg: string, args: string[], input?: Buffer): Promise<{ out: Buffer; err: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpeg, args, { stdio: ["pipe", "pipe", "pipe"] });
    const chunks: Buffer[] = [];
    let err = "";
    child.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
    child.stderr.on("data", (chunk) => (err += chunk));
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? resolve({ out: Buffer.concat(chunks), err }) : reject(new Error(err))));
    child.stdin.end(input);
  });
}

const sha = async (file: string) => createHash("sha256").update(await readFile(file)).digest("hex");

/** Loudness (LUFS) and true peak (dBTP) of a file, from ffmpeg's EBU R128 meter. */
async function loudness(ffmpeg: string, file: string, filter = ""): Promise<{ lufs: number; peak: number }> {
  const { err } = await run(ffmpeg, ["-hide_banner", "-nostats", "-i", file, "-af", `${filter}ebur128=peak=true`, "-f", "null", "-"]);
  const summary = err.slice(err.lastIndexOf("Summary:"));
  return { lufs: Number(summary.match(/I:\s+(-?[\d.]+) LUFS/)![1]), peak: Number(summary.match(/Peak:\s+(-?[\d.]+) dBFS/)![1]) };
}

/**
 * Saves a track with one clean gain so it peaks at -1 dB: nothing compressed or
 * limited, so every piece keeps its own dynamics. Its loudness goes in the manifest,
 * and the film brings it to TRACK_LUFS in the mix, where nothing can clip.
 */
async function buildTrack(ffmpeg: string, id: RecordedTrack, out: string) {
  const source = await download("freepd", TRACKS[id].source, TRACK_SHA256[id]);
  // Skip any silence at the start, so the music begins with the film.
  const trim = "silenceremove=start_periods=1:start_threshold=-60dB";
  const before = await loudness(ffmpeg, source, `${trim},`);
  const gain = -1 - before.peak;
  await run(ffmpeg, ["-v", "error", "-y", "-i", source, "-af", `${trim},volume=${gain.toFixed(2)}dB`, "-ar", String(RATE), "-ac", "2", "-c:a", "libopus", "-b:a", "128k", out]);
  return { before, after: await loudness(ffmpeg, out) };
}

/** Cuts a seamless loop: the last few seconds of the stretch blend into its start. */
async function buildLoop(ffmpeg: string, recording: NatureRecording, out: string) {
  const source = await download(recording.pack, recording.path, recording.sha256);
  const seconds = LOOP_SECONDS + LOOP_BLEND_SECONDS;
  const raw = await run(ffmpeg, ["-v", "error", "-ss", String(recording.from), "-t", String(seconds), "-i", source, "-f", "f32le", "-ac", "2", "-ar", String(RATE), "-"]);
  const all = new Float32Array(raw.out.buffer, raw.out.byteOffset, raw.out.byteLength / 4);
  const frames = LOOP_SECONDS * RATE;
  const blend = LOOP_BLEND_SECONDS * RATE;
  if (all.length < (frames + blend) * 2) throw new Error(`${recording.path} is too short to loop from ${recording.from}s`);
  const loop = new Float32Array(frames * 2);
  let peak = 0;
  for (let i = 0; i < frames; i++) {
    // Equal-power blend: the tail fades out as the head fades in, so the level never dips.
    const head = i < blend ? Math.sin((Math.PI / 2) * (i / blend)) : 1;
    const tail = i < blend ? Math.cos((Math.PI / 2) * (i / blend)) : 0;
    for (const c of [0, 1]) {
      const v = all[i * 2 + c]! * head + (all[(frames + i) * 2 + c] ?? 0) * tail;
      loop[i * 2 + c] = v;
      peak = Math.max(peak, Math.abs(v));
    }
  }
  for (let i = 0; i < loop.length; i++) loop[i]! *= 0.89 / (peak || 1); // peak at -1 dB; films set the real level
  await run(ffmpeg, ["-v", "error", "-y", "-f", "f32le", "-ac", "2", "-ar", String(RATE), "-i", "-", "-c:a", "libopus", "-b:a", "96k", out], Buffer.from(loop.buffer));
}

const ffmpeg = findFfmpeg();

// --- Music -------------------------------------------------------------------------
const musicDir = join(root, "music");
await rm(musicDir, { recursive: true, force: true });
await mkdir(musicDir, { recursive: true });
const tracks: Record<string, { file: string; seconds: number; lufs: number; bytes: number; sha256: string }> = {};
for (const id of Object.keys(TRACKS) as RecordedTrack[]) {
  const file = `${id}.opus`;
  const out = join(musicDir, file);
  const { before, after } = await buildTrack(ffmpeg, id, out);
  // Its length, by decoding it at a low rate and counting.
  const decoded = await run(ffmpeg, ["-v", "error", "-i", out, "-f", "f32le", "-ac", "1", "-ar", "1000", "-"]);
  const seconds = decoded.out.byteLength / 4 / 1000;
  tracks[id] = { file, seconds: Math.round(seconds * 10) / 10, lufs: after.lufs, bytes: (await stat(out)).size, sha256: await sha(out) };
  console.log(`✓ ${id.padEnd(22)} ${String(tracks[id].seconds).padStart(5)}s  ${before.lufs.toFixed(1)} → ${after.lufs.toFixed(1)} LUFS, peak ${after.peak.toFixed(1)} dB  ${(tracks[id].bytes / 1e6).toFixed(1)} MB`);
}
await writeFile(join(musicDir, "manifest.json"), `${JSON.stringify({ source: `https://github.com/${PACKS.freepd.repo}/tree/${PACKS.freepd.commit}`, licence: "Public domain", tracks }, null, 2)}\n`);

const moodOf = (id: RecordedTrack) => Object.entries(MOOD_MUSIC).find(([, ids]) => ids.includes(id))![0];
await writeFile(
  join(musicDir, "CREDITS.md"),
  `# Music credits

These tracks come from [FreePD](https://freepd.com), a collection of new music released into the public domain by its composers.
FreePD was set up by Kevin MacLeod. Credit isn't required, but it's given gladly.

| Track | Mood | File |
| --- | --- | --- |
${(Object.keys(TRACKS) as RecordedTrack[]).map((id) => `| ${TRACKS[id].title} | ${moodOf(id)} | \`${id}.opus\` |`).join("\n")}

Built from a mirror of the FreePD collection, [\`${PACKS.freepd.repo}\`](https://github.com/${PACKS.freepd.repo}), at commit \`${PACKS.freepd.commit}\`, by \`scripts/build-music.ts\`.
Each file is checked against its fingerprint, given one clean gain so it peaks at -1 dB (nothing compressed, so each keeps its own dynamics) and saved as Opus.
Films bring every track to ${TRACK_LUFS} LUFS, the loudness of Bezel Film's own composed music, using the loudness recorded in \`manifest.json\`.

The tracks live in this repo but not in the npm package. Bezel Film downloads them once, from the release's own copy, and checks each one against \`manifest.json\`.
`,
);

// --- Nature --------------------------------------------------------------------------
const natureDir = join(root, "nature");
await rm(natureDir, { recursive: true, force: true });
await mkdir(natureDir, { recursive: true });
const recordings = Object.entries(NATURE_RECORDINGS).flatMap(([kind, list]) => list.map((r) => ({ kind, ...r })));
for (const recording of recordings) {
  const out = join(natureDir, `${recording.id}.opus`);
  await buildLoop(ffmpeg, recording, out);
  console.log(`✓ ${recording.id.padEnd(22)} ${LOOP_SECONDS}s loop  ${((await stat(out)).size / 1e6).toFixed(2)} MB`);
}
await writeFile(
  join(natureDir, "CREDITS.md"),
  `# Nature sound credits

Every sound here is a field recording released under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) or into the public domain.
Credit isn't required, but it's given gladly.

| Sound | Recording | Recordist | Licence | File |
| --- | --- | --- | --- | --- |
${recordings.map((r) => `| ${r.kind} | [${r.title}](${r.page}) | ${r.by} | ${r.licence} | \`${r.id}.opus\` |`).join("\n")}

The loops were cut from tidied copies of these recordings in two open-source projects, each checked against its fingerprint:

- [${PACKS.omarchy.title}](${PACKS.omarchy.home}) at commit \`${PACKS.omarchy.commit}\` (recordings from Freesound)
- [${PACKS["brown-noise"].title}](${PACKS["brown-noise"].home}) at commit \`${PACKS["brown-noise"].commit}\` (recordings from Wikimedia Commons, each licence checked there)

\`scripts/build-music.ts\` cuts each into a ${LOOP_SECONDS}-second loop whose last ${LOOP_BLEND_SECONDS} seconds blend into its start, and saves it as Opus.
`,
);
console.log(`✓ ${Object.keys(tracks).length} tracks in music/, ${recordings.length} loops in nature/`);
