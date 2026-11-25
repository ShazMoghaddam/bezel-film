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

  // Maps. Each has a camera that flies from a wide view to the scene's focus, along the
  // smooth path a person would take: pulling back a little, travelling, then settling in
  // (van Wijk and Nuij's "smooth and efficient zooming", as d3 uses). Pins sit in a layer
  // above the map, moved with the camera but never scaled, so they stay crisp and readable.
  const RHO = 1.25;
  function zoomPath([x0, y0, w0], [x1, y1, w1]) {
    const dx = x1 - x0, dy = y1 - y0, d2 = dx * dx + dy * dy;
    if (d2 < 1e-6) {
      const s = Math.log(w1 / w0);
      return (t) => [x0 + t * dx, y0 + t * dy, w0 * Math.exp(s * t)];
    }
    const d1 = Math.sqrt(d2), r2 = RHO * RHO, r4 = r2 * r2;
    const b0 = (w1 * w1 - w0 * w0 + r4 * d2) / (2 * w0 * r2 * d1);
    const b1 = (w1 * w1 - w0 * w0 - r4 * d2) / (2 * w1 * r2 * d1);
    const q0 = Math.log(Math.sqrt(b0 * b0 + 1) - b0);
    const q1 = Math.log(Math.sqrt(b1 * b1 + 1) - b1);
    const S = (q1 - q0) / RHO;
    return (t) => {
      const s = t * S;
      const u = (w0 / (r2 * d1)) * (Math.cosh(q0) * Math.tanh(RHO * s + q0) - Math.sinh(q0));
      return [x0 + u * dx, y0 + u * dy, (w0 * Math.cosh(q0)) / Math.cosh(RHO * s + q0)];
    };
  }

  const maps = data.maps.map((m) => {
    const el = document.querySelector('[data-map="' + m.scene + '"]');
    const pins = [...el.querySelectorAll(".pin")].map((pin) => ({ el: pin, x: Number(pin.dataset.x), y: Number(pin.dataset.y) }));
    return { ...m, el, camera: el.querySelector(".map-camera"), pins };
  });

  // A box on the map as the camera's centre and width, fitted to the map's own shape.
  // A box wider than the frame (the world, on a phone) is cropped from the sides, as far
  // as the things the scene shows allow, so the map fills the frame rather than a strip.
  function viewOf([x0, y0, x1, y1], width, height, keep) {
    let cx = (x0 + x1) / 2;
    const fitHeight = ((y1 - y0) * width) / height;
    let w = Math.max(x1 - x0, fitHeight);
    if (keep) {
      const need = Math.max(keep[2] - keep[0], ((keep[3] - keep[1]) * width) / height);
      w = Math.min(w, Math.max(fitHeight, need));
      // Slide sideways, within the box, until everything kept is in view.
      if (keep[0] < cx - w / 2) cx = keep[0] + w / 2;
      if (keep[2] > cx + w / 2) cx = keep[2] - w / 2;
    }
    return [cx, (y0 + y1) / 2, w];
  }

  function setupMaps() {
    for (const m of maps) {
      m.width = m.el.offsetWidth;
      m.height = m.el.offsetHeight;
      m.path = zoomPath(viewOf(m.from, m.width, m.height, null), viewOf(m.to, m.width, m.height, m.keep));
      placeLabels(m);
    }
  }

  // Where a map point lands on screen, for a camera at [x, y, width].
  const onScreen = (m, [cx, cy, w], x, y) => {
    const k = m.width / w;
    return [(x - cx) * k + m.width / 2, (y - cy) * k + m.height / 2];
  };

  // Each label goes beside its pin where it overlaps nothing else and stays on the map:
  // right, then left, above or below. Pins near the right edge try the left first.
  function placeLabels(m) {
    const end = m.path(1);
    const taken = m.pins.map((pin) => {
      const [x, y] = onScreen(m, end, pin.x, pin.y);
      const r = pin.el.querySelector(".pin-dot").offsetWidth;
      return [x - r, y - r, x + r, y + r];
    });
    const overlap = (a, b) => Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));
    for (const pin of m.pins) {
      const label = pin.el.querySelector(".pin-label");
      if (!label) continue;
      const [x, y] = onScreen(m, end, pin.x, pin.y);
      const dot = pin.el.querySelector(".pin-dot").offsetWidth;
      const w = label.offsetWidth, h = label.offsetHeight, gap = dot * 0.9, side = dot * 0.5, lift = dot * 0.6;
      // Matches the .pin.<side> rules in the map CSS.
      const sides = {
        right: [x + gap, y - h / 2, x + gap + w, y + h / 2],
        left: [x - gap - w, y - h / 2, x - gap, y + h / 2],
        above: [x - w / 2, y - gap - h, x + w / 2, y - gap],
        below: [x - w / 2, y + gap, x + w / 2, y + gap + h],
        ne: [x + side, y - lift - h, x + side + w, y - lift],
        nw: [x - side - w, y - lift - h, x - side, y - lift],
        se: [x + side, y + lift, x + side + w, y + lift + h],
        sw: [x - side - w, y + lift, x - side, y + lift + h],
      };
      const order = x > m.width * 0.66 ? ["left", "right", "nw", "sw", "above", "below", "ne", "se"] : ["right", "left", "ne", "se", "above", "below", "nw", "sw"];
      const cost = (side) => {
        const box = sides[side];
        const outside = Math.max(0, -box[0]) + Math.max(0, box[2] - m.width) + Math.max(0, -box[1]) + Math.max(0, box[3] - m.height);
        return taken.reduce((sum, other) => sum + overlap(box, other), 0) + outside * h * 4;
      };
      let best = order[0];
      for (const side of order) {
        if (cost(side) === 0) { best = side; break; }
        if (cost(side) < cost(best)) best = side;
      }
      pin.el.classList.remove("left", "above", "below", "ne", "nw", "se", "sw");
      if (best !== "right") pin.el.classList.add(best);
      taken.push(sides[best]);
    }
  }

  function placeMap(m, local) {
    if (!m.path) return;
    const view = m.path(easeInOut(clamp((local * 1000) / m.flyMs)));
    const k = m.width / view[2];
    const [tx, ty] = onScreen(m, view, 0, 0);
    m.camera.setAttribute("transform", "translate(" + tx + " " + ty + ") scale(" + k + ")");
    m.el.style.setProperty("--zoom", String(k));
    for (const pin of m.pins) {
      const [x, y] = onScreen(m, view, pin.x, pin.y);
      pin.el.style.transform = "translate(" + x + "px," + y + "px)";
    }
  }

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
    const custom = customs.get(Number(section.dataset.index));
    if (custom) drawCustom(custom, local);
  }

  // Custom scenes: each one's own code, built once in ready() and drawn from the time alone.
  const customs = new Map();
  function drawCustom(custom, local) {
    // Held at its last moment while the next scene fades in over it.
    const t = Math.max(0, Math.min(local, custom.duration + data.transitionSeconds));
    try {
      custom.draw(t);
    } catch (error) {
      throw new Error("Scene " + (custom.scene + 1) + " (" + custom.file + ") failed while drawing at " + t.toFixed(2) + "s: " + (error && error.message || error));
    }
  }
  function buildCustoms() {
    const css = getComputedStyle(document.documentElement);
    const fonts = { heading: css.getPropertyValue("--heading").trim(), body: css.getPropertyValue("--body").trim(), mono: css.getPropertyValue("--mono").trim() };
    for (const info of data.customs) {
      const where = "Scene " + (info.scene + 1) + " (" + info.file + ")";
      const make = window.__bezelKit.makers.get(info.scene);
      if (!make) throw new Error(where + " didn't call Bezel.scene(...). Check it loads without errors.");
      const root = document.querySelector('[data-custom="' + info.scene + '"]');
      const kit = window.__bezelKit.create(info.scene, root, {
        ...info, fps: data.fps, captions: data.captions, zoned: data.zoned, theme: data.theme, colours: data.colours, fonts,
      });
      let made;
      try {
        made = make(root, kit);
      } catch (error) {
        throw new Error(where + " failed while setting up: " + (error && error.message || error));
      }
      const draw = typeof made === "function" ? made : made && typeof made.draw === "function" ? made.draw.bind(made) : null;
      if (!draw) throw new Error(where + " must return a draw function from Bezel.scene: return (t) => { ... }");
      customs.set(info.scene, { ...info, draw, kit });
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
        // Endless loops, like a roadmap's pulsing halo, never "finish"; they don't move anything either.
        const finish = animation.effect.getComputedTiming().endTime;
        if (Number.isFinite(finish)) end = Math.max(end, finish);
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
    for (const m of maps) {
      if (m.scene === index) placeMap(m, local);
      else if (before && m.scene === index - 1) placeMap(m, t - scenes[index - 1].start);
    }
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
      if (el.closest(".scene-custom")) continue;
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
      if (!block || scene.classList.contains("scene-custom")) continue;
      const box = contentBox(scene);
      const scale = Math.min(1, box.height / block.offsetHeight, box.width / block.offsetWidth);
      if (scale < 0.995) block.style.transform = "scale(" + scale + ")";
    }
  }

  async function ready() {
    // Every bundled face, not just the ones the text so far has asked for. Scenes built
    // below measure their words, and a face that only starts loading then would be
    // measured as the fallback font: the wrong size now, and the right one a frame later.
    await Promise.all([...document.fonts].map((face) => face.load().catch(() => {})));
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
    setupMaps();
    if (data.customs.length) {
      if (!window.__bezelKit) throw new Error("The scene kit didn't load");
      buildCustoms();
    }
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    seek(0);
  }

  // For the checks before a render: a custom scene's safe area and every piece of text
  // in it that can be seen, with where it is and what colour it's drawn in.
  function inspect(index) {
    const custom = customs.get(index);
    if (!custom) return null;
    const texts = [];
    for (const el of custom.kit.root.querySelectorAll("*")) {
      const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (!own || el.closest(".bf-pen")) continue;
      if (!el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
      let opacity = 1;
      for (let node = el; node && node !== document.body; node = node.parentElement) opacity *= Number(getComputedStyle(node).opacity);
      const r = el.getBoundingClientRect();
      if (opacity < 0.5 || r.width < 1 || r.height < 1) continue;
      // Text in its own box (a label, a strip) is read against the box, not what's behind it.
      const fill = getComputedStyle(el).backgroundColor;
      const boxed = /^rgba?\(/.test(fill) && !/,\s*0\)$/.test(fill);
      texts.push({ text: el.textContent.trim().slice(0, 40), colour: getComputedStyle(el).color, background: boxed ? fill : null, rect: { x: r.left, y: r.top, width: r.width, height: r.height } });
    }
    return { safe: custom.kit.safe, texts };
  }

  window.__bezel = { seek, ready, inspect };
})();
`;
