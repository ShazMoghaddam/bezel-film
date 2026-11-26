import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { findFfmpeg } from "../src/render/ffmpeg.js";
import { SOUNDS, type SoundName } from "../src/render/sfx.js";
import { cacheDir } from "../src/render/voice.js";

/**
 * Builds the sound effects in sounds/ from recorded CC0 sound packs, each pinned to
 * one commit and checked against a fingerprint, so they never change underneath us.
 *
 * For each sound it trims the silence at the start and end, fades the tail, sets the
 * peak just under full scale (the film sets each sound's real level in sfx.ts), and
 * saves it as FLAC: lossless, so a click keeps its sharp start, and still tiny.
 * Run with `npm run sounds`. Only maintainers need to run it; the result is committed.
 */

const root = fileURLToPath(new URL("..", import.meta.url));
const OUT = join(root, "sounds");
const RATE = 44_100;

const PACKS = {
  kenney: {
    title: "Interface Sounds",
    by: "Kenney",
    home: "https://kenney.nl/assets/interface-sounds",
    repo: "Calinou/kenney-interface-sounds",
    commit: "4596a49eaf5a533948d49a47467f606bcdea70ff",
    note: "mirrored unchanged by Hugo Locurcio (Calinou)",
  },
  superpowers: {
    title: "Superpowers Asset Packs",
    by: "Sparklin Labs",
    home: "https://github.com/sparklinlabs/superpowers-asset-packs",
    repo: "sparklinlabs/superpowers-asset-packs",
    commit: "e8674a03ab4456802f71f848c4df79eccca23f7a",
  },
  swishes: {
    title: "Swishes Sound Pack",
    by: "artisticdude",
    home: "https://opengameart.org/content/swishes-sound-pack",
    repo: "GrindForgeGames/lost-ticket-godot",
    commit: "2ec460cd1e85a2870238b1c1a00e115e769060be",
    note: "an unchanged copy; its fingerprint matches other copies of the pack",
  },
  chalk: {
    title: "Write/Draw with chalk on board",
    by: "Breviceps",
    home: "https://freesound.org/people/Breviceps/sounds/447925/",
    repo: "soumatheusgomes/editonny",
    commit: "49714f2fba6eafb76b903376e1fe9f50b685506a",
    note: "a trimmed copy kept in its sound effects library, credited to the original",
  },
} as const;

const SOURCES: Record<SoundName, { pack: keyof typeof PACKS; path: string; sha256: string }> = {
  whoosh: { pack: "superpowers", path: "western-fps-2d/sounds/woosh-3.ogg", sha256: "1bc59e29c4145a83d6ddc7b625db8082b46b15735ab173c6900c824418971ae8" },
  sweep: { pack: "superpowers", path: "medieval-fantasy/sounds/woosh-1.wav", sha256: "b4d339ca7703a039f52a7ad553662a4eed17a2ddbf8ac7e42440a6a7c458affc" },
  swish: { pack: "swishes", path: "sounds/sfx/swishes/swish-9.wav", sha256: "123883f006ce55feecbff11eea5f87c4493df4399989983037144570a23723c1" },
  tap: { pack: "kenney", path: "addons/kenney_interface_sounds/select_006.wav", sha256: "f62c605bdea38edd8b1a88e9806d96ac19df43ccfedcc0f424ed156c455341e1" },
  pop: { pack: "kenney", path: "addons/kenney_interface_sounds/drop_004.wav", sha256: "8bec0bc73a2536c81467790f41529a0c335b3915baa2caf3d248b6ebacce93a2" },
  click: { pack: "kenney", path: "addons/kenney_interface_sounds/click_005.wav", sha256: "d6006cd60538f3e02d9d2980bff5fb73481b9d5abf1145761739e09baec640ee" },
  tick: { pack: "kenney", path: "addons/kenney_interface_sounds/click_003.wav", sha256: "b035afe3fe08b0fd3517c612bdfd362799bffe762d2cbf8f09e6a50322067358" },
  ding: { pack: "kenney", path: "addons/kenney_interface_sounds/confirmation_002.wav", sha256: "b23339f3fdcd9f54520ca73caa3a9ae93ecfb3675acdaf1468990feb5d55d5fa" },
  chalk: { pack: "chalk", path: "skills/editonny/visuals/library/effects/chalk/chalk-1.wav", sha256: "00ffcd8d55aef94ed1ffb4e89b77a770fbc8d0c822301ae273758f41be95e037" },
};

