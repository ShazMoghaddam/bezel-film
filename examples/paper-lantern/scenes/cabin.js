// Inside the cabin, all in cut paper: a wall with a window, hills sliding past outside,
// a paper lantern swaying gently and glowing, and a cup of tea steaming on the table.
Bezel.scene((root, kit) => {
  const { u, safe, colours, props, width, height } = kit;
  const s = kit.stage();
  const warm = colours.accent;
  const wide = kit.shape === "wide";

  // Outside the window: sky, a moon and two layers of hills, moving at different speeds.
  const wx = wide ? safe.x + safe.width * 0.3 : safe.x + safe.width * 0.1, ww = wide ? safe.width * 0.42 : safe.width * 0.8;
  const wy = safe.y + safe.height * 0.2, wh = safe.height * 0.5, r = u * 4;
  const win = `M${wx + r} ${wy} H${wx + ww - r} Q${wx + ww} ${wy} ${wx + ww} ${wy + r} V${wy + wh - r} Q${wx + ww} ${wy + wh} ${wx + ww - r} ${wy + wh} H${wx + r} Q${wx} ${wy + wh} ${wx} ${wy + wh - r} V${wy + r} Q${wx} ${wy} ${wx + r} ${wy} Z`;
  kit.svg("rect", { x: wx, y: wy, width: ww, height: wh, fill: "#1A2550" }, s);
  kit.glow(s, { cx: wx + ww * 0.75, cy: wy + wh * 0.25, r: u * 16, colour: "#FFD59A", strength: 0.4 });
  kit.svg("circle", { cx: wx + ww * 0.75, cy: wy + wh * 0.25, r: u * 2.4, fill: "#FFE9C4" }, s);
  const hills = (top, amp, seed, span) => {
    const rand = kit.random(seed);
    let d = `M${wx - u * 5} ${wy + wh + u * 5} L${wx - u * 5} ${top}`;
    for (let x = wx - u * 5; x < wx + span; x += u * 14) d += ` Q${x + u * 7} ${top - amp * (0.4 + rand())} ${x + u * 14} ${top + (rand() - 0.5) * amp * 0.3}`;
    return d + ` L${wx + span} ${wy + wh + u * 5} Z`;
  };
  const back = kit.svg("path", { d: hills(wy + wh * 0.62, u * 6, 3, ww * 4), fill: "#2A3A72" }, s);
  const near = kit.svg("path", { d: hills(wy + wh * 0.82, u * 4, 8, ww * 6), fill: "#101838" }, s);

  // The wall: warm, lamp-lit paper with the window cut out of it.
  const wall = kit.cutout(s, `M0 0 H${width} V${height} H0 Z ` + win, { fill: "#3B2A44", shadow: 0.6, lift: u * 0.8, shadowColour: "4 4 14" });
  wall.shape.setAttribute("fill-rule", "evenodd");
  // Window frame and a little curtain on each side.
  kit.svg("path", { d: win, fill: "none", stroke: "#5A3F52", "stroke-width": u * 1.4 }, s);
  [0, 1].forEach((side) => {
    const x = side ? wx + ww : wx, dir = side ? -1 : 1;
    kit.cutout(s, `M${x - dir * u * 2} ${wy - u * 2} Q${x + dir * u * 7} ${wy + wh * 0.3} ${x + dir * u * 3} ${wy + wh * 0.62} L${x - dir * u * 3} ${wy + wh * 0.62} Z`, { fill: "#7A3B3F", shadow: 0.45, lift: u * 0.6, shadowColour: "8 4 10" });
  });
  // The floor and a bed with its blanket, bottom left; a table and cup, bottom right.
  const floor = safe.y + safe.height * 0.98;
  kit.cutout(s, `M0 ${floor} H${width} V${height} H0 Z`, { fill: "#21182C", shadow: 0.5, shadowColour: "4 4 14" });
  kit.cutout(s, `M${-u * 4} ${floor} V${wy + wh + u * 4} Q${safe.x + safe.width * 0.12} ${wy + wh - u * 2} ${safe.x + safe.width * 0.26} ${wy + wh + u * 5} L${safe.x + safe.width * 0.28} ${floor} Z`, { fill: "#2D5A6B", shadow: 0.5, lift: u * 0.8, shadowColour: "4 4 14" });
  kit.cutout(s, `M${-u * 4} ${wy + wh + u * 6} Q${safe.x + safe.width * 0.1} ${wy + wh + u * 1} ${safe.x + safe.width * 0.14} ${wy + wh + u * 7} Q${safe.x + safe.width * 0.06} ${wy + wh + u * 9} ${-u * 4} ${wy + wh + u * 10} Z`, { fill: "#E9D9C2", shadow: 0.4, lift: u * 0.5, shadowColour: "4 4 14" });
  const tx = safe.x + safe.width * 0.84, ty = floor - u * 15;
  kit.cutout(s, `M${tx - u * 9} ${ty} H${tx + u * 9} V${ty + u * 1.6} H${tx + u * 7} V${floor} H${tx + u * 5.6} V${ty + u * 1.6} H${tx - u * 5.6} V${floor} H${tx - u * 7} V${ty + u * 1.6} H${tx - u * 9} Z`, { fill: "#5A3F52", shadow: 0.5, lift: u * 0.6, shadowColour: "4 4 14" });
  const cup = `M${tx - u * 3} ${ty - u * 5} H${tx + u * 2} V${ty - u * 1.2} Q${tx + u * 2} ${ty} ${tx + u * 0.8} ${ty} H${tx - u * 1.8} Q${tx - u * 3} ${ty} ${tx - u * 3} ${ty - u * 1.2} Z M${tx + u * 2} ${ty - u * 4.2} a${u * 1.4} ${u * 1.4} 0 0 1 0 ${u * 2.8} v${-u * 0.8} a${u * 0.6} ${u * 0.6} 0 0 0 0 ${-u * 1.2} Z`;
  kit.cutout(s, cup, { fill: "#E9D9C2", shadow: 0.4, lift: u * 0.4, shadowColour: "4 4 14" });
  const steam = [0, 1, 2].map((i) => kit.svg("path", { d: `M${tx - u * 1.8 + i * u * 1.3} ${ty - u * 6} q${u * 1.2} ${-u * 2} 0 ${-u * 4} q${-u * 1.2} ${-u * 2} 0 ${-u * 4}`, fill: "none", stroke: "#E9D9C2", "stroke-width": u * 0.35, "stroke-linecap": "round", opacity: 0 }, s));

  // The paper lantern: ribs on a glowing body, hanging on a cord.
  const lx = wide ? safe.x + safe.width * 0.88 : safe.x + safe.width * 0.82, ly = safe.y + safe.height * 0.12;
  const lamp = kit.svg("g", {}, s);
  const glow = kit.glow(lamp, { cx: lx, cy: ly + u * 12, r: u * 30, colour: "#FFB547", strength: 0.55 });
  kit.svg("path", { d: `M${lx} ${-u * 2} V${ly + u * 6}`, stroke: "#1A1222", "stroke-width": u * 0.3 }, lamp);
  kit.svg("ellipse", { cx: lx, cy: ly + u * 12, rx: u * 5.5, ry: u * 6.5, fill: "#FFC56B" }, lamp);
  [-0.6, -0.2, 0.2, 0.6].forEach((k) => kit.svg("path", { d: `M${lx + k * u * 5.5 * 0.9} ${ly + u * 6.3} Q${lx + k * u * 7.5} ${ly + u * 12} ${lx + k * u * 5.5 * 0.9} ${ly + u * 17.7}`, fill: "none", stroke: "#D98A2B", "stroke-width": u * 0.25 }, lamp));
  kit.svg("rect", { x: lx - u * 2.2, y: ly + u * 5.4, width: u * 4.4, height: u * 1.2, fill: "#2A1E30" }, lamp);
  kit.svg("rect", { x: lx - u * 2.2, y: ly + u * 17.6, width: u * 4.4, height: u * 1.2, fill: "#2A1E30" }, lamp);

  const caption = kit.text(root, props.caption, { x: safe.x, y: safe.y, size: wide ? 4.6 : 4.2, font: "heading", colour: colours.text, maxWidth: wide ? safe.width * 0.62 : safe.width * 0.7, style: { textWrap: "balance" } });

  return (t) => {
    back.setAttribute("transform", `translate(${-t * u * 3} 0)`);
    near.setAttribute("transform", `translate(${-t * u * 9} 0)`);
    lamp.setAttribute("transform", `rotate(${Math.sin(t * 1.6) * 3} ${lx} 0)`);
    // The flame inside flickers a little, by seeded chance every few frames.
    const fl = kit.random(Math.floor(t * 10) + 1);
    glow.style.opacity = String(0.85 + fl() * 0.15);
    steam.forEach((p, i) => {
      const ph = ((t * 0.6 + i / 3) % 1);
      p.style.opacity = String(Math.sin(ph * Math.PI) * 0.55 * kit.progress(t, 0.6, 0.5));
      p.setAttribute("transform", `translate(0 ${-ph * u * 2.5})`);
    });
    const c = kit.progress(t, 0.4, 0.8);
    caption.style.opacity = String(c);
    caption.style.translate = `0 ${(1 - c) * u * 1.5}px`;
  };
});
