// August 1991: the open command types in, an ASCII progress bar fills, the server answers
// 200 OK, and a little text-mode web page appears. The last line types under it, and
// the cursor keeps blinking.
Bezel.scene((root, kit) => {
  const { u, safe, colours, props } = kit;
  const glow = `0 0 ${u * 0.5}px rgb(168 255 168 / .65), 0 0 ${u * 1.6}px rgb(111 215 122 / .35)`;
  const line = (y, size, colour = colours.text, font = "body") => kit.text(root, "", { x: safe.x, y, size, font, colour, style: { textShadow: glow, whiteSpace: "pre" } });
  kit.text(root, props.date, { x: safe.x, y: safe.y, size: 4, font: "body", colour: colours.muted, style: { textShadow: glow } });
  const cmd = line(safe.y + u * 5.5, 4.4);
  const bar = line(safe.y + u * 12, 4.4, colours.muted);
  const ok = line(safe.y + u * 18, 4.4, colours.accent);
  // The page: a framed box of text, as the first browsers showed it.
  const narrow = kit.shape !== "wide";
  const page = kit.text(root, "", { x: safe.x, y: safe.y + u * 26, size: narrow ? 2.8 : 4, font: "body", colour: colours.text, style: { textShadow: glow, whiteSpace: "pre", lineHeight: "1.15" } });
  const pageText = ["+------------------------------------+", "|  World Wide Web                    |", "|                                    |", "|  The WorldWideWeb (W3) is a wide-  |", "|  area hypermedia information       |", "|  retrieval initiative...           |", "+------------------------------------+"].join("\n");
  const end = kit.text(root, "", { x: safe.x, y: safe.y + safe.height * (narrow ? 0.76 : 0.84), size: narrow ? 4.8 : 6.4, font: "heading", colour: colours.text, maxWidth: safe.width, style: { textShadow: glow } });
  const source = kit.text(root, props.source, { x: safe.x + safe.width, y: safe.y, size: 3, font: "body", align: "right", colour: colours.muted });

  const loadAt = 1.4, okAt = 2.6, endAt = Math.max(3.6, (kit.at(1) || 0) - 0.1);
  return (t) => {
    cmd.textContent = kit.typing("$ " + props.command, t, { at: 0.3, cps: 26 });
    const p = kit.clamp((t - loadAt) / (okAt - loadAt));
    const n = Math.floor(kit.stepped(p, 12) * 24);
    bar.textContent = t >= loadAt ? `[${"#".repeat(n)}${".".repeat(24 - n)}] ${Math.round(p * 100)}%` : "";
    ok.textContent = kit.typing(props.ok, t, { at: okAt, cps: 40 });
    page.textContent = t >= okAt + 0.5 ? pageText.split("\n").slice(0, Math.floor((t - okAt - 0.5) * 14)).join("\n") : "";
    end.textContent = kit.typing("> " + props.end, t, { at: endAt, cps: 22, cursor: true });
    source.style.opacity = String(kit.progress(t, endAt + 1, 0.6));
  };
});
