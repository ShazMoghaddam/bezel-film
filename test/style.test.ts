import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const hex = /^#[0-9A-F]{6}$/i;

describe("data-story style", async () => {
  const style = JSON.parse(await readFile("styles/data-story/style.json", "utf8"));

  it("uses valid hex colours", () => {
    const { palette, ...named } = style.colours;
    for (const colour of [...Object.values(named), ...palette]) expect(colour).toMatch(hex);
  });

  it("has a bold palette with a distinct colour per series", () => {
    expect(style.colours.palette.length).toBeGreaterThanOrEqual(6);
    expect(new Set(style.colours.palette).size).toBe(style.colours.palette.length);
  });
});
