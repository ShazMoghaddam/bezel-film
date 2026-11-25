// The level-up: "LEVEL UP!" bursts in with pixel sparkles, the XP bar fills to the top,
// and each stat ticks up from its old number to its new one, row by row.
Bezel.scene((root, kit) => {
  const { u, safe, colours, props, width } = kit;
  const s = kit.stage();
  const P = Math.round(u * 0.8);
  const snap = (v) => Math.round(v / P) * P;

  const title = kit.text(root, props.title.toUpperCase(), { x: width / 2, y: safe.y + safe.height * 0.06, size: 9, font: "heading", align: "center", colour: colours.accent,
    style: { textShadow: `${P}px ${P}px 0 #C2410C, ${P * 2}px ${P * 2}px 0 #000` } });
  // Sparkles: four-point pixel stars around the title, blinking in turn.
  const sparkle = ["..W..", "..W..", "WWWWW", "..W..", "..W.."];
  const rand = kit.random(8);
  const sparks = Array.from({ length: 10 }, () => kit.pixels(s, { art: sparkle, palette: { W: rand() > 0.5 ? "#FFFFFF" : colours.accent }, x: snap(width / 2 + (rand() - 0.5) * safe.width * 0.7), y: snap(safe.y + rand() * safe.height * 0.3), size: P }));

  // The XP bar: a chunky frame that fills in blocks.
  const bx = snap(width / 2 - safe.width * 0.3), by = snap(safe.y + safe.height * 0.36), bw = snap(safe.width * 0.6), bh = P * 4;
  kit.svg("rect", { x: bx - P, y: by - P, width: bw + P * 2, height: bh + P * 2, fill: "#FFFFFF" }, s);
  kit.svg("rect", { x: bx, y: by, width: bw, height: bh, fill: "#000" }, s);
  const fill = kit.svg("rect", { x: bx, y: by, width: 0, height: bh, fill: colours.palette[2] }, s);
  const xp = kit.text(root, "XP", { x: bx - u * 2, y: by - u * 0.4, size: 2.4, font: "heading", align: "right", colour: "#FFFFFF" });

  const rows = props.stats.map(([name, from, to], i) => {
    const y = safe.y + safe.height * (0.5 + i * 0.13);
    const label = kit.text(root, name.toUpperCase(), { x: bx, y, size: 3, font: "heading", colour: "#FFFFFF" });
    const value = kit.text(root, String(from), { x: bx + bw, y, size: 3, font: "heading", align: "right", colour: "#FFFFFF" });
    return { label, value, from, to, at: 1.4 + i * 0.5 };
  });

  return (t) => {
    const b = kit.spring(t - 0.15, { stiffness: 300, damping: 10 });
    title.style.opacity = t >= 0.15 ? "1" : "0";
    title.style.scale = String(Math.max(0, b));
    const blink = Math.floor(kit.stepped(t, 8) * 8);
    sparks.forEach((sp, i) => (sp.style.opacity = t > 0.3 && (blink + i) % 3 === 0 ? "1" : "0"));
    fill.setAttribute("width", String(snap(bw * kit.progress(t, 0.6, 1.1))));
    xp.style.opacity = "1";
    rows.forEach((r) => {
      const on = kit.progress(t, r.at, 0.2);
      r.label.style.opacity = r.value.style.opacity = String(on > 0 ? 1 : 0);
      const k = kit.progress(t, r.at + 0.2, 0.6);
      const v = Math.round(r.from + (r.to - r.from) * k);
      r.value.textContent = k > 0 ? `${r.from} ▶ ${v}` : String(r.from);
      r.value.style.color = k >= 1 ? colours.palette[2] : "#FFFFFF";
    });
  };
});
