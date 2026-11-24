// A conveyor belt carries a stream of rubbish past three bins. Each piece is pushed off
// into the bin of its colour as it passes.
Bezel.scene((root, kit) => {
  const { u, safe, colours, props } = kit;
  const s = kit.stage();
  const P = colours.palette;
  const N = 10;
  const unit = Math.min(safe.width / (1.732 * N), (safe.height * 0.78) / (N * 0.5 + 3.4));
  const iso = kit.iso({ x: safe.x + safe.width / 2 + unit * 1.5, y: safe.y + safe.height * 0.08, unit });
  iso.tile(s, { x: 0, y: 0, w: N, d: 6, colour: "#E1E6EF", shadow: true });
  const kinds = [P[0], P[2], P[3]];
  // Back to front: the belt, then what rides on it, then the bins in front of it.
  iso.box(s, { x: 0, y: 1.0, w: N, d: 1.4, h: 0.6, colour: "#6B7488" });
  for (let i = 0.5; i < N; i += 1) iso.tile(s, { x: i, y: 1.05, z: 0.61, w: 0.08, d: 1.3, colour: "#59627A" });
  const ride = kit.svg("g", {}, s);
  const items = [];
  for (let i = 0; i < 9; i++) {
    const kind = [0, 1, 2, 0, 2, 1, 0, 1, 2][i];
    items.push({ kind, box: iso.box(ride, { x: -1, y: 1.35, w: 0.7, d: 0.7, z: 0.6, h: 0.6, colour: kinds[kind] }), start: i * 0.55 });
  }
  const bins = props.bins.map((name, i) => {
    const x = 1.6 + i * 2.8;
    iso.box(s, { x, y: 3.2, w: 1.8, d: 1.5, h: 1.2, colour: kinds[i] });
    iso.tile(s, { x: x + 0.15, y: 3.35, z: 1.2, w: 1.5, d: 1.2, colour: "#2A3142" });
    // A tag on the floor in front of each bin.
    const at = iso.at(x + 0.9, 4.7, 0);
    const tag = kit.el("div", { text: name, style: { position: "absolute", left: at.x + "px", top: at.y + u * 1.2 + "px", translate: "-50% 0",
      padding: `${u * 0.6}px ${u * 1.8}px`, borderRadius: "999px", background: "#FFFFFF", color: colours.text,
      font: `800 ${u * 3}px ${kit.fonts.heading}`, boxShadow: `0 ${u * 0.4}px 0 rgb(29 36 51 / .12)` } }, root);
    return { x, tag };
  });
  const label = kit.el("div", { text: props.label, style: { position: "absolute", padding: `${u}px ${u * 2.4}px`, borderRadius: "999px", background: "#FFFFFF",
    color: colours.text, font: `800 ${u * 3.6}px ${kit.fonts.heading}`, boxShadow: `0 ${u * 0.5}px 0 rgb(29 36 51 / .12)`, translate: "-50% -100%" } }, root);
  const top = iso.at(N * 0.62, 0.6, 2.6);
  label.style.left = top.x + "px";
  label.style.top = top.y + "px";

  const speed = 2.2; // grid steps a second
  return (t) => {
    for (const it of items) {
      const target = bins[it.kind].x + 0.55;
      const x = -1 + Math.max(0, t - it.start) * speed;
      if (x < target) {
        it.box.set({ x, y: 1.35, z: 0.6 });
        it.box.group.style.opacity = "1";
      } else {
        // Pushed off the belt, it drops into its bin.
        const p = kit.clamp((x - target) / 1.3);
        it.box.set({ x: target, y: 1.35 + p * 2.1, z: 0.6 + Math.sin(p * Math.PI) * 0.9 - p * 0.3 });
        it.box.group.style.opacity = String(1 - kit.clamp((p - 0.75) * 4));
      }
    }
    const lp = kit.spring(t - 0.3, { stiffness: 200, damping: 14 });
    label.style.opacity = String(kit.clamp(lp * 3));
    label.style.scale = String(Math.max(0, lp));
  };
});
