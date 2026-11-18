import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { writeOrCheck } from "./write-or-check.js";

/**
 * Builds each coding agent's instruction file from one source: agents/instructions.md.
 * Edit the source, run `npm run agents`, and every agent gets the same guidance.
 *
 * Output goes to agents/generated/<agent>/, laid out exactly as it should sit in a
 * user's project, so a future `bezel-film init` can copy it straight across.
 */
const root = fileURLToPath(new URL("..", import.meta.url));
const source = (await readFile(`${root}agents/instructions.md`, "utf8")).trim();

const DESCRIPTION =
  "Make short narrated films from a repo, README or dataset with Bezel Film. Use when the user asks for a video, film, explainer, promo or data story.";
const NOTICE = "<!-- Generated from agents/instructions.md by `npm run agents`. Edit that file, not this one. -->";

interface Target {
  /** Who reads this file. */
  agents: string;
  /** Path inside agents/generated/. */
  path: string;
  /** Lines that must sit at the very top (frontmatter), if the agent needs any. */
  frontmatter?: string[];
}

const targets: Target[] = [
  {
    agents: "Claude Code",
    path: "claude/.claude/skills/bezel-film/SKILL.md",
    frontmatter: ["name: bezel-film", `description: ${DESCRIPTION}`],
  },
  { agents: "OpenAI Codex, and any agent that reads AGENTS.md", path: "agents-md/AGENTS.md" },
  { agents: "Gemini CLI", path: "gemini/GEMINI.md" },
  {
    agents: "Cursor",
    path: "cursor/.cursor/rules/bezel-film.mdc",
    frontmatter: [`description: ${DESCRIPTION}`, "globs: film.json", "alwaysApply: false"],
  },
  { agents: "GitHub Copilot", path: "copilot/.github/copilot-instructions.md" },
  {
    agents: "Windsurf",
    path: "windsurf/.windsurf/rules/bezel-film.md",
    frontmatter: ["trigger: model_decision", `description: ${DESCRIPTION}`],
  },
];

function render(target: Target): string {
  const head = target.frontmatter ? `---\n${target.frontmatter.join("\n")}\n---\n\n` : "";
  return `${head}${NOTICE}\n\n${source}\n`;
}

const files = new Map(targets.map((target) => [`${root}agents/generated/${target.path}`, render(target)]));
await writeOrCheck(files, root);
