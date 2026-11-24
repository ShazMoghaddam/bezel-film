// The payoff: our character sits back in a mid-century armchair with the cup, hearts
// pop out of it, and "Enjoy!" bounces in.
Bezel.scene((root, kit) => {
  const { u, safe, colours, props } = kit;
  const s = kit.stage();
  const P = colours.palette, ink = colours.text;
  const tint = (c, k) => `color-mix(in srgb, ${c} ${k * 100}%, ${colours.background})`;
  const floor = safe.y + safe.height * 0.88;
  kit.svg("rect", { x: 0, y: floor, width: kit.width, height: kit.height, fill: tint(P[2], 0.25) }, s);
  // A window with a sun, flat blocks only.
  const wx = safe.x + safe.width * 0.62, wy = safe.y + safe.height * 0.08, ww = safe.width * 0.26, wh = safe.height * 0.42;
  kit.svg("rect", { x: wx, y: wy, width: ww, height: wh, fill: tint(P[3], 0.35), stroke: ink, "stroke-width": u * 0.5 }, s);
  kit.svg("circle", { cx: wx + ww * 0.7, cy: wy + wh * 0.35, r: wh * 0.16, fill: P[2] }, s);
  kit.svg("path", { d: `M${wx + ww / 2} ${wy} v${wh} M${wx} ${wy + wh / 2} h${ww}`, stroke: ink, "stroke-width": u * 0.5 }, s);
  // The armchair: a tilted seat on thin splayed legs.
  const cx = safe.x + safe.width * 0.36;
  const chair = kit.svg("g", {}, s);
  kit.svg("path", { d: `M${cx - u * 18} ${floor} l${u * 4} ${-u * 10} M${cx + u * 18} ${floor} l${-u * 4} ${-u * 10}`, stroke: ink, "stroke-width": u * 0.8, "stroke-linecap": "round" }, chair);
  kit.svg("rect", { x: cx - u * 20, y: floor - u * 16, width: u * 40, height: u * 7, rx: u * 3, fill: P[1], stroke: ink, "stroke-width": u * 0.45 }, chair);
  kit.svg("rect", { x: cx - u * 22, y: floor - u * 36, width: u * 10, height: u * 26, rx: u * 4, fill: P[1], stroke: ink, "stroke-width": u * 0.45, transform: `rotate(-12 ${cx - u * 17} ${floor - u * 16})` }, chair);
  const hero = kit.toon(s, { x: cx + u * 2, y: floor - u * 9, height: safe.height * 0.46, colour: colours.surface, kind: "flat", face: "happy" }).pose("sit");
  const cup = kit.svg("g", {}, s);
  kit.svg("rect", { x: -u * 2.2, y: -u * 3, width: u * 4.4, height: u * 4.4, rx: u * 0.8, fill: P[0], stroke: ink, "stroke-width": u * 0.35 }, cup);
  const hearts = [0, 1, 2].map((i) => kit.svg("path", { d: `M0 ${u * 0.9} C${-u * 2.6} ${-u * 1} ${-u * 1} ${-u * 2.6} 0 ${-u * 1} C${u * 1} ${-u * 2.6} ${u * 2.6} ${-u * 1} 0 ${u * 0.9} Z`, fill: P[1], stroke: ink, "stroke-width": u * 0.25 }, s));
  const title = kit.text(root, props.title.toUpperCase(), { x: wx + ww / 2, y: wy + wh + u * 5, size: 13, font: "heading", align: "center", colour: P[0] });

  return (t0) => {
    const t = kit.stepped(t0, 12);
    const sip = Math.floor(t * 2) % 2;
    hero.pose("sit", { lean: -6, head: -8, ls: 16, le: 50, rs: 150, re: 30, lh: 86, lk: -86, rh: 90, rk: -90 }, t > 0.6 ? sip * 0.6 : 0).face(t > 0.6 && !sip ? "happy" : "neutral");
    const hand = hero.hand("right");
    cup.setAttribute("transform", `translate(${hand.x} ${hand.y})`);
    hearts.forEach((h, i) => {
      const k = ((t - 0.8 - i * 0.35) % 1.2) / 1.2;
      const on = t > 0.8 + i * 0.35;
      h.setAttribute("transform", `translate(${hand.x + u * 3 + i * u * 2} ${hand.y - u * 4 - k * u * 12}) scale(${on ? 1 - k * 0.3 : 0})`);
      h.style.opacity = String(on ? 1 - k : 0);
    });
    const b = kit.spring(t - 0.8, { stiffness: 260, damping: 10 });
    title.style.transform = `scale(${Math.max(0, b)}) rotate(${-5 + Math.sin(t * 6) * 2}deg)`;
  };
});
