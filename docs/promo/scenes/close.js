// The close: the mark and the name, where to get it, and who made it, with the links lit up.
Bezel.scene((root, kit) => {
  const { u, safe, colours, props } = kit;
  const s = kit.stage();
  const narrow = kit.shape !== "wide";
  const cx = safe.x + safe.width / 2;
  const base = root.getBoundingClientRect();
  const markSize = u * (narrow ? 15 : 12);
  const markY = safe.y + safe.height * (narrow ? 0.08 : 0.06);
  kit.glow(s, { cx, cy: markY + markSize / 2, r: markSize * 2.4, colour: "#9B5DE5", strength: 0.22 });
  const defs = kit.svg("defs", {}, s);
  const grad = kit.svg("linearGradient", { id: "bf-mark-close", x1: "0", y1: "0", x2: "1", y2: "1" }, defs);
  ["#4C8DFF", "#9B5DE5", "#FF5D73", "#FFB020", "#2EC4B6"].forEach((c, i) => kit.svg("stop", { offset: String(i / 4), "stop-color": c }, grad));
  const mark = kit.svg("g", {}, s);
  kit.svg("rect", { x: cx - markSize / 2, y: markY, width: markSize, height: markSize, rx: markSize * 0.28, fill: "url(#bf-mark-close)" }, mark);
  const tri = markSize * 0.36, my = markY + markSize / 2;
  kit.svg("path", { d: `M${cx - tri * 0.35} ${my - tri * 0.6} L${cx + tri * 0.62} ${my} L${cx - tri * 0.35} ${my + tri * 0.6} Z`, fill: colours.background }, mark);
  const name = kit.text(root, "", { x: cx, y: markY + markSize + u * 3, size: narrow ? 10 : 9, font: "heading", align: "center", colour: colours.text, fit: false, style: { letterSpacing: "-0.045em", lineHeight: "1" } });
  name.innerHTML = 'Bezel <span style="background:linear-gradient(90deg,#4C8DFF,#9B5DE5 45%,#FF5D73);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:#C9B8FF">Film</span>';
  const below = (el, gap) => el.getBoundingClientRect().bottom - base.top + gap;
  const tag = kit.text(root, props.tagline, { x: cx, y: below(name, u * 2.5), size: narrow ? 3.8 : 3.6, align: "center", colour: colours.muted, maxWidth: safe.width });
  // Chips: centred, wrapping onto a second row when they don't fit.
  const chipRow = (texts, y, opts) => {
    const els = texts.map((tx, i) => kit.text(root, tx, { x: 0, y: 0, size: opts.size, font: opts.font, weight: opts.weight || 500, colour: opts.colours[i % opts.colours.length], fit: false,
      style: { padding: `${u * 1.1}px ${u * 2.2}px`, borderRadius: `${u * 1.2}px`, background: opts.bg, border: `1px solid ${opts.border}`, whiteSpace: "nowrap" } }));
    const gap = u * 1.6;
    let rows = [[]], w = 0;
    els.forEach((el) => {
      const ew = el.getBoundingClientRect().width;
      if (rows.at(-1).length && w + gap + ew > safe.width) { rows.push([]); w = 0; }
      w += (rows.at(-1).length ? gap : 0) + ew; rows.at(-1).push(el);
    });
    for (const r of rows) {
      const rw = r.reduce((a, el) => a + el.getBoundingClientRect().width, 0) + gap * (r.length - 1);
      let x = cx - rw / 2;
      for (const el of r) { el.style.left = x + "px"; el.style.top = y + "px"; x += el.getBoundingClientRect().width + gap; }
      y += r[0].getBoundingClientRect().height + gap;
    }
    return { els, bottom: y };
  };
  const get = chipRow(props.get, below(tag, u * 4), { size: narrow ? 3 : 3, font: "mono", colours: ["#3DDC97", "#F5F7FA"], bg: "#0E1117", border: "rgb(255 255 255 / .16)" });
  const by = kit.text(root, props.by, { x: cx, y: get.bottom + u * 3, size: narrow ? 3.4 : 3.2, weight: 600, align: "center", colour: colours.text, maxWidth: safe.width });
  const links = chipRow(props.links, below(by, u * 2), { size: narrow ? 2.9 : 2.8, font: "body", weight: 600, colours: ["#050608"], bg: "#7C8CFF", border: "#7C8CFF" });
  links.els[1] && (links.els[1].style.background = "#FFB84D", links.els[1].style.borderColor = "#FFB84D");
  const groups = [[mark], [name], [tag], get.els, [by], links.els];
  const starts = [0.2, 0.7, 1.2, Math.max(1.8, kit.at(1)), Math.max(2.6, kit.at(2)), Math.max(3.1, kit.at(2) + 0.6)];
  return (t) => groups.forEach((g, i) => g.forEach((el, j) => {
    const p = kit.progress(t, starts[i] + j * 0.15, 0.9, "out");
    if (el instanceof SVGElement) { el.setAttribute("opacity", String(p)); el.setAttribute("transform", `translate(0 ${(1 - p) * u * 4})`); }
    else { el.style.opacity = String(p); el.style.transform = `translateY(${(1 - p) * u * 1.5}px)`; }
  }));
});
