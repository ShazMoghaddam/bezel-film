import type { Film, MotionLevel, Scene } from "../spec/schema.js";
import { MOTION_FEELS, countFor, motionVars, wordStagger, type MotionFeel } from "./motion.js";
import type { SceneCue, SoundName } from "./sfx.js";
import type { FontPairing } from "../spec/fonts.js";
import { fontFaceCss, fontVars, pairingFor } from "./fonts.js";
import type { Style } from "./style.js";
import type { Layout } from "./layout.js";
import type { Timeline, TimedScene } from "./timeline.js";
import { MAP_CSS, mapBody, mapCamera, mapDefs } from "./map.js";

/**
 * Builds the web page the film is drawn in. Every scene sits on the page at once,
 * stacked and transparent; the runtime (runtime.ts) shows the right one for each frame.
 *
 * All text from the film file is escaped before it goes into the page, and chart
 * data travels as JSON, so a film file can never inject code.
 */

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (char) => ESCAPES[char]!);
/** JSON that's safe inside a <script> tag. */
const safeJson = (value: unknown) => JSON.stringify(value).replace(/</g, "\\u003c");

/** Delay (ms) before an element's entrance, measured from the start of its scene. */
const delay = (ms: number, extra = "") => `style="--d:${Math.round(ms)}ms${extra ? `;${extra}` : ""}"`;

/** The motion level a scene uses: its own, then the film's, then the style's. */
export function motionLevel(film: Film, scene: Scene, style: Style): MotionLevel {
  return scene.motion ?? film.motion ?? style.motion.level;
}

/**
 * Big text that appears word by word in the livelier motion levels. The words keep
 * the spaces between them, so the heading wraps and balances as before. A
 * non-breaking space joins words into one, so "Moghaddam\u00a0·\u00a0London" never splits.
 */
function words(text: string, tag: string, classes: string, startMs: number, feel: MotionFeel): string {
  if (!feel.words) return `<${tag} class="rise ${classes}" ${delay(startMs)}>${escapeHtml(text)}</${tag}>`;
  const parts = text.split(/[ \t\r\n]+/).filter(Boolean);
  const gap = wordStagger(feel, parts.length);
  const spans = parts.map((word, i) => `<span class="word" ${delay(startMs + i * gap)}>${escapeHtml(word)}</span>`).join(" ");
  return `<${tag} class="${classes}">${spans}</${tag}>`;
}

/** How far into the scene the voice starts, so list items can appear as they're spoken. */
function speechWindow(timed: TimedScene): { from: number; to: number } {
  const first = timed.lines[0];
  const last = timed.lines.at(-1);
  if (!first || !last) return { from: 300, to: (timed.end - timed.start) * 1000 * 0.6 };
  return { from: (first.start - timed.start) * 1000, to: (last.end - timed.start) * 1000 };
}

/** Called for each sound an entrance makes: when (ms into the scene), which sound, and how. */
type Cue = (ms: number, sound: SoundName, how?: Omit<SceneCue, "ms" | "sound">) => void;

/**
 * A scene's HTML. Entrances that make a sound call `cue` with the same timing as
 * their animation, so sound and picture can't drift apart.
 */
