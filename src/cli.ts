#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { estimateFilmSeconds, validateFilm } from "./spec/validate.js";

const HELP = `Bezel Film: make short films in code.

Usage
  bezel-film validate <film.json>   Check a film file and show a summary
  bezel-film render <film.json>     Render the film (coming in v0.1.0)
  bezel-film schema                 Print the film file's JSON Schema

Options
  -h, --help       Show this help
  -v, --version    Show the version
`;

const root = new URL("..", import.meta.url);

async function readJson(path: string | URL): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf8"));
}

async function loadFilmFile(path: string | undefined): Promise<unknown> {
  if (!path) throw new UsageError("Give the path to a film file, e.g. bezel-film validate film.json");
  try {
    return await readJson(path);
  } catch (error) {
    const reason = error instanceof SyntaxError ? `is not valid JSON (${error.message})` : "could not be read";
    throw new UsageError(`${path} ${reason}`);
  }
}

class UsageError extends Error {}

function formatSeconds(seconds: number): string {
  const total = Math.round(seconds);
  return total < 60 ? `${total}s` : `${Math.floor(total / 60)}m ${String(total % 60).padStart(2, "0")}s`;
}

async function validate(path: string | undefined): Promise<number> {
  const result = validateFilm(await loadFilmFile(path));
  if (!result.ok) {
    console.error(`✗ ${path} has ${result.errors.length} problem${result.errors.length === 1 ? "" : "s"}:`);
    for (const error of result.errors) console.error(`  • ${error}`);
    return 1;
  }
  const { film } = result;
  console.log(`✓ ${path} is a valid film`);
  console.log(`  "${film.title}" · ${film.style} · ${film.format.aspect} ${film.format.resolution} ${film.format.fps}fps`);
  console.log(`  ${film.scenes.length} scenes · about ${formatSeconds(estimateFilmSeconds(film))}`);
  return 0;
}

async function main(argv: string[]): Promise<number> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      help: { type: "boolean", short: "h" },
      version: { type: "boolean", short: "v" },
    },
  });

  if (values.version) {
    const pkg = (await readJson(new URL("package.json", root))) as { version: string };
    console.log(pkg.version);
    return 0;
  }

  const [command, file] = positionals;
  if (values.help || !command) {
    console.log(HELP);
    return values.help ? 0 : 1;
  }

  switch (command) {
    case "validate":
      return validate(file);
    case "render":
      console.error("Rendering is not built yet. It arrives in v0.1.0. For now, use `bezel-film validate`.");
      return 1;
    case "schema":
      console.log(JSON.stringify(await readJson(new URL("schema/film.schema.json", root)), null, 2));
      return 0;
    default:
      throw new UsageError(`Unknown command "${command}". Run bezel-film --help to see the commands.`);
  }
}

main(process.argv.slice(2)).then(
  (code) => process.exit(code),
  (error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(error instanceof UsageError ? 2 : 1);
  },
);
