// The agents: their names as chips that light up in a ripple, then a scene file being checked,
// ticks landing one by one.
Bezel.scene((root, kit) => {
  const { u, safe, colours, props } = kit;
  const s = kit.stage();
  const narrow = kit.shape !== "wide";
  const head = kit.text(root, props.heading, { x: safe.x + safe.width / 2, y: safe.y, size: narrow ? 6.4 : 6, font: "heading", align: "center", colour: colours.text, maxWidth: safe.width,
    style: { letterSpacing: "-0.04em", textWrap: "balance" } });
  const base = root.getBoundingClientRect();
  let y = head.getBoundingClientRect().bottom - base.top + u * 5;
  const tints = ["#7C8CFF", "#FF6B8B", "#3DDC97", "#FFB84D", "#4CC9F0", "#C38BFF", "#A6ADBB"];
  // Chips, wrapped into centred rows.
  const size = narrow ? 3.4 : 3.2;
  const chips = props.agents.map((name, i) => {
    const el = kit.text(root, name, { x: 0, y: 0, size, weight: 600, font: i === props.agents.length - 1 ? "mono" : "body", colour: colours.text, fit: false,
      style: { padding: `${u * 1.2}px ${u * 2.4}px`, borderRadius: `${u * 4}px`, border: `${u * 0.25}px solid ${tints[i % tints.length]}`, whiteSpace: "nowrap" } });
    return { el, i, w: el.getBoundingClientRect().width, h: el.getBoundingClientRect().height };
  });
  const gap = u * 1.8;
  let row = [], rowW = 0;
  const rows = [];
  for (const c of chips) {
    if (row.length && rowW + gap + c.w > safe.width) { rows.push(row); row = []; rowW = 0; }
    rowW += (row.length ? gap : 0) + c.w; row.push(c);
  }
  rows.push(row);
  for (const r of rows) {
    const w = r.reduce((a, c) => a + c.w, 0) + gap * (r.length - 1);
    let x = safe.x + (safe.width - w) / 2;
    for (const c of r) { c.el.style.left = x + "px"; c.el.style.top = y + "px"; x += c.w + gap; }
    y += r[0].h + gap;
  }
  // The check panel: a scene file and its checks.
  y += u * 3;
  const pw = Math.min(safe.width, u * 80), px = safe.x + (safe.width - pw) / 2;
  const ph = Math.min(safe.y + safe.height - y, u * 30);
  const panel = kit.svg("g", { opacity: 0 }, s);
  kit.svg("rect", { x: px, y, width: pw, height: ph, rx: u * 1.6, fill: "#0E1117", stroke: "rgb(255 255 255 / .12)", "stroke-width": 1 }, panel);
  const file = kit.text(root, props.file, { x: px + u * 3, y: y + u * 2.4, size: 2.6, font: "mono", colour: colours.muted, fit: false });
  const checks = props.checks.map((c, i) => kit.text(root, "✓  " + c, { x: px + u * 3, y: y + u * 7.5 + i * u * 5, size: narrow ? 3 : 2.9, font: "mono", colour: "#3DDC97", maxWidth: pw - u * 6 }));
  const chipStart = Math.max(0.8, kit.at(1));
  const checkStart = Math.max(chipStart + 2.5, kit.at(2));
  return (t) => {
    const k = kit.progress(t, 0.1, 0.9, "out");
    head.style.opacity = String(k);
    head.style.transform = `translateY(${(1 - k) * u * 2}px)`;
    for (const c of chips) {
      const p = kit.progress(t, chipStart + c.i * 0.32, 0.6, "out");
      c.el.style.opacity = String(p);
      c.el.style.transform = `translateY(${(1 - p) * u * 1.5}px)`;
    }
    const p = kit.progress(t, checkStart, 0.9, "out");
    panel.setAttribute("opacity", String(p));
    file.style.opacity = String(p);
    checks.forEach((c, i) => (c.style.opacity = String(kit.progress(t, checkStart + 0.6 + i * 0.45, 0.4, "out"))));
  };
});
