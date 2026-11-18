import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import * as p from "@clack/prompts";
import { AGENT_TARGETS, detectAgents, generatedPath, mergeSection, sectionOf, type AgentId } from "./agents.js";
import { validateFilm } from "./spec/validate.js";
import { WELCOME_FILM } from "./welcome.js";

/**
 * `bezel-film init`: everything a new user needs, in one step. Sets up the folder,
 * installs Bezel Film, adds instructions for their coding agent, does the one-time
 * downloads, and makes a welcome film so they see it work straight away.
 */

export interface InitOptions {
  /** The folder to set up. */
  cwd: string;
  /** Skip the questions and use the defaults (also the case when there's no terminal to ask in). */
  yes: boolean;
  /** Agents to add instructions for. Asked for, or detected, if left out. */
  agents?: AgentId[];
  /** Render the welcome film at the end. */
  sample: boolean;
  /** Install Bezel Film into the project. Off only for tests. */
  install: boolean;
  /** Do the one-time downloads. Off only for tests. */
  downloads: boolean;
}

const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const WELCOME_FOLDER = "films/welcome";
const IGNORE_LINES = ["# Bezel Film", "films/**/*.mp4", "voice-samples/"];

async function readText(path: string): Promise<string | null> {
  return existsSync(path) ? readFile(path, "utf8") : null;
}

/** A tidy package name from a folder name, e.g. "My Films!" becomes "my-films". */
export function packageNameFor(folder: string): string {
  return folder.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^[-._]+|[-._]+$/g, "") || "my-films";
}

/** Adds any missing lines to a .gitignore, keeping what's already there. */
export function addIgnoreLines(existing: string | null, lines: string[]): string | null {
  const have = new Set((existing ?? "").split(/\r?\n/).map((line) => line.trim()));
  const missing = lines.filter((line) => !have.has(line));
  if (!missing.length || missing.every((line) => line.startsWith("#"))) return null;
  const base = existing?.replace(/\s*$/, "") ?? "";
  return `${base ? `${base}\n\n` : ""}${missing.join("\n")}\n`;
}

/**
 * A spinner in a terminal. Without one (an agent or a script running `init --yes`),
 * a plain line when each step starts and ends, instead of hundreds of animation frames.
 */
function progress() {
  if (process.stdout.isTTY) return p.spinner();
  return {
    start: (message: string) => p.log.step(message),
    message: (_message: string) => {},
    stop: (message: string) => p.log.success(message),
  };
}

function run(command: string, args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const windows = process.platform === "win32";
    const child = spawn(windows ? `${command}.cmd` : command, args, {
      cwd,
      shell: windows,
      // The voice engine would otherwise fetch large GPU files on Linux that it never uses.
      env: { ...process.env, ONNXRUNTIME_NODE_INSTALL_CUDA: process.env.ONNXRUNTIME_NODE_INSTALL_CUDA ?? "skip" },
      stdio: ["ignore", "ignore", "pipe"],
    });
    let errors = "";
    child.stderr.on("data", (chunk) => (errors += chunk));
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(errors.trim().split("\n").slice(-8).join("\n")))));
  });
}

