import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Builds icons/ from Tabler Icons (MIT), the line drawings custom scenes can draw with
 * kit.icon(). Each drawing is a few strokes on a 24 by 24 grid, which suits styles that
 * draw lines in, like Whiteboard and Blueprint. Only the strokes are kept, as path data,
 * plus each drawing's tags so `bezel-film icons <word>` can find it.
 * Run with `npm run icons`. Only maintainers need to run it; the result is committed.
 */

const root = fileURLToPath(new URL("..", import.meta.url));
const require = createRequire(import.meta.url);
const pkg = dirname(require.resolve("@tabler/icons/package.json"));

type Node = [string, Record<string, string>];
const nodes = JSON.parse(await readFile(join(pkg, "tabler-nodes-outline.json"), "utf8")) as Record<string, Node[]>;
const meta = JSON.parse(await readFile(join(pkg, "icons.json"), "utf8")) as Record<string, { tags?: (string | number)[]; category?: string }>;
const { version } = JSON.parse(await readFile(join(pkg, "package.json"), "utf8")) as { version: string };

const paths: Record<string, string[]> = {};
const tags: Record<string, string> = {};
for (const [name, parts] of Object.entries(nodes)) {
  const strokes = parts.filter(([tag, attrs]) => tag === "path" && attrs.stroke !== "none" && attrs.d !== "M0 0h24v24H0z").map(([, attrs]) => attrs.d!);
  if (!strokes.length) continue;
  paths[name] = strokes;
  const words = new Set([...(meta[name]?.tags ?? []).map(String), meta[name]?.category ?? ""].map((w) => w.toLowerCase()).filter(Boolean));
  tags[name] = [...words].join(" ");
}

await mkdir(join(root, "icons"), { recursive: true });
await writeFile(join(root, "icons", "icons.json"), JSON.stringify(paths));
await writeFile(join(root, "icons", "tags.json"), JSON.stringify(tags));
await copyFile(join(pkg, "LICENSE"), join(root, "icons", "LICENSE"));
await writeFile(
  join(root, "icons", "CREDITS.md"),
  `# Icons

The line drawings custom scenes draw with \`kit.icon()\` are [Tabler Icons](https://tabler.io/icons) ${version},
by Paweł Kuna, under the [MIT licence](LICENSE). Only the outline drawings' strokes are kept, unchanged.
They're rebuilt with \`npm run icons\`.
`,
);
console.log(`wrote icons/: ${Object.keys(paths).length} drawings`);
