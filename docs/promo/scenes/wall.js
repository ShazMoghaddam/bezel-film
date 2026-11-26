// All of them at once: a wall of tiles, one per style, arriving in a quick ripple, with the
// line set big above it.
Bezel.scene((root, kit) => {
  const { u, safe, colours, props } = kit;
  const s = kit.stage();
  const narrow = kit.shape !== "wide";
  const head = kit.text(root, props.line, { x: safe.x + safe.width / 2, y: safe.y, size: narrow ? 6.4 : 6, font: "heading", align: "center", colour: colours.text, maxWidth: safe.width,
    style: { letterSpacing: "-0.04em", lineHeight: "1.05", textWrap: "balance" } });
  const base = root.getBoundingClientRect();
  const top = head.getBoundingClientRect().bottom - base.top + u * 4;
  const cols = narrow ? 4 : 7, rows = Math.ceil(props.files.length / cols);
  const gap = u * 1;
  const tw = Math.min((safe.width - gap * (cols - 1)) / cols, ((safe.y + safe.height - top) / rows - gap) * 16 / 9);
  const th = tw * 9 / 16;
  const left = safe.x + (safe.width - (tw * cols + gap * (cols - 1))) / 2;
  const used = rows * th + gap * (rows - 1); const yOff = Math.max(0, (safe.y + safe.height - top - used) / 2) * 0.6;
  const tiles = props.files.map((f, i) => {
    const x = left + (i % cols) * (tw + gap), y = top + yOff + Math.floor(i / cols) * (th + gap);
    const g = kit.svg("g", { opacity: 0 }, s);
    kit.svg("image", { href: kit.asset("pictures/" + f + ".jpg"), x, y, width: tw, height: th, preserveAspectRatio: "xMidYMid slice" }, g);
    kit.svg("rect", { x, y, width: tw, height: th, rx: u * 0.6, fill: "none", stroke: "rgb(255 255 255 / .12)", "stroke-width": 1 }, g);
    return { g, i };
  });
  return (t) => {
    const k = kit.progress(t, 0.1, 0.9, "out");
    head.style.opacity = String(k);
    head.style.transform = `translateY(${(1 - k) * u * 2}px)`;
    for (const tile of tiles) {
      const p = kit.progress(t, 0.6 + tile.i * 0.07, 0.5, "out");
      tile.g.setAttribute("opacity", String(p));
      tile.g.setAttribute("transform", `translate(0 ${(1 - p) * u * 2})`);
    }
  };
});
