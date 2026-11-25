// The programme as a table on the grid: a heading, then one row per day. Each row's rule
// draws across, a red square marks it, and its day, theme and note snap into their columns.
Bezel.scene((root, kit) => {
  const { u, colours, props } = kit;
  const s = kit.stage();
  const tall = kit.shape === "tall";
  const g = kit.grid(12, 8);
  const snap = (x) => 1 - Math.pow(1 - x, 5);

  const head = g.cell(0, 0, 12, 1);
  const heading = kit.text(root, props.heading, { x: head.x, y: head.y, size: 3, weight: 700, colour: colours.accent, style: { letterSpacing: "0.02em" } });
  const rowH = (g.rowH * 7 + g.gutter * 6) / props.days.length;
  const rows = props.days.map((d, i) => {
    const y = g.y(1) + i * rowH;
    const rule = kit.svg("rect", { x: g.x(0), y, width: 0, height: u * 0.3, fill: colours.text }, s);
    const square = kit.svg("rect", { x: g.x(0), y: y + u * 2.4, width: u * 3, height: u * 3, fill: colours.accent }, s);
    const day = kit.text(root, d.day, { x: g.x(0) + u * 5, y: y + u * 2, size: tall ? 3.6 : 4, weight: 600, colour: colours.text });
    const theme = kit.text(root, d.theme, { x: tall ? g.x(0) + u * 5 : g.x(3), y: tall ? y + u * 6 : y + u * 0.6, size: tall ? 9 : 15, font: "heading", colour: colours.text, style: { letterSpacing: "-0.05em", lineHeight: "0.9" } });
    const note = kit.text(root, d.note, { x: tall ? g.x(0) + u * 5 : g.x(8), y: tall ? y + u * 16.5 : y + u * 2, size: tall ? 2.8 : 3.2, colour: colours.muted, maxWidth: tall ? g.cell(0, 0, 12).width - u * 5 : g.cell(8, 0, 4).width });
    return { rule, square, day, theme, note, at: Math.max(0.2 + i * 0.7, (kit.at(i) || 0) - 0.05) };
  });

  return (t) => {
    heading.style.clipPath = `inset(-30% ${(1 - kit.progress(t, 0, 0.3, snap)) * 105 - 5}% -30% -5%)`;
    rows.forEach((r) => {
      const p = kit.progress(t, r.at, 0.4, snap);
      r.rule.setAttribute("width", String((g.x(11) + g.colW - g.x(0)) * p));
      const q = kit.progress(t, r.at + 0.1, 0.25, snap);
      r.square.setAttribute("transform", `scale(1 ${q})`);
      r.square.style.transformOrigin = "center";
      r.square.style.transformBox = "fill-box";
      [r.day, r.theme, r.note].forEach((el, k) => {
        const e = kit.progress(t, r.at + 0.12 + k * 0.08, 0.35, snap);
        el.style.clipPath = `inset(-30% -5% ${(1 - e) * 130 - 30}% -5%)`;
        el.style.translate = `0 ${(1 - e) * -u * 1.5}px`;
      });
    });
  };
});
