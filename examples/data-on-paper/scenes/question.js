// The question is written in at the top. A globe is drawn in pencil below it, with
// wavy lines of sea, and a note in the margin sets up the hundred squares.
Bezel.scene((root, kit) => {
  const { u, safe, colours, props } = kit;
  const s = kit.stage();
  const pencil = { fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round", filter: "url(#pencil)" };
  const title = kit.text(root, props.title, { x: safe.x + safe.width / 2, y: safe.y + u * 1, size: kit.shape === "tall" ? 6.5 : 6.4, font: "heading", align: "center",
    maxWidth: safe.width * 0.9, style: { textWrap: "balance" } });
  const r = Math.min(safe.height * 0.28, u * 26);
  const cx = safe.x + safe.width / 2, cy = safe.y + safe.height * 0.6;
  const globe = kit.svg("path", { d: kit.rough.ellipse(cx, cy, r, r, { seed: 4, wobble: 0.4 }), ...pencil, stroke: colours.text, "stroke-width": u * 0.35 }, s);
  const sea = kit.svg("circle", { cx, cy, r: r * 0.97, fill: kit.tone(s, { kind: "lines", colour: colours.palette[0], size: u * 0.9, weight: 0.35, angle: 30 }), opacity: 0.55, filter: "url(#pencil)" }, s);
  s.prepend(sea);
  // Land: two rough blobs, left plain paper.
  const land = [
    `M${cx - r * 0.55} ${cy - r * 0.35} q${r * 0.25} ${-r * 0.25} ${r * 0.45} ${-r * 0.05} q${r * 0.1} ${r * 0.3} ${-r * 0.1} ${r * 0.45} q${-r * 0.3} ${r * 0.15} ${-r * 0.35} ${-r * 0.4}`,
    `M${cx + r * 0.15} ${cy + r * 0.05} q${r * 0.35} ${-r * 0.2} ${r * 0.5} ${r * 0.15} q${-r * 0.05} ${r * 0.4} ${-r * 0.35} ${r * 0.45} q${-r * 0.25} ${-r * 0.25} ${-r * 0.15} ${-r * 0.6}`,
  ].map((d) => kit.svg("path", { d, ...pencil, fill: colours.background, stroke: colours.palette[2], "stroke-width": u * 0.3 }, s));
  const note = kit.text(root, props.note, { x: cx + r + u * 6, y: cy - u * 2, size: 3.4, colour: colours.accent, style: { fontStyle: "italic" }, maxWidth: safe.x + safe.width - (cx + r + u * 6) });
  const arrow = kit.rough.arrow(cx + r + u * 5, cy + u * 4, cx + r + u * 1, cy + u * 1, { curve: -0.3, head: u * 1.4, seed: 3 });
  const ag = kit.svg("g", { ...pencil, stroke: colours.accent, "stroke-width": u * 0.3 }, s);
  const shaft = kit.svg("path", { d: arrow.shaft }, ag), head = kit.svg("path", { d: arrow.head }, ag);

  const plan = kit.drawing();
  plan.write(title, { at: 0.2, duration: 1.4 });
  plan.line(globe, { at: 1.0, duration: 1.0, how: "inOut" });
  land.forEach((l, i) => plan.line(l, { at: 1.9 + i * 0.3, duration: 0.5 }));
  const noteAt = Math.max(3.0, kit.at(1) + 0.4);
  plan.sequence(noteAt, [{ node: note, duration: 0.9 }, { node: shaft, duration: 0.3 }, { node: head, duration: 0.15 }]);

  return (t) => {
    sea.style.opacity = String(0.55 * kit.progress(t, 1.6, 0.8));
    plan.draw(t);
  };
});
