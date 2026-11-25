import { spawn } from "node:child_process";
import { readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Checks every example film made with custom scenes in every shape a film can take:
 * 16:9, TikTok (9:16 with its buttons and caption), LinkedIn mobile (4:5) and square.
 * It runs `preview` for each and fails if any scene breaks its checks in any shape.
 * It takes a while (around 15 minutes), so run it before a release, not on every push.
 * Run with `npm run example:shapes`, or name films to check just those.
 */

const SHAPES = [
  { name: "16:9", args: [] as string[] },
  { name: "TikTok", args: ["--for", "tiktok"] },
  { name: "4:5", args: ["--for", "linkedin-mobile"] },
  { name: "square", args: ["--for", "linkedin-square"] },
];

const only = process.argv.slice(2);
const films: string[] = [];
for (const dir of (await readdir("examples", { withFileTypes: true })).filter((d) => d.isDirectory())) {
  if (only.length && !only.includes(dir.name)) continue;
  const file = join("examples", dir.name, "film.json");
  const film = JSON.parse(await readFile(file, "utf8").catch(() => "{}")) as { scenes?: { type?: string }[] };
  if (film.scenes?.some((scene) => scene.type === "custom")) films.push(dir.name);
}

/** Runs one preview and returns what it found: warnings start with "!", errors with "✗". */
function preview(film: string, args: string[]): Promise<string[]> {
  const out = join(tmpdir(), `bezel-shapes-${film}-${args.join("-") || "wide"}`);
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ["--import", "tsx", "src/cli.ts", "preview", join("examples", film, "film.json"), ...args, "-o", out]);
    let text = "";
    child.stdout.on("data", (chunk) => (text += chunk));
    child.stderr.on("data", (chunk) => (text += chunk));
    child.on("close", async (code) => {
      await rm(out, { recursive: true, force: true });
      const warnings = text.split("\n").filter((line) => /^\s*[!✗] /.test(line));
      resolve(code === 0 || warnings.length ? warnings.map((w) => w.trim()) : [`preview failed:\n${text}`]);
    });
  });
}

let problems = 0;
const jobs = films.flatMap((film) => SHAPES.map((shape) => ({ film, shape })));
// Three previews at a time: each runs its own browser.
const queue = [...jobs];
await Promise.all(Array.from({ length: 3 }, async () => {
  for (let job = queue.shift(); job; job = queue.shift()) {
    const warnings = await preview(job.film, job.shape.args);
    problems += warnings.length;
    console.log(`${warnings.length ? "✗" : "✓"} ${job.film} (${job.shape.name})${warnings.length ? "\n  " + warnings.join("\n  ") : ""}`);
  }
}));

console.log(problems ? `\n${problems} problem${problems === 1 ? "" : "s"} across ${films.length} films.` : `\nAll ${films.length} films pass in every shape.`);
process.exit(problems ? 1 : 0);
