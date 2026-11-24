// A square sheet drops onto the table, its fold lines appear, and each corner folds into
// the middle in turn, until it's a neat envelope. Then the name sets down beside it.
Bezel.scene((root, kit) => {
  const { u, safe, colours, props, width } = kit;
  const s = kit.stage();
  const wide = kit.shape === "wide";
  // The sheet starts white side up, so each fold shows its coloured side.
  const front = "#FFFFFF", back = colours.accent;
  const D = Math.min(safe.height * 0.42, safe.width * 0.3);
  const cx = wide ? safe.x + safe.width * 0.3 : width / 2, cy = wide ? safe.y + safe.height * 0.5 : safe.y + D + u * 4;

  const shadow = kit.svg("ellipse", { cx, cy: cy + D * 1.05, rx: D * 0.9, ry: D * 0.1, fill: "#1F2328", opacity: 0.12, style: `filter:blur(${u * 1.2}px)` }, s);
  const model = kit.svg("g", {}, s);
  const N = [cx, cy - D], E = [cx + D, cy], S = [cx, cy + D], W = [cx - D, cy];
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const nw = mid(N, W), ne = mid(N, E), se = mid(S, E), sw = mid(S, W);
  // The middle of the sheet; the four corners are the flaps that fold over it.
  kit.svg("polygon", { points: [nw, ne, se, sw].map((p) => p.join(",")).join(" "), fill: front }, model);
  // The fold lines, shown before folding the way a diagram shows them.
  const guides = kit.svg("path", { d: `M${nw} L${ne} L${se} L${sw} Z`, fill: "none", stroke: colours.accent, "stroke-width": u * 0.3, "stroke-dasharray": `${u * 1.2} ${u * 0.9}`, opacity: 0 }, model);
  // Four corner flaps, each folding over the line between its two neighbouring midpoints.
  const flaps = [[N, nw, ne], [E, ne, se], [S, se, sw], [W, sw, nw]].map(([corner, a, b]) =>
    kit.fold(model, { points: [corner, a, b], crease: [a, b], front, back, stroke: "#E8CDBE", strokeWidth: u * 0.12 }));
  model.style.filter = `drop-shadow(0 ${u * 0.3}px ${u * 0.5}px rgb(31 35 40 / .16))`;

  const name = kit.text(root, props.name, { x: wide ? safe.x + safe.width * 0.58 : width / 2, y: wide ? safe.y + safe.height * 0.32 : cy + D + u * 8, size: wide ? 13 : 11, font: "heading", align: wide ? "left" : "center", colour: colours.text });
  const line = kit.text(root, props.line, { x: wide ? safe.x + safe.width * 0.58 : width / 2, y: wide ? safe.y + safe.height * 0.32 + u * 17 : cy + D + u * 22, size: 4.6, align: wide ? "left" : "center", colour: colours.muted, maxWidth: wide ? safe.width * 0.4 : safe.width, style: { lineHeight: "1.25", textWrap: "balance" } });
  const rule = kit.svg("path", { d: "", fill: colours.accent }, s);

  return (t) => {
    // The sheet drops in with a small turn, then settles flat.
    const drop = kit.spring(t - 0.05, { stiffness: 140, damping: 16 });
    model.setAttribute("transform", `translate(0 ${(1 - drop) * -u * 14}) rotate(${(1 - drop) * -12} ${cx} ${cy})`);
    model.style.opacity = String(kit.clamp(drop * 2));
    shadow.style.opacity = String(0.12 * kit.clamp(drop));
    // The shadow follows the paper's lower edge as it folds smaller.
    const folded = kit.progress(t, 1.75, 0.45, "inOut");
    shadow.setAttribute("cy", String(cy + D * (1.05 - folded * 0.42)));
    shadow.setAttribute("rx", String(D * (0.9 - folded * 0.35)));
    guides.style.opacity = String(0.7 * kit.progress(t, 0.35, 0.3) * (1 - kit.progress(t, 1.9, 0.3)));
    flaps.forEach((f, i) => f.set(kit.progress(t, 0.55 + i * 0.4, 0.45, "inOut")));
    // Once folded, the envelope breathes a little, like paper settling.
    const done = kit.progress(t, 2.2, 0.5);
    const k = 1 + done * 0.04 * Math.sin((t - 2.2) * 2);
    s.style.transformOrigin = `${cx}px ${cy}px`;
    s.style.scale = String(k);
    const p = kit.progress(t, 2.1, 0.5);
    name.style.opacity = String(p);
    name.style.translate = `${wide ? "0" : "-50%"} ${(1 - p) * u * 2}px`;
    const q = kit.progress(t, 2.5, 0.5);
    line.style.opacity = String(q);
    line.style.translate = `${wide ? "0" : "-50%"} ${(1 - q) * u * 2}px`;
    // A short folded ribbon under the name, cut at an angle.
    const rx = wide ? safe.x + safe.width * 0.58 : width / 2 - u * 8, ry = wide ? safe.y + safe.height * 0.32 + u * 15 : cy + D + u * 20;
    const w = u * 16 * kit.progress(t, 2.3, 0.4, "inOut");
    rule.setAttribute("d", w > 0.5 ? `M${rx} ${ry} h${w} l${-u * 0.6} ${u * 0.7} h${-w + u * 0.6} Z` : "");
  };
});
