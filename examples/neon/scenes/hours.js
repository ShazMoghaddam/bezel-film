// A neon clock reads two o'clock, its hands lit in yellow, beside an "OPEN" sign framed
// in a pink tube. "OPEN" blinks on and off on a slow beat; the hours glow steady below.
Bezel.scene((root, kit) => {
  const { u, safe, colours, props, width } = kit;
  const s = kit.stage();
  const [pink, cyan, yellow] = colours.palette;
  const wide = kit.shape === "wide";
  const on = (t, at) => (t < at ? 0 : t < at + 0.5 ? (kit.random(Math.floor(t * 14) + 7)() > 0.45 ? 1 : 0.1) : 1);

  const R = wide ? Math.min(safe.height * 0.28, u * 24) : Math.min(safe.height * 0.19, safe.width * 0.34);
  const cx = wide ? safe.x + safe.width * 0.27 : width / 2, cy = wide ? safe.y + safe.height * 0.48 : safe.y + R + u * 2;
  const ring = kit.neon(s, `M${cx - R} ${cy} a${R} ${R} 0 1 0 ${R * 2} 0 a${R} ${R} 0 1 0 ${-R * 2} 0`, { colour: cyan, width: u * 0.8 });
  let ticks = "";
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; ticks += `M${cx + Math.cos(a) * R * 0.78} ${cy + Math.sin(a) * R * 0.78} L${cx + Math.cos(a) * R * 0.86} ${cy + Math.sin(a) * R * 0.86} `; }
  const marks = kit.neon(s, ticks, { colour: cyan, width: u * 0.45 });
  const hands = kit.neon(s, "", { colour: yellow, width: u * 0.7 });
  const handPaths = hands.group.querySelectorAll("path");

  const sx = wide ? safe.x + safe.width * 0.56 : safe.x + safe.width * 0.12, sy = wide ? safe.y + safe.height * 0.26 : cy + R + u * 8;
  const sw = wide ? safe.width * 0.42 : safe.width * 0.76, sh = u * 22;
  const frame = kit.neon(s, `M${sx + u * 3} ${sy} H${sx + sw - u * 3} Q${sx + sw} ${sy} ${sx + sw} ${sy + u * 3} V${sy + sh - u * 3} Q${sx + sw} ${sy + sh} ${sx + sw - u * 3} ${sy + sh} H${sx + u * 3} Q${sx} ${sy + sh} ${sx} ${sy + sh - u * 3} V${sy + u * 3} Q${sx} ${sy} ${sx + u * 3} ${sy} Z`, { colour: pink, width: u * 0.7 });
  const glow = (c) => `0 0 ${u * 0.4}px #FFFFFF, 0 0 ${u * 1.4}px ${c}, 0 0 ${u * 3.6}px ${c}, 0 0 ${u * 7}px ${c}`;
  const open = kit.text(root, props.open.toUpperCase(), { x: sx + sw / 2, y: sy + u * 3, size: 12, font: "heading", align: "center", colour: "#FFE3EE", style: { fontWeight: 800, letterSpacing: "0.14em", textShadow: glow(pink) } });
  const until = kit.text(root, props.until, { x: sx + sw / 2, y: sy + sh + u * 4, size: 7, font: "heading", align: "center", colour: "#FFF6CC", style: { fontWeight: 800, textShadow: glow(yellow) } });

  return (t) => {
    ring.set(on(t, 0.2));
    marks.set(on(t, 0.5));
    // The hands sweep round to two o'clock as the clock lights, then stop.
    const p = kit.progress(t, 0.4, 1.4, "out");
    const hour = -Math.PI / 2 + p * (2 / 12) * Math.PI * 2, minute = -Math.PI / 2 + p * Math.PI * 2;
    const d = `M${cx} ${cy} L${cx + Math.cos(hour) * R * 0.45} ${cy + Math.sin(hour) * R * 0.45} M${cx} ${cy} L${cx + Math.cos(minute) * R * 0.68} ${cy + Math.sin(minute) * R * 0.68}`;
    handPaths.forEach((el) => el.setAttribute("d", d));
    hands.set(on(t, 0.6));
    frame.set(on(t, 0.9));
    // "OPEN" blinks on a slow beat once it's lit: on for most of each second.
    const lit = on(t, 1.1) * (t > 2 && (t % 1.2) > 1.0 ? 0.15 : 1);
    open.style.opacity = String(0.12 + 0.88 * lit);
    until.style.opacity = String(0.12 + 0.88 * on(t, 1.6));
  };
});
