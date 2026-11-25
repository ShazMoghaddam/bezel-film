// A laptop slides in with the week view: meetings in blue, protected focus time in green.
// As each feature is named it lights up on the left, and the calendar shows it: focus
// blocks glow, then one block glides to a new day as "life gets in the way".
Bezel.scene((root, kit) => {
  const { u, safe, colours, props, fonts } = kit;
  const s = kit.stage();
  const [blue, pink, green] = colours.palette;
  const wide = kit.shape === "wide";

  const lw = wide ? safe.width * 0.6 : safe.width;
  const lx = wide ? safe.x + safe.width * 0.4 : safe.x, ly = wide ? safe.y + safe.height * 0.1 : safe.y + safe.height * 0.36;
  const laptop = kit.device(s, { kind: "laptop", x: lx, y: ly, width: lw });
  const sc = laptop.screen, ui = laptop.content;
  kit.svg("rect", { x: sc.x, y: sc.y, width: sc.width, height: sc.height, fill: "#0E1016" }, ui);
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const colW = (sc.width * 0.92) / days.length, gx = sc.x + sc.width * 0.04, gy = sc.y + sc.height * 0.14, gh = sc.height * 0.8;
  days.forEach((d, i) => {
    const x = gx + i * colW;
    const tx = kit.svg("text", { x: x + colW * 0.06, y: sc.y + sc.height * 0.09, "font-family": fonts.body, "font-size": lw * 0.017, "font-weight": 600, fill: "#8A92A3" }, ui);
    tx.textContent = d;
    kit.svg("path", { d: `M${x} ${gy} V${gy + gh}`, stroke: "#1F232C" }, ui);
  });
  const block = (day, start, len, colour) => kit.svg("rect", { x: gx + day * colW + colW * 0.06, y: gy + start * gh, width: colW * 0.88, height: len * gh - 3, rx: lw * 0.006, fill: `color-mix(in oklab, ${colour}, #0E1016 60%)`, stroke: colour, "stroke-width": 1.5 }, ui);
  // Meetings.
  [[0, 0.05, 0.1], [0, 0.45, 0.15], [1, 0.2, 0.12], [2, 0.05, 0.1], [2, 0.6, 0.2], [3, 0.3, 0.1], [4, 0.05, 0.1], [4, 0.5, 0.12]].forEach(([d, a, l]) => block(d, a, l, blue));
  // Focus time.
  const focus = [[0, 0.2, 0.22], [1, 0.4, 0.3], [2, 0.2, 0.3], [3, 0.5, 0.3], [4, 0.2, 0.25]].map(([d, a, l]) => block(d, a, l, green));
  // The one that moves: Thursday's task slides to Friday afternoon.
  const mover = block(3, 0.12, 0.14, pink);

  const fx = safe.x, fy = wide ? safe.y + safe.height * 0.28 : safe.y;
  const items = props.features.map((txt, i) => {
    const el = kit.text(root, txt, { x: fx, y: fy + i * u * (wide ? 12 : 8), size: wide ? 5.2 : 4, font: "heading", colour: colours.text, maxWidth: wide ? safe.width * 0.34 : safe.width, style: { letterSpacing: "-0.02em" } });
    return { el, at: 0.9 + i * 1.1 };
  });

  return (t) => {
    const p = kit.progress(t, 0, 1.2, "out");
    laptop.group.setAttribute("transform", `translate(${(1 - p) * u * 20} 0)`);
    laptop.group.style.opacity = String(p);
    items.forEach((it, i) => {
      const a = kit.progress(t, it.at, 0.7, "out");
      // The current feature is bright; earlier ones step back to grey.
      const next = items[i + 1];
      const dim = next ? kit.progress(t, next.at, 0.5) : 0;
      it.el.style.opacity = String(a * (1 - dim * 0.55));
      it.el.style.translate = `0 ${(1 - a) * u * 1.5}px`;
    });
    const glowFocus = kit.progress(t, items[1].at, 0.6) * (1 - kit.progress(t, items[2].at, 0.6));
    focus.forEach((f) => f.setAttribute("stroke-width", String(1.5 + glowFocus * 3)));
    // Life gets in the way: the pink task glides from Thursday to Friday.
    const m = kit.progress(t, items[2].at + 0.3, 1, "inOut");
    mover.setAttribute("transform", `translate(${m * colW} ${m * gh * 0.62})`);
  };
});
