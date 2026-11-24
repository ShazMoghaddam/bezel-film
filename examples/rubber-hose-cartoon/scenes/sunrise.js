// Dawn over a sleepy town: the sun rises with its rays turning, our loaf strolls in
// bouncing on every beat, and the clock in the corner says five.
Bezel.scene((root, kit) => {
  const { u, safe, colours, props } = kit;
  const s = kit.stage();
  const ink = colours.text, paper = colours.surface;
  const ground = safe.y + safe.height * 0.74;
  const sunX = safe.x + safe.width * 0.7, sunR = Math.min(safe.height * 0.16, u * 12);
  const rays = kit.svg("g", {}, s);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    kit.svg("path", { d: `M${Math.cos(a - 0.08) * sunR * 1.3} ${Math.sin(a - 0.08) * sunR * 1.3} L${Math.cos(a) * sunR * 2.3} ${Math.sin(a) * sunR * 2.3} L${Math.cos(a + 0.08) * sunR * 1.3} ${Math.sin(a + 0.08) * sunR * 1.3} Z`, fill: ink, opacity: 0.85 }, rays);
  }
  const sun = kit.svg("g", {}, s);
  kit.svg("circle", { r: sunR, fill: paper, stroke: ink, "stroke-width": u * 0.5 }, sun);
  // A sleepy face on the sun: closed eyes that open as it rises.
  const lids = [-1, 1].map((side) => kit.svg("path", { fill: "none", stroke: ink, "stroke-width": u * 0.4, "stroke-linecap": "round" }, sun));
  kit.svg("path", { d: `M${-sunR * 0.3} ${sunR * 0.3} q${sunR * 0.3} ${sunR * 0.25} ${sunR * 0.6} 0`, fill: "none", stroke: ink, "stroke-width": u * 0.4, "stroke-linecap": "round" }, sun);
  // Rooftops along the bottom: a row of little houses in silhouette.
  let d = `M0 ${ground}`;
  const rand = kit.random(5);
  for (let x = 0; x < kit.width; ) {
    const w = u * (10 + rand() * 8), h = u * (8 + rand() * 9);
    d += ` L${x} ${ground - h} L${x + w / 2} ${ground - h - u * 5} L${x + w} ${ground - h} L${x + w} ${ground}`;
    x += w;
  }
  kit.svg("path", { d: d + ` L${kit.width} ${kit.height} L0 ${kit.height} Z`, fill: ink }, s);
  // A pale street in front of the houses, for the loaf to walk along.
  const street = ground + u * 1;
  kit.svg("rect", { x: 0, y: street, width: kit.width, height: kit.height - street, fill: "#E4DCCB" }, s);
  kit.svg("path", { d: `M0 ${street} H${kit.width}`, stroke: ink, "stroke-width": u * 0.5 }, s);
  const loaf = kit.toon(s, { x: safe.x, y: safe.y + safe.height * 0.97, height: safe.height * 0.42, colour: paper, kind: "rubber", tongue: "#6B6560", face: "happy" });
  const time = kit.text(root, props.caption, { x: safe.x + u * 2, y: safe.y + u * 2, size: 7, font: "heading", colour: ink, style: { fontStyle: "italic" } });

  return (t) => {
    const rise = kit.progress(t, 0.1, 1.6, "out");
    const sy = ground - (safe.height * 0.62) * rise;
    sun.setAttribute("transform", `translate(${sunX} ${sy})`);
    rays.setAttribute("transform", `translate(${sunX} ${sy}) rotate(${t * 20})`);
    const awake = kit.progress(t, 1.6, 0.3);
    lids.forEach((lid, i) => {
      const side = i ? 1 : -1, ex = side * sunR * 0.35, ey = -sunR * 0.15;
      lid.setAttribute("d", awake < 0.5 ? `M${ex - sunR * 0.15} ${ey} q${sunR * 0.15} ${sunR * 0.12} ${sunR * 0.3} 0` : `M${ex} ${ey - sunR * 0.12} v${sunR * 0.22}`);
    });
    // The loaf walks in from the left with a bounce on every beat, then dances in place.
    const walk = kit.progress(t, 0.5, 2.2, "out");
    const beat = Math.abs(Math.sin(t * Math.PI * 2));
    const x = kit.lerp(safe.x - u * 20, safe.x + safe.width * 0.3, walk);
    loaf.move(x, safe.y + safe.height * 0.97 - beat * u * 3);
    loaf.squash(beat < 0.25 ? 0.35 : -0.08);
    if (t < 2.7) loaf.walk(t, { stepsPerSecond: 2 });
    else loaf.pose("wave", "cheer", (Math.sin(t * Math.PI * 2) + 1) / 2);
    loaf.look(0.6);
    time.style.opacity = String(kit.progress(t, 0.9, 0.2));
    oldFilm(t);
  };
  function oldFilm(t) {
    const r = kit.random(Math.floor(t * 12) + 1);
    root.style.filter = `brightness(${0.96 + r() * 0.07})`;
    root.style.transform = `translate(${(r() - 0.5) * u * 0.3}px, ${(r() - 0.5) * u * 0.3}px)`;
  }
});
