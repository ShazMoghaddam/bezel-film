// The soundtrack: four panels, one per layer of sound, each lighting up as it is named.
// Voice is a moving waveform, music an equaliser, captions a caption bar, effects a burst of dots.
Bezel.scene((root, kit) => {
  const { u, safe, colours, props } = kit;
  const s = kit.stage();
  const narrow = kit.shape !== "wide";
  const head = kit.text(root, props.heading, { x: safe.x + safe.width / 2, y: safe.y, size: narrow ? 6.4 : 6, font: "heading", align: "center", colour: colours.text, maxWidth: safe.width,
    style: { letterSpacing: "-0.04em" } });
  const base = root.getBoundingClientRect();
  const top = head.getBoundingClientRect().bottom - base.top + u * 5;
  const cols = narrow ? 2 : 4;
  const gap = u * 2.5;
  const pw = (safe.width - gap * (cols - 1)) / cols;
  const ph = Math.min(narrow ? (safe.y + safe.height - top - gap) / 2 : (safe.y + safe.height - top) * 0.8, pw * (narrow ? 1.05 : 1.15));
  const tints = ["#7C8CFF", "#FF6B8B", "#3DDC97", "#FFB84D"];
  const panels = props.items.map((item, i) => {
    const x = safe.x + (i % cols) * (pw + gap), y = top + Math.floor(i / cols) * (ph + gap);
    const g = kit.svg("g", { opacity: 0 }, s);
    kit.svg("rect", { x, y, width: pw, height: ph, rx: u * 2, fill: "rgb(255 255 255 / .045)", stroke: "rgb(255 255 255 / .1)", "stroke-width": 1 }, g);
    const art = kit.svg("g", {}, g);
    const ax = x + pw * 0.12, aw = pw * 0.76, ay = y + ph * 0.18, ah = ph * 0.42;
    const tint = tints[i];
    const parts = [];
    if (i === 0) { // voice: a waveform of thin bars
      for (let k = 0; k < 24; k++) parts.push(kit.svg("rect", { x: ax + (k / 24) * aw, width: aw / 24 * 0.5, rx: aw / 96, fill: tint }, art));
    } else if (i === 1) { // music: an equaliser
      for (let k = 0; k < 8; k++) parts.push(kit.svg("rect", { x: ax + (k / 8) * aw, width: aw / 8 * 0.7, rx: u * 0.3, fill: tint }, art));
    } else if (i === 2) { // captions: a bar with words
      kit.svg("rect", { x: ax, y: ay + ah * 0.35, width: aw, height: ah * 0.3, rx: u * 0.8, fill: "rgb(0 0 0 / .6)", stroke: tint, "stroke-width": u * 0.2 }, art);
      for (let k = 0; k < 4; k++) parts.push(kit.svg("rect", { x: ax + aw * (0.08 + k * 0.22), y: ay + ah * 0.46, width: aw * 0.18, height: ah * 0.08, rx: u * 0.3, fill: "#F5F7FA" }, art));
    } else { // effects: a burst of dots
      for (let k = 0; k < 10; k++) parts.push(kit.svg("circle", { cx: ax + aw / 2, cy: ay + ah / 2, r: u * 0.7, fill: tint }, art));
    }
    const name = kit.text(root, item.name, { x: x + pw / 2, y: y + ph * 0.66, size: narrow ? 4 : 3.6, weight: 700, align: "center", colour: colours.text, maxWidth: pw * 0.9 });
    const note = kit.text(root, item.note, { x: x + pw / 2, y: y + ph * 0.66 + u * 5.5, size: narrow ? 2.9 : 2.7, align: "center", colour: colours.muted, maxWidth: pw * 0.86, style: { textWrap: "balance" } });
    return { g, i, parts, name, note, ax, aw, ay, ah, at: Math.max(0.8 + i * 0.6, kit.at(i + 1)) };
  });
  return (t) => {
    const k = kit.progress(t, 0.1, 0.9, "out");
    head.style.opacity = String(k);
    for (const p of panels) {
      const on = kit.progress(t, p.at, 0.9, "out");
      p.g.setAttribute("opacity", String(0.25 + on * 0.75));
      p.g.setAttribute("transform", `translate(0 ${(1 - kit.progress(t, 0.3 + p.i * 0.12, 0.9, "out")) * u * 3})`);
      p.name.style.opacity = String(0.3 + on * 0.7);
      p.note.style.opacity = String(on);
      const live = on; // the art only moves once its layer is named
      if (p.i === 0) p.parts.forEach((b, j) => {
        const h = p.ah * (0.12 + live * 0.88 * Math.abs(Math.sin(t * 5.3 + j * 0.7) * Math.sin(t * 2.1 + j * 0.31)));
        b.setAttribute("y", p.ay + (p.ah - h) / 2); b.setAttribute("height", Math.max(h, u * 0.4));
      });
      if (p.i === 1) p.parts.forEach((b, j) => {
        const h = p.ah * (0.15 + live * 0.85 * (0.5 + 0.5 * Math.sin(t * 3.7 + j * 1.3)));
        b.setAttribute("y", p.ay + p.ah - h); b.setAttribute("height", h);
      });
      if (p.i === 2) p.parts.forEach((b, j) => b.setAttribute("opacity", String(kit.progress(t, p.at + 0.2 + j * 0.25, 0.3, "out"))));
      if (p.i === 3) p.parts.forEach((d, j) => {
        const cycle = ((t - p.at) % 1.6 + 1.6) % 1.6 / 1.6;
        const r = live * cycle * p.ah * 0.5, a = (j / 10) * Math.PI * 2;
        d.setAttribute("cx", p.ax + p.aw / 2 + Math.cos(a) * r); d.setAttribute("cy", p.ay + p.ah / 2 + Math.sin(a) * r);
        d.setAttribute("opacity", String(live * (1 - cycle * 0.8)));
      });
    }
  };
});
