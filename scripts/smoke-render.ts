import { spawnSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { renderFilm, validateFilm } from "../src/index.js";
import { findFfmpeg } from "../src/render/ffmpeg.js";

/**
 * Renders a short film with every built-in scene type and checks the video that comes out.
 * The voice is off, so it runs without downloading the voice model. CI runs this.
 */
const result = validateFilm({
  spec: 1,
  title: "Smoke test",
  style: "data-story",
  format: { fps: 24 },
  voice: { engine: "none" },
  music: { mood: "epic" },
  scenes: [
    { type: "title", title: "Smoke test", subtitle: "Every scene type", duration: 1.2 },
    { type: "stat", value: "48,210", label: "cups", context: "up 22%", duration: 1.2 },
    { type: "chart", chart: { type: "bars", values: [3, 5, 8], labels: ["A", "B", "C"], heading: "Bars" }, duration: 1.2 },
    { type: "chart", chart: { type: "donut", values: [50, 30, 20], labels: ["A", "B", "C"] }, duration: 1.2 },
    { type: "points", heading: "Points", points: ["One", "Two"], narration: "One and two." },
    { type: "code", language: "ts", code: "const answer = 42;", highlight: [1], duration: 1.2 },
    { type: "quote", quote: "It works.", attribution: "CI", duration: 1.2 },
    { type: "outro", title: "Done", cta: "Ship it", duration: 1.2 },
  ],
});
if (!result.ok) throw new Error(result.errors.join("\n"));

const work = await mkdtemp(join(tmpdir(), "bezel-film-smoke-"));
try {
  const output = join(work, "smoke.mp4");
  const done = await renderFilm(result.film, { output });
  const probe = spawnSync(findFfmpeg(), ["-v", "error", "-i", output, "-map", "0:v:0", "-c", "copy", "-f", "null", "-"], { encoding: "utf8" });
  if (probe.status !== 0) throw new Error(`The rendered video doesn't read back: ${probe.stderr}`);
  if (done.frames < 24 * 8) throw new Error(`Expected at least 192 frames, got ${done.frames}`);
  console.log(`✓ Rendered ${done.frames} frames (${done.seconds.toFixed(1)}s) and read the video back`);
} finally {
  await rm(work, { recursive: true, force: true });
}
