// A title written in by a marker pen, then underlined.
Bezel.scene((root, kit) => {
  const { u, safe, colours, fonts } = kit;
  // On a phone or in a feed the title wraps onto two lines instead of running off the side.
  const narrow = kit.shape !== "wide";
  const block = kit.el("div", { style: { position: "absolute", left: safe.x + "px", top: safe.y + "px", width: safe.width + "px", height: safe.height + "px",
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: u * 3 + "px", textAlign: "center" } }, root);
  const title = kit.el("h1", { text: kit.props.title, style: { font: `700 ${u * (narrow ? 10 : 11)}px/1.05 ${fonts.heading}`, color: colours.text, letterSpacing: "-0.02em",
    ...(narrow ? { maxWidth: safe.width + "px", textWrap: "balance" } : { whiteSpace: "nowrap" }) } }, block);
  const line = kit.svg("svg", { viewBox: "0 0 400 24", width: Math.min(u * 42, safe.width * 0.8), height: u * 2.6, style: "overflow:visible" }, block);
  const stroke = kit.svg("path", { d: "M4 16 C 80 6, 170 22, 260 12 S 370 8, 396 14", fill: "none", stroke: colours.accent, "stroke-width": 7, "stroke-linecap": "round" }, line);
  const subtitle = kit.el("p", { text: kit.props.subtitle, style: { font: `500 ${u * 3.6}px ${fonts.body}`, color: colours.muted, maxWidth: safe.width + "px", textWrap: "balance" } }, block);

  const plan = kit.drawing({ pen: true, penColour: colours.accent });
  plan.write(title, { at: 0.3, duration: 1.4 });
  plan.line(stroke, { at: 1.85, duration: 0.55 });

  return (t) => {
    plan.draw(t);
    subtitle.style.opacity = kit.progress(t, 2.4, 0.6);
    subtitle.style.transform = `translateY(${(1 - kit.progress(t, 2.4, 0.8)) * u * 2}px)`;
  };
});