function sceneBody(timed: TimedScene, style: Style, feel: MotionFeel, cue: Cue = () => {}): string {
  const scene: Scene = timed.scene;
  const stagger = style.motion.staggerMs * feel.staggerScale;
  const sound = (ms: number, name: SoundName, how?: Omit<SceneCue, "ms" | "sound">, extra?: string) => {
    cue(ms, name, how);
    return delay(ms, extra);
  };
  switch (scene.type) {
    case "title":
      return `<div class="center">
        ${words(scene.title, "h1", "display", 0, feel)}
        <div class="rule grow" ${sound(stagger * 3, "swish")}></div>
        ${scene.subtitle ? `<p class="rise lead muted" ${delay(stagger * 5)}>${escapeHtml(scene.subtitle)}</p>` : ""}
      </div>`;

    case "stat":
      return `<div class="center">
        <div class="pop stat-value" ${sound(0, "tap")} data-count="${escapeHtml(String(scene.value))}">${escapeHtml(String(scene.value))}</div>
        <div class="rise stat-label" ${delay(stagger * 3)}>${escapeHtml(scene.label)}</div>
        ${scene.context ? `<div class="pop" ${sound(stagger * 6, "pop", { gain: 0.8 })}><span class="chip">${escapeHtml(scene.context)}</span></div>` : ""}
      </div>`;

    case "chart":
      return `<div class="center wide">
        ${scene.chart.heading ? words(scene.chart.heading, "h2", "heading", 0, feel) : ""}
        <div class="card pop" ${sound(stagger * 2, "tap", { pitch: -5 })}><div class="chart-frame" data-chart="${timed.index}"></div></div>
      </div>`;

    case "points": {
      const { from, to } = speechWindow(timed);
      const step = scene.points.length > 1 ? (to - from) / scene.points.length : 0;
      const items = scene.points
        .map((point, i) => `<li class="slide" ${sound(from + i * step, "swish", { pan: feel.slidePoints ? -0.35 : 0, pitch: i }, `--c:var(--p${i % style.colours.palette.length})`)}><span class="dot"></span><span>${escapeHtml(point)}</span></li>`)
        .join("");
      return `<div class="column">
        ${scene.heading ? words(scene.heading, "h2", "heading", 0, feel) : ""}
        <ul class="points">${items}</ul>
      </div>`;
    }

    case "timeline":
    case "roadmap":
      return journey(timed, style, feel, sound);

    case "map": {
      const { from, to } = speechWindow(timed);
      const heading = scene.heading ? words(scene.heading, "h2", "heading", 0, feel) : "";
      return mapBody(scene, timed.index, { from, to, stagger }, feel, style.colours.palette.length, sound, heading);
    }

    case "code": {
      const highlight = new Set(scene.highlight ?? []);
      const lines = scene.code
        .replace(/\s+$/, "")
        .split("\n")
        .map((line, i) => `<span class="ln${highlight.has(i + 1) ? " hl" : ""}"><b>${i + 1}</b>${escapeHtml(line) || " "}</span>`)
        .join("");
      return `<div class="center wide">
        <figure class="code pop" ${sound(0, "tap", { pitch: -5 })}>
          <div class="code-bar"><i></i><i></i><i></i><span>${escapeHtml(scene.language)}</span></div>
          <pre><code>${lines}</code></pre>
        </figure>
        ${scene.caption ? `<p class="rise muted lead" ${delay(stagger * 4)}>${escapeHtml(scene.caption)}</p>` : ""}
      </div>`;
    }

    case "quote":
      return `<div class="column narrow">
        <div class="pop quote-mark" ${sound(0, "click")}>“</div>
        <blockquote class="rise quote" ${delay(stagger * 2)}>${escapeHtml(scene.quote)}</blockquote>
        ${scene.attribution ? `<p class="rise muted lead" ${delay(stagger * 5)}>${escapeHtml(scene.attribution)}</p>` : ""}
      </div>`;

    case "outro":
      return `<div class="center">
        ${words(scene.title, "h1", "display", 0, feel)}
        ${scene.cta ? `<div class="pop" ${sound(stagger * 4, "pop", { pitch: 2 })}><span class="cta">${escapeHtml(scene.cta)}</span></div>` : ""}
        ${
          scene.links
            ? `<div class="stickers">${scene.links
                .map((link, i) => {
                  const at = stagger * (scene.cta ? 5 : 4) + i * stagger * 1.4;
                  return `<span class="sticker pop" ${sound(at, "pop", { pitch: 2 + i * 2 }, `--tilt:${STICKER_TILTS[i % STICKER_TILTS.length]}deg`)}>${escapeHtml(link)}</span>`;
                })
                .join("")}</div>`
            : ""
        }
        ${scene.url ? `<p class="rise url" ${sound(stagger * (scene.links ? 5 + scene.links.length * 1.4 : 6), "click", { pitch: 5, gain: 0.8 })}>${escapeHtml(scene.url.replace(/^https?:\/\//, ""))}</p>` : ""}
      </div>`;

    case "custom":
      // The scene's own code draws everything inside this, full frame. Its sounds are listed in the film.
      for (const s of scene.sounds ?? []) {
        // With line, at counts from when that sentence starts, like kit.at(line).
        const sentence = s.line == null ? undefined : timed.lines[s.line];
        const from = sentence ? sentence.start - timed.start : 0;
        if (!s.for) {
          cue((from + s.at) * 1000, s.sound, { gain: s.gain, pitch: s.pitch });
          continue;
        }
        // Repeated across a span, like strokes of chalk while a line is written: every
        // 0.24 to 0.36 seconds, each a touch higher or lower and louder or softer. The
        // variation comes from the scene's place and the sound's start, so it never changes.
        let at = from + s.at;
        let n = 0;
        while (at < from + s.at + s.for - 0.05) {
          const r = (k: number) => ((Math.sin((timed.index + 1) * 12.9898 + (s.at * 10 + n) * 78.233 + k * 37.719) * 43758.5453) % 1 + 1) % 1;
          cue(at * 1000, s.sound, { gain: (s.gain ?? 1) * (0.7 + r(1) * 0.3), pitch: (s.pitch ?? 0) + (r(2) - 0.5) * 3 });
          at += 0.24 + r(3) * 0.12;
          n++;
        }
      }
      return `<div class="custom-root" data-custom="${timed.index}"></div>`;
  }
}

/** Each sticker leans a little, one way then the other, like tags stuck on by hand. */
const STICKER_TILTS = [-3, 2.2, -1.6, 2.8];

type Sound = (ms: number, name: SoundName, how?: Omit<SceneCue, "ms" | "sound">, extra?: string) => string;

const TICK = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const STATUS_WORDS = { done: "Done", "in-progress": "In progress", planned: "Planned" } as const;

/**
 * A timeline or a roadmap: stops along a line. Each stop appears as the narrator
 * reaches it, and the line draws itself so its tip arrives at each stop just as the
 * stop appears. On a roadmap it draws only as far as the work has got, and the rest
 * of the road is dashed. The CSS lays it out left to right on wide frames and top to
 * bottom on square and tall ones.
 */
function journey(timed: TimedScene, style: Style, feel: MotionFeel, sound: Sound): string {
  const scene = timed.scene;
  if (scene.type !== "timeline" && scene.type !== "roadmap") throw new Error("not a journey scene");
  const { from, to } = speechWindow(timed);
  const count = scene.type === "timeline" ? scene.events.length : scene.steps.length;
  const step = (to - from) / count;
  const at = (i: number) => from + i * step;
  const stagger = style.motion.staggerMs * feel.staggerScale;
  const text = (ms: number, cls: string, value: string) => `<span class="rise ${cls}" ${delay(ms)}>${escapeHtml(value)}</span>`;

  // Each stop but the last has a leg: the stretch of line to the next stop. It draws
  // in the time between the two stops appearing, so it meets the next one on time,
  // however much text either stop has. On a roadmap, legs past the step being worked
  // on (or the last one done) stay as dashed road.
  let reach = count - 1;
  const leg = (i: number) =>
    i === count - 1 ? "" : `<span class="leg">${i < reach ? `<span class="leg-fill draw" ${delay(at(i), `--draw-ms:${Math.round(step)}ms`)}></span>` : ""}</span>`;
  let stops: string;
  if (scene.type === "timeline") {
    stops = scene.events
      .map((event, i) => {
        const palette = style.colours.palette.length;
        const colour = `--c:var(--p${i % palette});--c-next:var(--p${(i + 1) % palette})`;
        return `<li class="stop" style="${colour}">${leg(i)}
          <span class="stop-dot pop" ${sound(at(i), "pop", { pitch: i * 2 })}></span>
          <span class="stop-text">${text(at(i) + stagger, "stop-when", event.date)}${text(at(i) + stagger * 2, "stop-label", event.label)}${event.detail ? text(at(i) + stagger * 3, "stop-detail muted", event.detail) : ""}</span>
        </li>`;
      })
      .join("");
  } else {
    const current = scene.steps.findIndex((s) => s.status === "in-progress");
    const lastDone = scene.steps.map((s) => s.status).lastIndexOf("done");
    reach = Math.max(current, lastDone, 0);
    stops = scene.steps
      .map((s, i) => {
        const cue = s.status === "done" ? sound(at(i), "tap", { pitch: i }) : s.status === "in-progress" ? sound(at(i), "pop", { pitch: i }) : sound(at(i), "click", { gain: 0.7 });
        const when = [STATUS_WORDS[s.status], s.when].filter(Boolean).join(" · ");
        return `<li class="stop ${s.status}">${leg(i)}
          <span class="stop-dot pop" ${cue}>${s.status === "done" ? TICK : ""}</span>
          <span class="stop-text">${text(at(i) + stagger, "stop-label", s.label)}${text(at(i) + stagger * 2, "stop-when", when)}</span>
        </li>`;
      })
      .join("");
  }
  return `<div class="column journey-wrap">
    ${scene.heading ? words(scene.heading, "h2", "heading", 0, feel) : ""}
    <ol class="journey ${scene.type}" style="--n:${count}">
      ${stops}
    </ol>
  </div>`;
}

/** The sounds a scene's entrances make, in the order they happen. */
export function sceneCues(film: Film, timed: TimedScene, style: Style): SceneCue[] {
  const cues: SceneCue[] = [];
  sceneBody(timed, style, MOTION_FEELS[motionLevel(film, timed.scene, style)], (ms, sound, how) => cues.push({ ms, sound, ...how }));
  return cues.sort((a, b) => a.ms - b.ms);
}

/** A fraction of the frame as CSS, e.g. 0.14 of the height as "14vh". */
const pct = (fraction: number, unit: "vw" | "vh") => `${+(fraction * 100).toFixed(3)}${unit}`;
/** Room kept above a platform's caption area for our own captions (up to three lines). */
const CAPTION_ROOM = "calc(var(--u)*16)";

/**
 * Where content and captions may go. Without a platform safe zone, the style's own
 * margin applies all round. With one, content stays centred inside it, and our
 * captions sit just above the platform's own caption area.
 */
function safeVars(frame: Layout, captions: boolean): string {
  const safe = frame.safe;
  if (!safe) return "--st:var(--safe);--sr:var(--safe);--sb:var(--safe);--sl:var(--safe);--cl:0;--cr:0;--cb:calc(var(--safe)*.55);--cw:76%;";
  // Content is centred, so both sides get the wider of the two margins. A button
  // column (TikTok's) only covers the lower right, so it doesn't push content off centre.
  const side = pct(Math.max(safe.left, safe.right), "vw");
  const bottom = pct(safe.bottom, "vh");
  return [
    `--st:${pct(safe.top, "vh")}`,
    `--sr:${side}`,
    `--sb:calc(${bottom} + ${captions ? CAPTION_ROOM : "var(--u)*2"})`,
    `--sl:${side}`,
    `--cl:${side}`,
    `--cr:${side}`,
    `--cb:calc(${bottom} + var(--u)*1.5)`,
    "--cw:100%;",
  ].join(";");
}

/** Type and spacing for each frame shape. Wide frames use the base sizes. */
function shapeCss(frame: Layout): string {
  if (frame.shape === "wide") return "";
  const shared = `.center,.column,.column.narrow{max-width:100%}
.journey-wrap{width:min(100%,calc(var(--u)*120))}
.journey{grid-template-columns:1fr}
.stop{--pad:calc(var(--u)*.9);flex-direction:row;align-items:flex-start;text-align:left;gap:calc(var(--u)*3.4);padding:var(--pad) 0}
.stop-text{gap:calc(var(--u)*.3);padding-top:calc((var(--dot) - 1.3em) / 2)}
.leg{left:calc((var(--dot) - var(--line)) / 2);width:var(--line);top:calc(var(--pad) + var(--dot) / 2);height:100%}
.leg-fill{transform-origin:center top;--draw-from:scaleY(0);background:linear-gradient(180deg,var(--c),var(--c-next,var(--c)))}
.roadmap .leg{background:repeating-linear-gradient(180deg,color-mix(in srgb,var(--muted) 45%,transparent) 0 calc(var(--u)*1.4),transparent 0 calc(var(--u)*2.4))}`;
  // Square and 4:5 frames are mostly seen in phone feeds, so text is a little larger.
  if (frame.shape === "square") {
    return `${shared}
.points li{font-size:calc(var(--u)*4.6)}
.journey{--dot:calc(var(--u)*4)}
.stop-label{font-size:calc(var(--u)*4.2)}
.stop-when{font-size:calc(var(--u)*2.8)}
.stop-detail{font-size:calc(var(--u)*3)}
.lead{font-size:calc(var(--u)*3.5)}
.caption span{font-size:calc(var(--u)*3.1)}`;
  }
  // Tall frames are seen on phones, held close, so text is larger and blocks stack.
  return `${shared}
.display{font-size:calc(var(--u)*11)}
.heading{font-size:calc(var(--u)*7)}
.lead{font-size:calc(var(--u)*3.9)}
.stat-label{font-size:calc(var(--u)*6.2)}
.chip{font-size:calc(var(--u)*3.2)}
.points{gap:calc(var(--u)*3.2)}
.points li{font-size:calc(var(--u)*5);align-items:flex-start}
.points .dot{margin-top:calc(var(--u)*1.4)}
.journey{--dot:calc(var(--u)*4.6)}
.stop-label{font-size:calc(var(--u)*5)}
.stop-when{font-size:calc(var(--u)*3.3)}
.stop-detail{font-size:calc(var(--u)*3.5)}
.quote{font-size:calc(var(--u)*6.6)}
.code pre{font-size:calc(var(--u)*3)}
.cta{font-size:calc(var(--u)*3.8)}
.url{font-size:calc(var(--u)*3.2)}
.stickers{flex-direction:column}
.sticker{font-size:calc(var(--u)*3.9)}
.caption span{font-size:calc(var(--u)*3.4)}`;
}

/** Blocks over the parts of the frame the platform covers, for checking a film by eye. */
function safeOverlay(frame: Layout): string {
  const safe = frame.safe;
  if (!safe) return "";
  const box = (css: string) => `<i style="${css}"></i>`;
  return `<div class="safe-overlay">
${box(`left:0;right:0;top:0;height:${pct(safe.top, "vh")}`)}
${box(`left:0;right:0;bottom:0;height:${pct(safe.bottom, "vh")}`)}
${box(`left:0;top:${pct(safe.top, "vh")};bottom:${pct(safe.bottom, "vh")};width:${pct(safe.left, "vw")}`)}
${box(`right:0;top:${pct(safe.top, "vh")};bottom:${pct(safe.bottom, "vh")};width:${pct(safe.right, "vw")}`)}
${safe.column ? box(`right:0;top:${pct(safe.column.from, "vh")};bottom:${pct(safe.bottom, "vh")};width:${pct(safe.column.width, "vw")}`) : ""}
</div>`;
}

/** One block of motion variables for each level the film uses. */
function motionCss(style: Style, levels: Set<MotionLevel>): string {
  return [...levels].map((level) => `.m-${level}{${motionVars(level, style.motion)}}`).join("\n");
}

function css(style: Style, fonts: FontPairing, frame: Layout, captions: boolean, levels: Set<MotionLevel>): string {
  const { colours, motion, layout } = style;
  const palette = colours.palette.map((colour, i) => `--p${i}:${colour};`).join("");
  return `
${fontFaceCss(fonts)}
:root{color-scheme:${style.theme};--bg:${colours.background};--surface:${colours.surface};--text:${colours.text};--muted:${colours.muted};--accent:${colours.accent};${palette}
  --u:calc(min(100vw,100vh)/100);--safe:${layout.safeArea * 100}vmin;${safeVars(frame, captions)}--ease:${motion.easing};--enter:${motion.enterMs}ms;
  ${fontVars()}}
*{box-sizing:border-box;margin:0;padding:0;animation-play-state:paused!important}
html,body{width:100%;height:100%;overflow:hidden;background:var(--bg);color:var(--text);font-family:var(--body);-webkit-font-smoothing:antialiased;text-rendering:geometricPrecision}
/* The backdrop and grain are empty layers each style paints in its style.css.
   The backdrop is oversized because the runtime drifts it slowly. */
.backdrop{position:absolute;inset:-20%;will-change:transform}
.grain{position:absolute;inset:0;pointer-events:none}
#stage{position:absolute;inset:0}
.scene{position:absolute;inset:0;padding:var(--st) var(--sr) var(--sb) var(--sl);display:flex;align-items:center;justify-content:center;opacity:0;--c:var(--p0)}
.center{display:flex;flex-direction:column;align-items:center;text-align:center;gap:calc(var(--u)*2.6);max-width:84%}
.center.wide{width:100%;max-width:100%}
.column{display:flex;flex-direction:column;gap:calc(var(--u)*3.4);width:fit-content;max-width:min(100%,calc(var(--u)*150))}
.column.narrow{max-width:min(100%,calc(var(--u)*120))}
/* Entrances. Each motion level (.m-calm, .m-lively, .m-punchy) sets the easing, length and distances.
   Opacity has its own short ease-out, so a spring's overshoot moves things without flickering them. */
.rise,.pop,.slide,.word{animation:var(--kf) var(--move-ms) var(--move-ease) var(--d,0ms) both,fade-in var(--enter) var(--ease) var(--d,0ms) both}
.rise{--kf:rise}.slide{--kf:slide}
.pop{--kf:pop;animation-duration:var(--pop-ms),var(--enter);animation-timing-function:var(--pop-ease),var(--ease)}
.word{--kf:word;display:inline-block}
.grow{animation:grow var(--rule-ms) var(--move-ease) var(--d,0ms) both}
@keyframes fade-in{from{opacity:0}to{opacity:1}}
@keyframes rise{from{transform:translateY(var(--rise-y))}to{transform:none}}
@keyframes pop{from{transform:translateY(var(--grow-y)) scale(var(--grow-from))}to{transform:none}}
@keyframes slide{from{transform:translate(var(--slide-x),var(--slide-y))}to{transform:none}}
@keyframes word{from{transform:translateY(var(--word-y))}to{transform:none}}
@keyframes grow{from{transform:scaleX(0)}to{transform:scaleX(1)}}
${motionCss(style, levels)}
.display{font-family:var(--heading);font-weight:700;font-size:calc(var(--u)*10);line-height:1.02;letter-spacing:-.025em;text-wrap:balance}
.heading{font-family:var(--heading);font-weight:700;font-size:calc(var(--u)*6);letter-spacing:-.02em;line-height:1.05}
.lead{font-size:calc(var(--u)*3.2);line-height:1.35;text-wrap:balance}
.muted{color:var(--muted)}
.rule{width:calc(var(--u)*22);height:calc(var(--u)*.9);border-radius:99px;transform-origin:left;
  background:linear-gradient(90deg,var(--p0),var(--p1),var(--p2),var(--p3))}
.stat-value{font-family:var(--heading);font-weight:700;font-size:calc(var(--u)*24);line-height:.95;letter-spacing:-.04em;font-variant-numeric:tabular-nums;color:var(--c)}
.stat-label{font-family:var(--heading);font-weight:600;font-size:calc(var(--u)*5);letter-spacing:-.01em}
.chip{display:inline-block;padding:calc(var(--u)*1) calc(var(--u)*2.4);border-radius:99px;font-weight:600;font-size:calc(var(--u)*2.6);
  color:var(--c);background:color-mix(in srgb,var(--c) 14%,transparent);border:1px solid color-mix(in srgb,var(--c) 40%,transparent)}
.card{padding:calc(var(--u)*3.4) calc(var(--u)*4);border-radius:calc(var(--u)*3);
  background:color-mix(in srgb,var(--surface) 88%,transparent);border:1px solid color-mix(in srgb,var(--text) 8%,transparent);
  box-shadow:0 calc(var(--u)*3) calc(var(--u)*8) rgb(0 0 0/.35)}
.chart-frame{position:relative}
.chart-frame bezel-chart{display:block;position:absolute;left:0;top:0;transform-origin:0 0}
.points{list-style:none;display:flex;flex-direction:column;gap:calc(var(--u)*2.4)}
.points li{display:flex;align-items:center;gap:calc(var(--u)*2.4);font-size:calc(var(--u)*4.2);font-weight:600;line-height:1.2}
.dot{flex:none;width:calc(var(--u)*2.2);height:calc(var(--u)*2.2);border-radius:50%;background:var(--c);box-shadow:0 0 calc(var(--u)*2.4) color-mix(in srgb,var(--c) 60%,transparent)}
/* Timelines and roadmaps: stops along a line, left to right on wide frames (the square
   and tall blocks turn it top to bottom). Each stop's leg reaches to the next stop's dot:
   across one equal-width column here, down one row there. */
.journey-wrap{width:min(100%,calc(var(--u)*165));max-width:none}
.journey{--dot:calc(var(--u)*3.4);--line:calc(var(--u)*.55);list-style:none;display:grid;grid-template-columns:repeat(var(--n),minmax(0,1fr))}
.stop{position:relative;display:flex;flex-direction:column;align-items:center;text-align:center;gap:calc(var(--u)*2);padding:0 calc(var(--u)*1.2)}
.stop-dot{position:relative;z-index:1;flex:none;width:var(--dot);height:var(--dot);border-radius:50%;display:grid;place-items:center;
  background:var(--c,var(--accent));color:var(--bg);box-shadow:0 0 0 calc(var(--u)*.7) var(--bg),0 0 calc(var(--u)*2.6) color-mix(in srgb,var(--c,var(--accent)) 55%,transparent)}
.stop-dot svg{width:62%;height:62%}
.stop-text{display:flex;flex-direction:column;gap:calc(var(--u)*.7)}
.stop-when{font-size:calc(var(--u)*2.3);font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--c,var(--accent))}
.stop-label{font-family:var(--heading);font-size:calc(var(--u)*3);font-weight:700;line-height:1.15;text-wrap:balance}
.stop-detail{font-size:calc(var(--u)*2.3);line-height:1.3;text-wrap:balance}
.leg{position:absolute;left:50%;width:100%;top:calc((var(--dot) - var(--line)) / 2);height:var(--line);border-radius:99px;
  background:color-mix(in srgb,var(--muted) 28%,transparent)}
.leg-fill{position:absolute;inset:0;border-radius:inherit;transform-origin:left center;--draw-from:scaleX(0);
  background:linear-gradient(90deg,var(--c),var(--c-next,var(--c)))}
.draw{animation:draw var(--draw-ms) linear var(--d,0ms) both}
@keyframes draw{from{transform:var(--draw-from)}to{transform:none}}
/* Roadmaps: done is ticked, in progress pulses, planned is faded on a dashed road. */
.roadmap .stop{--c:var(--accent)}
.roadmap .leg{background:repeating-linear-gradient(90deg,color-mix(in srgb,var(--muted) 45%,transparent) 0 calc(var(--u)*1.4),transparent 0 calc(var(--u)*2.4))}
.roadmap .stop-when{color:var(--muted)}
.roadmap .done .stop-when,.roadmap .in-progress .stop-when{color:var(--accent)}
.roadmap .in-progress .stop-dot{background:var(--bg);border:calc(var(--u)*.6) solid var(--accent)}
.roadmap .in-progress .stop-dot::before{content:"";width:40%;height:40%;border-radius:50%;background:var(--accent)}
.roadmap .in-progress .stop-dot::after{content:"";position:absolute;inset:calc(var(--u)*-.6);border-radius:50%;border:calc(var(--u)*.4) solid var(--accent);
  animation:halo 1.8s ease-out calc(var(--d,0ms) + 400ms) infinite both}
@keyframes halo{from{opacity:.7;transform:scale(1)}to{opacity:0;transform:scale(1.9)}}
.roadmap .planned .stop-dot{background:var(--bg);border:calc(var(--u)*.4) dashed var(--muted);box-shadow:0 0 0 calc(var(--u)*.7) var(--bg)}
.roadmap .planned .stop-text{opacity:.55}
.code{width:min(100%,calc(var(--u)*140));border-radius:calc(var(--u)*2.4);overflow:hidden;text-align:left;background:var(--surface);border:1px solid color-mix(in srgb,var(--text) 10%,transparent)}
.code-bar{display:flex;gap:calc(var(--u)*1);align-items:center;padding:calc(var(--u)*1.6) calc(var(--u)*2.4);background:color-mix(in srgb,var(--text) 5%,transparent)}
.code-bar i{width:calc(var(--u)*1.4);height:calc(var(--u)*1.4);border-radius:50%;background:var(--p1)}
.code-bar i:nth-child(2){background:var(--p3)}.code-bar i:nth-child(3){background:var(--p5,var(--p2))}
.code-bar span{margin-left:auto;font-family:var(--mono);font-size:calc(var(--u)*2);color:var(--muted)}
.code pre{padding:calc(var(--u)*2.4) 0;font-family:var(--mono);font-size:calc(var(--u)*2.7);line-height:1.6}
.ln{display:block;padding:0 calc(var(--u)*3) 0 calc(var(--u)*2);white-space:pre}
.ln b{display:inline-block;width:calc(var(--u)*5);font-weight:400;color:color-mix(in srgb,var(--muted) 60%,transparent);text-align:right;margin-right:calc(var(--u)*3)}
.code pre.wrap .ln{display:grid;grid-template-columns:calc(var(--u)*5) 1fr;column-gap:calc(var(--u)*3);white-space:pre-wrap;overflow-wrap:anywhere}
.code pre.wrap .ln b{margin:0}
.ln.hl{background:color-mix(in srgb,var(--accent) 14%,transparent);box-shadow:inset calc(var(--u)*.5) 0 var(--accent)}
.quote-mark{font-family:var(--heading);font-weight:700;font-size:calc(var(--u)*22);line-height:.6;color:var(--c);height:calc(var(--u)*10)}
.quote{font-family:var(--heading);font-weight:600;font-size:calc(var(--u)*5.6);line-height:1.2;letter-spacing:-.015em;text-wrap:balance}
.cta{display:inline-block;padding:calc(var(--u)*1.6) calc(var(--u)*4);border-radius:99px;font-weight:600;font-size:calc(var(--u)*3);color:var(--bg);background:var(--accent)}
.url{white-space:nowrap;max-width:100%;font-family:var(--mono);font-size:calc(var(--u)*2.6);color:var(--muted)}
.stickers{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:calc(var(--u)*1.8) calc(var(--u)*2.4);max-width:100%}
.sticker{display:inline-block;rotate:var(--tilt,0deg);white-space:nowrap;font-family:var(--mono);font-weight:600;font-size:calc(var(--u)*3.2);letter-spacing:.05em;
  padding:calc(var(--u)*.9) calc(var(--u)*1.7);border-radius:calc(var(--u)*.35);color:#15161A;background:var(--sticker,#FFE15A);
  box-shadow:0 calc(var(--u)*.5) calc(var(--u)*1.6) rgb(0 0 0 / .35)}
/* Custom scenes: the scene's code draws in a full-frame layer. The section keeps its
   padding, which tells the kit where the safe area is. */
.custom-root{position:absolute;inset:0;overflow:hidden}
.caption{position:absolute;left:var(--cl);right:var(--cr);bottom:var(--cb);margin:0 auto;width:fit-content;max-width:var(--cw);text-align:center;opacity:0}
.caption span{display:inline;padding:calc(var(--u)*.5) calc(var(--u)*1.6);border-radius:calc(var(--u)*1);font-weight:600;font-size:calc(var(--u)*2.8);line-height:1.6;
  color:#FFFFFF;background:rgb(0 0 0/.62);box-decoration-break:clone;-webkit-box-decoration-break:clone}
.safe-overlay i{position:absolute;background:rgb(255 45 85/.3);outline:2px dashed rgb(255 45 85/.85);outline-offset:-2px}
.progress{position:absolute;left:0;top:0;height:calc(var(--u)*.45);width:0;background:linear-gradient(90deg,var(--p0),var(--p1),var(--p3))}
${MAP_CSS}
${shapeCss(frame)}
/* The ${style.name} style */
${style.css}`;
}

/**
 * Charts are drawn at this size, then zoomed to fill the frame, so their text
 * scales with them and stays readable on video.
 */
const CHART_SIZES: Record<Layout["shape"], [number, number]> = { wide: [620, 250], square: [520, 340], tall: [400, 400] };
/** Round charts look best on a narrower canvas, with the legend close by. */
const ROUND_CHARTS = new Set(["donut", "ring", "gauge"]);

/** Everything the runtime needs to seek, sent to the page as JSON. */
export function runtimeData(film: Film, style: Style, timeline: Timeline, frame: Layout, options: PageOptions = {}) {
  const [chartWidth, chartHeight] = CHART_SIZES[frame.shape];
  return {
    fps: film.format.fps,
    // The page draws motion blur itself, unless the renderer is blending snapshots instead.
    pageBlur: !options.trueBlur,
    zoned: Boolean(frame.safe),
    duration: timeline.duration,
    transitionSeconds: style.motion.transitionMs / 1000,
    endFadeSeconds: 0.6,
    captions: film.captions,
    scenes: timeline.scenes.map((timed) => ({
      start: timed.start,
      end: timed.end,
      transition: timed.scene.transition ?? style.motion.transition,
      count: countFor(MOTION_FEELS[motionLevel(film, timed.scene, style)]),
      shutter: MOTION_FEELS[motionLevel(film, timed.scene, style)].shutter,
    })),
    maps: timeline.scenes
      .filter((timed) => timed.scene.type === "map")
      .map((timed) => ({
        scene: timed.index,
        ...mapCamera(timed.scene as Extract<Scene, { type: "map" }>, MOTION_FEELS[motionLevel(film, timed.scene, style)]),
      })),
    lines: timeline.scenes.flatMap((timed) => timed.lines.map((line) => ({ ...line, scene: timed.index }))),
    // What each custom scene's kit tells it: its length, its narration and its props.
    customs: timeline.scenes
      .filter((timed) => timed.scene.type === "custom")
      .map((timed) => {
        const scene = timed.scene as Extract<Scene, { type: "custom" }>;
        return {
          scene: timed.index,
          file: scene.file,
          duration: timed.end - timed.start,
          props: scene.props ?? {},
          lines: timed.lines.map((line) => ({ text: line.text, start: line.start - timed.start, end: line.end - timed.start })),
        };
      }),
    theme: style.theme,
    colours: style.colours,
    charts: timeline.scenes
      .filter((timed) => timed.scene.type === "chart")
      .map((timed) => {
        const { chart } = timed.scene as Extract<Scene, { type: "chart" }>;
        const round = ROUND_CHARTS.has(chart.type);
        return {
          scene: timed.index,
          type: chart.type,
          data: {
            ...chart.options,
            values: chart.values,
            labels: chart.labels,
            series: chart.series,
            prefix: chart.prefix,
            suffix: chart.suffix,
          },
          attributes: {
            theme: style.theme,
            frame: "none",
            background: "transparent",
            color: style.colours.palette.join(","),
            compact: "",
            "no-tooltips": "",
            "show-values": "",
            width: String(Math.round(round ? chartWidth * 0.8 : chartWidth)),
            // A round chart with its legend beside it is wider than tall, whatever the frame.
            height: String(round ? Math.min(chartHeight, Math.round(chartWidth * 0.6)) : chartHeight),
          },
        };
      }),
  };
}

export interface PageOptions {
  /** The film file's folder, where custom scene files and their pictures are. Defaults to the current folder. */
  baseDir?: string;
  /** Shade the parts of the frame the platform covers. */
  showSafeZones?: boolean;
  /**
   * Leave motion blur to the renderer, which blends several snapshots into each frame
   * (`--quality high`), instead of drawing it on the page.
   */
  trueBlur?: boolean;
}

/** The kit, then each custom scene's own file, loaded in order before the runtime. */
function customScripts(timeline: Timeline): string {
  const customs = timeline.scenes.filter((timed) => timed.scene.type === "custom");
  if (!customs.length) return "";
  return ['<script src="/icons.js"></script>', '<script src="/kit.js"></script>', ...customs.map((timed) => `<script src="/scenes/${timed.index}.js" data-scene="${timed.index}"></script>`)].join("\n");
}

export function buildPage(film: Film, style: Style, timeline: Timeline, frame: Layout, options: PageOptions = {}): string {
  const levels = new Set<MotionLevel>();
  const scenes = timeline.scenes
    .map((timed) => {
      const colour = `var(--p${timed.index % style.colours.palette.length})`;
      const level = motionLevel(film, timed.scene, style);
      levels.add(level);
      return `<section class="scene scene-${timed.scene.type} m-${level}" data-index="${timed.index}" style="--c:${colour}">${sceneBody(timed, style, MOTION_FEELS[level])}</section>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="en" data-theme="${style.theme}" data-style="${style.name}" class="shape-${frame.shape}">
<head>
<meta charset="utf-8">
<title>${escapeHtml(film.title)}</title>
<style>${css(style, pairingFor(film, style), frame, film.captions, levels)}</style>
</head>
<body>
<div class="backdrop"></div>
<div class="grain"></div>
${style.filters}
${timeline.scenes.some((timed) => timed.scene.type === "map") ? mapDefs() : ""}
<main id="stage">
${scenes}
</main>
<div class="caption"><span></span></div>
<div class="progress"></div>
${options.showSafeZones ? safeOverlay(frame) : ""}
<script>window.__BEZEL_DATA__ = ${safeJson(runtimeData(film, style, timeline, frame, options))};</script>
<script src="/bezel-charts.js"></script>
${customScripts(timeline)}
<script src="/runtime.js"></script>
</body>
</html>`;
}
