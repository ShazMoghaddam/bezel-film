// A small poster prints itself, one ink per pass, each wiping across as the paper goes
// under its drum: yellow sun and field, then pink hills and sun, then blue mountains.
// Where inks overlap they mix, and no pass lines up quite perfectly.
Bezel.scene((root, kit) => {
  const { u, safe, colours, props, width, height } = kit;
  const s = kit.stage();
  const wide = kit.shape === "wide";
  // Real riso inks, brighter than anything on screen usually is.
  const YELLOW = "#FFE800", PINK = "#FF48B0", BLUE = "#0078BF";

  // One pass of the press: an ink layer, out of register by shift, revealed left to right.
  const pass = (colour, shift, i) => {
    const g = kit.ink(s, { colour, shift, filter: "url(#riso)" });
    const id = `pass-${i}`;
    const rect = kit.svg("rect", { x: -u * 5, y: -u * 5, width: 0, height: height + u * 10 }, kit.svg("clipPath", { id }, kit.svg("defs", {}, s)));
    g.setAttribute("clip-path", `url(#${id})`);
    return { g, rect };
  };
  const yellow = pass(YELLOW, [0, 0], 0);
  const pink = pass(PINK, [u * 0.6, u * 0.35], 1);
  const blue = pass(BLUE, [-u * 0.45, u * 0.55], 2);

  // The picture sits on the right in a wide frame, below the words otherwise.
  const area = wide ? { x: safe.x + safe.width * 0.46, y: safe.y, w: safe.width * 0.54, h: safe.height } : { x: safe.x, y: safe.y + safe.height * 0.38, w: safe.width, h: safe.height * 0.62 };
  const sunX = area.x + area.w * 0.62, sunY = area.y + area.h * 0.36, R = Math.min(area.w, area.h) * 0.24;
  const ground = area.y + area.h * 0.72;
  // Yellow: the sun's full disc and a field along the bottom.
  kit.svg("circle", { cx: sunX, cy: sunY, r: R }, yellow.g);
  kit.svg("rect", { x: area.x, y: ground, width: area.w, height: area.y + area.h - ground }, yellow.g);
  // Pink: rolling hills and a smaller circle offset on the sun, which turns orange on yellow.
  kit.svg("circle", { cx: sunX + R * 0.25, cy: sunY + R * 0.2, r: R * 0.78 }, pink.g);
  kit.svg("path", { d: `M${area.x} ${area.y + area.h} V${ground - area.h * 0.06} Q${area.x + area.w * 0.25} ${ground - area.h * 0.2} ${area.x + area.w * 0.5} ${ground - area.h * 0.04} T${area.x + area.w} ${ground - area.h * 0.08} V${ground + area.h * 0.03} H${area.x} Z` }, pink.g);
  // Pink stripes across the field.
  for (let i = 0; i < 4; i++) kit.svg("rect", { x: area.x, y: ground + area.h * 0.06 + i * area.h * 0.06, width: area.w, height: area.h * 0.022 }, pink.g);
  // Blue: far mountains (purple where they cross the pink) and three birds.
  kit.svg("path", { d: `M${area.x} ${ground + area.h * 0.02} L${area.x + area.w * 0.18} ${area.y + area.h * 0.48} L${area.x + area.w * 0.34} ${ground - area.h * 0.1} L${area.x + area.w * 0.5} ${area.y + area.h * 0.42} L${area.x + area.w * 0.72} ${ground} Z` }, blue.g);
  [[0.2, 0.16], [0.28, 0.12], [0.36, 0.18]].forEach(([fx, fy]) => {
    const x = area.x + area.w * fx, y = area.y + area.h * fy, w = u * 2.4;
    kit.svg("path", { d: `M${x - w} ${y} Q${x - w / 2} ${y - w * 0.6} ${x} ${y} Q${x + w / 2} ${y - w * 0.6} ${x + w} ${y} Q${x + w / 2} ${y - w * 0.25} ${x} ${y + w * 0.2} Q${x - w / 2} ${y - w * 0.25} ${x - w} ${y} Z` }, blue.g);
  });

  const tx = safe.x, tw = wide ? safe.width * 0.42 : safe.width;
  const kicker = kit.text(root, props.kicker, { x: tx, y: wide ? safe.y + safe.height * 0.24 : safe.y, size: 3.4, weight: 600, colour: colours.accent, style: { textTransform: "uppercase", letterSpacing: "0.12em", mixBlendMode: "multiply" } });
  const title = kit.text(root, props.title, { x: tx, y: wide ? safe.y + safe.height * 0.31 : safe.y + u * 5, size: wide ? 12 : 9.6, font: "heading", colour: colours.text, maxWidth: tw, style: { lineHeight: "1", textWrap: "balance", mixBlendMode: "multiply" } });

  return (t) => {
    // Each pass wipes across at the speed of paper through a press.
    [yellow, pink, blue].forEach((p, i) => p.rect.setAttribute("width", String((width + u * 10) * kit.progress(t, 0.2 + i * 0.8, 0.7, "inOut"))));
    const k = kit.progress(t, 2.4, 0.5);
    kicker.style.opacity = String(kit.progress(t, 2.2, 0.4));
    title.style.clipPath = `inset(-30% ${(1 - k) * 105 - 5}% -30% -5%)`;
  };
});
