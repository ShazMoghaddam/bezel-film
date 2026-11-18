import { spawnSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { findFfmpeg } from "../src/render/ffmpeg.js";
import { renderFilm } from "../src/render/index.js";
import { validateFilm } from "../src/spec/validate.js";
import { WELCOME_FILM } from "../src/welcome.js";

/**
 * Makes the README demo from the welcome film: docs/welcome.mp4 (720p, with voice and
 * music, small enough for the repo) and docs/welcome.gif (a short silent loop that plays
 * inline on GitHub). Needs the voice, so run it after `npx bezel-film setup`: `npm run demo`.
 */
const root = fileURLToPath(new URL("..", import.meta.url));
const result = validateFilm(WELCOME_FILM);
if (!result.ok) throw new Error(result.errors.join("\n"));

const work = await mkdtemp(join(tmpdir(), "bezel-film-demo-"));
const ffmpeg = findFfmpeg();
const run = (args: string[]) => {
  const out = spawnSync(ffmpeg, ["-v", "error", "-y", ...args], { encoding: "utf8" });
  if (out.status !== 0) throw new Error(out.stderr);
};

try {
  const full = join(work, "welcome.mp4");
  console.log("Rendering the welcome film…");
  await renderFilm(result.film, { output: full, onProgress: (message) => process.stdout.write(`\r  ${message.padEnd(60)}`) });
  process.stdout.write("\n");

  run(["-i", full, "-vf", "scale=1280:-2", "-c:v", "libx264", "-preset", "slow", "-crf", "26", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", join(root, "docs/welcome.mp4")]);
  console.log("✓ docs/welcome.mp4");

  // The GIF: the first 14 seconds, small and smooth, with one palette built for these colours.
  const filters = "fps=12,scale=720:-1:flags=lanczos";
  const palette = join(work, "palette.png");
  run(["-t", "14", "-i", full, "-vf", `${filters},palettegen=stats_mode=diff`, palette]);
  run(["-t", "14", "-i", full, "-i", palette, "-lavfi", `${filters}[x];[x][1:v]paletteuse=dither=sierra2_4a`, join(root, "docs/welcome.gif")]);
  console.log("✓ docs/welcome.gif");
} finally {
  await rm(work, { recursive: true, force: true });
}
