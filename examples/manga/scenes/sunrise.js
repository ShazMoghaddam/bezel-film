// Three panels in a row, each a little later in the morning: the screentone night
// thins as the lamp grows brighter, then the last panel opens with the sleeper up.
Bezel.scene((root, kit) => {
  const { u, safe, colours, props } = kit;
  const s = kit.stage();
  const ink = colours.text, paper = "#FFFFFF";
  const tall = kit.shape === "tall";
  const rects = kit.panels(tall ? [[0, 0, 1, 0.3], [0, 0.3, 1, 0.3], [0, 0.6, 1, 0.4]] : [[0, 0.08, 0.32, 0.84], [0.32, 0.08, 0.32, 0.84], [0.64, 0, 0.36, 1]]);
  const panels = rects.map((r, i) => {
    const g = kit.svg("g", {}, s);
    const id = "sun-" + kit.index + "-" + i;
    kit.svg("rect", { x: r.x, y: r.y, width: r.width, height: r.height }, kit.svg("clipPath", { id }, kit.svg("defs", {}, s)));
    const inner = kit.svg("g", { "clip-path": `url(#${id})` }, g);
    kit.svg("rect", { x: r.x, y: r.y, width: r.width, height: r.height, fill: paper }, inner);
    // Night as screentone: dense in the first panel, lighter in the next, gone by the last.
    const night = [0.75, 0.4, 0][i];
    if (night) kit.svg("rect", { x: r.x, y: r.y, width: r.width, height: r.height, fill: kit.tone(s, { kind: "dots", size: u * 0.9, weight: night }) }, inner);
    // The lamp, brighter each time: more glow rings.
    const lx = r.x + r.width * 0.5, ly = r.y + r.height * (i === 2 ? 0.28 : 0.42), lr = Math.min(r.width, r.height) * 0.12;
    for (let k = 0; k <= i; k++) kit.svg("circle", { cx: lx, cy: ly, r: lr * (1.5 + k * 0.45), fill: "none", stroke: ink, "stroke-width": u * 0.25, "stroke-dasharray": `${u * 1.2} ${u}` }, inner);
    kit.svg("circle", { cx: lx, cy: ly, r: lr, fill: paper, stroke: ink, "stroke-width": u * 0.5 }, inner);
    if (i < 2) kit.svg("path", { d: `M${r.x} ${r.y + r.height * 0.78} q${r.width * 0.5} ${-u * 5} ${r.width} 0 V${r.y + r.height} H${r.x} Z`, fill: paper, stroke: ink, "stroke-width": u * 0.5 }, inner);
    kit.svg("rect", { x: r.x, y: r.y, width: r.width, height: r.height, fill: "none", stroke: ink, "stroke-width": u * 0.7 }, g);
    const time = kit.text(root, props.times[i], { x: r.x + u * 1.6, y: r.y + u * 1.4, size: 4, font: "heading", colour: ink, style: { background: paper, padding: `${u * 0.3}px ${u * 1}px`, border: `${u * 0.35}px solid ${ink}` } });
    return { g, time, inner, r, i };
  });
  // The last panel: a figure stretching, up and awake, with motion lines around the arms.
  const last = panels[2].r;
  const fig = kit.figure(panels[2].inner, { x: last.x + last.width * 0.5, y: last.y + last.height * 0.96, height: last.height * 0.5, width: u * 0.6, face: "happy" }).pose("cheer");
  const up = kit.text(root, props.last, { x: last.x + last.width * 0.8, y: last.y + last.height * 0.42, size: 8, font: "heading", align: "center", colour: ink,
    style: { WebkitTextStroke: `${u * 0.8}px #FFFFFF`, paintOrder: "stroke fill", rotate: "-6deg" } });
  const at = [0.3, Math.max(1.4, kit.at(0) + 1.6), Math.max(2.6, kit.at(1) + 0.2)];

  return (t) => {
    panels.forEach((p) => {
      const k = kit.progress(t, at[p.i], 0.16, "out");
      const cx = p.r.x + p.r.width / 2, cy = p.r.y + p.r.height / 2;
      p.g.style.opacity = String(k > 0 ? 1 : 0);
      p.g.setAttribute("transform", `translate(${cx} ${cy}) scale(${1.08 - 0.08 * k}) translate(${-cx} ${-cy})`);
      p.time.style.opacity = String(kit.progress(t, at[p.i] + 0.15, 0.1));
    });
    const stretch = kit.spring(t - at[2] - 0.3, { stiffness: 140, damping: 10 });
    fig.pose("stand", "cheer", stretch);
    const k = kit.spring(t - at[2] - 0.6, { stiffness: 300, damping: 12 });
    up.style.opacity = String(kit.clamp(k * 3));
    up.style.scale = String(Math.max(0, k));
  };
});
