// Three small neon signs in a row: a bowl, a dumpling and a teapot, each lighting up with
// its word as it's named. Lit signs hum, dimming a touch at random.
Bezel.scene((root, kit) => {
  const { u, safe, colours, props } = kit;
  const s = kit.stage();
  const [pink, cyan, , green] = colours.palette;
  const tall = kit.shape === "tall";
  const on = (t, at, seed) => (t < at ? 0 : t < at + 0.45 ? (kit.random(Math.floor(t * 14) + seed)() > 0.45 ? 1 : 0.1) : kit.random(Math.floor(t * 8) + seed * 9)() > 0.96 ? 0.75 : 1);
  const glow = (c) => `0 0 ${u * 0.4}px #FFFFFF, 0 0 ${u * 1.4}px ${c}, 0 0 ${u * 3.6}px ${c}`;

  const n = props.items.length;
  const R = Math.min(safe.width / n, safe.height) * (tall ? 0.24 : 0.27);
  const icons = [
    // A bowl with noodles.
    (x, y) => `M${x - R} ${y} H${x + R} M${x - R * 0.92} ${y} Q${x - R * 0.85} ${y + R * 0.85} ${x} ${y + R * 0.85} Q${x + R * 0.85} ${y + R * 0.85} ${x + R * 0.92} ${y} M${x - R * 0.6} ${y - R * 0.05} q${R * 0.15} ${-R * 0.2} ${R * 0.3} 0 t${R * 0.3} 0 t${R * 0.3} 0 t${R * 0.3} 0`,
    // A dumpling: a half-moon with pleats along its top.
    (x, y) => `M${x - R} ${y + R * 0.45} Q${x - R} ${y - R * 0.7} ${x} ${y - R * 0.7} Q${x + R} ${y - R * 0.7} ${x + R} ${y + R * 0.45} Z M${x - R * 0.5} ${y - R * 0.55} q${R * 0.1} ${R * 0.25} 0 ${R * 0.45} M${x} ${y - R * 0.7} v${R * 0.45} M${x + R * 0.5} ${y - R * 0.55} q${-R * 0.1} ${R * 0.25} 0 ${R * 0.45}`,
    // A teapot: round body, spout, handle and lid.
    (x, y) => `M${x - R * 0.7} ${y} a${R * 0.7} ${R * 0.6} 0 1 0 ${R * 1.4} 0 a${R * 0.7} ${R * 0.6} 0 1 0 ${-R * 1.4} 0 M${x - R * 0.65} ${y - R * 0.1} L${x - R * 1.1} ${y - R * 0.45} M${x + R * 0.68} ${y - R * 0.25} q${R * 0.45} ${R * 0.05} ${R * 0.1} ${R * 0.55} M${x - R * 0.3} ${y - R * 0.6} h${R * 0.6} M${x} ${y - R * 0.6} v${-R * 0.15}`,
  ];
  const colourOf = [cyan, pink, green];
  const signs = props.items.map((word, i) => {
    const x = tall ? safe.x + safe.width / 2 : safe.x + (safe.width * (i + 0.5)) / n;
    const y = tall ? safe.y + safe.height * (0.12 + i * 0.3) : safe.y + safe.height * 0.42;
    const tube = kit.neon(s, icons[i % icons.length](x, y), { colour: colourOf[i], width: u * 0.6 });
    const label = kit.text(root, word, { x, y: y + R * (tall ? 0.95 : 1.25), size: tall ? 5.6 : 6.4, font: "heading", align: "center", colour: "#FFFFFF", style: { fontWeight: 800, textShadow: glow(colourOf[i]) } });
    return { tube, label, at: Math.max(0.2 + i * 0.7, (kit.at(0) || 0) + i * 0.75), seed: i + 3 };
  });

  return (t) => {
    signs.forEach((g) => {
      const b = on(t, g.at, g.seed);
      g.tube.set(b);
      g.label.style.opacity = String(0.12 + 0.88 * on(t, g.at + 0.15, g.seed + 5));
    });
  };
});
