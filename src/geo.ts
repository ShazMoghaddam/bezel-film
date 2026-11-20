/**
 * Places and the world map, from Natural Earth (public domain, see maps/CREDITS.md).
 *
 * Everything works offline: a city, country or region name is looked up in the
 * package's own data, and the world is drawn from its own outlines.
 */
import { readFileSync } from "node:fs";
import { geoGraticule10, geoNaturalEarth1, geoPath, type GeoProjection } from "d3-geo";
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";
import { feature, merge, mesh } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";

const root = new URL("../", import.meta.url);

export interface CountryInfo {
  name: string;
  names: string[];
  continent: string;
  region: string;
  /** Where to put a pin or an arc's end for the country, as [longitude, latitude]. */
  label: [number, number];
  /** A box around the mainland: [west, south, east, north]. */
  box: [number, number, number, number];
}
export type Country = Feature<Polygon | MultiPolygon, CountryInfo> & { id: string };

/** A point on the map, found from a name or given as coordinates. */
export interface Place {
  /** The name to show, spelled as the map data spells it. */
  name: string;
  lat: number;
  lon: number;
  kind: "city" | "country" | "point";
  /** The country's code (ISO 3166 alpha-3), when known. */
  country?: string;
}

export type PlaceRef = string | { lat: number; lon: number; name?: string };

/** Boxes for regions that don't match one country: [west, south, east, north]. */
export const REGIONS: Record<string, [number, number, number, number]> = {
  world: [-180, -58, 180, 84],
  europe: [-25, 34, 45, 71.5],
  africa: [-19, -36, 53, 38],
  asia: [25, -11, 150, 56],
  "middle east": [25, 12, 63, 42],
  "north america": [-170, 7, -50, 72],
  "central america": [-93, 7, -77, 19],
  caribbean: [-86, 10, -59, 27],
  "south america": [-82, -56, -34, 13],
  "latin america": [-118, -56, -34, 33],
  oceania: [110, -48, 180, 0],
  "southeast asia": [92, -11, 141, 24],
  "east asia": [100, 18, 146, 54],
  "south asia": [60, 5, 98, 37],
  scandinavia: [4, 54, 32, 71.5],
};

/** Lower case, no accents, no dots or extra spaces: "Côte d'Ivoire" and "cote divoire" meet. */
export function normalise(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[.'’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/^the /, "");
}

interface World {
  countries: Country[];
  byName: Map<string, Country>;
  topology: Topology;
  places: { name: string; ascii: string; region: string; country: string; lat: number; lon: number; population: number; key: string; asciiKey: string }[];
}

let world: World | undefined;

/** The map data, read once. */
export function loadWorld(): World {
  if (world) return world;
  const topology = JSON.parse(readFileSync(new URL("maps/world.json", root), "utf8")) as Topology;
  const collection = feature(topology, topology.objects.countries!) as unknown as FeatureCollection<Polygon | MultiPolygon, CountryInfo>;
  const countries = collection.features as Country[];
  const byName = new Map<string, Country>();
  for (const country of countries) for (const name of country.properties.names) if (!byName.has(normalise(name))) byName.set(normalise(name), country);
  const data = JSON.parse(readFileSync(new URL("maps/places.json", root), "utf8")) as { rows: [string, string, string, string, number, number, number][] };
  const places = data.rows.map(([name, ascii, region, country, lat, lon, population]) => ({
    name, ascii, region, country, lat, lon, population, key: normalise(name), asciiKey: normalise(ascii),
  }));
  world = { topology, countries, byName, places };
  return world;
}

export function findCountry(name: string): Country | undefined {
  return loadWorld().byName.get(normalise(name));
}

export function isRegion(name: string): boolean {
  return normalise(name) in REGIONS;
}

/**
 * Finds a place by name: a country ("Brazil"), a city ("Nairobi"), or a city with its
 * country or region to tell it apart ("Paris, France", "Portland, Oregon"). The
 * biggest match wins, so "Birmingham" is the English one. Coordinates are used as given.
 */
export function findPlace(ref: PlaceRef): Place | undefined {
  if (typeof ref !== "string") return { name: ref.name ?? "", lat: ref.lat, lon: ref.lon, kind: "point" };
  const [head, ...rest] = ref.split(",");
  const qualifier = rest.join(",").trim();
  if (!qualifier) {
    const country = findCountry(ref);
    if (country) return { name: country.properties.name, lon: country.properties.label[0], lat: country.properties.label[1], kind: "country", country: country.id };
  }
  const key = normalise(head!);
  const within = qualifier ? findCountry(qualifier) : undefined;
  const regionKey = normalise(qualifier);
  // Rows are biggest first, so the first match is the best known.
  const match = loadWorld().places.find(
    (p) => (p.key === key || p.asciiKey === key) && (!qualifier || p.country === within?.id || normalise(p.region) === regionKey),
  );
  return match ? { name: match.name, lat: match.lat, lon: match.lon, kind: "city", country: match.country } : undefined;
}

/** Edit distance, for "did you mean" suggestions. */
function distance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0]!;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const current = row[j]!;
      row[j] = Math.min(row[j]! + 1, row[j - 1]! + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = current;
    }
  }
  return row[b.length]!;
}

