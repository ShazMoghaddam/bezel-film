// The name, huge, slams in through parallel speed lines, with the tagline on a strip
// beneath it and the lamp beside it.
Bezel.scene((root, kit) => {
  const { u, safe, colours, props } = kit;
  const s = kit.stage();
  const ink = colours.text, paper = "#FFFFFF";
  const r = safe;
  kit.svg("rect", { x: r.x, y: r.y, width: r.width, height: r.height, fill: paper }, s);
  const lines = kit.speedLines(s, { kind: "motion", box: r, angle: 0, count: 70, seed: 4 });
  kit.svg("rect", { x: r.x, y: r.y, width: r.width, height: r.height, fill: "none", stroke: ink, "stroke-width": u * 0.7 }, s);
  const cy = r.y + r.height * 0.42;
  const name = kit.text(root, props.name, { x: r.x + r.width / 2, y: cy - u * 9, size: kit.shape === "tall" ? 11 : 15, font: "heading", align: "center", colour: ink,
    style: { WebkitTextStroke: `${u * 1.1}px #FFFFFF`, paintOrder: "stroke fill", letterSpacing: "-0.02em" } });
  const strip = kit.text(root, props.tagline, { x: r.x + r.width / 2, y: cy + u * 10, size: 4.6, font: "heading", align: "center", colour: paper,
    style: { background: ink, padding: `${u * 1}px ${u * 3}px` } });
  const accent = kit.svg("path", { d: `M${r.x + r.width * 0.2} ${cy + u * 7.5} h${r.width * 0.6}`, stroke: colours.accent, "stroke-width": u * 0.8 }, s);

  return (t) => {
    const k = kit.progress(t, 0.2, 0.22, "outExpo");
    name.style.transform = `translateX(${(1 - k) * -r.width}px) skewX(${(1 - k) * -18}deg)`;
    name.style.opacity = String(k > 0 ? 1 : 0);
    lines.setAttribute("transform", `translate(${(t * 2 % 1) * u * 20} 0)`);
    lines.style.opacity = String(0.9 * (1 - kit.progress(t, 0.9, 0.5)) + 0.25);
    accent.style.opacity = String(kit.progress(t, 0.6, 0.1));
    const sk = kit.spring(t - Math.max(1.0, kit.at(1) - 0.1), { stiffness: 260, damping: 14 });
    strip.style.opacity = String(kit.clamp(sk * 3));
    strip.style.transform = `translateY(${(1 - sk) * u * 4}px)`;
  };
});
