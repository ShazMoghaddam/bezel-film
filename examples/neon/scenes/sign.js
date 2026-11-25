// The sign flickers on in the dark: a bowl of noodles in cyan tubes with pink chopsticks
// and rising steam, then the name in glowing script below. Each tube sputters before it
// holds steady, and the steam tube pulses gently once it's lit.
Bezel.scene((root, kit) => {
  const { u, safe, colours, props, width } = kit;
  const s = kit.stage();
  const [pink, cyan, yellow] = colours.palette;

  // A tube's brightness at time t: off, then a few seconds of seeded sputter, then on,
  // with the odd tiny dip, as old neon does.
  const sputter = (t, at, seed) => {
    if (t < at) return 0;
    const r = kit.random(Math.floor(t * 14) * 31 + seed)();
    if (t < at + 0.7) return r > 0.45 ? 1 : 0.08;
    return r > 0.97 ? 0.7 : 1;
  };

  const cx = width / 2, cy = safe.y + safe.height * 0.4, R = Math.min(safe.height * 0.25, u * 22);
  const bowl = kit.neon(s, `M${cx - R * 1.25} ${cy} H${cx + R * 1.25} M${cx - R * 1.15} ${cy} Q${cx - R * 1.05} ${cy + R * 1.05} ${cx} ${cy + R * 1.05} Q${cx + R * 1.05} ${cy + R * 1.05} ${cx + R * 1.15} ${cy} M${cx - R * 0.4} ${cy + R * 1.05} V${cy + R * 1.2} H${cx + R * 0.4} V${cy + R * 1.05}`, { colour: cyan, width: u * 0.8 });
  const noodles = kit.neon(s, `M${cx - R * 0.8} ${cy - R * 0.02} q${R * 0.2} ${-R * 0.22} ${R * 0.4} 0 t${R * 0.4} 0 t${R * 0.4} 0 t${R * 0.4} 0`, { colour: yellow, width: u * 0.6 });
  const sticks = kit.neon(s, `M${cx + R * 0.1} ${cy - R * 0.05} L${cx + R * 1.1} ${cy - R * 1.1} M${cx + R * 0.35} ${cy - R * 0.02} L${cx + R * 1.3} ${cy - R * 0.92}`, { colour: pink, width: u * 0.6 });
  const steam = kit.neon(s, [-0.5, 0, 0.5].map((k) => `M${cx + k * R - R * 0.1} ${cy - R * 0.25} q${R * 0.18} ${-R * 0.2} 0 ${-R * 0.4} t0 ${-R * 0.4}`).join(" "), { colour: "#F7F0FA", width: u * 0.45 });
  const name = kit.text(root, props.name, { x: cx, y: cy + R * 1.5, size: 11, font: "heading", align: "center", colour: "#FFE3EE",
    style: { fontWeight: 800, letterSpacing: "0.02em", textShadow: `0 0 ${u * 0.4}px #FFFFFF, 0 0 ${u * 1.4}px ${pink}, 0 0 ${u * 3.6}px ${pink}, 0 0 ${u * 7}px ${pink}` } });
  // The sign's light spills onto the wall around it.
  const spill = kit.glow(s, { cx, cy: cy + R * 0.6, r: R * 3.2, colour: cyan, strength: 0.25 });
  s.insertBefore(spill, s.firstChild);

  return (t) => {
    const b = sputter(t, 0.5, 1);
    bowl.set(b);
    noodles.set(sputter(t, 0.9, 2));
    sticks.set(sputter(t, 1.2, 3));
    steam.set(sputter(t, 1.5, 4) * (0.75 + 0.25 * Math.sin(t * 3)));
    const n = sputter(t, 1.9, 5);
    name.style.opacity = String(0.12 + 0.88 * n);
    spill.style.opacity = String(b);
  };
});
