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
    };
  }

  window.__bezelKit = { makers, create };
})();
`;
