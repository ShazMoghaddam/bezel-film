// A battle screen: a grumpy slime named for a tricky bit of grammar faces our hero. The
// menu's cursor skips "Fight" and lands on "Practise"; each practice hits the slime,
// shakes it, drops its HP bar and pops a damage number, until it's beaten.
Bezel.scene((root, kit) => {
  const { u, safe, colours, props, width } = kit;
  const s = kit.stage();
  const P = Math.round(u * 0.8);
  const snap = (v) => Math.round(v / P) * P;
  const wide = kit.shape === "wide";

  // The arena floor: two pixel platforms, like a classic battle screen.
  const plat = (cx, cy, w) => kit.svg("ellipse", { cx, cy, rx: w, ry: w * 0.22, fill: "#2B2870" }, s);
  const ex = snap(wide ? safe.x + safe.width * 0.7 : width / 2 + safe.width * 0.18), ey = snap(safe.y + safe.height * 0.34);
  plat(ex, ey + P * 22, P * 26);
  const hx = snap(wide ? safe.x + safe.width * 0.18 : safe.x + safe.width * 0.1), hy = snap(safe.y + safe.height * 0.24);
  plat(hx + P * 12, hy + P * 30, P * 22);

  const slime = kit.pixels(s, { art: [".....GGGG.....", "...GGGGGGGG...", "..GGLGGGGGGG..", ".GGLLGGGGGGGG.", ".GGGGKGGGKGGG.", "GGGGKKGGGKKGGG", "GGGGGGGGGGGGGG", "GGGGGKKKKGGGGG", ".GGGGGGGGGGGG.", "..GGGGGGGGGG.."], palette: { G: "#C77DFF", L: "#F0D8FF", K: "#1A0F2E" }, x: 0, y: 0, size: P * 3 });
  const hero = kit.pixels(s, { art: ["....HHHH....", "...HHHHHH...", "...HSSSSH...", "...SSSSSK...", "...SSSSSS...", "....SSSS....", "...BBBBBB...", "..SBBBBBBS..", "..SBBBBBBS..", "...BBBBBB...", "...PPPPPP...", "...PP..PP...", "...PP..PP...", "..KKK..KKK.."], palette: { H: "#5A3A1E", S: "#F2C29B", K: "#111111", B: "#4CC9F0", P: "#2B2870" }, x: hx, y: hy, size: P * 2 });

  // The enemy's name and HP bar, in a box above it.
  const nameBox = kit.text(root, props.enemy.toUpperCase(), { x: ex - P * 21, y: safe.y, size: 2.4, font: "heading", colour: "#FFFFFF", style: { background: "#000", border: `${P}px solid #FFFFFF`, padding: `${u * 1.4}px ${u * 2}px ${u * 4}px`, minWidth: `${P * 42}px` } });
  const barX = ex - P * 18, barY = safe.y + u * 7.2, barW = P * 36;
  kit.svg("rect", { x: barX, y: barY, width: barW, height: P * 2, fill: "#3A3470" }, s);
  const hp = kit.svg("rect", { x: barX, y: barY, width: barW, height: P * 2, fill: "#3DDC84" }, s);
  const damage = kit.text(root, "", { x: ex, y: ey - P * 4, size: 3.4, font: "heading", align: "center", colour: colours.palette[1], style: { textShadow: `${P / 2}px ${P / 2}px 0 #000` } });

  // The menu, bottom right, with a blinking arrow cursor; the hero's line, bottom left.
  const menuX = wide ? safe.x + safe.width * 0.7 : safe.x + safe.width * 0.55, menuY = safe.y + safe.height * 0.72;
  const menu = props.menu.map((m, i) => kit.text(root, m.toUpperCase(), { x: menuX + u * 4, y: menuY + i * u * 5.4, size: 2.8, font: "heading", colour: "#FFFFFF" }));
  const frame = kit.svg("rect", { x: menuX - u * 1, y: menuY - u * 2.4, width: safe.x + safe.width - menuX + u, height: u * 19, fill: "#000", stroke: "#FFFFFF", "stroke-width": P }, s);
  s.insertBefore(frame, s.firstChild.nextSibling);
  const cursor = kit.text(root, "▶", { x: menuX + u * 0.6, y: menuY, size: 2.8, font: "body", colour: colours.accent });
  // The hero's line, in a dialogue box along the bottom left, beside the menu.
  const sayBox = kit.svg("rect", { x: safe.x, y: menuY - u * 2.4, width: menuX - safe.x - u * 3, height: u * 19, fill: "#000", stroke: "#FFFFFF", "stroke-width": P }, s);
  s.insertBefore(sayBox, frame);
  const say = kit.text(root, "", { x: safe.x + u * 3, y: menuY, size: 3, font: "heading", colour: "#FFFFFF", maxWidth: menuX - safe.x - u * 9, style: { lineHeight: "1.7" } });

  // The beats: the cursor moves to its pick, then three hits, a second apart.
  const pickAt = Math.max(1.2, (kit.at(0) || 0) + 1.6), hits = [0, 1, 2].map((i) => pickAt + 0.8 + i * 0.6);
  return (t) => {
    const enter = kit.progress(t, 0, 0.4);
    hero.setAttribute("transform", `translate(${-snap((1 - enter) * u * 40)} 0)`);
    let shake = 0, left = 1;
    hits.forEach((h, i) => { if (t >= h) left = 1 - (i + 1) / hits.length; if (t >= h && t < h + 0.25) shake = (Math.floor(t * 30) % 2 ? 1 : -1) * P * 2; });
    const beaten = t >= hits[2] + 0.3;
    slime.setAttribute("transform", `translate(${ex - P * 21 + shake} ${ey - P * 10 + (beaten ? snap(kit.progress(t, hits[2] + 0.3, 0.5) * P * 10) : 0)})`);
    slime.style.opacity = beaten ? String(1 - kit.progress(t, hits[2] + 0.3, 0.5)) : (shake && Math.floor(t * 20) % 2 ? "0.4" : "1");
    hp.setAttribute("width", String(snap(barW * left)));
    hp.setAttribute("fill", left > 0.5 ? "#3DDC84" : left > 0.2 ? colours.accent : colours.palette[1]);
    const lastHit = hits.filter((h) => t >= h).pop();
    damage.textContent = lastHit && t - lastHit < 0.5 ? "-33" : "";
    damage.style.translate = `-50% ${lastHit ? -snap((t - lastHit) * u * 12) : 0}px`;
    // Cursor starts on Fight, then steps to the pick.
    const row = t >= pickAt ? props.pick : 0;
    cursor.style.top = `${menuY + row * u * 5.4}px`;
    cursor.style.opacity = Math.floor(t * 3) % 3 === 2 ? "0.3" : "1";
    say.textContent = kit.typing(props.say, t, { at: pickAt + 0.1, cps: 26 });
  };
});
