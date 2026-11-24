// An old title card: a double frame with corner flourishes, the bakery's name, then
// the film's title in big letters. It opens with an iris and flickers like old film.
Bezel.scene((root, kit) => {
  const { u, safe, colours, props } = kit;
  const s = kit.stage();
  const ink = colours.text, paper = colours.surface;
  const fw = Math.min(safe.width * 0.78, u * 130), fh = Math.min(safe.height * 0.82, u * 64);
  const fx = kit.width / 2 - fw / 2, fy = safe.y + (safe.height - fh) / 2;
  const frame = kit.svg("g", { fill: "none", stroke: ink }, s);
  kit.svg("rect", { x: fx, y: fy, width: fw, height: fh, rx: u * 3, fill: paper, "stroke-width": u * 0.8 }, frame);
  kit.svg("rect", { x: fx + u * 2.2, y: fy + u * 2.2, width: fw - u * 4.4, height: fh - u * 4.4, rx: u * 2, "stroke-width": u * 0.3 }, frame);
  // Little scrolls in the corners.
  for (const [cx, cy, sx, sy] of [[fx, fy, 1, 1], [fx + fw, fy, -1, 1], [fx, fy + fh, 1, -1], [fx + fw, fy + fh, -1, -1]]) {
    kit.svg("path", { d: `M${cx + sx * u * 4} ${cy + sy * u * 9} q0 ${-sy * u * 5} ${sx * u * 5} ${-sy * u * 5} q${sx * u * 3} 0 ${sx * u * 3} ${sy * u * 2.5} q0 ${sy * u * 2} ${-sx * u * 2} ${sy * u * 2}`, "stroke-width": u * 0.4, "stroke-linecap": "round" }, frame);
  }
  const kicker = kit.text(root, props.kicker.toUpperCase(), { x: kit.width / 2, y: fy + fh * 0.2, size: 3.4, font: "body", weight: 600, align: "center", colour: ink, style: { letterSpacing: "0.3em" } });
  const title = kit.text(root, props.title, { x: kit.width / 2, y: fy + fh * 0.36, size: 13, font: "heading", align: "center", colour: ink, style: { fontStyle: "italic" } });
  const rule = kit.svg("path", { d: `M${kit.width / 2 - u * 20} ${fy + fh * 0.78} h${u * 40} M${kit.width / 2} ${fy + fh * 0.78 - u * 1.4} l${u * 1.4} ${u * 1.4} l${-u * 1.4} ${u * 1.4} l${-u * 1.4} ${-u * 1.4} Z`, fill: ink, stroke: ink, "stroke-width": u * 0.3 }, s);
  const iris = irisLayer();

  return (t) => {
    // The iris opens from a dot to the whole frame.
    iris.set(kit.progress(t, 0.1, 0.9, "inOut"));
    const k = kit.spring(t - 0.8, { stiffness: 200, damping: 12 });
    kicker.style.opacity = String(kit.progress(t, 0.6, 0.3));
    title.style.transform = `scale(${Math.max(0, k)}) rotate(${(1 - k) * -6}deg)`;
    rule.style.opacity = String(kit.progress(t, 1.2, 0.3));
    oldFilm(t);
  };

  // An iris: black everywhere but a circle that grows to show the whole frame.
  function irisLayer() {
    const big = Math.hypot(kit.width, kit.height) / 2;
    const path = kit.svg("path", { fill: "#0E0D0C", "fill-rule": "evenodd" }, s);
    return { set(p) { const r = Math.max(0.01, p * big); path.setAttribute("d", `M0 0 H${kit.width} V${kit.height} H0 Z M${kit.width / 2 - r} ${kit.height / 2} a${r} ${r} 0 1 0 ${r * 2} 0 a${r} ${r} 0 1 0 ${-r * 2} 0 Z`); } };
  }
  // Old film: the picture flickers and weaves a little, twelve times a second.
  function oldFilm(t) {
    const rand = kit.random(Math.floor(t * 12) + 1);
    root.style.filter = `brightness(${0.96 + rand() * 0.07})`;
    root.style.transform = `translate(${(rand() - 0.5) * u * 0.3}px, ${(rand() - 0.5) * u * 0.3}px)`;
  }
});
