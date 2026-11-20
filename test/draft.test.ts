import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { validateFilm } from "../src/index.js";
import { draftFilm } from "../src/draft.js";
import { gatherFacts, plain, readChangelog, readReadme, shorten, type RepoFacts } from "../src/repo.js";

const require = createRequire(import.meta.url);

const README = `<p align="center"><img src="logo.png" alt="Logo"></p>

# Tidy

[![CI](https://img.shields.io/badge/ci-passing-green)](https://example.com) [![npm](https://img.shields.io/npm/v/tidy)](https://npm.im/tidy)

**Tidy** keeps your _spreadsheets_ clean, so you can trust the numbers in every report. :sparkles:

## Contents

- [Features](#features)
- [Install](#install)

## Features

- **Finds duplicates.** Spots rows that repeat, even with different spacing
- **Fixes dates**: reads 12 date formats and writes one
- Works offline 🚀
- Uses \`<tidy-table>\` for previews

## Install

\`\`\`bash
$ npm install tidy
\`\`\`

## Usage

\`\`\`js
import { tidy } from "tidy";
const clean = tidy(rows);
\`\`\`

## Roadmap

- [x] CSV support
- [x] Excel support
- [ ] Google Sheets
- [ ] A desktop app

## Licence

MIT
`;

const CHANGELOG = `# Changelog

## [Unreleased]

## [1.2.0] - 2026-09-14

Smarter date fixing for every locale.

## [1.1.0] - 2026-06-02

### Added

- Excel support

## [1.0.0] - 2026-01-20

The first release.
`;

describe("reading a README", () => {
  const facts = readReadme(README);

  it("takes the name from the top heading, not a logo or a section", () => {
    expect(facts.title).toBe("Tidy");
    expect(readReadme("<img src=x>\n\n## Install\n\nnpm i x").title).toBeUndefined();
  });

  it("skips badges to find the opening paragraph, in plain words", () => {
    expect(facts.intro).toBe("Tidy keeps your spreadsheets clean, so you can trust the numbers in every report.");
  });

  it("finds the features list, not the table of contents", () => {
    expect(facts.features).toEqual([
      "Finds duplicates. Spots rows that repeat, even with different spacing",
      "Fixes dates: reads 12 date formats and writes one",
      "Works offline",
      "Uses <tidy-table> for previews",
    ]);
  });

  it("finds the install command and a short code example", () => {
    expect(facts.install).toBe("npm install tidy");
    expect(facts.usage).toEqual({ language: "js", code: 'import { tidy } from "tidy";\nconst clean = tidy(rows);' });
  });

  it("leaves out a long code example rather than cutting it off", () => {
    const long = Array.from({ length: 30 }, (_, i) => `line(${i});`).join("\n");
    expect(readReadme(`# X\n\n## Usage\n\n\`\`\`js\n${long}\n\`\`\`\n`).usage).toBeUndefined();
  });

  it("reads a roadmap of ticked boxes", () => {
    expect(facts.roadmap.map((item) => [item.label, item.done])).toEqual([
      ["CSV support", true],
      ["Excel support", true],
      ["Google Sheets", false],
      ["A desktop app", false],
    ]);
  });

  it("reads a roadmap of versions marked as released", () => {
    const roadmap = readReadme("# X\n\n## Roadmap\n\n- **v1.0 (released):** the basics\n- **v2.0:** plugins\n- **v3.0 onwards:** more\n").roadmap;
    expect(roadmap).toEqual([
      { label: "The basics", when: "v1.0", done: true },
      { label: "Plugins", when: "v2.0", done: false },
      { label: "More", when: "v3.0 onwards", done: false },
    ]);
  });
});

describe("reading a changelog", () => {
  it("lists releases oldest first, with a summary each, skipping Unreleased", () => {
    expect(readChangelog(CHANGELOG)).toEqual([
      { version: "1.0.0", date: "2026-01-20", summary: "The first release." },
      { version: "1.1.0", date: "2026-06-02", summary: "Excel support" },
      { version: "1.2.0", date: "2026-09-14", summary: "Smarter date fixing for every locale." },
    ]);
  });
});

describe("plain text", () => {
  it("strips markdown, HTML and emoji but keeps code", () => {
    expect(plain("**Bold** [link](https://x.y) ![img](a.png) <b>tag</b> `<my-tag>` 🚀 :tada: done")).toBe("Bold link tag <my-tag> done");
  });

  it("cuts long text at a natural break, never mid-word", () => {
    expect(shorten("Sound effects: real recordings that land with the movement", 40)).toBe("Sound effects");
    expect(shorten("short", 40)).toBe("short");
    expect(shorten("one two three four five six seven", 20)).toBe("one two three four…");
  });
});

