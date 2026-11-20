import { describe, expect, it } from "vitest";
import { validateFilm, type Film } from "../src/index.js";
import { findCountry, findPlace, normalise, project, suggestPlace } from "../src/geo.js";
import { layoutFor } from "../src/render/layout.js";
import { WORLD_BOX, focusBox, mapCamera } from "../src/render/map.js";
import { MOTION_FEELS } from "../src/render/motion.js";
import { buildPage, sceneCues } from "../src/render/page.js";
import { loadStyle } from "../src/render/style.js";
import { buildTimeline } from "../src/render/timeline.js";

const style = await loadStyle("data-story");
const check = (scene: unknown) => validateFilm({ spec: 1, title: "Map", style: "data-story", scenes: [{ type: "map", duration: 8, ...(scene as object) }] });

function film(scene: unknown): Film {
  const result = check(scene);
  if (!result.ok) throw new Error(result.errors.join("\n"));
  return result.film;
}
const mapOf = (f: Film) => f.scenes[0] as Extract<Film["scenes"][number], { type: "map" }>;
const page = (f: Film) => buildPage(f, style, buildTimeline(f), layoutFor(f));

describe("place names", () => {
  it("find countries by everyday names and codes", () => {
    for (const name of ["UK", "Britain", "United Kingdom", "GBR", "the UK"]) expect(findPlace(name)?.country).toBe("GBR");
    expect(findPlace("Ivory Coast")?.name).toBe(findPlace("Côte d'Ivoire")?.name);
    expect(findPlace("Iran")?.kind).toBe("country");
  });

  it("find cities, the biggest first, and tell them apart with a country or region", () => {
    expect(findPlace("Birmingham")?.country).toBe("GBR");
    expect(findPlace("Portland, Oregon")?.country).toBe("USA");
    expect(findPlace("Paris, France")?.country).toBe("FRA");
    expect(findPlace("Sao Paulo")?.name).toBe("São Paulo");
  });

  it("use coordinates as given", () => {
    expect(findPlace({ lat: 51.5, lon: -0.1, name: "Office" })).toEqual({ name: "Office", lat: 51.5, lon: -0.1, kind: "point" });
  });

  it("ignore accents, case, dots and a leading 'the'", () => {
    expect(normalise("  The Côte d'Ivoire ")).toBe("cote divoire");
    expect(normalise("U.S.A.")).toBe("usa");
  });

  it("suggest the closest name for a typo, and nothing for nonsense", () => {
    expect(suggestPlace("Londn")).toBe("London");
    expect(suggestPlace("Brasil")).toBe("Brazil");
    expect(suggestPlace("Qwxzvbnm")).toBeUndefined();
  });

  it("keep each country's mainland box away from far-off territories", () => {
    // France's box is mainland France, not stretched to French Guiana.
    const [west, , east] = findCountry("France")!.properties.box;
    expect(west).toBeGreaterThan(-6);
    expect(east).toBeLessThan(10);
  });
});

describe("map specs", () => {
  it("reject unknown places with a suggestion and a way out", () => {
    const result = check({ pins: [{ place: "Londn" }] });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual([expect.stringContaining('scenes[0].pins[0].place: couldn\'t find "Londn" on the map. Did you mean "London"?')]);
      expect(result.errors[0]).toContain('"lat"');
    }
  });

  it("check every place: focus, countries and both ends of each arc", () => {
    const result = check({ focus: "Atlantis", countries: [{ country: "Narnia" }], arcs: [{ from: "London", to: "Gondor" }] });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.map((e) => e.split(":")[0])).toEqual(["scenes[0].focus", "scenes[0].arcs[0].to", "scenes[0].countries[0].country"]);
    }
  });

  it("accept regions as a focus", () => {
    expect(check({ focus: "Europe" }).ok).toBe(true);
    expect(check({ focus: "south east asia" }).ok).toBe(false);
    expect(check({ focus: "Southeast Asia" }).ok).toBe(true);
  });

  it("need something to show", () => {
    expect(check({}).ok).toBe(false);
    expect(check({ heading: "Nothing here" }).ok).toBe(false);
  });

  it("give every country a value, or none", () => {
    expect(check({ countries: [{ country: "France", value: 3 }, { country: "Spain" }] }).ok).toBe(false);
    expect(check({ countries: [{ country: "France", value: 3 }, { country: "Spain", value: 1 }] }).ok).toBe(true);
  });

  it("limit pins and arcs so labels stay readable", () => {
    const pins = (n: number) => Array.from({ length: n }, () => ({ place: "Paris" }));
    expect(check({ pins: pins(8) }).ok).toBe(true);
    expect(check({ pins: pins(9) }).ok).toBe(false);
  });
});

