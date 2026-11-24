// The last spread: a jar of honey pops up with bees circling it, and beside it a card
// with the fact, a tiny teaspoon and the line to remember.
Bezel.scene((root, kit) => {
  const { u, safe, colours, props, width } = kit;
  const s = kit.stage();
  const ink = colours.text, rim = "#FFFFFF";
  const base = safe.y + safe.height * 0.97;
  const wide = kit.shape === "wide";

  const ground = kit.popup(s, { base, x: width / 2 });
  kit.cutout(ground.group, `M${safe.x - u * 4} ${base} L${safe.x - u * 4} ${base - u * 6} Q${width / 2} ${base - u * 10} ${safe.x + safe.width + u * 4} ${base - u * 6} L${safe.x + safe.width + u * 4} ${base} Z`, { fill: "#6FAE6B", edge: rim });

  // The jar: glass, honey inside, a gingham-style lid and a paper label.
  const jx = wide ? safe.x + safe.width * 0.25 : width / 2, jw = Math.min(safe.width * 0.26, u * 34), jh = jw * 1.15;
  const jb = base - u * 5, jt = jb - jh;
  const jar = kit.popup(s, { base: jb, x: jx });
  const body = `M${jx - jw / 2} ${jt + u * 4} Q${jx - jw / 2} ${jt} ${jx - jw / 2 + u * 4} ${jt} H${jx + jw / 2 - u * 4} Q${jx + jw / 2} ${jt} ${jx + jw / 2} ${jt + u * 4} V${jb - u * 4} Q${jx + jw / 2} ${jb} ${jx + jw / 2 - u * 4} ${jb} H${jx - jw / 2 + u * 4} Q${jx - jw / 2} ${jb} ${jx - jw / 2} ${jb - u * 4} Z`;
  kit.cutout(jar.group, body, { fill: "#F3DFA8", edge: rim, lift: u });
  const honeyTop = jt + jh * 0.18;
  kit.cutout(jar.group, `M${jx - jw / 2 + u * 1.6} ${honeyTop} Q${jx} ${honeyTop + u * 2.5} ${jx + jw / 2 - u * 1.6} ${honeyTop} V${jb - u * 4} Q${jx + jw / 2 - u * 1.6} ${jb - u * 1.6} ${jx + jw / 2 - u * 5} ${jb - u * 1.6} H${jx - jw / 2 + u * 5} Q${jx - jw / 2 + u * 1.6} ${jb - u * 1.6} ${jx - jw / 2 + u * 1.6} ${jb - u * 4} Z`, { fill: "#E09A1A", shadow: 0 });
  kit.svg("path", { d: `M${jx - jw / 2 + u * 3.5} ${jt + jh * 0.3} v${jh * 0.45}`, stroke: "#FFFFFF", "stroke-width": u * 1.2, "stroke-linecap": "round", opacity: 0.55 }, jar.group);
  kit.cutout(jar.group, `M${jx - jw / 2 - u * 1.5} ${jt - u * 6} H${jx + jw / 2 + u * 1.5} V${jt + u * 0.5} H${jx - jw / 2 - u * 1.5} Z`, { fill: colours.accent, edge: rim, edgeWidth: u * 0.4 });
  const lw = jw * 0.72, lh = jh * 0.32, ly = jt + jh * 0.42;
  kit.cutout(jar.group, `M${jx - lw / 2} ${ly} H${jx + lw / 2} V${ly + lh} H${jx - lw / 2} Z`, { fill: "#FFFDF7", edge: rim, edgeWidth: u * 0.3, shadow: 0.12 });
  const label = kit.text(root, props.label, { x: jx, y: ly + lh / 2 - u * 3.4, size: 5.4, font: "heading", align: "center", colour: colours.accent });

  // Bees circling the jar on a tilted loop.
  const bees = [0, 1, 2].map((i) => {
    const g = kit.svg("g", {}, s);
    const bs = u * 1.8;
    kit.svg("ellipse", { cx: 0, cy: 0, rx: bs * 1.3, ry: bs * 0.95, fill: "#F2B705", stroke: ink, "stroke-width": u * 0.28 }, g);
    [-0.3, 0.3].forEach((k) => kit.svg("path", { d: `M${k * bs * 1.3} ${-bs * 0.9} q${bs * 0.3} ${bs * 0.9} 0 ${bs * 1.8}`, fill: "none", stroke: ink, "stroke-width": bs * 0.32, "stroke-linecap": "round" }, g));
    kit.svg("circle", { cx: bs * 0.75, cy: -bs * 0.2, r: bs * 0.14, fill: ink }, g);
    const wings = [-1, 1].map((k) => kit.svg("ellipse", { cx: -bs * 0.2 * k, cy: -bs * 0.9, rx: bs * 0.55, ry: bs * 0.85, fill: "#FFFFFF", stroke: ink, "stroke-width": u * 0.22 }, g));
    wings.forEach((w) => w.setAttribute("opacity", "0.88"));
    g.style.filter = `drop-shadow(${u * 0.3}px ${u * 0.7}px ${u * 0.5}px rgb(29 24 18 / .25))`;
    return { g, wings, phase: (i / 3) * Math.PI * 2 };
  });

  // The fact card on its stand, on the right in a wide frame, below the jar otherwise.
  const fw = wide ? Math.min(safe.width * 0.46, u * 70) : safe.width * 0.9;
  const fx = wide ? safe.x + safe.width * 0.7 : width / 2;
  const fy = wide ? safe.y + safe.height * 0.08 : safe.y;
  const fh = wide ? safe.height * 0.62 : jt - safe.y - u * 10;
  const card = kit.popup(s, { base, x: fx });
  kit.cutout(card.group, `M${fx - u * 1} ${fy + fh} h${u * 2} V${base} h${-u * 2} Z`, { fill: "#9B6A43", edge: rim, edgeWidth: u * 0.35 });
  kit.cutout(card.group, `M${fx - fw / 2 + u * 3} ${fy} H${fx + fw / 2 - u * 3} q${u * 3} 0 ${u * 3} ${u * 3} V${fy + fh - u * 3} q0 ${u * 3} ${-u * 3} ${u * 3} H${fx - fw / 2 + u * 3} q${-u * 3} 0 ${-u * 3} ${-u * 3} V${fy + u * 3} q0 ${-u * 3} ${u * 3} ${-u * 3} Z`, { fill: "#FFFDF7", edge: rim, lift: u });
  const fact = kit.text(root, props.fact, { x: fx, y: fy + u * 4, size: 3.6, align: "center", colour: colours.muted, weight: 700 });
  const amount = kit.text(root, props.amount, { x: fx, y: fy + u * 9, size: 15, font: "heading", align: "center", colour: colours.accent, style: { lineHeight: "1" } });
  const unit = kit.text(root, props.unit, { x: fx, y: fy + u * 26.5, size: 3.6, align: "center", colour: colours.muted, weight: 700 });
  // A tiny teaspoon with one drop on it.
  const spoon = kit.svg("g", {}, card.group);
  const sx = fx, sy = fy + fh - u * 10;
  kit.svg("path", { d: `M${sx - u * 12} ${sy} L${sx - u * 2} ${sy}`, stroke: "#8A8F98", "stroke-width": u * 1.1, "stroke-linecap": "round" }, spoon);
  kit.svg("ellipse", { cx: sx + u * 2.4, cy: sy, rx: u * 4.6, ry: u * 2.6, fill: "#B9BEC6", stroke: "#8A8F98", "stroke-width": u * 0.4 }, spoon);
  const drop = kit.svg("ellipse", { cx: sx + u * 2.4, cy: sy, rx: u * 1, ry: u * 0.75, fill: "#E09A1A" }, spoon);
  const line = kit.text(root, props.line, { x: wide ? fx : width / 2, y: wide ? fy + fh + u * 3 : base - u * 13, size: 5, font: "heading", align: "center", colour: "#FFFFFF",
    style: { background: colours.accent, padding: `${u * 1.2}px ${u * 3}px`, borderRadius: `${u * 1.4}px`, boxShadow: `0 0 0 ${u * 0.6}px #FFFFFF, 0 ${u * 0.7}px ${u * 1.4}px rgb(29 24 18 / .22)` } });

  const pop = (t, at) => kit.spring(t - at, { stiffness: 170, damping: 11 });
  const fade = (node, at, d = 0.3, x = "-50%") => { const p = kit.progress(t0, at, d); node.style.opacity = String(p); node.style.translate = `${x} ${(1 - p) * u * 1.5}px`; };
  let t0 = 0;
  return (t) => {
    t0 = t;
    ground.set(pop(t, 0.05));
    jar.set(pop(t, 0.2));
    card.set(pop(t, 0.6));
    fade(label, 0.6);
    fade(fact, 1.0);
    fade(amount, 1.3);
    fade(unit, 1.6);
    drop.style.opacity = String(kit.progress(t, 1.6, 0.3));
    fade(line, kit.at(1), 0.35);
    bees.forEach((b, i) => {
      const a = t * 1.6 + b.phase;
      const x = jx + Math.cos(a) * jw * 0.85, y = jt + jh * 0.1 + Math.sin(a) * jh * 0.22;
      const flap = Math.floor(t * 30 + i) % 2 ? 1 : 0.4;
      b.wings.forEach((w) => w.setAttribute("transform", `translate(0 ${-u * 0.8}) scale(1 ${flap}) translate(0 ${u * 0.8})`));
      b.g.setAttribute("transform", `translate(${x} ${y}) scale(${-Math.sin(a) >= 0 ? 1 : -1} 1)`);
      b.g.style.opacity = String(kit.progress(t, 0.8 + i * 0.15, 0.3));
    });
  };
});
