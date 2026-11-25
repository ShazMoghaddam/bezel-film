// The takeaway, written large over a little horizon: the sea's curve and a setting sun.
Bezel.scene((root, kit) => {
  const { u, safe, colours } = kit;
  const [yellow, , blue, , orange] = colours.palette;
  const narrow = kit.shape !== "wide";
  const board = kit.el("div", { style: { position: "absolute", inset: "0", filter: "url(#chalk)" } }, root);
  const s = kit.stage(board);
  const cx = safe.x + safe.width / 2;
  const size = narrow ? 8 : 10;
  const lineH = size * u * 1.35;
  const top = safe.y + safe.height * (narrow ? 0.2 : 0.18);
  const lines = kit.props.lines.map((words, i) => kit.text(board, words, { x: cx, y: top + i * lineH, size, font: "heading", align: "center", colour: i ? yellow : colours.text }));

  const w = Math.min(safe.width * 0.7, u * 70);
  const seaY = top + lineH * 2 + safe.height * 0.2;
  const sun = kit.svg("path", { d: "M" + (cx - u * 7) + " " + seaY + " A " + u * 7 + " " + u * 7 + " 0 0 1 " + (cx + u * 7) + " " + seaY, fill: "none", stroke: orange, "stroke-width": u * 0.45, "stroke-linecap": "round" }, s);
  const rays = kit.svg("path", { d: [-60, -30, 0, 30, 60].map((deg) => { const a = (deg - 90) * Math.PI / 180; return "M" + (cx + Math.cos(a) * u * 9) + " " + (seaY + Math.sin(a) * u * 9) + " L" + (cx + Math.cos(a) * u * 11.5) + " " + (seaY + Math.sin(a) * u * 11.5); }).join(" "),
    fill: "none", stroke: orange, "stroke-width": u * 0.4, "stroke-linecap": "round" }, s);
  const sea = kit.svg("path", { d: "M" + (cx - w / 2) + " " + (seaY + u * 0.6) + " Q " + cx + " " + (seaY - u * 2.4) + " " + (cx + w / 2) + " " + (seaY + u * 0.6), fill: "none", stroke: blue, "stroke-width": u * 0.45, "stroke-linecap": "round" }, s);
  const waves = kit.svg("path", { d: [0, 1, 2].map((i) => { const y = seaY + u * (2.6 + i * 2.2), half = w * (0.3 - i * 0.07); return "M" + (cx - half) + " " + y + " q " + half / 4 + " " + -u + " " + half / 2 + " 0 t " + half / 2 + " 0 t " + half / 2 + " 0 t " + half / 2 + " 0"; }).join(" "),
    fill: "none", stroke: blue, "stroke-width": u * 0.3, "stroke-linecap": "round", opacity: 0.8 }, s);

  const plan = kit.drawing({ pen: "chalk", dust: true });
  let t = plan.sequence(0.3, lines.map((node) => ({ node, duration: 1 })));
  plan.sequence(t + 0.1, [{ node: sea, duration: 0.6 }, { node: sun, duration: 0.6 }, { node: rays, duration: 0.4 }, { node: waves, duration: 0.6 }]);
  return (time) => plan.draw(time);
});
