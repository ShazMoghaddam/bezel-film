// A huge box slams down beside the figure, towering over it. The figure leans away,
// sad, and "too big!" is scrawled with an arrow.
Bezel.scene((root, kit) => {
  const { u, safe, colours, props } = kit;
  const s = kit.stage();
  const ground = safe.y + safe.height - u * 2;
  const figH = Math.min(safe.height * 0.42, u * 32);
  const fx = safe.x + safe.width * 0.3;
  const person = kit.figure(s, { x: fx, y: ground, height: figH, width: u * 0.65, face: "sad" }).pose("stand");

  const bw = Math.min(safe.width * 0.3, u * 52), bh = safe.height * 0.82;
  const bx = safe.x + safe.width * 0.48, by = ground - bh;
  const box = kit.svg("g", {}, s);
  kit.svg("rect", { x: bx, y: by, width: bw, height: bh, fill: `color-mix(in srgb, ${colours.palette[0]} 14%, white)` }, box);
  kit.svg("path", { d: kit.rough.rect(bx, by, bw, bh, { seed: 4 }), fill: "none", stroke: colours.text, "stroke-width": u * 0.55, "stroke-linecap": "round" }, box);
  // Pages stacked inside the box: the report.
  for (let i = 0; i < 6; i++) kit.svg("path", { d: kit.rough.line(bx + u * 5, by + bh * (0.3 + i * 0.1), bx + bw - u * 5, by + bh * (0.3 + i * 0.1), { seed: 9 + i, wobble: 0.6 }), fill: "none", stroke: colours.palette[0], "stroke-width": u * 0.3, opacity: 0.6 }, box);
  const name = kit.text(root, props.task, { x: bx + bw / 2, y: by + bh * 0.1, size: 6, font: "heading", align: "center", colour: colours.palette[0] });
  const ground1 = kit.svg("path", { d: kit.rough.line(safe.x + u * 4, ground, safe.x + safe.width - u * 4, ground, { seed: 2 }), fill: "none", stroke: colours.text, "stroke-width": u * 0.45 }, s);

  const red = colours.accent;
  const lx = fx - u * 4, ly = ground - figH * 1.35;
  const label = kit.text(root, props.label, { x: lx, y: ly, size: 7, font: "heading", align: "center", colour: red });
  const arrow = kit.rough.arrow(lx + u * 9, ly + u * 4, bx - u * 2, by + bh * 0.25, { curve: -0.2, seed: 7 });
  const g = kit.svg("g", { fill: "none", stroke: red, "stroke-width": u * 0.55, "stroke-linecap": "round" }, s);
  const shaft = kit.svg("path", { d: arrow.shaft }, g), head = kit.svg("path", { d: arrow.head }, g);

  const plan = kit.drawing({ pen: true, penColour: red });
  const slamAt = 0.9;
  plan.sequence(0.1, [{ node: ground1, duration: 0.4 }]);
  plan.sequence(Math.max(2.2, kit.at(1) + 0.3), [{ node: label, duration: 0.7 }, { node: shaft, duration: 0.4 }, { node: head, duration: 0.15 }]);

  return (t) => {
    // The box drops from above and lands with a little squash.
    const drop = kit.progress(t, slamAt, 0.35, "in");
    const land = kit.spring(t - slamAt - 0.35, { stiffness: 380, damping: 16 });
    box.style.transformOrigin = `${bx + bw / 2}px ${ground}px`;
    box.style.transform = `translateY(${(1 - drop) * -bh * 1.3}px) scaleY(${t > slamAt + 0.35 ? 1 - 0.06 * Math.sin(Math.min(1, land) * Math.PI) : 1})`;
    name.style.opacity = String(kit.progress(t, slamAt + 0.4, 0.3));
    name.style.translate = `-50% ${(1 - drop) * -bh * 1.3}px`;
    // The figure leans away when it lands.
    const flinch = kit.progress(t, slamAt + 0.3, 0.4, "outBack");
    person.pose("stand", { lean: -10, head: -14, ls: -40, le: -30, rs: 30, re: 60, lh: -10, lk: 0, rh: 6, rk: 0 }, flinch);
    person.move(fx - flinch * u * 3, ground);
    plan.draw(t);
  };
});
