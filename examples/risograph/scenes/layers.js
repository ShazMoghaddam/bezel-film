// Three inks, three drums: a pink, a blue and a yellow circle print in turn, each a
// little out of register. Where they cross, the inks mix: purple, orange, green, and a
// deep brown where all three meet. Each ink is named beside its circle.
Bezel.scene((root, kit) => {
  const { u, safe, colours, props, width } = kit;
  const s = kit.stage();
  const wide = kit.shape === "wide";
  const INKS = ["#FF48B0", "#0078BF", "#FFE800"];
  const navy = colours.text;

  const R = Math.min(safe.height * 0.24, safe.width * 0.15);
  const cx = wide ? safe.x + safe.width * 0.62 : width / 2, cy = safe.y + safe.height * 0.52;
  const spots = [[-0.55, -0.35], [0.55, -0.35], [0, 0.6]].map(([kx, ky]) => [cx + kx * R, cy + ky * R]);
  const shifts = [[u * 0.5, u * 0.3], [-u * 0.4, u * 0.5], [u * 0.2, -u * 0.4]];
  const layers = INKS.map((colour, i) => {
    const g = kit.ink(s, { colour, shift: shifts[i], filter: "url(#riso)" });
    const disc = kit.svg("circle", { cx: spots[i][0], cy: spots[i][1], r: R }, g);
    return { g, disc, at: Math.max(0.3 + i * 0.7, (kit.at(0) || 0) + 0.2 + i * 0.7) };
  });
  // Ink names in the navy, set beside each circle.
  const where = [[-1.75, -1.05, "right"], [1.75, -1.05, "left"], [0, 1.75, "center"]];
  const labels = props.inks.map((name, i) => {
    const [kx, ky, align] = where[i];
    return kit.text(root, name, { x: cx + kx * R, y: cy + ky * R, size: 4, font: "heading", align, colour: navy });
  });
  const note = kit.text(root, props.note, { x: safe.x, y: wide ? safe.y + safe.height * 0.36 : safe.y, size: wide ? 7.6 : 6, font: "heading", colour: navy, maxWidth: wide ? safe.width * 0.34 : safe.width, style: { lineHeight: "0.98", textWrap: "balance" } });

  return (t) => {
    layers.forEach((l, i) => {
      // Each ink "stamps" on: it lands a touch big and settles, like a press coming down.
      const p = kit.spring(t - l.at, { stiffness: 260, damping: 18 });
      l.g.style.opacity = t >= l.at ? "0.92" : "0";
      l.disc.setAttribute("r", String(R * (1 + (1 - p) * 0.12)));
      labels[i].style.opacity = String(kit.progress(t, l.at + 0.2, 0.3));
    });
    const k = kit.progress(t, Math.max(2.4, kit.at(1) || 0), 0.6);
    note.style.clipPath = `inset(-30% ${(1 - k) * 105 - 5}% -30% -5%)`;
  };
});
