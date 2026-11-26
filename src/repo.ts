/**
 * Facts about a project, gathered from its README, package files, changelog and
 * (for a GitHub link) GitHub itself. `bezel-film draft` turns these into a first film.
 *
 * Everything here is best effort: a README can be shaped any way at all, so each fact
 * is optional and the draft uses whatever turns up.
 */
import { existsSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";

export interface Release {
  version: string;
  /** As written in the changelog, e.g. 2026-11-20. */
  date: string;
  /** A short line about the release: its summary, or its first change. */
  summary?: string;
}

export interface RoadmapItem {
  label: string;
  when?: string;
  done: boolean;
}

export interface CodeSample {
  language: string;
  code: string;
}

export interface RepoFacts {
  name: string;
  /** One line about what it is, e.g. a package description. */
  tagline?: string;
  /** The README's opening paragraph, in plain text. */
  intro?: string;
  features: string[];
  /** Shell commands to install or start it. */
  install?: string;
  /** A short code example. */
  usage?: CodeSample;
  releases: Release[];
  roadmap: RoadmapItem[];
  version?: string;
  license?: string;
  stars?: number;
  url?: string;
  /** Where each fact came from, for the summary the command prints. */
  sources: string[];
}

// --- Markdown -----------------------------------------------------------------------

interface Section {
  heading: string;
  /** 1 for "#", 2 for "##" and so on; 0 for the text before the first heading. */
  level: number;
  lines: string[];
}

/** A README split at its headings, keeping fenced code blocks whole. */
function sections(markdown: string): Section[] {
  const out: Section[] = [{ heading: "", level: 0, lines: [] }];
  let fence = "";
  for (const line of markdown.replace(/\r\n?/g, "\n").split("\n")) {
    const marker = line.match(/^\s*(```+|~~~+)/)?.[1];
    if (marker) fence = fence ? (marker.startsWith(fence) ? "" : fence) : marker;
    const heading = !fence && !marker ? line.match(/^(#{1,6})\s+(.*?)\s*#*\s*$/) : null;
    if (heading) out.push({ heading: plain(heading[2]!), level: heading[1]!.length, lines: [] });
    else out.at(-1)!.lines.push(line);
  }
  return out;
}

const EMOJI = /[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu;

/** Markdown and HTML down to plain words: no links, images, emphasis, code ticks or emoji. */
export function plain(text: string): string {
  return text
    // Code spans first, so `<my-tag>` in one survives the HTML being stripped below.
    .replace(/`([^`]*)`/g, (_, code: string) => code.replace(/</g, "\u0001").replace(/>/g, "\u0002"))
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[!\[[^\]]*\]\([^)]*\)\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\[[^\]]*\]/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(^|[\s(])[*_]([^*_\s][^*_]*?)[*_](?=[\s).,:;!?]|$)/g, "$1$2")
    .replace(/:[a-z0-9_+-]+:/g, "")
    // A backslash at the end of a line is a Markdown line break, and one before a mark
    // keeps the mark as itself: neither belongs in the words.
    .replace(/\\(?=\n|$)/g, "")
    .replace(/\\([\\`*_{}[\]()#+\-.!|])/g, "$1")
    .replace(EMOJI, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\u0001/g, "<")
    .replace(/\u0002/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Text cut to fit, at a natural break where there is one: the end of a sentence,
 * a dash or a colon, then a comma, then a word. Never mid-word.
 */
export function shorten(text: string, max: number): string {
  if (text.length <= max) return text;
  const room = text.slice(0, max + 1);
  for (const breaks of [/[.!?](?=\s)/g, /\s[-–—]\s|:\s/g, /,\s/g]) {
    const cut = [...room.matchAll(breaks)].map((m) => m.index!).filter((i) => i >= max * 0.25).at(-1);
    if (cut !== undefined) return text.slice(0, cut).replace(/[\s,;:–—-]+$/, "");
  }
  // Room for the "…" too.
  const word = text.slice(0, max).lastIndexOf(" ");
  return `${text.slice(0, word > max * 0.5 ? word : max - 1).replace(/[\s,;:]+$/, "")}…`;
}

/** The items of the first bullet or numbered list in some lines, as raw markdown. */
function listItems(lines: string[]): string[] {
  const items: string[] = [];
  let fence = false;
  for (const line of lines) {
    if (/^\s*(```|~~~)/.test(line)) fence = !fence;
    if (fence) continue;
    const item = line.match(/^ {0,3}(?:[-*+]|\d+[.)])\s+(.*)$/);
    if (item) items.push(item[1]!);
    else if (/^\s{2,}\S/.test(line) && items.length) items[items.length - 1] += ` ${line.trim()}`;
    else if (line.trim() && items.length) break;
  }
  return items;
}

/** Fenced code blocks, with their language. */
function codeBlocks(lines: string[]): CodeSample[] {
  const blocks: CodeSample[] = [];
  let current: CodeSample | undefined;
  for (const line of lines) {
    const fence = line.match(/^\s*(?:```+|~~~+)\s*([\w+#.-]*)/);
    if (fence && !current) current = { language: fence[1]!.toLowerCase(), code: "" };
    else if (fence && current) {
      blocks.push({ ...current, code: current.code.replace(/\n$/, "") });
      current = undefined;
    } else if (current) current.code += `${line}\n`;
  }
  return blocks;
}

const SHELL = new Set(["", "sh", "bash", "shell", "console", "zsh", "terminal", "powershell", "ps1", "cmd", "fish"]);
const COMMAND = /^(?:\$\s*)?(npm|npx|pnpm|yarn|bun|bunx|deno|pip|pip3|pipx|uv|poetry|conda|brew|cargo|go|gem|composer|dotnet|docker|curl|git clone)\b/;
const isLink = (item: string) => /^\s*\[[^\]]*\]\([^)]*\)\s*$/.test(item);
const toc = (items: string[]) => items.filter(isLink).length > items.length / 2;

const FEATURE_HEADINGS = /feature|highlight|what (it|you|can)|why|key|benefit|capabilit|what's (inside|included)/i;
const START_HEADINGS = /install|getting started|get started|quick ?start|setup|set up|usage|use it|how to|example|your first|first steps|try it/i;
/** Sections whose lists are reference material, never what the project does. */
const REFERENCE_HEADINGS = /note|source|data|method|caveat|limitation|disclaimer|reference|glossary|footnote|appendix/i;
/** Without a features heading, only lists this near the top can be what the project does. */
const EARLY_SECTIONS = 5;
const SKIP_HEADINGS = /licen[cs]e|contribut|credit|acknowledg|sponsor|changelog|support|security|table of contents|contents|faq|badge|author|thanks/i;

interface ReadmeFacts {
  title?: string;
  intro?: string;
  features: string[];
  install?: string;
  usage?: CodeSample;
  roadmap: RoadmapItem[];
}

export function readReadme(markdown: string): ReadmeFacts {
  const parts = sections(markdown);
  // The project's name is its top heading. Many READMEs open with a logo instead, and
  // then their first heading is a section like "Install", which isn't the name.
  const titled = parts.find((s) => s.level === 1);
  // The opening paragraph: the first run of prose that isn't badges, images or HTML.
  let intro: string | undefined;
  for (const part of parts.slice(0, 3)) {
    const paragraphs = part.lines.join("\n").split(/\n\s*\n/);
    for (const paragraph of paragraphs) {
      if (/^\s*(```|~~~|[-*+]\s|\d+[.)]\s|\||>?\s*\[!)/.test(paragraph)) continue;
      const text = plain(paragraph.replace(/^>\s?/gm, ""));
      if (text.length >= 25 && /[a-z]{3}/.test(text)) {
        intro = text;
        break;
      }
    }
    if (intro) break;
  }

  // Features: a list under a features-like heading, or else the first real list near the
  // top. A list further down is usually reference material (notes, sources, a ranking),
  // and no features scene is better than a wrong one.
  const candidates = [
    ...parts.filter((s) => FEATURE_HEADINGS.test(s.heading)),
    ...parts
      .slice(0, EARLY_SECTIONS)
      .filter((s) => !SKIP_HEADINGS.test(s.heading) && !START_HEADINGS.test(s.heading) && !REFERENCE_HEADINGS.test(s.heading) && !/roadmap/i.test(s.heading)),
  ];
  let features: string[] = [];
  for (const part of candidates) {
    const items = listItems(part.lines);
    if (items.length >= 2 && !toc(items)) {
      features = items.map(plain).filter((item) => item.length >= 4);
      if (features.length >= 2) break;
    }
  }

  // Getting started: the first install command, and the first code that isn't shell. The
  // example code only comes from a getting-started section: code elsewhere is usually
  // reference (an option, an API, a sample file) and makes a confusing first step.
  const starting = parts.filter((s) => START_HEADINGS.test(s.heading));
  const start = [...starting, ...parts];
  let install: string | undefined;
  let usage: CodeSample | undefined;
  for (const part of start) {
    for (const block of codeBlocks(part.lines)) {
      const lines = block.code.split("\n").map((l) => l.trim());
      if (!install && SHELL.has(block.language)) {
        const commands = lines.filter((l) => COMMAND.test(l)).map((l) => l.replace(/^\$\s*/, ""));
        if (commands.length) install = commands.slice(0, 3).join("\n");
      }
      // Only a short example: a long one cut off part way through reads as broken.
      const length = block.code.split("\n").length;
      if (!usage && starting.includes(part) && !SHELL.has(block.language) && block.code.trim() && length <= 16) usage = block;
    }
    if (install && usage) break;
  }

  // Roadmap: ticked boxes, or items marked as released or done, count as done.
  const roadmap: RoadmapItem[] = [];
  for (const part of parts.filter((s) => /roadmap|what's next|coming soon|plans/i.test(s.heading))) {
    for (const raw of listItems(part.lines)) {
      const box = raw.match(/^\[([ xX])\]\s*/);
      const text = plain(raw.replace(/^\[[ xX]\]\s*/, ""));
      const tagged = text.match(/^((?:v?\d[\w.-]*|Q[1-4](?: \d{4})?|\d{4}|(?:spring|summer|autumn|fall|winter)(?: \d{4})?)(?: onwards| and later|\+)?)\s*(\(([^)]*)\))?\s*[:–—-]\s*(.+)$/i);
      const done = box ? box[1] !== " " : /\b(released|done|shipped|complete|live)\b/i.test(tagged?.[3] ?? text.slice(0, 40));
      const label = tagged ? tagged[4]! : text;
      roadmap.push({ label: label[0]!.toUpperCase() + label.slice(1), ...(tagged ? { when: tagged[1] } : {}), done });
    }
    if (roadmap.length) break;
  }

  return { title: titled?.heading, intro, features, install, usage, roadmap };
}

