// The drawing's spec table is ruled and filled in row by row, then stamped.
Bezel.scene((root, kit) => {
  const { u, safe, colours, props } = kit;
  const s = kit.stage();
  const line = { fill: "none", stroke: colours.text, "stroke-width": Math.max(1.5, u * 0.28), "stroke-linecap": "round" };
  const rows = props.rows;
  const tw = Math.min(safe.width * 0.62, u * 110), rh = u * 9;
  const tx = safe.x + (safe.width - tw) / 2, ty = safe.y + (safe.height - rh * rows.length) / 2;
  const split = tx + tw * 0.4;
  const frame = kit.svg("path", { d: `M${tx} ${ty} h${tw} v${rh * rows.length} h${-tw} Z M${split} ${ty} v${rh * rows.length}`, ...line }, s);
  const rules = rows.slice(1).map((_, i) => kit.svg("path", { d: `M${tx} ${ty + rh * (i + 1)} h${tw}`, ...line, "stroke-width": Math.max(1, u * 0.15) }, s));
  const cells = rows.flatMap(([k, v], i) => [
    kit.text(root, k, { x: tx + u * 2.4, y: ty + rh * i + rh / 2 - u * 1.8, size: 3.2, font: "mono", colour: colours.muted }),
    kit.text(root, v, { x: split + u * 2.4, y: ty + rh * i + rh / 2 - u * 2.2, size: 4.2, font: "heading" }),
  ]);
  // A rubber stamp, slightly rotated, in the accent colour.
  const stamp = kit.el("div", { text: props.stamp, style: { position: "absolute", left: tx + tw - u * 6 + "px", top: ty + rh * rows.length - u * 4 + "px",
    translate: "-50% -50%", padding: `${u * 0.8}px ${u * 2.4}px`, border: `${u * 0.6}px solid ${colours.accent}`, borderRadius: u * 0.8 + "px",
    color: colours.accent, font: `700 ${u * 4.6}px ${kit.fonts.heading}`, letterSpacing: "0.12em" } }, root);

  const plan = kit.drawing();
  plan.line(frame, { at: 0.2, duration: 1.0, how: "linear" });
  rules.forEach((r, i) => plan.line(r, { at: 0.6 + i * 0.12, duration: 0.4, how: "linear" }));
  cells.forEach((c, i) => plan.write(c, { at: 1.2 + i * 0.22, duration: 0.35 }));
  const stampAt = Math.max(3.0, kit.at(1) - 0.1);

  return (t) => {
    plan.draw(t);
    const k = kit.progress(t, stampAt, 0.18, "in");
    stamp.style.opacity = String(k > 0 ? 0.92 : 0);
    stamp.style.transform = `rotate(-8deg) scale(${kit.lerp(1.8, 1, k)})`;
  };
});
