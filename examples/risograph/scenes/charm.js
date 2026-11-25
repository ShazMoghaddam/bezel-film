// The sign-off: the line is printed twice, once in pink and once in blue. The two
// prints start far apart and slide almost into line, never quite, so the edges keep a
// glow of the other ink. The second line sets underneath in the navy.
Bezel.scene((root, kit) => {
  const { u, safe, colours, props, width, fonts } = kit;
  const s = kit.stage();
  const PINK = "#FF48B0", BLUE = "#0078BF";
  const size = Math.min(u * 22, safe.width / (props.line.length * 0.5));
  const y = safe.y + safe.height * 0.42;

  // The two prints are drawing, not reading text: the navy line below is the words.
  const prints = [PINK, BLUE].map((colour, i) => {
    const g = kit.ink(s, { colour, filter: "url(#riso)" });
    const text = kit.svg("text", { x: width / 2, y, "text-anchor": "middle", "font-family": fonts.heading, "font-size": size, "font-weight": 700, "letter-spacing": "0.01em", "aria-hidden": "true" }, g);
    text.textContent = props.line.toUpperCase();
    return { g, from: i ? [u * 16, u * 6] : [-u * 16, -u * 6], rest: i ? [u * 0.5, u * 0.35] : [-u * 0.5, -u * 0.35] };
  });
  const line = kit.text(root, props.line2, { x: width / 2, y: y + size * 0.35, size: 7, font: "heading", align: "center", colour: colours.text, style: { textTransform: "uppercase" } });

  return (t) => {
    const p = kit.spring(t - 0.3, { stiffness: 70, damping: 14 });
    prints.forEach((pr) => {
      const x = kit.lerp(pr.from[0], pr.rest[0], p), yy = kit.lerp(pr.from[1], pr.rest[1], p);
      pr.g.setAttribute("transform", `translate(${x} ${yy})`);
      pr.g.style.opacity = String(0.92 * kit.progress(t, 0.2, 0.3));
    });
    const k = kit.progress(t, Math.max(1.6, kit.at(1) || 0), 0.5);
    line.style.clipPath = `inset(-30% ${(1 - k) * 105 - 5}% -30% -5%)`;
  };
});
