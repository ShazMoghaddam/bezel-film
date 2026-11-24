// A hundred squares, ten by ten: all the water on Earth. The salt water fills in first,
// row by row; then the frozen squares, then the one that's left gets circled.
// props.stage is "salt" (the first scene) or "rest" (the second, picking up from there).
Bezel.scene((root, kit) => {
  const { u, safe, colours, props } = kit;
  const s = kit.stage();
  const pencil = { "stroke-linecap": "round", "stroke-linejoin": "round", filter: "url(#pencil)" };
  const size = Math.min(safe.height * 0.86, safe.width * 0.5);
  const cell = size / 10, gap = cell * 0.14;
  const left = safe.x + (kit.shape === "wide" ? safe.width * 0.12 : (safe.width - size) / 2);
  const top = safe.y + (safe.height - size) / 2;
  const kinds = [...Array(props.salt).fill("salt"), ...Array(props.ice).fill("ice"), ...Array(props.fresh).fill("fresh")];
  const fills = {
    salt: kit.tone(s, { kind: "lines", colour: colours.palette[0], size: cell * 0.22, weight: 0.5, angle: 45 }),
    ice: kit.tone(s, { kind: "cross", colour: colours.palette[5], size: cell * 0.22, weight: 0.45, angle: 45 }),
    fresh: colours.palette[3],
  };
  const squares = kinds.map((kind, i) => {
    const x = left + (i % 10) * cell, y = top + Math.floor(i / 10) * cell;
    const g = kit.svg("g", {}, s);
    kit.svg("rect", { x: x + gap / 2, y: y + gap / 2, width: cell - gap, height: cell - gap, fill: fills[kind], ...pencil }, g);
    kit.svg("path", { d: kit.rough.rect(x + gap / 2, y + gap / 2, cell - gap, cell - gap, { seed: i + 1, wobble: 0.25 }), fill: "none", stroke: colours.text, "stroke-width": u * 0.16, opacity: 0.55, ...pencil }, g);
    return { g, kind, i };
  });

  // Notes in the margin: each written in its own colour, with an arrow to its squares.
  const nx = left + size + u * 7;
  const note = (text, colour, y) => kit.text(root, text, { x: nx, y, size: 4.6, font: "heading", colour });
  const salt = note(props.notes.salt, colours.palette[0], top + size * 0.25);
  const ice = note(props.notes.ice, colours.palette[5], top + size * 0.68);
  const fresh = note(props.notes.fresh, colours.accent, top + size * 0.86);
  const ring = kit.svg("path", { d: kit.rough.ellipse(left + 9.5 * cell, top + 9.5 * cell, cell * 0.85, cell * 0.85, { seed: 7 }), fill: "none",
    stroke: colours.accent, "stroke-width": u * 0.4, ...pencil }, s);
  const lead = kit.rough.arrow(nx - u * 1.5, top + size * 0.9, left + 10 * cell + u * 0.6, top + 9.6 * cell, { curve: 0.2, head: u * 1.3, seed: 2 });
  const lg = kit.svg("g", { fill: "none", stroke: colours.accent, "stroke-width": u * 0.32, ...pencil }, s);
  const shaft = kit.svg("path", { d: lead.shaft }, lg), head = kit.svg("path", { d: lead.head }, lg);

  const first = props.stage === "salt";
  const plan = kit.drawing();
  const saltFrom = first ? kit.at(1) + 0.1 : -10, saltFor = 2.6;
  const iceAt = first ? Infinity : kit.at(0) + 0.6;
  const freshAt = first ? Infinity : kit.at(1) + 0.2;
  if (first) {
    plan.write(salt, { at: saltFrom + saltFor - 0.4, duration: 0.8 });
    // The rest of the story belongs to the next scene.
    for (const el of [ice, fresh, ring, lg]) el.style.display = "none";
  }
  else {
    plan.write(salt, { at: -1, duration: 0.01 });
    plan.write(ice, { at: iceAt + 0.5, duration: 0.6 });
    plan.sequence(freshAt + 0.3, [{ node: ring, duration: 0.5 }, { node: fresh, duration: 0.6 }, { node: shaft, duration: 0.3 }, { node: head, duration: 0.12 }]);
  }

  return (t) => {
    for (const sq of squares) {
      let shown;
      if (sq.kind === "salt") shown = kit.progress(t, saltFrom + (sq.i / props.salt) * saltFor, 0.12);
      else if (sq.kind === "ice") shown = kit.progress(t, iceAt + (sq.i - props.salt) * 0.25, 0.2);
      else shown = kit.progress(t, freshAt, 0.2);
      // Before they're shaded, squares show as faint empty outlines.
      sq.g.firstChild.style.opacity = String(shown);
      sq.g.lastChild.style.opacity = String(0.3 + 0.25 * shown);
    }
    plan.draw(t);
  };
});
