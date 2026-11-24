// A truck drives along the road, stops at the bin, and the bin tips its load in.
Bezel.scene((root, kit) => {
  const { u, safe, colours, props } = kit;
  const s = kit.stage();
  const P = colours.palette;
  const N = 9;
  const unit = Math.min(safe.width / (1.732 * N), (safe.height * 0.92) / (N * 0.5 + 3.5));
  const iso = kit.iso({ x: safe.x + safe.width / 2, y: safe.y + safe.height * 0.98 - N * unit, unit });
  iso.tile(s, { x: 0, y: 0, w: N, d: N, colour: "#DCE6D2", shadow: true });
  iso.tile(s, { x: 0, y: 4, w: N, d: 1.6, colour: "#C9CFDA" });
  // Road markings.
  for (let i = 0; i < N; i += 1.5) iso.tile(s, { x: i + 0.3, y: 4.72, w: 0.7, d: 0.16, colour: "#FFFFFF" });
  // Houses behind the road, the bin in front of the nearest one.
  iso.box(s, { x: 1, y: 1, w: 2, d: 2, h: 1.6, colour: P[1] });
  iso.box(s, { x: 4.4, y: 1.2, w: 1.6, d: 1.8, h: 2.2, colour: P[3] });
  iso.box(s, { x: 7, y: 1, w: 1.4, d: 2, h: 1.3, colour: P[4] });
  [[3.7, 1.3, 0.8], [0.6, 3.3, 0.7], [8.4, 3.3, 0.7]].forEach(([x, y, size]) => iso.tree(s, { x, y, size }));
  const bin = iso.box(s, { x: 4.9, y: 3.3, w: 0.5, d: 0.5, h: 0.8, colour: P[0] });

  // The truck: a cab and a body, as two boxes moving together along the road.
  const truck = kit.svg("g", {}, s);
  const body = iso.box(truck, { x: 0, y: 4.3, w: 2.2, d: 1, h: 1.2, colour: P[2] });
  const cab = iso.box(truck, { x: 2.2, y: 4.3, w: 0.9, d: 1, h: 0.9, colour: "#FFFFFF" });
  const wheels = [0.4, 1.6, 2.6].map((x) => kit.svg("circle", { r: unit * 0.22, fill: "#2A3142" }, truck));
  const label = kit.el("div", { text: props.label, style: { position: "absolute", padding: `${u * 1}px ${u * 2.4}px`, borderRadius: "999px",
    background: "#FFFFFF", color: colours.text, font: `800 ${u * 3.6}px ${kit.fonts.heading}`, boxShadow: `0 ${u * 0.5}px 0 rgb(29 36 51 / .12), 0 ${u * 1.5}px ${u * 3}px rgb(29 36 51 / .14)`, translate: "-50% -100%" } }, root);

  const startX = -3.4, stopX = 3.1, driveFor = 1.6, stopAt = 0.4 + driveFor;
  return (t) => {
    // Drives in, eases to a stop by the bin, then pulls away after collecting.
    const inP = kit.progress(t, 0.4, driveFor, "out");
    const outP = kit.progress(t, stopAt + 1.6, 1.4, "in");
    const x = kit.lerp(startX, stopX, inP) + outP * 7;
    const shift = iso.at(x, 0, 0);
    const base = iso.at(0, 0, 0);
    truck.setAttribute("transform", `translate(${shift.x - base.x} ${shift.y - base.y})`);
    [0.4, 1.6, 2.6].forEach((wx, i) => { const p = iso.at(wx, 5.3, 0); wheels[i].setAttribute("cx", p.x); wheels[i].setAttribute("cy", p.y); });
    // The bin lifts and empties into the truck.
    const lift = Math.sin(kit.progress(t, stopAt + 0.3, 1.0, "inOut") * Math.PI);
    bin.set({ z: lift * 1.4, y: 3.3 + lift * 0.6 });
    const pin = iso.at(x + 1.1, 4.8, 2.0);
    label.style.left = pin.x + "px";
    label.style.top = pin.y + "px";
    const lp = kit.spring(t - stopAt - 0.2, { stiffness: 240, damping: 14 });
    label.style.opacity = String(kit.clamp(lp * 3) * (1 - outP));
    label.style.scale = String(Math.max(0, lp));
  };
});
