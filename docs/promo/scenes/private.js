// Private by design: a padlock draws itself in the light, and four promises tick in beside it.
Bezel.scene((root, kit) => {
  const { u, safe, colours, props } = kit;
  const s = kit.stage();
  const narrow = kit.shape !== "wide";
  const base = root.getBoundingClientRect();
  const lw = narrow ? u * 24 : u * 30;
  const lx = narrow ? safe.x + (safe.width - lw) / 2 : safe.x + safe.width * 0.08;
  const ly = narrow ? safe.y + u * 2 : safe.y + (safe.height - lw * 1.25) / 2;
  kit.glow(s, { cx: lx + lw / 2, cy: ly + lw * 0.8, r: lw * 1.1, colour: "#3DDC97", strength: 0.2 });
  const lock = kit.svg("g", {}, s);
  const shackle = kit.svg("path", { d: `M${lx + lw * 0.24} ${ly + lw * 0.55} V${ly + lw * 0.32} a${lw * 0.26} ${lw * 0.26} 0 0 1 ${lw * 0.52} 0 V${ly + lw * 0.55}`,
    fill: "none", stroke: "#F5F7FA", "stroke-width": lw * 0.07, "stroke-linecap": "round" }, lock);
  const len = shackle.getTotalLength();
  shackle.setAttribute("stroke-dasharray", len);
  const body = kit.svg("rect", { x: lx, y: ly + lw * 0.52, width: lw, height: lw * 0.72, rx: lw * 0.12, fill: "#3DDC97" }, lock);
  kit.svg("circle", { cx: lx + lw / 2, cy: ly + lw * 0.82, r: lw * 0.07, fill: colours.background }, lock);
  kit.svg("rect", { x: lx + lw * 0.47, y: ly + lw * 0.84, width: lw * 0.06, height: lw * 0.16, rx: lw * 0.03, fill: colours.background }, lock);
  const tx = narrow ? safe.x : safe.x + safe.width * 0.42;
  let y = narrow ? ly + lw * 1.24 + u * 5 : safe.y + safe.height * 0.12;
  const head = kit.text(root, props.heading, { x: tx, y, size: narrow ? 7 : 7.5, font: "heading", colour: colours.text, maxWidth: safe.x + safe.width - tx, style: { letterSpacing: "-0.04em" } });
  y = head.getBoundingClientRect().bottom - base.top + u * 3.5;
  const items = props.items.map((it, i) => {
    const el = kit.text(root, "", { x: tx, y, size: narrow ? 4 : 4.2, weight: 600, colour: colours.text, maxWidth: safe.x + safe.width - tx, fit: false });
    el.innerHTML = `<span style="color:#3DDC97">✓</span>&nbsp;&nbsp;${it.text}`;
    y = el.getBoundingClientRect().bottom - base.top + u * 2.2;
    return { el, at: Math.max(1 + i * 0.5, kit.at(it.line) + (it.offset || 0)) };
  });
  return (t) => {
    const p = kit.progress(t, 0.2, 1.1, "out");
    body.setAttribute("opacity", String(p));
    lock.setAttribute("transform", `translate(0 ${(1 - p) * u * 4})`);
    // The shackle draws, then clicks shut on the first promise.
    const draw = kit.progress(t, 0.5, 1, "out");
    shackle.setAttribute("stroke-dashoffset", String(len * (1 - draw)));
    const shut = kit.progress(t, items[0].at, 0.3, "in");
    shackle.setAttribute("transform", `translate(0 ${(1 - shut) * -lw * 0.1})`);
    const h = kit.progress(t, 0.3, 0.9, "out");
    head.style.opacity = String(h);
    for (const it of items) {
      const k = kit.progress(t, it.at, 0.7, "out");
      it.el.style.opacity = String(k);
      it.el.style.transform = `translateX(${(1 - k) * u * 2}px)`;
    }
  };
});
