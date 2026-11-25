// The sign-off: a huge red starburst punches in, the name lands on it in outlined
// capitals, then the line and a "where to get it" chip drop in below.
Bezel.scene((root, kit) => {
  const { u, colours, props, width, safe } = kit;
  const s = kit.stage();
  const ink = colours.text;
  const cx = width / 2, cy = safe.y + safe.height * 0.36;
  const r = Math.min(safe.width * 0.34, safe.height * 0.42);

  const burst = kit.svg("g", {}, s);
  kit.burst(burst, { cx: cx + u, cy: cy + u * 1.2, r, points: 18, fill: ink, stroke: ink, strokeWidth: u * 0.6, seed: 9 });
  kit.burst(burst, { cx, cy, r, points: 18, fill: colours.accent, stroke: ink, strokeWidth: u * 0.7, seed: 9 });
  kit.svg("ellipse", { cx, cy, rx: r * 0.68, ry: r * 0.5, fill: kit.tone(s, { kind: "dots", size: u * 1.4, colour: "#7A0A0E", weight: 0.3 }), opacity: 0.5 }, burst);
  const name = kit.text(root, props.name, { x: cx, y: cy - u * 9, size: 16, font: "heading", align: "center", colour: "#FFE14D",
    style: { textTransform: "uppercase", lineHeight: "1", WebkitTextStroke: `${u * 0.4}px ${ink}`, textShadow: `${u * 0.8}px ${u * 0.8}px 0 ${ink}`, rotate: "-6deg" } });
  const line = kit.text(root, props.line, { x: cx, y: safe.y + safe.height * 0.8, size: 5.4, font: "heading", align: "center", colour: ink, style: { textTransform: "uppercase" } });
  const chip = kit.text(root, props.chip, { x: cx, y: safe.y + safe.height * 0.8 + u * 9, size: 3, weight: 700, align: "center", colour: ink,
    style: { textTransform: "uppercase", letterSpacing: "0.06em", background: "#FFFFFF", padding: `${u * 0.8}px ${u * 2.4}px`, border: `${u * 0.4}px solid ${ink}`, boxShadow: `${u * 0.5}px ${u * 0.5}px 0 ${ink}` } });

  return (t) => {
    const b = kit.spring(t - 0.1, { stiffness: 300, damping: 12 });
    burst.style.opacity = t >= 0.1 ? "1" : "0";
    burst.setAttribute("transform", `translate(${cx} ${cy}) scale(${Math.max(0, b)}) rotate(${(1 - b) * 30 + Math.sin(t * 1.5) * 2}) translate(${-cx} ${-cy})`);
    const n = kit.spring(t - 0.35, { stiffness: 320, damping: 13 });
    name.style.opacity = t >= 0.35 ? "1" : "0";
    name.style.scale = String(Math.max(0, n));
    [line, chip].forEach((el, i) => {
      const p = kit.spring(t - 0.9 - i * 0.25, { stiffness: 260, damping: 15 });
      el.style.opacity = t >= 0.9 + i * 0.25 ? "1" : "0";
      el.style.translate = `-50% ${(1 - p) * u * 6}px`;
    });
  };
});