export async function init(options: InitOptions): Promise<number> {
  const { cwd } = options;
  const yes = options.yes || !process.stdin.isTTY;
  const version = (JSON.parse(await readFile(join(packageRoot, "package.json"), "utf8")) as { version: string }).version;
  const cancelled = () => {
    p.cancel("Setup stopped. Nothing else was changed.");
    return 1;
  };

  p.intro(`Bezel Film ${version} · let's get you set up`);

  // Which agents to write instructions for: asked, with the ones already in use ticked.
  const detected = detectAgents(cwd);
  let agents = options.agents;
  if (!agents) {
    if (yes) {
      agents = detected.length ? detected : ["codex"];
    } else {
      const picked = await p.multiselect<AgentId>({
        message: detected.length ? "Which coding agents do you use? (we've ticked the ones we found)" : "Which coding agents do you use?",
        options: AGENT_TARGETS.map((target) => ({ value: target.id, label: target.name, hint: target.file })),
        initialValues: detected,
        required: true,
      });
      if (p.isCancel(picked)) return cancelled();
      agents = picked;
    }
  }

  let sample = options.sample;
  if (sample && !yes) {
    const answer = await p.confirm({ message: "Make a short welcome film now, so you can see it work? (takes a minute or two)", initialValue: true });
    if (p.isCancel(answer)) return cancelled();
    sample = answer;
  }

  // 1. The project: create a minimal one in an empty folder, then install Bezel Film into it.
  const packageFile = join(cwd, "package.json");
  type Project = { name?: string; dependencies?: object; devDependencies?: object };
  let project = JSON.parse((await readText(packageFile)) ?? "null") as Project | null;
  if (!project) {
    project = { name: packageNameFor(basename(cwd)), version: "0.0.0", private: true, description: "Films made with Bezel Film" } as Project;
    await writeFile(packageFile, `${JSON.stringify(project, null, 2)}\n`);
    p.log.step("Created package.json for this folder");
  }
  const installed = project.name === "bezel-film" || [project.dependencies, project.devDependencies].some((deps) => deps && "bezel-film" in deps);
  if (options.install && !installed) {
    const spinner = progress();
    spinner.start("Installing Bezel Film into this folder");
    try {
      await run("npm", ["install", "--save-dev", process.env.BEZEL_FILM_INSTALL_SPEC ?? `bezel-film@^${version}`], cwd);
      spinner.stop("Installed Bezel Film");
    } catch (error) {
      spinner.stop("Couldn't install Bezel Film");
      p.log.error(error instanceof Error ? error.message : String(error));
      p.outro("Check your internet connection, then run `npx bezel-film init` again.");
      return 1;
    }
  } else if (installed) {
    p.log.step("Bezel Film is already installed here");
  }

  // 2. Instructions for each agent. Shared files only ever get their own marked section updated.
  for (const target of AGENT_TARGETS.filter((t) => agents.includes(t.id))) {
    const rendered = await readFile(join(packageRoot, generatedPath(target)), "utf8");
    const file = join(cwd, target.file);
    const existing = await readText(file);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, target.shared ? mergeSection(existing, sectionOf(rendered)) : rendered);
    const verb = !existing ? "Added" : target.shared && !existing.includes("bezel-film:start") ? "Added a Bezel Film section to" : "Updated";
    p.log.success(`${verb} ${target.file} for ${target.name}`);
  }

  // 3. Keep rendered videos out of git.
  const ignoreFile = join(cwd, ".gitignore");
  const ignore = addIgnoreLines(await readText(ignoreFile), IGNORE_LINES);
  if (ignore) {
    await writeFile(ignoreFile, ignore);
    p.log.step("Told git to skip rendered videos (.gitignore)");
  }

  // 4. The one-time downloads: a headless browser and the voice model.
  if (options.downloads) {
    const spinner = progress();
    spinner.start("Downloading the browser and voice (one time only, about 200 MB)");
    try {
      const { installBrowser } = await import("./render/browser.js");
      const { kokoroSpeaker } = await import("./render/voice.js");
      // Someone pointing Bezel Film at their own Chrome doesn't need another browser.
      if (!process.env.BEZEL_FILM_CHROME) await installBrowser((message) => spinner.message(message));
      const speaker = await kokoroSpeaker((message) => spinner.message(message));
      await speaker.dispose();
      spinner.stop("Downloaded the browser and voice. Everything now works offline.");
    } catch (error) {
      spinner.stop("Couldn't finish the downloads");
      p.log.error(error instanceof Error ? error.message : String(error));
      p.outro("Check your internet connection, then run `npx bezel-film setup` to try again.");
      return 1;
    }
  }

  // 5. The welcome film: always written, rendered if wanted.
  const filmFile = join(cwd, WELCOME_FOLDER, "film.json");
  if (!existsSync(filmFile)) {
    await mkdir(dirname(filmFile), { recursive: true });
    await writeFile(filmFile, `${JSON.stringify(WELCOME_FILM, null, 2)}\n`);
    p.log.step(`Added a sample film: ${relative(cwd, filmFile)}`);
  }
  const video = join(cwd, WELCOME_FOLDER, "film.mp4");
  let rendered = false;
  if (sample) {
    const result = validateFilm(JSON.parse(await readFile(filmFile, "utf8")));
    const spinner = progress();
    spinner.start("Making your welcome film");
    try {
      if (!result.ok) throw new Error(`The sample film has problems: ${result.errors.join("; ")}`);
      const { renderFilm } = await import("./render/index.js");
      await renderFilm(result.film, { output: video, baseDir: dirname(filmFile), onProgress: (message) => spinner.message(message) });
      spinner.stop(`Made your welcome film: ${relative(cwd, video)}`);
      rendered = true;
    } catch (error) {
      spinner.stop("Couldn't make the welcome film");
      p.log.warn(error instanceof Error ? error.message : String(error));
    }
  }

  // 6. What to do next.
  const firstAgent = AGENT_TARGETS.find((target) => agents.includes(target.id));
  const agentName = firstAgent?.id === "codex" ? "your coding agent" : (firstAgent?.name ?? "your coding agent");
  const watch = process.platform === "darwin" ? `open ${relative(cwd, video)}` : relative(cwd, video);
  p.note(
    [
      rendered ? `Watch your first film:\n  ${watch}\n` : "",
      `Make your own: open ${agentName} in this folder and say something like`,
      `  "Make a 45-second film about our 2026 sales, upbeat music, male voice"\n`,
      "Prefer to do it by hand? Copy films/welcome, edit its film.json, then run",
      "  npx bezel-film render films/<your-film>/film.json",
    ]
      .filter(Boolean)
      .join("\n"),
    "Next steps",
  );
  p.outro("Have fun making films!");
  return rendered || !sample ? 0 : 1;
}
