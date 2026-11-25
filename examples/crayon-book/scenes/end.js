// The last page: a big full Moon with a sleepy face, scribbled in gold, a sleepy "z z z"
// and the line to remember, with how long one cycle takes.
Bezel.scene((root, kit) => {
  const { u, safe, colours, props, width } = kit;
  const s = kit.stage();
  const plan = kit.drawing();
  const wax = { fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round", filter: "url(#crayon)" };
  const [yellow, coral] = colours.palette;
  const cream = colours.text;
  const wide = kit.shape === "wide";
  const circle = (x, y, r) => `M${x - r} ${y} a${r} ${r} 0 1 0 ${r * 2} 0 a${r} ${r} 0 1 0 ${-r * 2} 0 Z`;

  // A smaller moon on narrow frames, so the words fit underneath it.
  const mr = wide ? Math.min(safe.height * 0.3, u * 28) : Math.min(safe.height * 0.17, safe.width * 0.3);
  const mx = wide ? safe.x + safe.width * 0.28 : width / 2, my = wide ? safe.y + safe.height * 0.5 : safe.y + mr + u * 3;
  const wash = kit.svg("circle", { cx: mx, cy: my, r: mr * 1.9, fill: "#3E528E", filter: "url(#wash)", opacity: 0 }, s);
  const fill = kit.scribble(s, { d: circle(mx, my, mr), colour: yellow, gap: u * 0.85, width: u * 1.76, angle: -30, seed: 3 });
  const fill2 = kit.scribble(s, { d: circle(mx + mr * 0.25, my + mr * 0.2, mr * 0.7), colour: "#FFB347", gap: u * 1.36, width: u * 1.35, angle: 50, seed: 4, opacity: 0.55 });
  [fill, fill2].forEach((f) => f.group.setAttribute("filter", "url(#crayon)"));
  const edge = kit.svg("path", { d: kit.rough.ellipse(mx, my, mr, mr, { seed: 5, wobble: 0.5 }), ...wax, stroke: "#FFE28A", "stroke-width": u * 0.8 }, s);
  // A sleepy face: closed eyes as arcs, a small smile and rosy cheeks.
  const ink = "#7A5A1A";
  const face = [
    `M${mx - mr * 0.45} ${my - mr * 0.1} q${mr * 0.15} ${mr * 0.14} ${mr * 0.3} 0`,
    `M${mx + mr * 0.15} ${my - mr * 0.1} q${mr * 0.15} ${mr * 0.14} ${mr * 0.3} 0`,
    `M${mx - mr * 0.18} ${my + mr * 0.25} q${mr * 0.18} ${mr * 0.15} ${mr * 0.36} 0`,
  ].map((d) => kit.svg("path", { d, ...wax, stroke: ink, "stroke-width": u * 0.7 }, s));
  const cheeks = [-0.55, 0.55].map((k, i) => {
    const c = kit.scribble(s, { d: circle(mx + k * mr, my + mr * 0.15, mr * 0.12), colour: coral, gap: u * 0.34, width: u * 0.81, angle: 0, seed: 8 + i, opacity: 0.8 });
    c.group.setAttribute("filter", "url(#crayon)");
    return c;
  });
  const zs = [0, 1, 2].map((i) => kit.text(root, "z", { x: mx + mr * (0.85 + i * 0.22), y: my - mr * (0.9 + i * 0.3), size: 4 + i * 1.4, font: "heading", colour: cream }));

  const tx = wide ? safe.x + safe.width * 0.58 : safe.x, ty = wide ? safe.y + safe.height * 0.26 : my + mr + u * 5;
  const line = kit.text(root, props.line, { x: tx, y: ty, size: wide ? 7.6 : 6.4, font: "heading", colour: cream, maxWidth: wide ? safe.width * 0.42 : safe.width, style: { lineHeight: "1.05", whiteSpace: "pre-line" } });
  const days = kit.text(root, props.days, { x: tx, y: ty + u * (wide ? 22 : 16), size: 11, font: "heading", colour: yellow, style: { filter: "url(#crayon)" } });
  const unit = kit.text(root, props.unit, { x: tx, y: ty + u * (wide ? 34 : 28), size: 4.2, font: "heading", colour: colours.muted });

  // Little stars around, scattered by a seeded random.
  const rand = kit.random(31);
  const stars = Array.from({ length: 14 }, (_, i) => {
    const x = safe.x + rand() * safe.width, y = safe.y + rand() * safe.height;
    return kit.svg("path", { d: kit.rough.line(x - u * 0.4, y, x + u * 0.4, y + u * 0.2, { seed: i + 50 }), ...wax, stroke: i % 3 ? cream : yellow, "stroke-width": u * 0.6, opacity: 0.8 }, s);
  });

  plan.sequence(0.1, stars.map((n) => ({ node: n, duration: 0.05 })), 0.02);
  plan.line(edge, { at: 0.2, duration: 0.7 });
  plan.sequence(1.3, face.map((n) => ({ node: n, duration: 0.25 })), 0.08);
  plan.write(line, { at: 0.9, duration: 1.4 });
  plan.write(days, { at: Math.max(2.6, kit.at(1)), duration: 0.6 });
  plan.write(unit, { at: Math.max(3.1, kit.at(1) + 0.5), duration: 0.8 });

  return (t) => {
    const boil = Math.floor(kit.stepped(t, 8) * 8) % 3;
    document.querySelectorAll("#crayon feTurbulence").forEach((f, i) => f.setAttribute("seed", String(5 + boil * 7 + i)));
    wash.style.opacity = String(0.85 * kit.progress(t, 0.3, 1.2));
    fill.set(kit.progress(t, 0.5, 1.1, "inOut"));
    fill2.set(kit.progress(t, 1.2, 0.6));
    cheeks.forEach((c, i) => c.set(kit.progress(t, 2.1 + i * 0.15, 0.3)));
    // The z's float up one after another, on twos, and loop.
    const st = kit.stepped(t, 12);
    zs.forEach((z, i) => {
      const p = ((st - 2.2 - i * 0.4) / 2.4) % 1;
      const on = st > 2.2 + i * 0.4;
      z.style.opacity = on ? String(Math.sin(Math.max(0, p) * Math.PI)) : "0";
      z.style.translate = `0 ${-Math.max(0, p) * u * 3}px`;
    });
    plan.draw(t);
  };
});
