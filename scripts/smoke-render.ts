import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { renderFilm, validateFilm } from "../src/index.js";
import { findFfmpeg } from "../src/render/ffmpeg.js";

/**
 * Renders a short film with every built-in scene type, and a custom scene with the kit's
 * pen and spring, and checks the video that comes out.
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
    { type: "custom", file: "scenes/smoke.js", props: { word: "Custom" }, duration: 1.5, sounds: [{ at: 0.3, sound: "pop" }] },
    { type: "outro", title: "Done", cta: "Ship it", duration: 1.2 },
  ],
});
if (!result.ok) throw new Error(result.errors.join("\n"));

// A custom scene: a word written in by the pen, a line drawn under it, and a dot on a spring.
const SCENE = `Bezel.scene((root, kit) => {
  const word = kit.el("div", { text: kit.props.word, style: { position: "absolute", left: kit.safe.x + "px", top: kit.safe.y + "px", font: "700 " + kit.u * 9 + "px " + kit.fonts.heading, color: kit.colours.text } }, root);
  const svg = kit.svg("svg", { viewBox: "0 0 100 10", width: kit.u * 40, height: kit.u * 4, style: "position:absolute;left:" + kit.safe.x + "px;top:" + (kit.safe.y + kit.u * 14) + "px" }, root);
  const line = kit.svg("path", { d: "M2 5 C 30 1, 70 9, 98 5", fill: "none", stroke: kit.colours.accent, "stroke-width": 3 }, svg);
  const dot = kit.el("div", { style: { position: "absolute", width: kit.u * 6 + "px", height: kit.u * 6 + "px", borderRadius: "50%", background: kit.colours.palette[1], left: kit.width / 2 + "px", top: kit.height / 2 + "px" } }, root);
  const plan = kit.drawing({ pen: true });
  plan.write(word, { at: 0.1, duration: 0.6 });
  plan.line(line, { at: 0.75, duration: 0.4 });
  return (t) => { plan.draw(t); dot.style.scale = String(kit.spring(t - 0.2)); };
});`;

const work = await mkdtemp(join(tmpdir(), "bezel-film-smoke-"));
try {
  await mkdir(join(work, "scenes"));
  await writeFile(join(work, "scenes", "smoke.js"), SCENE);
  const output = join(work, "smoke.mp4");
  const done = await renderFilm(result.film, { output, baseDir: work, onWarning: (message) => console.log(`! ${message}`) });
  const probe = spawnSync(findFfmpeg(), ["-v", "error", "-i", output, "-map", "0:v:0", "-c", "copy", "-f", "null", "-"], { encoding: "utf8" });
  if (probe.status !== 0) throw new Error(`The rendered video doesn't read back: ${probe.stderr}`);
  if (done.frames < 24 * 9) throw new Error(`Expected at least 216 frames, got ${done.frames}`);
  console.log(`✓ Rendered ${done.frames} frames (${done.seconds.toFixed(1)}s) and read the video back`);
} finally {
  await rm(work, { recursive: true, force: true });
}
