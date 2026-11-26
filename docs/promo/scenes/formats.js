// One film, every shape: the same scene on a phone (9:16), a feed post (4:5) and a laptop
// (16:9), each arriving as its platforms are named, with the names under it.
Bezel.scene((root, kit) => {
  const { u, safe, colours, props } = kit;
  const s = kit.stage();
  const narrow = kit.shape !== "wide";
  const head = kit.text(root, props.heading, { x: safe.x + safe.width / 2, y: safe.y, size: narrow ? 6.4 : 6, font: "heading", align: "center", colour: colours.text, maxWidth: safe.width,
    style: { letterSpacing: "-0.04em" } });
  const base = root.getBoundingClientRect();
  const top = head.getBoundingClientRect().bottom - base.top + u * 5;
  const avail = safe.y + safe.height - top - u * 22;
  // Wide frames: the three side by side. Narrow frames: tall and feed side by side, wide underneath.
  const gapX = u * 4;
  const boxes = [];
  if (!narrow) {
    const avail = safe.y + safe.height - top - u * 22;
    const h = Math.min(avail, (safe.width - gapX * 2) / (9 / 16 + 0.8 + 16 / 9));
    const ws = [h * 9 / 16, h * 0.8, h * 16 / 9];
    let x = safe.x + (safe.width - ws.reduce((a, b) => a + b, 0) - gapX * 2) / 2;
    ws.forEach((w, i) => { boxes.push({ x, y: top + (h - (i === 2 ? w * 9 / 16 : h)) / 2, w, h: i === 2 ? w * 9 / 16 : h, rowBottom: top + h }); x += w + gapX; });
  } else {
    const h1 = Math.min((safe.width - gapX) / (9 / 16 + 0.8), (safe.height - (top - safe.y)) * 0.42);
    const w0 = h1 * 9 / 16, w1 = h1 * 0.8;
    const x0 = safe.x + (safe.width - w0 - w1 - gapX) / 2;
    boxes.push({ x: x0, y: top, w: w0, h: h1, rowBottom: top + h1 });
    boxes.push({ x: x0 + w0 + gapX, y: top, w: w1, h: h1, rowBottom: top + h1 });
    const y2 = top + h1 + u * 18;
    const w2 = Math.min(safe.width, (safe.y + safe.height - y2 - u * 20) * 16 / 9);
    boxes.push({ x: safe.x + (safe.width - w2) / 2, y: y2, w: w2, h: w2 * 9 / 16, rowBottom: y2 + w2 * 9 / 16 });
  }
  const frames = ["tall", "feed", "wide"].map((name, i) => {
    const { x, y, w, h, rowBottom } = boxes[i];
    const g = kit.svg("g", { opacity: 0 }, s);
    const clip = kit.svg("clipPath", { id: "bf-shape-" + i }, s);
    kit.svg("rect", { x, y, width: w, height: h, rx: u * 1.2 }, clip);
    kit.svg("image", { href: kit.asset("pictures/shape-" + name + ".jpg"), x, y, width: w, height: h, preserveAspectRatio: "xMidYMid slice", "clip-path": `url(#bf-shape-${i})` }, g);
    kit.svg("rect", { x, y, width: w, height: h, rx: u * 1.2, fill: "none", stroke: "rgb(255 255 255 / .35)", "stroke-width": u * 0.25 }, g);
    const label = kit.text(root, props.labels[i], { x: x + w / 2, y: rowBottom + u * 2.5, size: narrow ? 3 : 3.2, weight: 600, align: "center", colour: colours.text, maxWidth: Math.max(w, u * 24), style: { textWrap: "balance" } });
    const ratio = kit.text(root, ["9:16", "4:5", "16:9"][i], { x: x + w / 2, y: label.getBoundingClientRect().bottom - root.getBoundingClientRect().top + u * 0.8, size: 2.9, align: "center", colour: colours.muted, fit: false });
    return { g, label, ratio, at: Math.max(0.8 + i * 0.7, kit.at(i + 1) + 0.1) };
  });
  const lastBottom = Math.max(...frames.map((f) => f.ratio.getBoundingClientRect().bottom - root.getBoundingClientRect().top));
  const note = kit.text(root, props.note, { x: safe.x + safe.width / 2, y: lastBottom + u * 3, size: 3.3, align: "center", colour: colours.muted, maxWidth: safe.width, style: { textWrap: "balance" } });
  return (t) => {
    const k = kit.progress(t, 0.1, 0.9, "out");
    head.style.opacity = String(k);
    for (const f of frames) {
      const p = kit.progress(t, f.at, 0.9, "out");
      f.g.setAttribute("opacity", String(p));
      f.g.setAttribute("transform", `translate(0 ${(1 - p) * u * 4})`);
      f.label.style.opacity = f.ratio.style.opacity = String(kit.progress(t, f.at + 0.3, 0.6, "out"));
    }
    note.style.opacity = String(kit.progress(t, Math.max(3, kit.at(4)), 0.9, "out"));
  };
});