/** Releases from a Keep a Changelog style file, oldest first. */
export function readChangelog(markdown: string): Release[] {
  const releases: Release[] = [];
  const parts = sections(markdown);
  parts.forEach((part, i) => {
    const head = part.heading.match(/^\[?v?(\d+\.\d+(?:\.\d+)?(?:[-+][\w.]+)?)\]?\s*[-–—(]?\s*(\d{4}-\d{2}-\d{2})/);
    if (!head) return;
    // A release's text, including its "### Added" and other sub-headings.
    const lines = [...part.lines];
    for (const next of parts.slice(i + 1)) {
      if (next.level <= part.level) break;
      lines.push(...next.lines);
    }
    const prose = lines.join("\n").split(/\n\s*\n/).map((p) => p.trim()).find((p) => p && !/^[-*#]/.test(p));
    const first = listItems(lines)[0];
    const summary = prose ? plain(prose) : first ? plain(first) : undefined;
    releases.push({ version: head[1]!, date: head[2]!, summary: summary || undefined });
  });
  return releases.reverse();
}

// --- Sources --------------------------------------------------------------------------

const README_NAMES = ["README.md", "readme.md", "Readme.md", "README.markdown", "README"];
const GITHUB = /^(?:https?:\/\/github\.com\/|github:|git@github\.com:)?([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?(?:#.*)?$/;

async function readIf(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, "utf8");
  } catch {
    return undefined;
  }
}

function githubUrl(remote: string): string | undefined {
  const match = remote.trim().match(/github\.com[/:]([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/);
  return match ? `https://github.com/${match[1]}/${match[2]}` : undefined;
}

interface PackageFacts {
  name?: string;
  description?: string;
  version?: string;
  license?: string;
  url?: string;
}

function readPackageJson(text: string): PackageFacts {
  try {
    const pkg = JSON.parse(text) as Record<string, unknown>;
    const repo = pkg.repository;
    const repoUrl = typeof repo === "string" ? repo : (repo as { url?: string } | undefined)?.url;
    const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
    return {
      name: str(pkg.name),
      description: str(pkg.description),
      version: str(pkg.version),
      license: str(pkg.license),
      url: (repoUrl && githubUrl(repoUrl)) ?? str(pkg.homepage),
    };
  } catch {
    return {};
  }
}

/** The [project] table of a pyproject.toml, read with a few patterns rather than a full TOML parser. */
function readPyproject(text: string): PackageFacts {
  const table = text.match(/^\[(?:project|tool\.poetry)\]\s*$([\s\S]*?)(?=^\[|$(?![\s\S]))/m)?.[1] ?? "";
  const field = (name: string) => table.match(new RegExp(`^${name}\\s*=\\s*["']([^"']+)["']`, "m"))?.[1];
  const license = table.match(/^license\s*=\s*(?:\{\s*text\s*=\s*)?["']([^"']+)["']/m)?.[1];
  const url = text.match(/^(?:repository|source|homepage)\s*=\s*["']([^"']+)["']/im)?.[1];
  return { name: field("name"), description: field("description"), version: field("version"), license, url: url && (githubUrl(url) ?? url) };
}

/** Facts from a folder on this computer. Nothing is downloaded. */
async function fromFolder(folder: string, sources: string[]) {
  let readme: string | undefined;
  for (const name of README_NAMES) {
    readme = await readIf(join(folder, name));
    if (readme !== undefined) {
      sources.push(name);
      break;
    }
  }
  const pkgText = await readIf(join(folder, "package.json"));
  const pyText = pkgText ? undefined : await readIf(join(folder, "pyproject.toml"));
  if (pkgText) sources.push("package.json");
  if (pyText) sources.push("pyproject.toml");
  const changelog = await readIf(join(folder, "CHANGELOG.md"));
  if (changelog) sources.push("CHANGELOG.md");
  const git = await readIf(join(folder, ".git", "config"));
  const remote = git?.match(/\[remote "origin"\][^[]*?url\s*=\s*(\S+)/)?.[1];
  const pkg = pkgText ? readPackageJson(pkgText) : pyText ? readPyproject(pyText) : {};
  return { readme, changelog, pkg, url: pkg.url ?? (remote ? githubUrl(remote) : undefined), folderName: basename(folder) };
}

async function fetchText(url: string): Promise<string | undefined> {
  try {
    const response = await fetch(url, { headers: { "user-agent": "bezel-film" } });
    return response.ok ? await response.text() : undefined;
  } catch {
    return undefined;
  }
}

/** Facts from a GitHub repository, read over the network. */
async function fromGithub(owner: string, repo: string, sources: string[]) {
  const raw = (file: string) => fetchText(`https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${file}`);
  let readme: string | undefined;
  for (const name of README_NAMES) {
    readme = await raw(name);
    if (readme !== undefined) break;
  }
  if (readme === undefined) throw new Error(`Couldn't read a README from github.com/${owner}/${repo}. Check the name, and that the repository is public.`);
  sources.push("README");
  const [pkgText, pyText, changelog, apiText] = await Promise.all([
    raw("package.json"),
    raw("pyproject.toml"),
    raw("CHANGELOG.md"),
    fetchText(`https://api.github.com/repos/${owner}/${repo}`),
  ]);
  if (pkgText) sources.push("package.json");
  else if (pyText) sources.push("pyproject.toml");
  if (changelog) sources.push("CHANGELOG.md");
  const pkg = pkgText ? readPackageJson(pkgText) : pyText ? readPyproject(pyText) : {};
  let api: { description?: string | null; stargazers_count?: number; license?: { spdx_id?: string } | null } = {};
  if (apiText) {
    try {
      api = JSON.parse(apiText);
      sources.push("GitHub");
    } catch {
      // Stars and the description are extras; carry on without them.
    }
  }
  return {
    readme,
    changelog,
    pkg: {
      ...pkg,
      description: pkg.description ?? api.description ?? undefined,
      license: pkg.license ?? (api.license?.spdx_id && api.license.spdx_id !== "NOASSERTION" ? api.license.spdx_id : undefined),
    },
    stars: api.stargazers_count,
    url: `https://github.com/${owner}/${repo}`,
    folderName: repo,
  };
}

/**
 * Gathers what can be found about a project from a folder, a README file or a GitHub
 * repository ("owner/repo" or its link). A folder or file on this computer wins over a
 * GitHub name that happens to look the same.
 */
export async function gatherFacts(source: string): Promise<RepoFacts> {
  const sources: string[] = [];
  const github = source.match(GITHUB);
  let found: Awaited<ReturnType<typeof fromFolder>> & { stars?: number };
  if (existsSync(source) && statSync(source).isDirectory()) {
    found = await fromFolder(source, sources);
  } else if (existsSync(source)) {
    // A README on its own, with whatever sits beside it.
    const beside = await fromFolder(dirname(source), []);
    found = { ...beside, readme: await readFile(source, "utf8") };
    sources.push(basename(source), ...["package.json", "CHANGELOG.md"].filter((f) => existsSync(join(dirname(source), f))));
  } else if (github && !source.startsWith(".") && !source.startsWith("/")) {
    found = await fromGithub(github[1]!, github[2]!, sources);
  } else {
    throw new Error(`Couldn't find "${source}". Give a project folder, a README file, or a GitHub repository such as owner/repo.`);
  }
  if (found.readme === undefined) throw new Error(`There's no README in ${source}, so there's nothing to draft from yet.`);

  const readme = readReadme(found.readme);
  const npmName = found.pkg.name?.replace(/^@[^/]+\//, "");
  // The README's own title reads best, unless it's long or a sentence rather than a name.
  const title = readme.title && readme.title.length <= 40 ? readme.title : undefined;
  const name = title ?? npmName ?? found.folderName;
  const tagline = found.pkg.description ? plain(found.pkg.description) : undefined;

  return {
    name,
    tagline: tagline || (readme.intro ? shorten(readme.intro, 160) : undefined),
    intro: readme.intro,
    features: readme.features,
    install: readme.install,
    usage: readme.usage,
    releases: found.changelog ? readChangelog(found.changelog) : [],
    roadmap: readme.roadmap,
    version: found.pkg.version,
    license: found.pkg.license,
    stars: found.stars,
    url: found.url,
    sources,
  };
}