describe("map camera", () => {
  it("frames everything shown when there's no focus", () => {
    const f = film({ pins: [{ place: "Lisbon" }, { place: "Helsinki" }] });
    const [x0, y0, x1, y1] = focusBox(mapOf(f));
    for (const city of ["Lisbon", "Helsinki"]) {
      const p = findPlace(city)!;
      const [x, y] = project(p.lon, p.lat);
      expect(x).toBeGreaterThan(x0);
      expect(x).toBeLessThan(x1);
      expect(y).toBeGreaterThan(y0);
      expect(y).toBeLessThan(y1);
    }
  });

  it("never zooms in closer than a small country", () => {
    const [x0, y0, x1, y1] = focusBox(mapOf(film({ pins: [{ place: "Paris" }] })));
    expect(x1 - x0).toBeGreaterThanOrEqual(70);
    expect(y1 - y0).toBeGreaterThanOrEqual(44);
  });

  it("flies in from the whole world, or for a world map, pulls gently back", () => {
    const zoomed = mapCamera(mapOf(film({ focus: "Japan" })), MOTION_FEELS.lively);
    expect(zoomed.from).toEqual(WORLD_BOX);
    const world = mapCamera(mapOf(film({ focus: "world" })), MOTION_FEELS.lively);
    expect(world.to).toEqual(WORLD_BOX);
    expect(world.from[2] - world.from[0]).toBeLessThan(WORLD_BOX[2] - WORLD_BOX[0]);
  });

  it("takes longer in calm motion than in punchy", () => {
    expect(MOTION_FEELS.calm.flyMs).toBeGreaterThan(MOTION_FEELS.lively.flyMs);
    expect(MOTION_FEELS.lively.flyMs).toBeGreaterThan(MOTION_FEELS.punchy.flyMs);
  });
});

describe("map pages", () => {
  const beans = film({
    heading: "Where our beans come from",
    pins: [{ place: "Colombia" }, { place: "Ethiopia" }, { place: "London", label: "Roasted here" }],
    arcs: [{ from: "Colombia", to: "London" }, { from: "Ethiopia", to: "London" }],
    duration: 9,
  });

  it("draw the world once and share it", () => {
    const html = page(beans);
    expect(html.match(/id="bz-land"/g)).toHaveLength(1);
    expect(html).toContain('<use href="#bz-land"');
  });

  it("leave the world out of pages without a map", () => {
    const f = validateFilm({ spec: 1, title: "T", style: "data-story", scenes: [{ type: "title", title: "Hi", duration: 2 }] });
    if (!f.ok) throw new Error();
    expect(page(f.film)).not.toContain("bz-land");
  });

  it("escape labels", () => {
    const html = page(film({ pins: [{ place: "Paris", label: "<b>Shop</b>" }] }));
    expect(html).toContain("&lt;b&gt;Shop&lt;/b&gt;");
    expect(html).not.toContain("<b>Shop</b>");
  });

  it("bring things in only after the camera lands, and finish arcs before the scene ends", () => {
    const html = page(beans);
    const map = html.slice(html.indexOf('<div class="map"'));
    const delays = [...map.matchAll(/--d:(\d+)ms/g)].map((m) => Number(m[1]));
    expect(Math.min(...delays)).toBeGreaterThanOrEqual(MOTION_FEELS.lively.flyMs);
    const arcs = [...html.matchAll(/class="arc draw-line"[^>]*--d:(\d+)ms;--draw-ms:(\d+)ms/g)].map((m) => Number(m[1]) + Number(m[2]));
    expect(arcs).toHaveLength(2);
    for (const end of arcs) expect(end).toBeLessThanOrEqual(9000);
  });

  it("make a sound for the landing, each pin and each arc", () => {
    const f = beans;
    const cues = sceneCues(f, buildTimeline(f).scenes[0]!, style);
    const count = (name: string) => cues.filter((c) => c.sound === name).length;
    expect(count("pop")).toBe(3);
    expect(count("swish")).toBe(2);
    expect(cues[0]).toMatchObject({ ms: MOTION_FEELS.lively.flyMs, sound: "tap" });
  });

  it("shade countries by value and show a legend", () => {
    const html = page(film({ countries: [{ country: "France", value: 10 }, { country: "Spain", value: 40 }], legend: "Orders", suffix: "k" }));
    expect(html).toContain("var(--accent) 0%");
    expect(html).toContain("var(--accent) 100%");
    expect(html).toContain("10k");
    expect(html).toContain("40k");
    expect(html).toContain("Orders");
  });
});
