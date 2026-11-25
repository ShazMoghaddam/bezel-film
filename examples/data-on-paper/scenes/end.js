// One small drop, drawn in pencil and shaded, with the takeaway written beside it and
// the source noted at the foot of the page.
Bezel.scene((root, kit) => {
  const { u, safe, colours, props } = kit;
  const s = kit.stage();
  const pencil = { "stroke-linecap": "round", "stroke-linejoin": "round", filter: "url(#pencil)" };
  const h = Math.min(safe.height * 0.42, u * 30), w = h * 0.68;
  const cx = safe.x + safe.width * (kit.shape === "wide" ? 0.3 : 0.5), top = safe.y + safe.height * (kit.shape === "wide" ? 0.22 : 0.06);
  const d = `M${cx} ${top} C${cx + w * 0.15} ${top + h * 0.3} ${cx + w * 0.5} ${top + h * 0.45} ${cx + w * 0.5} ${top + h * 0.7} A${w * 0.5} ${h * 0.3} 0 0 1 ${cx - w * 0.5} ${top + h * 0.7} C${cx - w * 0.5} ${top + h * 0.45} ${cx - w * 0.15} ${top + h * 0.3} ${cx} ${top} Z`;
  const fill = kit.svg("path", { d, fill: kit.tone(s, { kind: "lines", colour: colours.palette[0], size: u * 0.9, weight: 0.5, angle: 40 }), ...pencil }, s);
  const outline = kit.svg("path", { d, fill: "none", stroke: colours.palette[0], "stroke-width": u * 0.4, ...pencil }, s);
  const shine = kit.svg("path", { d: `M${cx - w * 0.25} ${top + h * 0.62} q${-w * 0.02} ${h * 0.12} ${w * 0.08} ${h * 0.2}`, fill: "none", stroke: "#FFFFFF", "stroke-width": u * 0.9, "stroke-linecap": "round" }, s);
  const tx = kit.shape === "wide" ? cx + w + u * 8 : safe.x + safe.width / 2;
  const align = kit.shape === "wide" ? "left" : "center";
  const title = kit.text(root, props.title, { x: tx, y: kit.shape === "wide" ? top + h * 0.35 : top + h + u * 6, size: 9, font: "heading", align, maxWidth: kit.shape === "wide" ? undefined : safe.width, style: { textWrap: "balance" } });
  const source = kit.text(root, props.source, { x: safe.x + safe.width / 2, y: safe.y + safe.height - u * 4, size: 2.6, font: "mono", align: "center", colour: colours.muted });

  const plan = kit.drawing();
  plan.line(outline, { at: 0.2, duration: 1.0, how: "inOut" });
  plan.write(title, { at: Math.max(1.6, kit.at(1)), duration: 1.0 });
  plan.write(source, { at: Math.max(2.2, kit.at(1) + 0.6), duration: 0.7 });

  return (t) => {
    fill.style.opacity = String(kit.progress(t, 1.0, 0.8));
    shine.style.opacity = String(kit.progress(t, 1.6, 0.4));
    plan.draw(t);
  };
});
