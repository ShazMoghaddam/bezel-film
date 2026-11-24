// The Moon's shapes in a row, from new to full, each coloured in as it's named. A long
// arrow underneath runs left to right, then a looping one comes back: "and back again".
Bezel.scene((root, kit) => {
  const { u, safe, colours, props } = kit;
  const s = kit.stage();
  const plan = kit.drawing();
  const wax = { fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round", filter: "url(#crayon)" };
  const [yellow, coral] = colours.palette;
  const cream = colours.text;
  const circle = (x, y, r) => `M${x - r} ${y} a${r} ${r} 0 1 0 ${r * 2} 0 a${r} ${r} 0 1 0 ${-r * 2} 0 Z`;

  // The lit part of the Moon for a share k (0 new, 0.5 half, 1 full), lit from the right:
  // the right edge, then back along the line between light and dark, an ellipse.
  const litPath = (x, y, r, k) => {
    if (k <= 0.01) return "";
    if (k >= 0.99) return circle(x, y, r);
    const rx = Math.abs(1 - 2 * k) * r;
    return `M${x} ${y - r} A${r} ${r} 0 0 1 ${x} ${y + r} A${rx.toFixed(1)} ${r} 0 0 ${k < 0.5 ? 0 : 1} ${x} ${y - r} Z`;
  };

  const n = props.names.length;
  const tall = kit.shape === "tall";
  const r = Math.min((safe.width / n) * 0.34, safe.height * 0.14);
  const y = safe.y + safe.height * (tall ? 0.4 : 0.42);
  const shares = [0, 0.22, 0.5, 0.78, 1];
  const moons = props.names.map((name, i) => {
    const x = safe.x + (safe.width * (i + 0.5)) / n;
    const dark = kit.scribble(s, { d: circle(x, y, r), colour: "#4A5680", gap: u * 0.59, width: u * 1.35, angle: 35, seed: 20 + i });
    const lit = shares[i] > 0 ? kit.scribble(s, { d: litPath(x, y, r * 0.98, shares[i]), colour: yellow, gap: u * 0.59, width: u * 1.49, angle: -35, seed: 30 + i }) : null;
    [dark, lit].forEach((f) => f && f.group.setAttribute("filter", "url(#crayon)"));
    const edge = kit.svg("path", { d: kit.rough.ellipse(x, y, r, r, { seed: 40 + i, wobble: 0.45 }), ...wax, stroke: i === 0 ? colours.muted : "#FFE28A", "stroke-width": u * 0.45 }, s);
    const glow = kit.svg("circle", { cx: x, cy: y, r: r * 1.6, fill: "#3C4F8A", filter: "url(#wash)", opacity: 0 }, s);
    s.insertBefore(glow, s.firstChild);
    const label = kit.text(root, name, { x, y: y + r + u * 2.4, size: tall ? 3.6 : 4.4, font: "heading", align: "center", colour: cream });
    return { dark, lit, edge, glow, label, share: shares[i] };
  });

  // Arrows: one along the row, one looping back.
  const ay = y + r + u * 11, ax1 = safe.x + safe.width * 0.08, ax2 = safe.x + safe.width * 0.92;
  const grow = kit.svg("path", { d: kit.rough.line(ax1, ay, ax2, ay, { seed: 3, wobble: 0.6 }) + ` M${ax2 - u * 2.6} ${ay - u * 1.8} L${ax2} ${ay} L${ax2 - u * 2.6} ${ay + u * 1.8}`, ...wax, stroke: coral, "stroke-width": u * 0.6 }, s);
  const back = kit.svg("path", { d: `M${ax2} ${ay + u * 3} C${ax2} ${ay + u * 12} ${ax1} ${ay + u * 12} ${ax1} ${ay + u * 4} M${ax1 - u * 1.8} ${ay + u * 6.4} L${ax1} ${ay + u * 3.6} L${ax1 + u * 2.2} ${ay + u * 6}`, ...wax, stroke: colours.palette[3], "stroke-width": u * 0.55 }, s);

  // Each Moon is named as the narration reaches it; space them through the first sentence.
  const first = kit.at(0) + 0.5, last = Math.max(first + 2, (kit.at(1) || kit.duration * 0.6) - 0.3);
  const when = moons.map((_, i) => first + ((last - first) * i) / (n - 1));
  moons.forEach((m, i) => { plan.line(m.edge, { at: when[i], duration: 0.4 }); plan.write(m.label, { at: when[i] + 0.3, duration: 0.4 }); });
  plan.line(grow, { at: first, duration: last - first + 0.4, how: "linear" });
  plan.line(back, { at: Math.max(last + 0.6, kit.at(1)), duration: 0.9 });

  return (t) => {
    const boil = Math.floor(kit.stepped(t, 8) * 8) % 3;
    document.querySelectorAll("#crayon feTurbulence").forEach((f, i) => f.setAttribute("seed", String(5 + boil * 7 + i)));
    moons.forEach((m, i) => {
      m.dark.set(kit.progress(t, when[i] + 0.1, 0.4));
      if (m.lit) m.lit.set(kit.progress(t, when[i] + 0.35, 0.45));
      m.glow.style.opacity = String(m.share * 0.9 * kit.progress(t, when[i] + 0.3, 0.6));
    });
    plan.draw(t);
  };
});
