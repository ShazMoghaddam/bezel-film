// Three columns, three numbers. A rule drops down each column, then its number counts up
// to its value and its label sets beneath. The middle number is the red one.
Bezel.scene((root, kit) => {
  const { u, colours, props } = kit;
  const s = kit.stage();
  const tall = kit.shape === "tall";
  const g = kit.grid(12, 8);
  const snap = (x) => 1 - Math.pow(1 - x, 5);
  const n = props.items.length;
  const span = 12 / n;

  const cols = props.items.map((item, i) => {
    const cell = tall ? g.cell(0, (i * 8) / n, 12, 8 / n) : g.cell(i * span, 0, span, 8);
    const red = i === 1;
    const rule = kit.svg("rect", { x: cell.x, y: cell.y, width: u * 0.35, height: 0, fill: colours.text }, s);
    const number = kit.text(root, "0", { x: cell.x + u * 2, y: tall ? cell.y : cell.y + cell.height * 0.32, size: tall ? 16 : 26, font: "heading", colour: red ? colours.accent : colours.text, style: { letterSpacing: "-0.06em", lineHeight: "0.85", fontVariantNumeric: "tabular-nums" } });
    const label = kit.text(root, item.label, { x: cell.x + u * 2.4, y: tall ? cell.y + u * 15 : cell.y + cell.height * 0.32 + u * 24, size: 4, weight: 600, colour: colours.text });
    return { item, cell, rule, number, label, at: 0.2 + i * Math.max(0.6, (kit.at(i) || i) - (kit.at(0) || 0)) };
  });
  // Time each column with its own sentence, if the narration has one per number.
  cols.forEach((c, i) => (c.at = Math.max(0.15 + i * 0.6, (kit.at(i) || 0) - 0.1)));

  return (t) => {
    cols.forEach((c) => {
      const drop = kit.progress(t, c.at, 0.35, snap);
      c.rule.setAttribute("height", String(c.cell.height * drop));
      // Count up in whole numbers, quickly, then hold.
      const k = kit.progress(t, c.at + 0.1, 0.5, snap);
      c.number.textContent = String(Math.round(c.item.value * k));
      c.number.style.opacity = t >= c.at + 0.1 ? "1" : "0";
      const l = kit.progress(t, c.at + 0.35, 0.3, snap);
      c.label.style.clipPath = `inset(-30% ${(1 - l) * 105 - 5}% -30% -5%)`;
    });
  };
});
