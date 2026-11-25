// The product on stage: a phone rises into the light showing the app's day view. Meetings
// are already in; then three tasks drop in one by one and slide into the free gaps, each
// finding its own slot. The words sit to the left.
Bezel.scene((root, kit) => {
  const { u, safe, colours, props, width, fonts } = kit;
  const s = kit.stage();
  const [blue, pink, green, amber] = colours.palette;
  const wide = kit.shape === "wide";

  // Narrow frames: the words across the top, the phone under them.
  const pw = wide ? Math.min(safe.height * 0.47, u * 46) : Math.min(safe.height * 0.36, safe.width * 0.5);
  const px = wide ? safe.x + safe.width * 0.62 : width / 2 - pw / 2, py = wide ? safe.y + safe.height * 0.02 : safe.y + safe.height * 0.22;
  kit.glow(s, { cx: px + pw / 2, cy: py + pw, r: pw * 1.6, colour: blue, strength: 0.25 });
  const phone = kit.device(s, { kind: "phone", x: px, y: py, width: pw });
  const sc = phone.screen, ui = phone.content;
  const font = (size, weight = 400) => ({ "font-family": fonts.body, "font-size": size, "font-weight": weight });
  kit.svg("rect", { x: sc.x, y: sc.y, width: sc.width, height: sc.height, fill: "#0E1016" }, ui);
  const label = (txt, x, y, attrs) => { const el = kit.svg("text", { x, y, ...attrs }, ui); el.textContent = txt; return el; };
  label("Today", sc.x + sc.width * 0.08, sc.y + sc.height * 0.1, { ...font(pw * 0.085, 700), fill: "#F5F7FA" });
  label("Thursday", sc.x + sc.width * 0.08, sc.y + sc.height * 0.135, { ...font(pw * 0.045), fill: "#8A92A3" });
  // The day: hours down the side, 9 to 6, with faint lines.
  const top = sc.y + sc.height * 0.17, hourH = (sc.height * 0.78) / 9, left = sc.x + sc.width * 0.2;
  for (let h = 0; h <= 9; h++) {
    const y = top + h * hourH;
    kit.svg("path", { d: `M${left} ${y} H${sc.x + sc.width * 0.94}`, stroke: "#1F232C", "stroke-width": 1 }, ui);
    label(`${((h + 8) % 12) + 1}`, sc.x + sc.width * 0.08, y + pw * 0.012, { ...font(pw * 0.038), fill: "#5E6677" });
  }
  const block = (start, len, colour, title) => {
    const g = kit.svg("g", {}, ui);
    kit.svg("rect", { x: left + pw * 0.02, y: top + start * hourH + 2, width: sc.width * 0.7, height: len * hourH - 4, rx: pw * 0.025, fill: `color-mix(in oklab, ${colour}, #0E1016 72%)` }, g);
    kit.svg("rect", { x: left + pw * 0.02, y: top + start * hourH + 2, width: pw * 0.012, height: len * hourH - 4, rx: pw * 0.006, fill: colour }, g);
    const tx = kit.svg("text", { x: left + pw * 0.06, y: top + start * hourH + hourH * 0.5, ...font(pw * 0.055, 600), fill: "#F5F7FA" }, g);
    tx.textContent = title;
    return g;
  };
  // Meetings already in the day.
  [[0.5, 1, "Stand-up"], [2.5, 1.5, "Design review"], [6, 1, "1:1 with Sam"]].forEach(([a, l, txt]) => block(a, l, blue, txt));
  // The tasks: each drops from the top and lands in its gap.
  const tasks = props.tasks.map((title, i) => {
    const slot = [[1.5, 1], [4.5, 0.75], [7.5, 1]][i];
    const g = block(slot[0], slot[1], [green, amber, pink][i], title);
    return { g, slot, at: 1.4 + i * 0.6 };
  });

  const tx = wide ? safe.x : safe.x, ty = wide ? safe.y + safe.height * 0.34 : safe.y;
  const heading = kit.text(root, props.heading, { x: tx, y: ty, size: wide ? 7.4 : 5.6, font: "heading", colour: colours.text, maxWidth: wide ? safe.width * 0.5 : safe.width, style: { letterSpacing: "-0.04em" } });
  const sub = kit.text(root, props.sub, { x: tx, y: ty + u * (wide ? 10 : 7.5), size: wide ? 7.4 : 5.6, font: "heading", colour: colours.muted, maxWidth: wide ? safe.width * 0.5 : safe.width, style: { letterSpacing: "-0.04em" } });

  return (t) => {
    const up = kit.progress(t, 0, 1.2, "out");
    phone.group.setAttribute("transform", `translate(0 ${(1 - up) * u * 30})`);
    phone.group.style.opacity = String(up);
    tasks.forEach((k) => {
      const p = kit.spring(t - k.at, { stiffness: 140, damping: 16 });
      k.g.style.opacity = t >= k.at ? "1" : "0";
      k.g.setAttribute("transform", `translate(0 ${(1 - p) * -(top + k.slot[0] * hourH - sc.y)})`);
    });
    const h = kit.progress(t, 0.6, 0.9, "out");
    heading.style.opacity = String(h);
    heading.style.translate = `0 ${(1 - h) * u * 2}px`;
    const q = kit.progress(t, Math.max(1.4, (kit.at(0) || 0) + 1.2), 0.9, "out");
    sub.style.opacity = String(q);
    sub.style.translate = `0 ${(1 - q) * u * 2}px`;
  };
});
