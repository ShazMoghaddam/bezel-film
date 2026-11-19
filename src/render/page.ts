import type { Film, MotionLevel, Scene } from "../spec/schema.js";
import { MOTION_FEELS, countFor, motionVars, wordStagger, type MotionFeel } from "./motion.js";
import type { SceneCue, SoundName } from "./sfx.js";
import type { Style } from "./style.js";
import type { Layout } from "./layout.js";
import type { Timeline, TimedScene } from "./timeline.js";

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
 * the spaces between them, so the heading wraps and balances as before.
 */
function words(text: string, tag: string, classes: string, startMs: number, feel: MotionFeel): string {
  if (!feel.words) return `<${tag} class="rise ${classes}" ${delay(startMs)}>${escapeHtml(text)}</${tag}>`;
  const parts = text.split(/\s+/).filter(Boolean);
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
        ${scene.url ? `<p class="rise url" ${sound(stagger * 6, "click", { pitch: 5, gain: 0.8 })}>${escapeHtml(scene.url.replace(/^https?:\/\//, ""))}</p>` : ""}
      </div>`;

    case "custom":
      throw new Error(`Custom scenes aren't supported by the renderer yet (scene ${timed.index + 1}).`);
  }
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
  const shared = `.center,.column,.column.narrow{max-width:100%}`;
  // Square and 4:5 frames are mostly seen in phone feeds, so text is a little larger.
  if (frame.shape === "square") {
    return `${shared}
.points li{font-size:calc(var(--u)*4.6)}
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
.quote{font-size:calc(var(--u)*6.6)}
.code pre{font-size:calc(var(--u)*3)}
.cta{font-size:calc(var(--u)*3.8)}
.url{font-size:calc(var(--u)*3.2)}
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

function css(style: Style, frame: Layout, captions: boolean, levels: Set<MotionLevel>): string {
  const { colours, fonts, motion, layout } = style;
  const palette = colours.palette.map((colour, i) => `--p${i}:${colour};`).join("");
  return `
@font-face{font-family:"${fonts.heading}";font-weight:600;src:url(/fonts/heading-600.woff2) format("woff2")}
@font-face{font-family:"${fonts.heading}";font-weight:700;src:url(/fonts/heading-700.woff2) format("woff2")}
@font-face{font-family:"${fonts.body}";font-weight:400;src:url(/fonts/body-400.woff2) format("woff2")}
@font-face{font-family:"${fonts.body}";font-weight:600;src:url(/fonts/body-600.woff2) format("woff2")}
@font-face{font-family:"${fonts.mono}";font-weight:400;src:url(/fonts/mono-400.woff2) format("woff2")}
:root{--bg:${colours.background};--surface:${colours.surface};--text:${colours.text};--muted:${colours.muted};--accent:${colours.accent};${palette}
  --u:calc(min(100vw,100vh)/100);--safe:${layout.safeArea * 100}vmin;${safeVars(frame, captions)}--ease:${motion.easing};--enter:${motion.enterMs}ms;
  --heading:"${fonts.heading}",system-ui,sans-serif;--body:"${fonts.body}",system-ui,sans-serif;--mono:"${fonts.mono}",ui-monospace,monospace}
*{box-sizing:border-box;margin:0;padding:0;animation-play-state:paused!important}
html,body{width:100%;height:100%;overflow:hidden;background:var(--bg);color:var(--text);font-family:var(--body);-webkit-font-smoothing:antialiased;text-rendering:geometricPrecision}
.backdrop,.grain{will-change:transform}
.backdrop{position:absolute;inset:-20%;background:
  radial-gradient(40% 45% at 20% 25%,color-mix(in srgb,var(--p0) 16%,transparent),transparent 70%),
  radial-gradient(35% 40% at 85% 75%,color-mix(in srgb,var(--p1) 13%,transparent),transparent 70%),
  radial-gradient(30% 35% at 70% 15%,color-mix(in srgb,var(--p2) 10%,transparent),transparent 70%)}
.grain{position:absolute;inset:0;background-image:radial-gradient(color-mix(in srgb,var(--text) 5%,transparent) 1px,transparent 1px);background-size:calc(var(--u)*2.4) calc(var(--u)*2.4);mask-image:radial-gradient(ellipse at center,#000 30%,transparent 80%);opacity:.5}
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
.caption{position:absolute;left:var(--cl);right:var(--cr);bottom:var(--cb);margin:0 auto;width:fit-content;max-width:var(--cw);text-align:center;opacity:0}
.caption span{display:inline;padding:calc(var(--u)*.5) calc(var(--u)*1.6);border-radius:calc(var(--u)*1);font-weight:600;font-size:calc(var(--u)*2.8);line-height:1.6;
  background:rgb(0 0 0/.62);box-decoration-break:clone;-webkit-box-decoration-break:clone}
.safe-overlay i{position:absolute;background:rgb(255 45 85/.3);outline:2px dashed rgb(255 45 85/.85);outline-offset:-2px}
.progress{position:absolute;left:0;top:0;height:calc(var(--u)*.45);width:0;background:linear-gradient(90deg,var(--p0),var(--p1),var(--p3))}
${shapeCss(frame)}`;
}

/**
 * Charts are drawn at this size, then zoomed to fill the frame, so their text
 * scales with them and stays readable on video.
 */
const CHART_SIZES: Record<Layout["shape"], [number, number]> = { wide: [620, 250], square: [520, 340], tall: [400, 400] };
/** Round charts look best on a narrower canvas, with the legend close by. */
const ROUND_CHARTS = new Set(["donut", "ring", "gauge"]);

/** Everything the runtime needs to seek, sent to the page as JSON. */
export function runtimeData(film: Film, style: Style, timeline: Timeline, frame: Layout) {
  const [chartWidth, chartHeight] = CHART_SIZES[frame.shape];
  return {
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
    })),
    lines: timeline.scenes.flatMap((timed) => timed.lines.map((line) => ({ ...line, scene: timed.index }))),
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
            theme: "dark",
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
  /** Shade the parts of the frame the platform covers. */
  showSafeZones?: boolean;
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
<html lang="en" data-theme="dark" class="shape-${frame.shape}">
<head>
<meta charset="utf-8">
<title>${escapeHtml(film.title)}</title>
<style>${css(style, frame, film.captions, levels)}</style>
</head>
<body>
<div class="backdrop"></div>
<div class="grain"></div>
<main id="stage">
${scenes}
</main>
<div class="caption"><span></span></div>
<div class="progress"></div>
${options.showSafeZones ? safeOverlay(frame) : ""}
<script>window.__BEZEL_DATA__ = ${safeJson(runtimeData(film, style, timeline, frame))};</script>
<script src="/bezel-charts.js"></script>
<script src="/runtime.js"></script>
</body>
</html>`;
}
