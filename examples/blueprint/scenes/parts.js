// An exploded view: cap, seal and body slide apart along a dashed axis, each with a
// numbered balloon and its name.
Bezel.scene((root, kit) => {
  const { u, safe, colours, props } = kit;
  const s = kit.stage();
  const line = { fill: "none", stroke: colours.text, "stroke-width": Math.max(1.5, u * 0.28), "stroke-linecap": "round", "stroke-linejoin": "round" };
  const cx = safe.x + safe.width * 0.4;
  const h = safe.height * 0.62, r = h * 0.15;
  const axis = kit.svg("path", { d: `M${cx} ${safe.y} L${cx} ${safe.y + safe.height}`, ...line, "stroke-width": Math.max(1, u * 0.14), "stroke-dasharray": `${u * 1.2} ${u * 0.9}`, opacity: 0.7 }, s);
  // Each part drawn around its own origin, then moved apart.
  const capG = kit.svg("g", {}, s), sealG = kit.svg("g", {}, s), bodyG = kit.svg("g", {}, s);
  const cap = kit.svg("path", { d: `M${cx - r * 0.5} 0 h${r} v${h * 0.12} h${-r} Z M${cx - r * 0.5} ${h * 0.04} h${r}`, ...line }, capG);
  const seal = kit.svg("path", { d: `M${cx - r * 0.56} 0 h${r * 1.12} v${h * 0.025} h${-r * 1.12} Z`, ...line, stroke: colours.palette[1] }, sealG);
  const body = kit.svg("path", { d: `M${cx - r * 0.42} 0 L${cx - r * 0.5} ${h * 0.03} C${cx - r * 0.55} ${h * 0.1} ${cx - r} ${h * 0.1} ${cx - r} ${h * 0.2} L${cx - r} ${h * 0.86} Q${cx - r} ${h * 0.9} ${cx - r * 0.85} ${h * 0.9} L${cx + r * 0.85} ${h * 0.9} Q${cx + r} ${h * 0.9} ${cx + r} ${h * 0.86} L${cx + r} ${h * 0.2} C${cx + r} ${h * 0.1} ${cx + r * 0.55} ${h * 0.1} ${cx + r * 0.5} ${h * 0.03} L${cx + r * 0.42} 0`, ...line }, bodyG);
  const together = { cap: safe.y + safe.height * 0.25, seal: safe.y + safe.height * 0.25 + h * 0.12, body: safe.y + safe.height * 0.25 + h * 0.13 };
  const apart = { cap: safe.y + safe.height * 0.04, seal: safe.y + safe.height * 0.2, body: safe.y + safe.height * 0.33 };
  const parts = [["cap", capG, h * 0.06], ["seal", sealG, h * 0.0125], ["body", bodyG, h * 0.4]];
  const balloons = parts.map(([key, g, mid], i) => {
    const b = kit.svg("g", {}, s);
    const bx = cx + safe.width * 0.2, by = apart[key] + mid;
    kit.svg("path", { d: `M${cx + r * 0.6} ${by} L${bx - u * 3} ${by}`, ...line, stroke: colours.accent }, b);
    kit.svg("circle", { cx: bx, cy: by, r: u * 3, ...line, stroke: colours.accent }, b);
    const num = kit.text(root, String(i + 1), { x: bx, y: by - u * 2, size: 3.6, font: "heading", align: "center", colour: colours.accent });
    const name = kit.text(root, props.parts[i], { x: bx + u * 5, y: by - u * 2.2, size: 4.2, font: "heading" });
    return { b, num, name };
  });

  const plan = kit.drawing();
  plan.line(axis, { at: 0.1, duration: 0.5, how: "linear" });
  plan.sequence(0.3, [{ node: body, duration: 1.0, how: "linear" }, { node: seal, duration: 0.3, how: "linear" }, { node: cap, duration: 0.5, how: "linear" }]);
  const splitAt = 2.3;

  return (t) => {
    plan.draw(t);
    parts.forEach(([key, g], i) => {
      const k = kit.spring(t - splitAt - i * 0.1, { stiffness: 120, damping: 18 });
      g.setAttribute("transform", `translate(0 ${kit.lerp(together[key], apart[key], k)})`);
      const shown = kit.progress(t, splitAt + 0.6 + i * 0.25, 0.3);
      balloons[i].b.style.opacity = balloons[i].num.style.opacity = balloons[i].name.style.opacity = String(shown);
    });
  };
});
