// Side-scrolling: our hero walks across the grass on a two-frame walk, and coins with
// letters on them float ahead. Each one collected ticks the word counter up, until it
// reads ten. A text box at the top says what's going on.
Bezel.scene((root, kit) => {
  const { u, safe, colours, props, width, height } = kit;
  const s = kit.stage();
  const P = Math.round(u * 0.8);
  const snap = (v) => Math.round(v / P) * P;
  const pal = { H: "#5A3A1E", S: "#F2C29B", K: "#111111", B: "#4CC9F0", P: "#2B2870", W: "#FFFFFF" };
  const top = ["....HHHH....", "...HHHHHH...", "...HSSSSH...", "...SSKSKS...", "...SSSSSS...", "....SSSS....", "...BBBBBB...", "..SBBBBBBS..", "..SBBBBBBS..", "...BBBBBB..."];
  const legsA = ["...PPPPPP...", "...PP..PP...", "...PP..PP...", "..KKK..KKK.."];
  const legsB = ["...PPPPPP...", "..PP....PP..", ".PP......PP.", ".KK......KK."];

  // Ground: a strip of grass on dirt, drawn as tiles that scroll.
  const ground = snap(safe.y + safe.height * 0.8);
  const tiles = kit.svg("g", { "shape-rendering": "crispEdges" }, s);
  const tile = P * 8;
  for (let x = -tile; x < width + tile * 2; x += tile) {
    kit.svg("rect", { x, y: ground, width: tile + 0.5, height: P * 2, fill: "#3DDC84" }, tiles);
    kit.svg("rect", { x, y: ground + P * 2, width: tile + 0.5, height: height - ground, fill: "#7A4A22" }, tiles);
    kit.svg("rect", { x: x + P * 2, y: ground + P * 4, width: P, height: P, fill: "#5A3418" }, tiles);
    kit.svg("rect", { x: x + P * 5, y: ground + P * 7, width: P, height: P, fill: "#5A3418" }, tiles);
  }
  // Clouds drifting slowly behind.
  const clouds = kit.svg("g", {}, s);
  [[0.15, 0.25], [0.55, 0.15], [0.85, 0.3]].forEach(([fx, fy]) => kit.pixels(clouds, { art: ["..WWWW..", ".WWWWWWW", "WWWWWWWW"], palette: { W: "#C9C6F0" }, x: snap(width * fx), y: snap(safe.y + safe.height * fy), size: P * 2 }));

  // The hero, two frames, swapped on twos.
  const hx = snap(safe.x + safe.width * 0.22), size = P * 2, hy = ground - size * 14;
  const frameA = kit.pixels(s, { art: [...top, ...legsA], palette: pal, x: hx, y: hy, size });
  const frameB = kit.pixels(s, { art: [...top, ...legsB], palette: pal, x: hx, y: hy, size });

  // Coins: placed along the path ahead, each collected when the hero reaches it.
  const coinArt = [".YYYY.", "YYWYYY", "YWYYYY", "YYYYOY", "YYYOOY", ".YYYY."];
  const speed = u * 30; // How fast the world scrolls past.
  const startT = 0.8;
  const coins = Array.from({ length: props.goal }, (_, i) => {
    const wx = hx + u * 30 + i * u * 8, wy = ground - P * 2 * (20 + (i % 3) * 3);
    const g = kit.pixels(s, { art: coinArt, palette: { Y: colours.accent, W: "#FFFFFF", O: "#C2410C" }, x: 0, y: 0, size: P * 1.5 });
    const hit = startT + (wx - hx - size * 6) / speed;
    return { g, wx, wy, hit };
  });
  // A "+1" that pops when a coin is taken.
  const plus = kit.text(root, "+1", { x: hx + size * 6, y: hy - u * 6, size: 2.6, font: "heading", align: "center", colour: colours.accent, style: { textShadow: `${P / 2}px ${P / 2}px 0 #000` } });

  const box = kit.text(root, props.say, { x: safe.x, y: safe.y, size: 2.6, font: "heading", colour: "#FFFFFF", maxWidth: safe.width * 0.62,
    style: { background: "#000000", border: `${P}px solid #FFFFFF`, boxShadow: `0 0 0 ${P}px #000`, padding: `${u * 2}px ${u * 2.4}px`, lineHeight: "1.6" } });
  const counter = kit.text(root, "", { x: safe.x + safe.width, y: safe.y, size: 2.6, font: "heading", align: "right", colour: colours.accent,
    style: { background: "#000000", border: `${P}px solid #FFFFFF`, padding: `${u * 2}px ${u * 2.4}px`, lineHeight: "1.6" } });

  return (t) => {
    const scroll = Math.max(0, t - startT) * speed;
    const offset = snap(scroll % tile);
    tiles.setAttribute("transform", `translate(${-offset} 0)`);
    clouds.setAttribute("transform", `translate(${-snap(scroll * 0.15)} 0)`);
    const walking = t > startT;
    const flip = walking && Math.floor(kit.stepped(t, 8) * 8) % 2 === 1;
    frameA.style.opacity = flip ? "0" : "1";
    frameB.style.opacity = flip ? "1" : "0";
    let got = 0, last = -1;
    coins.forEach((c) => {
      const x = snap(c.wx - scroll), bob = snap(Math.sin(t * 4 + c.wx) * P * 1.5);
      const taken = t >= c.hit;
      if (taken) { got++; last = Math.max(last, c.hit); }
      c.g.setAttribute("transform", `translate(${x} ${c.wy + bob})`);
      c.g.style.opacity = taken ? "0" : "1";
    });
    const since = t - last;
    plus.style.opacity = last > 0 && since < 0.4 ? "1" : "0";
    plus.style.translate = `-50% ${-snap(since * u * 10)}px`;
    box.style.opacity = t > 0.2 ? "1" : "0";
    box.textContent = kit.typing(props.say, t, { at: 0.3, cps: 30 });
    counter.textContent = `${props.counter.toUpperCase()} ${String(got).padStart(2, "0")}/${props.goal}`;
  };
});