/** The closest known name to one we couldn't find, if any is close enough to be a typo. */
export function suggestPlace(name: string): string | undefined {
  const key = normalise(name.split(",")[0]!);
  const { countries, places } = loadWorld();
  const candidates = [
    ...countries.map((c) => c.properties.name),
    ...Object.keys(REGIONS).map((r) => r.replace(/\b\w/g, (c) => c.toUpperCase())),
    // Towns of any real size: enough to catch typos without suggesting somewhere obscure.
    ...places.filter((p) => p.population >= 100_000).map((p) => p.name),
  ];
  let best: string | undefined;
  let score = Math.max(2, Math.floor(key.length / 4)) + 1;
  for (const candidate of candidates) {
    const d = distance(key, normalise(candidate));
    if (d < score) [best, score] = [candidate, d];
  }
  return best;
}

// --- Drawing --------------------------------------------------------------------

/** The world is drawn into a box this size; the camera then fits any part of it to the frame. */
export const MAP_WIDTH = 1000;
export const MAP_HEIGHT = 520;

let projection: GeoProjection | undefined;
export function mapProjection(): GeoProjection {
  projection ??= geoNaturalEarth1().fitSize([MAP_WIDTH, MAP_HEIGHT], { type: "Sphere" });
  return projection;
}

/** Where a longitude and latitude land on the drawn map. */
export function project(lon: number, lat: number): [number, number] {
  const [x, y] = mapProjection()([lon, lat])!;
  return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
}

const path = () => geoPath(mapProjection()).digits(1);

/** One country's outline as an SVG path. */
export function countryPath(country: Country): string {
  return path()(country) ?? "";
}

let worldSvg: { land: string; borders: string; grid: string; sphere: string } | undefined;
/**
 * The world as SVG path data, drawn once per film: the land as one shape, each border
 * between two countries as one line (drawing every country's own outline would draw
 * each border twice, and is several times slower to paint), a faint grid and the
 * world's edge.
 */
export function worldPaths(): { land: string; borders: string; grid: string; sphere: string } {
  if (!worldSvg) {
    const draw = path();
    const { topology } = loadWorld();
    const countries = topology.objects.countries as GeometryCollection;
    worldSvg = {
      land: draw(merge(topology, countries.geometries as Parameters<typeof merge>[1])) ?? "",
      borders: draw(mesh(topology, countries, (a, b) => a !== b)) ?? "",
      grid: draw(geoGraticule10()) ?? "",
      sphere: draw({ type: "Sphere" }) ?? "",
    };
  }
  return worldSvg;
}

/** A [west, south, east, north] box on the drawn map, as [x0, y0, x1, y1]. */
export function projectBox([west, south, east, north]: [number, number, number, number]): [number, number, number, number] {
  // Follow the box's edges, since straight lines of longitude and latitude curve on this map.
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i <= 16; i++) {
    const lon = west + ((east - west) * i) / 16;
    const lat = south + ((north - south) * i) / 16;
    for (const [x, y] of [project(lon, south), project(lon, north), project(west, lat), project(east, lat)]) {
      xs.push(x);
      ys.push(y);
    }
  }
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}
