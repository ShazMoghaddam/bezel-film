// Bottles fall into a shredder and come out the other side as a pile of flakes that
// grows into a mound, ready to be melted into something new.
Bezel.scene((root, kit) => {
  const { u, safe, colours, props } = kit;
  const s = kit.stage();
  const P = colours.palette;
  const N = 8;
  const unit = Math.min(safe.width / (1.732 * N), (safe.height * 0.9) / (N * 0.5 + 4));
  const iso = kit.iso({ x: safe.x + safe.width / 2, y: safe.y + safe.height - N * unit * 0.55, unit });
  iso.tile(s, { x: 0, y: 0, w: N, d: N * 0.7, colour: "#E1E6EF", shadow: true });
  // The shredder: a big box with a hopper on top.
  iso.box(s, { x: 1, y: 1.2, w: 2.4, d: 2.4, h: 2.2, colour: "#6B7488" });
  iso.box(s, { x: 1.3, y: 1.5, w: 1.8, d: 1.8, z: 2.2, h: 0.5, colour: P[0] });
  // A short chute out to the right.
  iso.box(s, { x: 3.4, y: 2, w: 1.6, d: 0.8, z: 0.5, h: 0.2, colour: "#9AA3B5" });

  // Bottles: tall thin blocks dropping into the hopper.
  const bottles = [0, 1, 2].map((i) => ({ box: iso.box(s, { x: 1.8 + i * 0.35, y: 2.1, z: 8, w: 0.35, d: 0.35, h: 1, colour: P[i === 1 ? 2 : 0] }), at: 0.3 + i * 0.45 }));
  // Flakes: small chips that pile up into a mound to the right.
  const rand = kit.random(11);
  const flakes = Array.from({ length: 64 }, (_, i) => {
    const r = Math.sqrt(rand()) * 1.15, a = rand() * Math.PI * 2;
    const tx = 6.2 + Math.cos(a) * r, ty = 2.4 + Math.sin(a) * r * 0.8;
    const tz = Math.max(0, (1.15 - r) * 1.2) + rand() * 0.12;
    return { box: iso.box(s, { x: 5, y: 2.3, z: 0.7, w: 0.32, d: 0.32, h: 0.14, colour: [P[0], P[2], "#FFFFFF"][i % 3] }), at: 1.6 + i * 0.04, tx, ty, tz };
  });
  flakes.sort((a, b) => a.tx + a.ty - (b.tx + b.ty));
  const label = kit.el("div", { text: props.label, style: { position: "absolute", padding: `${u}px ${u * 2.4}px`, borderRadius: "999px", background: "#FFFFFF",
    color: colours.text, font: `800 ${u * 3.6}px ${kit.fonts.heading}`, boxShadow: `0 ${u * 0.5}px 0 rgb(29 36 51 / .12)`, translate: "-50% -100%" } }, root);
  const pin = iso.at(6.2, 2.4, 3);
  label.style.left = pin.x + "px";
  label.style.top = pin.y + "px";

  return (t) => {
    for (const b of bottles) {
      const p = kit.progress(t, b.at, 0.6, "in");
      b.box.set({ z: kit.lerp(8, 1.6, p) });
      b.box.group.style.opacity = String(1 - kit.progress(t, b.at + 0.55, 0.1));
    }
    for (const f of flakes) {
      const p = kit.progress(t, f.at, 0.45, "out");
      const hop = Math.sin(p * Math.PI) * 0.8;
      f.box.set({ x: kit.lerp(5, f.tx, p), y: kit.lerp(2.3, f.ty, p), z: kit.lerp(0.7, f.tz, p) + hop });
      f.box.group.style.opacity = String(kit.clamp((t - f.at) * 10));
    }
    const lp = kit.spring(t - 3.0, { stiffness: 220, damping: 14 });
    label.style.opacity = String(kit.clamp(lp * 3));
    label.style.scale = String(Math.max(0, lp));
  };
});
