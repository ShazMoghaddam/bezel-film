// The fir forest where they spend the winter: trees are painted in, layer by layer, then
// monarchs gather on the branches in clusters. A note, the closing line and the source
// are written at the side.
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
  // A soft mountain wash behind, then three fir trees: stacked, drooping tiers.
  const area = wide ? { x: safe.x, w: safe.width * 0.58 } : { x: safe.x, w: safe.width };
  const ground = safe.y + safe.height;
  const hill = kit.wash(s, { d: `M${area.x - u * 6} ${ground} L${area.x - u * 6} ${safe.y + safe.height * 0.55} Q${area.x + area.w * 0.3} ${safe.y + safe.height * 0.2} ${area.x + area.w * 0.6} ${safe.y + safe.height * 0.45} Q${area.x + area.w * 0.95} ${safe.y + safe.height * 0.6} ${area.x + area.w + u * 6} ${ground} Z`, colour: "#7C8FA6", opacity: 0.3, filter: "url(#paint)" });
  const firs = [[0.22, 0.86, 0.9], [0.55, 1, 1.05], [0.85, 0.8, 0.85]].map(([fx, fh, fw], i) => {
    const x = area.x + area.w * fx, h = safe.height * 0.82 * fh, w = Math.min(area.w * 0.2, u * 22) * fw, top = ground - h;
    let d = "";
    for (let k = 0; k < 4; k++) {
      const y0 = top + (h * 0.82 * k) / 4, y1 = top + (h * 0.82 * (k + 1.4)) / 4, half = (w * (k + 1.5)) / 5.5;
      d += `M${x} ${y0} Q${x + half * 0.5} ${y1 - (y1 - y0) * 0.4} ${x + half} ${y1} Q${x} ${y1 - (y1 - y0) * 0.18} ${x - half} ${y1} Q${x - half * 0.5} ${y1 - (y1 - y0) * 0.4} ${x} ${y0} Z `;
    }
    const trunk = kit.svg("path", { d: `M${x} ${top + h * 0.75} V${ground}`, ...pen, stroke: "#5A4632", "stroke-width": u * 1.2 }, s);
    const tree = kit.wash(s, { d, colour: i === 1 ? "#2F5E5A" : "#4F7A6E", opacity: 0.62, filter: "url(#paint)", from: [x, top] });
    const outline = kit.svg("path", { d, ...pen, "stroke-width": u * 0.18 }, s);
    return { x, top, h, w, tree, outline, trunk };
  });

  // Clusters of small monarchs on the branches, each a dab of orange with a dark centre.
  const rand = kit.random(17);
  const clusters = [];
  firs.forEach((f, i) => {
    for (let c = 0; c < 3; c++) {
      const cy = f.top + f.h * (0.3 + c * 0.17), cx = f.x + (rand() - 0.5) * f.w * 0.5;
      const g = kit.svg("g", { opacity: 0 }, s);
      for (let b = 0; b < 9; b++) {
        const x = cx + (rand() - 0.5) * u * 8, y = cy + (rand() - 0.2) * u * 4, r = u * (0.9 + rand() * 0.5);
        kit.svg("ellipse", { cx: x, cy: y, rx: r, ry: r * 0.7, fill: "#D9771F", opacity: 0.85, filter: "url(#paint)", transform: `rotate(${(rand() - 0.5) * 50} ${x} ${y})` }, g);
        kit.svg("path", { d: `M${x} ${y - r * 0.6} V${y + r * 0.6}`, stroke: ink, "stroke-width": u * 0.2 }, g);
      }
      clusters.push({ g, at: 1.6 + i * 0.35 + c * 0.25 });
    }
  });
  // One butterfly drifting in to land.
  const flyer = kit.svg("g", {}, s);
  const m = monarch(flyer, u * 4, 30);

  const tx = wide ? safe.x + safe.width * 0.64 : safe.x, tw = wide ? safe.width * 0.36 : safe.width;
  const note = kit.text(root, props.note, { x: tx, y: wide ? safe.y + safe.height * 0.14 : safe.y, size: 3.2, font: "heading", colour: colours.muted, maxWidth: tw, style: { fontStyle: "italic" } });
  const line = kit.text(root, props.line, { x: tx, y: wide ? safe.y + safe.height * 0.24 : safe.y + u * 5, size: wide ? 6.4 : 5.2, font: "heading", colour: colours.text, maxWidth: tw, style: { lineHeight: "1.08", textWrap: "balance" } });
  const source = kit.text(root, props.source, { x: tx, y: wide ? safe.y + safe.height * 0.9 : line.getBoundingClientRect().bottom + u * 2, size: 2.4, colour: colours.muted, maxWidth: tw });

  firs.forEach((f, i) => { plan.line(f.trunk, { at: 0.2 + i * 0.2, duration: 0.4 }); plan.line(f.outline, { at: 0.8 + i * 0.25, duration: 0.9 }); });
  plan.write(note, { at: 0.6, duration: 0.7 });
  plan.write(line, { at: Math.max(2.2, kit.at(1) - 0.2), duration: 1.4 });
  plan.write(source, { at: Math.max(3, kit.at(1) + 1), duration: 0.6 });

  const land = firs[1];
  return (t) => {
    hill.set(kit.progress(t, 0, 1.4, "out"));
    firs.forEach((f, i) => f.tree.set(kit.progress(t, 0.4 + i * 0.25, 1.2, "out")));
    clusters.forEach((c) => (c.g.style.opacity = String(kit.progress(t, c.at, 0.6))));
    // The last butterfly flutters down from the top right to the middle tree.
    const p = kit.progress(t, 1.2, 2.6, "out");
    const x = kit.lerp(area.x + area.w * 1.05, land.x + u * 4, p) + Math.sin(p * 9) * u * 2 * (1 - p);
    const y = kit.lerp(safe.y, land.top + land.h * 0.22, p);
    flyer.setAttribute("transform", `translate(${x} ${y}) rotate(${(1 - p) * 30})`);
    const flap = p < 1 ? (Math.floor(t * 24) % 2 ? 1 : 0.4) : 0.85 + 0.15 * Math.cos(t * 1.5);
    m.wings.forEach((w) => {
      w.paint.set(1);
      w.deep.set(1);
      w.dots.style.opacity = "1";
      w.g.setAttribute("transform", `scale(${flap} 1)`);
    });
    plan.draw(t);
  };
});
