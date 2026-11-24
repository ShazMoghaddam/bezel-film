// The figure turns its back on the box and walks to a glowing phone. Little sparkles
// pop around the phone: the easy win.
Bezel.scene((root, kit) => {
  const { u, safe, colours, props } = kit;
  const s = kit.stage();
  const ground = safe.y + safe.height - u * 2;
  const figH = Math.min(safe.height * 0.42, u * 32);
  const startX = safe.x + safe.width * 0.36;
  const person = kit.figure(s, { x: startX, y: ground, height: figH, width: u * 0.65, face: "happy" });

  // The box, smaller now, at the edge: still there.
  const bw = u * 22, bh = safe.height * 0.5;
  kit.svg("path", { d: kit.rough.rect(safe.x + u * 6, ground - bh, bw, bh, { seed: 4 }), fill: `color-mix(in srgb, ${colours.palette[0]} 10%, white)`, stroke: colours.muted, "stroke-width": u * 0.45, opacity: 0.8 }, s);

  const phoneSize = u * 20;
  const px = safe.x + safe.width * 0.74, py = ground - figH * 0.95;
  const endX = px - u * 9;
  const glow = kit.svg("circle", { cx: px + phoneSize / 2, cy: py + phoneSize / 2, r: phoneSize * 0.75, fill: `color-mix(in srgb, ${colours.palette[1]} 18%, transparent)` }, s);
  const phone = kit.icon("device-mobile", { parent: root, x: px, y: py, size: phoneSize, colour: colours.text, width: u * 0.6 });
  const hearts = [[-0.2, -0.1], [1.05, 0.05], [0.95, -0.35], [-0.1, 0.75]].map(([dx, dy], i) =>
    kit.icon(i % 2 ? "heart" : "sparkles", { parent: root, x: px + dx * phoneSize, y: py + dy * phoneSize, size: u * 6, colour: i % 2 ? colours.palette[1] : colours.accent, width: u * 0.45 }));
  const label = kit.text(root, props.label, { x: px + phoneSize / 2, y: py + phoneSize + u * 2, size: 6, font: "heading", align: "center", colour: colours.palette[1] });

  const plan = kit.drawing({ pen: true, penColour: colours.accent });
  plan.sequence(0.2, phone.paths.map((node) => ({ node, duration: 0.35 })));
  plan.sequence(Math.max(2.4, kit.at(0) + 2.2), [{ node: label, duration: 0.6 }]);
  const walkFrom = 0.9, walkFor = 1.6;

  return (t) => {
    const p = kit.progress(t, walkFrom, walkFor, "inOut");
    const walking = t > walkFrom && t < walkFrom + walkFor;
    if (walking) person.walk(t - walkFrom, { stepsPerSecond: 2.2 });
    else if (t >= walkFrom + walkFor) person.pose("walkA", "point", kit.progress(t, walkFrom + walkFor, 0.4, "outBack"));
    else person.pose("stand");
    person.move(kit.lerp(startX, endX, p), ground - (walking ? Math.abs(Math.sin((t - walkFrom) * Math.PI * 2.2)) * u * 0.8 : 0));
    glow.style.opacity = String(kit.progress(t, 1.4, 0.6));
    hearts.forEach((h, i) => {
      const k = kit.spring(t - 2.2 - i * 0.18, { stiffness: 220, damping: 11 });
      h.svg.style.transformOrigin = "center";
      h.svg.style.transform = `scale(${Math.max(0, k)}) translateY(${-Math.max(0, t - 2.2 - i * 0.18) * u * 1.2}px)`;
    });
    plan.draw(t);
  };
});
