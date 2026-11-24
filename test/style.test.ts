import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { allFontFiles, FONT_NAMES, FONT_PAIRINGS } from "../src/spec/fonts.js";
import { STYLES } from "../src/spec/styles.js";
import { loadStyle } from "../src/render/style.js";

const hex = /^#[0-9A-F]{6}$/i;

/** WCAG contrast ratio between two hex colours, from 1 (same) to 21 (black on white). */
function contrast(a: string, b: string): number {
  const luminance = (colour: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => {
      const c = parseInt(colour.slice(i, i + 2), 16) / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    }) as [number, number, number];
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

describe("the styles list", () => {
  it("matches the folders in styles/", async () => {
    const folders = (await readdir("styles", { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name).sort();
    expect([...STYLES].sort()).toEqual(folders);
  });
});

describe.each(STYLES)("the %s style", async (name) => {
  const style = await loadStyle(name);

  it("names itself after its folder", () => {
    expect(style.name).toBe(name);
  });

  it("uses valid hex colours", () => {
    const { palette, ...named } = style.colours;
    for (const colour of [...Object.values(named), ...palette]) expect(colour).toMatch(hex);
  });

  it("has a bold palette with a distinct colour per series", () => {
    expect(style.colours.palette.length).toBeGreaterThanOrEqual(6);
    expect(new Set(style.colours.palette).size).toBe(style.colours.palette.length);
  });

  // WCAG AA: 4.5 to 1 for text, 3 to 1 for large text and shapes like bars and lines.
  it("keeps its text readable on its background and surfaces", () => {
    for (const ground of [style.colours.background, style.colours.surface]) {
      expect(contrast(style.colours.text, ground)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(style.colours.muted, ground)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("keeps its accent and palette colours clear of its background", () => {
    for (const colour of [style.colours.accent, ...style.colours.palette]) {
      expect(contrast(colour, style.colours.background), colour).toBeGreaterThanOrEqual(3);
    }
  });

  it("has a theme and a font pairing", () => {
    expect(["dark", "light"]).toContain(style.theme);
    expect(FONT_NAMES).toContain(style.font);
  });
});

describe("fonts", () => {
  it("has every file the pairings use, with each font's licence", () => {
    for (const file of allFontFiles()) expect(existsSync(file), file).toBe(true);
    for (const id of new Set(allFontFiles().map((file) => file.split("/")[1]))) {
      expect(existsSync(`fonts/${id}/LICENSE`), id).toBe(true);
    }
  });

  it("records the characters every file covers", async () => {
    const { ranges } = JSON.parse(await readFile("fonts/manifest.json", "utf8"));
    expect(Object.keys(ranges).sort()).toEqual(allFontFiles());
  });

  it("has a pairing for every name, with the weights the page uses", () => {
    for (const name of FONT_NAMES) {
      const pairing = FONT_PAIRINGS[name];
      expect(pairing.name).toBe(name);
      expect(Object.keys(pairing.heading.weights)).toEqual(["600", "700"]);
      expect(Object.keys(pairing.body.weights)).toEqual(["400", "600"]);
      expect(Object.keys(pairing.mono.weights)).toEqual(["400", "600"]);
    }
  });
});

describe("styles made for custom scenes", () => {
  it("have a guide and an example film that uses them", async () => {
    for (const name of STYLES) {
      if (!existsSync(`styles/${name}/guide.md`)) continue;
      const film = JSON.parse(await readFile(`examples/${name}/film.json`, "utf8"));
      expect(film.style, name).toBe(name);
      expect(await readFile(`styles/${name}/guide.md`, "utf8"), name).toContain(`examples/${name}`);
    }
  });
});

describe("icons", () => {
  it("ships the line drawings with their licence", async () => {
    const icons = JSON.parse(await readFile("icons/icons.json", "utf8")) as Record<string, string[]>;
    expect(Object.keys(icons).length).toBeGreaterThan(5000);
    for (const name of ["coffee", "truck-delivery", "pig-money", "device-mobile"]) expect(icons[name]?.length, name).toBeGreaterThan(0);
    expect(existsSync("icons/LICENSE")).toBe(true);
  });
});
