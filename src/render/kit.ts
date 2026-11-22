/**
 * The scene kit: what a custom scene's code gets to build with.
 *
 * A custom scene is a small script an agent writes for one film:
 *
 *   Bezel.scene((root, kit) => {
 *     const title = kit.el("h1", { text: kit.props.title, style: { font: `700 ${kit.u * 9}px ${kit.fonts.heading}` } }, root);
 *     return (t) => { title.style.opacity = kit.progress(t, 0.2, 0.6); };
 *   });
 *
 * The scene builds its pictures once, then returns a draw function. Bezel Film calls
 * draw(t) with the seconds since the scene began, for every frame, in any order. So a
 * scene must draw each moment from t alone: the same t always gives the same picture.
 * That keeps renders exact and lets previews jump straight to any moment.
 *
 * The kit is plain browser JavaScript in a string, so it reaches the page unchanged.
 * It loads before the scene files; the runtime then builds each scene with its kit.
 * The guide for agents is guides/scenes.md; keep the two in step.
 */
export const KIT_JS = String.raw`
(() => {
  // Seeded randomness, so a scene that uses Math.random still looks the same every
  // render. Scenes should prefer kit.random(seed), which doesn't depend on call order.
  const seeded = (seed) => {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  Math.random = seeded(20261122);

  const makers = new Map();
  window.Bezel = {
    /** Called once by each scene file with a function that builds the scene. */
    scene(make) {
      const script = document.currentScript;
      const index = script ? Number(script.dataset.scene) : NaN;
      if (!Number.isInteger(index)) throw new Error("Bezel.scene() can only be called from a scene file, as it loads");
      if (typeof make !== "function") throw new Error("Bezel.scene() needs a function: Bezel.scene((root, kit) => { ... })");
      if (makers.has(index)) throw new Error("This scene file calls Bezel.scene() more than once");
      makers.set(index, make);
    },
  };

  const SVG = "http://www.w3.org/2000/svg";
  const clamp = (x, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));
  const lerp = (a, b, p) => a + (b - a) * p;

  const ease = {
    linear: (x) => x,
    in: (x) => x * x * x,
    out: (x) => 1 - Math.pow(1 - x, 3),
    inOut: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
    outQuart: (x) => 1 - Math.pow(1 - x, 4),
    outExpo: (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
    // Overshoots a little, then settles: things that arrive with weight.
    outBack: (x) => 1 + 2.70158 * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2),
  };
  const easing = (e) => (typeof e === "function" ? e : ease[e || "out"] || ease.out);

  /** 0 before start, 1 after start + duration, eased in between. */
  const progress = (t, start, duration, how) => (duration <= 0 ? (t >= start ? 1 : 0) : easing(how)(clamp((t - start) / duration)));

  /**
   * A spring released at t = 0, moving from 0 to 1. It overshoots and settles like a
   * real spring, worked out exactly for each t, so it never depends on the frame before.
   */
  function spring(t, { stiffness = 170, damping = 16, mass = 1 } = {}) {
    if (t <= 0) return 0;
    const w0 = Math.sqrt(stiffness / mass);
    const zeta = damping / (2 * Math.sqrt(stiffness * mass));
    if (zeta < 1) {
      const wd = w0 * Math.sqrt(1 - zeta * zeta);
      return 1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + ((zeta * w0) / wd) * Math.sin(wd * t));
    }
    return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
  }

  function applyProps(node, props, isSvg) {
    for (const [key, value] of Object.entries(props || {})) {
      if (value === undefined || value === null) continue;
      if (key === "text") node.textContent = String(value);
      else if (key === "class") node.setAttribute("class", value);
      else if (key === "style") {
        if (typeof value === "string") node.style.cssText = value;
        else for (const [k, v] of Object.entries(value)) k.startsWith("--") ? node.style.setProperty(k, v) : (node.style[k] = v);
      } else node.setAttribute(isSvg ? key : key, String(value));
    }
    return node;
  }

  // Our own marker pen, tip at (0, 0), leaning up and to the right like a right hand's.
  const PEN = '<svg viewBox="-10 -150 160 160" overflow="visible" aria-hidden="true"><g transform="rotate(-38)">' +
    '<path d="M0 0 L 7 -5 L 7 5 Z" fill="#1E2430"/><rect x="7" y="-8" width="16" height="16" rx="2" fill="#2B3240"/>' +
    '<rect x="23" y="-11" width="118" height="22" rx="6" fill="#F4F4F0" stroke="#C9CBC4" stroke-width="1.5"/>' +
    '<rect x="23" y="-11" width="30" height="22" rx="4" fill="var(--pen,#D7263D)"/><rect x="60" y="-6" width="52" height="12" rx="3" fill="#E4E5DF"/>' +
    '<rect x="136" y="-12" width="8" height="24" rx="3" fill="var(--pen,#D7263D)"/></g></svg>';

  function create(index, root, info) {
    const section = root.closest(".scene");
    const cs = getComputedStyle(section);
    const width = innerWidth;
    const height = innerHeight;
    const u = Math.min(width, height) / 100;
    const inset = {
      top: parseFloat(cs.paddingTop),
      right: parseFloat(cs.paddingRight),
      // Keep clear of our captions too, when they're on and no platform zone already does.
      bottom: Math.max(parseFloat(cs.paddingBottom), info.captions && !info.zoned ? u * 15 : 0),
      left: parseFloat(cs.paddingLeft),
    };
    const safe = { ...inset, x: inset.left, y: inset.top, width: width - inset.left - inset.right, height: height - inset.top - inset.bottom };

    const el = (tag, props, parent) => {
      const node = applyProps(document.createElement(tag), props, false);
      if (parent) parent.appendChild(node);
      return node;
    };
    const svg = (tag, props, parent) => {
      const node = applyProps(document.createElementNS(SVG, tag), props, true);
      if (parent) parent.appendChild(node);
      return node;
    };

    /** Where a point inside an SVG element is, in the scene's own pixels. */
    function toRoot(node, x, y) {
      const m = node.getScreenCTM();
      const r = root.getBoundingClientRect();
      return { x: m.a * x + m.c * y + m.e - r.left, y: m.b * x + m.d * y + m.f - r.top };
    }

    /**
     * Lines that draw themselves, and words that write themselves, in order, with an
     * optional marker pen following the tip. Add marks, then call plan.draw(t) in draw.
     */
    function drawing({ pen = false, penColour } = {}) {
      const marks = [];
      let penEl = null;
      if (pen) {
        penEl = el("div", { class: "bf-pen", style: { position: "absolute", left: "0", top: "0", width: u * 13 + "px", height: u * 13 + "px",
          pointerEvents: "none", zIndex: "50", filter: "drop-shadow(" + u * 0.5 + "px " + u * 0.9 + "px " + u * 0.6 + "px rgb(30 36 48 / .22))" } }, null);
        penEl.innerHTML = PEN;
        if (penColour) penEl.style.setProperty("--pen", penColour);
      }
      const plan = {
        /** A path, line, polyline or circle that draws itself from start to end. */
        line(node, { at = 0, duration = 0.6, how = "inOut" } = {}) {
          const length = node.getTotalLength();
          node.style.strokeDasharray = length + " " + (length + 1);
          node.style.strokeDashoffset = String(length);
          marks.push({ kind: "line", node, at, duration, how, length });
          return plan;
        },
        /** Text that writes itself left to right, as if by hand. */
        write(node, { at = 0, duration = 0.8, how = "linear" } = {}) {
          node.style.clipPath = "inset(-40% 100% -40% -10%)";
          marks.push({ kind: "text", node, at, duration, how });
          return plan;
        },
        /**
         * Lines and words one after another from start, each with its own duration
         * (seconds), with a short lift of the pen between them. Returns when it ends.
         */
        sequence(start, items, gap = 0.12) {
          let t = start;
          for (const item of items) {
            const node = item.node || item;
            const duration = item.duration ?? (node instanceof SVGElement ? 0.5 : 0.8);
            if (node instanceof SVGElement) plan.line(node, { at: t, duration, how: item.how });
            else plan.write(node, { at: t, duration, how: item.how });
            t += duration + gap;
          }
          return t - gap;
        },
        /** When the last mark finishes. */
        get end() {
          return marks.reduce((end, m) => Math.max(end, m.at + m.duration), 0);
        },
        draw(t) {
          for (const m of marks) {
            const p = progress(t, m.at, m.duration, m.how);
            if (m.kind === "line") m.node.style.strokeDashoffset = String(m.length * (1 - p));
            else m.node.style.clipPath = "inset(-40% " + (1 - p) * 100 + "% -40% -10%)";
          }
          if (penEl) placePen(t);
        },
      };

      function tip(m, p) {
        if (m.kind === "line") {
          const point = m.node.getPointAtLength(m.length * p);
          return toRoot(m.node, point.x, point.y);
        }
        const r = m.node.getBoundingClientRect();
        const base = root.getBoundingClientRect();
        // Handwriting: along the line of text, bobbing as if forming letters.
        const strokes = Math.max(4, r.width / (u * 3.2));
        return { x: r.left - base.left + r.width * p, y: r.top - base.top + r.height * (0.6 + 0.16 * Math.sin(p * Math.PI * 2 * strokes)) };
      }

      function placePen(t) {
        if (!penEl.parentNode) root.appendChild(penEl);
        const ordered = [...marks].sort((a, b) => a.at - b.at);
        if (!ordered.length) return;
        const away = { x: width + u * 8, y: height + u * 8 };
        let pos = null;
        let lift = 0;
        for (let i = 0; i < ordered.length; i++) {
          const m = ordered[i];
          if (t < m.at) {
            const prev = ordered[i - 1];
            const from = prev ? tip(prev, 1) : away;
            const leaveAt = prev ? prev.at + prev.duration : m.at - 0.5;
            const k = ease.inOut(clamp((t - leaveAt) / Math.max(0.01, m.at - leaveAt)));
            const to = tip(m, 0);
            pos = { x: lerp(from.x, to.x, k), y: lerp(from.y, to.y, k) };
            lift = Math.sin(Math.PI * k);
            break;
          }
          if (t <= m.at + m.duration) {
            pos = tip(m, progress(t, m.at, m.duration, m.how));
            break;
          }
        }
        if (!pos) {
          const last = ordered[ordered.length - 1];
          const k = ease.inOut(clamp((t - last.at - last.duration) / 0.6));
          const from = tip(last, 1);
          pos = { x: lerp(from.x, away.x, k), y: lerp(from.y, away.y, k) };
          lift = k;
        }
        const size = u * 13;
        penEl.style.transform = "translate(" + (pos.x - size * (10 / 160)) + "px," + (pos.y - size * (150 / 160) - lift * u * 1.2) + "px) scale(" + (1 + 0.05 * lift) + ")";
        penEl.style.transformOrigin = (10 / 160) * 100 + "% " + (150 / 160) * 100 + "%";
      }
      return plan;
    }

    return {
      root,
      index,
      width,
      height,
      u,
      safe,
      shape: width / height > 1.2 ? "wide" : width / height < 0.85 ? "tall" : "square",
      fps: info.fps,
      duration: info.duration,
      lines: info.lines,
      props: info.props || {},
      colours: info.colours,
      fonts: info.fonts,
      theme: info.theme,
      /** When sentence i of this scene's narration starts, in seconds into the scene. */
      at: (i) => (info.lines[i] ? info.lines[i].start : 0),
      clamp,
      lerp,
      ease,
      progress,
      spring,
      random: seeded,
      el,
      svg,
      drawing,
      /** A file from the film's folder, e.g. kit.asset("pictures/shop.png"). */
      asset: (path) => "/files/" + String(path).split("/").map(encodeURIComponent).join("/"),
    };
  }

  window.__bezelKit = { makers, create };
})();
`;
