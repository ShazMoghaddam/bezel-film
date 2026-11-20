import {
  REGIONS,
  countryPath,
  findCountry,
  findPlace,
  normalise,
  project,
  projectBox,
  worldPaths,
  type Place,
  type PlaceRef,
} from "../geo.js";
import type { Scene } from "../spec/schema.js";
import type { MotionFeel } from "./motion.js";
import type { SceneCue, SoundName } from "./sfx.js";

/**
 * Map scenes. The world is drawn once per page as SVG and shared by every map. Each
 * map scene has a camera that flies from a wider view to its focus (see the runtime),
 * then countries fill in, pins drop and arcs draw as the narrator gets to them.
 *
 * Pins and labels sit in a layer above the map rather than inside it, so they stay
 * the same size however far the camera zooms.
 */

type MapScene = Extract<Scene, { type: "map" }>;
type Box = [number, number, number, number];
type Sound = (ms: number, name: SoundName, how?: Omit<SceneCue, "ms" | "sound">, extra?: string) => string;

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (char) => ESCAPES[char]!);
const delay = (ms: number, extra = "") => `style="--d:${Math.round(ms)}ms${extra ? `;${extra}` : ""}"`;

/** The whole world, as the camera's widest view. Leaves out most of Antarctica. */
export const WORLD_BOX: Box = projectBox(REGIONS.world!);
/** The camera never zooms closer than this (in map units, the world being 1000 wide): about a small country. */
const MIN_WIDTH = 70;
const MIN_HEIGHT = 44;

function place(ref: PlaceRef): Place {
  const found = findPlace(ref);
  // Validation has already checked every name, so this only guards against misuse.
  if (!found) throw new Error(`Couldn't find "${String(ref)}" on the map`);
  return found;
}

function grow([x0, y0, x1, y1]: Box, by: number): Box {
  const w = (x1 - x0) * by;
  const h = (y1 - y0) * by;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  return [cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2];
}

/** A box at least big enough to show some surroundings. */
function atLeast([x0, y0, x1, y1]: Box): Box {
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const w = Math.max(x1 - x0, MIN_WIDTH) / 2;
  const h = Math.max(y1 - y0, MIN_HEIGHT) / 2;
  return [cx - w, cy - h, cx + w, cy + h];
}

/** A box around everything the scene shows, or nothing if it shows nothing yet. */
function itemsBox(scene: MapScene): Box | undefined {
  const points: [number, number][] = [];
  for (const pin of scene.pins ?? []) points.push(projected(place(pin.place)));
  for (const arc of scene.arcs ?? []) points.push(projected(place(arc.from)), projected(place(arc.to)));
  const boxes: Box[] = (scene.countries ?? []).map((c) => projectBox(findCountry(c.country)!.properties.box));
  for (const [x, y] of points) boxes.push([x, y, x, y]);
  if (!boxes.length) return undefined;
  return [
    Math.min(...boxes.map((b) => b[0])),
    Math.min(...boxes.map((b) => b[1])),
    Math.max(...boxes.map((b) => b[2])),
    Math.max(...boxes.map((b) => b[3])),
  ];
}

/** Where the camera ends up: the scene's focus, or a view that holds everything on it. */
export function focusBox(scene: MapScene): Box {
  if (scene.focus) {
    const key = normalise(scene.focus);
    if (key === "world") return WORLD_BOX;
    const region = REGIONS[key];
    if (region) return projectBox(region);
    const found = place(scene.focus);
    if (found.kind === "country") return atLeast(grow(projectBox(findCountry(scene.focus)!.properties.box), 1.12));
    const [x, y] = project(found.lon, found.lat);
    return atLeast([x, y, x, y]);
  }
  const all = itemsBox(scene);
  if (!all) return WORLD_BOX;
  // Room around the edges for labels, and never wider than the whole world.
  const view = atLeast(grow(all, 1.3));
  return view[2] - view[0] > WORLD_BOX[2] - WORLD_BOX[0] ? WORLD_BOX : view;
}

const projected = (p: Place) => project(p.lon, p.lat);

/** Where the camera starts: the whole world, or for a world map, a little closer in. */
export function startBox(scene: MapScene, end: Box): Box {
  const whole = end[2] - end[0] >= (WORLD_BOX[2] - WORLD_BOX[0]) * 0.8;
  return whole ? grow(end, 0.86) : WORLD_BOX;
}

