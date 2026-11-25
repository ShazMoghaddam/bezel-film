// The big task breaks into five small boxes. The figure points at the first one, and
// it gets a tick.
Bezel.scene((root, kit) => {
  const { u, safe, colours, props } = kit;
  const s = kit.stage();
  const title = kit.text(root, props.title, { x: safe.x + safe.width / 2, y: safe.y + u * 1, size: 8.5, font: "heading", align: "center" });
  const ground = safe.y + safe.height - u * 2;
  const figH = Math.min(safe.height * 0.4, u * 30);
  const fx = safe.x + u * 14;
  const person = kit.figure(s, { x: fx, y: ground, height: figH, width: u * 0.65, face: "happy" }).pose("stand");

  const n = props.steps.length;
  const left = fx + u * 14, right = safe.x + safe.width - u * 4;
  const gap = u * 3;
  const bw = (right - left - gap * (n - 1)) / n;
  const bh = Math.min(bw * 0.9, safe.height * 0.32);
  const by = ground - bh - u * 6;
  const boxes = props.steps.map((step, i) => {
    const x = left + i * (bw + gap);
    const g = kit.svg("g", {}, s);
    kit.svg("rect", { x, y: by, width: bw, height: bh, fill: i === 0 ? `color-mix(in srgb, ${colours.palette[2]} 16%, white)` : "#FFFFFF" }, g);
    kit.svg("path", { d: kit.rough.rect(x, by, bw, bh, { seed: 20 + i }), fill: "none", stroke: colours.text, "stroke-width": u * 0.45, "stroke-linecap": "round" }, g);
    // On narrow frames every other label sits above its box, so neighbours do not touch.
    const narrow = kit.shape !== "wide";
    const label = kit.text(root, step, { x: x + bw / 2, y: narrow && i % 2 ? by - u * 5.6 : by + bh + u * 1.5, size: narrow ? 3.6 : 4, align: "center" });
    return { g, label, x };
  });
  const tickX = left + bw / 2, tickY = by + bh / 2;
  const tick = kit.svg("path", { d: `M${tickX - u * 4} ${tickY} L${tickX - u * 1} ${tickY + u * 3.4} L${tickX + u * 5} ${tickY - u * 4}`, fill: "none", stroke: colours.palette[2], "stroke-width": u * 0.9, "stroke-linecap": "round", "stroke-linejoin": "round" }, s);

  const plan = kit.drawing({ pen: true, penColour: colours.accent });
  plan.sequence(0.15, [{ node: title, duration: 1.1 }]);
  const splitAt = 1.2;
  const tickAt = Math.max(3.1, kit.at(0) + 3);
  plan.line(tick, { at: tickAt, duration: 0.4 });

  return (t) => {
    // The boxes fan out from one spot, each a beat after the last.
    boxes.forEach((b, i) => {
      const k = kit.spring(t - splitAt - i * 0.12, { stiffness: 210, damping: 15 });
      const fromX = left + (n - 1) * (bw + gap) / 2 - b.x;
      b.g.style.transform = `translate(${(1 - k) * fromX}px, ${(1 - k) * -u * 4}px)`;
      b.g.style.opacity = String(kit.clamp(k * 3));
      b.label.style.opacity = String(kit.progress(t, splitAt + 0.5 + i * 0.12, 0.3));
    });
    person.pose("stand", "point", kit.progress(t, tickAt - 0.7, 0.45, "outBack"));
    plan.draw(t);
  };
});
