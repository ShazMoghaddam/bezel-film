// Three letters drop in, one over each pile. Each folds its top half down over the middle
// crease, then slides down onto its pile of folded letters, which already has a few.
Bezel.scene((root, kit) => {
  const { u, safe, colours, props } = kit;
  const s = kit.stage();
  const tall = kit.shape === "tall";
  const colourOf = [colours.accent, colours.palette[2], "#8A8F96"];
  const insideOf = ["#F6E2D6", "#DCE6FA", "#ECEAE6"];
  const shade = (c, k) => `color-mix(in oklab, ${c}, #000000 ${k * 100}%)`;
  const n = props.piles.length;
  const heading = kit.text(root, props.heading, { x: safe.x, y: safe.y, size: tall ? 5 : 5.6, font: "heading", colour: colours.text, maxWidth: safe.width, style: { textWrap: "balance" } });
  const colW = safe.width / n;
  const base = safe.y + safe.height * 0.84;
  const w = Math.min(colW * 0.62, u * 40), h = w * 0.62;
  const rect = (x, y, ww, hh) => [[x, y], [x + ww, y], [x + ww, y + hh], [x, y + hh]];

  const piles = props.piles.map((label, i) => {
    const cx = safe.x + colW * (i + 0.5);
    // The pile: folded letters already stacked, each nudged a little.
    const rand = kit.random(7 + i);
    const layers = [0, 1, 2].map((k) => {
      const y = base - h / 2 - k * u * 1.3, dx = (rand() - 0.5) * u * 2, tilt = (rand() - 0.5) * 3;
      const g = kit.svg("g", { transform: `rotate(${tilt} ${cx} ${y})` }, s);
      kit.svg("polygon", { points: rect(cx - w / 2 + dx, y, w, h / 2).map((p) => p.join(",")).join(" "), fill: shade(colourOf[i], 0.06 + k * 0.03) }, g);
      kit.svg("path", { d: `M${cx - w / 2 + dx} ${y} L${cx + dx} ${y + h * 0.3} L${cx + w / 2 + dx} ${y}`, fill: "none", stroke: shade(colourOf[i], 0.25), "stroke-width": u * 0.15 }, g);
      return g;
    });
    // The letter: a sheet with its top half folding down over the middle.
    const top = safe.y + safe.height * 0.22;
    const letter = kit.svg("g", {}, s);
    kit.svg("polygon", { points: rect(cx - w / 2, top + h / 2, w, h / 2).map((p) => p.join(",")).join(" "), fill: insideOf[i] }, letter);
    // Lines of writing on the letter, covered as the flap comes down over them.
    [0.62, 0.74, 0.86].forEach((f, k) => kit.svg("path", { d: `M${cx - w * 0.36} ${top + h * f} h${w * (k === 2 ? 0.4 : 0.72)}`, stroke: shade(insideOf[i], 0.25), "stroke-width": u * 0.5, "stroke-linecap": "round" }, letter));
    const flap = kit.fold(letter, { points: rect(cx - w / 2, top, w, h / 2), crease: [[cx - w / 2, top + h / 2], [cx + w / 2, top + h / 2]], front: insideOf[i], back: colourOf[i] });
    const mark = kit.svg("path", { d: `M${cx - w / 2} ${top + h / 2} L${cx} ${top + h * 0.8} L${cx + w / 2} ${top + h / 2}`, fill: "none", stroke: shade(colourOf[i], 0.25), "stroke-width": u * 0.15, opacity: 0 }, letter);
    const caption = kit.text(root, label, { x: cx, y: base + h * 0.08, size: 4.4, font: "heading", align: "center", colour: i === 0 ? colours.accent : colours.text });
    return { layers, letter, flap, mark, caption, top };
  });

  return (t) => {
    heading.style.opacity = String(kit.progress(t, 0.1, 0.4));
    heading.style.translate = `0 ${(1 - kit.progress(t, 0.1, 0.4)) * u * 1.5}px`;
    piles.forEach((p, i) => {
      const at = 0.5 + i * 0.45;
      const drop = kit.spring(t - at, { stiffness: 150, damping: 15 });
      const fold = kit.progress(t, at + 0.45, 0.45, "inOut");
      p.flap.set(fold);
      p.mark.style.opacity = String(kit.clamp(fold * 2 - 1));
      // Folded, it slides down to land on top of its pile.
      const slide = kit.progress(t, at + 1.0, 0.45, "inOut");
      const land = base - h / 2 - 3 * u * 1.3 - (p.top + h / 2);
      p.letter.setAttribute("transform", `translate(0 ${(1 - drop) * -u * 12 + slide * land})`);
      p.letter.style.opacity = String(kit.clamp(drop * 2));
      p.layers.forEach((l, k) => (l.style.opacity = String(kit.progress(t, at + 0.1 + k * 0.08, 0.2))));
      p.caption.style.opacity = String(kit.progress(t, at + 0.3, 0.3));
    });
  };
});
