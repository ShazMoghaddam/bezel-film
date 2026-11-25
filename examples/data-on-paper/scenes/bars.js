// Three pencil bars, hatched in, each with its share written at its end: where the
// fresh water actually is. The tiny last bar gets a note.
Bezel.scene((root, kit) => {
  const { u, safe, colours, props } = kit;
  const s = kit.stage();
  const pencil = { "stroke-linecap": "round", "stroke-linejoin": "round", filter: "url(#pencil)" };
  const title = kit.text(root, props.title, { x: safe.x, y: safe.y, size: 5.6, font: "heading", maxWidth: safe.width, style: { textWrap: "balance" } });
  const labelW = Math.min(safe.width * 0.26, u * 44);
  const x0 = safe.x + labelW, x1 = safe.x + safe.width - u * 14;
  const rowH = Math.min((safe.y + safe.height - title.getBoundingClientRect().bottom - u * 9) / props.bars.length, u * 16);
  // The bars start below the title, however many lines it took.
  const y0 = title.getBoundingClientRect().bottom + u * 5;
  const axis = kit.svg("path", { d: kit.rough.line(x0, y0 - u * 1, x0, y0 + rowH * props.bars.length, { seed: 1, wobble: 0.3 }), fill: "none", stroke: colours.text, "stroke-width": u * 0.3, ...pencil }, s);
  const colourOf = [colours.palette[5], colours.palette[0], colours.palette[3]];
  const bars = props.bars.map(([name, value], i) => {
    const y = y0 + i * rowH + rowH * 0.2, h = rowH * 0.6;
    const w = Math.max(u * 0.8, ((x1 - x0) * value) / 100);
    const fill = kit.svg("rect", { x: x0, y, width: w, height: h, fill: kit.tone(s, { kind: "lines", colour: colourOf[i], size: u * 1, weight: 0.5, angle: 45 }), ...pencil }, s);
    const edge = kit.svg("path", { d: kit.rough.rect(x0, y, w, h, { seed: 20 + i, wobble: 0.25 }), fill: "none", stroke: colourOf[i], "stroke-width": u * 0.32, ...pencil }, s);
    const label = kit.text(root, name, { x: x0 - u * 2.5, y: y + h / 2 - u * 2, size: 3.8, align: "right" });
    const num = kit.text(root, value + "%", { x: x0 + w + u * 2, y: y + h / 2 - u * 2.6, size: 4.8, font: "heading", colour: colourOf[i] });
    return { fill, edge, label, num, w, at: 0.9 + i * 0.7 };
  });
  const note = kit.text(root, "the bit we can reach", { x: x0 + u * 12, y: y0 + rowH * 2.82, size: 3.4, colour: colours.accent, style: { fontStyle: "italic" } });

  const plan = kit.drawing();
  plan.write(title, { at: 0.1, duration: 0.9 });
  plan.line(axis, { at: 0.5, duration: 0.4 });
  for (const b of bars) {
    plan.write(b.label, { at: b.at, duration: 0.4 });
    plan.line(b.edge, { at: b.at + 0.2, duration: 0.6 });
    plan.write(b.num, { at: b.at + 0.7, duration: 0.35 });
  }
  plan.write(note, { at: Math.max(3.4, kit.at(1)), duration: 0.8 });

  return (t) => {
    // Shading sweeps in from the left after each outline is drawn.
    for (const b of bars) b.fill.setAttribute("width", String(b.w * kit.progress(t, b.at + 0.45, 0.6, "out")));
    plan.draw(t);
  };
});
