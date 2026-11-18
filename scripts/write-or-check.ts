import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative } from "node:path";

/**
 * Writes generated files, or with --check only compares them.
 * CI runs the --check mode, so a stale generated file fails the build
 * instead of quietly drifting from its source.
 */
export async function writeOrCheck(files: Map<string, string>, root: string): Promise<void> {
  const check = process.argv.includes("--check");
  const stale: string[] = [];

  for (const [path, content] of files) {
    const current = await readFile(path, "utf8").catch(() => null);
    if (current === content) continue;
    if (check) {
      stale.push(relative(root, path));
    } else {
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, content);
      console.log(`wrote ${relative(root, path)}`);
    }
  }

  if (stale.length) {
    console.error(`Out of date: ${stale.join(", ")}\nRun the matching npm script (without --check) and commit the result.`);
    process.exit(1);
  }
  if (check) console.log(`✓ ${files.size} generated file${files.size === 1 ? "" : "s"} up to date`);
}
