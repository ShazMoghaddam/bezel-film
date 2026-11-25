// A 1950s title card: a big starburst spins in behind a tilted panel with the title,
// and our coffee-cup character pops up beside it, waving. Everything moves on twos.
Bezel.scene((root, kit) => {
  const { u, safe, colours, props } = kit;
  const s = kit.stage();
  const P = colours.palette, ink = colours.text;
  const wide = kit.shape === "wide";
  const cx = safe.x + safe.width * (wide ? 0.42 : 0.4), cy = safe.y + safe.height * (wide ? 0.48 : 0.36);
  // Flat blocks: a wall and a floor, and a few mid-century shapes floating on the wall.
  kit.svg("rect", { x: 0, y: safe.y + safe.height * 0.82, width: kit.width, height: kit.height, fill: color(P[2], 0.25) }, s);
  const floaters = [[0.08, 0.18, P[0]], [0.86, 0.2, P[1]], [0.78, 0.7, P[3]], [0.12, 0.72, P[2]]].map(([fx, fy, c], i) =>
    kit.svg("path", { d: boomerang(safe.x + safe.width * fx, safe.y + safe.height * fy, u * 5), fill: c, opacity: 0.85 }, s));
  const burst = kit.svg("polygon", { points: star(cx, cy, safe.height * 0.46, safe.height * 0.3, 16), fill: color(P[2], 0.55) }, s);
  const panel = kit.svg("g", {}, s);
  const pw = Math.min(safe.width * (wide ? 0.52 : 0.72), u * 90), ph = u * 30;
  kit.svg("rect", { x: cx - pw / 2 + u, y: cy - ph / 2 + u, width: pw, height: ph, rx: u * 3, fill: ink }, panel);
  kit.svg("rect", { x: cx - pw / 2, y: cy - ph / 2, width: pw, height: ph, rx: u * 3, fill: P[0], stroke: ink, "stroke-width": u * 0.5 }, panel);
  const kicker = kit.text(root, props.kicker.toUpperCase(), { x: cx, y: cy - ph * 0.42, size: 3.6, font: "body", weight: 600, align: "center", colour: colours.surface, style: { letterSpacing: "0.2em" } });
  const title = kit.text(root, props.title.toUpperCase(), { x: cx, y: cy - ph * 0.26, size: 11, font: "heading", align: "center", colour: colours.surface });
  // Keep the title on its panel: shrink it if the panel is narrower than the words.
  const tw = title.getBoundingClientRect().width;
  if (tw > pw * 0.88) title.style.fontSize = `${(11 * u * pw * 0.88) / tw}px`;
  const sub = kit.text(root, props.sub, { x: cx, y: cy + ph * 0.62, size: 4.2, font: "body", weight: 600, align: "center", colour: ink });
  const words = [kicker, title];
  const heroX = wide ? cx + pw / 2 + u * 14 : safe.x + safe.width * 0.8;
  const hero = kit.toon(s, { x: heroX, y: safe.y + safe.height * 0.86, height: safe.height * (wide ? 0.5 : 0.3), colour: colours.surface, kind: "flat" });
  const mug = kit.svg("g", {}, s);
  kit.svg("rect", { x: -u * 2.2, y: -u * 2.6, width: u * 4.4, height: u * 4.2, rx: u * 0.8, fill: P[1], stroke: ink, "stroke-width": u * 0.35 }, mug);
  kit.svg("path", { d: `M${u * 2.2} ${-u * 1.8} a${u * 1.2} ${u * 1.2} 0 0 1 0 ${u * 2.2}`, fill: "none", stroke: ink, "stroke-width": u * 0.45 }, mug);

  return (t0) => {
    const t = kit.stepped(t0, 12);
    const b = kit.spring(t - 0.1, { stiffness: 140, damping: 13 });
    burst.setAttribute("transform", `rotate(${t * 8} ${cx} ${cy}) translate(${cx} ${cy}) scale(${Math.max(0, b)}) translate(${-cx} ${-cy})`);
    const p = kit.spring(t - 0.35, { stiffness: 220, damping: 13 });
    panel.setAttribute("transform", `translate(${cx} ${cy}) rotate(${-4 * p}) scale(${Math.max(0, p)}) translate(${-cx} ${-cy})`);
    for (const w of words) { w.style.opacity = String(kit.clamp(p * 3 - 1.5)); w.style.rotate = `${-4 * p}deg`; }
    sub.style.opacity = String(kit.progress(t, 1.6, 0.2));
    floaters.forEach((f, i) => f.setAttribute("transform", `translate(0 ${Math.sin(t * 2 + i) * u * 0.8})`));
    // The hero pops up from below, then waves on the beat.
    const h = kit.spring(t - 0.9, { stiffness: 260, damping: 14 });
    hero.move(heroX, safe.y + safe.height * 0.86 + (1 - h) * safe.height * 0.7);
    const wave = Math.floor(t * 4) % 2;
    hero.pose(t > 1.4 ? (wave ? "wave" : { ...{ lean: -2, head: -5, ls: -14, le: 4, rs: 150, re: 10 } }) : "stand");
    hero.squash(t > 0.9 && t < 1.3 ? 0.4 * Math.sin((t - 0.9) * Math.PI * 2.5) : 0);
    const hand = hero.hand("left");
    mug.setAttribute("transform", `translate(${hand.x} ${hand.y})`);
  };

  function color(c, k) { return `color-mix(in srgb, ${c} ${k * 100}%, ${colours.background})`; }
  function star(x, y, r1, r2, n) {
    return Array.from({ length: n * 2 }, (_, i) => { const a = (i / (n * 2)) * Math.PI * 2, r = i % 2 ? r2 : r1; return [x + Math.cos(a) * r, y + Math.sin(a) * r].join(","); }).join(" ");
  }
  function boomerang(x, y, r) {
    return `M${x - r * 1.6} ${y + r * 0.4} Q${x} ${y - r * 1.4} ${x + r * 1.6} ${y + r * 0.4} Q${x + r * 1.2} ${y + r * 0.7} ${x + r * 0.9} ${y + r * 0.3} Q${x} ${y - r * 0.5} ${x - r * 0.9} ${y + r * 0.3} Q${x - r * 1.2} ${y + r * 0.7} ${x - r * 1.6} ${y + r * 0.4} Z`;
  }
});
