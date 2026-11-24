// The oven door drops open with a puff of steam, and the loaves hop out one after
// another into a row, then bounce together in time.
Bezel.scene((root, kit) => {
  const { u, safe, colours, props } = kit;
  const s = kit.stage();
  const ink = colours.text, paper = colours.surface;
  const floor = safe.y + safe.height * 0.92;
  kit.svg("path", { d: `M0 ${floor} H${kit.width}`, stroke: ink, "stroke-width": u * 0.5 }, s);
  // The oven: a big box with a dial, and a door that hinges down.
  const ow = safe.height * 0.62, oh = safe.height * 0.62;
  const ox = safe.x + u * 4, oy = floor - oh;
  kit.svg("rect", { x: ox, y: oy, width: ow, height: oh, rx: u * 2, fill: paper, stroke: ink, "stroke-width": u * 0.6 }, s);
  kit.svg("rect", { x: ox + ow * 0.12, y: oy + oh * 0.22, width: ow * 0.76, height: oh * 0.62, fill: ink }, s);
  [0.3, 0.5, 0.7].forEach((f) => kit.svg("circle", { cx: ox + ow * f, cy: oy + oh * 0.1, r: u * 1.6, fill: paper, stroke: ink, "stroke-width": u * 0.4 }, s));
  const door = kit.svg("rect", { x: ox + ow * 0.1, y: oy + oh * 0.2, width: ow * 0.8, height: oh * 0.66, rx: u, fill: paper, stroke: ink, "stroke-width": u * 0.5 }, s);
  const puffs = [0, 1, 2].map((i) => kit.svg("circle", { r: u * 3.4, fill: paper, stroke: ink, "stroke-width": u * 0.4 }, s));
  const n = props.loaves;
  const loaves = Array.from({ length: n }, (_, i) => ({
    toon: kit.toon(s, { x: 0, y: floor, height: safe.height * 0.34, colour: paper, kind: "rubber", tongue: "#6B6560", face: i % 2 ? "open" : "happy" }),
    at: 1.0 + i * 0.35,
    x: ox + ow + u * 12 + i * (safe.width - ow - u * 22) / n,
  }));

  return (t) => {
    const open = kit.progress(t, 0.5, 0.4, "outBack");
    door.setAttribute("transform", `translate(0 ${oy + oh * 0.86}) scale(1 ${Math.cos(open * Math.PI * 0.5) * 0.98 + 0.02}) translate(0 ${-(oy + oh * 0.86)})`);
    puffs.forEach((p, i) => {
      const k = kit.clamp((t - 0.6 - i * 0.12) / 1.2);
      p.setAttribute("cx", ox + ow * (0.35 + i * 0.15));
      p.setAttribute("cy", oy + oh * 0.4 - k * oh * 0.7);
      p.setAttribute("r", u * (2 + k * 3));
      p.style.opacity = String(k > 0 ? 1 - k : 0);
    });
    for (const l of loaves) {
      // Each hops out of the oven mouth in an arc and lands in its spot.
      const k = kit.progress(t, l.at, 0.5, "linear");
      const startX = ox + ow * 0.5, startY = oy + oh * 0.55;
      const x = kit.lerp(startX, l.x, k);
      const arc = Math.sin(k * Math.PI) * safe.height * 0.35;
      const settled = t > l.at + 0.5;
      const beat = Math.abs(Math.sin((t - 2.4) * Math.PI * 2));
      const y = kit.lerp(startY, floor, k) - arc - (settled && t > 2.4 ? beat * u * 2.5 : 0);
      l.toon.move(x, y).squash(settled ? (t > 2.4 && beat < 0.25 ? 0.3 : 0) : k > 0.9 ? 0.4 : -0.25);
      l.toon.group.style.opacity = t < l.at ? "0" : "1";
      l.toon.pose(settled ? (t > 2.4 ? ((Math.floor(t * 2) % 2) ? "cheer" : "wave") : "stand") : "cheer");
    }
    const r = kit.random(Math.floor(t * 12) + 1);
    root.style.filter = `brightness(${0.96 + r() * 0.07})`;
    root.style.transform = `translate(${(r() - 0.5) * u * 0.3}px, ${(r() - 0.5) * u * 0.3}px)`;
  };
});
