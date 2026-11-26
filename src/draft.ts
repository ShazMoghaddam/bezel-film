import type { PresetName } from "./spec/formats.js";
import type { FilmInput } from "./spec/schema.js";
import { shorten, type Release, type RepoFacts } from "./repo.js";

/**
 * A first film about a project, from the facts `gatherFacts` found. It's a starting
 * point: every scene is built only from what the project says about itself, in its
 * own words where they fit. A coding agent, or the author, then rewrites the narration
 * and trims it to what matters.
 *
 * The shape: a title, what it does, how to start, how far it's come, what's next,
 * its stars, and a closing call to action. Scenes with nothing to say are left out.
 */

type SceneInput = FilmInput["scenes"][number];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const LONG_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const sentence = (text: string) => {
  const trimmed = text.trim().replace(/[\s:;,–—-]+$/, "");
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
};
/** Narration from a few sentences, never past the spec's limit. */
const say = (...parts: (string | undefined | false)[]) => shorten(parts.filter(Boolean).join(" "), 600).replace(/…$/, ".");
/** Lower-cases a first word that isn't a name or an acronym, for use mid-sentence. */
const midSentence = (text: string) => (/^(?:[A-Z][a-z]+|A)(?:$| [a-z0-9(])/.test(text) ? text[0]!.toLowerCase() + text.slice(1) : text);
/** The short head of a feature, e.g. "Fast" from "Fast: starts in 10ms". */
const featureHead = (feature: string) => shorten(feature.split(/:\s|\s[-–—]\s|\.\s/)[0]!, 60).replace(/…$/, "");
/** On-screen text without a full stop at the end. */
const label = (text: string) => text.replace(/\.$/, "");
const list = (items: string[]) => (items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`);

function monthYear(date: string, long = false): string {
  const [year, month] = date.split("-").map(Number);
  return `${(long ? LONG_MONTHS : MONTHS)[month! - 1] ?? ""} ${year}`.trim();
}

/** Versions as people say them: "version 2.1", leaving off a trailing ".0". */
const NUMBERS = ["no", "one", "two", "three"];
/** "one command", "two commands": the install lines, as spoken. */
const countCommands = (install: string) => {
  const n = install.split("\n").filter((line) => line.trim()).length;
  return `${NUMBERS[n] ?? n} command${n === 1 ? "" : "s"}`;
};
const spokenVersion = (version: string) => `version ${version.replace(/\.0$/, "")}`;

/** The releases worth showing: the first, then the latest few. */
function milestones(releases: Release[]): Release[] {
  if (releases.length <= 5) return releases;
  return [releases[0]!, ...releases.slice(-4)];
}

export interface DraftOptions {
  /** The platform the film is for, if known. */
  preset?: PresetName;
}

export function draftFilm(facts: RepoFacts, options: DraftOptions = {}): FilmInput {
  const scenes: SceneInput[] = [];
  const name = facts.name;

  scenes.push({
    id: "intro",
    type: "title",
    title: shorten(name, 120),
    ...(facts.tagline ? { subtitle: shorten(facts.tagline, 200) } : {}),
    narration: say(`Meet ${name}.`, facts.intro ? sentence(shorten(facts.intro, 220).replace(/…$/, "")) : facts.tagline && sentence(facts.tagline)),
  });

  if (facts.features.length >= 2) {
    const features = facts.features.slice(0, 5);
    const heads = features.slice(0, 3).map(featureHead).map(midSentence);
    scenes.push({
      id: "features",
      type: "points",
      heading: "What it does",
      // Short points read best on screen: a feature's lead-in where it has one.
      points: features.map((f) => (featureHead(f) !== f && featureHead(f).length >= 8 ? featureHead(f) : shorten(f, 90))).map(label),
      narration: say(`Here's what you get: ${list(heads)}.`),
    });
  }

  if (facts.usage || facts.install) {
    const usage = facts.usage;
    const installLine = facts.install?.split("\n")[0];
    scenes.push({
      id: "get-started",
      type: "code",
      language: usage ? usage.language || "code" : "bash",
      code: usage ? usage.code : facts.install!,
      ...(usage && installLine ? { caption: shorten(installLine, 160) } : {}),
      narration: usage
        ? say("Getting started is quick.", installLine ? "Install it with one command, then a few lines like these are all you need." : "A few lines like these are all you need.")
        : say(`Getting started takes ${countCommands(facts.install!)}.`),
    });
  }

  if (facts.releases.length >= 3) {
    const shown = milestones(facts.releases);
    const first = facts.releases[0]!;
    const last = facts.releases.at(-1)!;
    scenes.push({
      id: "so-far",
      type: "timeline",
      heading: "How far it's come",
      events: shown.map((release) => ({
        date: shorten(`v${release.version} · ${monthYear(release.date)}`, 24),
        label: label(shorten(release.summary ?? `Version ${release.version}`, 48)),
      })),
      narration: say(
        `The first release, ${spokenVersion(first.version)}, came out in ${monthYear(first.date, true)}.`,
        `There have been ${facts.releases.length - 1} more since, and the latest is ${spokenVersion(last.version)}.`,
      ),
    });
  }

  const done = facts.roadmap.filter((item) => item.done);
  const next = facts.roadmap.filter((item) => !item.done);
  if (next.length && done.length + next.length >= 2) {
    const steps = [...done.slice(-2), ...next.slice(0, 3)];
    scenes.push({
      id: "next",
      type: "roadmap",
      heading: "What's next",
      steps: steps.map((item) => ({
        label: label(shorten(item.label, 48)),
        status: item.done ? ("done" as const) : ("planned" as const),
        ...(item.when ? { when: shorten(item.when, 24) } : {}),
      })),
      narration: say(`Coming next: ${list(next.slice(0, 2).map((item) => midSentence(featureHead(item.label))))}.`),
    });
  }

  if (facts.stars !== undefined && facts.stars >= 50) {
    scenes.push({
      id: "stars",
      type: "stat",
      value: facts.stars,
      label: "stars on GitHub",
      narration: say(`${facts.stars.toLocaleString("en-GB")} people have starred it on GitHub.`),
    });
  }

  const command = facts.install?.split("\n")[0];
  const github = facts.url?.startsWith("https://github.com/");
  const cta = command && command.length <= 40 ? command : github ? "Star it on GitHub" : undefined;
  const open = facts.license ? " It's free and open source." : "";
  scenes.push({
    id: "outro",
    type: "outro",
    title: shorten(`Try ${name}`, 120),
    ...(cta ? { cta } : {}),
    ...(facts.url && /^https?:\/\//.test(facts.url) ? { url: facts.url } : {}),
    narration: say(`Try ${name} today.${open}`, github && "Find it on GitHub."),
  });

  return {
    spec: 1,
    title: shorten(facts.tagline ? `${name}: ${facts.tagline}` : name, 120).replace(/…$/, ""),
    style: "data-story",
    format: options.preset ? { preset: options.preset } : { aspect: "16:9", resolution: "1080p", fps: 30 },
    voice: { engine: "kokoro" },
    music: { source: "generated", mood: "upbeat" },
    captions: true,
    scenes,
  };
}
