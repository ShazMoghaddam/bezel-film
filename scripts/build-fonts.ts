import { copyFile, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { allFontFiles, FONT_PAIRINGS, type FontSubset } from "../src/spec/fonts.js";

/**
 * Builds fonts/ from the Fontsource packages in devDependencies.
 *
 * Each Fontsource package holds every weight, style and language set of a font,
 * several megabytes each. Bezel Film needs only a few: the weights its pairings use,
 * in Latin and Latin Extended, as woff2. So this copies just those files, with each
 * font's licence. It writes fonts/manifest.json, the characters each file covers (the
 * page tells the browser, so it loads a file only for text that needs it), and
 * fonts/CREDITS.md.
 * Run with `npm run fonts`. Only maintainers need to run it; the result is committed.
 */

const root = fileURLToPath(new URL("..", import.meta.url));
const OUT = join(root, "fonts");
const require = createRequire(import.meta.url);

const packageDir = (id: string) => dirname(require.resolve(`@fontsource/${id}/package.json`));

interface Metadata {
  family: string;
  version: string;
  license: { type: string; url: string; attribution: string };
  authors?: { copyright?: string; designer?: string };
}

/** The unicode-range Fontsource gives one file, read from its CSS. */
async function unicodeRange(id: string, subset: FontSubset, weight: number): Promise<string> {
  // The weight's CSS has one @font-face per character set, each after a comment naming it.
  const css = await readFile(join(packageDir(id), `${weight}.css`), "utf8");
  const block = css.split("/* ").find((part) => part.startsWith(`${id}-${subset}-${weight}-normal */`));
  const range = block && /unicode-range:\s*([^;]+);/.exec(block)?.[1];
  if (!range) throw new Error(`No ${subset} unicode-range in @fontsource/${id}/${weight}.css`);
  return range.trim();
}

await rm(OUT, { recursive: true, force: true });

const ids = new Set<string>();
const ranges: Record<string, string> = {};
for (const file of allFontFiles()) {
  const [, id, name] = file.split("/") as [string, string, string];
  const match = /-(latin(?:-ext)?)-(\d+)-normal\.woff2$/.exec(name)!;
  const subset = match[1] as FontSubset;
  ranges[file] = await unicodeRange(id, subset, Number(match[2]));
  await mkdir(join(OUT, id), { recursive: true });
  await copyFile(join(packageDir(id), "files", name), join(root, file));
  ids.add(id);
}

await writeFile(join(OUT, "manifest.json"), JSON.stringify({ ranges }, null, 2) + "\n");

const rows: string[] = [];
for (const id of [...ids].sort()) {
  const meta = JSON.parse(await readFile(join(packageDir(id), "metadata.json"), "utf8")) as Metadata;
  if (meta.license.type !== "OFL-1.1") throw new Error(`${meta.family} isn't OFL-1.1 (${meta.license.type})`);
  await copyFile(join(packageDir(id), "LICENSE"), join(OUT, id, "LICENSE"));
  const weights = (await readdir(join(OUT, id)))
    .map((name) => /-latin-(\d+)-normal\.woff2$/.exec(name)?.[1])
    .filter((weight): weight is string => Boolean(weight))
    .sort();
  // Some attributions repeat the notice once per source file; the first one is the notice.
  const notice = meta.license.attribution.split(/\s+\S+\.ttf:/)[0]!.trim();
  rows.push(`| ${meta.family} | ${notice} | ${weights.join(", ")} | [OFL 1.1](${id}/LICENSE) | ${meta.version} |`);
}

const pairings = Object.values(FONT_PAIRINGS)
  .map((pairing) => `| \`${pairing.name}\` | ${pairing.heading.family} | ${pairing.body.family} | ${pairing.mono.family} |`)
  .join("\n");

await writeFile(
  join(OUT, "CREDITS.md"),
  `# Fonts

Bezel Film ships these fonts so films render offline, in the same type on every computer.
All of them are free under the [SIL Open Font License 1.1](https://openfontlicense.org), which
allows bundling them with software. Each folder keeps its font's licence.

The files come unchanged from [Fontsource](https://fontsource.org): the weights Bezel Film uses,
in the Latin and Latin Extended character sets, as woff2. They're rebuilt with \`npm run fonts\`.

| Font | Copyright | Weights | Licence | Version |
| --- | --- | --- | --- | --- |
${rows.join("\n")}

## Pairings

A film's \`font\` setting picks one of these. See \`src/spec/fonts.ts\`.

| Pairing | Headings | Body | Code |
| --- | --- | --- | --- |
${pairings}
`,
);

console.log(`wrote fonts/: ${ids.size} fonts, ${allFontFiles().length} files`);
