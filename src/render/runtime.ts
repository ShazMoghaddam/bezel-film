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

  const clamp = (x, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));
  const easeOut = (x) => 1 - Math.pow(1 - x, 3);
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
    const match = raw.match(/^(\D*?)(\d[\d,]*(?:\.\d+)?)(.*)$/);
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

  function seek(t) {
    const scenes = data.scenes;
    let index = 0;
    for (let i = 0; i < scenes.length; i++) if (t >= scenes[i].start) index = i;
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
      const owner = c.el.closest(".scene");
      const start = scenes[Number(owner.dataset.index)].start;
      const k = easeOut(clamp((t - start - 0.25) / 1.4));
      c.el.textContent = formatCount(c, c.target * k);
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
    backdrop.style.transform = "translate(" + Math.sin(t / 9) * 2 + "%," + Math.cos(t / 11) * 2 + "%) scale(" + (1.02 + Math.sin(t / 13) * 0.02) + ")";
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
      const heading = el.closest(".scene").querySelector(".heading");
      // Leave room at the bottom for captions, so they never cover the chart's labels.
      const room = innerHeight * (data.captions ? 0.56 : 0.66) - (heading ? heading.getBoundingClientRect().height : 0);
      const scale = Math.min((innerWidth * 0.8) / width, room / height);
      const frame = el.parentElement;
      frame.style.width = width * scale + "px";
      frame.style.height = height * scale + "px";
      el.style.transform = "scale(" + scale + ")";
    }
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    seek(0);
  }

  window.__bezel = { seek, ready };
})();
`;
