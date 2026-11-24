// Page one: three panels slam in on the beat. A dark bedroom with the clock at six; a
// close-up of the clock shaking with a huge sound effect; a sleepy speech bubble.
Bezel.scene((root, kit) => {
  const { u, safe, colours, props } = kit;
  const s = kit.stage();
  const ink = colours.text, paper = "#FFFFFF";
  const rects = kit.panels(kit.shape === "tall"
    ? [[0, 0, 1, 0.42], [0, 0.42, 0.55, 0.58], [0.55, 0.42, 0.45, 0.58]]
    : [[0, 0, 0.58, 1], [0.58, 0, 0.42, 0.55], [0.58, 0.55, 0.42, 0.45]]);
  const panels = rects.map((r, i) => panel(r, i));

  // Panel 1: the bedroom at night. Screentone dark, a window, the bed, the clock.
  const [p1, p2, p3] = panels;
  const r1 = rects[0];
  kit.svg("rect", { ...box(r1), fill: kit.tone(s, { kind: "dots", size: u * 0.9, weight: 0.7 }) }, p1.inner);
  kit.svg("rect", { x: r1.x + r1.width * 0.62, y: r1.y + r1.height * 0.1, width: r1.width * 0.26, height: r1.height * 0.32, fill: "#1A1A1A", stroke: paper, "stroke-width": u * 0.4 }, p1.inner);
  kit.svg("circle", { cx: r1.x + r1.width * 0.8, cy: r1.y + r1.height * 0.18, r: u * 2, fill: paper }, p1.inner);
  kit.svg("path", { d: `M${r1.x} ${r1.y + r1.height * 0.72} h${r1.width * 0.7} q${u * 3} 0 ${u * 3} ${u * 3} v${r1.height * 0.3} H${r1.x} Z`, fill: paper, stroke: ink, "stroke-width": u * 0.5 }, p1.inner);
  // The sleeper: a pillow, a head with closed eyes, and a blanket mound over the body.
  const bedTop = r1.y + r1.height * 0.72;
  const hx = r1.x + r1.width * 0.12, hy = bedTop - u * 3.4, hr = u * 3.2;
  kit.svg("rect", { x: hx - u * 5, y: bedTop - u * 2.6, width: u * 10, height: u * 3.6, rx: u * 1.6, fill: paper, stroke: ink, "stroke-width": u * 0.4 }, p1.inner);
  kit.svg("circle", { cx: hx, cy: hy, r: hr, fill: paper, stroke: ink, "stroke-width": u * 0.45 }, p1.inner);
  kit.svg("path", { d: `M${hx - hr * 0.55} ${hy} q${hr * 0.2} ${hr * 0.25} ${hr * 0.4} 0 M${hx + hr * 0.15} ${hy} q${hr * 0.2} ${hr * 0.25} ${hr * 0.4} 0`, fill: "none", stroke: ink, "stroke-width": u * 0.3, "stroke-linecap": "round" }, p1.inner);
  const mound = `M${hx + hr * 0.6} ${bedTop - u * 0.4} q${r1.width * 0.18} ${-u * 7} ${r1.width * 0.5} ${-u * 1} l0 ${u * 1.4} Z`;
  kit.svg("path", { d: mound, fill: paper, stroke: ink, "stroke-width": u * 0.45 }, p1.inner);
  kit.svg("path", { d: mound, fill: kit.tone(s, { kind: "lines", size: u * 0.8, weight: 0.3, angle: 30, colour: "#8A8A8A" }) }, p1.inner);
  const clockSmall = clock(r1.x + r1.width * 0.82, r1.y + r1.height * 0.62, u * 4.4, p1.inner);
  const z = kit.text(root, "z z z", { x: r1.x + r1.width * 0.2, y: r1.y + r1.height * 0.48, size: 4, font: "heading", colour: paper });

  // Panel 2: the clock close up, shaking inside focus lines, with the sound effect.
  const r2 = rects[1];
  kit.speedLines(p2.inner, { cx: r2.x + r2.width / 2, cy: r2.y + r2.height / 2, box: r2, inner: Math.min(r2.width, r2.height) * 0.36, count: 110, seed: 2 });
  const big = clock(r2.x + r2.width / 2, r2.y + r2.height / 2, Math.min(r2.width, r2.height) * 0.28, p2.inner);
  const sfx = kit.text(root, props.sfx, { x: r2.x + r2.width * 0.5, y: r2.y + r2.height * 0.1, size: Math.min(8, r2.width / u / 6.5), font: "heading", align: "center", colour: ink,
    style: { WebkitTextStroke: `${u * 0.9}px #FFFFFF`, paintOrder: "stroke fill", rotate: "-8deg", letterSpacing: "-0.02em" } });

  // Panel 3: a hand from under the covers, and a speech bubble.
  const r3 = rects[2];
  kit.svg("rect", { ...box(r3), fill: kit.tone(s, { kind: "lines", size: u * 0.8, weight: 0.35, angle: 0, colour: "#555555" }), opacity: 0.4 }, p3.inner);
  kit.svg("path", { d: `M${r3.x} ${r3.y + r3.height * 0.7} q${r3.width * 0.5} ${-u * 6} ${r3.width} ${-u * 2} V${r3.y + r3.height} H${r3.x} Z`, fill: paper, stroke: ink, "stroke-width": u * 0.5 }, p3.inner);
  const bx = r3.x + r3.width * 0.5, by = r3.y + r3.height * 0.34, bw = r3.width * 0.42, bh = r3.height * 0.2;
  kit.svg("path", { d: `M${bx - bw} ${by} a${bw} ${bh} 0 1 1 ${bw * 2} 0 a${bw} ${bh} 0 0 1 ${-bw * 1.2} ${bh * 0.95} l${-bw * 0.25} ${bh * 0.7} l${bw * 0.02} ${-bh * 0.75} a${bw} ${bh} 0 0 1 ${-bw * 0.57} ${-bh * 0.95} Z`, fill: paper, stroke: ink, "stroke-width": u * 0.4 }, p3.inner);
  const bubble = kit.text(root, props.bubble, { x: bx, y: by - u * 2, size: 3.2, font: "body", weight: 600, align: "center", colour: ink });

  const times = [0.15, Math.max(0.9, kit.at(1) - 0.2), Math.max(2.2, kit.at(2) - 0.2)];
  return (t) => {
    panels.forEach((p, i) => p.show(t - times[i]));
    z.style.opacity = String(kit.progress(t, times[0] + 0.3, 0.2) * (1 - kit.progress(t, times[1], 0.1)));
    // The clock rattles while it rings: a jitter that changes on every frame drawn.
    const ring = t > times[1] && t < times[2] + 0.4;
    const r = kit.random(Math.floor(t * 24) + 3);
    big.setAttribute("transform", ring ? `translate(${(r() - 0.5) * u * 1.6} ${(r() - 0.5) * u * 1.6}) rotate(${(r() - 0.5) * 8} ${r2.x + r2.width / 2} ${r2.y + r2.height / 2})` : "");
    clockSmall.setAttribute("transform", ring ? `translate(${(r() - 0.5) * u * 0.6} 0)` : "");
    const k = kit.spring(t - times[1] - 0.1, { stiffness: 320, damping: 11 });
    sfx.style.opacity = String(kit.clamp(k * 3));
    sfx.style.scale = String(Math.max(0, 0.6 + 0.4 * k));
    bubble.style.opacity = String(kit.progress(t, times[2] + 0.3, 0.15));
  };

  function box(r) { return { x: r.x, y: r.y, width: r.width, height: r.height }; }
  // A panel: its contents clipped to it, a thick border, and a slam-in when it appears.
  function panel(r, i) {
    const g = kit.svg("g", {}, s);
    const id = "panel-" + kit.index + "-" + i;
    kit.svg("rect", { ...box(r) }, kit.svg("clipPath", { id }, kit.svg("defs", {}, s)));
    kit.svg("rect", { ...box(r), fill: paper }, g);
    // Clip on the outer layer and push in on the inner one, so the push-in never
    // carries the contents past the panel's border.
    const clipped = kit.svg("g", { "clip-path": `url(#${id})` }, g);
    const inner = kit.svg("g", {}, clipped);
    kit.svg("rect", { ...box(r), fill: "none", stroke: ink, "stroke-width": u * 0.7 }, g);
    const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
    return {
      inner,
      show(dt) {
        const k = kit.progress(dt, 0, 0.16, "out");
        g.style.opacity = String(k > 0 ? 1 : 0);
        g.setAttribute("transform", `translate(${cx} ${cy}) scale(${1.08 - 0.08 * k}) translate(${-cx} ${-cy})`);
        // A slow push in on what's inside, so the panel never sits still.
        inner.setAttribute("transform", `translate(${cx} ${cy}) scale(${1 + Math.max(0, dt) * 0.015}) translate(${-cx} ${-cy})`);
      },
    };
  }
  function clock(x, y, r, parent) {
    const g = kit.svg("g", {}, parent);
    [-1, 1].forEach((side) => kit.svg("circle", { cx: x + side * r * 0.62, cy: y - r * 0.92, r: r * 0.32, fill: ink }, g));
    kit.svg("circle", { cx: x, cy: y, r, fill: paper, stroke: ink, "stroke-width": Math.max(2, r * 0.12) }, g);
    kit.svg("path", { d: `M${x} ${y} v${-r * 0.6} M${x} ${y} v${r * 0.62}`, stroke: ink, "stroke-width": Math.max(2, r * 0.1), "stroke-linecap": "round" }, g);
    [-1, 1].forEach((side) => kit.svg("path", { d: `M${x + side * r * 0.6} ${y + r * 0.8} l${side * r * 0.25} ${r * 0.35}`, stroke: ink, "stroke-width": Math.max(2, r * 0.12), "stroke-linecap": "round" }, g));
    return g;
  }
});
