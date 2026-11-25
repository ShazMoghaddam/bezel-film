// The envelope from the start unfolds, corner by corner, back into a flat sheet that
// keeps its crease pattern. The name, the line and where to get it sit beside it.
Bezel.scene((root, kit) => {
  const { u, safe, colours, props, width } = kit;
  const s = kit.stage();
  const wide = kit.shape === "wide";
  // The sheet starts white side up, so each fold shows its coloured side.
  const front = "#FFFFFF", back = colours.accent;
  const D = wide ? Math.min(safe.height * 0.4, safe.width * 0.28) : Math.min(safe.height * 0.24, safe.width * 0.4);
  const cx = wide ? safe.x + safe.width * 0.27 : width / 2, cy = wide ? safe.y + safe.height * 0.5 : safe.y + D + u * 2;

  const shadow = kit.svg("ellipse", { cx, cy: cy + D * 1.05, rx: D * 0.9, ry: D * 0.1, fill: "#1F2328", opacity: 0.12, style: `filter:blur(${u * 1.2}px)` }, s);
  const model = kit.svg("g", {}, s);
  const N = [cx, cy - D], E = [cx + D, cy], S = [cx, cy + D], W = [cx - D, cy];
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const nw = mid(N, W), ne = mid(N, E), se = mid(S, E), sw = mid(S, W);
  // The middle of the sheet; the four corners are the flaps that fold over it.
  kit.svg("polygon", { points: [nw, ne, se, sw].map((p) => p.join(",")).join(" "), fill: front }, model);
  // The crease pattern left on the sheet once it's unfolded: the square and its diagonals.
  const pattern = kit.svg("path", { d: `M${nw} L${ne} L${se} L${sw} Z M${N} L${S} M${W} L${E}`, fill: "none", stroke: colours.accent, "stroke-width": u * 0.22, opacity: 0 }, model);
  const flaps = [[N, nw, ne], [E, ne, se], [S, se, sw], [W, sw, nw]].map(([corner, a, b]) =>
    kit.fold(model, { points: [corner, a, b], crease: [a, b], front, back, stroke: "#E8CDBE", strokeWidth: u * 0.12 }));
  model.style.filter = `drop-shadow(0 ${u * 0.3}px ${u * 0.5}px rgb(31 35 40 / .16))`;

  const tx = wide ? safe.x + safe.width * 0.56 : width / 2, align = wide ? "left" : "center";
  const ty = wide ? safe.y + safe.height * 0.26 : cy + D + u * 6;
  const name = kit.text(root, props.name, { x: tx, y: ty, size: wide ? 14 : 11, font: "heading", align, colour: colours.text });
  const line = kit.text(root, props.line, { x: tx, y: ty + u * (wide ? 18 : 14), size: 4.8, align, colour: colours.muted, maxWidth: wide ? safe.width * 0.42 : safe.width, style: { lineHeight: "1.25", textWrap: "balance" } });
  const cta = kit.text(root, props.cta, { x: tx, y: ty + u * (wide ? 33 : 27), size: 3.4, weight: 700, align, colour: "#FFFFFF",
    style: { background: colours.text, padding: `${u * 1.2}px ${u * 2.6}px`, clipPath: `polygon(0 0, calc(100% - ${u * 1.6}px) 0, 100% ${u * 1.6}px, 100% 100%, 0 100%)` } });

  const show = (node, at) => { const p = kit.progress(t0, at, 0.5); node.style.opacity = String(p); node.style.translate = `${wide ? "0" : "-50%"} ${(1 - p) * u * 2}px`; };
  let t0 = 0;
  return (t) => {
    t0 = t;
    // It starts folded, as the envelope, and opens one corner at a time.
    flaps.forEach((f, i) => f.set(1 - kit.progress(t, 0.3 + i * 0.3, 0.45, "inOut")));
    pattern.style.opacity = String(0.55 * kit.progress(t, 1.6, 0.4));
    // Opened, the sheet turns a quarter round to sit square.
    const turn = kit.progress(t, 1.6, 0.7, "inOut");
    model.setAttribute("transform", `translate(${cx} ${cy}) rotate(${turn * 45}) scale(${1 - turn * 0.12}) translate(${-cx} ${-cy})`);
    const open = kit.progress(t, 0.9, 0.45, "inOut");
    shadow.setAttribute("cy", String(cy + D * (0.63 + open * 0.42 - turn * 0.3)));
    shadow.setAttribute("rx", String(D * (0.55 + open * 0.35 - turn * 0.25)));
    show(name, 0.9);
    show(line, 1.4);
    show(cta, Math.max(2.0, kit.duration - 1.6));
  };
});
