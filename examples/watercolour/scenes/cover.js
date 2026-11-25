// The journal's title page: a monarch is painted in, wash by wash, then inked over with
// its dark veins and white spots. A sprig of milkweed grows beside it, and the title is
// written in.
Bezel.scene((root, kit) => {
  const { u, safe, colours, props, width } = kit;
  const s = kit.stage();
  const plan = kit.drawing();
  const wide = kit.shape === "wide";
  const ink = "#2A231C";
  const pen = { fill: "none", stroke: ink, "stroke-linecap": "round", "stroke-linejoin": "round", filter: "url(#ink)" };

  // A monarch at (0, 0), wingspan about 2 × size. Built once, placed by its group.
  const monarch = (parent, size, seed) => {
    const S = size;
    const upper = (k) => `M0 ${-S * 0.05} C${k * S * 0.3} ${-S * 0.95} ${k * S * 1.2} ${-S * 0.8} ${k * S * 1} ${-S * 0.12} C${k * S * 0.85} ${S * 0.02} ${k * S * 0.35} ${S * 0.06} 0 0 Z`;
    const lower = (k) => `M0 ${S * 0.03} C${k * S * 0.4} ${-S * 0.02} ${k * S * 0.85} ${S * 0.18} ${k * S * 0.66} ${S * 0.58} C${k * S * 0.48} ${S * 0.86} ${k * S * 0.12} ${S * 0.66} 0 ${S * 0.14} Z`;
    const wings = [-1, 1].map((k) => {
      const g = kit.svg("g", {}, parent);
      const d = upper(k) + " " + lower(k);
      const paint = kit.wash(g, { d, colour: "#D9771F", opacity: 0.85, from: [k * S * 0.3, -S * 0.1], filter: "url(#paint)" });
      const deep = kit.wash(g, { d: `M0 0 C${k * S * 0.25} ${-S * 0.4} ${k * S * 0.6} ${-S * 0.45} ${k * S * 0.6} ${-S * 0.1} C${k * S * 0.5} ${S * 0.3} ${k * S * 0.2} ${S * 0.3} 0 ${S * 0.1} Z`, colour: "#B8501F", opacity: 0.55, filter: "url(#paint)" });
      // Ink: the outline with its thick dark border, then the veins.
      const outline = kit.svg("path", { d, ...pen, "stroke-width": S * 0.05 }, g);
      const veins = kit.svg("path", { d: `M${k * S * 0.05} ${-S * 0.05} Q${k * S * 0.5} ${-S * 0.5} ${k * S * 0.95} ${-S * 0.6} M${k * S * 0.05} ${-S * 0.02} Q${k * S * 0.55} ${-S * 0.2} ${k * S * 0.9} ${-S * 0.2} M${k * S * 0.05} ${S * 0.05} Q${k * S * 0.4} ${S * 0.2} ${k * S * 0.55} ${S * 0.55} M${k * S * 0.05} ${S * 0.08} Q${k * S * 0.25} ${S * 0.35} ${k * S * 0.3} ${S * 0.62}`, ...pen, "stroke-width": S * 0.025 }, g);
      // White spots just inside the wing's outer edge, found by walking along its outline.
      const rand = kit.random(seed + k * 7);
      const dots = kit.svg("g", { fill: "#FBF8F0", opacity: 0 }, g);
      const edge = kit.svg("path", { d: upper(k) }, g);
      const len = edge.getTotalLength();
      for (let i = 0; i < 9; i++) {
        const p = edge.getPointAtLength(len * (0.3 + i * 0.045));
        const pull = 0.88 - rand() * 0.04;
        kit.svg("circle", { cx: p.x * pull + k * S * 0.62 * (1 - pull), cy: p.y * pull + -S * 0.35 * (1 - pull), r: S * (0.022 + rand() * 0.014) }, dots);
      }
      edge.remove();
      return { g, paint, deep, outline, veins, dots };
    });
    const body = kit.svg("path", { d: `M0 ${-S * 0.28} C${S * 0.06} ${-S * 0.2} ${S * 0.06} ${S * 0.45} 0 ${S * 0.55} C${-S * 0.06} ${S * 0.45} ${-S * 0.06} ${-S * 0.2} 0 ${-S * 0.28} Z M0 ${-S * 0.28} Q${S * 0.15} ${-S * 0.6} ${S * 0.3} ${-S * 0.7} M0 ${-S * 0.28} Q${-S * 0.15} ${-S * 0.6} ${-S * 0.3} ${-S * 0.7}`, fill: ink, stroke: ink, "stroke-width": S * 0.02, filter: "url(#ink)" }, parent);
    return { wings, body };
  };

  const size = Math.min(safe.height * 0.3, u * 26);
  const bx = wide ? safe.x + safe.width * 0.7 : width / 2, by = wide ? safe.y + safe.height * 0.42 : safe.y + safe.height * 0.62;
  // The milkweed: a stem, two leaves and a rounded cluster of pink flowers.
  const stemX = bx - size * 1.2, stemTop = by + size * 0.3, stemBottom = safe.y + safe.height;
  // A pale ochre bloom behind everything, as if the page had a first wash.
  const ground = kit.wash(s, { d: `M${bx - size * 2.2} ${by} a${size * 2.2} ${size * 1.7} 0 1 0 ${size * 4.4} 0 a${size * 2.2} ${size * 1.7} 0 1 0 ${-size * 4.4} 0 Z`, colour: "#E3C27A", opacity: 0.28, filter: "url(#paint)", from: [bx, by] });
  const stem = kit.svg("path", { d: `M${stemX} ${stemBottom} C${stemX + u * 2} ${stemBottom - u * 15} ${stemX - u * 2} ${stemTop + u * 10} ${stemX} ${stemTop}`, ...pen, "stroke-width": u * 0.35 }, s);
  const leafD = [[1, 0.3], [-1, 0.45], [1, 0.62], [-1, 0.78]].map(([k, f]) => {
    const y = stemTop + (stemBottom - stemTop) * f, x = stemX;
    return `M${x} ${y} C${x + k * u * 5} ${y - u * 7} ${x + k * u * 14} ${y - u * 6} ${x + k * u * 18} ${y - u * 3} C${x + k * u * 13} ${y + u * 3.5} ${x + k * u * 5} ${y + u * 3} ${x} ${y} Z`;
  });
  const leaves = leafD.map((d, i) => kit.wash(s, { d, colour: "#3F7A5A", opacity: 0.6, filter: "url(#paint)", from: [stemX, 0] }));
  const leafInk = kit.svg("path", { d: leafD.join(" "), ...pen, "stroke-width": u * 0.2 }, s);
  const cluster = `M${stemX - u * 5} ${stemTop} a${u * 5} ${u * 4} 0 1 1 ${u * 10} 0 a${u * 5} ${u * 4} 0 1 1 ${-u * 10} 0 Z`;
  const flowers = kit.wash(s, { d: cluster, colour: "#C0567A", opacity: 0.55, filter: "url(#paint)" });
  const buds = kit.svg("g", { fill: "#A63E62", opacity: 0 }, s);
  const rb = kit.random(5);
  for (let i = 0; i < 12; i++) kit.svg("circle", { cx: stemX + (rb() - 0.5) * u * 8, cy: stemTop + (rb() - 0.5) * u * 6, r: u * (0.4 + rb() * 0.3) }, buds);

  const fly = kit.svg("g", {}, s);
  const m = monarch(fly, size, 3);

  const tx = wide ? safe.x : safe.x, tw = wide ? safe.width * 0.48 : safe.width;
  const kicker = kit.text(root, props.kicker, { x: tx, y: safe.y + safe.height * (wide ? 0.16 : 0.02), size: 3.4, font: "heading", colour: colours.accent });
  const title = kit.text(root, props.title, { x: tx, y: safe.y + safe.height * (wide ? 0.23 : 0.09), size: wide ? 9.5 : 8, font: "heading", colour: colours.text, maxWidth: tw, style: { lineHeight: "1.02", textWrap: "balance" } });
  // A margin note with an inked arrow to the wing.
  const aside = kit.text(root, props.aside, { x: bx - size * 0.35, y: Math.max(safe.y + u, by - size * 1.42), size: 2.8, font: "heading", colour: colours.muted, align: "right", style: { fontStyle: "italic" } });
  const ax = bx - size * 0.3, ay = Math.max(safe.y + u * 5, by - size * 1.2);
  const arrow = kit.svg("path", { d: `M${ax} ${ay} Q${ax + size * 0.05} ${ay + size * 0.3} ${bx - size * 0.55} ${by - size * 0.62} M${bx - size * 0.55} ${by - size * 0.62} l${-u * 0.3} ${-u * 1.6} M${bx - size * 0.55} ${by - size * 0.62} l${-u * 1.5} ${-u * 0.6}`, ...pen, "stroke-width": u * 0.2 }, s);
  const note = kit.text(root, props.note, { x: bx, y: by + size * 0.95, size: 2.8, font: "heading", colour: colours.muted, align: "center", style: { fontStyle: "italic" } });

  // Painting order: wings bloom, then ink goes over the top.
  plan.line(stem, { at: 0.2, duration: 0.8 });
  plan.line(leafInk, { at: 1.4, duration: 0.6 });
  m.wings.forEach((w, i) => {
    plan.line(w.outline, { at: 1.4 + i * 0.25, duration: 0.9 });
    plan.line(w.veins, { at: 2.1 + i * 0.2, duration: 0.7 });
  });
  plan.write(kicker, { at: 0.6, duration: 0.6 });
  plan.write(title, { at: 1.0, duration: 1.6 });
  plan.write(note, { at: 3.0, duration: 0.6 });
  plan.line(arrow, { at: 3.4, duration: 0.5 });
  plan.write(aside, { at: 3.6, duration: 0.6 });

  return (t) => {
    ground.set(kit.progress(t, 0, 1.6, "out"));
    m.wings.forEach((w, i) => {
      w.paint.set(kit.progress(t, 0.3 + i * 0.2, 1.4, "out"));
      w.deep.set(kit.progress(t, 0.9 + i * 0.2, 1.0, "out"));
      w.dots.style.opacity = String(kit.progress(t, 2.7 + i * 0.15, 0.4));
    });
    m.body.style.opacity = String(kit.progress(t, 1.3, 0.4));
    leaves.forEach((l, i) => l.set(kit.progress(t, 0.8 + i * 0.3, 1.0)));
    flowers.set(kit.progress(t, 1.1, 1.0));
    buds.style.opacity = String(kit.progress(t, 1.9, 0.5));
    // Once painted, it slowly opens and closes its wings, resting.
    const open = 0.82 + 0.18 * Math.cos(Math.max(0, t - 3.2) * 1.8);
    m.wings.forEach((w) => w.g.setAttribute("transform", `scale(${open} 1)`));
    fly.setAttribute("transform", `translate(${bx} ${by}) rotate(-12)`);
    plan.draw(t);
  };
});
