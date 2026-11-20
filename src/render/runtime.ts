import { COUNT_PATTERN } from "./motion.js";

/**
 * The script that runs inside the film page. It exposes `__bezel.seek(seconds)`,
 * which puts the whole page into the exact state for that moment: which scene is
 * showing, how far each animation has got, the caption and the progress bar.
 *
 * Nothing on the page runs on its own clock. Every animation (ours and the ones
 * inside Bezel Charts) is paused and set by hand, so frame N always looks the same,
 * however slow or busy the computer is.
 *
 * Kept as plain browser JavaScript in a string so it reaches the page unchanged.
 */
export const RUNTIME_JS = String.raw`
(() => {
  const data = window.__BEZEL_DATA__;
  const sections = [...document.querySelectorAll(".scene")];
  const caption = document.querySelector(".caption");
  const captionText = caption.querySelector("span");
  const progress = document.querySelector(".progress");
  const backdrop = document.querySelector(".backdrop");
  const stage = document.getElementById("stage");
  const CHART_DELAY_MS = 350;
  // Big numbers pulse as they land. When they count and land comes from each scene's data.
  const PULSE_SECONDS = 0.5;
  const PULSE_SIZE = 0.07;

  const clamp = (x, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));
  const easeOut = (x) => 1 - Math.pow(1 - x, 3);
  const easeOutQuart = (x) => 1 - Math.pow(1 - x, 4);
  const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

  // Build each chart off the page with all its settings, then attach it. Bezel Charts only
  // animates its first draw, so that draw has to be the finished chart.
  for (const chart of data.charts) {
    const el = document.createElement("bezel-chart");
    el.setAttribute("type", chart.type);
    for (const [name, value] of Object.entries(chart.attributes)) el.setAttribute(name, value);
    el.data = Object.fromEntries(Object.entries(chart.data).filter(([, v]) => v !== undefined));
    const frame = document.querySelector('[data-chart="' + chart.scene + '"]');
    // Charts can't be wider than their container, so the frame starts at the chart's width.
    frame.style.width = el.style.width = chart.attributes.width + "px";
    frame.append(el);
  }

  // Big numbers count up. Keeps the text around the number, e.g. "£" and "M".
  const counters = [...document.querySelectorAll("[data-count]")].map((el) => {
    const raw = el.dataset.count;
    const match = raw.match(new RegExp(${JSON.stringify(COUNT_PATTERN)}));
    if (!match) return null;
    const [, before, number, after] = match;
    const decimals = (number.split(".")[1] || "").length;
    return { el, before, after, target: Number(number.replace(/,/g, "")), decimals, commas: number.includes(",") };
  }).filter(Boolean);

  const formatCount = (c, value) => {
    const fixed = value.toFixed(c.decimals);
    const text = c.commas ? Number(fixed).toLocaleString("en-GB", { minimumFractionDigits: c.decimals, maximumFractionDigits: c.decimals }) : fixed;
    return c.before + text + c.after;
  };

  // Every shadow root under an element, however deeply nested (charts wrap other components).
  function shadowRoots(root, found = []) {
    for (const el of root.querySelectorAll("*")) {
      if (el.shadowRoot) {
        found.push(el.shadowRoot);
        shadowRoots(el.shadowRoot, found);
      }
    }
    return found;
  }

  // Every animation in a scene, including those inside each chart's shadow DOM.
  // Chart animations start a beat after the scene, once the card has risen in.
  function animationsIn(section) {
    const list = section.getAnimations({ subtree: true }).map((a) => [a, 0]);
    for (const root of shadowRoots(section)) for (const a of root.getAnimations()) list.push([a, CHART_DELAY_MS]);
    return list;
  }

  function setSceneTime(section, local) {
    for (const [animation, offset] of animationsIn(section)) {
      animation.pause();
      animation.currentTime = Math.max(0, local * 1000 - offset);
    }
  }

  function styleScene(section, opacity, transform = "", clip = "") {
    section.style.opacity = String(opacity);
    section.style.transform = transform;
    section.style.clipPath = clip;
    section.style.zIndex = opacity > 0 ? "1" : "0";
  }

  function sceneIndexAt(t) {
    let index = 0;
    for (let i = 0; i < data.scenes.length; i++) if (t >= data.scenes[i].start) index = i;
    return index;
  }

  // Motion blur. To draw a frame, the page is first set to the moment the "shutter"
  // opened (a fraction of a frame earlier), and every moving element's position is
  // measured. Then it's set to the frame's own moment and measured again. Each
  // element that moved is blurred along the way it moved, by how far it moved, using
  // an SVG blur that can be wider than it is tall. Anything standing still stays sharp.
  const MOVERS = ".rise, .pop, .slide, .word, .grow";
  // A smear of length L looks closest to a Gaussian blur about a third of L wide.
  const BLUR_PER_PIXEL = 0.35;
  const SVG = "http://www.w3.org/2000/svg";
  const blurDefs = (() => {
    const svg = document.createElementNS(SVG, "svg");
    svg.setAttribute("width", "0");
    svg.setAttribute("height", "0");
    svg.style.position = "absolute";
    const defs = document.createElementNS(SVG, "defs");
    svg.appendChild(defs);
    document.body.appendChild(svg);
    return defs;
  })();
  const blurs = new Map();
  let nextBlur = 0;

  function measure() {
    const rects = new Map();
    for (const section of sections) {
      if (section.style.opacity === "0") continue;
      rects.set(section, section.getBoundingClientRect());
      for (const el of section.querySelectorAll(MOVERS)) rects.set(el, el.getBoundingClientRect());
    }
    return rects;
  }

  function setBlur(el, x, y) {
    let blur = blurs.get(el);
    if (x < 0.25 && y < 0.25) {
      if (blur) el.style.filter = "";
      return;
    }
    if (!blur) {
      const filter = document.createElementNS(SVG, "filter");
      filter.id = "motion-blur-" + nextBlur++;
      // Measured in the element's own pixels, so the room is set per blur below.
      filter.setAttribute("filterUnits", "userSpaceOnUse");
      const gaussian = document.createElementNS(SVG, "feGaussianBlur");
      filter.appendChild(gaussian);
      blurDefs.appendChild(filter);
      blur = { id: filter.id, filter, gaussian };
      blurs.set(el, blur);
    }
    // Room around the element for the blur to spread into. Letters can reach past a
    // tight line box, so this is generous: the blur's full reach plus a line's height.
    const padX = 3 * x + el.offsetHeight;
    const padY = 3 * y + el.offsetHeight;
    blur.filter.setAttribute("x", String(-padX));
    blur.filter.setAttribute("y", String(-padY));
    blur.filter.setAttribute("width", String(el.offsetWidth + 2 * padX));
    blur.filter.setAttribute("height", String(el.offsetHeight + 2 * padY));
    blur.gaussian.setAttribute("stdDeviation", x.toFixed(2) + " " + y.toFixed(2));
    el.style.filter = "url(#" + blur.id + ")";
  }

  function blurMotion(before, after) {
    for (const el of blurs.keys()) el.style.filter = "";
    for (const [el, now] of after) {
      const then = before.get(el);
      if (!then) continue;
      // A scene moves its contents with it; blur the scene for that, and each element
      // only for its own movement on top.
      const section = el.classList.contains("scene") ? null : el.closest(".scene");
      const outer = section && before.get(section) && after.get(section);
      const shiftX = outer ? after.get(section).left - before.get(section).left : 0;
      const shiftY = outer ? after.get(section).top - before.get(section).top : 0;
      const dx = now.left + now.width / 2 - (then.left + then.width / 2) - shiftX;
      const dy = now.top + now.height / 2 - (then.top + then.height / 2) - shiftY;
      // Growing or shrinking moves every edge outwards or in: a gentle blur all round.
      const grow = Math.max(Math.abs(now.width - then.width), Math.abs(now.height - then.height)) / 2;
      // The blur is drawn in the element's own size, before any scaling, so undo that.
      const scale = el.offsetWidth ? now.width / el.offsetWidth : 1;
      const x = (BLUR_PER_PIXEL * Math.hypot(dx, grow)) / (scale || 1);
      const y = (BLUR_PER_PIXEL * Math.hypot(dy, grow)) / (scale || 1);
      setBlur(el, x, y);
    }
  }

  // When each scene's last entrance finishes (seconds into the scene). After that nothing
  // in it moves, so frames can skip measuring for blur, which keeps rendering quick.
  const settled = new Map();
  function settledAt(index) {
    if (!settled.has(index)) {
      let end = 0;
      for (const animation of sections[index].getAnimations({ subtree: true })) {
        end = Math.max(end, animation.effect.getComputedTiming().endTime);
      }
      settled.set(index, end / 1000);
    }
    return settled.get(index);
  }

  function moving(t, shutter) {
    const index = sceneIndexAt(t);
    const scene = data.scenes[index];
    const local = t - scene.start;
    const open = shutter / data.fps;
    const changing = index > 0 && scene.transition !== "cut" && local < data.transitionSeconds + open;
    return changing || local - open < settledAt(index);
  }

  // still: a single picture (the cover), so no captions, progress bar or blur.
  function seek(t, still = false) {
    const shutter = data.pageBlur && !still ? data.scenes[sceneIndexAt(t)].shutter : 0;
    if (!shutter || !moving(t, shutter)) {
      for (const el of blurs.keys()) el.style.filter = "";
      place(t, still);
      return;
    }
    place(Math.max(0, t - shutter / data.fps), still);
    const before = measure();
    place(t, still);
    blurMotion(before, measure());
  }

  function place(t, still) {
    const scenes = data.scenes;
    const index = sceneIndexAt(t);
    const current = scenes[index];
    const local = t - current.start;
    const p = index === 0 || current.transition === "cut" ? 1 : easeInOut(clamp(local / data.transitionSeconds));

    sections.forEach((section) => styleScene(section, 0));
    const now = sections[index];
    const before = index > 0 && p < 1 ? sections[index - 1] : null;

    if (before) {
      setSceneTime(before, t - scenes[index - 1].start);
      const shift = current.transition === "slide" ? "translateX(" + (-p * 4) + "%)" : "";
      styleScene(before, 1 - p, shift);
      before.style.zIndex = "0";
    }
    setSceneTime(now, local);
    if (current.transition === "slide") styleScene(now, p, "translateX(" + ((1 - p) * 6) + "%)");
    else if (current.transition === "wipe") styleScene(now, 1, "", "inset(0 " + ((1 - p) * 100) + "% 0 0)");
    else styleScene(now, p);
    now.style.zIndex = "2";

    for (const c of counters) {
      const scene = scenes[Number(c.el.closest(".scene").dataset.index)];
      const { delay, seconds, curve, landsAt, pulse } = scene.count;
      const x = clamp((t - scene.start - delay) / seconds);
      c.el.textContent = formatCount(c, c.target * (curve === "quart" ? easeOutQuart(x) : easeOut(x)));
      // A small swell as the number lands, so the eye knows it has arrived.
      const u = clamp((t - scene.start - delay - seconds * landsAt) / PULSE_SECONDS);
      c.el.style.scale = pulse && u > 0 && u < 1 ? String(1 + PULSE_SIZE * Math.sin(Math.PI * u) * (1 - u)) : "";
    }

    // Captions: the sentence being spoken, held until the next one starts.
    let text = "";
    let fade = 0;
    if (data.captions) {
      const lines = data.lines;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const next = lines[i + 1];
        const holdUntil = next && next.scene === line.scene ? next.start : line.end + 0.35;
        if (t >= line.start && t < holdUntil) {
          text = line.text;
          fade = Math.min(clamp((t - line.start) / 0.12), next && next.scene === line.scene ? 1 : clamp((holdUntil - t) / 0.2));
          break;
        }
      }
    }
    if (captionText.textContent !== text) captionText.textContent = text;
    caption.style.opacity = String(text ? fade : 0);

    const end = clamp((data.duration - t) / data.endFadeSeconds);
    stage.style.opacity = String(end);
    caption.style.opacity = String(Number(caption.style.opacity) * end);
    progress.style.width = (clamp(t / (data.duration - data.endFadeSeconds)) * 100) + "%";
    progress.style.opacity = String(end);
    if (still) {
      caption.style.opacity = "0";
      progress.style.opacity = "0";
    }
    backdrop.style.transform = "translate(" + Math.sin(t / 9) * 2 + "%," + Math.cos(t / 11) * 2 + "%) scale(" + (1.02 + Math.sin(t / 13) * 0.02) + ")";
  }

  // The space inside a scene's padding: where its content may go.
  function contentBox(scene) {
    const cs = getComputedStyle(scene);
    return {
      width: scene.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight),
      height: scene.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom),
    };
  }

  // Big text that doesn't fit (a long number, a long word, a web address) is made
  // smaller until it does, rather than running off the frame. Code gets a little
  // smaller, then wraps its long lines, so it stays readable.
  function fitText() {
    for (const el of document.querySelectorAll(".display, .heading, .stat-value, .quote, .url, .code pre")) {
      const code = el.matches(".code pre");
      const room = () => Math.min(el.clientWidth, contentBox(el.closest(".scene")).width);
      let size = parseFloat(getComputedStyle(el).fontSize);
      const smallest = size * (code ? 0.8 : 0.3);
      while (el.scrollWidth > room() + 1 && size > smallest) {
        size *= 0.95;
        el.style.fontSize = size + "px";
      }
      if (code && el.scrollWidth > room() + 1) el.classList.add("wrap");
    }
  }

  // A scene whose content is taller than the room it has (say, a long list on a phone
  // frame) is scaled down as a whole, so nothing hides behind the platform's buttons.
  function fitScenes() {
    for (const scene of sections) {
      const block = scene.firstElementChild;
      if (!block) continue;
      const box = contentBox(scene);
      const scale = Math.min(1, box.height / block.offsetHeight, box.width / block.offsetWidth);
      if (scale < 0.995) block.style.transform = "scale(" + scale + ")";
    }
  }

  async function ready() {
    await document.fonts.ready;
    const charts = [...document.querySelectorAll("[data-chart] bezel-chart")];
    const deadline = performance.now() + 10000;
    const drawn = (el) => shadowRoots(el.parentElement).some((root) => root.querySelector("svg"));
    while (!charts.every(drawn)) {
      if (performance.now() > deadline) throw new Error("A chart didn't draw within 10 seconds");
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
    // Scale each chart up to fill the space under its heading. A transform, not CSS zoom:
    // zoom changes the chart's size, which makes Bezel Charts redraw without its animation.
    for (const el of charts) {
      const width = el.offsetWidth;
      const height = el.offsetHeight;
      if (!width || !height) throw new Error("A chart drew with no size");
      const scene = el.closest(".scene");
      const heading = scene.querySelector(".heading");
      const headingHeight = heading ? heading.getBoundingClientRect().height : 0;
      let scale;
      if (data.zoned) {
        // The scene's padding already keeps clear of the platform's buttons and our captions.
        const box = contentBox(scene);
        const card = el.closest(".card");
        const cs = getComputedStyle(card);
        const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
        const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
        const gap = heading ? parseFloat(getComputedStyle(heading.parentElement).rowGap) || 0 : 0;
        scale = Math.min((box.width - padX) / width, (box.height - headingHeight - gap - padY) / height);
      } else {
        // Leave room at the bottom for captions, so they never cover the chart's labels.
        const room = innerHeight * (data.captions ? 0.56 : 0.66) - headingHeight;
        scale = Math.min((innerWidth * 0.8) / width, room / height);
      }
      const frame = el.parentElement;
      frame.style.width = width * scale + "px";
      frame.style.height = height * scale + "px";
      el.style.transform = "scale(" + scale + ")";
    }
    fitText();
    fitScenes();
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    seek(0);
  }

  window.__bezel = { seek, ready };
})();
`;
