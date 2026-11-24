// A stick figure cheers as the lesson is written and underlined twice.
Bezel.scene((root, kit) => {
  const { u, safe, colours, props } = kit;
  const s = kit.stage();
  const tall = kit.shape === "tall";
  const figH = Math.min(safe.height * (tall ? 0.38 : 0.62), u * 42);
  const fx = tall ? safe.x + safe.width / 2 : safe.x + safe.width * 0.2;
  const fy = tall ? safe.y + safe.height * 0.92 : safe.y + safe.height * 0.86;
  const person = kit.figure(s, { x: fx, y: fy, height: figH, width: u * 0.6 }).pose("stand");

  const tx = tall ? safe.x + safe.width / 2 : safe.x + safe.width * 0.62;
  const ty = tall ? safe.y + safe.height * 0.08 : safe.y + safe.height * 0.3;
  const align = "center";
  const title = kit.text(root, props.title, { x: tx, y: ty, size: tall ? 13 : 15, font: "heading", align });
  const r = title.getBoundingClientRect();
  const red = kit.svg("g", { fill: "none", stroke: colours.accent, "stroke-width": u * 0.6, "stroke-linecap": "round" }, s);
  const u1 = kit.svg("path", { d: kit.rough.underline(r.left, r.bottom + u * 0.5, r.width, { seed: 2 }) }, red);
  const u2 = kit.svg("path", { d: kit.rough.underline(r.left + r.width * 0.06, r.bottom + u * 2.3, r.width * 0.9, { seed: 5 }) }, red);
  const line = kit.text(root, props.line, { x: tx, y: r.bottom + u * 6, size: 5.6, align, colour: colours.muted, weight: 400 });

  const plan = kit.drawing({ pen: true, penColour: colours.accent });
  const t = plan.sequence(0.2, [{ node: title, duration: 0.9 }, { node: u1, duration: 0.35 }, { node: u2, duration: 0.3 }]);
  plan.sequence(Math.max(t + 0.2, kit.at(1)), [{ node: line, duration: 1.2 }]);
  const cheerAt = 1.1;

  return (time) => {
    plan.draw(time);
    const p = kit.spring(time - cheerAt, { stiffness: 120, damping: 11 });
    person.pose("stand", "cheer", p);
    person.move(fx, fy - Math.max(0, Math.sin(Math.min(1, Math.max(0, (time - cheerAt) / 0.5)) * Math.PI)) * u * 3);
  };
});
