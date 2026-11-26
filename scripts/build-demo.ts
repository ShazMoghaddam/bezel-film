import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { findFfmpeg } from "../src/render/ffmpeg.js";
import { renderFilm } from "../src/render/index.js";
import { validateFilm } from "../src/spec/validate.js";

/**
 * Makes the README demo from the promo film in docs/promo, a film about Bezel Film made with
 * Bezel Film: docs/promo.mp4 (720p, with voice and music, small enough for the repo) and
 * docs/promo.gif (a short silent loop that plays inline on GitHub: the reveal and the styles).
 * Needs the voice, so run it after `npx bezel-film setup`: `npm run demo`.
 */
const root = fileURLToPath(new URL("..", import.meta.url));
const filmDir = join(root, "docs/promo");
const result = validateFilm(JSON.parse(await readFile(join(filmDir, "film.json"), "utf8")));
if (!result.ok) throw new Error(result.errors.join("\n"));

const work = await mkdtemp(join(tmpdir(), "bezel-film-demo-"));
const ffmpeg = findFfmpeg();
const run = (args: string[]) => {
  const out = spawnSync(ffmpeg, ["-v", "error", "-y", ...args], { encoding: "utf8" });
  if (out.status !== 0) throw new Error(out.stderr);
};

try {
  const full = join(work, "promo.mp4");
  console.log("Rendering the promo film…");
  await renderFilm(result.film, { output: full, baseDir: filmDir, onProgress: (message) => process.stdout.write(`\r  ${message.padEnd(60)}`) });
  process.stdout.write("\n");

  run(["-i", full, "-vf", "scale=1280:-2", "-c:v", "libx264", "-preset", "slow", "-crf", "26", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", join(root, "docs/promo.mp4")]);
  console.log("✓ docs/promo.mp4");

  // The GIF: 16 seconds from the reveal into the styles, small and smooth, with one palette
  // built for these colours.
  const clip = ["-ss", "8.5", "-t", "16"];
  const filters = "fps=12,scale=720:-1:flags=lanczos";
  const palette = join(work, "palette.png");
  run([...clip, "-i", full, "-vf", `${filters},palettegen=stats_mode=diff`, palette]);
  run([...clip, "-i", full, "-i", palette, "-lavfi", `${filters}[x];[x][1:v]paletteuse=dither=sierra2_4a`, join(root, "docs/promo.gif")]);
  console.log("✓ docs/promo.gif");
} finally {
  await rm(work, { recursive: true, force: true });
}
