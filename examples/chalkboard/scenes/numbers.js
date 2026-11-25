// The rule stays boxed at the top. The real numbers go in underneath, a line at a time,
// and the answer gets a big chalk circle. Where the Earth's radius comes from is noted.
Bezel.scene((root, kit) => {
  const { u, safe, colours } = kit;
  const [yellow, pink, blue] = colours.palette;
  const narrow = kit.shape !== "wide";
  const board = kit.el("div", { style: { position: "absolute", inset: "0", filter: "url(#chalk)" } }, root);
  const s = kit.stage(board);
  const base = root.getBoundingClientRect();
  const box = (node) => { const r = node.getBoundingClientRect(); return { x: r.left - base.left, y: r.top - base.top, w: r.width, h: r.height }; };
  const size = narrow ? 5 : 5.4;
  const gap = size * u * 1.6;
  const x = safe.x + safe.width * (narrow ? 0.04 : 0.1);
  let y = safe.y + safe.height * (narrow ? 0.04 : 0.06);

  // The rule from the last scene, already on the board.
  const rule = kit.text(board, kit.props.rule, { x: x + u * 1.6, y, size, colour: yellow });
  const rb = box(rule);
  kit.svg("path", { d: kit.rough.rect(rb.x - u * 1.6, rb.y - u * 0.6, rb.w + u * 3.2, rb.h + u * 1.2, { seed: 6 }), fill: "none", stroke: yellow, "stroke-width": u * 0.45, "stroke-linecap": "round" }, s);
  y += gap * 1.45;

  const colourOf = { blue, pink, white: colours.text };
  const lines = kit.props.lines.map((line) => {
    const node = kit.text(board, line.text, { x, y, size, colour: colourOf[line.colour] ?? colours.text, maxWidth: safe.x + safe.width - x });
    y += Math.max(gap, box(node).h + u * 1.8);
    return node;
  });

  // The answer, big, with a chalk ring round it.
  const answerSize = narrow ? 9 : 10;
  const answer = kit.text(board, kit.props.answer, { x: narrow ? safe.x + safe.width / 2 : safe.x + safe.width * 0.74, y: narrow ? y + u * 2 : safe.y + safe.height * 0.42, size: answerSize, font: "heading", align: "center", colour: yellow });
  const ab = box(answer);
  const ring = kit.svg("path", { d: kit.rough.ellipse(ab.x + ab.w / 2, ab.y + ab.h / 2, ab.w * 0.62 + u * 2, ab.h * 0.75 + u * 1.5, { seed: 12, wobble: 0.8, turns: 1.12 }),
    fill: "none", stroke: yellow, "stroke-width": u * 0.5, "stroke-linecap": "round" }, s);
  const source = kit.text(board, kit.props.source, { x: safe.x + safe.width - u, y: safe.y + safe.height - u * 3.4, size: 2.8, align: "right", colour: colours.muted, fit: false });

  const plan = kit.drawing({ pen: "chalk", dust: true });
  const when = [kit.at(1) + 0.2, kit.at(2) + 0.2, kit.at(3) + 0.2, kit.at(3) + 2.2];
  lines.forEach((node, i) => plan.write(node, { at: when[i], duration: 0.9 + kit.props.lines[i].text.length * 0.025 }));
  plan.write(answer, { at: kit.at(4) + 0.6, duration: 0.9 });
  plan.line(ring, { at: kit.at(4) + 1.7, duration: 0.8 });
  plan.write(source, { at: kit.at(1) + 1.4, duration: 0.5 });
  return (time) => plan.draw(time);
});
