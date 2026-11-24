// The finished outline, with its measurements plotted beside it as each is spoken.
Bezel.scene((root, kit) => {
  const { u, safe, colours, props } = kit;
  const s = kit.stage();
  const line = { fill: "none", stroke: colours.text, "stroke-width": Math.max(1.5, u * 0.28), "stroke-linecap": "round", "stroke-linejoin": "round" };
  const h = safe.height * 0.74, w = h * (74 / 260);
  const cx = safe.x + safe.width * 0.42, top = safe.y + safe.height * 0.06, r = w / 2;
  const side = (k) => {
    const x = (dx) => cx + k * dx;
    return `M${x(r * 0.42)} ${top} L${x(r * 0.42)} ${top + h * 0.1} L${x(r * 0.5)} ${top + h * 0.12} ` +
      `C${x(r * 0.55)} ${top + h * 0.2} ${x(r)} ${top + h * 0.2} ${x(r)} ${top + h * 0.3} L${x(r)} ${top + h * 0.94} ` +
      `Q${x(r)} ${top + h} ${x(r * 0.85)} ${top + h} L${cx} ${top + h}`;
  };
  kit.svg("path", { d: side(-1) + " " + side(1) + ` M${cx - r * 0.42} ${top} L${cx + r * 0.42} ${top} M${cx - r * 0.42} ${top + h * 0.1} L${cx + r * 0.42} ${top + h * 0.1}`, ...line }, s);

  const tall = kit.dimension(s, cx - r, top + h, cx - r, top, { label: props.height, offset: -u * 9, colour: colours.accent, size: 3.6 });
  const wide = kit.dimension(s, cx - r, top + h, cx + r, top + h, { label: "⌀ " + props.width, offset: u * 5, colour: colours.accent, size: 3.6 });
  // A leader line from the body to a note about what it holds.
  const lx = cx + r * 0.6, ly = top + h * 0.55;
  const tx = cx + r + u * 22, ty = top + h * 0.38;
  const leader = kit.svg("path", { d: `M${lx} ${ly} L${tx - u * 6} ${ty + u * 2} L${tx - u * 1} ${ty + u * 2}`, ...line, stroke: colours.palette[1] }, s);
  const dot = kit.svg("circle", { cx: lx, cy: ly, r: u * 0.7, fill: colours.palette[1] }, s);
  const note = kit.text(root, props.volume, { x: tx, y: ty, size: 4.4, font: "heading", colour: colours.palette[1] });

  const plan = kit.drawing();
  const at = [kit.at(0) + 0.3, kit.at(0) + 1.8, kit.at(0) + 3.3];
  plan.sequence(at[0], tall.paths.map((node) => ({ node, duration: 0.3, how: "linear" })));
  plan.sequence(at[1], wide.paths.map((node) => ({ node, duration: 0.3, how: "linear" })));
  plan.sequence(at[2], [{ node: leader, duration: 0.5, how: "linear" }, { node: note, duration: 0.8 }]);

  return (t) => {
    plan.draw(t);
    if (tall.label) tall.label.style.opacity = String(kit.progress(t, at[0] + 0.9, 0.3));
    if (wide.label) wide.label.style.opacity = String(kit.progress(t, at[1] + 0.9, 0.3));
    dot.style.opacity = String(kit.progress(t, at[2], 0.2));
  };
});
