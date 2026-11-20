/**
 * Recorded music: public-domain tracks from FreePD, picked by ear for each mood.
 *
 * Each mood has a few options. Some moods keep Bezel Film's own composed music as one
 * of them; the rest are recordings only. A film gets one option, picked from its
 * title, or the one it asks for with `music.track`.
 *
 * The tracks are too big to ship in the npm package (about 29 MB together), so they
 * download once, during `bezel-film setup` or the first time a film needs one, into
 * the same cache as the voice model. Each download is checked against its fingerprint.
 * In a clone of the repo they're read straight from music/.
 */
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { MusicMood, MusicTrack } from "../spec/schema.js";
import { seededRandom } from "./music.js";
import { packageRoot } from "./style.js";
import { cacheDir, type Progress } from "./voice.js";

export interface TrackInfo {
  title: string;
  /** Where it was found: a file in the FreePD collection mirrored by SoundSafari. */
  source: string;
}

export const TRACKS: Record<Exclude<MusicTrack, "composed">, TrackInfo> = {
  "lovely-piano-song": { title: "Lovely Piano Song", source: "freepd.com/Lovely Piano Song.mp3" },
  "study-and-relax": { title: "Study and Relax", source: "freepd.com/Study and Relax.mp3" },
  "city-sunshine": { title: "City Sunshine", source: "freepd.com/City Sunshine.mp3" },
  "the-drama": { title: "The Drama", source: "freepd.com/The Drama.mp3" },
  "driving-concern": { title: "Driving Concern", source: "freepd.com/Driving Concern.mp3" },
  "epic-blockbuster-2": { title: "Epic Blockbuster 2", source: "freepd.com/Epic Blockbuster 2.mp3" },
  "heroic-adventure": { title: "Heroic Adventure", source: "freepd.com/Heroic Adventure.mp3" },
  "infinite-wonder": { title: "Infinite Wonder", source: "freepd.com/Infinite Wonder.mp3" },
  "wisdom-in-the-sun": { title: "Wisdom in the Sun", source: "freepd.com/Wisdom in the Sun.mp3" },
  "nostalgic-piano": { title: "Nostalgic Piano", source: "freepd.com/Nostalgic Piano.mp3" },
  "romantic-inspiration": { title: "Romantic Inspiration", source: "freepd.com/Romantic Inspiration.mp3" },
};

export type RecordedTrack = keyof typeof TRACKS;

/** Every track plays at this loudness, the same as Bezel Film's own composed music. */
export const TRACK_LUFS = -12;

/** The gain that brings a track to TRACK_LUFS, from the loudness measured when it was built. */
export async function trackGain(id: RecordedTrack): Promise<number> {
  return 10 ** ((TRACK_LUFS - (await trackManifest()).tracks[id].lufs) / 20);
}

/** The music each mood can have. "composed" is Bezel Film's own music, written for the film. */
export const MOOD_MUSIC: Record<MusicMood, MusicTrack[]> = {
  calm: ["composed", "lovely-piano-song", "study-and-relax"],
  upbeat: ["composed", "city-sunshine"],
  dramatic: ["the-drama", "driving-concern"],
  epic: ["composed", "epic-blockbuster-2", "heroic-adventure"],
  ambient: ["infinite-wonder", "wisdom-in-the-sun"],
  reflective: ["composed", "nostalgic-piano", "romantic-inspiration"],
};

/** The music a film gets: the track it asks for, or one of its mood's options, picked from its title. */
export function pickTrack(seed: string, mood: MusicMood, track?: MusicTrack): MusicTrack {
  if (track) return track;
  const options = MOOD_MUSIC[mood];
  return options[Math.floor(seededRandom(`${seed}:track`)() * options.length)]!;
}

/** What music/manifest.json records about each built track. */
interface Manifest {
  tracks: Record<RecordedTrack, { file: string; seconds: number; lufs: number; bytes: number; sha256: string }>;
}

let manifest: Promise<Manifest> | undefined;
export function trackManifest(): Promise<Manifest> {
  manifest ??= readFile(new URL("music/manifest.json", packageRoot), "utf8").then((text) => JSON.parse(text) as Manifest);
  return manifest;
}

async function packageVersion(): Promise<string> {
  return (JSON.parse(await readFile(new URL("package.json", packageRoot), "utf8")) as { version: string }).version;
}

/** Where the tracks are downloaded from: this release's own copy in the GitHub repo. */
export async function trackUrl(file: string): Promise<string> {
  return `https://raw.githubusercontent.com/ShazMoghaddam/bezel-film/v${await packageVersion()}/music/${file}`;
}

/**
 * The path to a track, downloading it first if needed. In a clone of the repo the
 * track is already in music/; otherwise it comes from the cache, or is downloaded once.
 */
export async function trackFile(id: RecordedTrack, onProgress?: Progress): Promise<string> {
  const entry = (await trackManifest()).tracks[id];
  const local = fileURLToPath(new URL(`music/${entry.file}`, packageRoot));
  if (existsSync(local)) return local;

  const cached = join(cacheDir(), "music", entry.sha256.slice(0, 16), entry.file);
  if (existsSync(cached)) return cached;

  onProgress?.(`Downloading the music "${TRACKS[id].title}" (one time only)`);
  const response = await fetch(await trackUrl(entry.file));
  if (!response.ok) throw new Error(`Couldn't download the music "${TRACKS[id].title}" (${response.status})`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  if (sha256 !== entry.sha256) throw new Error(`The music "${TRACKS[id].title}" didn't download correctly. Please try again.`);
  await mkdir(dirname(cached), { recursive: true });
  // Write then rename, so a cut-off download never leaves half a file behind.
  await writeFile(`${cached}.part`, bytes);
  await rename(`${cached}.part`, cached);
  return cached;
}

/** Downloads every track now, so films work offline later. Used by setup. */
export async function downloadTracks(onProgress?: Progress): Promise<void> {
  const ids = Object.keys(TRACKS) as RecordedTrack[];
  for (const [i, id] of ids.entries()) {
    await trackFile(id, (message) => onProgress?.(`${message} (${i + 1} of ${ids.length})`));
  }
}