async function download(name: SoundName): Promise<string> {
  const source = SOURCES[name];
  const pack = PACKS[source.pack];
  const file = join(cacheDir(), "sounds", pack.commit, source.path);
  if (!existsSync(file)) {
    const response = await fetch(`https://raw.githubusercontent.com/${pack.repo}/${pack.commit}/${source.path}`);
    if (!response.ok) throw new Error(`Download failed (${response.status}): ${source.path}`);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, Buffer.from(await response.arrayBuffer()));
  }
  const sha256 = createHash("sha256").update(await readFile(file)).digest("hex");
  if (sha256 !== source.sha256) throw new Error(`${source.path} isn't the file we checked (fingerprint ${sha256})`);
  return file;
}

function run(ffmpeg: string, args: string[], input?: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpeg, args, { stdio: ["pipe", "pipe", "pipe"] });
    const chunks: Buffer[] = [];
    let errors = "";
    child.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
    child.stderr.on("data", (chunk) => (errors += chunk));
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? resolve(Buffer.concat(chunks)) : reject(new Error(errors))));
    child.stdin.end(input);
  });
}

/** Decodes any audio file to interleaved stereo floats at 44.1 kHz. */
async function decode(ffmpeg: string, file: string): Promise<Float32Array> {
  const raw = await run(ffmpeg, ["-v", "error", "-i", file, "-f", "f32le", "-ac", "2", "-ar", String(RATE), "-"]);
  return new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
}

/** Trims silence at both ends, fades the tail, and peaks just under full scale. */
function shape(stereo: Float32Array): Float32Array {
  const frames = stereo.length / 2;
  const level = (i: number) => Math.max(Math.abs(stereo[i * 2]!), Math.abs(stereo[i * 2 + 1]!));
  let peak = 0;
  for (let i = 0; i < frames; i++) peak = Math.max(peak, level(i));
  let first = 0;
  while (first < frames && level(first) < peak * 0.003) first++;
  let last = frames - 1;
  while (last > first && level(last) < peak * 0.001) last--;
  // Keep 1 ms before the sound so its very start survives, and a short tail to fade.
  first = Math.max(0, first - Math.round(0.001 * RATE));
  last = Math.min(frames - 1, last + Math.round(0.02 * RATE));
  const length = last - first + 1;
  const fade = Math.min(length, Math.round(0.02 * RATE));
  const gain = 0.89 / peak; // -1 dB
  const out = new Float32Array(length * 2);
  for (let i = 0; i < length; i++) {
    const g = gain * (i > length - fade ? Math.sin((Math.PI / 2) * ((length - i) / fade)) : 1);
    out[i * 2] = stereo[(first + i) * 2]! * g;
    out[i * 2 + 1] = stereo[(first + i) * 2 + 1]! * g;
  }
  return out;
}

const ffmpeg = findFfmpeg();
await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

for (const name of SOUNDS) {
  const shaped = shape(await decode(ffmpeg, await download(name)));
  await run(ffmpeg, ["-v", "error", "-y", "-f", "f32le", "-ac", "2", "-ar", String(RATE), "-i", "-", "-c:a", "flac", "-sample_fmt", "s32", "-bits_per_raw_sample", "24", join(OUT, `${name}.flac`)], Buffer.from(shaped.buffer));
  console.log(`✓ ${name.padEnd(6)} ${(shaped.length / 2 / RATE).toFixed(2)}s  ${SOURCES[name].path}`);
}

const rows = SOUNDS.map((name) => {
  const { pack, path } = SOURCES[name];
  return `| \`${name}.flac\` | ${PACKS[pack].title} by ${PACKS[pack].by} | \`${path.split("/").at(-1)}\` |`;
});
const packs = Object.values(PACKS).map(
  (pack) => `- **[${pack.title}](${pack.home})** by ${pack.by}. Built from [\`${pack.repo}\`](https://github.com/${pack.repo}) at commit \`${pack.commit}\`${"note" in pack ? `, ${pack.note}` : ""}.`,
);
await writeFile(
  join(OUT, "CREDITS.md"),
  `# Sound effect credits

Every sound here is a recording released under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) (public domain).
Credit isn't required, but it's given gladly.

| Sound | From | Original file |
| --- | --- | --- |
${rows.join("\n")}

${packs.join("\n")}

Each file is checked against its fingerprint, then trimmed, faded and levelled by \`scripts/build-sounds.ts\`, and saved as lossless FLAC.
`,
);
console.log(`✓ ${SOUNDS.length} sounds and CREDITS.md in sounds/`);
