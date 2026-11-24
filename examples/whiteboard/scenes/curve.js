// Axes are ruled in, then the growth curve is drawn year by year, bending upwards.
// The pen marks three moments on it, each value landing as it's spoken.
Bezel.scene((root, kit) => {
  const { u, safe, colours, props } = kit;
  const s = kit.stage();
  const ink = colours.text;
  const blue = colours.palette[0];
  const years = props.marks[props.marks.length - 1];
  const value = (y) => props.start * Math.pow(1 + props.rate, y);
  const maxV = value(years) * 1.12;

  const x0 = safe.x + u * 8, x1 = safe.x + safe.width - u * 6;
  const y0 = safe.y + safe.height - u * 7, y1 = safe.y + u * 4;
  const px = (y) => x0 + (y / years) * (x1 - x0);
  const py = (v) => y0 - (v / maxV) * (y0 - y1);

  const axes = kit.svg("g", { fill: "none", stroke: ink, "stroke-width": u * 0.5, "stroke-linecap": "round" }, s);
  const xAxis = kit.svg("path", { d: kit.rough.line(x0 - u, y0, x1 + u * 2, y0, { seed: 1 }) }, axes);
  const yAxis = kit.svg("path", { d: kit.rough.line(x0, y0 + u, x0, y1 - u * 2, { seed: 2 }) }, axes);
  const title = kit.text(root, props.title, { x: x0 + u * 4, y: y1, size: 5.6, font: "heading" });

  // The curve, a point a year, so it's drawn smoothly from the left.
  let d = "";
  for (let y = 0; y <= years; y += 0.5) d += (y ? " L" : "M") + px(y).toFixed(1) + " " + py(value(y)).toFixed(1);
  const curve = kit.svg("path", { d, fill: "none", stroke: blue, "stroke-width": u * 0.75, "stroke-linecap": "round", "stroke-linejoin": "round" }, s);
  // A wash under the curve, filled in once it's drawn.
  const area = kit.svg("path", { d: d + ` L${px(years)} ${y0} L${x0} ${y0} Z`, fill: `color-mix(in srgb, ${blue} 10%, transparent)`, stroke: "none" }, s);
  s.prepend(area);

  const plan = kit.drawing({ pen: true, penColour: colours.accent });
  let t = plan.sequence(0.15, [{ node: xAxis, duration: 0.5 }, { node: yAxis, duration: 0.4 }, { node: title, duration: 0.9 }]);
  const curveAt = Math.max(t + 0.1, kit.at(0) + 0.3);
  plan.line(curve, { at: curveAt, duration: Math.max(1.6, kit.at(1) - curveAt + 0.6), how: "inOut" });

  // Marks: each lands on its sentence, or spread out if the narration is short.
  const markTimes = [kit.at(1), (kit.at(1) + kit.at(2)) / 2, kit.at(2) + 0.6];
  const marks = props.marks.map((y, i) => {
    const x = px(y), v = value(y), yy = py(v);
    const dot = kit.svg("circle", { cx: x, cy: yy, r: u * 1.1, fill: colours.accent }, s);
    const tick = kit.svg("path", { d: kit.rough.line(x, yy + u * 2, x, y0, { seed: 30 + i }), fill: "none", stroke: colours.muted, "stroke-width": u * 0.25, "stroke-dasharray": `${u} ${u * 0.9}` }, s);
    const label = kit.text(root, props.currency + Math.round(v), { x: x - u * 1.5, y: yy - u * 9.5, size: 6, font: "heading", align: "right", colour: colours.accent });
    const year = kit.text(root, y + " yrs", { x, y: y0 + u * 1.2, size: 4, align: "center" });
    const at = markTimes[i] ?? curveAt + 1 + i;
    plan.write(label, { at: at + 0.1, duration: 0.55 });
    return { dot, tick, year, at };
  });

  return (time) => {
    plan.draw(time);
    area.style.opacity = String(kit.progress(time, curveAt + 1.2, 0.8));
    for (const m of marks) {
      const p = kit.spring(time - m.at, { stiffness: 260, damping: 14 });
      m.dot.style.transformOrigin = `${m.dot.getAttribute("cx")}px ${m.dot.getAttribute("cy")}px`;
      m.dot.style.transform = `scale(${Math.max(0, p)})`;
      m.tick.style.opacity = m.year.style.opacity = String(kit.progress(time, m.at, 0.3));
    }
  };
});
