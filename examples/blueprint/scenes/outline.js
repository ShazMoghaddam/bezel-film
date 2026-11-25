// The bottle's outline is plotted at constant speed, like a pen plotter, around a
// dash-dot centre line. A title block in the corner names the drawing.
Bezel.scene((root, kit) => {
  const { u, safe, colours, props } = kit;
  const s = kit.stage();
  const line = { fill: "none", stroke: colours.text, "stroke-width": Math.max(1.5, u * 0.28), "stroke-linecap": "round", "stroke-linejoin": "round" };
  const wide = kit.shape === "wide";
  const h = safe.height * (wide ? 0.86 : 0.7), w = h * (74 / 260);
  const cx = safe.x + safe.width * (wide ? 0.38 : 0.5), top = safe.y + safe.height * (wide ? 0.07 : 0.02);
  const r = w / 2;
  // One side of the bottle, from the cap down to the base; the other side mirrors it.
  const side = (k) => {
    const x = (dx) => cx + k * dx;
    return `M${x(r * 0.42)} ${top} L${x(r * 0.42)} ${top + h * 0.1} L${x(r * 0.5)} ${top + h * 0.12} ` +
      `C${x(r * 0.55)} ${top + h * 0.2} ${x(r)} ${top + h * 0.2} ${x(r)} ${top + h * 0.3} L${x(r)} ${top + h * 0.94} ` +
      `Q${x(r)} ${top + h} ${x(r * 0.85)} ${top + h} L${cx} ${top + h}`;
  };
  const left = kit.svg("path", { d: side(-1), ...line }, s);
  const right = kit.svg("path", { d: side(1), ...line }, s);
  const capLine = kit.svg("path", { d: `M${cx - r * 0.42} ${top} L${cx + r * 0.42} ${top} M${cx - r * 0.42} ${top + h * 0.1} L${cx + r * 0.42} ${top + h * 0.1}`, ...line }, s);
  const centre = kit.svg("path", { d: `M${cx} ${top - u * 3} L${cx} ${top + h + u * 3}`, ...line, "stroke-width": Math.max(1, u * 0.14),
    "stroke-dasharray": `${u * 3} ${u * 0.8} ${u * 0.5} ${u * 0.8}`, opacity: 0.8 }, s);

  // The title block: a framed box with the drawing's name and number.
  const bw = wide ? Math.min(safe.width * 0.36, u * 60) : Math.min(safe.width * 0.8, u * 60), bh = u * 18;
  const bx = wide ? safe.x + safe.width - bw : safe.x + (safe.width - bw) / 2, by = safe.y + safe.height - bh;
  const frame = kit.svg("path", { d: `M${bx} ${by} h${bw} v${bh} h${-bw} Z M${bx} ${by + bh * 0.55} h${bw} M${bx + bw * 0.6} ${by + bh * 0.55} v${bh * 0.45}`, ...line }, s);
  const name = kit.text(root, props.name.toUpperCase(), { x: bx + u * 2, y: by + u * 2.2, size: 4.2, font: "heading" });
  const dwg = kit.text(root, props.drawing, { x: bx + u * 2, y: by + bh * 0.55 + u * 2, size: 2.6, font: "mono", colour: colours.muted });
  const scale = kit.text(root, props.scale, { x: bx + bw * 0.6 + u * 2, y: by + bh * 0.55 + u * 2, size: 2.6, font: "mono", colour: colours.accent });

  const plan = kit.drawing();
  plan.line(centre, { at: 0.2, duration: 0.6, how: "linear" });
  // Both sides at once, as a plotter with two pens would, then the cap.
  plan.line(left, { at: 0.8, duration: 2.0, how: "linear" });
  plan.line(right, { at: 0.8, duration: 2.0, how: "linear" });
  plan.line(capLine, { at: 2.8, duration: 0.4, how: "linear" });
  const t = plan.sequence(Math.max(3.0, kit.at(1)), [{ node: frame, duration: 0.8 }, { node: name, duration: 0.6 }, { node: dwg, duration: 0.5 }, { node: scale, duration: 0.4 }]);

  return (time) => plan.draw(time);
});
