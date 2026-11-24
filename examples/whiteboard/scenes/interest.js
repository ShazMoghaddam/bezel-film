// Two years side by side, each a stack: the savings, and the interest on top. A red
// arrow carries year one's interest into year two's savings: interest on interest.
Bezel.scene((root, kit) => {
  const { u, safe, colours } = kit;
  const s = kit.stage();
  const ink = colours.text;
  const blue = colours.palette[0];
  const green = colours.palette[2];
  const red = colours.accent;
  const years = kit.props.years;

  const colW = Math.min(safe.width * 0.18, u * 26);
  const gap = Math.min(safe.width * 0.28, u * 44);
  const totalW = colW * 2 + gap;
  const left = safe.x + (safe.width - totalW) / 2;
  const ground = safe.y + safe.height * 0.78;
  const baseH = [safe.height * 0.36, safe.height * 0.39];
  const gainH = [safe.height * 0.09, safe.height * 0.1];

  const g = kit.svg("g", { fill: "none", stroke: ink, "stroke-width": u * 0.5, "stroke-linecap": "round", "stroke-linejoin": "round" }, s);
  const floor = kit.svg("path", { d: kit.rough.line(left - u * 6, ground, left + totalW + u * 6, ground, { seed: 1 }) }, g);
  const plan = kit.drawing({ pen: true, penColour: red });
  plan.sequence(0.15, [{ node: floor, duration: 0.5 }]);
  const fills = [];

  years.forEach((year, i) => {
    const x = left + i * (colW + gap);
    const baseTop = ground - baseH[i];
    const gainTop = baseTop - gainH[i];
    const baseFill = kit.svg("rect", { x, y: baseTop, width: colW, height: baseH[i], fill: `color-mix(in srgb, ${blue} 16%, transparent)`, stroke: "none" }, s);
    const gainFill = kit.svg("rect", { x, y: gainTop, width: colW, height: gainH[i], fill: `color-mix(in srgb, ${green} 26%, transparent)`, stroke: "none" }, s);
    s.prepend(baseFill, gainFill);
    const base = kit.svg("path", { d: kit.rough.rect(x, baseTop, colW, baseH[i], { seed: 10 + i }), stroke: blue }, g);
    const gain = kit.svg("path", { d: kit.rough.rect(x, gainTop, colW, gainH[i], { seed: 20 + i }), stroke: green }, g);
    const baseText = kit.text(root, year.base, { x: x + colW / 2, y: baseTop + baseH[i] / 2 - u * 3, size: 6, font: "heading", align: "center", colour: blue });
    const gainText = kit.text(root, year.gain, { x: x + colW + u * 2.5, y: gainTop + gainH[i] / 2 - u * 2.6, size: 5, font: "heading", colour: green });
    const label = kit.text(root, year.label, { x: x + colW / 2, y: ground + u * 1.8, size: 4.2, align: "center" });

    const at = i === 0 ? kit.at(0) + 0.2 : kit.at(1) + 0.2;
    const end = plan.sequence(at, [
      { node: base, duration: 0.7 }, { node: baseText, duration: 0.45 },
      { node: gain, duration: 0.45 }, { node: gainText, duration: 0.45 }, { node: label, duration: 0.45 },
    ]);
    fills.push({ el: baseFill, at: at + 0.6 }, { el: gainFill, at: at + 1.6 });
    if (i === 0) plan.lastYearEnd = end;
  });

  // Year one's interest joins year two's savings.
  const x1 = left + colW + u * 1, y1 = ground - baseH[0] - gainH[0] / 2;
  const x2 = left + colW + gap - u * 1.5, y2 = ground - baseH[1] * 0.75;
  const arrow = kit.rough.arrow(x1 + u * 11, y1 - u * 2, x2, y2, { curve: -0.3, seed: 4 });
  const rg = kit.svg("g", { fill: "none", stroke: red, "stroke-width": u * 0.55, "stroke-linecap": "round", "stroke-linejoin": "round" }, s);
  const shaft = kit.svg("path", { d: arrow.shaft }, rg);
  const head = kit.svg("path", { d: arrow.head }, rg);
  const note = kit.text(root, kit.props.note, { x: (x1 + x2) / 2 + u * 4, y: Math.min(y1, y2) - u * 13, size: 5.4, font: "heading", colour: red, align: "center" });
  plan.sequence(kit.at(1) + 1.9, [{ node: shaft, duration: 0.5 }, { node: head, duration: 0.15 }, { node: note, duration: 1.0 }]);

  return (t) => {
    plan.draw(t);
    for (const f of fills) f.el.style.opacity = String(kit.progress(t, f.at, 0.4));
  };
});
