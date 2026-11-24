// The same cut-paper hills as the first scene, now at dawn: the sky warms from deep
// blue to rose and gold, the sun rises behind the far peaks, and every layer takes on
// the light. The line and the name come up last.
Bezel.scene((root, kit) => {
  const { u, safe, colours, props, width, height } = kit;
  const s = kit.stage();
  const mix = (a, b, k) => `color-mix(in oklab, ${a}, ${b} ${(kit.clamp(k) * 100).toFixed(1)}%)`;

  // The sky: night blue above a warm band, faded in over the night.
  const defs = kit.svg("defs", {}, s);
  const grad = kit.svg("linearGradient", { id: "dawn-sky", x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
  [[0, "#3B3F7A"], [0.45, "#B0607A"], [0.75, "#F2A65E"], [1, "#FFD59A"]].forEach(([o, c]) => kit.svg("stop", { offset: o, "stop-color": c }, grad));
  const sky = kit.svg("rect", { x: 0, y: 0, width, height, fill: "url(#dawn-sky)", opacity: 0 }, s);
  const sunX = safe.x + safe.width * 0.62, horizon = safe.y + safe.height * 0.62;
  const halo = kit.glow(s, { cx: sunX, cy: horizon, r: u * 50, colour: "#FFE0A8", strength: 0.8 });
  const sun = kit.svg("circle", { cx: sunX, cy: horizon, r: u * 7, fill: "#FFF1D6" }, s);

  const ridge = (top, amp, peaks, seed, sharp = 0.5) => {
    const rand = kit.random(seed);
    const step = (width + u * 50) / peaks;
    let d = `M${-u * 10} ${height + u * 4} L${-u * 10} ${top}`;
    for (let i = 0; i < peaks; i++) { const x = -u * 10 + step * i, h = amp * (0.5 + rand() * 0.7); d += ` L${x + step * sharp} ${top - h} L${x + step} ${top + (rand() - 0.5) * amp * 0.25}`; }
    return d + ` L${width + u * 40} ${height + u * 4} Z`;
  };
  const night = ["#2A3A72", "#1E2A58", "#162047", "#0D1533"];
  const day = ["#8E6A9A", "#6A4E86", "#4A3A6E", "#2A2350"];
  const layers = [
    ridge(safe.y + safe.height * 0.62, u * 22, 5, 2, 0.45),
    ridge(safe.y + safe.height * 0.74, u * 14, 7, 5, 0.55),
    ridge(safe.y + safe.height * 0.84, u * 8, 4, 9, 0.5),
    ridge(safe.y + safe.height * 0.96, u * 5, 6, 12, 0.5),
  ].map((d, i) => {
    const g = kit.svg("g", {}, s);
    const rim = kit.svg("path", { d, fill: "none", stroke: "#FFD59A", "stroke-width": u * 0.3, transform: `translate(0 ${-u * 0.3})`, opacity: 0 }, g);
    const c = kit.cutout(g, d, { fill: night[i], shadow: 0.45, lift: u * 0.9, shadowColour: "20 10 30" });
    return { g, rim, shape: c.shape, i };
  });

  const line = kit.text(root, props.line, { x: width / 2, y: safe.y + safe.height * 0.06, size: kit.shape === "tall" ? 7 : 8.4, font: "heading", align: "center", colour: "#FFF6E8", maxWidth: safe.width, style: { textWrap: "balance", textShadow: `0 0 ${u * 3}px rgb(59 63 122 / .6)` } });
  // The name sits low, on the dark front hills, where it reads clearly.
  const name = kit.text(root, props.name.toUpperCase(), { x: width / 2, y: safe.y + safe.height * 0.97 - u * 4, size: 3, weight: 700, align: "center", colour: "#FFF6E8", style: { letterSpacing: "0.32em" } });

  return (t) => {
    const dawn = kit.progress(t, 0.2, Math.max(2.5, kit.duration * 0.6), "inOut");
    sky.style.opacity = String(dawn);
    const rise = kit.progress(t, 0.5, Math.max(3, kit.duration * 0.75), "out");
    const sy = horizon + u * 6 - rise * safe.height * 0.32;
    sun.setAttribute("cy", String(sy));
    halo.setAttribute("cy", String(sy));
    halo.style.opacity = String(kit.clamp(rise * 1.5));
    layers.forEach((l) => {
      l.shape.setAttribute("fill", mix(night[l.i], day[l.i], dawn));
      l.rim.style.opacity = String(dawn * (0.7 - l.i * 0.15));
      l.g.setAttribute("transform", `translate(${-(l.i + 1) * u * 0.5 * t} 0)`);
    });
    const a = kit.progress(t, Math.max(0.8, kit.at(0) + 0.6), 0.8);
    line.style.opacity = String(a);
    line.style.translate = `-50% ${(1 - a) * u * 1.5}px`;
    const b = kit.progress(t, Math.max(2.4, kit.duration - 1.8), 0.8);
    name.style.opacity = String(b);
  };
});
