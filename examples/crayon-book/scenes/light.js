// How it works, drawn like a child's diagram: the Sun on the left shines across, the
// Earth sits in the middle, and the Moon travels round it. The half of the Moon facing
// the Sun is always coloured in.
Bezel.scene((root, kit) => {
  const { u, safe, colours, props } = kit;
  const s = kit.stage();
  const plan = kit.drawing();
  const wax = { fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round", filter: "url(#crayon)" };
  const [yellow, coral, green, blue] = colours.palette;
  const cream = colours.text;
  const circle = (x, y, r) => `M${x - r} ${y} a${r} ${r} 0 1 0 ${r * 2} 0 a${r} ${r} 0 1 0 ${-r * 2} 0 Z`;
  const crayonFill = (opts) => { const f = kit.scribble(s, opts); f.group.setAttribute("filter", "url(#crayon)"); return f; };

  const mid = safe.y + safe.height * 0.52;
  // The Sun, big and orange-gold, half off the left of the page.
  const sx = safe.x + safe.width * 0.06, sr = Math.min(safe.height * 0.24, u * 22);
  const sunWash = kit.svg("circle", { cx: sx, cy: mid, r: sr * 1.8, fill: "#7A5A3A", filter: "url(#wash)", opacity: 0 }, s);
  const sun = crayonFill({ d: circle(sx, mid, sr), colour: "#FFB347", gap: u * 0.94, width: u * 1.89, angle: -30, seed: 1 });
  const sunCore = crayonFill({ d: circle(sx, mid, sr * 0.62), colour: yellow, gap: u * 0.77, width: u * 1.62, angle: 30, seed: 2 });
  const sunEdge = kit.svg("path", { d: kit.rough.ellipse(sx, mid, sr, sr, { seed: 4, wobble: 0.6 }), ...wax, stroke: "#FFB347", "stroke-width": u * 0.7 }, s);

  // Rays of light across to the right, drawn as wavy crayon lines.
  const rays = [-0.6, -0.2, 0.2, 0.6].map((k, i) => {
    const y = mid + k * sr * 1.2, x1 = sx + sr * 1.25, x2 = safe.x + safe.width * 0.42;
    let d = `M${x1} ${y}`;
    for (let x = x1; x < x2; x += u * 4) d += ` q${u * 1} ${-u * 1.2} ${u * 2} 0 t${u * 2} 0`;
    return kit.svg("path", { d, ...wax, stroke: yellow, "stroke-width": u * 0.45, opacity: 0.85 }, s);
  });

  // The Earth, with blue sea and green land, and the Moon's path around it.
  const ex = safe.x + safe.width * 0.66, er = Math.min(safe.height * 0.13, u * 11);
  const orbitR = Math.min(safe.height * 0.38, safe.width * 0.22);
  const orbit = kit.svg("path", { d: kit.rough.ellipse(ex, mid, orbitR, orbitR * 0.9, { seed: 8, wobble: 0.4 }), ...wax, stroke: colours.muted, "stroke-width": u * 0.35, "stroke-dasharray": `${u * 1.6} ${u * 1.4}` }, s);
  const sea = crayonFill({ d: circle(ex, mid, er), colour: blue, gap: u * 0.68, width: u * 1.49, angle: -20, seed: 5 });
  const land = crayonFill({ d: `M${ex - er * 0.6} ${mid - er * 0.5} q${er * 0.5} ${-er * 0.4} ${er * 0.8} ${er * 0.1} q${-er * 0.1} ${er * 0.5} ${er * 0.5} ${er * 0.7} q${-er * 0.4} ${er * 0.6} ${-er * 0.9} ${er * 0.3} q${-er * 0.5} ${-er * 0.4} ${-er * 0.4} ${-er * 1.1} Z`, colour: green, gap: u * 0.51, width: u * 1.22, angle: 50, seed: 6 });
  const earthEdge = kit.svg("path", { d: kit.rough.ellipse(ex, mid, er, er, { seed: 9, wobble: 0.5 }), ...wax, stroke: cream, "stroke-width": u * 0.45 }, s);

  // The Moon, built at (0, 0) and moved along its path: a dark disc with the half that
  // faces the Sun (the left) coloured in.
  const mr = er * 0.55;
  const moon = kit.svg("g", {}, s);
  const dark = kit.scribble(moon, { d: circle(0, 0, mr), colour: "#56628A", gap: u * 0.51, width: u * 1.22, angle: 30, seed: 7 });
  const lit = kit.scribble(moon, { d: `M0 ${-mr} A${mr} ${mr} 0 0 0 0 ${mr} Z`, colour: "#FFE28A", gap: u * 0.47, width: u * 1.22, angle: -40, seed: 8 });
  [dark, lit].forEach((f) => f.group.setAttribute("filter", "url(#crayon)"));
  kit.svg("path", { d: kit.rough.ellipse(0, 0, mr, mr, { seed: 3, wobble: 0.4 }), ...wax, stroke: cream, "stroke-width": u * 0.35 }, moon);

  const label = (txt, x, y, colour, align = "center") => kit.text(root, txt, { x, y, size: 4.2, font: "heading", align, colour });
  const sunLabel = label(props.sun, sx + sr * 0.35, mid + sr + u * 2, yellow, "left");
  const earthLabel = label(props.earth, ex, mid + er + u * 1.2, cream);
  // Built at (0, 0) and moved round with the Moon, so it mustn't shrink to fit where it starts.
  const moonLabel = kit.text(root, props.moon, { x: 0, y: 0, size: 4.2, font: "heading", align: "center", colour: cream, fit: false });
  const note = kit.text(root, props.note, { x: safe.x + safe.width, y: safe.y, size: 5, font: "heading", align: "right", colour: coral });

  plan.line(sunEdge, { at: 0.2, duration: 0.6 });
  plan.write(sunLabel, { at: 0.9, duration: 0.4 });
  plan.sequence(1.2, rays.map((r) => ({ node: r, duration: 0.35 })), 0.05);
  plan.line(earthEdge, { at: 1.1, duration: 0.5 });
  plan.write(earthLabel, { at: 1.7, duration: 0.5 });
  plan.line(orbit, { at: 2.0, duration: 1.0 });
  plan.write(note, { at: Math.max(2.4, kit.at(0) + 1.8), duration: 1.0 });

  return (t) => {
    const boil = Math.floor(kit.stepped(t, 8) * 8) % 3;
    document.querySelectorAll("#crayon feTurbulence").forEach((f, i) => f.setAttribute("seed", String(5 + boil * 7 + i)));
    sunWash.style.opacity = String(0.7 * kit.progress(t, 0.3, 1));
    sun.set(kit.progress(t, 0.3, 0.8, "inOut"));
    sunCore.set(kit.progress(t, 0.7, 0.6, "inOut"));
    sea.set(kit.progress(t, 1.2, 0.6));
    land.set(kit.progress(t, 1.6, 0.4));
    // The Moon goes round on twos, starting at the top of its path.
    const go = kit.stepped(Math.max(0, t - 2.6), 12);
    const a = -Math.PI / 2 - go * 0.55;
    const x = ex + Math.cos(a) * orbitR, y = mid + Math.sin(a) * orbitR * 0.9;
    moon.setAttribute("transform", `translate(${x} ${y})`);
    const show = kit.progress(t, 2.6, 0.3);
    moon.style.opacity = String(show);
    dark.set(kit.progress(t, 2.6, 0.4));
    lit.set(kit.progress(t, 2.9, 0.5));
    moonLabel.style.left = x + "px";
    moonLabel.style.top = y + mr + u * 0.6 + "px";
    moonLabel.style.opacity = String(kit.progress(t, 3.0, 0.3));
    plan.draw(t);
  };
});
