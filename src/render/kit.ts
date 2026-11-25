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
    // How much of a line of text shows as it's written. Handwriting leans and loops past
    // its box, so the reveal starts a little before it and ends a little after.
    const reveal = (p) => "inset(-40% " + ((1 - p) * 125 - 15).toFixed(2) + "% -40% -15%)";

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
          node.style.clipPath = reveal(0);
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
            else m.node.style.clipPath = reveal(p);
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

    /**
     * A full-frame SVG layer whose units are the frame's own pixels, so shapes from
     * kit.rough, kit.figure, kit.iso and kit.dimension can be placed with kit.safe.
     */
    function stage(parent = root) {
      return svg("svg", { viewBox: "0 0 " + width + " " + height, width, height,
        style: "position:absolute;left:0;top:0;overflow:visible" }, parent);
    }

    /** Text placed by its anchor point: align "left", "center" or "right", like a label on a drawing. */
    function text(parent, content, { x = 0, y = 0, size = 4, font = "body", weight, colour, align = "left", maxWidth, style: extra } = {}) {
      const family = info.fonts[font] || font;
      const node = el("div", { text: content, style: {
        position: "absolute", left: x + "px", top: y + "px", font: (weight || (font === "heading" ? 700 : 500)) + " " + size * u + "px/1.15 " + family,
        color: colour || info.colours.text, whiteSpace: maxWidth ? "normal" : "nowrap", width: maxWidth ? maxWidth + "px" : "",
        translate: align === "center" ? "-50% 0" : align === "right" ? "-100% 0" : "0 0", textAlign: align, ...(extra || {}) } }, parent);
      return node;
    }

    /**
     * A line drawing from the bundled set (Tabler Icons, 24 by 24, MIT). Returns the SVG
     * and its strokes, so plan.sequence(at, icon.paths) draws it in stroke by stroke.
     */
    function icon(name, { parent = root, x = 0, y = 0, size = u * 12, colour, width: px = u * 0.55 } = {}) {
      const strokes = window.__bezelIcons && window.__bezelIcons[name];
      if (!strokes) {
        const all = window.__bezelIcons ? Object.keys(window.__bezelIcons) : [];
        const word = String(name).split("-")[0];
        const near = all.filter((n) => n.includes(word)).slice(0, 6);
        throw new Error('There\'s no drawing called "' + name + '".' + (near.length ? " Close ones: " + near.join(", ") + "." : "") + " Search with: npx bezel-film icons <word>");
      }
      const box = svg("svg", { viewBox: "0 0 24 24", width: size, height: size, fill: "none", stroke: colour || info.colours.text,
        "stroke-width": (px * 24) / size, "stroke-linecap": "round", "stroke-linejoin": "round",
        style: "position:absolute;left:" + x + "px;top:" + y + "px;overflow:visible" }, parent);
      const paths = strokes.map((d) => svg("path", { d }, box));
      return { svg: box, paths };
    }

    // Hand-drawn shapes: lines that bow a little, corners that overshoot, loops that
    // don't quite close. Each takes a seed, so the same shape is drawn the same way.
    const wob = (rand, amount) => (rand() - 0.5) * 2 * amount;
    const rough = {
      line(x1, y1, x2, y2, { wobble = 1, seed = 1 } = {}) {
        const rand = seeded(seed * 7919 + Math.round(x1 + y2 * 3));
        const len = Math.hypot(x2 - x1, y2 - y1) || 1;
        const w = Math.min(u * 0.9, len * 0.04) * wobble;
        const nx = -(y2 - y1) / len, ny = (x2 - x1) / len;
        const bow = wob(rand, w * 1.4);
        const c1 = [x1 + (x2 - x1) * 0.3 + nx * bow + wob(rand, w), y1 + (y2 - y1) * 0.3 + ny * bow + wob(rand, w)];
        const c2 = [x1 + (x2 - x1) * 0.7 + nx * bow + wob(rand, w), y1 + (y2 - y1) * 0.7 + ny * bow + wob(rand, w)];
        return "M" + (x1 + wob(rand, w * 0.5)) + " " + (y1 + wob(rand, w * 0.5)) + " C" + c1 + " " + c2 + " " + (x2 + wob(rand, w * 0.5)) + " " + (y2 + wob(rand, w * 0.5));
      },
      /** A box drawn as four strokes, each corner overshooting slightly. */
      rect(x, y, w, h, { wobble = 1, seed = 1 } = {}) {
        const o = u * 0.6 * wobble;
        return [
          rough.line(x - o, y, x + w + o * 0.5, y, { wobble, seed }),
          rough.line(x + w, y - o * 0.5, x + w, y + h + o, { wobble, seed: seed + 1 }),
          rough.line(x + w + o * 0.4, y + h, x - o * 0.6, y + h, { wobble, seed: seed + 2 }),
          rough.line(x, y + h + o * 0.4, x, y - o, { wobble, seed: seed + 3 }),
        ].join(" ");
      },
      /** A loop drawn in one go that overshoots where it started, as a hand does. */
      ellipse(cx, cy, rx, ry, { wobble = 1, seed = 1, turns = 1.06 } = {}) {
        const rand = seeded(seed * 104729 + Math.round(cx));
        const steps = 64, start = rand() * Math.PI * 2, drift = wob(rand, 0.05) * wobble;
        let d = "";
        for (let i = 0; i <= steps; i++) {
          const a = start + (i / steps) * Math.PI * 2 * turns;
          const k = 1 + drift * (i / steps) + Math.sin(a * 3 + start) * 0.012 * wobble;
          const px = cx + Math.cos(a) * rx * k, py = cy + Math.sin(a) * ry * k;
          d += (i ? " L" : "M") + px.toFixed(1) + " " + py.toFixed(1);
        }
        return d;
      },
      /** An arrow that curves, with an open head. Returns { shaft, head } path data. */
      arrow(x1, y1, x2, y2, { curve = 0.18, head = u * 2.4, seed = 1 } = {}) {
        const rand = seeded(seed * 31 + Math.round(x2));
        const len = Math.hypot(x2 - x1, y2 - y1) || 1;
        const nx = -(y2 - y1) / len, ny = (x2 - x1) / len;
        const mx = (x1 + x2) / 2 + nx * len * curve, my = (y1 + y2) / 2 + ny * len * curve;
        const shaft = "M" + x1 + " " + y1 + " Q" + mx + " " + my + " " + x2 + " " + y2;
        const ang = Math.atan2(y2 - my, x2 - mx), spread = 0.5 + wob(rand, 0.06);
        const hx1 = x2 - Math.cos(ang - spread) * head, hy1 = y2 - Math.sin(ang - spread) * head;
        const hx2 = x2 - Math.cos(ang + spread) * head, hy2 = y2 - Math.sin(ang + spread) * head;
        return { shaft, head: "M" + hx1 + " " + hy1 + " L" + x2 + " " + y2 + " L" + hx2 + " " + hy2 };
      },
      /** A quick underline, slightly rising, with a small hook at the end. */
      underline(x, y, w, { seed = 1 } = {}) {
        const rand = seeded(seed * 13 + Math.round(w));
        const rise = wob(rand, u * 0.5) - u * 0.3;
        return "M" + x + " " + (y + wob(rand, u * 0.3)) + " C" + (x + w * 0.35) + " " + (y - u * 0.5) + " " + (x + w * 0.7) + " " + (y + u * 0.4) + " " + (x + w) + " " + (y + rise);
      },
    };

    /**
     * A stick figure, posed by its joints. f.pose("wave") sets a pose; f.pose("stand",
     * "cheer", p) blends two; f.walk(t) walks on the spot. Move it with f.move(x, y) or
     * f.group's transform. f.paths draws it in with kit.drawing.
     */
    const POSES = {
      // Seen from the front. Angles in degrees: 0 hangs straight down, positive swings
      // to the figure's right (our right), negative to its left. Elbows and knees bend
      // from the limb above. The arms start at the shoulders, below the head.
      stand: { lean: 0, head: 0, ls: -14, le: 4, rs: 14, re: -4, lh: -7, lk: 1, rh: 7, rk: -1 },
      wave: { lean: -2, head: -5, ls: -14, le: 4, rs: 118, re: 42, lh: -7, lk: 1, rh: 7, rk: -1 },
      point: { lean: 3, head: 6, ls: -14, le: 6, rs: 88, re: 2, lh: -8, lk: 1, rh: 9, rk: -1 },
      present: { lean: 0, head: 8, ls: -16, le: 6, rs: 58, re: 34, lh: -7, lk: 1, rh: 8, rk: -1 },
      think: { lean: 0, head: -10, ls: -12, le: 4, rs: 38, re: 118, lh: -6, lk: 1, rh: 6, rk: -1 },
      cheer: { lean: 0, head: 0, ls: -132, le: -14, rs: 132, re: 14, lh: -13, lk: 2, rh: 13, rk: -2 },
      shrug: { lean: 0, head: 10, ls: -62, le: -88, rs: 62, re: 88, lh: -7, lk: 1, rh: 7, rk: -1 },
      hold: { lean: 0, head: 4, ls: -34, le: 76, rs: 34, re: -76, lh: -7, lk: 1, rh: 7, rk: -1 },
      sad: { lean: 5, head: 18, ls: -5, le: 2, rs: 5, re: -2, lh: -5, lk: 1, rh: 5, rk: -1 },
      // Side-on poses, facing right: flip the figure to face left.
      sit: { lean: -4, head: 0, ls: 16, le: 50, rs: 24, re: 56, lh: 86, lk: -86, rh: 90, rk: -90 },
      walkA: { lean: 4, head: 0, ls: -24, le: 14, rs: 24, re: 18, lh: 24, lk: -6, rh: -20, rk: -24 },
      walkB: { lean: 4, head: 0, ls: 24, le: 18, rs: -24, re: 14, lh: -20, lk: -24, rh: 24, rk: -6 },
    };
    const JOINTS = ["lean", "head", "ls", "le", "rs", "re", "lh", "lk", "rh", "rk"];
    function figure(parent, { x = width / 2, y = height * 0.8, height: h = u * 30, colour, width: px = u * 0.7, face = "happy", flip = false } = {}) {
      const ink = colour || info.colours.text;
      const group = svg("g", { fill: "none", stroke: ink, "stroke-width": px, "stroke-linecap": "round", "stroke-linejoin": "round" }, parent);
      const inner = svg("g", {}, group);
      const part = () => svg("path", {}, inner);
      const head = part(), body = part(), armL = part(), armR = part(), legL = part(), legR = part();
      const faceGroup = svg("g", { fill: ink, stroke: "none" }, inner);
      const eyeL = svg("circle", { r: h * 0.012 }, faceGroup), eyeR = svg("circle", { r: h * 0.012 }, faceGroup);
      const mouth = svg("path", { fill: "none", stroke: ink, "stroke-width": px * 0.7 }, faceGroup);
      const L = { headR: h * 0.085, neck: h * 0.035, torso: h * 0.33, upper: h * 0.16, fore: h * 0.15, thigh: h * 0.22, shin: h * 0.21 };
      const rad = (deg) => (deg * Math.PI) / 180;
      // A limb from a joint: angle 0 hangs straight down.
      const from = (p, len, deg) => ({ x: p.x + Math.sin(rad(deg)) * len, y: p.y + Math.cos(rad(deg)) * len });
      let current = { ...POSES.stand };
      let pos = { x, y };
      const resolve = (p) => (typeof p === "string" ? POSES[p] || (() => { throw new Error('No pose called "' + p + '". Poses: ' + Object.keys(POSES).join(", ")); })() : { ...POSES.stand, ...p });

      function render() {
        const p = current;
        const hip = { x: 0, y: -(L.thigh + L.shin) };
        const top = from(hip, -L.torso, p.lean); // up the torso
        const shoulder = { x: hip.x + (top.x - hip.x) * 0.86, y: hip.y + (top.y - hip.y) * 0.86 };
        const neckTop = from(top, -L.neck, p.lean);
        const headC = from(neckTop, -L.headR, p.lean + p.head * 0.6);
        head.setAttribute("d", "M" + (headC.x + L.headR) + " " + headC.y + " a" + L.headR + " " + L.headR + " 0 1 0 " + -2 * L.headR + " 0 a" + L.headR + " " + L.headR + " 0 1 0 " + 2 * L.headR + " 0");
        body.setAttribute("d", "M" + neckTop.x + " " + neckTop.y + " L" + hip.x + " " + hip.y);
        const limb = (start, a1, l1, a2, l2) => {
          const mid = from(start, l1, a1);
          const end = from(mid, l2, a1 + a2);
          return "M" + start.x + " " + start.y + " L" + mid.x + " " + mid.y + " L" + end.x + " " + end.y;
        };
        armL.setAttribute("d", limb(shoulder, p.ls, L.upper, p.le, L.fore));
        armR.setAttribute("d", limb(shoulder, p.rs, L.upper, p.re, L.fore));
        legL.setAttribute("d", limb(hip, p.lh, L.thigh, p.lk, L.shin));
        legR.setAttribute("d", limb(hip, p.rh, L.thigh, p.rk, L.shin));
        // A simple face, looking the way the head tilts.
        const look = Math.sin(rad(p.head)) * L.headR * 0.3;
        eyeL.setAttribute("cx", headC.x - L.headR * 0.32 + look + L.headR * 0.18);
        eyeR.setAttribute("cx", headC.x + L.headR * 0.32 + look + L.headR * 0.18);
        eyeL.setAttribute("cy", headC.y - L.headR * 0.12);
        eyeR.setAttribute("cy", headC.y - L.headR * 0.12);
        const mx = headC.x + look + L.headR * 0.18, my = headC.y + L.headR * 0.38, mw = L.headR * 0.34;
        const curve = face === "happy" ? L.headR * 0.22 : face === "sad" ? -L.headR * 0.2 : face === "surprised" ? 0 : L.headR * 0.04;
        mouth.setAttribute("d", face === "surprised" ? "M" + (mx + L.headR * 0.09) + " " + my + " a" + L.headR * 0.09 + " " + L.headR * 0.11 + " 0 1 0 0.01 0"
          : "M" + (mx - mw) + " " + (my - curve * 0.3) + " Q" + mx + " " + (my + curve) + " " + (mx + mw) + " " + (my - curve * 0.3));
        faceGroup.style.display = face === "none" ? "none" : "";
        inner.setAttribute("transform", flip ? "scale(-1 1)" : "");
        group.setAttribute("transform", "translate(" + pos.x + " " + pos.y + ")");
      }

      const api = {
        group,
        /** The figure's strokes in drawing order: head, body, arms, legs. */
        paths: [head, body, armL, armR, legL, legR],
        poses: Object.keys(POSES),
        /** Set a pose, or blend from a to b by p (0 to 1). Poses are names or joint angles. */
        pose(a, b, p) {
          const from = resolve(a);
          if (b === undefined) current = { ...from };
          else {
            const to = resolve(b), k = clamp(p ?? 0);
            current = {};
            for (const j of JOINTS) current[j] = lerp(from[j] ?? 0, to[j] ?? 0, k);
          }
          render();
          return api;
        },
        /** Walk on the spot: call with t, and move the figure yourself for it to go somewhere. */
        walk(t, { stepsPerSecond = 2 } = {}) {
          const k = (Math.sin(t * Math.PI * stepsPerSecond) + 1) / 2;
          return api.pose("walkA", "walkB", k);
        },
        move(nx, ny) {
          pos = { x: nx, y: ny ?? pos.y };
          render();
          return api;
        },
        face(kind) {
          face = kind;
          render();
          return api;
        },
        /** Where a hand is now, in the stage's pixels: for something to hold or point at. */
        hand(side = "right") {
          const d = (side === "right" ? armR : armL).getAttribute("d").split(" L");
          const [hx, hy] = d[d.length - 1].split(" ").map(Number);
          return { x: pos.x + (flip ? -hx : hx), y: pos.y + hy };
        },
      };
      render();
      return api;
    }

    /**
     * A cartoon character: a bean-shaped body with a face, arms and legs, posed with the
     * same poses as kit.figure. kind "rubber" gives bendy hose limbs, white gloves and
     * big shoes, like 1930s cartoons; kind "flat" gives thin straight limbs and a
     * rounded box body, like 1950s cartoons. It squashes and stretches with t.squash(k).
     */
    function toon(parent, { x = width / 2, y = height * 0.8, height: H = u * 34, colour = "#FFFFFF", ink = "#1A1A1A", kind = "rubber", face: faceKind = "happy", flip = false, tongue: tongueColour = "#D9534F" } = {}) {
      const rubber = kind !== "flat";
      const legLen = H * 0.27, armLen = H * 0.3;
      const bodyH = H * 0.52, bodyW = H * (rubber ? 0.44 : 0.4);
      const bodyCY = -(legLen + bodyH * 0.48);
      const lw = Math.max(1.5, H * (rubber ? 0.022 : 0.016));
      const group = svg("g", {}, parent);
      const inner = svg("g", {}, group);
      const limbs = svg("g", { fill: "none", stroke: ink, "stroke-width": rubber ? H * 0.045 : H * 0.022, "stroke-linecap": "round" }, inner);
      const legL = svg("path", {}, limbs), legR = svg("path", {}, limbs);
      const shoes = svg("g", { fill: ink }, inner);
      const shoeL = svg("ellipse", { rx: H * (rubber ? 0.08 : 0.055), ry: H * (rubber ? 0.045 : 0.03) }, shoes);
      const shoeR = svg("ellipse", { rx: H * (rubber ? 0.08 : 0.055), ry: H * (rubber ? 0.045 : 0.03) }, shoes);
      const body = rubber
        ? svg("path", { d: "M0 " + (bodyCY - bodyH / 2) + " C" + bodyW * 0.62 + " " + (bodyCY - bodyH / 2) + " " + bodyW * 0.58 + " " + (bodyCY + bodyH / 2) + " 0 " + (bodyCY + bodyH / 2) +
            " C" + -bodyW * 0.58 + " " + (bodyCY + bodyH / 2) + " " + -bodyW * 0.62 + " " + (bodyCY - bodyH / 2) + " 0 " + (bodyCY - bodyH / 2) + " Z",
            fill: colour, stroke: ink, "stroke-width": lw }, inner)
        : svg("rect", { x: -bodyW / 2, y: bodyCY - bodyH / 2, width: bodyW, height: bodyH, rx: H * 0.09, fill: colour, stroke: ink, "stroke-width": lw }, inner);
      const arms = svg("g", { fill: "none", stroke: ink, "stroke-width": rubber ? H * 0.04 : H * 0.022, "stroke-linecap": "round" }, inner);
      const armL = svg("path", {}, arms), armR = svg("path", {}, arms);
      const hands = svg("g", { fill: rubber ? "#FFFFFF" : ink, stroke: ink, "stroke-width": lw * 0.8 }, inner);
      const handL = svg("circle", { r: H * (rubber ? 0.05 : 0.022) }, hands), handR = svg("circle", { r: H * (rubber ? 0.05 : 0.022) }, hands);
      // The face: eyes and a mouth, on the top of the body.
      const faceG = svg("g", {}, inner);
      const eyeY = bodyCY - bodyH * 0.16;
      const eyes = [-1, 1].map((side) => {
        const g = svg("g", {}, faceG);
        if (rubber) {
          svg("ellipse", { cx: side * H * 0.055, cy: eyeY, rx: H * 0.045, ry: H * 0.068, fill: "#FFFFFF", stroke: ink, "stroke-width": lw * 0.8 }, g);
          // A "pie" pupil: an oval with a small wedge cut out to catch the light.
          svg("ellipse", { cx: side * H * 0.06, cy: eyeY + H * 0.012, rx: H * 0.026, ry: H * 0.045, fill: ink }, g);
          svg("path", { d: "M" + (side * H * 0.06 + H * 0.004) + " " + (eyeY - H * 0.004) + " l" + H * 0.022 + " " + -H * 0.026 + " l" + H * 0.004 + " " + H * 0.02 + " Z", fill: "#FFFFFF" }, g);
        } else {
          svg("circle", { cx: side * H * 0.06, cy: eyeY, r: H * 0.02, fill: ink }, g);
          svg("path", { d: "M" + (side * H * 0.06 - H * 0.03) + " " + (eyeY - H * 0.05) + " l" + H * 0.06 + " " + side * H * 0.01, stroke: ink, "stroke-width": lw, "stroke-linecap": "round" }, g);
        }
        return g;
      });
      const mouth = svg("path", { stroke: ink, "stroke-width": lw, "stroke-linecap": "round", "stroke-linejoin": "round" }, faceG);
      const tongue = svg("path", { fill: tongueColour }, faceG);

      let current = { ...POSES.stand };
      let pos = { x, y }, squashK = 0, lookK = 0;
      const rad = (deg) => (deg * Math.PI) / 180;
      const from = (p, len, deg) => ({ x: p.x + Math.sin(rad(deg)) * len, y: p.y + Math.cos(rad(deg)) * len });
      const resolve = (p) => (typeof p === "string" ? POSES[p] || (() => { throw new Error('No pose called "' + p + '". Poses: ' + Object.keys(POSES).join(", ")); })() : { ...POSES.stand, ...p });

      function limb(start, a1, len, a2) {
        const mid = from(start, len / 2, a1);
        const end = from(mid, len / 2, a1 + a2);
        if (!rubber) return { d: "M" + start.x + " " + start.y + " L" + mid.x + " " + mid.y + " L" + end.x + " " + end.y, end };
        // A hose: one smooth curve that bends through the elbow, never an angle.
        // Even a straight hose bows a little, outwards from the body, so it never looks stiff.
        const dx = end.x - start.x, dy = end.y - start.y, l = Math.hypot(dx, dy) || 1;
        const side = start.x + end.x >= 0 ? 1 : -1;
        const bow = len * 0.14 * side;
        const cx = mid.x + (mid.x - (start.x + end.x) / 2) * 0.8 + (dy / l) * bow, cy = mid.y + (mid.y - (start.y + end.y) / 2) * 0.8 - (dx / l) * bow;
        return { d: "M" + start.x + " " + start.y + " Q" + cx + " " + cy + " " + end.x + " " + end.y, end };
      }

      function render() {
        const p = current;
        const shoulderY = bodyCY + bodyH * 0.02;
        const sL = { x: -bodyW * 0.46, y: shoulderY }, sR = { x: bodyW * 0.46, y: shoulderY };
        const hL = { x: -H * 0.08, y: -legLen }, hR = { x: H * 0.08, y: -legLen };
        // Arms swing out from the body's sides, so a resting arm hangs a little away from it.
        const aL = limb(sL, p.ls - 14, armLen, p.le), aR = limb(sR, p.rs + 14, armLen, p.re);
        armL.setAttribute("d", aL.d); armR.setAttribute("d", aR.d);
        handL.setAttribute("cx", aL.end.x); handL.setAttribute("cy", aL.end.y);
        handR.setAttribute("cx", aR.end.x); handR.setAttribute("cy", aR.end.y);
        const lL = limb(hL, p.lh, legLen, p.lk), lR = limb(hR, p.rh, legLen, p.rk);
        legL.setAttribute("d", lL.d); legR.setAttribute("d", lR.d);
        // Shoes point outwards, the way cartoon feet do.
        shoeL.setAttribute("cx", lL.end.x - H * 0.03); shoeL.setAttribute("cy", lL.end.y);
        shoeR.setAttribute("cx", lR.end.x + H * 0.03); shoeR.setAttribute("cy", lR.end.y);
        const look = lookK * H * 0.05;
        faceG.setAttribute("transform", "translate(" + look + " 0)");
        const my = bodyCY + bodyH * 0.06, mw = H * 0.09;
        tongue.setAttribute("d", "");
        if (faceKind === "open" || faceKind === "surprised") {
          const r = faceKind === "open" ? mw : mw * 0.45;
          mouth.setAttribute("d", "M" + -r + " " + my + " Q0 " + (my + r * 1.6) + " " + r + " " + my + " Z");
          mouth.setAttribute("fill", ink);
          if (faceKind === "open") tongue.setAttribute("d", "M" + -r * 0.5 + " " + (my + r * 0.75) + " Q0 " + (my + r * 0.35) + " " + r * 0.5 + " " + (my + r * 0.75) + " Q0 " + (my + r * 1.3) + " " + -r * 0.5 + " " + (my + r * 0.75) + " Z");
        } else {
          const curve = faceKind === "sad" ? -mw * 0.5 : faceKind === "neutral" ? 0 : mw * 0.7;
          mouth.setAttribute("d", "M" + -mw + " " + (my - curve * 0.2) + " Q0 " + (my + curve) + " " + mw + " " + (my - curve * 0.2));
          mouth.setAttribute("fill", "none");
        }
        const sx = 1 + squashK * 0.14, sy = 1 - squashK * 0.14;
        inner.setAttribute("transform", (flip ? "scale(-1 1) " : "") + "scale(" + sx + " " + sy + ")");
        group.setAttribute("transform", "translate(" + pos.x + " " + pos.y + ")");
      }

      const api = {
        group,
        poses: Object.keys(POSES),
        pose(a, b, p) {
          const fromP = resolve(a);
          if (b === undefined) current = { ...fromP };
          else {
            const to = resolve(b), k = clamp(p ?? 0);
            current = {};
            for (const j of JOINTS) current[j] = lerp(fromP[j] ?? 0, to[j] ?? 0, k);
          }
          render();
          return api;
        },
        walk(t, { stepsPerSecond = 2 } = {}) {
          return api.pose("walkA", "walkB", (Math.sin(t * Math.PI * stepsPerSecond) + 1) / 2);
        },
        move(nx, ny) { pos = { x: nx, y: ny ?? pos.y }; render(); return api; },
        /** Squash (positive, wider and shorter) or stretch (negative), about -1 to 1. */
        squash(k) { squashK = k; render(); return api; },
        /** Look left (-1) to right (1). */
        look(k) { lookK = k; render(); return api; },
        face(kindName) { faceKind = kindName; render(); return api; },
        hand(side = "right") {
          const c = side === "right" ? handR : handL;
          return { x: pos.x + (flip ? -1 : 1) * Number(c.getAttribute("cx")), y: pos.y + Number(c.getAttribute("cy")) };
        },
      };
      render();
      return api;
    }

    /**
     * Time that moves in steps, like animation drawn "on twos": stepped(t, 12) holds each
     * pose for a twelfth of a second. Pass it to springs and progress for a hand-made feel.
     */
    const stepped = (t, fps = 12) => Math.floor(t * fps + 1e-6) / fps;

    /** Comic panels laid out inside an area (kit.safe by default), with even gutters. Each rect is x, y, w, h as fractions. */
    function panels(rects, { area = safe, gutter = u * 1.6 } = {}) {
      return rects.map(([fx, fy, fw, fh]) => ({
        x: area.x + fx * area.width + (fx > 0 ? gutter / 2 : 0),
        y: area.y + fy * area.height + (fy > 0 ? gutter / 2 : 0),
        width: fw * area.width - (fx > 0 ? gutter / 2 : 0) - (fx + fw < 0.999 ? gutter / 2 : 0),
        height: fh * area.height - (fy > 0 ? gutter / 2 : 0) - (fy + fh < 0.999 ? gutter / 2 : 0),
      }));
    }

    /**
     * Manga speed lines. kind "focus" radiates thin wedges from (cx, cy) towards the edges
     * of a box; kind "motion" draws parallel streaks at an angle. Returns the group.
     */
    function speedLines(parent, { kind = "focus", cx = width / 2, cy = height / 2, box = { x: 0, y: 0, width, height }, count = 90, inner = u * 18, angle = 0, colour = "#111111", seed = 1 } = {}) {
      const rand = seeded(seed * 977);
      const g = svg("g", { fill: colour }, parent);
      const reach = Math.hypot(box.width, box.height);
      for (let i = 0; i < count; i++) {
        if (kind === "focus") {
          const a = (i / count) * Math.PI * 2 + rand() * 0.04;
          const r0 = inner * (0.8 + rand() * 0.6), w = (0.004 + rand() * 0.01);
          const p1 = [cx + Math.cos(a - w) * reach, cy + Math.sin(a - w) * reach];
          const p2 = [cx + Math.cos(a + w) * reach, cy + Math.sin(a + w) * reach];
          const tip = [cx + Math.cos(a) * r0, cy + Math.sin(a) * r0];
          svg("polygon", { points: [tip, p1, p2].map((p) => p.join(",")).join(" ") }, g);
        } else {
          const rad = (angle * Math.PI) / 180, dx = Math.cos(rad), dy = Math.sin(rad);
          const off = (rand() - 0.5) * reach, len = reach * (0.2 + rand() * 0.5), at = (rand() - 0.5) * reach;
          const ox = box.x + box.width / 2 - dy * off + dx * at, oy = box.y + box.height / 2 + dx * off + dy * at;
          const w = u * (0.08 + rand() * 0.25);
          svg("polygon", { points: [[ox, oy], [ox + dx * len - dy * w, oy + dy * len + dx * w], [ox + dx * len + dy * w, oy + dy * len - dx * w]].map((p) => p.join(",")).join(" ") }, g);
        }
      }
      // Keep the lines inside their panel.
      const clipId = "bf-speed-" + index + "-" + seed + "-" + Math.round(box.x);
      const clip = svg("clipPath", { id: clipId }, svg("defs", {}, parent));
      svg("rect", { x: box.x, y: box.y, width: box.width, height: box.height }, clip);
      g.setAttribute("clip-path", "url(#" + clipId + ")");
      return g;
    }

    /**
     * A screentone or hatch to fill shapes with, as in print: kind "dots", "lines" or
     * "cross". Returns a fill value, e.g. shape.setAttribute("fill", kit.tone(stage)).
     */
    let tones = 0;
    function tone(parent, { kind = "dots", size = u * 1.2, colour = "#111111", weight = 0.35, angle = 45 } = {}) {
      const id = "bf-tone-" + index + "-" + tones++;
      const defs = svg("defs", {}, parent);
      const p = svg("pattern", { id, patternUnits: "userSpaceOnUse", width: size, height: size, patternTransform: "rotate(" + angle + ")" }, defs);
      if (kind === "dots") svg("circle", { cx: size / 2, cy: size / 2, r: (size / 2) * weight * 1.6, fill: colour }, p);
      else {
        svg("rect", { x: 0, y: 0, width: size, height: size * weight * 0.6, fill: colour }, p);
        if (kind === "cross") svg("rect", { x: 0, y: 0, width: size * weight * 0.6, height: size, fill: colour }, p);
      }
      return "url(#" + id + ")";
    }

    /**
     * A shape cut from card or paper: a path filled with a colour, with an optional
     * paper rim (edge) round it and a soft drop shadow that lifts it off what's behind.
     * Returns { group, shape }.
     */
    function cutout(parent, d, { fill = info.colours.accent, edge = null, edgeWidth = u * 0.7, shadow = 0.22, lift = u * 0.6, shadowColour = "29 24 18" } = {}) {
      const g = svg("g", {}, parent);
      if (edge) svg("path", { d, fill: edge, stroke: edge, "stroke-width": edgeWidth * 2, "stroke-linejoin": "round" }, g);
      const shape = svg("path", { d, fill }, g);
      if (shadow > 0) g.style.filter = "drop-shadow(" + lift * 0.4 + "px " + lift + "px " + lift * 1.2 + "px rgb(" + shadowColour + " / " + shadow + "))";
      return { group: g, shape };
    }

    /**
     * A pop-up piece that stands up off the page, hinged along a line at y = base.
     * Draw into popup.group, then call popup.set(p) each frame: 0 lies flat, 1 stands
     * upright. Drive p with kit.spring for the springy paper overshoot.
     */
    function popup(parent, { base = height * 0.8, x = width / 2, lean = 14 } = {}) {
      const g = svg("g", {}, parent);
      return {
        group: g,
        set(p) {
          // Past upright (a spring overshoot) the card leans back a touch, never flips.
          const k = Math.max(0.001, Math.min(1.08, p));
          const skew = (1 - Math.min(1, k)) * lean;
          g.setAttribute("transform", "translate(" + x + " " + base + ") skewX(" + skew.toFixed(2) + ") scale(1 " + k.toFixed(4) + ") translate(" + -x + " " + -base + ")");
          g.style.opacity = p <= 0.002 ? "0" : "1";
          return this;
        },
      };
    }

    /**
     * A crayon scribble that colours in a shape: back-and-forth strokes at an angle,
     * clipped to the shape (a path's d, or a box). Returns { group, path, set(p) }:
     * set(p) colours in from 0 (nothing) to 1 (filled).
     */
    let scribbles = 0;
    function scribble(parent, { d = null, box = null, colour = info.colours.accent, gap = u * 1.1, width: px = u * 1.3, angle = -30, seed = 1, opacity = 0.9 } = {}) {
      const id = "bf-scribble-" + index + "-" + scribbles++;
      const clip = svg("clipPath", { id }, svg("defs", {}, parent));
      let b = box;
      const g = svg("g", { "clip-path": "url(#" + id + ")" }, parent);
      if (d) {
        svg("path", { d }, clip);
        if (!b) {
          // Measure the shape so the strokes cover it, whatever it is.
          const probe = svg("path", { d }, parent);
          const bb = probe.getBBox();
          probe.remove();
          b = { x: bb.x, y: bb.y, width: bb.width, height: bb.height };
        }
      } else {
        b = b || { x: 0, y: 0, width, height };
        svg("rect", { x: b.x, y: b.y, width: b.width, height: b.height }, clip);
      }
      const rand = seeded(seed * 613);
      const cx = b.x + b.width / 2, cy = b.y + b.height / 2;
      const reach = Math.hypot(b.width, b.height) / 2 + px;
      const rad = (angle * Math.PI) / 180, dx = Math.cos(rad), dy = Math.sin(rad);
      let path = "";
      let row = 0;
      // Zigzag rows across the box, rotated to the angle, each a little uneven.
      for (let s = -reach; s <= reach; s += gap, row++) {
        const side = row % 2 === 0 ? 1 : -1;
        const a = -reach * side - (rand() - 0.5) * gap * 2, z = reach * side + (rand() - 0.5) * gap * 2;
        const off = s + (rand() - 0.5) * gap * 0.5;
        const x1 = cx + dx * a - dy * off, y1 = cy + dy * a + dx * off;
        const x2 = cx + dx * z - dy * off, y2 = cy + dy * z + dx * off;
        path += (row === 0 ? "M" : " L") + x1.toFixed(1) + " " + y1.toFixed(1) + " L" + x2.toFixed(1) + " " + y2.toFixed(1);
      }
      const stroke = svg("path", { d: path, fill: "none", stroke: colour, "stroke-width": px, "stroke-linecap": "round", "stroke-linejoin": "round", opacity, pathLength: 1000 }, g);
      stroke.style.strokeDasharray = "1000 1001";
      return {
        group: g,
        path: stroke,
        set(p) { stroke.style.strokeDashoffset = String(1000 * (1 - clamp(p))); return this; },
      };
    }

    /**
     * A paper flap that folds over a crease, as in origami. points is the flap's outline
     * [[x, y], ...]; crease is the line it turns on [[x1, y1], [x2, y2]]. front and back
     * are the two sides of the paper. Returns { group, shape, set(p) }: 0 is unfolded,
     * 1 is folded flat over the crease.
     */
    function fold(parent, { points, crease, front = info.colours.accent, back = info.colours.surface, stroke = "none", strokeWidth = u * 0.15 }) {
      const g = svg("g", {}, parent);
      const shape = svg("polygon", { points: points.map((p) => p.join(",")).join(" "), fill: front, stroke, "stroke-width": strokeWidth, "stroke-linejoin": "round" }, g);
      const [[ax, ay], [bx, by]] = crease;
      const theta = (Math.atan2(by - ay, bx - ax) * 180) / Math.PI;
      const mix = (a, b, k) => "color-mix(in oklab, " + a + ", " + b + " " + (k * 100).toFixed(1) + "%)";
      return {
        group: g,
        shape,
        set(p) {
          const k = clamp(p);
          // Seen from straight on, a flap turning over its crease squashes across it.
          const s = Math.cos(Math.PI * k);
          g.setAttribute("transform", "translate(" + ax + " " + ay + ") rotate(" + theta + ") scale(1 " + (Math.abs(s) < 0.002 ? 0.002 : s).toFixed(4) + ") rotate(" + -theta + ") translate(" + -ax + " " + -ay + ")");
          // Paper turned edge-on to the light darkens, then the other side shows.
          const shade = Math.sin(Math.PI * k) * 0.35;
          shape.setAttribute("fill", mix(k < 0.5 ? front : back, "#000000", shade));
          return this;
        },
      };
    }

    /**
     * A soft round glow, like light through paper or from a lamp. Returns the circle;
     * change its opacity or r to pulse and flicker it.
     */
    let glows = 0;
    function glow(parent, { cx = width / 2, cy = height / 2, r = u * 20, colour = "#FFC56B", strength = 0.8 } = {}) {
      const id = "bf-glow-" + index + "-" + glows++;
      const grad = svg("radialGradient", { id }, svg("defs", {}, parent));
      [[0, strength], [0.35, strength * 0.55], [0.7, strength * 0.15], [1, 0]].forEach(([o, a]) => svg("stop", { offset: o, "stop-color": colour, "stop-opacity": a }, grad));
      return svg("circle", { cx, cy, r, fill: "url(#" + id + ")" }, parent);
    }

    /**
     * A watercolour wash: a shape of thin colour that blooms outward from a point, with
     * pigment pooling a little darker at its edge. Pass a style's paint filter as
     * filter to give it a soft, bleeding edge. Returns { group, shape, set(p) }:
     * set(p) spreads the colour from 0 (dry paper) to 1 (filled).
     */
    let washes = 0;
    function wash(parent, { d, colour = info.colours.accent, opacity = 0.6, from = null, filter = null, edge = 0.35 } = {}) {
      const id = "bf-wash-" + index + "-" + washes++;
      const defs = svg("defs", {}, parent);
      const probe = svg("path", { d }, parent);
      const bb = probe.getBBox();
      probe.remove();
      const [fx, fy] = from || [bb.x + bb.width * 0.35, bb.y + bb.height * 0.4];
      const reach = Math.hypot(Math.max(fx - bb.x, bb.x + bb.width - fx), Math.max(fy - bb.y, bb.y + bb.height - fy));
      const grad = svg("radialGradient", { id: id + "-g" }, defs);
      [[0, 1], [0.82, 1], [1, 0]].forEach(([o, a]) => svg("stop", { offset: o, "stop-color": "#FFFFFF", "stop-opacity": a }, grad));
      const mask = svg("mask", { id: id + "-m", maskUnits: "userSpaceOnUse", x: bb.x - u * 10, y: bb.y - u * 10, width: bb.width + u * 20, height: bb.height + u * 20 }, defs);
      const spot = svg("circle", { cx: fx, cy: fy, r: 0, fill: "url(#" + id + "-g)" }, mask);
      const g = svg("g", { mask: "url(#" + id + "-m)" }, parent);
      const inner = svg("g", filter ? { filter } : {}, g);
      const shape = svg("path", { d, fill: colour, "fill-opacity": opacity, stroke: colour, "stroke-opacity": Math.min(1, opacity * edge * 2), "stroke-width": u * 0.35, "stroke-linejoin": "round" }, inner);
      return {
        group: g,
        shape,
        set(p) { spot.setAttribute("r", String(reach * 1.25 * clamp(p))); return this; },
      };
    }

    /**
     * A layout grid inside the safe area, as a Swiss poster is built on. Returns the
     * column and row sizes, and cell(c, r, cols, rows) for the box spanning those cells.
     * grid.lines(parent) draws the grid itself, for when you want it to show.
     */
    function grid(cols = 12, rows = 8, { area = safe, gutter = u * 2 } = {}) {
      const colW = (area.width - gutter * (cols - 1)) / cols, rowH = (area.height - gutter * (rows - 1)) / rows;
      const x = (c) => area.x + c * (colW + gutter);
      const y = (r) => area.y + r * (rowH + gutter);
      return {
        cols, rows, colW, rowH, gutter, x, y,
        cell(c, r, cw = 1, rh = 1) { return { x: x(c), y: y(r), width: cw * colW + (cw - 1) * gutter, height: rh * rowH + (rh - 1) * gutter }; },
        lines(parent, { colour = info.colours.muted, width: w = 1, opacity = 0.25 } = {}) {
          let d = "";
          for (let c = 0; c < cols; c++) d += "M" + x(c) + " " + area.y + " V" + (area.y + area.height) + " M" + (x(c) + colW) + " " + area.y + " V" + (area.y + area.height) + " ";
          for (let r = 0; r < rows; r++) d += "M" + area.x + " " + y(r) + " H" + (area.x + area.width) + " M" + area.x + " " + (y(r) + rowH) + " H" + (area.x + area.width) + " ";
          return svg("path", { d, fill: "none", stroke: colour, "stroke-width": w, opacity }, parent);
        },
      };
    }

    /**
     * A comic starburst, the jagged "POW!" shape. Returns the path; scale and turn it to
     * make it punch in.
     */
    function burst(parent, { cx = width / 2, cy = height / 2, r = u * 18, inner = 0.7, points = 14, fill = info.colours.accent, stroke = info.colours.text, strokeWidth = u * 0.6, seed = 1 } = {}) {
      const rand = seeded(seed * 977);
      let d = "";
      for (let i = 0; i < points * 2; i++) {
        const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
        const k = i % 2 ? inner * (0.9 + rand() * 0.2) : 0.88 + rand() * 0.24;
        d += (i ? " L" : "M") + (cx + Math.cos(a) * r * k).toFixed(1) + " " + (cy + Math.sin(a) * r * k * 0.86).toFixed(1);
      }
      return svg("path", { d: d + " Z", fill, stroke, "stroke-width": strokeWidth, "stroke-linejoin": "miter" }, parent);
    }

    /**
     * A comic speech bubble (or a thought bubble), with its tail pointing at [x, y].
     * Returns { group, shape }; put the words on top with kit.text.
     */
    function bubble(parent, { x, y, width: w, height: h, tail, kind = "speech", fill = "#FFFFFF", stroke = info.colours.text, strokeWidth = u * 0.5 }) {
      const g = svg("g", {}, parent);
      const cx = x + w / 2, cy = y + h / 2;
      const [tx, ty] = tail || [x + w * 0.25, y + h + u * 6];
      if (kind === "thought") {
        const shape = svg("ellipse", { cx, cy, rx: w / 2, ry: h / 2, fill, stroke, "stroke-width": strokeWidth }, g);
        [0.35, 0.62, 0.85].forEach((k, i) => {
          const r = u * (1.8 - i * 0.5);
          svg("circle", { cx: cx + (tx - cx) * k, cy: cy + h / 2 * (1 - k) + (ty - cy) * k, r, fill, stroke, "stroke-width": strokeWidth }, g);
        });
        return { group: g, shape };
      }
      // One outline round the body and the tail, so they read as a single shape.
      const rx = w / 2, ry = h / 2;
      const a1 = Math.atan2(ty - cy, tx - cx);
      const spread = 0.22;
      const p = (a) => [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry];
      const [sx, sy] = p(a1 - spread), [ex, ey] = p(a1 + spread);
      const d = "M" + ex + " " + ey + " A" + rx + " " + ry + " 0 1 1 " + sx + " " + sy + " L" + tx + " " + ty + " Z";
      const shape = svg("path", { d, fill, stroke, "stroke-width": strokeWidth, "stroke-linejoin": "round" }, g);
      return { group: g, shape };
    }

    /**
     * One ink of a print, as on a risograph: a group whose shapes overprint the inks
     * under them (multiply), nudged by shift to look slightly out of register. Draw
     * every shape of that colour into it.
     */
    function ink(parent, { colour = info.colours.accent, shift = [0, 0], filter = null, opacity = 0.92 } = {}) {
      const g = svg("g", { fill: colour, transform: "translate(" + shift[0] + " " + shift[1] + ")" }, parent);
      g.style.mixBlendMode = "multiply";
      g.style.opacity = String(opacity);
      if (filter) g.setAttribute("filter", filter);
      return g;
    }

    /**
     * A neon tube along a path: a dim unlit glass tube, and over it the lit tube with a
     * hot white core and a soft halo. Returns { group, set(on) }: on is the brightness,
     * 0 (off) to 1 (fully lit); drive it with kit.random for flicker.
     */
    function neon(parent, d, { colour = info.colours.accent, width: w = u * 0.7 } = {}) {
      const g = svg("g", {}, parent);
      const line = (attrs) => svg("path", Object.assign({ d, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, attrs), g);
      line({ stroke: colour, "stroke-width": w, opacity: 0.2 });
      const lit = svg("g", {}, g);
      const halo = svg("path", { d, fill: "none", stroke: colour, "stroke-width": w * 5, "stroke-linecap": "round", "stroke-linejoin": "round", opacity: 0.35 }, lit);
      halo.style.filter = "blur(" + w * 2.2 + "px)";
      const bloom = svg("path", { d, fill: "none", stroke: colour, "stroke-width": w * 2.2, "stroke-linecap": "round", "stroke-linejoin": "round", opacity: 0.7 }, lit);
      bloom.style.filter = "blur(" + w * 0.7 + "px)";
      svg("path", { d, fill: "none", stroke: colour, "stroke-width": w, "stroke-linecap": "round", "stroke-linejoin": "round" }, lit);
      svg("path", { d, fill: "none", stroke: "color-mix(in oklab, " + colour + ", #FFFFFF 65%)", "stroke-width": w * 0.38, "stroke-linecap": "round", "stroke-linejoin": "round" }, lit);
      return { group: g, set(on) { lit.style.opacity = String(clamp(on)); return this; } };
    }

    /**
     * A device to show a product's screens in: kind "phone", "laptop" or "browser".
     * x and y are its top-left corner. Returns { group, screen, content }: screen is the
     * box of the display, and content is a group clipped to it, to draw the app into.
     */
    let devices = 0;
    function device(parent, { kind = "phone", x = safe.x, y = safe.y, width: w = u * 30, body = "#16181D", edge = "#3A3F4A" } = {}) {
      const id = "bf-device-" + index + "-" + devices++;
      const g = svg("g", {}, parent);
      let screen;
      if (kind === "phone") {
        const h = w * 2.05, r = w * 0.16, b = w * 0.045;
        svg("rect", { x, y, width: w, height: h, rx: r, fill: body, stroke: edge, "stroke-width": w * 0.012 }, g);
        screen = { x: x + b, y: y + b, width: w - b * 2, height: h - b * 2, r: r - b };
      } else if (kind === "laptop") {
        const h = w * 0.64, b = w * 0.025;
        svg("rect", { x, y, width: w, height: h, rx: w * 0.025, fill: body, stroke: edge, "stroke-width": w * 0.004 }, g);
        svg("path", { d: "M" + (x - w * 0.08) + " " + (y + h) + " H" + (x + w * 1.08) + " L" + (x + w * 1.04) + " " + (y + h + w * 0.035) + " H" + (x - w * 0.04) + " Z", fill: edge }, g);
        svg("rect", { x: x + w * 0.42, y: y + h, width: w * 0.16, height: w * 0.008, rx: w * 0.004, fill: body }, g);
        screen = { x: x + b, y: y + b, width: w - b * 2, height: h - b * 2, r: w * 0.008 };
      } else {
        const h = w * 0.62, bar = w * 0.05;
        svg("rect", { x, y, width: w, height: h, rx: w * 0.018, fill: body, stroke: edge, "stroke-width": w * 0.003 }, g);
        ["#FF5F57", "#FEBC2E", "#28C840"].forEach((c, i) => svg("circle", { cx: x + bar * (0.7 + i * 0.6), cy: y + bar / 2, r: bar * 0.17, fill: c }, g));
        screen = { x, y: y + bar, width: w, height: h - bar, r: w * 0.012 };
      }
      const clip = svg("clipPath", { id }, svg("defs", {}, g));
      svg("rect", { x: screen.x, y: screen.y, width: screen.width, height: screen.height, rx: screen.r }, clip);
      const content = svg("g", { "clip-path": "url(#" + id + ")" }, g);
      if (kind === "phone") svg("rect", { x: x + w * 0.36, y: y + w * 0.06, width: w * 0.28, height: w * 0.075, rx: w * 0.0375, fill: "#000000" }, g);
      return { group: g, screen, content };
    }

    /**
     * Pixel art from text: each string in art is a row, each character a pixel, coloured
     * by palette (a map from character to colour). "." and spaces are see-through. Draw at
     * (x, y) with pixels size big. Returns the group.
     */
    function pixels(parent, { art, palette, x = 0, y = 0, size = u } = {}) {
      const g = svg("g", { "shape-rendering": "crispEdges" }, parent);
      art.forEach((row, r) => {
        let c = 0;
        while (c < row.length) {
          const ch = row[c];
          let run = 1;
          while (c + run < row.length && row[c + run] === ch) run++;
          if (ch !== "." && ch !== " " && palette[ch]) svg("rect", { x: x + c * size, y: y + r * size, width: run * size + 0.5, height: size + 0.5, fill: palette[ch] }, g);
          c += run;
        }
      });
      return g;
    }

    /**
     * Text being typed: how much of text is showing at time t, typed from at at cps
     * characters a second. With cursor, a block cursor blinks at the end.
     */
    function typing(text, t, { at = 0, cps = 24, cursor = false } = {}) {
      const n = Math.max(0, Math.floor((t - at) * cps + 1e-6));
      const shown = String(text).slice(0, n);
      if (!cursor || t < at - 0.6) return shown;
      const done = n >= String(text).length;
      return shown + (!done || Math.floor(t * 2) % 2 === 0 ? "█" : " ");
    }

    /**
     * Isometric drawing: points, boxes and tiles on a grid seen from above at 30°.
     * kit.iso({ x, y, unit }) puts grid point (0, 0, 0) at (x, y); one grid step is unit pixels.
     */
    function iso({ x: ox = width / 2, y: oy = height / 2, unit = u * 6 } = {}) {
      const c = Math.cos(Math.PI / 6), s = Math.sin(Math.PI / 6);
      const at = (gx, gy, gz = 0) => ({ x: ox + (gx - gy) * c * unit, y: oy + (gx + gy) * s * unit - gz * unit });
      const pts = (list) => list.map((p) => p.x.toFixed(1) + "," + p.y.toFixed(1)).join(" ");
      const shade = (colour, amount) => "color-mix(in oklab, " + colour + ", " + (amount > 0 ? "white " + amount * 100 : "black " + -amount * 100) + "%)";
      return {
        at,
        /**
         * A box from (x, y, z), w along x, d along y and h tall. Faces are lit from the
         * top left. box.set({ h, z, ... }) changes it, e.g. to grow a bar from the ground.
         */
        box(parent, { x = 0, y = 0, z = 0, w = 1, d = 1, h = 1, colour = info.colours.accent, stroke = "none", strokeWidth = u * 0.25, edges = true } = {}) {
          const g = svg("g", { "stroke-linejoin": "round", stroke, "stroke-width": strokeWidth }, parent);
          const left = svg("polygon", { fill: shade(colour, -0.12) }, g);
          const right = svg("polygon", { fill: shade(colour, -0.32) }, g);
          // A thin light edge round the top catches the light, the way a real block does.
          const top = svg("polygon", { fill: shade(colour, 0.22), ...(edges && stroke === "none" ? { stroke: shade(colour, 0.55), "stroke-width": Math.max(1, u * 0.12) } : {}) }, g);
          let b = { x, y, z, w, d, h };
          const draw = () => {
            const { x, y, z, w, d, h } = b;
            const H = Math.max(0, h);
            top.setAttribute("points", pts([at(x, y, z + H), at(x + w, y, z + H), at(x + w, y + d, z + H), at(x, y + d, z + H)]));
            left.setAttribute("points", pts([at(x, y + d, z), at(x + w, y + d, z), at(x + w, y + d, z + H), at(x, y + d, z + H)]));
            right.setAttribute("points", pts([at(x + w, y, z), at(x + w, y + d, z), at(x + w, y + d, z + H), at(x + w, y, z + H)]));
          };
          draw();
          return { group: g, top, left, right, set(next) { b = { ...b, ...next }; draw(); return this; }, get box() { return { ...b }; } };
        },
        /** A flat tile on the ground (or at height z): floors, roads, water. */
        tile(parent, { x = 0, y = 0, z = 0, w = 1, d = 1, colour = info.colours.surface, stroke = "none", shadow = false } = {}) {
          return svg("polygon", { points: pts([at(x, y, z), at(x + w, y, z), at(x + w, y + d, z), at(x, y + d, z)]), fill: colour, stroke,
            // A ground with a soft shadow under it looks like a model on a table.
            ...(shadow ? { style: "filter:drop-shadow(0 " + unit * 0.5 + "px " + unit * 0.8 + "px rgb(29 36 51 / .18))" } : {}) }, parent);
        },
        /** A round tree: a short trunk and a two-tone crown. tree.set({ grow }) grows it from 0 to 1. */
        tree(parent, { x = 0, y = 0, size = 1, colour = "#3FA66B" } = {}) {
          const g = svg("g", {}, parent);
          const trunk = this.box(g, { x: x - 0.08 * size, y: y - 0.08 * size, w: 0.16 * size, d: 0.16 * size, h: 0.5 * size, colour: "#8A5A3C", edges: false });
          const c = at(x, y, 0.95 * size);
          const r = unit * 0.5 * size;
          const crown = svg("circle", { cx: c.x, cy: c.y, r, fill: colour }, g);
          const light = svg("circle", { cx: c.x - r * 0.28, cy: c.y - r * 0.3, r: r * 0.55, fill: shade(colour, 0.25) }, g);
          const base = at(x, y, 0);
          return {
            group: g,
            set({ grow = 1 } = {}) {
              g.style.transformOrigin = base.x + "px " + base.y + "px";
              g.style.transform = "scale(" + Math.max(0, grow) + ")";
              return this;
            },
          };
        },
        /** A grid of lines on the ground, from (0, 0) to (cols, rows). */
        grid(parent, { cols = 8, rows = 8, colour = info.colours.muted, width: px = 1, opacity = 0.35 } = {}) {
          const g = svg("g", { stroke: colour, "stroke-width": px, opacity }, parent);
          for (let i = 0; i <= cols; i++) { const a = at(i, 0), b = at(i, rows); svg("line", { x1: a.x, y1: a.y, x2: b.x, y2: b.y }, g); }
          for (let j = 0; j <= rows; j++) { const a = at(0, j), b = at(cols, j); svg("line", { x1: a.x, y1: a.y, x2: b.x, y2: b.y }, g); }
          return g;
        },
      };
    }

    /**
     * A dimension line, as on a technical drawing: extension marks at both ends, arrow
     * ticks and a label in the middle. Returns { group, paths, label } to draw in.
     */
    function dimension(parent, x1, y1, x2, y2, { label = "", offset = u * 3, colour = info.colours.text, width: px = Math.max(1, u * 0.18), size = 2.4 } = {}) {
      const len = Math.hypot(x2 - x1, y2 - y1) || 1;
      const nx = -(y2 - y1) / len, ny = (x2 - x1) / len;
      const ax = x1 + nx * offset, ay = y1 + ny * offset, bx = x2 + nx * offset, by = y2 + ny * offset;
      const g = svg("g", { fill: "none", stroke: colour, "stroke-width": px, "stroke-linecap": "round" }, parent);
      const ext1 = svg("path", { d: "M" + x1 + " " + y1 + " L" + (ax + nx * u) + " " + (ay + ny * u) }, g);
      const ext2 = svg("path", { d: "M" + x2 + " " + y2 + " L" + (bx + nx * u) + " " + (by + ny * u) }, g);
      const line = svg("path", { d: "M" + ax + " " + ay + " L" + bx + " " + by }, g);
      const t = u * 1.1, dx = (x2 - x1) / len, dy = (y2 - y1) / len;
      const ticks = svg("path", { d: "M" + (ax - (dx - nx) * t * 0.7) + " " + (ay - (dy - ny) * t * 0.7) + " L" + (ax + (dx - nx) * t * 0.7) + " " + (ay + (dy - ny) * t * 0.7) +
        " M" + (bx - (dx - nx) * t * 0.7) + " " + (by - (dy - ny) * t * 0.7) + " L" + (bx + (dx - nx) * t * 0.7) + " " + (by + (dy - ny) * t * 0.7) }, g);
      let labelEl = null;
      if (label) {
        const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
        const upright = angle > 90 || angle < -90 ? angle + 180 : angle;
        // The label sits on the side of the line away from what it measures.
        const side = offset >= 0 ? 1 : -1;
        labelEl = text(root, label, { x: (ax + bx) / 2 + nx * side * u * 2.6, y: (ay + by) / 2 + ny * side * u * 2.6, size, font: "mono", colour, align: "center",
          style: { translate: "-50% -50%", rotate: upright + "deg", padding: "0 " + u * 0.6 + "px" } });
      }
      return { group: g, paths: [ext1, ext2, line, ticks], label: labelEl };
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
      stage,
      text,
      icon,
      rough,
      figure,
      iso,
      dimension,
      toon,
      stepped,
      panels,
      speedLines,
      tone,
      cutout,
      popup,
      scribble,
      fold,
      glow,
      wash,
      grid,
      burst,
      bubble,
      ink,
      neon,
      device,
      pixels,
      typing,
    };
  }

  window.__bezelKit = { makers, create };
})();
`;
