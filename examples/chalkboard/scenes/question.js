// The question is written up in chalk, dust falling off the stick, then underlined twice.
Bezel.scene((root, kit) => {
  const { u, safe, colours } = kit;
  const narrow = kit.shape !== "wide";
  const board = kit.el("div", { style: { position: "absolute", inset: "0", filter: "url(#chalk)" } }, root);
  const s = kit.stage(board);
  const size = narrow ? 9 : 11;
  const lineHeight = size * u * 1.35;
  const top = safe.y + (safe.height - lineHeight * 2.4) / 2;
  const cx = safe.x + safe.width / 2;

  const lines = kit.props.lines.map((words, i) =>
    kit.text(board, words, { x: cx, y: top + i * lineHeight, size, font: "heading", align: "center", colour: i === 1 ? colours.accent : colours.text }));
  const last = lines[lines.length - 1].getBoundingClientRect();
  const base = root.getBoundingClientRect();
  const y = last.bottom - base.top + u * 1.6;
  const ink = kit.svg("g", { fill: "none", stroke: colours.accent, "stroke-width": u * 0.5, "stroke-linecap": "round" }, s);
  const under = [0, 1].map((i) => kit.svg("path", { d: kit.rough.line(cx - last.width * 0.42, y + i * u * 1.4, cx + last.width * 0.42, y + i * u * 1.4, { seed: 4 + i }) }, ink));

  const plan = kit.drawing({ pen: "chalk", dust: true });
  let t = plan.sequence(0.3, lines.map((node) => ({ node, duration: 1.1 })));
  plan.sequence(t + 0.2, under.map((node) => ({ node, duration: 0.4 })));
  return (time) => plan.draw(time);
});
