// Three steps rise as a staircase, each landing on its word, with a bottle hopping
// up them to the top.
Bezel.scene((root, kit) => {
  const { u, safe, colours, props } = kit;
  const s = kit.stage();
  const P = colours.palette;
  const N = 6;
  const unit = Math.min(safe.width / (1.732 * N * 1.15), (safe.height * 0.72) / (N * 0.5 + 4.5));
  const iso = kit.iso({ x: safe.x + safe.width * 0.36, y: safe.y + safe.height * 0.84 - N * unit * 0.6, unit });
  const title = kit.text(root, props.title, { x: safe.x + safe.width / 2, y: safe.y, size: 7.5, font: "heading", align: "center" });
  const colors = [P[0], P[2], P[4]];
  // Each step: 1.4 wide, rising in height. The order of the words follows the voice.
  const steps = props.steps.map((word, i) => {
    const box = iso.box(s, { x: i * 2.2, y: 0, w: 1.6, d: 1.6, h: 0.01, colour: colors[i] });
    const h = 1 + i * 1.2;
    const at = [kit.at(0) + 1.6, kit.at(0) + 2.3, kit.at(0) + 3.0][i];
    const tag = kit.el("div", { text: word, style: { position: "absolute", padding: `${u}px ${u * 2.2}px`, borderRadius: "999px", background: "#FFFFFF",
      color: colours.text, font: `800 ${u * 3.4}px ${kit.fonts.heading}`, boxShadow: `0 ${u * 0.5}px 0 rgb(29 36 51 / .12)`, translate: "-50% 0", whiteSpace: "nowrap" } }, root);
    return { box, h, at, tag, x: i * 2.2 };
  });
  const bottle = iso.box(s, { x: 0.6, y: 0.6, w: 0.4, d: 0.4, h: 1.1, z: 0, colour: "#FFFFFF", stroke: colours.text, strokeWidth: u * 0.2 });
  const cap = iso.box(s, { x: 0.68, y: 0.68, w: 0.24, d: 0.24, h: 0.2, z: 1.1, colour: P[1] });

  return (t) => {
    const ti = kit.spring(t - 0.1, { stiffness: 140, damping: 16 });
    title.style.opacity = String(kit.clamp(ti * 2));
    title.style.transform = `translateY(${(1 - ti) * u * 4}px)`;
    let at = 0, onStep = -1;
    steps.forEach((st, i) => {
      const k = kit.spring(t - st.at, { stiffness: 190, damping: 14 });
      st.box.set({ h: Math.max(0.01, st.h * k) });
      // Each word sits on the front of its own step.
      const pin = iso.at(st.x + 0.8, 1.6, 0);
      st.tag.style.left = pin.x + "px";
      st.tag.style.top = pin.y + u * 5 + "px";
      st.tag.style.opacity = String(kit.clamp(k * 3));
      if (t > st.at + 0.35) onStep = i;
    });
    // The bottle hops up to each step as it rises.
    let x = 0.6, z = 0;
    if (onStep >= 0) {
      const st = steps[onStep];
      const p = kit.progress(t, st.at + 0.35, 0.4, "inOut");
      const prevX = onStep ? steps[onStep - 1].x + 0.6 : 0.6, prevZ = onStep ? steps[onStep - 1].h : 0;
      x = kit.lerp(prevX, st.x + 0.6, p);
      z = kit.lerp(prevZ, st.h, p) + Math.sin(p * Math.PI) * 0.8;
    }
    bottle.set({ x, z: z + 0.001 });
    cap.set({ x: x + 0.08, z: z + 1.1 });
    cap.group.style.opacity = String(kit.progress(t, steps[2].at + 0.4, 0.2));
  };
});
