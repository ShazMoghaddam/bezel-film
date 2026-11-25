// A wall of chillies pops in row by row, each with a thick black outline and comic dot
// shading, red and green in turn. Then a white panel slams down over the middle with
// the name and the line.
Bezel.scene((root, kit) => {
  const { u, colours, props, width, height, safe } = kit;
  const s = kit.stage();
  const ink = colours.text;
  const dots = kit.tone(s, { kind: "dots", size: u * 1.1, colour: ink, weight: 0.32, angle: 45 });

  // One chilli at (0, 0), about one unit long: body, highlight, cap and stem.
  const chilli = (parent, k, colour) => {
    const g = kit.svg("g", {}, parent);
    const body = `M0 0 C${k * 0.3} ${-k * 0.1} ${k * 0.7} ${k * 0.1} ${k * 0.95} ${k * 0.6} C${k} ${k * 0.72} ${k * 0.92} ${k * 0.76} ${k * 0.84} ${k * 0.66} C${k * 0.62} ${k * 0.36} ${k * 0.3} ${k * 0.22} ${k * 0.04} ${k * 0.2} C${-k * 0.08} ${k * 0.18} ${-k * 0.1} ${k * 0.04} 0 0 Z`;
    kit.svg("path", { d: body, fill: colour, stroke: ink, "stroke-width": k * 0.05, "stroke-linejoin": "round" }, g);
    kit.svg("path", { d: body, fill: dots, opacity: 0.35 }, g);
    kit.svg("path", { d: `M${k * 0.12} ${k * 0.06} C${k * 0.35} ${k * 0.02} ${k * 0.6} ${k * 0.12} ${k * 0.76} ${k * 0.36}`, fill: "none", stroke: "#FFFFFF", "stroke-width": k * 0.045, "stroke-linecap": "round" }, g);
    kit.svg("path", { d: `M${-k * 0.06} ${k * 0.1} C${-k * 0.04} ${-k * 0.06} ${k * 0.12} ${-k * 0.08} ${k * 0.16} ${k * 0.06} Z`, fill: "#1E8A3E", stroke: ink, "stroke-width": k * 0.04, "stroke-linejoin": "round" }, g);
    kit.svg("path", { d: `M${k * 0.04} ${k * 0.02} C${-k * 0.02} ${-k * 0.12} ${0} ${-k * 0.2} ${k * 0.1} ${-k * 0.24}`, fill: "none", stroke: ink, "stroke-width": k * 0.09, "stroke-linecap": "round" }, g);
    kit.svg("path", { d: `M${k * 0.04} ${k * 0.02} C${-k * 0.02} ${-k * 0.12} ${0} ${-k * 0.2} ${k * 0.1} ${-k * 0.24}`, fill: "none", stroke: "#1E8A3E", "stroke-width": k * 0.05, "stroke-linecap": "round" }, g);
    return g;
  };

  // The wall: a staggered grid that runs past the frame edges.
  const step = u * 15, k = u * 9;
  const items = [];
  for (let row = 0, y = -step * 0.4; y < height + step; row++, y += step * 0.78) {
    for (let col = 0, x = -step * 0.5 + (row % 2 ? step / 2 : 0); x < width + step; col++, x += step) {
      const colour = (row + col) % 3 === 0 ? "#1E8A3E" : colours.accent;
      const g = chilli(s, k, colour);
      items.push({ g, x, y, row, turn: ((row * 7 + col * 3) % 5) * 12 - 24 });
    }
  }

  // The panel: white with a heavy outline and a hard shadow, the name on it.
  const pw = Math.min(safe.width * 0.7, u * 110), ph = u * 34;
  const px = width / 2 - pw / 2, py = height / 2 - ph / 2 - u * 2;
  const panel = kit.svg("g", {}, s);
  kit.svg("rect", { x: px + u * 1.4, y: py + u * 1.4, width: pw, height: ph, fill: ink }, panel);
  kit.svg("rect", { x: px, y: py, width: pw, height: ph, fill: "#FFFFFF", stroke: ink, "stroke-width": u * 0.7 }, panel);
  const name = kit.text(root, props.name, { x: width / 2, y: py + u * 3, size: 15, font: "heading", align: "center", colour: colours.accent, style: { textTransform: "uppercase", lineHeight: "1", WebkitTextStroke: `${u * 0.35}px ${ink}`, textShadow: `${u * 0.7}px ${u * 0.7}px 0 ${ink}` } });
  const line = kit.text(root, props.line, { x: width / 2, y: py + u * 23, size: 4.2, font: "heading", align: "center", colour: ink, style: { textTransform: "uppercase" } });

  return (t) => {
    items.forEach((it) => {
      // Rows pop in top to bottom, a few frames apart, with a springy overshoot.
      const p = kit.spring(t - 0.05 - it.row * 0.09, { stiffness: 260, damping: 12 });
      it.g.setAttribute("transform", `translate(${it.x} ${it.y}) rotate(${it.turn}) scale(${Math.max(0, p)})`);
    });
    // The panel slams in from big to its size, on a hard cut, no fade.
    const slam = kit.spring(t - 1.1, { stiffness: 320, damping: 16 });
    const show = t >= 1.1;
    panel.style.opacity = name.style.opacity = line.style.opacity = show ? "1" : "0";
    const k2 = 1 + (1 - slam) * 0.6;
    panel.setAttribute("transform", `translate(${width / 2} ${height / 2}) scale(${k2}) translate(${-width / 2} ${-height / 2})`);
    name.style.scale = line.style.scale = String(k2);
  };
});
