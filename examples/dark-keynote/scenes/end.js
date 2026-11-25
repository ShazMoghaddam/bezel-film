// The close: the app's icon fades up with a soft light behind it, then the name, the line
// and where it runs, centred and calm.
Bezel.scene((root, kit) => {
  const { u, safe, colours, props, width } = kit;
  const s = kit.stage();
  const [blue, pink] = colours.palette;
  const cx = width / 2, size = Math.min(safe.height * 0.24, u * 22), iy = safe.y + safe.height * 0.16;
  const light = kit.glow(s, { cx, cy: iy + size / 2, r: size * 2.4, colour: blue, strength: 0.4 });
  // The icon: a rounded square with a gradient and a simple clock-face mark.
  const defs = kit.svg("defs", {}, s);
  const grad = kit.svg("linearGradient", { id: "tempo-icon", x1: 0, y1: 0, x2: 1, y2: 1 }, defs);
  [[0, blue], [1, pink]].forEach(([o, c]) => kit.svg("stop", { offset: o, "stop-color": c }, grad));
  const icon = kit.svg("g", {}, s);
  kit.svg("rect", { x: cx - size / 2, y: iy, width: size, height: size, rx: size * 0.23, fill: "url(#tempo-icon)" }, icon);
  kit.svg("circle", { cx, cy: iy + size / 2, r: size * 0.26, fill: "none", stroke: "#FFFFFF", "stroke-width": size * 0.06 }, icon);
  kit.svg("path", { d: `M${cx} ${iy + size * 0.36} V${iy + size / 2} L${cx + size * 0.1} ${iy + size * 0.58}`, fill: "none", stroke: "#FFFFFF", "stroke-width": size * 0.06, "stroke-linecap": "round", "stroke-linejoin": "round" }, icon);
  const name = kit.text(root, props.name, { x: cx, y: iy + size + u * 4, size: 9, font: "heading", align: "center", colour: colours.text, style: { letterSpacing: "-0.04em" } });
  const line = kit.text(root, props.line, { x: cx, y: iy + size + u * 17, size: 5.6, font: "heading", align: "center", colour: colours.text, style: { letterSpacing: "-0.03em" } });
  const where = kit.text(root, props.where, { x: cx, y: iy + size + u * 27, size: 3.4, align: "center", colour: colours.muted });

  return (t) => {
    light.style.opacity = String(kit.progress(t, 0, 1.6, "inOut"));
    const i = kit.progress(t, 0.2, 1, "out");
    icon.style.opacity = String(i);
    icon.setAttribute("transform", `translate(${cx} ${iy + size / 2}) scale(${0.9 + i * 0.1}) translate(${-cx} ${-(iy + size / 2)})`);
    [[name, 0.7], [line, 1.3], [where, 1.8]].forEach(([el, at]) => {
      const p = kit.progress(t, at, 0.9, "out");
      el.style.opacity = String(p);
      el.style.translate = `-50% ${(1 - p) * u * 1.5}px`;
    });
  };
});
