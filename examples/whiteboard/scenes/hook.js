// The question is written in by the pen. The last word is circled in red, with an
// arrow shooting up beside it: the "faster" the film is about.
Bezel.scene((root, kit) => {
  const { u, safe, colours } = kit;
  const s = kit.stage();
  const size = kit.shape === "tall" ? 10 : 11.5;
  const lineHeight = size * u * 1.45;
  const total = lineHeight * 3.1;
  const top = safe.y + (safe.height - total) / 2;
  const cx = safe.x + safe.width / 2;

  const lines = kit.props.lines.map((words, i) =>
    kit.text(root, words, { x: cx, y: top + i * lineHeight, size, font: "heading", align: "center" }));
  const pop = kit.text(root, kit.props.pop, { x: cx, y: top + 2 * lineHeight, size: size * 1.15, font: "heading", align: "center", colour: colours.accent });

  // Shapes around the last word, measured once it's laid out.
  const r = pop.getBoundingClientRect();
  const ink = kit.svg("g", { fill: "none", stroke: colours.accent, "stroke-width": u * 0.55, "stroke-linecap": "round", "stroke-linejoin": "round" }, s);
  const loop = kit.svg("path", { d: kit.rough.ellipse(r.left + r.width / 2, r.top + r.height * 0.55, r.width * 0.64, r.height * 0.6, { seed: 3 }) }, ink);
  const up = kit.rough.arrow(r.right + u * 7, r.bottom - u * 0.5, r.right + u * 14, r.top - u * 4, { curve: -0.12, seed: 5 });
  const shaft = kit.svg("path", { d: up.shaft }, ink);
  const head = kit.svg("path", { d: up.head }, ink);

  const plan = kit.drawing({ pen: true, penColour: colours.accent });
  let t = plan.sequence(0.25, lines.map((node) => ({ node, duration: 0.95 })));
  t = plan.sequence(t + 0.15, [{ node: pop, duration: 0.7 }, { node: loop, duration: 0.6 }, { node: shaft, duration: 0.35 }, { node: head, duration: 0.18 }]);

  return (time) => plan.draw(time);
});
