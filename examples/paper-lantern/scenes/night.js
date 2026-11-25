// Layers of cut paper slide up into place one behind another: far peaks, nearer hills,
// a line of pines. The moon glows through from behind, and the title fades up in its light.
Bezel.scene((root, kit) => {
  const { u, safe, colours, props, width, height } = kit;
  const s = kit.stage();
  const warm = colours.accent;

  // A ridge of peaks across the frame, closed down past the bottom edge.
  const ridge = (top, amp, peaks, seed, sharp = 0.5) => {
    const rand = kit.random(seed);
    const step = (width + u * 50) / peaks;
    let d = `M${-u * 10} ${height + u * 4} L${-u * 10} ${top}`;
    for (let i = 0; i < peaks; i++) {
      const x = -u * 10 + step * i, h = amp * (0.5 + rand() * 0.7);
      d += ` L${x + step * sharp} ${top - h} L${x + step} ${top + (rand() - 0.5) * amp * 0.25}`;
    }
    return d + ` L${width + u * 40} ${height + u * 4} Z`;
  };
  const pines = (top, count, size, seed) => {
    const rand = kit.random(seed);
    let d = `M${-u * 10} ${height + u * 4} L${-u * 10} ${top}`;
    for (let i = 0; i <= count; i++) {
      const x = -u * 10 + ((width + u * 50) * i) / count, h = size * (0.6 + rand() * 0.8), w = size * 0.32;
      d += ` L${x - w} ${top} L${x - w * 0.5} ${top - h * 0.45} L${x - w * 0.75} ${top - h * 0.45} L${x} ${top - h} L${x + w * 0.75} ${top - h * 0.45} L${x + w * 0.5} ${top - h * 0.45} L${x + w} ${top}`;
    }
    return d + ` L${width + u * 40} ${height + u * 4} Z`;
  };

  // The moon, with a warm glow that the layers in front cut into.
  const wideFrame = kit.shape === "wide";
  const mx = safe.x + safe.width * (wideFrame ? 0.72 : 0.8), my = safe.y + safe.height * (wideFrame ? 0.26 : 0.1);
  const halo = kit.glow(s, { cx: mx, cy: my, r: u * 34, colour: "#FFD59A", strength: 0.55 });
  const moon = kit.svg("circle", { cx: mx, cy: my, r: u * 5, fill: "#FFE9C4" }, s);
  const rand = kit.random(4);
  const stars = Array.from({ length: 40 }, () => kit.svg("circle", { cx: rand() * width, cy: rand() * height * 0.55, r: u * (0.12 + rand() * 0.22), fill: "#FFF3DD" }, s));

  const fills = ["#2A3A72", "#1E2A58", "#162047", "#0D1533"];
  const layers = [
    ridge(safe.y + safe.height * 0.62, u * 22, 5, 2, 0.45),
    ridge(safe.y + safe.height * 0.74, u * 14, 7, 5, 0.55),
    ridge(safe.y + safe.height * 0.84, u * 8, 4, 9, 0.5),
    pines(safe.y + safe.height * 0.98, 22, u * 12, 3),
  ].map((d, i) => {
    const g = kit.svg("g", {}, s);
    // Each layer's top edge catches a thin line of warm light from behind it.
    kit.svg("path", { d, fill: "none", stroke: warm, "stroke-width": u * 0.25, opacity: 0.35 - i * 0.07, transform: `translate(0 ${-u * 0.25})` }, g);
    kit.cutout(g, d, { fill: fills[i], shadow: 0.55, lift: u * 0.9, shadowColour: "4 6 18" });
    return g;
  });
  // A few lit windows, low in the hills: someone's still awake.
  const windows = [[0.18, 0.86], [0.24, 0.875], [0.56, 0.9]].map(([fx, fy]) => kit.svg("rect", { x: width * fx, y: safe.y + safe.height * fy, width: u * 0.9, height: u * 0.9, fill: warm }, layers[2]));

  const kicker = kit.text(root, props.kicker.toUpperCase(), { x: safe.x, y: safe.y + safe.height * (wideFrame ? 0.12 : 0.22), size: 2.8, weight: 700, colour: warm, style: { letterSpacing: "0.3em" } });
  const title = kit.text(root, props.title, { x: safe.x, y: safe.y + safe.height * (wideFrame ? 0.18 : 0.28), size: kit.shape === "tall" ? 7 : 8, font: "heading", colour: colours.text, maxWidth: safe.width * (kit.shape === "wide" ? 0.52 : 0.9), style: { lineHeight: "1.05", textWrap: "balance" } });

  return (t) => {
    // Layers rise into place, back first, then drift apart a little for depth.
    layers.forEach((g, i) => {
      const up = kit.spring(t - 0.15 - i * 0.22, { stiffness: 60, damping: 14 });
      const drift = (i + 1) * u * 0.6 * t;
      g.setAttribute("transform", `translate(${-drift} ${(1 - up) * u * (22 + i * 8)})`);
    });
    halo.style.opacity = String(kit.progress(t, 0.2, 1.4) * (0.92 + 0.08 * Math.sin(t * 1.3)));
    moon.style.opacity = String(kit.progress(t, 0.1, 1));
    // Stars twinkle by seeded chance, a few at a time.
    const tw = kit.random(Math.floor(t * 6) + 1);
    stars.forEach((st) => (st.style.opacity = String((0.4 + tw() * 0.6) * kit.progress(t, 0.4, 1))));
    windows.forEach((w, i) => (w.style.opacity = String(kit.progress(t, 1.6 + i * 0.3, 0.2))));
    const k = kit.progress(t, 0.9, 1.0);
    kicker.style.opacity = String(kit.progress(t, 0.6, 0.8));
    title.style.opacity = String(k);
    title.style.translate = `0 ${(1 - k) * u * 1.5}px`;
  };
});
