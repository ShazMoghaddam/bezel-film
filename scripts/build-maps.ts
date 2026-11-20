import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { geoArea, geoBounds } from "d3-geo";
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";
import { topology } from "topojson-server";
import { cacheDir } from "../src/render/voice.js";

/**
 * Builds the map data in maps/ from Natural Earth, which is in the public domain:
 *
 * - world.json: every country's outline (1:50 million scale, detailed enough to zoom
 *   into one country) as compact TopoJSON, with the names people call it by, its
 *   continent, and a box around its mainland to zoom to.
 * - places.json: 7,000-odd cities and towns, with their region, country and population,
 *   so "London" or "Portland, Oregon" can be found without going online.
 *
 * Sources are pinned to one commit and checked against a fingerprint. Run with
 * `npm run maps`. Only maintainers need to run it; the result is committed.
 */

const root = fileURLToPath(new URL("..", import.meta.url));
const OUT = join(root, "maps");
const REPO = "nvkelso/natural-earth-vector";
const COMMIT = "ca96624a56bd078437bca8184e78163e5039ad19";
const SOURCES = {
  countries: { path: "geojson/ne_50m_admin_0_countries.geojson", sha256: "3e458fc036ad0a66411f2c1e6cac49c5d7bfb81cb1123bc513b22511a2b7fdeb" },
  places: { path: "geojson/ne_10m_populated_places_simple.geojson", sha256: "fd3fa867a320cbd5c5b6bb5bc550afeec2939fb2cef688e508007282a55ac42f" },
};

/** Names people use that Natural Earth doesn't list, by ISO code. */
const EXTRA_NAMES: Record<string, string[]> = {
  GBR: ["UK", "Britain", "Great Britain"],
  USA: ["US", "USA", "America", "United States of America"],
  ARE: ["UAE", "Emirates"],
  KOR: ["Korea"],
  PRK: ["DPRK"],
  RUS: ["Russia"],
  CZE: ["Czech Republic"],
  NLD: ["Holland"],
  CIV: ["Ivory Coast"],
  COD: ["DRC", "DR Congo"],
  MMR: ["Burma"],
  SWZ: ["Swaziland"],
  MKD: ["Macedonia"],
  TUR: ["Turkey", "Türkiye"],
  CPV: ["Cape Verde"],
  TLS: ["East Timor"],
  VAT: ["Vatican"],
};

async function download(source: { path: string; sha256: string }): Promise<string> {
  const file = join(cacheDir(), "map-sources", COMMIT, source.path);
  if (!existsSync(file)) {
    const response = await fetch(`https://raw.githubusercontent.com/${REPO}/${COMMIT}/${source.path}`);
    if (!response.ok) throw new Error(`Download failed (${response.status}): ${source.path}`);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, Buffer.from(await response.arrayBuffer()));
  }
  const text = await readFile(file, "utf8");
  const sha256 = createHash("sha256").update(text).digest("hex");
  if (sha256 !== source.sha256) throw new Error(`${source.path} isn't the file we checked (fingerprint ${sha256})`);
  return text;
}

const round = (n: number, places = 3) => Math.round(n * 10 ** places) / 10 ** places;

/** The box around a country's biggest piece of land, so France zooms to France, not to French Guiana too. */
function mainlandBox(geometry: Polygon | MultiPolygon): [number, number, number, number] {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  let biggest = polygons[0]!;
  let area = -1;
  for (const coordinates of polygons) {
    const a = geoArea({ type: "Polygon", coordinates });
    if (a > area) [biggest, area] = [coordinates, a];
  }
  const [[west, south], [east, north]] = geoBounds({ type: "Polygon", coordinates: biggest });
  return [round(west, 2), round(south, 2), round(east, 2), round(north, 2)];
}

const countries = JSON.parse(await download(SOURCES.countries)) as FeatureCollection<Polygon | MultiPolygon, Record<string, unknown>>;
const slim: Feature<Polygon | MultiPolygon>[] = countries.features.map((feature) => {
  const p = feature.properties;
  const code = String(p.ISO_A3_EH !== "-99" ? p.ISO_A3_EH : p.ADM0_A3);
  const names = new Set<string>();
  for (const key of ["NAME", "NAME_LONG", "ADMIN", "FORMAL_EN", "NAME_EN", "BRK_NAME", "GEOUNIT", "SUBUNIT", "NAME_ALT"]) {
    const value = p[key];
    if (typeof value === "string" && value.trim()) names.add(value.trim());
  }
  for (const key of ["ISO_A2_EH", "ISO_A3_EH", "ADM0_A3"]) if (typeof p[key] === "string" && p[key] !== "-99") names.add(String(p[key]));
  for (const extra of EXTRA_NAMES[code] ?? []) names.add(extra);
  return {
    type: "Feature",
    id: code,
    geometry: feature.geometry,
    properties: {
      name: String(p.NAME),
      names: [...names],
      continent: String(p.CONTINENT),
      region: String(p.SUBREGION),
      label: [round(Number(p.LABEL_X)), round(Number(p.LABEL_Y))],
      box: mainlandBox(feature.geometry),
    },
  };
});
// Quantised to 100,000 steps across the world: about 400 metres, finer than any frame shows.
const world = topology({ countries: { type: "FeatureCollection", features: slim } as FeatureCollection }, 1e5);

const places = JSON.parse(await download(SOURCES.places)) as FeatureCollection<null, Record<string, unknown>>;
// One row per place, biggest first: [name, ascii name, region, country code, latitude, longitude, population].
const rows = places.features
  .map((f) => f.properties)
  .map((p) => [p.name, p.nameascii, p.adm1name ?? "", p.adm0_a3, round(Number(p.latitude)), round(Number(p.longitude)), Number(p.pop_max) || 0] as const)
  .sort((a, b) => b[6] - a[6]);

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
await writeFile(join(OUT, "world.json"), JSON.stringify(world));
await writeFile(join(OUT, "places.json"), JSON.stringify({ columns: ["name", "ascii", "region", "country", "lat", "lon", "population"], rows }));
await writeFile(
  join(OUT, "CREDITS.md"),
  `# Map credits

Made with [Natural Earth](https://www.naturalearthdata.com). Free vector and raster map data @ naturalearthdata.com.
Natural Earth is in the public domain: no permission is needed and credit isn't required, but it's given gladly.

- \`world.json\`: Admin 0 countries at 1:50 million scale (\`${SOURCES.countries.path}\`)
- \`places.json\`: populated places, simple (\`${SOURCES.places.path}\`)

Built from [\`${REPO}\`](https://github.com/${REPO}) at commit \`${COMMIT}\` by \`scripts/build-maps.ts\`, which checks each file against its fingerprint, keeps only what Bezel Film uses, and adds a few everyday names (UK, USA, Holland…).

Country borders and names follow Natural Earth's own choices, which show who controls each area on the ground. They aren't a view on any dispute.
`,
);
console.log(`✓ ${slim.length} countries and ${rows.length} places in maps/`);
