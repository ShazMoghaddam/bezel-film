// One step: a big numeral and its name on the left; on the right, the step's prop
// (a grinder, a kettle or a clock) and our character doing it. Moves on twos.
Bezel.scene((root, kit) => {
  const { u, safe, colours, props } = kit;
  const s = kit.stage();
  const P = colours.palette, ink = colours.text;
  const accent = [P[0], P[1], P[3]][Number(props.number) - 1] || P[0];
  const tint = (c, k) => `color-mix(in srgb, ${c} ${k * 100}%, ${colours.background})`;
  const floor = safe.y + safe.height * 0.86;
  kit.svg("rect", { x: 0, y: floor, width: kit.width, height: kit.height, fill: tint(P[2], 0.25) }, s);
  // The counter: a flat block the prop sits on.
  const counterX = safe.x + safe.width * 0.5, counterW = safe.width * 0.3, counterTop = floor - safe.height * 0.3;
  kit.svg("rect", { x: counterX, y: counterTop, width: counterW, height: floor - counterTop, fill: tint(accent, 0.35), stroke: ink, "stroke-width": u * 0.4 }, s);
  kit.svg("rect", { x: counterX - u, y: counterTop - u * 1.6, width: counterW + u * 2, height: u * 1.6, fill: accent, stroke: ink, "stroke-width": u * 0.4 }, s);

  // The numeral in a circle, and the step's name on a tilted tag.
  const nr = Math.min(safe.height * 0.22, u * 17);
  const nx = safe.x + Math.max(nr + u * 2, safe.width * 0.2), ny = safe.y + safe.height * 0.36;
  const badge = kit.svg("g", {}, s);
  kit.svg("circle", { cx: nx + u * 0.8, cy: ny + u * 0.8, r: nr, fill: ink }, badge);
  kit.svg("circle", { cx: nx, cy: ny, r: nr, fill: accent, stroke: ink, "stroke-width": u * 0.5 }, badge);
  const numeral = kit.text(root, props.number, { x: nx, y: ny - nr * 0.62, size: (nr / u) * 1.1, font: "heading", align: "center", colour: colours.surface });
  const name = kit.text(root, props.title.toUpperCase(), { x: nx, y: ny + nr + u * 4, size: 6.2, font: "heading", align: "center", colour: ink, maxWidth: (nx - safe.x) * 2 - u * 2, style: { textWrap: "balance" } });

  // The prop, built from flat shapes on the counter.
  const prop = kit.svg("g", {}, s);
  const px = counterX + counterW * 0.5, py = counterTop - u * 1.6;
  const moving = [];
  if (props.prop === "grinder") {
    kit.svg("rect", { x: px - u * 6, y: py - u * 13, width: u * 12, height: u * 13, rx: u * 1.2, fill: P[5], stroke: ink, "stroke-width": u * 0.4 }, prop);
    kit.svg("rect", { x: px - u * 7, y: py - u * 15, width: u * 14, height: u * 2.4, rx: u * 0.8, fill: ink }, prop);
    const handle = kit.svg("g", {}, prop);
    kit.svg("path", { d: `M${px} ${py - u * 15} l0 ${-u * 3} l${u * 7} 0`, fill: "none", stroke: ink, "stroke-width": u * 0.7, "stroke-linecap": "round" }, handle);
    kit.svg("circle", { cx: px + u * 7, cy: py - u * 18, r: u * 1.3, fill: P[1], stroke: ink, "stroke-width": u * 0.35 }, handle);
    moving.push((t) => handle.setAttribute("transform", `rotate(${Math.floor(t * 8) * 45} ${px} ${py - u * 18})`));
    // Beans hop in from above.
    for (let i = 0; i < 5; i++) {
      const bean = kit.svg("ellipse", { rx: u * 1.1, ry: u * 1.5, fill: "#6B3E26", stroke: ink, "stroke-width": u * 0.25 }, prop);
      moving.push((t) => {
        const k = kit.clamp((t - 0.6 - i * 0.18) / 0.5);
        bean.setAttribute("cx", px - u * 5 + i * u * 2.5);
        bean.setAttribute("cy", py - u * 34 + k * u * 20);
        bean.style.opacity = k > 0 && k < 1 ? "1" : "0";
      });
    }
  } else if (props.prop === "kettle") {
    kit.svg("path", { d: `M${px - u * 8} ${py} L${px - u * 6} ${py - u * 12} L${px + u * 6} ${py - u * 12} L${px + u * 8} ${py} Z`, fill: P[3], stroke: ink, "stroke-width": u * 0.4, "stroke-linejoin": "round" }, prop);
    kit.svg("path", { d: `M${px + u * 6} ${py - u * 9} l${u * 6} ${-u * 5}`, stroke: ink, "stroke-width": u * 1.2, "stroke-linecap": "round" }, prop);
    kit.svg("path", { d: `M${px - u * 4} ${py - u * 12} q${u * 4} ${-u * 6} ${u * 8} 0`, fill: "none", stroke: ink, "stroke-width": u * 0.7 }, prop);
    // A thermometer beside it, rising to the reading.
    const tx = px - counterW * 0.42, tTop = py - u * 26, tBot = py - u * 3;
    kit.svg("rect", { x: tx - u * 1.4, y: tTop, width: u * 2.8, height: tBot - tTop, rx: u * 1.4, fill: colours.surface, stroke: ink, "stroke-width": u * 0.4 }, prop);
    kit.svg("circle", { cx: tx, cy: tBot + u * 1, r: u * 2.6, fill: P[1], stroke: ink, "stroke-width": u * 0.4 }, prop);
    const mercury = kit.svg("rect", { x: tx - u * 0.7, width: u * 1.4, rx: u * 0.7, fill: P[1] }, prop);
    const reading = kit.text(root, props.reading, { x: tx - u * 3.5, y: tTop - u * 1.5, size: 5, font: "heading", align: "right", colour: P[1] });
    reading.style.opacity = "0";
    moving.push((t) => {
      const k = kit.progress(t, 0.8, 1.2, "out");
      const top = tBot - (tBot - tTop - u * 2) * 0.85 * k;
      mercury.setAttribute("y", top);
      mercury.setAttribute("height", tBot - top + u);
      reading.style.opacity = String(kit.progress(t, 2.1, 0.1));
    });
    // Steam: two puffs that rise in steps.
    for (let i = 0; i < 2; i++) {
      const puff = kit.svg("circle", { r: u * 1.8, fill: colours.surface, stroke: ink, "stroke-width": u * 0.3 }, prop);
      moving.push((t) => {
        const k = ((t * 0.8 + i * 0.5) % 1);
        puff.setAttribute("cx", px + u * 12 + Math.sin(k * 6) * u);
        puff.setAttribute("cy", py - u * 15 - k * u * 10);
        puff.style.opacity = String(1 - k);
      });
    }
  } else {
    const r = u * 11, cx = px, cy = py - r - u * 1;
    kit.svg("circle", { cx: cx + u * 0.6, cy: cy + u * 0.6, r, fill: ink }, prop);
    kit.svg("circle", { cx, cy, r, fill: colours.surface, stroke: ink, "stroke-width": u * 0.5 }, prop);
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; kit.svg("circle", { cx: cx + Math.sin(a) * r * 0.8, cy: cy - Math.cos(a) * r * 0.8, r: u * 0.4, fill: ink }, prop); }
    const wedge = kit.svg("path", { fill: P[3], opacity: 0.8 }, prop);
    const hand = kit.svg("line", { x1: cx, y1: cy, stroke: P[1], "stroke-width": u * 0.8, "stroke-linecap": "round" }, prop);
    kit.svg("circle", { cx, cy, r: u * 0.9, fill: ink }, prop);
    // A minute timer: the hand sweeps one lap per minute, four laps in all, and the
    // count of minutes ticks up beneath it.
    const count = kit.text(root, "", { x: cx, y: cy + r * 0.22, size: 3.6, font: "heading", align: "center", colour: ink });
    moving.push((t) => {
      const laps = kit.progress(t, 0.6, 2.6, "linear") * 4;
      const a = (Math.floor((laps % 1) * 12) / 12) * Math.PI * 2 + (laps >= 4 ? 0 : 0);
      const done = laps >= 4;
      const ex = cx + Math.sin(done ? 0 : a) * r * 0.72, ey = cy - Math.cos(done ? 0 : a) * r * 0.72;
      hand.setAttribute("x2", ex); hand.setAttribute("y2", ey);
      wedge.setAttribute("d", !done && a > 0 ? `M${cx} ${cy} L${cx} ${cy - r * 0.72} A${r * 0.72} ${r * 0.72} 0 ${a > Math.PI ? 1 : 0} 1 ${ex} ${ey} Z` : "");
      count.textContent = t < 0.6 ? "" : Math.min(4, Math.floor(laps) + (done ? 0 : 1)) + " min";
    });
  }
  const hero = kit.toon(s, { x: counterX + counterW + u * 12, y: floor, height: safe.height * 0.52, colour: colours.surface, kind: "flat", face: "happy", flip: true });

  return (t0) => {
    const t = kit.stepped(t0, 12);
    const b = kit.spring(t - 0.1, { stiffness: 240, damping: 13 });
    badge.setAttribute("transform", `translate(${nx} ${ny}) scale(${Math.max(0, b)}) rotate(${(1 - b) * -40}) translate(${-nx} ${-ny})`);
    numeral.style.opacity = String(kit.clamp(b * 3 - 1.5));
    name.style.opacity = String(kit.progress(t, 0.5, 0.1));
    name.style.transform = `rotate(${-3 * kit.progress(t, 0.5, 0.2)}deg)`;
    const pp = kit.spring(t - 0.3, { stiffness: 220, damping: 12 });
    prop.setAttribute("transform", `translate(0 ${(1 - pp) * -u * 25})`);
    prop.style.opacity = String(kit.clamp(pp * 4));
    for (const m of moving) m(t);
    // The character reacts: points at the prop, nods along on the beat.
    const beat = Math.floor(t * 3) % 2;
    hero.pose(t > 0.8 ? "point" : "stand").face(beat ? "happy" : "open");
    hero.squash(beat ? 0.12 : -0.05);
  };
});