describe("gathering facts", () => {
  async function project(files: Record<string, string>) {
    const folder = await mkdtemp(join(tmpdir(), "bezel-draft-"));
    for (const [name, text] of Object.entries(files)) {
      await mkdir(join(folder, name, ".."), { recursive: true });
      await writeFile(join(folder, name), text);
    }
    return folder;
  }

  it("reads a folder: README, package.json, changelog and git remote", async () => {
    const folder = await project({
      "README.md": README,
      "package.json": JSON.stringify({ name: "@acme/tidy", description: "Clean spreadsheets", version: "1.2.0", license: "MIT" }),
      "CHANGELOG.md": CHANGELOG,
      ".git/config": '[remote "origin"]\n\turl = git@github.com:acme/tidy.git\n',
    });
    const facts = await gatherFacts(folder);
    expect(facts).toMatchObject({ name: "Tidy", tagline: "Clean spreadsheets", version: "1.2.0", license: "MIT", url: "https://github.com/acme/tidy" });
    expect(facts.releases).toHaveLength(3);
    expect(facts.sources).toEqual(["README.md", "package.json", "CHANGELOG.md"]);
  });

  it("reads a Python project's pyproject.toml", async () => {
    const folder = await project({
      "README.md": "# Tally\n\nCounts things quickly and carefully.\n",
      "pyproject.toml": '[project]\nname = "tally"\ndescription = "Count things"\nversion = "0.3.1"\nlicense = { text = "MIT" }\n\n[project.urls]\nRepository = "https://github.com/acme/tally"\n',
    });
    expect(await gatherFacts(folder)).toMatchObject({ name: "Tally", tagline: "Count things", version: "0.3.1", license: "MIT", url: "https://github.com/acme/tally" });
  });

  it("falls back to the package name when the README has no top heading", async () => {
    const folder = await project({ "README.md": "<img src=logo.png>\n\nA small tool that does one thing well.\n", "package.json": '{"name":"@acme/widget"}' });
    expect((await gatherFacts(folder)).name).toBe("widget");
  });

  it("says clearly when there's nothing to draft from", async () => {
    await expect(gatherFacts(await project({ "notes.txt": "hi" }))).rejects.toThrow(/no README/);
    await expect(gatherFacts("./no/such/folder")).rejects.toThrow(/Couldn't find/);
  });
});

describe("drafting a film", () => {
  const facts: RepoFacts = {
    name: "Tidy",
    tagline: "Clean spreadsheets",
    intro: "Tidy keeps your spreadsheets clean, so you can trust the numbers in every report.",
    features: readReadme(README).features,
    install: "npm install tidy",
    usage: { language: "js", code: "tidy(rows)" },
    releases: readChangelog(CHANGELOG),
    roadmap: readReadme(README).roadmap,
    license: "MIT",
    stars: 1234,
    url: "https://github.com/acme/tidy",
    sources: [],
  };

  it("makes a valid film with a scene for each kind of fact", () => {
    const film = draftFilm(facts);
    const result = validateFilm(film);
    expect(result.ok).toBe(true);
    expect(film.scenes.map((s) => s.type)).toEqual(["title", "points", "code", "timeline", "roadmap", "stat", "outro"]);
  });

  it("keeps points short, using each feature's lead-in", () => {
    const points = draftFilm(facts).scenes.find((s) => s.type === "points") as { points: string[] };
    expect(points.points).toEqual(["Finds duplicates", "Fixes dates", "Works offline", "Uses <tidy-table> for previews"]);
  });

  it("writes narration to be spoken", () => {
    const film = draftFilm(facts);
    const say = (id: string) => film.scenes.find((s) => s.id === id)!.narration;
    expect(say("intro")).toBe("Meet Tidy. Tidy keeps your spreadsheets clean, so you can trust the numbers in every report.");
    expect(say("features")).toBe("Here's what you get: finds duplicates, fixes dates and works offline.");
    expect(say("so-far")).toBe("The first release, version 1.0, came out in January 2026. There have been 2 more since, and the latest is version 1.2.");
    expect(say("next")).toBe("Coming next: Google Sheets and a desktop app.");
    expect(say("outro")).toBe("Try Tidy today. It's free and open source. Find it on GitHub.");
  });

  it("leaves out scenes it has nothing for", () => {
    const film = draftFilm({ name: "Bare", features: [], releases: [], roadmap: [], sources: [] });
    expect(validateFilm(film).ok).toBe(true);
    expect(film.scenes.map((s) => s.type)).toEqual(["title", "outro"]);
  });

  it("keeps everything within the spec's limits, however long the README", () => {
    const long = "word ".repeat(300);
    const film = draftFilm({
      ...facts,
      name: long,
      tagline: long,
      intro: long,
      features: Array(10).fill(long),
      releases: Array.from({ length: 12 }, (_, i) => ({ version: `1.${i}.0`, date: "2026-01-01", summary: long })),
      roadmap: [{ label: long, done: true }, { label: long, when: long, done: false }],
    });
    const result = validateFilm(film);
    expect(result.ok ? [] : result.errors).toEqual([]);
  });

  it("sets the platform when asked", () => {
    expect(draftFilm(facts, { preset: "tiktok" }).format).toEqual({ preset: "tiktok" });
  });
});

describe("bezel-film draft", () => {
  const cli = (args: string[], cwd: string) =>
    // tsx by its full path, since the command runs in a temporary folder of its own.
    spawnSync(process.execPath, ["--import", pathToFileURL(require.resolve("tsx")).href, join(process.cwd(), "src/cli.ts"), ...args], { cwd, encoding: "utf8" });

  it("writes a valid film, and never overwrites one", async () => {
    const folder = await mkdtemp(join(tmpdir(), "bezel-draft-cli-"));
    await writeFile(join(folder, "README.md"), README);
    const first = cli(["draft", "."], folder);
    expect(first.status).toBe(0);
    expect(first.stdout).toContain("Drafted film.json: a film about Tidy");
    expect(validateFilm(JSON.parse(await readFile(join(folder, "film.json"), "utf8"))).ok).toBe(true);

    const again = cli(["draft", "."], folder);
    expect(again.status).toBe(2);
    expect(again.stderr).toContain("film.json already exists");
  }, 30_000);
});
