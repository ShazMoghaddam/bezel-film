// A paper plane folds itself: its two wings lie open below the centre fold, then turn
// up over it one after the other. It lifts off its shadow and flies out of the frame.
Bezel.scene((root, kit) => {
  const { u, safe, colours, props } = kit;
  const s = kit.stage();
  const main = colours.palette[0], inside = "#D6EFEA";
  const shade = (c, k) => `color-mix(in oklab, ${c}, #000000 ${k * 100}%)`;
  const heading = kit.text(root, props.heading, { x: safe.x, y: safe.y, size: kit.shape === "tall" ? 5.4 : 6, font: "heading", colour: colours.text, maxWidth: safe.width });

  // The plane is built pointing right, nose at (0, 0), one unit long, then scaled.
  const L = Math.min(safe.width * 0.3, safe.height * 0.55);
  const P = (x, y) => [x * L, y * L];
  const start = { x: safe.x + safe.width * 0.62, y: safe.y + safe.height * 0.72 };
  const shadow = kit.svg("ellipse", { cx: start.x - L * 0.5, cy: start.y + L * 0.32, rx: L * 0.5, ry: L * 0.05, fill: "#1F2328", opacity: 0.12, style: `filter:blur(${u}px)` }, s);
  const trail = kit.svg("path", { fill: "none", stroke: colours.muted, "stroke-width": u * 0.3, "stroke-dasharray": `${u * 1.2} ${u * 1.2}`, "stroke-linecap": "round", opacity: 0.6 }, s);
  const plane = kit.svg("g", {}, s);
  const inner = kit.svg("g", {}, plane);
  const nose = P(0, 0), tail = P(-1, -0.04);
  // The keel: the folded body under the wings.
  kit.svg("polygon", { points: [nose, tail, P(-0.86, 0.2)].map((p) => p.join(",")).join(" "), fill: shade(main, 0.45) }, inner);
  // Each wing starts open, mirrored below the centre fold, and turns up over it.
  // Open, we see the paper's pale inside; folded up, its coloured outside.
  const far = kit.fold(inner, { points: [nose, tail, P(-0.8, 0.5)], crease: [nose, tail], front: shade(inside, 0.12), back: shade(main, 0.25) });
  const near = kit.fold(inner, { points: [nose, tail, P(-1.04, 0.34)], crease: [nose, tail], front: inside, back: main });
  // A crisp fold line along the top.
  const crease = kit.svg("path", { d: `M${nose} L${tail}`, stroke: "#FFFFFF", "stroke-width": u * 0.2, opacity: 0 }, inner);

  // The flight: a gentle dip, then a climb out past the top right corner.
  const launch = Math.max(2.2, kit.at(0) + 1.6);
  const fly = (t) => {
    const p = kit.clamp((t - launch) / Math.max(1.2, kit.duration - launch - 0.2));
    const e = p * p;
    const x = start.x + e * (safe.width * 0.9) - Math.sin(p * Math.PI) * u * 4;
    const y = start.y + Math.sin(p * Math.PI * 0.9) * u * 6 - e * safe.height * 1.1;
    return { x, y };
  };

  return (t) => {
    heading.style.opacity = String(kit.progress(t, 0.1, 0.4));
    heading.style.translate = `0 ${(1 - kit.progress(t, 0.1, 0.4)) * u * 1.5}px`;
    far.set(kit.progress(t, 0.6, 0.5, "inOut"));
    near.set(kit.progress(t, 1.1, 0.5, "inOut"));
    crease.style.opacity = String(0.6 * kit.progress(t, 1.5, 0.2));
    const pos = fly(t);
    const ahead = fly(t + 0.05);
    const angle = t > launch ? (Math.atan2(ahead.y - pos.y, ahead.x - pos.x) * 180) / Math.PI : -4;
    // Before take-off it sits on the table and bobs once as the last wing lands.
    const settle = kit.spring(t - 1.5, { stiffness: 200, damping: 10 });
    plane.setAttribute("transform", `translate(${pos.x} ${pos.y - (t < launch ? (1 - settle) * u * 0.8 : 0)}) rotate(${kit.clamp(angle, -50, 30)})`);
    const lift = kit.clamp((t - launch) * 2);
    shadow.style.opacity = String(0.12 * (1 - lift));
    shadow.setAttribute("rx", String(L * 0.5 * (1 - lift * 0.5)));
    let d = "";
    for (let tt = launch; tt < t - 0.04; tt += 0.03) { const q = fly(tt); d += (d ? " L" : "M") + (q.x - L * 0.55).toFixed(1) + " " + (q.y + L * 0.05).toFixed(1); }
    trail.setAttribute("d", d);
  };
});
