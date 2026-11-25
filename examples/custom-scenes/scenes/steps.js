// Three drawings, each drawn as its sentence is spoken, joined by arrows.
Bezel.scene((root, kit) => {
  const { u, safe, colours, fonts } = kit;
  const ink = colours.text;
  // Our own simple drawings, each on a 24 by 24 grid, drawn stroke by stroke.
  const DRAWINGS = [
    ["M4 9h13v4.5a6.5 6.5 0 0 1 -6.5 6.5h0a6.5 6.5 0 0 1 -6.5 -6.5z", "M17 11.2a2.8 2.8 0 0 1 0 5.6h-0.6", "M8 3.5c-1 1.2 1 2 0 3.3", "M12 3.5c-1 1.2 1 2 0 3.3"],
    ["M12 3.2a2.4 2.4 0 1 0 0.01 0", "M12 6v8", "M12 14l-3 7", "M12 14l3 7", "M12 8.5l-4 3.5", "M12 8.5l4.6 -2.2", "M15.6 3.6h3v2.4a1.5 1.5 0 0 1 -3 0z"],
    ["M2.5 7h11v9h-11z", "M13.5 10h4l3 3.2v2.8h-7", "M5 18.3a1.8 1.8 0 1 0 3.6 0a1.8 1.8 0 1 0 -3.6 0", "M15 18.3a1.8 1.8 0 1 0 3.6 0a1.8 1.8 0 1 0 -3.6 0", "M5 10.5h5"],
  ];
  const steps = kit.props.steps;
  // In narrow frames the drawings take more of the width, and each label wraps under its own.
  const narrow = kit.shape !== "wide";
  const size = narrow ? Math.min(safe.width / 4.2, safe.height / 3) : Math.min(safe.width / 5, safe.height / 2.6);
  const gapX = (safe.width - size * 3) / 2;
  const top = safe.y + safe.height * 0.5 - size * 0.75;
  const plan = kit.drawing({ pen: true, penColour: colours.accent });
  const washes = [];

  steps.forEach((label, i) => {
    const x = safe.x + i * (size + gapX);
    const wash = kit.el("div", { style: { position: "absolute", left: x - size * 0.08 + "px", top: top - size * 0.02 + "px", width: size * 1.16 + "px", height: size * 1.04 + "px",
      borderRadius: "48% 52% 45% 55% / 55% 45% 55% 45%", background: `color-mix(in srgb, ${colours.palette[i]} 22%, transparent)` } }, root);
    const art = kit.svg("svg", { viewBox: "0 0 24 24", width: size, height: size, style: `position:absolute;left:${x}px;top:${top}px;overflow:visible` }, root);
    const paths = DRAWINGS[i].map((d) => kit.svg("path", { d, fill: "none", stroke: ink, "stroke-width": 1.05, "stroke-linecap": "round", "stroke-linejoin": "round" }, art));
    const text = kit.el("div", { text: label, style: { position: "absolute", left: x + size / 2 + "px", top: top + size * 1.12 + "px", translate: "-50% 0",
      font: `600 ${u * 4}px/1.15 ${fonts.body}`, color: ink,
      ...(narrow ? { width: size + "px", textAlign: "center", textWrap: "balance" } : { whiteSpace: "nowrap" }) } }, root);

    // Each step lands on its own sentence when there is one.
    const start = kit.lines[i] ? kit.lines[i].start : 0.3 + i * 1.6;
    const end = plan.sequence(start, [...paths.map((node, k) => ({ node, duration: k === 0 ? 0.55 : 0.22 })), { node: text, duration: 0.5 }]);
    washes.push({ wash, at: end - 0.5 });

    if (i < steps.length - 1) {
      const arrow = kit.svg("svg", { viewBox: "0 0 100 40", width: gapX * 0.7, height: gapX * 0.28, style: `position:absolute;left:${x + size + gapX * 0.15}px;top:${top + size * 0.4}px;overflow:visible` }, root);
      const shaft = kit.svg("path", { d: "M4 28 C 30 6, 70 6, 94 22", fill: "none", stroke: colours.palette[i], "stroke-width": 4, "stroke-linecap": "round" }, arrow);
      const head = kit.svg("path", { d: "M80 10 L 95 22 L 78 30", fill: "none", stroke: colours.palette[i], "stroke-width": 4, "stroke-linecap": "round", "stroke-linejoin": "round" }, arrow);
      plan.sequence(end + 0.15, [{ node: shaft, duration: 0.35 }, { node: head, duration: 0.15 }]);
    }
  });

  return (t) => {
    plan.draw(t);
    for (const { wash, at } of washes) {
      const p = kit.spring(t - at, { stiffness: 140, damping: 14 });
      wash.style.opacity = Math.min(1, Math.max(0, p));
      wash.style.transform = `scale(${0.6 + 0.4 * p})`;
    }
  };
});
