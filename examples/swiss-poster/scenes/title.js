// The poster sets itself on its grid: the grid flashes up, a red circle and a black bar
// snap into their cells, the name lands huge along the bottom, and the small details
// drop into their columns. Then the grid fades and the poster holds.
Bezel.scene((root, kit) => {
  const { u, colours, props } = kit;
  const s = kit.stage();
  const wide = kit.shape === "wide";
  const g = kit.grid(12, 8);
  const snap = (x) => 1 - Math.pow(1 - x, 5);
  const ink = colours.text, red = colours.accent;

  const lines = g.lines(s, { colour: red, opacity: 0.35 });
  // The signal: one red circle, the poster's only colour.
  const c = g.cell(wide ? 7 : 4, 0, wide ? 5 : 8, wide ? 5 : 4);
  const r = Math.min(c.width, c.height) / 2;
  const circle = kit.svg("circle", { cx: c.x + c.width - r, cy: c.y + r, r, fill: red }, s);
  // A black bar across the grid, cut cleanly at a column edge.
  const bar = g.cell(0, wide ? 4 : 4, wide ? 9 : 12, 1);
  const barRect = kit.svg("rect", { x: bar.x, y: bar.y + bar.height * 0.35, width: bar.width, height: bar.height * 0.3, fill: ink }, s);

  // Details in the first columns, small and flush left.
  const info = [props.line, props.date, props.place].map((txt, i) => {
    const cell = wide ? g.cell(i * 3, 0, 3, 1) : g.cell(0, i, 4, 1);
    return kit.text(root, txt, { x: cell.x, y: cell.y, size: 3.2, weight: 600, colour: ink, maxWidth: cell.width });
  });
  const name = g.cell(0, 5, 12, 3);
  const title = kit.text(root, props.name, { x: name.x, y: name.y - u * 2, size: wide ? 30 : 22, font: "heading", colour: ink, style: { letterSpacing: "-0.06em", lineHeight: "0.85" } });

  return (t) => {
    lines.style.opacity = String(0.35 * kit.progress(t, 0, 0.15) * (1 - kit.progress(t, 1.6, 0.4)));
    const k = kit.progress(t, 0.25, 0.5, snap);
    circle.setAttribute("r", String(r * k));
    const b = kit.progress(t, 0.5, 0.4, snap);
    barRect.setAttribute("width", String(bar.width * b));
    const n = kit.progress(t, 0.75, 0.45, snap);
    title.style.clipPath = `inset(${(1 - n) * 130 - 30}% -5% -30% -5%)`;
    title.style.translate = `0 ${(1 - n) * u * 6}px`;
    info.forEach((el, i) => {
      const p = kit.progress(t, 1.1 + i * 0.12, 0.3, snap);
      el.style.opacity = p > 0 ? "1" : "0";
      el.style.clipPath = `inset(-30% ${(1 - p) * 105 - 5}% -30% -5%)`;
    });
  };
});
