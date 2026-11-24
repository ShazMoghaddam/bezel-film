// A cut through the bottle: two walls with a hatched gap between them. The hatching
// fills in, then a callout points at the gap.
Bezel.scene((root, kit) => {
  const { u, safe, colours, props } = kit;
  const s = kit.stage();
  const line = { fill: "none", stroke: colours.text, "stroke-width": Math.max(1.5, u * 0.28), "stroke-linecap": "round", "stroke-linejoin": "round" };
  const h = safe.height * 0.78, w = h * 0.42;
  const cx = safe.x + safe.width * 0.36, top = safe.y + safe.height * 0.1;
  const outer = w / 2, inner = outer - u * 2.6;
  // Two U shapes, outer and inner wall, open at the top.
  const u_ = (r) => `M${cx - r} ${top} L${cx - r} ${top + h - r * 0.3} Q${cx - r} ${top + h} ${cx} ${top + h} Q${cx + r} ${top + h} ${cx + r} ${top + h - r * 0.3} L${cx + r} ${top}`;
  const outerWall = kit.svg("path", { d: u_(outer), ...line }, s);
  const innerWall = kit.svg("path", { d: u_(inner), ...line }, s);
  // Hatching in the gap: diagonal lines, clipped to the space between the walls.
  const clipId = "gap-" + kit.index;
  const clip = kit.svg("clipPath", { id: clipId }, kit.svg("defs", {}, s));
  // The ring between the walls: the outer shape with the inner one cut out of it.
  kit.svg("path", { d: `${u_(outer)} Z ${u_(inner)} Z`, "clip-rule": "evenodd" }, clip);
  const hatch = kit.svg("g", { "clip-path": `url(#${clipId})`, stroke: colours.palette[1], "stroke-width": Math.max(1, u * 0.16) }, s);
  const step = u * 1.6;
  const hatches = [];
  for (let k = -h; k < w + h; k += step) hatches.push(kit.svg("line", { x1: cx - outer + k, y1: top, x2: cx - outer + k - h, y2: top + h }, hatch));
  const label = kit.text(root, props.label, { x: cx, y: top + h + u * 3, size: 3.4, font: "heading", align: "center", colour: colours.muted });

  const gx = cx + outer - u * 1.3, gy = top + h * 0.45;
  const tx = safe.x + safe.width * 0.6, ty = top + h * 0.3;
  const leader = kit.svg("path", { d: `M${gx} ${gy} L${tx - u * 4} ${ty + u * 2.4} L${tx - u * 1} ${ty + u * 2.4}`, ...line, stroke: colours.accent }, s);
  const ring = kit.svg("circle", { cx: gx, cy: gy, r: u * 2.4, ...line, stroke: colours.accent }, s);
  const callout = kit.text(root, props.callout, { x: tx, y: ty, size: 5.4, font: "heading", colour: colours.accent });
  const note = kit.text(root, props.note, { x: tx, y: ty + u * 8, size: 3.8, colour: colours.text, maxWidth: safe.x + safe.width - tx });

  const plan = kit.drawing();
  plan.line(outerWall, { at: 0.2, duration: 1.4, how: "linear" });
  plan.line(innerWall, { at: 0.5, duration: 1.4, how: "linear" });
  const hatchAt = 1.8;
  const calloutAt = Math.max(3.2, kit.at(1));
  plan.sequence(calloutAt, [{ node: ring, duration: 0.35, how: "linear" }, { node: leader, duration: 0.45, how: "linear" }, { node: callout, duration: 0.6 }, { node: note, duration: 1.0 }]);
  plan.write(label, { at: 1.6, duration: 0.5 });

  return (t) => {
    plan.draw(t);
    // Hatching sweeps across from left to right.
    hatches.forEach((ln, i) => (ln.style.opacity = String(kit.progress(t, hatchAt + (i / hatches.length) * 1.2, 0.1))));
  };
});
