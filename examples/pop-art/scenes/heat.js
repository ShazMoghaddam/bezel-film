// Three comic panels side by side, one per heat level. Each slams in on its word with
// hotter dots behind it and one more chilli than the last; the last one shakes.
Bezel.scene((root, kit) => {
  const { u, colours, props } = kit;
  const s = kit.stage();
  const ink = colours.text;
  const tall = kit.shape === "tall";
  const n = props.levels.length;
  const rects = kit.panels(props.levels.map((_, i) => (tall ? [0, i / n, 1, 1 / n] : [i / n, 0, 1 / n, 1])), { gutter: u * 2.2 });
  const grounds = ["#FFE14D", "#FF9F1C", colours.accent];
  const dotsOf = ["#F2A900", "#D7141A", "#7A0A0E"];

  const chilli = (parent, x, y, k, turn) => {
    const g = kit.svg("g", { transform: `translate(${x} ${y}) rotate(${turn})` }, parent);
    const body = `M0 0 C${k * 0.3} ${-k * 0.1} ${k * 0.7} ${k * 0.1} ${k * 0.95} ${k * 0.6} C${k} ${k * 0.72} ${k * 0.92} ${k * 0.76} ${k * 0.84} ${k * 0.66} C${k * 0.62} ${k * 0.36} ${k * 0.3} ${k * 0.22} ${k * 0.04} ${k * 0.2} C${-k * 0.08} ${k * 0.18} ${-k * 0.1} ${k * 0.04} 0 0 Z`;
    kit.svg("path", { d: body, fill: "#D7141A", stroke: ink, "stroke-width": k * 0.06, "stroke-linejoin": "round" }, g);
    kit.svg("path", { d: `M${k * 0.12} ${k * 0.06} C${k * 0.35} ${k * 0.02} ${k * 0.6} ${k * 0.12} ${k * 0.76} ${k * 0.36}`, fill: "none", stroke: "#FFFFFF", "stroke-width": k * 0.05, "stroke-linecap": "round" }, g);
    kit.svg("path", { d: `M${k * 0.04} ${k * 0.02} C${-k * 0.02} ${-k * 0.12} ${0} ${-k * 0.2} ${k * 0.1} ${-k * 0.24}`, fill: "none", stroke: "#1E8A3E", "stroke-width": k * 0.08, "stroke-linecap": "round" }, g);
    return g;
  };

  const panels = props.levels.map((word, i) => {
    const r = rects[i];
    const g = kit.svg("g", {}, s);
    const clip = `panel-${i}`;
    kit.svg("rect", { x: r.x, y: r.y, width: r.width, height: r.height }, kit.svg("clipPath", { id: clip }, kit.svg("defs", {}, s)));
    const inner = kit.svg("g", { "clip-path": `url(#${clip})` }, g);
    kit.svg("rect", { x: r.x, y: r.y, width: r.width, height: r.height, fill: grounds[i] }, inner);
    kit.svg("rect", { x: r.x, y: r.y, width: r.width, height: r.height, fill: kit.tone(s, { kind: "dots", size: u * (2.4 - i * 0.4), colour: dotsOf[i], weight: 0.32 + i * 0.06 }), opacity: 0.6 }, inner);
    const k = Math.min(r.width, r.height) * 0.42;
    const cx = r.x + r.width / 2, cy = r.y + r.height * (tall ? 0.5 : 0.6);
    // One more chilli per level, fanned out so each one reads.
    for (let c = 0; c <= i; c++) chilli(inner, cx - k * 0.45, cy - k * 0.55 + (c - i / 2) * k * 0.42, k * 0.9, -20 + (c - i / 2) * 14);
    kit.svg("rect", { x: r.x, y: r.y, width: r.width, height: r.height, fill: "none", stroke: ink, "stroke-width": u * 0.8 }, g);
    const caption = kit.text(root, word, { x: tall ? r.x + u * 3 : cx, y: r.y + u * 3, size: tall ? 6 : 7.4, font: "heading", align: tall ? "left" : "center", colour: i === 2 ? "#FFFFFF" : ink,
      style: { textTransform: "uppercase", background: i === 2 ? ink : "#FFFFFF", padding: `${u * 0.6}px ${u * 2}px`, border: `${u * 0.45}px solid ${ink}` } });
    return { g, caption, at: Math.max(0.2 + i * 0.6, (kit.at(i + 1) || 0) - 0.1), cx, cy, i };
  });

  return (t) => {
    panels.forEach((p) => {
      const slam = kit.spring(t - p.at, { stiffness: 320, damping: 14 });
      const on = t >= p.at;
      p.g.style.opacity = p.caption.style.opacity = on ? "1" : "0";
      const k = 1 + (1 - slam) * 0.35;
      // Inferno won't sit still: it shakes by a seeded jitter, a few times a second.
      const shake = p.i === 2 && t > p.at + 0.4 ? kit.random(Math.floor(t * 15) + 1) : null;
      const jx = shake ? (shake() - 0.5) * u * 0.8 : 0, jy = shake ? (shake() - 0.5) * u * 0.8 : 0;
      p.g.setAttribute("transform", `translate(${p.cx + jx} ${p.cy + jy}) scale(${k}) translate(${-p.cx} ${-p.cy})`);
      p.caption.style.scale = String(k);
    });
  };
});
