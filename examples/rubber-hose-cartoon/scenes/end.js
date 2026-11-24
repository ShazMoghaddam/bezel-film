// The end card: the shop's name in a banner, our loaf tipping a bow beside it, and the
// iris closing to a dot on its face.
Bezel.scene((root, kit) => {
  const { u, safe, colours, props } = kit;
  const s = kit.stage();
  const ink = colours.text, paper = colours.surface;
  const cx = kit.width / 2, cy = safe.y + safe.height * 0.36;
  const bw = Math.min(safe.width * 0.7, u * 120), bh = u * 16;
  // A ribbon banner: a band with folded tails.
  const banner = kit.svg("g", {}, s);
  for (const side of [-1, 1]) {
    kit.svg("path", { d: `M${cx + side * bw / 2} ${cy - bh * 0.3} l${side * u * 10} 0 l${-side * u * 4} ${bh * 0.5} l${side * u * 4} ${bh * 0.5} l${-side * u * 10} 0 Z`, fill: ink }, banner);
  }
  kit.svg("rect", { x: cx - bw / 2, y: cy - bh / 2, width: bw, height: bh, fill: paper, stroke: ink, "stroke-width": u * 0.6 }, banner);
  const name = kit.text(root, props.name, { x: cx, y: cy - bh * 0.42, size: 8.4, font: "heading", align: "center", colour: ink, style: { fontStyle: "italic" } });
  const line = kit.text(root, props.line.toUpperCase(), { x: cx, y: cy + bh * 0.9, size: 3.6, font: "body", weight: 600, align: "center", colour: ink, style: { letterSpacing: "0.18em" } });
  const ground = safe.y + safe.height * 0.98;
  const loaf = kit.toon(s, { x: cx, y: ground, height: safe.height * 0.36, colour: paper, kind: "rubber", tongue: "#6B6560", face: "happy" });
  const iris = kit.svg("path", { fill: "#0E0D0C", "fill-rule": "evenodd" }, s);
  const big = Math.hypot(kit.width, kit.height);

  return (t) => {
    const k = kit.spring(t - 0.1, { stiffness: 220, damping: 13 });
    banner.setAttribute("transform", `translate(${cx} ${cy}) scale(${Math.max(0, k)}) translate(${-cx} ${-cy})`);
    name.style.opacity = String(kit.clamp(k * 3 - 1.5));
    line.style.opacity = String(kit.progress(t, 0.9, 0.3));
    const bow = kit.progress(t, 1.4, 0.4, "inOut") * (1 - kit.progress(t, 2.2, 0.4, "inOut"));
    loaf.pose("wave", { lean: 24, head: 20, ls: -40, le: 30, rs: 40, re: -30, lh: -7, lk: 1, rh: 7, rk: -1 }, bow).look(0.2);
    loaf.squash(Math.abs(Math.sin(t * Math.PI * 2)) < 0.2 ? 0.2 : 0);
    // The iris closes on the loaf's face at the very end.
    const end = kit.duration;
    const close = kit.progress(t, end - 0.9, 0.8, "inOut");
    const fx = cx, fy = ground - safe.height * 0.36 * 0.6;
    const r = Math.max(0.01, (1 - close) * big);
    // Words under the closing iris go with it.
    if (close > 0.5) name.style.opacity = line.style.opacity = "0";
    iris.setAttribute("d", close > 0 ? `M0 0 H${kit.width} V${kit.height} H0 Z M${fx - r} ${fy} a${r} ${r} 0 1 0 ${r * 2} 0 a${r} ${r} 0 1 0 ${-r * 2} 0 Z` : "");
    const rnd = kit.random(Math.floor(t * 12) + 1);
    root.style.filter = `brightness(${0.96 + rnd() * 0.07})`;
    root.style.transform = `translate(${(rnd() - 0.5) * u * 0.3}px, ${(rnd() - 0.5) * u * 0.3}px)`;
  };
});
