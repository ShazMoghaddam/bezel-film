import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { AGENT_TARGETS, generatedPath, renderInstructions } from "../src/agents.js";
import { writeOrCheck } from "./write-or-check.js";

/**
 * Builds each coding agent's instruction file from one source: agents/instructions.md.
 * Edit the source, run `npm run agents`, and every agent gets the same guidance.
 *
 * Output goes to agents/generated/<agent>/, laid out exactly as it sits in a user's
 * project, so `bezel-film init` can copy it straight across.
 */
const root = fileURLToPath(new URL("..", import.meta.url));
const instructions = await readFile(`${root}agents/instructions.md`, "utf8");

const files = new Map(AGENT_TARGETS.map((target) => [`${root}${generatedPath(target)}`, renderInstructions(target, instructions)]));
await writeOrCheck(files, root);
