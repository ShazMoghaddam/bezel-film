// The close: the red circle grows from the corner until it fills half the frame, the call
// to action sets in black beside it, and the date and place sit on the grid's last row.
Bezel.scene((root, kit) => {
  const { u, colours, props } = kit;
  const s = kit.stage();
  const wide = kit.shape === "wide";
  const g = kit.grid(12, 8);
  const snap = (x) => 1 - Math.pow(1 - x, 5);

  const c = wide ? g.cell(0, 0, 6, 8) : g.cell(0, 0, 12, 4);
  const r = Math.min(c.width, c.height) / 2;
  const circle = kit.svg("circle", { cx: c.x + r, cy: c.y + c.height / 2, r: 0, fill: colours.accent }, s);
  const name = kit.text(root, props.name, { x: wide ? g.x(7) : g.x(0), y: wide ? g.y(0) : g.y(4) + u * 2, size: 3.4, weight: 700, colour: colours.accent });
  const lineCell = wide ? g.cell(7, 1, 5, 4) : g.cell(0, 5, 12, 2);
  const line = kit.text(root, props.line, { x: lineCell.x, y: lineCell.y + u * 2, size: wide ? 10 : 8.4, font: "heading", colour: colours.text, maxWidth: lineCell.width, style: { letterSpacing: "-0.05em", lineHeight: "0.92", textWrap: "balance" } });
  const meta = [props.date, props.place].map((txt, i) => {
    const cell = wide ? g.cell(7 + i * 3, 7, 3, 1) : g.cell(i * 6, 7, 6, 1);
    return kit.text(root, txt, { x: cell.x, y: cell.y + u, size: 3.2, weight: 600, colour: colours.text });
  });
  const rule = kit.svg("rect", { x: wide ? g.x(7) : g.x(0), y: g.y(7) - u * 0.5, width: 0, height: u * 0.3, fill: colours.text }, s);

  return (t) => {
    circle.setAttribute("r", String(r * kit.progress(t, 0, 0.6, snap)));
    name.style.clipPath = `inset(-30% ${(1 - kit.progress(t, 0.35, 0.3, snap)) * 105 - 5}% -30% -5%)`;
    const l = kit.progress(t, 0.45, 0.45, snap);
    line.style.clipPath = `inset(-30% -5% ${(1 - l) * 130 - 30}% -5%)`;
    line.style.translate = `0 ${(1 - l) * u * 4}px`;
    rule.setAttribute("width", String((wide ? g.cell(7, 0, 5).width : g.cell(0, 0, 12).width) * kit.progress(t, 0.7, 0.4, snap)));
    meta.forEach((m, i) => (m.style.clipPath = `inset(-30% ${(1 - kit.progress(t, 0.85 + i * 0.12, 0.3, snap)) * 105 - 5}% -30% -5%)`));
  };
});
