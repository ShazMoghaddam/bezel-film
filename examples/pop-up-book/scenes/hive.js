// A straw hive pops up on the left, and beside it a cut-away of the comb. Cells fill
// with honey one by one while two bees fan their wings, then wax caps seal each cell.
Bezel.scene((root, kit) => {
  const { u, safe, colours, props, width } = kit;
  const s = kit.stage();
  const ink = colours.text, rim = "#FFFFFF";
  const base = safe.y + safe.height * 0.97;
  const wide = kit.shape === "wide";

  // The ground strip, so the hive has somewhere to stand.
  const ground = kit.popup(s, { base, x: width / 2 });
  kit.cutout(ground.group, `M${safe.x - u * 4} ${base} L${safe.x - u * 4} ${base - u * 7} Q${width / 2} ${base - u * 11} ${safe.x + safe.width + u * 4} ${base - u * 6} L${safe.x + safe.width + u * 4} ${base} Z`, { fill: "#6FAE6B", edge: rim });

  // The hive: a dome of stacked straw rings with a dark doorway.
  const hx = wide ? safe.x + safe.width * 0.22 : safe.x + safe.width * 0.3, hw = Math.min(safe.width * 0.3, u * 38), hh = hw * 1.05;
  const hive = kit.popup(s, { base: base - u * 4, x: hx });
  const rings = 6;
  for (let i = rings - 1; i >= 0; i--) {
    const y = base - u * 4 - (hh * (i + 1)) / rings, w = hw * Math.sqrt(1 - Math.pow((i + 0.5) / rings, 2)) * 1.02, h = hh / rings + u * 1.2;
    kit.cutout(hive.group, `M${hx - w / 2 + h / 2} ${y} H${hx + w / 2 - h / 2} a${h / 2} ${h / 2} 0 0 1 0 ${h} H${hx - w / 2 + h / 2} a${h / 2} ${h / 2} 0 0 1 0 ${-h} Z`,
      { fill: i % 2 ? "#E2B25A" : "#D49E43", edge: rim, edgeWidth: u * 0.35, shadow: 0.15, lift: u * 0.3 });
  }
  kit.cutout(hive.group, `M${hx - u * 3.2} ${base - u * 4} v${-u * 3} a${u * 3.2} ${u * 3.2} 0 0 1 ${u * 6.4} 0 v${u * 3} Z`, { fill: "#3B3029", shadow: 0 });

  // The comb: a card of hexagon cells, filled one by one.
  const cx = wide ? safe.x + safe.width * 0.68 : safe.x + safe.width * 0.55, cy = safe.y + safe.height * 0.55;
  const comb = kit.popup(s, { base, x: cx });
  const cw = Math.min(safe.width * 0.46, u * 70), ch = safe.height * 0.6;
  kit.cutout(comb.group, `M${cx - u * 1} ${cy + ch / 2} h${u * 2} V${base} h${-u * 2} Z`, { fill: "#9B6A43", edge: rim, edgeWidth: u * 0.35 });
  kit.cutout(comb.group, `M${cx - cw / 2 + u * 3} ${cy - ch / 2} H${cx + cw / 2 - u * 3} q${u * 3} 0 ${u * 3} ${u * 3} V${cy + ch / 2 - u * 3} q0 ${u * 3} ${-u * 3} ${u * 3} H${cx - cw / 2 + u * 3} q${-u * 3} 0 ${-u * 3} ${-u * 3} V${cy - ch / 2 + u * 3} q0 ${-u * 3} ${u * 3} ${-u * 3} Z`, { fill: "#F4E3B5", edge: rim, lift: u });
  const R = u * 4.2, cols = Math.floor((cw - u * 6) / (R * 1.75)), rows = Math.floor((ch - u * 6) / (R * 1.55));
  const hex = (x, y, r) => Array.from({ length: 6 }, (_, k) => { const a = Math.PI / 6 + (k * Math.PI) / 3; return `${(x + Math.cos(a) * r).toFixed(1)},${(y + Math.sin(a) * r).toFixed(1)}`; }).join(" ");
  const cells = [];
  const ox = cx - ((cols - 1) * R * 1.75) / 2 - R * 0.44, oy = cy - ((rows - 1) * R * 1.52) / 2;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = ox + c * R * 1.75 + (r % 2 ? R * 0.88 : 0), y = oy + r * R * 1.52;
    kit.svg("polygon", { points: hex(x, y, R * 0.98), fill: "#FFF7E0", stroke: "#C98F2E", "stroke-width": u * 0.4 }, comb.group);
    const honey = kit.svg("polygon", { points: hex(x, y, R * 0.78), fill: "#E09A1A" }, comb.group);
    const cap = kit.svg("polygon", { points: hex(x, y, R * 0.8), fill: "#F7D77A", stroke: "#C98F2E", "stroke-width": u * 0.25 }, comb.group);
    cells.push({ honey, cap, order: (c * 7 + r * 3) % (rows * cols) });
  }
  cells.sort((a, b) => a.order - b.order);

  // Two bees fanning by the comb.
  const bees = [[cx - cw / 2 - u * 3, cy - ch * 0.15], [cx + cw / 2 + u * 1, cy + ch * 0.2]].map(([x, y], i) => {
    const g = kit.svg("g", {}, s);
    const bs = u * 2.2;
    kit.svg("ellipse", { cx: 0, cy: 0, rx: bs * 1.3, ry: bs * 0.95, fill: "#F2B705", stroke: ink, "stroke-width": u * 0.3 }, g);
    [-0.3, 0.3].forEach((k) => kit.svg("path", { d: `M${k * bs * 1.3} ${-bs * 0.9} q${bs * 0.3} ${bs * 0.9} 0 ${bs * 1.8}`, fill: "none", stroke: ink, "stroke-width": bs * 0.32, "stroke-linecap": "round" }, g));
    kit.svg("circle", { cx: bs * 0.75, cy: -bs * 0.2, r: bs * 0.14, fill: ink }, g);
    const wings = [-1, 1].map((k) => kit.svg("ellipse", { cx: -bs * 0.2 * k, cy: -bs * 0.9, rx: bs * 0.55, ry: bs * 0.85, fill: "#FFFFFF", stroke: ink, "stroke-width": u * 0.25 }, g));
    wings.forEach((w) => w.setAttribute("opacity", "0.88"));
    g.style.filter = `drop-shadow(${u * 0.3}px ${u * 0.8}px ${u * 0.6}px rgb(29 24 18 / .25))`;
    return { g, wings, x, y, flip: i === 0 ? 1 : -1 };
  });

  const caption = kit.text(root, props.caption, { x: safe.x + safe.width, y: safe.y, size: 4, font: "heading", colour: ink, align: "right",
    style: { background: "#FFFDF7", padding: `${u * 1.4}px ${u * 2.6}px`, borderRadius: `${u * 1.4}px`, boxShadow: `0 0 0 ${u * 0.6}px #FFFFFF, 0 ${u * 0.7}px ${u * 1.4}px rgb(29 24 18 / .22)` } });

  const pop = (t, at) => kit.spring(t - at, { stiffness: 170, damping: 11 });
  const fillStart = 1.0, fillEnd = Math.max(fillStart + 1.5, kit.at(1) - 0.2);
  const capStart = Math.max(fillEnd + 0.2, kit.at(1)), capEnd = Math.min(kit.duration - 0.4, capStart + 2);
  return (t) => {
    ground.set(pop(t, 0.05));
    hive.set(pop(t, 0.25));
    comb.set(pop(t, 0.55));
    const n = cells.length;
    cells.forEach((c, i) => {
      const f = kit.progress(t, fillStart + ((fillEnd - fillStart) * i) / n, 0.25);
      c.honey.style.opacity = String(f);
      c.honey.setAttribute("transform", "");
      const k = kit.progress(t, capStart + ((capEnd - capStart) * i) / n, 0.2);
      c.cap.style.opacity = String(k);
    });
    bees.forEach((b, i) => {
      const flap = Math.floor(t * 30 + i) % 2 ? 1 : 0.4;
      b.wings.forEach((w) => w.setAttribute("transform", `translate(0 ${-u * 0.8}) scale(1 ${flap}) translate(0 ${u * 0.8})`));
      b.g.setAttribute("transform", `translate(${b.x} ${b.y + Math.sin(t * 5 + i * 2) * u * 0.8}) scale(${b.flip} 1)`);
      b.g.style.opacity = String(kit.progress(t, 0.9 + i * 0.2, 0.3));
    });
    caption.style.opacity = String(kit.progress(t, 0.8, 0.3));
    caption.style.translate = `-100% ${(1 - kit.progress(t, 0.8, 0.3)) * u * 2}px`;
  };
});
