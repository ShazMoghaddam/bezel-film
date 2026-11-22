// A big number springs in, a ring is drawn round it, and the promise is written below.
Bezel.scene((root, kit) => {
  const { u, safe, colours, fonts } = kit;
  const cx = safe.x + safe.width / 2;
  const cy = safe.y + safe.height * 0.42;
  const value = kit.el("div", { text: kit.props.value, style: { position: "absolute", left: cx + "px", top: cy + "px", translate: "-50% -50%",
    font: `700 ${u * 30}px ${fonts.heading}`, color: colours.palette[2], letterSpacing: "-0.04em", lineHeight: "1" } }, root);
  const ring = kit.svg("svg", { viewBox: "0 0 200 140", width: u * 48, height: u * 34, style: `position:absolute;left:${cx - u * 24}px;top:${cy - u * 17}px;overflow:visible` }, root);
  const loop = kit.svg("path", { d: "M150 22 C 110 0, 30 6, 14 52 C 0 100, 70 134, 128 124 C 186 114, 200 60, 168 32 C 154 20, 136 16, 120 18", fill: "none",
    stroke: colours.accent, "stroke-width": 4.5, "stroke-linecap": "round" }, ring);
  const unit = kit.el("div", { text: kit.props.unit, style: { position: "absolute", left: cx + "px", top: cy + u * 17.5 + "px", translate: "-50% 0",
    font: `700 ${u * 6}px ${fonts.heading}`, color: colours.text } }, root);
  const note = kit.el("div", { text: kit.props.note, style: { position: "absolute", left: cx + "px", top: cy + u * 26.5 + "px", translate: "-50% 0",
    font: `500 ${u * 3.6}px ${fonts.body}`, color: colours.muted, whiteSpace: "nowrap" } }, root);

  const plan = kit.drawing({ pen: true, penColour: colours.accent });
  plan.line(loop, { at: 1.0, duration: 0.8 });
  plan.write(unit, { at: 1.95, duration: 0.7 });
  plan.write(note, { at: 2.8, duration: 1.1 });

  return (t) => {
    const s = kit.spring(t - 0.35, { stiffness: 190, damping: 13 });
    value.style.opacity = Math.min(1, Math.max(0, s * 1.6));
    value.style.scale = String(0.5 + 0.5 * s);
    plan.draw(t);
  };
});
