// The sleeper crosses a stone viaduct in the dark, its windows glowing warm, while the
// hills behind and the pines in front slide past at their own speeds.
Bezel.scene((root, kit) => {
  const { u, safe, colours, props, width, height } = kit;
  const s = kit.stage();
  const warm = colours.accent;

  const ridge = (top, amp, peaks, seed) => {
    const rand = kit.random(seed);
    const span = width * 2;
    const step = span / peaks;
    let d = `M${-u * 10} ${height + u * 4} L${-u * 10} ${top}`;
    for (let i = 0; i < peaks; i++) { const x = -u * 10 + step * i; d += ` L${x + step * 0.5} ${top - amp * (0.5 + rand() * 0.7)} L${x + step} ${top + (rand() - 0.5) * amp * 0.25}`; }
    return d + ` L${span} ${height + u * 4} Z`;
  };
  const pines = (top, count, size, seed) => {
    const rand = kit.random(seed);
    const span = width * 2;
    let d = `M${-u * 10} ${height + u * 4} L${-u * 10} ${top}`;
    for (let i = 0; i <= count; i++) {
      const x = -u * 10 + (span * i) / count, h = size * (0.6 + rand() * 0.8), w = size * 0.32;
      d += ` L${x - w} ${top} L${x - w * 0.5} ${top - h * 0.45} L${x - w * 0.75} ${top - h * 0.45} L${x} ${top - h} L${x + w * 0.75} ${top - h * 0.45} L${x + w * 0.5} ${top - h * 0.45} L${x + w} ${top}`;
    }
    return d + ` L${span} ${height + u * 4} Z`;
  };

  kit.glow(s, { cx: width * 0.3, cy: safe.y + safe.height * 0.25, r: u * 30, colour: "#FFD59A", strength: 0.35 });
  kit.svg("circle", { cx: width * 0.3, cy: safe.y + safe.height * 0.25, r: u * 4, fill: "#FFE9C4" }, s);
  const far = kit.svg("g", {}, s);
  kit.cutout(far, ridge(safe.y + safe.height * 0.55, u * 16, 9, 3), { fill: "#26356A", shadow: 0.5, lift: u * 0.8, shadowColour: "4 6 18" });

  // The viaduct: a deck on a row of arches.
  const deckY = safe.y + safe.height * 0.62;
  const bridge = kit.svg("g", {}, s);
  const arch = u * 16;
  let d = `M${-u * 10} ${deckY} H${width + u * 10} V${deckY + u * 3}`;
  for (let i = 0; i * arch < width + u * 20; i++) {
    const x0 = width + u * 10 - i * arch;
    d += ` L${x0} ${height + u * 4} L${x0 - arch * 0.16} ${height + u * 4} L${x0 - arch * 0.16} ${deckY + u * 3 + arch * 0.5} A${arch * 0.34} ${arch * 0.34} 0 0 0 ${x0 - arch * 0.84} ${deckY + u * 3 + arch * 0.5} L${x0 - arch * 0.84} ${height + u * 4} L${x0 - arch} ${height + u * 4}`;
  }
  d += ` L${-u * 10} ${height + u * 4} Z`;
  kit.cutout(bridge, d, { fill: "#1A2550", shadow: 0.5, lift: u * 0.8, shadowColour: "4 6 18" });

  // The train: an engine and three carriages in silhouette with lit windows.
  const train = kit.svg("g", {}, s);
  const carW = u * 30, carH = u * 7.5, gap = u * 1.2, ty = deckY - carH - u * 0.6;
  const cars = 4;
  for (let i = 0; i < cars; i++) {
    const x = -i * (carW + gap);
    kit.svg("path", { d: i === 0 ? `M${x} ${ty + carH} V${ty + u * 1.5} Q${x} ${ty} ${x + u * 1.5} ${ty} H${x + carW - u * 6} Q${x + carW} ${ty} ${x + carW + u * 1} ${ty + carH} Z` : `M${x} ${ty + carH} V${ty + u * 1.2} Q${x} ${ty} ${x + u * 1.2} ${ty} H${x + carW - u * 1.2} Q${x + carW} ${ty} ${x + carW} ${ty + u * 1.2} V${ty + carH} Z`, fill: "#0B1230" }, train);
    const n = i === 0 ? 2 : 6;
    for (let k = 0; k < n; k++) {
      const wx = x + u * 2.4 + k * ((carW - u * 4.8) / n);
      kit.svg("rect", { x: wx, y: ty + u * 1.8, width: (carW - u * 6) / n, height: u * 2.6, rx: u * 0.4, fill: "#FFC56B" }, train);
    }
  }
  // Light from the windows spills onto the night around them.
  const spill = kit.glow(train, { cx: -carW, cy: ty + carH / 2, r: carW * 2.4, colour: "#FFB547", strength: 0.3 });
  train.insertBefore(spill, train.firstChild);
  const front = kit.svg("g", {}, s);
  kit.cutout(front, pines(safe.y + safe.height * 1.02, 34, u * 15, 6), { fill: "#0A1029", shadow: 0.6, lift: u, shadowColour: "2 4 12" });

  const caption = kit.text(root, props.caption, { x: safe.x, y: safe.y, size: 5.4, font: "heading", colour: colours.text, maxWidth: safe.width * 0.85, style: { textWrap: "balance" } });

  return (t) => {
    // Each layer slides at its own pace: far slow, near fast.
    far.setAttribute("transform", `translate(${-t * u * 1.2} 0)`);
    bridge.setAttribute("transform", `translate(${-t * u * 3} 0)`);
    front.setAttribute("transform", `translate(${-t * u * 9} 0)`);
    const run = kit.clamp(t / kit.duration);
    // In view the whole scene: the engine enters a third of the way across and leaves at the end.
    const x = kit.lerp(width * 0.34, width + carW * 1.5, run);
    // A gentle sway, as carriages rock on the rails.
    train.setAttribute("transform", `translate(${x} ${Math.sin(t * 7) * u * 0.08})`);
    const c = kit.progress(t, 0.4, 0.8);
    caption.style.opacity = String(c);
    caption.style.translate = `0 ${(1 - c) * u * 1.5}px`;
  };
});
