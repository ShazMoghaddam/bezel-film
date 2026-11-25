// A painted map of North America. The land blooms in, the coast is inked, then a dotted
// route is drawn from the north-east down to central Mexico while a monarch flies it.
// The distance is written beside the route.
Bezel.scene((root, kit) => {
  const { u, safe, colours, props } = kit;
  const s = kit.stage();
  const plan = kit.drawing();
  const wide = kit.shape === "wide";
  const ink = "#2A231C";
  const pen = { fill: "none", stroke: ink, "stroke-linecap": "round", "stroke-linejoin": "round", filter: "url(#ink)" };

  // A monarch at (0, 0), wingspan about 2 × size. Built once, placed by its group.
  const monarch = (parent, size, seed) => {
    const S = size;
    const upper = (k) => `M0 ${-S * 0.05} C${k * S * 0.3} ${-S * 0.95} ${k * S * 1.2} ${-S * 0.8} ${k * S * 1} ${-S * 0.12} C${k * S * 0.85} ${S * 0.02} ${k * S * 0.35} ${S * 0.06} 0 0 Z`;
    const lower = (k) => `M0 ${S * 0.03} C${k * S * 0.4} ${-S * 0.02} ${k * S * 0.85} ${S * 0.18} ${k * S * 0.66} ${S * 0.58} C${k * S * 0.48} ${S * 0.86} ${k * S * 0.12} ${S * 0.66} 0 ${S * 0.14} Z`;
    const wings = [-1, 1].map((k) => {
      const g = kit.svg("g", {}, parent);
      const d = upper(k) + " " + lower(k);
      const paint = kit.wash(g, { d, colour: "#D9771F", opacity: 0.85, from: [k * S * 0.3, -S * 0.1], filter: "url(#paint)" });
      const deep = kit.wash(g, { d: `M0 0 C${k * S * 0.25} ${-S * 0.4} ${k * S * 0.6} ${-S * 0.45} ${k * S * 0.6} ${-S * 0.1} C${k * S * 0.5} ${S * 0.3} ${k * S * 0.2} ${S * 0.3} 0 ${S * 0.1} Z`, colour: "#B8501F", opacity: 0.55, filter: "url(#paint)" });
      // Ink: the outline with its thick dark border, then the veins.
      const outline = kit.svg("path", { d, ...pen, "stroke-width": S * 0.05 }, g);
      const veins = kit.svg("path", { d: `M${k * S * 0.05} ${-S * 0.05} Q${k * S * 0.5} ${-S * 0.5} ${k * S * 0.95} ${-S * 0.6} M${k * S * 0.05} ${-S * 0.02} Q${k * S * 0.55} ${-S * 0.2} ${k * S * 0.9} ${-S * 0.2} M${k * S * 0.05} ${S * 0.05} Q${k * S * 0.4} ${S * 0.2} ${k * S * 0.55} ${S * 0.55} M${k * S * 0.05} ${S * 0.08} Q${k * S * 0.25} ${S * 0.35} ${k * S * 0.3} ${S * 0.62}`, ...pen, "stroke-width": S * 0.025 }, g);
      // White spots just inside the wing's outer edge, found by walking along its outline.
      const rand = kit.random(seed + k * 7);
      const dots = kit.svg("g", { fill: "#FBF8F0", opacity: 0 }, g);
      const edge = kit.svg("path", { d: upper(k) }, g);
      const len = edge.getTotalLength();
      for (let i = 0; i < 9; i++) {
        const p = edge.getPointAtLength(len * (0.3 + i * 0.045));
        const pull = 0.88 - rand() * 0.04;
        kit.svg("circle", { cx: p.x * pull + k * S * 0.62 * (1 - pull), cy: p.y * pull + -S * 0.35 * (1 - pull), r: S * (0.022 + rand() * 0.014) }, dots);
      }
      edge.remove();
      return { g, paint, deep, outline, veins, dots };
    });
    const body = kit.svg("path", { d: `M0 ${-S * 0.28} C${S * 0.06} ${-S * 0.2} ${S * 0.06} ${S * 0.45} 0 ${S * 0.55} C${-S * 0.06} ${S * 0.45} ${-S * 0.06} ${-S * 0.2} 0 ${-S * 0.28} Z M0 ${-S * 0.28} Q${S * 0.15} ${-S * 0.6} ${S * 0.3} ${-S * 0.7} M0 ${-S * 0.28} Q${-S * 0.15} ${-S * 0.6} ${-S * 0.3} ${-S * 0.7}`, fill: ink, stroke: ink, "stroke-width": S * 0.02, filter: "url(#ink)" }, parent);
    return { wings, body };
  };
  // The coastline of the migration's part of the continent, as [longitude, latitude]: a
  // field sketch, cut off along the top like a page torn from an atlas.
  const coast = [[-131, 55.5], [-56, 55.5], [-56, 52], [-59, 47.5], [-64, 46], [-66, 44], [-70, 43.5], [-70, 41.6], [-74, 40.5], [-74, 39], [-76, 37], [-76, 35], [-78, 34], [-81, 31.5], [-80.5, 28], [-80, 25.5], [-81, 25], [-82, 26.5], [-82.7, 28], [-83, 29.5], [-85, 29.8], [-88, 30.3], [-89.5, 29.2], [-90.5, 29.3], [-93, 29.7], [-95, 29], [-97, 27.5], [-97.5, 25], [-97.8, 22], [-97, 20.5], [-95, 18.6], [-93, 18.4], [-91.5, 18.5], [-90.5, 19.6], [-90.3, 21], [-88, 21.5], [-86.8, 21.2], [-87.5, 19], [-88.2, 16], [-92, 14.5], [-94.5, 16], [-96.5, 15.7], [-99, 16.6], [-101.5, 17.8], [-105.5, 20], [-105.2, 21.5], [-106.5, 23.5], [-109, 25.5], [-111, 27.5], [-112.8, 30], [-114.7, 31.7], [-113, 29], [-111, 26], [-110, 24], [-109.5, 23], [-112, 24.8], [-114, 27.5], [-115.8, 30.4], [-117.1, 32.5], [-118.5, 34], [-120.6, 34.6], [-122.5, 37.7], [-124, 40.4], [-124.5, 43], [-124, 46.3], [-124.7, 48.4], [-123, 49], [-126, 50], [-128, 51], [-130, 54.5]];
  const borders = [
    [[-123, 49], [-95, 49], [-89, 48], [-84, 46.5], [-82.5, 45], [-79, 43.3], [-75, 45], [-71, 45], [-67.8, 47], [-67, 45]],
    [[-117.1, 32.5], [-111, 31.3], [-108.2, 31.3], [-106.5, 31.8], [-104.5, 29.6], [-103, 29], [-101.4, 29.8], [-99.5, 27.5], [-97.2, 25.9]],
  ];
  const box = wide ? { x: safe.x, y: safe.y, width: safe.width * 0.6, height: safe.height } : { x: safe.x, y: safe.y + safe.height * 0.22, width: safe.width, height: safe.height * 0.78 };
  // Longitude is squeezed by about cos(35°), so the shape isn't stretched sideways.
  const lon0 = -132, lon1 = -54, lat0 = 56, lat1 = 13, squeeze = 0.82;
  const sx = box.width / ((lon1 - lon0) * squeeze), sy = box.height / (lat0 - lat1);
  const k = Math.min(sx, sy);
  const ox = box.x + (box.width - (lon1 - lon0) * squeeze * k) / 2, oy = box.y + (box.height - (lat0 - lat1) * k) / 2;
  const P = ([lon, lat]) => [ox + (lon - lon0) * squeeze * k, oy + (lat0 - lat) * k];
  // The torn top edge wavers a little between its two corners.
  const tear = Array.from({ length: 14 }, (_, i) => [-131 + (75 * (i + 1)) / 15, 55.5 + Math.sin(i * 2.3) * 0.5 + (i % 3) * 0.2]);
  const landD = "M" + [coast[0], ...tear, ...coast.slice(1)].map((c) => P(c).map((v) => v.toFixed(1)).join(" ")).join(" L") + " Z";
  const land = kit.wash(s, { d: landD, colour: "#7A9A62", opacity: 0.42, filter: "url(#paint)", from: P([-100, 45]) });
  const warm = kit.wash(s, { d: landD, colour: "#C9A55A", opacity: 0.3, filter: "url(#paint)", from: P([-102, 22]) });
  // Ink the coast but not the torn top edge.
  const shore = kit.svg("path", { d: "M" + coast.slice(1).map((c) => P(c).map((v) => v.toFixed(1)).join(" ")).join(" L"), ...pen, "stroke-width": u * 0.22 }, s);
  const lines = kit.svg("path", { d: borders.map((b) => "M" + b.map((c) => P(c).map((v) => v.toFixed(1)).join(" ")).join(" L")).join(" "), ...pen, stroke: "#6B5B45", "stroke-width": u * 0.16, "stroke-dasharray": `${u * 0.8} ${u * 0.6}`, opacity: 0 }, s);

  // The route, from Ontario down through the plains to the mountains west of Mexico City.
  const route = [[-79, 45], [-86, 41], [-94, 35], [-98, 28], [-100.3, 19.6]].map(P);
  const routeD = "M" + route[0].join(" ") + route.slice(1).map((p, i) => { const a = route[i]; return ` Q${(a[0] + p[0]) / 2 + u * 3} ${(a[1] + p[1]) / 2} ${p[0]} ${p[1]}`; }).join("");
  const path = kit.svg("path", { d: routeD, ...pen, stroke: colours.accent, "stroke-width": u * 0.35, "stroke-dasharray": `${u * 0.2} ${u * 1.2}` }, s);
  // The dashed line is revealed under a mask, so its dashes stay put as it grows.
  const maskId = "route-mask";
  const mask = kit.svg("mask", { id: maskId, maskUnits: "userSpaceOnUse", x: 0, y: 0, width: kit.width, height: kit.height }, kit.svg("defs", {}, s));
  const reveal = kit.svg("path", { d: routeD, fill: "none", stroke: "#FFFFFF", "stroke-width": u * 2, "stroke-linecap": "round", pathLength: 1000, "stroke-dasharray": "1000 1001" }, mask);
  path.setAttribute("mask", `url(#${maskId})`);
  const [sx0, sy0] = route[0], [ex, ey] = route[route.length - 1];
  const start = kit.svg("circle", { cx: sx0, cy: sy0, r: u * 0.9, fill: "none", stroke: ink, "stroke-width": u * 0.25, filter: "url(#ink)" }, s);
  const end = kit.svg("path", { d: `M${ex - u} ${ey - u} L${ex + u} ${ey + u} M${ex + u} ${ey - u} L${ex - u} ${ey + u}`, ...pen, stroke: colours.accent, "stroke-width": u * 0.45 }, s);
  const flyer = kit.svg("g", {}, s);
  const m = monarch(flyer, u * 3.2, 21);

  const north = kit.text(root, props.north, { x: sx0 - u * 1.5, y: sy0 - u * 5.5, align: "right", size: 3, font: "heading", colour: colours.muted, style: { fontStyle: "italic" } });
  const south = kit.text(root, props.south, { x: ex + u * 5, y: ey + u * 0.4, size: 3, font: "heading", colour: colours.muted, style: { fontStyle: "italic" } });
  const tx = wide ? safe.x + safe.width * 0.64 : safe.x, ty = wide ? safe.y + safe.height * 0.34 : safe.y;
  const km = kit.text(root, props.distance, { x: tx, y: ty, size: wide ? 6.4 : 6, font: "heading", colour: colours.accent });
  const miles = kit.text(root, props.miles, { x: tx, y: ty + u * (wide ? 10 : 9), size: 3.6, font: "heading", colour: colours.text, style: { fontStyle: "italic" } });

  const go = Math.max(1.6, kit.at(0) + 0.6), fly = Math.max(2.5, kit.duration - go - 1.2);
  plan.line(shore, { at: 0.8, duration: 1.2 });
  plan.write(north, { at: go - 0.4, duration: 0.5 });
  plan.write(km, { at: go + fly * 0.35, duration: 0.7 });
  plan.write(miles, { at: go + fly * 0.35 + 0.6, duration: 0.6 });
  plan.write(south, { at: go + fly, duration: 0.5 });

  return (t) => {
    land.set(kit.progress(t, 0.1, 1.4, "out"));
    warm.set(kit.progress(t, 0.5, 1.2, "out"));
    lines.style.opacity = String(0.7 * kit.progress(t, 1.6, 0.6));
    const p = kit.progress(t, go, fly, "inOut");
    reveal.style.strokeDashoffset = String(1000 * (1 - p));
    start.style.opacity = String(kit.progress(t, go - 0.3, 0.3));
    end.style.opacity = String(kit.progress(t, go + fly - 0.1, 0.3));
    // The monarch rides the front of the line, turned to follow it.
    const len = path.getTotalLength();
    const a = path.getPointAtLength(len * p), b = path.getPointAtLength(Math.min(len, len * p + 2));
    const angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI + 90;
    flyer.setAttribute("transform", `translate(${a.x} ${a.y - u * 2}) rotate(${p < 1 ? angle : 0})`);
    flyer.style.opacity = String(kit.progress(t, go - 0.3, 0.3));
    const flap = Math.floor(t * 30) % 2 ? 1 : 0.35;
    m.wings.forEach((w) => {
      w.paint.set(1);
      w.deep.set(1);
      w.dots.style.opacity = "1";
      w.g.setAttribute("transform", `scale(${p > 0 && p < 1 ? flap : 0.85} 1)`);
    });
    plan.draw(t);
  };
});
