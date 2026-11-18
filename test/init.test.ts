import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  AGENT_TARGETS,
  SECTION_END,
  SECTION_START,
  detectAgents,
  generatedPath,
  mergeSection,
  renderInstructions,
  sectionOf,
} from "../src/agents.js";
import { addIgnoreLines, packageNameFor } from "../src/init.js";
import { validateFilm } from "../src/spec/validate.js";
import { WELCOME_FILM } from "../src/welcome.js";

const section = `${SECTION_START}\nBezel Film instructions\n${SECTION_END}`;

describe("mergeSection", () => {
  it("creates the file when there isn't one", () => {
    expect(mergeSection(null, section)).toBe(`${section}\n`);
  });

  it("adds the section after the user's own text, leaving it untouched", () => {
    const merged = mergeSection("# My rules\n\nUse British spelling.\n", section);
    expect(merged).toBe(`# My rules\n\nUse British spelling.\n\n${section}\n`);
  });

  it("replaces only its own section on a second run", () => {
    const first = mergeSection("# Mine\n", `${SECTION_START}\nold\n${SECTION_END}`) + "\n## More of mine\n";
    const second = mergeSection(first, section);
    expect(second).toContain("# Mine");
    expect(second).toContain("## More of mine");
    expect(second).toContain("Bezel Film instructions");
    expect(second).not.toContain("old");
    expect(second.split(SECTION_START)).toHaveLength(2);
  });
});

describe("agent instructions", () => {
  it("are built for every agent, wrapped in markers", async () => {
    for (const target of AGENT_TARGETS) {
      const file = await readFile(generatedPath(target), "utf8");
      expect(sectionOf(file)).toContain("# Making a film with Bezel Film");
    }
  });

  it("keep frontmatter at the very top, where agents look for it", () => {
    const cursor = AGENT_TARGETS.find((target) => target.id === "cursor")!;
    expect(renderInstructions(cursor, "Hello").startsWith("---\ndescription:")).toBe(true);
  });

  it("fit within Windsurf's 6,000 character limit for a rule file", async () => {
    const windsurf = AGENT_TARGETS.find((target) => target.id === "windsurf")!;
    expect((await readFile(generatedPath(windsurf), "utf8")).length).toBeLessThan(6000);
  });
});

describe("detectAgents", () => {
  let dir: string;
  beforeEach(async () => (dir = await mkdtemp(join(tmpdir(), "detect-"))));
  afterEach(() => rm(dir, { recursive: true, force: true }));

  it("finds nothing in an empty folder", () => {
    expect(detectAgents(dir)).toEqual([]);
  });

  it("spots the agents a project already uses", async () => {
    await writeFile(join(dir, "CLAUDE.md"), "");
    await mkdir(join(dir, ".cursor"));
    await writeFile(join(dir, "AGENTS.md"), "");
    expect(detectAgents(dir)).toEqual(["claude", "codex", "cursor"]);
  });
});

describe("init helpers", () => {
  it("turns a folder name into a tidy package name", () => {
    expect(packageNameFor("My Films!")).toBe("my-films");
    expect(packageNameFor("???")).toBe("my-films");
  });

  it("adds missing .gitignore lines without repeating any", () => {
    const lines = ["# Bezel Film", "films/**/*.mp4", "voice-samples/"];
    const once = addIgnoreLines("node_modules/\n", lines);
    expect(once).toBe("node_modules/\n\n# Bezel Film\nfilms/**/*.mp4\nvoice-samples/\n");
    expect(addIgnoreLines(once, lines)).toBeNull();
  });

  it("ships a valid welcome film", () => {
    const result = validateFilm(WELCOME_FILM);
    expect(result.ok ? [] : result.errors).toEqual([]);
  });
});
