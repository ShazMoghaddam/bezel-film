// 1971: a mail command types in, then a huge glowing @ draws itself on the screen, with
// "person" set on its left and "computer" on its right, joined by it, as an address is.
Bezel.scene((root, kit) => {
  const { u, safe, colours, props, width } = kit;
  const glow = `0 0 ${u * 0.5}px rgb(168 255 168 / .65), 0 0 ${u * 1.6}px rgb(111 215 122 / .35)`;
  kit.text(root, props.date, { x: safe.x, y: safe.y, size: 4, font: "body", colour: colours.muted, style: { textShadow: glow } });
  const cmd = kit.text(root, "", { x: safe.x, y: safe.y + u * 5.5, size: 4.4, font: "body", colour: colours.text, style: { textShadow: glow } });
  const cy = safe.y + safe.height * 0.24;
  const at = kit.text(root, props.symbol, { x: width / 2, y: cy, size: 34, font: "heading", align: "center", colour: colours.accent, style: { textShadow: `0 0 ${u}px #E6FFE6, 0 0 ${u * 4}px rgb(111 215 122 / .6)`, lineHeight: "1" } });
  const left = kit.text(root, props.left, { x: width / 2 - u * 15, y: cy + u * 13, size: 6.4, font: "heading", align: "right", colour: colours.text, style: { textShadow: glow } });
  const right = kit.text(root, props.right, { x: width / 2 + u * 15, y: cy + u * 13, size: 6.4, font: "heading", colour: colours.text, style: { textShadow: glow } });
  const note = kit.text(root, "", { x: safe.x, y: safe.y + safe.height * 0.82, size: 4.4, font: "body", colour: colours.text, style: { textShadow: glow } });

  const symAt = Math.max(1.6, (kit.at(0) || 0) + 1.4);
  return (t) => {
    cmd.textContent = kit.typing("$ " + props.command, t, { at: 0.3, cps: 26, cursor: t < symAt });
    // The @ powers up like a phosphor: a flicker, then full glow.
    const on = t < symAt ? 0 : t < symAt + 0.3 ? (kit.random(Math.floor(t * 20) + 5)() > 0.4 ? 1 : 0.2) : 1;
    at.style.opacity = String(on);
    left.textContent = kit.typing(props.left, t, { at: symAt + 0.5, cps: 20 });
    right.textContent = kit.typing(props.right, t, { at: symAt + 0.9, cps: 20 });
    note.textContent = kit.typing(props.note, t, { at: Math.max(symAt + 1.6, (kit.at(0) || 0) + 3.6), cps: 34, cursor: true });
  };
});
