// The cover: a night sky drawn in crayon. Stars are drawn in, the Moon is outlined and
// scribbled yellow, a little house sits on a hill, and the title writes itself.
Bezel.scene((root, kit) => {
  const { u, safe, colours, props, width } = kit;
  const s = kit.stage();
  const plan = kit.drawing();
  const wax = { fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round", filter: "url(#crayon)" };
  const yellow = colours.palette[0], coral = colours.palette[1], cream = colours.text;
  const circle = (x, y, r) => `M${x - r} ${y} a${r} ${r} 0 1 0 ${r * 2} 0 a${r} ${r} 0 1 0 ${-r * 2} 0 Z`;
  const star = (x, y, r) => Array.from({ length: 10 }, (_, k) => { const a = -Math.PI / 2 + (k * Math.PI) / 5, q = k % 2 ? r * 0.45 : r; return (k ? "L" : "M") + (x + Math.cos(a) * q).toFixed(1) + " " + (y + Math.sin(a) * q).toFixed(1); }).join(" ") + " Z";

  // A soft watercolour glow behind the Moon.
  const wideFrame = kit.shape === "wide";
  const mr = wideFrame ? Math.min(safe.height * 0.17, u * 15) : Math.min(safe.height * 0.09, safe.width * 0.14);
  const mx = safe.x + safe.width * (wideFrame ? 0.8 : 0.82), my = wideFrame ? safe.y + safe.height * 0.26 : safe.y + mr + u * 2;
  const wash = kit.svg("circle", { cx: mx, cy: my, r: mr * 2.1, fill: "#3A4C86", filter: "url(#wash)", opacity: 0 }, s);

  // Stars: a few crayon stars and many dots, placed by a seeded random so they never move.
  const rand = kit.random(12);
  const stars = [];
  for (let i = 0; i < 26; i++) {
    const x = safe.x + rand() * safe.width, y = safe.y + rand() * safe.height * 0.62;
    if (Math.hypot(x - mx, y - my) < mr * 1.6) continue;
    const big = i % 4 === 0;
    const node = kit.svg("path", { d: big ? star(x, y, u * 1.6) : kit.rough.line(x - u * 0.3, y, x + u * 0.3, y + u * 0.2, { seed: i }), ...wax, stroke: big ? yellow : cream, "stroke-width": big ? u * 0.45 : u * 0.6 }, s);
    stars.push(node);
  }
  const moonEdge = kit.svg("path", { d: kit.rough.ellipse(mx, my, mr, mr, { seed: 3, wobble: 0.5 }), ...wax, stroke: "#FFE28A", "stroke-width": u * 0.8 }, s);
  const moonFill = kit.scribble(s, { d: circle(mx, my, mr * 0.96), colour: yellow, gap: u * 0.77, width: u * 1.49, angle: -35, seed: 4 });
  moonFill.group.setAttribute("filter", "url(#crayon)");
  // Two craters, scribbled a darker gold.
  const craters = [[-0.3, -0.2, 0.2], [0.25, 0.3, 0.14]].map(([dx, dy, k], i) => {
    const c = kit.scribble(s, { d: circle(mx + dx * mr, my + dy * mr, k * mr), colour: "#D9A520", gap: u * 0.51, width: u * 1.08, angle: 40, seed: 9 + i });
    c.group.setAttribute("filter", "url(#crayon)");
    return c;
  });

  // The hill and the house, bottom left.
  const hillTop = safe.y + safe.height * 0.84;
  const hillD = `M${safe.x - u * 6} ${safe.y + safe.height + u * 2} L${safe.x - u * 6} ${hillTop} Q${safe.x + safe.width * 0.3} ${hillTop - u * 9} ${safe.x + safe.width * 0.62} ${hillTop + u * 2} Q${safe.x + safe.width * 0.85} ${hillTop + u * 6} ${safe.x + safe.width + u * 6} ${hillTop + u * 3} L${safe.x + safe.width + u * 6} ${safe.y + safe.height + u * 2} Z`;
  const hill = kit.scribble(s, { d: hillD, colour: "#4F6B9E", gap: u * 1.02, width: u * 1.89, angle: -12, seed: 2 });
  hill.group.setAttribute("filter", "url(#crayon)");
  const hx = safe.x + safe.width * (wideFrame ? 0.2 : 0.7), hy = hillTop - u * 5, hw = u * 14, hh = u * 10;
  const houseD = `M${hx} ${hy} V${hy - hh} H${hx + hw} V${hy} Z`;
  const roofD = `M${hx - u * 2} ${hy - hh} L${hx + hw / 2} ${hy - hh - u * 8} L${hx + hw + u * 2} ${hy - hh} Z`;
  const house = kit.scribble(s, { d: houseD, colour: "#C9C3D8", gap: u * 0.77, width: u * 1.49, angle: 70, seed: 5 });
  const roof = kit.scribble(s, { d: roofD, colour: coral, gap: u * 0.68, width: u * 1.49, angle: -20, seed: 6 });
  const windowD = `M${hx + hw * 0.55} ${hy - hh * 0.75} h${u * 4} v${u * 3.6} h${-u * 4} Z`;
  const win = kit.scribble(s, { d: windowD, colour: yellow, gap: u * 0.42, width: u * 1.08, angle: 0, seed: 7 });
  [house, roof, win].forEach((p) => p.group.setAttribute("filter", "url(#crayon)"));
  const outline = kit.svg("path", { d: kit.rough.rect(hx, hy - hh, hw, hh, { seed: 2, wobble: 0.5 }) + " " + kit.rough.line(hx - u * 2, hy - hh, hx + hw / 2, hy - hh - u * 8, { seed: 3 }) + " " + kit.rough.line(hx + hw / 2, hy - hh - u * 8, hx + hw + u * 2, hy - hh, { seed: 4 }), ...wax, stroke: cream, "stroke-width": u * 0.5 }, s);

  // The title, written in by hand.
  const textTop = wideFrame ? safe.y + safe.height * 0.12 : my + mr + u * 5;
  const kicker = kit.text(root, props.kicker, { x: safe.x, y: textTop, size: 3.6, colour: coral, font: "heading", style: { filter: "url(#crayon)" } });
  const title = kit.text(root, props.title, { x: safe.x, y: textTop + safe.height * 0.08, size: wideFrame ? 10.5 : 8, font: "heading", colour: cream, maxWidth: safe.width * (wideFrame ? 0.62 : 0.66), style: { lineHeight: "1.02" } });

  plan.sequence(0.2, stars.slice(0, 10).map((n) => ({ node: n, duration: 0.08 })), 0.02);
  plan.line(moonEdge, { at: 0.7, duration: 0.7 });
  plan.write(kicker, { at: 0.5, duration: 0.6 });
  plan.write(title, { at: 1.0, duration: 1.6 });
  plan.sequence(1.6, stars.slice(10).map((n) => ({ node: n, duration: 0.06 })), 0.02);
  plan.line(outline, { at: 2.2, duration: 1.0 });

  return (t) => {
    // Crayon lines "boil" a little, redrawn every other frame like a hand-made film.
    const boil = Math.floor(kit.stepped(t, 8) * 8) % 3;
    document.querySelectorAll("#crayon feTurbulence").forEach((f, i) => f.setAttribute("seed", String(5 + boil * 7 + i)));
    wash.style.opacity = String(0.8 * kit.progress(t, 0.9, 1.2));
    moonFill.set(kit.progress(t, 1.3, 1.2, "inOut"));
    craters.forEach((c, i) => c.set(kit.progress(t, 2.3 + i * 0.2, 0.4)));
    hill.set(kit.progress(t, 1.6, 1.0, "inOut"));
    house.set(kit.progress(t, 2.6, 0.5));
    roof.set(kit.progress(t, 2.9, 0.5));
    win.set(kit.progress(t, 3.3, 0.3));
    // Stars twinkle by growing and shrinking a touch, on twos.
    const st = kit.stepped(t, 12);
    stars.forEach((n, i) => (n.style.opacity = String(0.75 + 0.25 * Math.sin(st * 3 + i))));
    plan.draw(t);
  };
});
