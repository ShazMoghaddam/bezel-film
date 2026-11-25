// Four generations in a row along a painted band that runs from spring green to autumn
// orange. The first three are small and live a few weeks; the fourth, the super
// generation, is painted bigger and circled in ink: up to eight months.
Bezel.scene((root, kit) => {
  const { u, safe, colours, props } = kit;
  const s = kit.stage();
  const plan = kit.drawing();
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
  const heading = kit.text(root, props.heading, { x: safe.x, y: safe.y, size: 6.4, font: "heading", colour: colours.text });
  const n = props.labels.length;
  const colW = safe.width / n;
  const lineY = safe.y + safe.height * 0.6;
  // The seasons band: a long wash, green into ochre into orange.
  const band = [["#3F7A5A", 0, 0.4], ["#966210", 0.3, 0.75], ["#B8501F", 0.65, 1]].map(([colour, a, b], i) => kit.wash(s, {
    d: `M${safe.x + safe.width * a} ${lineY - u * 2.2} H${safe.x + safe.width * b} V${lineY + u * 2.2} H${safe.x + safe.width * a} Z`, colour, opacity: 0.32, filter: "url(#paint)", from: [safe.x + safe.width * a, lineY] }));
  const line = kit.svg("path", { d: `M${safe.x} ${lineY} H${safe.x + safe.width}` + props.labels.map((_, i) => ` M${safe.x + colW * (i + 0.5)} ${lineY - u} V${lineY + u}`).join(""), ...pen, "stroke-width": u * 0.25 }, s);

  const flies = props.labels.map((label, i) => {
    const last = i === n - 1;
    const x = safe.x + colW * (i + 0.5), size = last ? Math.min(colW * 0.36, u * 17) : Math.min(colW * 0.24, u * 11);
    const y = lineY - size * 1.35 - u * 3;
    const g = kit.svg("g", { transform: `translate(${x} ${y}) rotate(${(i % 2 ? 8 : -8)})` }, s);
    const m = monarch(g, size, 10 + i);
    const narrow = kit.shape !== "wide";
    const season = kit.text(root, label, { x, y: lineY + u * 3, size: narrow ? 2.8 : 3.6, maxWidth: narrow ? colW * 0.96 : undefined, font: "heading", align: "center", colour: colours.muted, style: { fontStyle: "italic" } });
    const life = kit.text(root, last ? props.long : props.short, { x, y: lineY + u * (narrow ? 10 : 8), size: narrow ? (last ? 3.4 : 2.8) : last ? 5 : 3.8, maxWidth: narrow ? colW * 0.96 : undefined, font: "heading", align: "center", colour: last ? colours.accent : colours.text });
    return { m, season, life, x, size, last };
  });
  // An ink ring round the long-lived one, drawn as a loose hand circle.
  const big = flies[n - 1];
  const ring = kit.svg("path", { d: kit.rough.ellipse(big.x, lineY + u * (kit.shape === "wide" ? 11 : 14), colW * 0.48, u * (kit.shape === "wide" ? 4.8 : 6), { seed: 4, wobble: 0.5 }), ...pen, stroke: colours.accent, "stroke-width": u * 0.3 }, s);

  const first = Math.max(0.6, kit.at(0) - 0.2), turn = Math.max(first + 2, kit.at(1) - 0.1);
  plan.write(heading, { at: 0.1, duration: 0.8 });
  plan.line(line, { at: 0.3, duration: 1.0 });
  flies.forEach((f, i) => {
    const at = f.last ? turn : first + i * 0.45;
    f.at = at;
    f.m.wings.forEach((w, k) => { plan.line(w.outline, { at: at + 0.4 + k * 0.1, duration: 0.6 }); plan.line(w.veins, { at: at + 0.8, duration: 0.5 }); });
    plan.write(f.season, { at: at + 0.2, duration: 0.5 });
    plan.write(f.life, { at: at + 0.9, duration: 0.6 });
  });
  plan.line(ring, { at: Math.max(turn + 1.6, kit.at(2) || 0), duration: 0.7 });

  return (t) => {
    band.forEach((b, i) => b.set(kit.progress(t, 0.2 + i * 0.3, 1.2)));
    flies.forEach((f) => {
      f.m.wings.forEach((w, k) => {
        w.paint.set(kit.progress(t, f.at + k * 0.1, 1.0, "out"));
        w.deep.set(kit.progress(t, f.at + 0.4 + k * 0.1, 0.8, "out"));
        w.dots.style.opacity = String(kit.progress(t, f.at + 1.1, 0.3));
      });
      f.m.body.style.opacity = String(kit.progress(t, f.at + 0.3, 0.3));
      const open = 0.8 + 0.2 * Math.cos(Math.max(0, t - f.at - 1.4) * 2);
      f.m.wings.forEach((w) => w.g.setAttribute("transform", `scale(${open} 1)`));
    });
    plan.draw(t);
  };
});