/** A gentle curve from one point to another, bowing towards the top of the map. */
function arcPath([x0, y0]: [number, number], [x1, y1]: [number, number]): string {
  const mx = (x0 + x1) / 2;
  const my = (y0 + y1) / 2;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const bend = 0.28;
  // Of the two sides the curve could bow to, take the one nearer the top.
  let nx = -dy * bend;
  let ny = dx * bend;
  if (ny > 0) [nx, ny] = [-nx, -ny];
  const r = (n: number) => Math.round(n * 10) / 10;
  return `M${r(x0)} ${r(y0)}Q${r(mx + nx)} ${r(my + ny)} ${r(x1)} ${r(y1)}`;
}

function formatValue(value: number, scene: MapScene): string {
  const text = value.toLocaleString("en-GB", { maximumFractionDigits: 2 });
  return `${scene.prefix ?? ""}${text}${scene.suffix ?? ""}`;
}

export interface MapTiming {
  /** When the narrator starts and stops talking, in ms into the scene. */
  from: number;
  to: number;
  stagger: number;
}

/**
 * A map scene's HTML. After the camera lands, things appear in order: countries
 * first (quickly, one after another), then each pin, then each arc, spread across
 * the narration so each turns up about as it's mentioned.
 */
export function mapBody(scene: MapScene, index: number, timing: MapTiming, feel: MotionFeel, palette: number, sound: Sound, heading: string): string {
  const countries = scene.countries ?? [];
  const pins = scene.pins ?? [];
  const arcs = scene.arcs ?? [];
  const landed = feel.flyMs + 150;
  const first = Math.max(landed, timing.from);
  const steps = (countries.length ? 1 : 0) + pins.length + arcs.length;
  const spread = (until: number) => (steps > 1 ? Math.min((Math.max(first, until) - first) / (steps - 1), 2500) : 0);
  // An arc takes a moment to draw, so when there are arcs the last one starts early
  // enough to land as the narrator finishes.
  const drawFor = (gap: number) => Math.round(Math.max(600, Math.min(gap * 0.8 || 1000, 1300)));
  const draw = drawFor(spread(timing.to - 300));
  const step = spread(timing.to - (arcs.length ? draw : 300));
  let slot = 0;
  const next = () => first + slot++ * step;

  // Countries: shaded by value when they have one, from the style's first colour for
  // the lowest to its accent for the highest (blending through the colours between, so
  // it brightens as it climbs), otherwise a colour each.
  const values = countries.map((c) => c.value).filter((v): v is number => v !== undefined);
  const low = Math.min(...values);
  const high = Math.max(...values);
  const countriesAt = countries.length ? next() : 0;
  const gap = countries.length > 1 ? Math.min(feel.flyMs / 3, 1200) / countries.length : 0;
  const shapes = countries
    .map((c, i) => {
      const country = findCountry(c.country)!;
      const colour =
        c.value === undefined
          ? `var(--p${i % palette})`
          : `color-mix(in oklch,var(--accent) ${Math.round(100 * (high > low ? (c.value - low) / (high - low) : 1))}%,var(--p0))`;
      // A few soft taps, rising, rather than one for every country of a long list.
      const at = countriesAt + i * gap;
      const style = i < 5 ? sound(at, "tap", { pitch: i * 2, gain: 0.7 }, `--c:${colour}`) : delay(at, `--c:${colour}`);
      return `<path class="shade" ${style} d="${countryPath(country)}"/>`;
    })
    .join("");

  // Pins: a dot that pops in, and a label beside it. The runtime places them.
  const pinHtml = pins
    .map((pin, i) => {
      const found = place(pin.place);
      const [x, y] = projected(found);
      const label = pin.label ?? found.name;
      const at = next();
      return `<div class="pin" data-x="${x}" data-y="${y}" style="--c:var(--p${i % palette})">
        <span class="pin-dot pop" ${sound(at, "pop", { pitch: i * 2 })}></span>
        ${label ? `<span class="pin-label rise" ${delay(at + timing.stagger)}>${escapeHtml(label)}</span>` : ""}
      </div>`;
    })
    .join("");

  // Arcs: a line that draws itself from one place to the other, with a dot at each end.
  const ends: string[] = [];
  const arcPaths = arcs
    .map((arc, i) => {
      const a = projected(place(arc.from));
      const b = projected(place(arc.to));
      const at = next();
      const colour = `--c:var(--p${(pins.length + i) % palette})`;
      ends.push(
        `<div class="pin end" data-x="${a[0]}" data-y="${a[1]}" style="${colour}"><span class="pin-dot pop" ${delay(at)}></span></div>`,
        `<div class="pin end" data-x="${b[0]}" data-y="${b[1]}" style="${colour}"><span class="pin-dot pop" ${sound(at + draw, "tap", { pitch: 3 + i, gain: 0.7 })}></span></div>`,
      );
      return `<path class="arc draw-line" pathLength="1" ${sound(at, "swish", { pitch: i - 2, gain: 0.8 }, `--draw-ms:${draw}ms;${colour}`)} d="${arcPath(a, b)}"/>`;
    })
    .join("");

  // The camera settles with a soft, low tap.
  sound(feel.flyMs, "tap", { pitch: -7, gain: 0.5 });

  const legend =
    values.length && (scene.legend || high > low)
      ? `<div class="map-legend rise" ${delay(countriesAt + timing.stagger)}>
          ${scene.legend ? `<span>${escapeHtml(scene.legend)}</span>` : ""}
          ${high > low ? `<span class="ramp-wrap"><b>${escapeHtml(formatValue(low, scene))}</b><i class="ramp"></i><b>${escapeHtml(formatValue(high, scene))}</b></span>` : ""}
        </div>`
      : "";

  return `<div class="map-wrap">
    ${heading}
    <div class="map" data-map="${index}">
      <svg class="map-svg" aria-hidden="true"><g class="map-camera">
        <use href="#bz-sphere" class="map-sea"/><use href="#bz-grid" class="map-grid"/><use href="#bz-land" class="map-land"/><use href="#bz-borders" class="map-borders"/>
        ${shapes}${arcPaths}
      </g></svg>
      <div class="map-pins">${ends.join("")}${pinHtml}</div>
    </div>
    ${legend}
  </div>`;
}

