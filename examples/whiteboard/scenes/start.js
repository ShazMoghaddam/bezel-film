// A piggy bank is sketched, the amount written beside it, then a green arrow carries
// the rate it earns.
Bezel.scene((root, kit) => {
  const { u, safe, colours } = kit;
  const s = kit.stage();
  const tall = kit.shape === "tall";
  const size = Math.min(safe.width * (tall ? 0.5 : 0.26), safe.height * 0.5);
  // Side by side on wide frames, centred as a group: the pig, a gap, then the words.
  const groupW = size + u * 8 + u * 44;
  const pigX = tall ? safe.x + (safe.width - size) / 2 : safe.x + (safe.width - groupW) / 2;
  const pigY = tall ? safe.y + safe.height * 0.08 : safe.y + (safe.height - size) / 2;
  const pig = kit.icon("pig-money", { x: pigX, y: pigY, size, width: u * 0.6 });

  // A soft marker wash behind the pig, filled once it's drawn.
  const wash = kit.svg("path", { d: kit.rough.ellipse(pigX + size / 2, pigY + size * 0.56, size * 0.5, size * 0.36, { seed: 8, turns: 1 }),
    fill: `color-mix(in srgb, ${colours.palette[1]} 14%, transparent)`, stroke: "none" }, s);
  s.prepend(wash);

  const textX = tall ? safe.x + safe.width / 2 : pigX + size + u * 8;
  const textY = tall ? pigY + size + u * 4 : safe.y + safe.height * 0.3;
  const align = tall ? "center" : "left";
  const amount = kit.text(root, kit.props.amount, { x: textX, y: textY, size: 15, font: "heading", align });

  const a = amount.getBoundingClientRect();
  const green = colours.palette[2];
  const ink = kit.svg("g", { fill: "none", stroke: green, "stroke-width": u * 0.55, "stroke-linecap": "round", "stroke-linejoin": "round" }, s);
  const from = tall ? { x: a.left + a.width / 2, y: a.bottom + u * 1 } : { x: a.left + u * 2, y: a.bottom + u * 0.5 };
  const to = tall ? { x: from.x, y: from.y + u * 9 } : { x: from.x + u * 14, y: from.y + u * 10 };
  const arrow = kit.rough.arrow(from.x, from.y, to.x, to.y, { curve: tall ? 0.15 : 0.25, seed: 2 });
  const shaft = kit.svg("path", { d: arrow.shaft }, ink);
  const head = kit.svg("path", { d: arrow.head }, ink);
  const rate = kit.text(root, kit.props.rate, { x: tall ? to.x : to.x + u * 2, y: tall ? to.y + u * 1.5 : to.y - u * 3, size: 7, font: "heading", colour: green, align });

  const plan = kit.drawing({ pen: true, penColour: colours.accent });
  const start = kit.at(0) + 0.1;
  let t = plan.sequence(start, pig.paths.map((node, i) => ({ node, duration: i === 0 ? 0.9 : 0.25 })));
  t = plan.sequence(t + 0.1, [{ node: amount, duration: 0.8 }]);
  plan.sequence(Math.max(t + 0.2, kit.at(1)), [{ node: shaft, duration: 0.4 }, { node: head, duration: 0.15 }, { node: rate, duration: 0.9 }]);
  const washAt = start + 1.2;

  return (time) => {
    plan.draw(time);
    wash.style.opacity = String(kit.progress(time, washAt, 0.5));
  };
});
