// A full-page splash: focus lines burst out from a glowing orb, the lamp, as it rises
// into the frame. The question is lettered across the top, and a "SHIIN" sparkles.
Bezel.scene((root, kit) => {
  const { u, safe, colours, props } = kit;
  const s = kit.stage();
  const ink = colours.text, paper = "#FFFFFF";
  const r = safe;
  kit.svg("rect", { x: r.x, y: r.y, width: r.width, height: r.height, fill: paper }, s);
  const cx = r.x + r.width / 2, cy = r.y + r.height * 0.58;
  const lines = kit.speedLines(s, { cx, cy, box: r, inner: Math.min(r.width, r.height) * 0.3, count: 140, seed: 7 });
  const orb = kit.svg("g", {}, s);
  const R = Math.min(r.height * 0.24, u * 20);
  // The lamp: a soft orb on a small stand, with tone shading on one side.
  kit.svg("rect", { x: cx - R * 0.5, y: cy + R * 0.9, width: R, height: R * 0.22, rx: R * 0.08, fill: ink }, orb);
  kit.svg("circle", { cx, cy, r: R, fill: paper, stroke: ink, "stroke-width": u * 0.6 }, orb);
  const shade = kit.svg("path", { d: `M${cx + R * 0.2} ${cy - R * 0.98} a${R} ${R} 0 0 1 0 ${R * 1.96} a${R * 0.75} ${R} 0 0 0 0 ${-R * 1.96} Z`, fill: kit.tone(s, { kind: "dots", size: u * 0.8, weight: 0.55 }) }, orb);
  const glow = [1.25, 1.5, 1.8].map((k, i) => kit.svg("circle", { cx, cy, r: R * k, fill: "none", stroke: ink, "stroke-width": u * 0.25, "stroke-dasharray": `${u * 1.5} ${u * 1.2}`, opacity: 0.6 - i * 0.15 }, orb));
  kit.svg("rect", { x: r.x, y: r.y, width: r.width, height: r.height, fill: "none", stroke: ink, "stroke-width": u * 0.7 }, s);
  // The question on a white caption box across the top.
  const line = kit.text(root, props.line, { x: cx, y: r.y + u * 3, size: kit.shape === "tall" ? 4.4 : 5.2, font: "heading", align: "center", colour: ink,
    style: { background: paper, border: `${u * 0.45}px solid ${ink}`, padding: `${u * 1}px ${u * 2.4}px`, whiteSpace: "nowrap" } });
  const sfx = kit.text(root, props.sfx, { x: cx + R * 1.6, y: cy - R * 1.5, size: 6, font: "heading", colour: ink,
    style: { WebkitTextStroke: `${u * 0.8}px #FFFFFF`, paintOrder: "stroke fill", rotate: "12deg" } });
  const sparkles = [[-1.3, -0.9], [1.4, 0.4], [-1.1, 0.8]].map(([dx, dy]) => kit.icon("sparkles", { parent: root, x: cx + dx * R - u * 3, y: cy + dy * R - u * 3, size: u * 6, colour: ink, width: u * 0.45 }));

  return (t) => {
    const rise = kit.spring(t - 0.3, { stiffness: 90, damping: 14 });
    orb.setAttribute("transform", `translate(0 ${(1 - rise) * r.height * 0.6})`);
    lines.style.opacity = String(kit.progress(t, 0.5, 0.2));
    lines.setAttribute("transform", `translate(${cx} ${cy}) scale(${1 + Math.sin(t * 9) * 0.01}) translate(${-cx} ${-cy})`);
    glow.forEach((g, i) => (g.style.opacity = String((0.6 - i * 0.15) * kit.progress(t, 1.0 + i * 0.1, 0.3))));
    shade.style.opacity = "1";
    line.style.opacity = String(kit.progress(t, 0.1, 0.15));
    const k = kit.spring(t - 1.3, { stiffness: 300, damping: 12 });
    sfx.style.opacity = String(kit.clamp(k * 3));
    sfx.style.scale = String(Math.max(0, k));
    sparkles.forEach((sp, i) => {
      const p = kit.spring(t - 1.4 - i * 0.12, { stiffness: 260, damping: 10 });
      sp.svg.style.transformOrigin = "center";
      sp.svg.style.transform = `scale(${Math.max(0, p)}) rotate(${t * 40}deg)`;
    });
  };
});
