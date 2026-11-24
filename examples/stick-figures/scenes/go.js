// Five minutes on a little clock, the figure jumps for joy, and the lesson is written.
Bezel.scene((root, kit) => {
  const { u, safe, colours, props } = kit;
  const s = kit.stage();
  const ground = safe.y + safe.height - u * 2;
  const figH = Math.min(safe.height * 0.5, u * 36);
  const fx = safe.x + safe.width * 0.22;
  const person = kit.figure(s, { x: fx, y: ground, height: figH, width: u * 0.65, face: "happy" }).pose("stand");

  // A clock with a five-minute slice filled in as the hand sweeps.
  const cx = safe.x + safe.width * 0.62, cy = safe.y + safe.height * 0.3, r = Math.min(safe.height * 0.2, u * 14);
  const face = kit.svg("path", { d: kit.rough.ellipse(cx, cy, r, r, { seed: 6 }), fill: "#FFFFFF", stroke: colours.text, "stroke-width": u * 0.5 }, s);
  const slice = kit.svg("path", { fill: `color-mix(in srgb, ${colours.accent} 30%, transparent)` }, s);
  const hand = kit.svg("line", { x1: cx, y1: cy, x2: cx, y2: cy - r * 0.82, stroke: colours.accent, "stroke-width": u * 0.6, "stroke-linecap": "round" }, s);
  const title = kit.text(root, props.title, { x: cx, y: cy + r + u * 6, size: 9, font: "heading", align: "center" });
  // Measured, so the line sits under the title whatever the font.
  const line = kit.text(root, props.line, { x: cx, y: title.getBoundingClientRect().bottom + u * 2.5, size: 5, align: "center", colour: colours.muted });

  const plan = kit.drawing({ pen: true, penColour: colours.accent });
  plan.sequence(0.15, [{ node: face, duration: 0.5 }]);
  plan.sequence(1.6, [{ node: title, duration: 0.9 }]);
  plan.sequence(Math.max(2.8, kit.at(1)), [{ node: line, duration: 1.1 }]);

  return (t) => {
    const sweep = kit.progress(t, 0.6, 1.0, "inOut") * (Math.PI * 2) * (5 / 60);
    const x = cx + Math.sin(sweep) * r * 0.82, y = cy - Math.cos(sweep) * r * 0.82;
    hand.setAttribute("x2", x);
    hand.setAttribute("y2", y);
    slice.setAttribute("d", sweep > 0 ? `M${cx} ${cy} L${cx} ${cy - r * 0.82} A${r * 0.82} ${r * 0.82} 0 0 1 ${x} ${y} Z` : "");
    // A little jump, arms up, when the lesson lands.
    const j = kit.clamp((t - 1.8) / 0.55);
    person.pose("stand", "cheer", kit.spring(t - 1.7, { stiffness: 160, damping: 12 }));
    person.move(fx, ground - Math.sin(j * Math.PI) * u * 5);
    plan.draw(t);
  };
});
