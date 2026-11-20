import { existsSync } from "node:fs";
import { join } from "node:path";

/**
 * The coding agents Bezel Film writes instructions for, where each one looks for
 * them in a project, and how to add them without disturbing anything else.
 */

export const AGENT_IDS = ["claude", "codex", "gemini", "cursor", "copilot", "windsurf"] as const;
export type AgentId = (typeof AGENT_IDS)[number];

export interface AgentTarget {
  id: AgentId;
  name: string;
  /** Where the instructions go in a user's project. */
  file: string;
  /** Lines that must sit at the very top of the file (frontmatter), if the agent needs any. */
  frontmatter?: string[];
  /**
   * A file other tools or people also write to. Bezel Film only ever adds or
   * updates its own marked section in it, never the rest.
   */
  shared: boolean;
  /** Files or folders whose presence shows the project already uses this agent. */
  signs: string[];
  /**
   * The agent caps the size of its rule file, so it gets the compact instructions:
   * parts marked "full only" are left out, and short "compact" stand-ins go in.
   */
  compact?: boolean;
}

const DESCRIPTION =
  "Make short narrated films from a repo, README or dataset with Bezel Film. Use when the user asks for a video, film, explainer, promo or data story.";

export const AGENT_TARGETS: AgentTarget[] = [
  {
    id: "claude",
    name: "Claude Code",
    file: ".claude/skills/bezel-film/SKILL.md",
    frontmatter: ["name: bezel-film", `description: ${DESCRIPTION}`],
    shared: false,
    signs: [".claude", "CLAUDE.md"],
  },
  { id: "codex", name: "Codex (and any agent that reads AGENTS.md)", file: "AGENTS.md", shared: true, signs: ["AGENTS.md", ".codex"] },
  { id: "gemini", name: "Gemini CLI", file: "GEMINI.md", shared: true, signs: ["GEMINI.md", ".gemini"] },
  {
    id: "cursor",
    name: "Cursor",
    file: ".cursor/rules/bezel-film.mdc",
    frontmatter: [`description: ${DESCRIPTION}`, "globs: **/film.json", "alwaysApply: false"],
    shared: false,
    signs: [".cursor", ".cursorrules"],
  },
  { id: "copilot", name: "GitHub Copilot", file: ".github/copilot-instructions.md", shared: true, signs: [".github/copilot-instructions.md"] },
  {
    id: "windsurf",
    name: "Windsurf",
    file: ".windsurf/rules/bezel-film.md",
    // Windsurf rule files hold at most 6,000 characters.
    compact: true,
    frontmatter: ["trigger: model_decision", `description: ${DESCRIPTION}`],
    shared: false,
    signs: [".windsurf", ".windsurfrules"],
  },
];

export const SECTION_START = "<!-- bezel-film:start -->";
export const SECTION_END = "<!-- bezel-film:end -->";
const NOTICE = "<!-- Added by Bezel Film. Run `npx bezel-film init` again to update this section. -->";

/** Where a target's ready-made file sits inside the package. */
export const generatedPath = (target: AgentTarget) => `agents/generated/${target.id}/${target.file}`;

/**
 * The shared instructions in their full or compact form. Text between
 * `<!-- full -->` and `<!-- /full -->` appears only in the full form, and a line
 * `<!-- compact: … -->` becomes that text, only in the compact form.
 */
export function shapeInstructions(instructions: string, compact: boolean): string {
  return instructions
    .replace(/<!-- full -->\n?([\s\S]*?)<!-- \/full -->\n?/g, compact ? "" : "$1")
    .replace(/<!-- compact: ([\s\S]*?) -->\n?/g, compact ? "$1\n" : "");
}

/** The full instruction file for one agent, built from the shared instructions. */
export function renderInstructions(target: AgentTarget, instructions: string): string {
  const head = target.frontmatter ? `---\n${target.frontmatter.join("\n")}\n---\n\n` : "";
  const body = shapeInstructions(instructions, !!target.compact).trim();
  return `${head}${SECTION_START}\n${NOTICE}\n\n${body}\n${SECTION_END}\n`;
}

/** Just the marked Bezel Film section of a rendered file, without frontmatter. */
export function sectionOf(rendered: string): string {
  const start = rendered.indexOf(SECTION_START);
  const end = rendered.indexOf(SECTION_END);
  if (start < 0 || end < 0) throw new Error("Instructions are missing their Bezel Film markers");
  return rendered.slice(start, end + SECTION_END.length);
}

/**
 * Adds the Bezel Film section to a shared file, or replaces the one already there.
 * Everything outside the markers is left exactly as it was.
 */
export function mergeSection(existing: string | null, section: string): string {
  if (!existing?.trim()) return `${section}\n`;
  const start = existing.indexOf(SECTION_START);
  const end = existing.indexOf(SECTION_END);
  if (start >= 0 && end > start) {
    return existing.slice(0, start) + section + existing.slice(end + SECTION_END.length);
  }
  return `${existing.replace(/\s*$/, "")}\n\n${section}\n`;
}

/** The agents a project already shows signs of using. */
export function detectAgents(cwd: string): AgentId[] {
  return AGENT_TARGETS.filter((target) => target.signs.some((sign) => existsSync(join(cwd, sign)))).map((target) => target.id);
}
