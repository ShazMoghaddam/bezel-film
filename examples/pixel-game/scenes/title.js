// A title screen: a starry night over pixel mountains and a little castle, the game's
// name dropping in with a bounce, and "PRESS START" blinking underneath.
Bezel.scene((root, kit) => {
  const { u, safe, colours, props, width, height } = kit;
  const s = kit.stage();
  const P = Math.round(u * 0.8); // One pixel of art, on screen.
  const snap = (v) => Math.round(v / P) * P;

  // Stars: single pixels that twinkle by seeded chance.
  const rand = kit.random(5);
  const stars = Array.from({ length: 50 }, () => kit.svg("rect", { x: snap(rand() * width), y: snap(rand() * height * 0.55), width: P, height: P, fill: rand() > 0.7 ? colours.accent : "#FFFFFF" }, s));
  // A pixel moon.
  kit.pixels(s, { art: ["..MMMM..", ".MMMMMMM", "MMMMMMM.", "MMMMMM..", "MMMMMM..", "MMMMMMM.", ".MMMMMMM", "..MMMM.."], palette: { M: "#FFF1B8" }, x: snap(safe.x + safe.width * (kit.shape === "wide" ? 0.82 : 0.72)), y: snap(safe.y + safe.height * 0.05), size: P * 2 });

  // Mountains in steps, two layers, then a castle on the near ridge.
  const range = (base, peaks, colour, seed) => {
    const r = kit.random(seed);
    const g = kit.svg("g", { "shape-rendering": "crispEdges" }, s);
    for (let x = 0; x < width; x += P * 2) {
      const k = peaks.reduce((m, [px, ph]) => Math.max(m, ph - Math.abs(x / width - px) * 2.2), 0);
      const h = snap(Math.max(0, k) * height * 0.4 + r() * P);
      kit.svg("rect", { x, y: base - h, width: P * 2 + 0.5, height: h + height - base + 1, fill: colour }, g);
    }
  };
  const ground = snap(safe.y + safe.height * 0.9);
  range(ground - P * 6, [[0.15, 0.8], [0.5, 0.6], [0.85, 0.9]], "#2B2870", 1);
  range(ground, [[0.3, 0.45], [0.7, 0.55]], "#1F1D55", 2);
  const castle = ["....T.......T....", "...TTT.....TTT...", "...WWW.....WWW...", "...WWWWWWWWWWWW...", "...WWDWWWWWDWWW...", "...WWWWWWWWWWWW...", "...WWWWWDDWWWWW...", "...WWWWWDDWWWWW..."].map((r) => r.slice(0, 17));
  kit.pixels(s, { art: castle, palette: { T: colours.palette[1], W: "#8C88D8", D: colours.accent }, x: snap(width * 0.7 - P * 17), y: ground - P * 2 * castle.length - P * 18, size: P * 2 });

  const name = kit.text(root, props.name.toUpperCase(), { x: width / 2, y: safe.y + safe.height * (kit.shape === "wide" ? 0.24 : 0.32), size: kit.shape === "wide" ? 8.4 : 6.4, font: "heading", align: "center", colour: colours.accent,
    style: { textShadow: `${P}px ${P}px 0 #C2410C, ${P * 2}px ${P * 2}px 0 #000` } });
  const start = kit.text(root, props.start.toUpperCase(), { x: width / 2, y: safe.y + safe.height * 0.5, size: 3, font: "heading", align: "center", colour: "#FFFFFF", style: { textShadow: `${P / 2}px ${P / 2}px 0 #000` } });

  return (t) => {
    const tw = kit.random(Math.floor(t * 6) + 1);
    stars.forEach((st) => (st.style.opacity = tw() > 0.85 ? "0.3" : "1"));
    // The name drops from above and bounces, in whole pixels, like a sprite.
    const d = kit.spring(t - 0.3, { stiffness: 240, damping: 11 });
    name.style.translate = `-50% ${snap((1 - d) * -u * 30)}px`;
    name.style.opacity = t >= 0.3 ? "1" : "0";
    start.style.opacity = t > 1.4 && Math.floor(t * 2) % 2 === 0 ? "1" : "0";
  };
});
