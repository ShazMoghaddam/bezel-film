// The last sign: a big arrow in pink tubes, with a row of yellow bulbs along it that
// chase towards the tip, and "This way" glowing above. The street name sits underneath.
Bezel.scene((root, kit) => {
  const { u, safe, colours, props, width } = kit;
  const s = kit.stage();
  const [pink, cyan, yellow] = colours.palette;
  const on = (t, at) => (t < at ? 0 : t < at + 0.5 ? (kit.random(Math.floor(t * 14) + 11)() > 0.45 ? 1 : 0.1) : 1);
  const glow = (c) => `0 0 ${u * 0.4}px #FFFFFF, 0 0 ${u * 1.4}px ${c}, 0 0 ${u * 3.6}px ${c}, 0 0 ${u * 7}px ${c}`;

  const x0 = safe.x + safe.width * 0.12, x1 = safe.x + safe.width * 0.88, y = safe.y + safe.height * 0.58, h = Math.min(safe.height * 0.12, u * 10);
  const head = h * 2.2;
  const arrow = kit.neon(s, `M${x0} ${y - h / 2} H${x1 - head} V${y - h * 1.4} L${x1} ${y} L${x1 - head} ${y + h * 1.4} V${y + h / 2} H${x0} Z`, { colour: pink, width: u * 0.8 });
  // Bulbs: a glowing dot each, lit in a travelling wave towards the tip.
  const bulbs = [];
  for (let x = x0 + h * 0.6; x < x1 - head * 0.4; x += h * 0.9) bulbs.push(kit.svg("circle", { cx: x, cy: y, r: h * 0.18, fill: yellow }, s));
  bulbs.forEach((b) => (b.style.filter = `drop-shadow(0 0 ${u * 0.6}px ${yellow}) drop-shadow(0 0 ${u * 1.6}px ${yellow})`));
  const line = kit.text(root, props.line, { x: width / 2, y: safe.y + safe.height * 0.12, size: 11, font: "heading", align: "center", colour: "#E6FBFF", style: { fontWeight: 800, textShadow: glow(cyan) } });
  const where = kit.text(root, props.where, { x: width / 2, y: y + h * 2.4, size: 4, font: "heading", align: "center", colour: colours.muted, style: { letterSpacing: "0.08em", textTransform: "uppercase" } });

  return (t) => {
    arrow.set(on(t, 0.3));
    // The wave of light runs along the bulbs, a step at a time, again and again.
    const step = Math.floor(kit.stepped(t, 10) * 10);
    bulbs.forEach((b, i) => (b.style.opacity = t < 0.9 ? "0" : (step - i) % 4 === 0 ? "1" : "0.18"));
    line.style.opacity = String(0.12 + 0.88 * on(t, 0.7));
    where.style.opacity = String(kit.progress(t, 1.4, 0.6));
  };
});
