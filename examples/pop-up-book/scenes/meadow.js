// A meadow springs up layer by layer, then a bee zigzags from flower to flower, leaving
// a dotted trail, and heads off home. A paper pull tab slides along as she flies.
Bezel.scene((root, kit) => {
  const { u, safe, colours, props, width } = kit;
  const s = kit.stage();
  const ink = colours.text, rim = "#FFFFFF";
  const base = safe.y + safe.height * 0.97;
  const left = safe.x - u * 4, right = safe.x + safe.width + u * 4;
  const hills = (top, amp, bumps, seed) => {
    const rand = kit.random(seed);
    let d = `M${left} ${base} L${left} ${top}`;
    const step = (right - left) / bumps;
    for (let i = 0; i < bumps; i++) d += ` Q${left + step * (i + 0.5)} ${top - amp * (1.2 + rand() * 1.2)} ${left + step * (i + 1)} ${top + (rand() - 0.5) * amp * 0.3}`;
    return d + ` L${right} ${base} Z`;
  };
  const circle = (x, y, r) => `M${x - r} ${y} a${r} ${r} 0 1 0 ${r * 2} 0 a${r} ${r} 0 1 0 ${-r * 2} 0 Z `;

  const back = kit.popup(s, { base, x: width / 2 });
  kit.cutout(back.group, hills(safe.y + safe.height * 0.5, u * 4, 3, 4), { fill: "#A9CF8E", edge: rim });
  // A small cloud on the back card.
  const cx0 = safe.x + safe.width * 0.62, cy0 = safe.y + safe.height * 0.16;
  kit.cutout(back.group, circle(cx0, cy0, u * 4) + circle(cx0 + u * 5, cy0 - u * 2, u * 5) + circle(cx0 + u * 10, cy0, u * 4) + `M${cx0} ${cy0} V${cy0 + u * 4} H${cx0 + u * 10} V${cy0} Z`, { fill: "#FFFFFF", edge: rim });
  kit.cutout(back.group, `M${cx0 + u * 4.4} ${cy0 + u * 3} h${u * 1.2} V${safe.y + safe.height * 0.45} h${-u * 1.2} Z`, { fill: "#E8E1D2", shadow: 0 });
  const mid = kit.popup(s, { base, x: width / 2 });
  kit.cutout(mid.group, hills(safe.y + safe.height * 0.72, u * 3, 4, 9), { fill: "#5DA36A", edge: rim });

  // Four flowers, each on its own pop-up stalk.
  const flowers = [[0.14, 0.52, "#C8412A"], [0.36, 0.4, "#7A4FA3"], [0.58, 0.56, "#2B6CB0"], [0.8, 0.44, "#B35A06"]].map(([fx, fy, colour], i) => {
    const x = safe.x + safe.width * fx, y = safe.y + safe.height * fy, r = u * 4.2;
    const p = kit.popup(s, { base, x });
    kit.cutout(p.group, `M${x - u * 0.7} ${y} h${u * 1.4} V${base} h${-u * 1.4} Z M${x} ${base - u * 6} q${u * 5} ${-u * 3} ${u * 7} ${-u * 7} q${-u * 5} 0 ${-u * 7} ${u * 7} Z`, { fill: "#3E7D4C", edge: rim, edgeWidth: u * 0.4 });
    let petals = "";
    for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2 + i; petals += circle(x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.66); }
    kit.cutout(p.group, petals, { fill: colour, edge: rim, edgeWidth: u * 0.5 });
    kit.cutout(p.group, circle(x, y, r * 0.6), { fill: "#F2C14E", shadow: 0 });
    return { pop: p, x, y: y - r * 1.9, at: 0.5 + i * 0.25 };
  });

  // The bee: our own simple drawing, a striped body with two wings.
  const bee = kit.svg("g", {}, s);
  const bs = u * 3.2;
  kit.svg("ellipse", { cx: 0, cy: 0, rx: bs * 1.3, ry: bs * 0.95, fill: "#F2B705", stroke: ink, "stroke-width": u * 0.3 }, bee);
  [-0.3, 0.3].forEach((k) => kit.svg("path", { d: `M${k * bs * 1.3} ${-bs * 0.9} q${bs * 0.3} ${bs * 0.9} 0 ${bs * 1.8}`, fill: "none", stroke: ink, "stroke-width": bs * 0.32, "stroke-linecap": "round" }, bee));
  kit.svg("circle", { cx: bs * 0.75, cy: -bs * 0.2, r: bs * 0.14, fill: ink }, bee);
  const wings = [-1, 1].map((k) => kit.svg("ellipse", { cx: -bs * 0.2 * k, cy: -bs * 0.9, rx: bs * 0.55, ry: bs * 0.85, fill: "#FFFFFF", stroke: ink, "stroke-width": u * 0.25 }, bee));
  wings.forEach((w) => w.setAttribute("opacity", "0.88"));
  bee.style.filter = `drop-shadow(${u * 0.3}px ${u * 0.8}px ${u * 0.6}px rgb(29 24 18 / .25))`;

  // Where the bee is at any moment: in from the left, a short hover at each flower,
  // then up and away to the right.
  const start = 1.4, hop = Math.max(0.7, (kit.duration - start - 1.6) / flowers.length - 0.45), hover = 0.45;
  const stops = [{ x: safe.x - u * 8, y: safe.y + safe.height * 0.3 }, ...flowers, { x: safe.x + safe.width + u * 10, y: safe.y + safe.height * 0.08 }];
  const where = (t) => {
    let at = start;
    for (let i = 0; i < stops.length - 1; i++) {
      const a = stops[i], b = stops[i + 1];
      if (t < at + hop) {
        const p = kit.ease.inOut(kit.clamp((t - at) / hop));
        // A little arc up between flowers, as a bee lifts off and drops in.
        return { x: kit.lerp(a.x, b.x, p), y: kit.lerp(a.y, b.y, p) - Math.sin(p * Math.PI) * u * 7, dir: b.x >= a.x ? 1 : -1 };
      }
      at += hop;
      if (i < stops.length - 2 && t < at + hover) return { x: b.x, y: b.y + Math.sin((t - at) * 14) * u * 0.6, dir: 1 };
      if (i < stops.length - 2) at += hover;
    }
    return { x: stops[stops.length - 1].x, y: stops[stops.length - 1].y, dir: 1 };
  };
  // The dotted trail she leaves: the path so far, sampled from where().
  const trail = kit.svg("path", { fill: "none", stroke: ink, "stroke-width": u * 0.4, "stroke-linecap": "round", "stroke-dasharray": `0 ${u * 1.4}`, opacity: 0.5 }, s);
  s.insertBefore(trail, bee);

  // The caption on a card, and a paper pull tab at the bottom right.
  const caption = kit.text(root, props.caption, { x: safe.x, y: safe.y, size: 4, font: "heading", colour: ink,
    style: { background: "#FFFDF7", padding: `${u * 1.4}px ${u * 2.6}px`, borderRadius: `${u * 1.4}px`, boxShadow: `0 0 0 ${u * 0.6}px #FFFFFF, 0 ${u * 0.7}px ${u * 1.4}px rgb(29 24 18 / .22)` } });
  const tab = kit.text(root, props.tab + "  →", { x: safe.x + safe.width - u * 30, y: base - u * 5.5, size: 2.6, weight: 800, colour: "#FFFFFF",
    style: { background: colours.accent, padding: `${u * 0.9}px ${u * 2}px`, borderRadius: `${u * 0.6}px ${u * 2}px ${u * 2}px ${u * 0.6}px`, boxShadow: `0 ${u * 0.4}px ${u * 0.8}px rgb(29 24 18 / .25)`, letterSpacing: "0.08em", textTransform: "uppercase" } });

  const pop = (t, at) => kit.spring(t - at, { stiffness: 170, damping: 11 });
  return (t) => {
    back.set(pop(t, 0.05));
    mid.set(pop(t, 0.25));
    flowers.forEach((f) => f.pop.set(pop(t, f.at)));
    caption.style.opacity = String(kit.progress(t, 1.0, 0.3));
    caption.style.translate = `0 ${(1 - kit.progress(t, 1.0, 0.3)) * u * 2}px`;
    const p = where(t);
    const flap = Math.floor(t * 30) % 2 ? 1 : 0.45;
    wings.forEach((w) => w.setAttribute("transform", `translate(0 ${-u * 0.8}) scale(1 ${flap}) translate(0 ${u * 0.8})`));
    bee.setAttribute("transform", `translate(${p.x} ${p.y}) scale(${p.dir} 1) rotate(${-8 + Math.sin(t * 6) * 6})`);
    bee.style.opacity = t < start ? "0" : "1";
    let d = "";
    for (let tt = start; tt < t - 0.1; tt += 0.03) { const q = where(tt); d += (d ? " L" : "M") + q.x.toFixed(1) + " " + (q.y + bs * 0.3).toFixed(1); }
    trail.setAttribute("d", d);
    // The tab slides out as the bee travels.
    const along = kit.clamp((t - start) / (kit.duration - start - 0.4));
    tab.style.opacity = String(kit.progress(t, 1.2, 0.3));
    tab.style.transform = `translateX(${along * u * 8}px)`;
  };
});
