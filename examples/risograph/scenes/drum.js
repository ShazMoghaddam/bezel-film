// How the press works, as a side view: a drum of pink ink wrapped in a stencil of tiny
// holes turns, and a strip of paper rolls under it. Ink comes through only where the
// stencil is open, so a pattern appears on the paper as it comes out the far side.
Bezel.scene((root, kit) => {
  const { u, safe, colours, props, width } = kit;
  const s = kit.stage();
  const wide = kit.shape === "wide";
  const PINK = "#FF48B0", BLUE = "#0078BF";
  const navy = colours.text;

  const R = Math.min(safe.height * 0.26, safe.width * 0.16);
  const dx = wide ? safe.x + safe.width * 0.66 : width / 2, dy = wide ? safe.y + safe.height * 0.4 : safe.y + safe.height * 0.5;
  const contact = dy + R;
  // The drum: pink ink inside, a navy rim, and the stencil's holes around it.
  const ink = kit.ink(s, { colour: PINK, filter: "url(#riso)" });
  kit.svg("circle", { cx: dx, cy: dy, r: R * 0.92 }, ink);
  kit.svg("circle", { cx: dx, cy: dy, r: R, fill: "none", stroke: navy, "stroke-width": u * 0.5 }, s);
  const holes = kit.svg("g", {}, s);
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2, open = i % 3 !== 0;
    kit.svg("circle", { cx: dx + Math.cos(a) * R, cy: dy + Math.sin(a) * R, r: u * (open ? 0.55 : 0.3), fill: open ? "#F4EFE4" : navy, stroke: navy, "stroke-width": u * 0.2 }, holes);
  }
  kit.svg("circle", { cx: dx, cy: dy, r: u * 1.4, fill: navy }, s);
  // A pressure roller underneath, pressing the paper up against the drum.
  const roller = kit.svg("g", {}, s);
  const rr = R * 0.32;
  kit.svg("circle", { cx: dx, cy: contact + u * 0.8 + rr, r: rr, fill: "none", stroke: navy, "stroke-width": u * 0.4 }, roller);
  const spokes = kit.svg("path", { d: `M${dx - rr} ${contact + u * 0.8 + rr} H${dx + rr} M${dx} ${contact + u * 0.8} V${contact + u * 0.8 + rr * 2}`, stroke: navy, "stroke-width": u * 0.3 }, roller);

  // The paper: a long strip feeding in from the left, carrying its printed pattern with it.
  const left = wide ? safe.x + safe.width * 0.36 : safe.x, right = safe.x + safe.width + u * 6;
  const paperY = contact - u * 0.2, paperH = u * 0.8;
  kit.svg("rect", { x: left - u * 6, y: paperY, width: right - left + u * 12, height: paperH, fill: "#FFFFFF", stroke: navy, "stroke-width": u * 0.15 }, s);
  // The printed marks: dots in a row on the paper, visible only once past the drum.
  const clipId = "printed";
  kit.svg("rect", { x: dx, y: paperY - u * 4, width: right - dx + u * 6, height: u * 8 }, kit.svg("clipPath", { id: clipId }, kit.svg("defs", {}, s)));
  const printed = kit.ink(s, { colour: PINK, filter: "url(#riso)" });
  printed.setAttribute("clip-path", `url(#${clipId})`);
  const marks = kit.svg("g", {}, printed);
  for (let i = 0; i < 90; i++) kit.svg("rect", { x: left + i * u * 2.6 - u * 60, y: paperY - u * 1.4, width: u * 1.6, height: u * 1.4 }, marks);
  // An arrow showing which way the paper goes.
  const arrow = kit.svg("path", { d: `M${left} ${paperY + u * 5} H${left + u * 12} M${left + u * 9} ${paperY + u * 3.4} L${left + u * 12} ${paperY + u * 5} L${left + u * 9} ${paperY + u * 6.6}`, fill: "none", stroke: BLUE, "stroke-width": u * 0.5, "stroke-linecap": "round", "stroke-linejoin": "round" }, s);

  // The three steps, numbered, each set as it's spoken.
  const steps = props.steps.map((txt, i) => {
    const y = wide ? safe.y + safe.height * (0.12 + i * 0.16) : safe.y + i * u * 7;
    const num = kit.text(root, String(i + 1), { x: safe.x, y, size: wide ? 7 : 5, font: "heading", colour: colours.accent, style: { mixBlendMode: "multiply" } });
    const label = kit.text(root, txt, { x: safe.x + u * (wide ? 6.5 : 5), y: y + u * (wide ? 1.4 : 0.8), size: wide ? 3.6 : 3.2, weight: 600, colour: navy, maxWidth: wide ? safe.width * 0.3 : safe.width - u * 6 });
    // Steps one and two start their sentences; step three comes partway through the second.
    const at = i < 2 ? (kit.at(i) || i * 2) - 0.1 : (kit.at(1) || 3) + 2;
    return { num, label, at: Math.max(0.3 + i * 1.2, at) };
  });

  return (t) => {
    // The drum turns at a steady speed; the paper moves at the same surface speed.
    const turn = Math.max(0, t - 0.4) * 50;
    holes.setAttribute("transform", `rotate(${turn} ${dx} ${dy})`);
    spokes.setAttribute("transform", `rotate(${-turn * (R / rr)} ${dx} ${contact + u * 0.8 + rr})`);
    const travel = (turn / 360) * Math.PI * 2 * R;
    marks.setAttribute("transform", `translate(${travel % (u * 2.6 * 20)} 0)`);
    steps.forEach((st) => {
      const p = kit.progress(t, st.at, 0.35);
      st.num.style.opacity = st.label.style.opacity = String(p);
      st.label.style.translate = `${(1 - p) * -u * 2}px 0`;
    });
    arrow.style.opacity = String(kit.progress(t, steps[2].at, 0.3));
  };
});
