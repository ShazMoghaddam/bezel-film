import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { validateFilm, type Film } from "../src/index.js";
import { AGENT_TARGETS, generatedPath, shapeInstructions } from "../src/agents.js";
import { layoutFor } from "../src/render/layout.js";
import { buildPage } from "../src/render/page.js";
import { filmCues } from "../src/render/sfx.js";
import { loadStyle } from "../src/render/style.js";
import { buildTimeline } from "../src/render/timeline.js";

const style = await loadStyle("data-story");

function film(scene: unknown): Film {
  const result = validateFilm({ spec: 1, title: "Test", style: "data-story", scenes: [scene] });
  if (!result.ok) throw new Error(result.errors.join("\n"));
  return result.film;
}

const events = (n: number) => Array.from({ length: n }, (_, i) => ({ date: String(2020 + i), label: `Event ${i + 1}` }));
const timeline = (n = 4) => film({ type: "timeline", heading: "So far", events: events(n), duration: 8 });
const roadmap = film({
  type: "roadmap",
  steps: [
    { label: "One", status: "done" },
    { label: "Two", status: "done", when: "Q2" },
    { label: "Three", status: "in-progress", when: "Now" },
    { label: "Four", status: "planned" },
    { label: "Five", status: "planned", when: "2027" },
  ],
  duration: 10,
});
const page = (f: Film) => buildPage(f, style, buildTimeline(f), layoutFor(f));
const ms = (attr: string, name: string) => [...attr.matchAll(new RegExp(`${name}:(\\d+)ms`, "g"))].map((m) => Number(m[1]));

describe("timeline and roadmap specs", () => {
  it("accept two to six items", () => {
    const check = (n: number) => validateFilm({ spec: 1, title: "T", style: "data-story", scenes: [{ type: "timeline", events: events(n), duration: 5 }] }).ok;
    expect([1, 2, 6, 7].map(check)).toEqual([false, true, true, false]);
  });

  it("only allow the three roadmap statuses", () => {
    const check = (status: string) =>
      validateFilm({ spec: 1, title: "T", style: "data-story", scenes: [{ type: "roadmap", steps: [{ label: "A", status }, { label: "B", status: "planned" }], duration: 5 }] }).ok;
    expect(["done", "in-progress", "planned", "doing"].map(check)).toEqual([true, true, true, false]);
  });

  it("validate both example films", async () => {
    for (const name of ["northside-coffee", "northside-story"]) {
      const json = JSON.parse(await readFile(new URL(`../examples/${name}/film.json`, import.meta.url), "utf8"));
      expect(validateFilm(json).ok, name).toBe(true);
    }
  });
});

describe("timelines", () => {
  const html = page(timeline(4));
  const dots = [...html.matchAll(/class="stop-dot pop" style="--d:(\d+)ms/g)].map((m) => Number(m[1]));
  const legs = [...html.matchAll(/class="leg-fill draw" style="([^"]+)"/g)].map((m) => m[1]!);

  it("has a stop for each event, and a leg between each pair", () => {
    expect(dots).toHaveLength(4);
    expect(html.match(/class="leg"/g)).toHaveLength(3);
    expect(legs).toHaveLength(3);
  });

  it("draws each leg so it reaches the next stop just as that stop appears", () => {
    legs.forEach((leg, i) => {
      const [start] = ms(leg, "--d");
      const [length] = ms(leg, "--draw-ms");
      expect(start).toBe(dots[i]);
      expect(start! + length!).toBeCloseTo(dots[i + 1]!, -1);
    });
  });

  it("brings stops in one after another while the narrator speaks", () => {
    for (let i = 1; i < dots.length; i++) expect(dots[i]).toBeGreaterThan(dots[i - 1]!);
  });

  it("pops each stop a little higher than the last", () => {
    const pops = filmCues(timeline(4), style, buildTimeline(timeline(4))).filter((c) => c.sound === "pop");
    expect(pops.map((c) => c.pitch)).toEqual([0, 2, 4, 6]);
  });
});

describe("roadmaps", () => {
  const html = page(roadmap);

  it("ticks done steps, rings the one in progress and fades planned ones", () => {
    expect(html.match(/class="stop done"/g)).toHaveLength(2);
    expect(html.match(/class="stop in-progress"/g)).toHaveLength(1);
    expect(html.match(/class="stop planned"/g)).toHaveLength(2);
    expect(html.match(/<svg viewBox="0 0 24 24"/g)).toHaveLength(2);
  });

  it("draws the line only as far as the work has got, leaving the rest as dashed road", () => {
    // Five steps: four legs. Steps 1 and 2 are done and 3 is in progress, so the first two legs draw.
    expect(html.match(/class="leg"/g)).toHaveLength(4);
    expect(html.match(/class="leg-fill draw"/g)).toHaveLength(2);
  });

  it("says each step's status, with its date", () => {
    expect(html).toContain(">Done · Q2<");
    expect(html).toContain(">In progress · Now<");
    expect(html).toContain(">Planned<");
  });

  it("draws nothing when nothing has started", () => {
    const f = film({ type: "roadmap", steps: [{ label: "A", status: "planned" }, { label: "B", status: "planned" }], duration: 4 });
    expect(page(f)).not.toContain(`class="leg-fill`);
  });

  it("sounds different for done, in progress and planned", () => {
    const sounds = filmCues(roadmap, style, buildTimeline(roadmap)).map((c) => c.sound);
    expect(sounds).toEqual(["tap", "tap", "pop", "click", "click"]);
  });
});

describe("compact agent instructions", () => {
  const source = "A\n<!-- compact: Short. -->\n<!-- full -->\nLong table\n<!-- /full -->\nB\n";

  it("keeps full-only parts for most agents, without the markers", () => {
    expect(shapeInstructions(source, false)).toBe("A\nLong table\nB\n");
  });

  it("swaps them for the short stand-ins in the compact version", () => {
    expect(shapeInstructions(source, true)).toBe("A\nShort.\nB\n");
  });

  it("leaves no markers in any agent's file, and gives Windsurf the compact one", async () => {
    for (const target of AGENT_TARGETS) {
      const text = await readFile(generatedPath(target), "utf8");
      expect(text, target.id).not.toMatch(/<!-- (full|\/full|compact:)/);
      expect(text.includes("| Preset | Shape | For |"), target.id).toBe(!target.compact);
      expect(text, target.id).toContain("| `roadmap` |");
    }
  });
});