/** The world's outlines, once per page, for every map to share. */
export function mapDefs(): string {
  const { land, borders, grid, sphere } = worldPaths();
  return `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
<path id="bz-sphere" d="${sphere}"/><path id="bz-grid" d="${grid}"/><path id="bz-land" d="${land}"/><path id="bz-borders" d="${borders}"/>
</defs></svg>`;
}

/** The camera's path for each map scene, for the runtime. */
export function mapCamera(scene: MapScene, feel: MotionFeel) {
  const end = focusBox(scene);
  // What must stay in view. On a frame narrower than the focus, the camera may crop in
  // from the sides to fill the frame, but never so far that any of this is cut off.
  const items = itemsBox(scene);
  return { from: startBox(scene, end), to: end, keep: items ? grow(items, 1.25) : null, flyMs: feel.flyMs };
}

/** Map styles. --zoom is set by the runtime, so lines keep their width as the camera zooms. */
export const MAP_CSS = `
.map-wrap{width:100%;height:100%;display:flex;flex-direction:column;align-items:center;gap:calc(var(--u)*2.4)}
.map-wrap>.heading{text-align:center}
.map{position:relative;flex:1;width:100%;min-height:0;--zoom:1;
  -webkit-mask-image:linear-gradient(90deg,transparent,#000 5%,#000 95%,transparent),linear-gradient(180deg,transparent,#000 6%,#000 94%,transparent);
  -webkit-mask-composite:source-in;mask-image:linear-gradient(90deg,transparent,#000 5%,#000 95%,transparent),linear-gradient(180deg,transparent,#000 6%,#000 94%,transparent);mask-composite:intersect}
.map-svg{position:absolute;inset:0;width:100%;height:100%;overflow:hidden}
.map-sea{fill:color-mix(in srgb,var(--text) 2.5%,transparent);stroke:color-mix(in srgb,var(--text) 12%,transparent);stroke-width:calc(var(--u)*.15/var(--zoom))}
.map-grid{fill:none;stroke:color-mix(in srgb,var(--text) 5%,transparent);stroke-width:calc(var(--u)*.12/var(--zoom))}
.map-land{fill:color-mix(in srgb,var(--text) 11%,var(--bg))}
.map-borders{fill:none;stroke:var(--bg);stroke-width:calc(var(--u)*.14/var(--zoom))}
.shade{fill:var(--c);stroke:color-mix(in srgb,var(--c) 70%,#fff);stroke-width:calc(var(--u)*.16/var(--zoom));stroke-linejoin:round;
  animation:shade var(--enter) var(--ease) var(--d,0ms) both}
@keyframes shade{from{fill-opacity:0;stroke-opacity:0}to{fill-opacity:1;stroke-opacity:1}}
.arc{fill:none;stroke:var(--c);stroke-width:calc(var(--u)*.5/var(--zoom));stroke-linecap:round;stroke-dasharray:1 1}
.draw-line{animation:draw-line var(--draw-ms) cubic-bezier(.45,0,.2,1) var(--d,0ms) both}
/* Hidden until it starts: a round-ended line shows a dot even when it has no length yet. */
@keyframes draw-line{0%{stroke-dashoffset:1;stroke-opacity:0}1%{stroke-opacity:1}100%{stroke-dashoffset:0;stroke-opacity:1}}
.map-pins{position:absolute;inset:0;pointer-events:none}
.pin{position:absolute;left:0;top:0;width:0;height:0}
.pin-dot{position:absolute;left:calc(var(--pin)/-2);top:calc(var(--pin)/-2);width:var(--pin);height:var(--pin);border-radius:50%;
  background:var(--c);box-shadow:0 0 0 calc(var(--u)*.45) var(--bg),0 0 calc(var(--u)*2.4) color-mix(in srgb,var(--c) 70%,transparent)}
.map{--pin:calc(var(--u)*2.2)}
.pin.end{--pin:calc(var(--u)*1.2)}
.pin.end .pin-dot{box-shadow:0 0 0 calc(var(--u)*.3) var(--bg)}
.pin-label{position:absolute;top:0;white-space:nowrap;font-weight:700;font-size:calc(var(--u)*2.6);line-height:1;
  padding:calc(var(--u)*.7) calc(var(--u)*1.3);border-radius:calc(var(--u)*1);background:color-mix(in srgb,var(--bg) 78%,transparent);
  border:1px solid color-mix(in srgb,var(--c) 45%,transparent)}
.pin-label{left:calc(var(--pin)*.9);translate:0 -50%}
.pin.left .pin-label{left:auto;right:calc(var(--pin)*.9)}
.pin.above .pin-label{left:0;top:calc(var(--pin)*-.9);translate:-50% -100%}
.pin.below .pin-label{left:0;top:calc(var(--pin)*.9);translate:-50% 0}
.pin.ne .pin-label,.pin.se .pin-label{left:calc(var(--pin)*.5)}
.pin.nw .pin-label,.pin.sw .pin-label{left:auto;right:calc(var(--pin)*.5)}
.pin.ne .pin-label,.pin.nw .pin-label{top:calc(var(--pin)*-.6);translate:0 -100%}
.pin.se .pin-label,.pin.sw .pin-label{top:calc(var(--pin)*.6);translate:0 0}
.map-legend{display:flex;align-items:center;gap:calc(var(--u)*2);font-size:calc(var(--u)*2.3);color:var(--muted);font-weight:600}
.ramp-wrap{display:flex;align-items:center;gap:calc(var(--u)*1)}
.ramp-wrap b{color:var(--text);font-variant-numeric:tabular-nums}
.ramp{display:block;width:calc(var(--u)*14);height:calc(var(--u)*1.1);border-radius:99px;
  background:linear-gradient(90deg in oklch,var(--p0),var(--accent))}
.shape-square .pin-label{font-size:calc(var(--u)*3.1)}
.shape-square .map-legend{font-size:calc(var(--u)*2.8)}
.shape-square .map{--pin:calc(var(--u)*2.8)}
.shape-tall .pin-label{font-size:calc(var(--u)*3.5)}
.shape-tall .map-legend{font-size:calc(var(--u)*3.1);flex-direction:column;gap:calc(var(--u)*1)}
.shape-tall .map{--pin:calc(var(--u)*3.2)}`;
