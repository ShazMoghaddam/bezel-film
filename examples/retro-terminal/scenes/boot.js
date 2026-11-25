// The monitor boots: a few system lines type out fast, then the title types in large
// with a blinking block cursor. A faint roll bar drifts down the screen, as on old CRTs.
Bezel.scene((root, kit) => {
  const { u, safe, colours, props, width, height } = kit;
  const s = kit.stage();
  const glow = `0 0 ${u * 0.5}px rgb(168 255 168 / .65), 0 0 ${u * 1.6}px rgb(111 215 122 / .35)`;
  const roll = kit.svg("rect", { x: 0, y: 0, width, height: height * 0.18, fill: "#A8FFA8", opacity: 0.035 }, s);

  const lines = props.lines.map((txt, i) => ({ txt, at: 0.15 + i * 0.45, el: kit.text(root, "", { x: safe.x, y: safe.y + i * u * 5, size: 4, font: "body", colour: colours.muted, style: { textShadow: glow, whiteSpace: "pre" } }) }));
  const ready = kit.text(root, "", { x: safe.x, y: safe.y + props.lines.length * u * 5 + u * 3, size: 4, font: "body", colour: colours.text, style: { textShadow: glow } });
  const title = kit.text(root, "", { x: safe.x, y: safe.y + safe.height * 0.42, size: 13, font: "heading", colour: colours.text, maxWidth: safe.width, style: { textShadow: glow, lineHeight: "0.95", whiteSpace: "pre-line" } });

  const titleAt = Math.max(1.8, (kit.at(0) || 0) + 0.4);
  return (t) => {
    roll.setAttribute("y", String(((t * 0.25) % 1.2) * height - height * 0.18));
    lines.forEach((l) => (l.el.textContent = kit.typing(l.txt, t, { at: l.at, cps: 60 })));
    ready.textContent = t > 1.4 && t < titleAt ? kit.typing("> ", t, { at: 1.4, cps: 20, cursor: true }) : t >= titleAt ? "> run history.log" : "";
    title.textContent = kit.typing(props.title.toUpperCase(), t, { at: titleAt, cps: 18, cursor: true });
  };
});
