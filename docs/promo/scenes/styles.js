// The styles: a laptop in the light, its screen cutting from one style to the next as each
// is named, then flicking quickly through the rest. The count and the name sit beside it.
Bezel.scene((root, kit) => {
  const { u, safe, colours, props } = kit;
  const s = kit.stage();
  const narrow = kit.shape !== "wide";
  const w = narrow ? safe.width * 0.96 : safe.width * 0.6;
  const dev = kit.device(s, { kind: "laptop", x: narrow ? safe.x + (safe.width - w) / 2 : safe.x + safe.width - w, y: narrow ? safe.y + safe.height * 0.36 : safe.y + safe.height * 0.14, width: w });
  const scr = dev.screen;
  const pics = props.styles.map((st) => kit.svg("image", { href: kit.asset("pictures/" + st.file + ".jpg"), x: scr.x, y: scr.y, width: scr.width, height: scr.height, preserveAspectRatio: "xMidYMid slice", opacity: 0 }, dev.content));
  const tx = narrow ? safe.x : safe.x;
  const count = kit.text(root, props.count, { x: tx, y: narrow ? safe.y : safe.y + safe.height * 0.2, size: narrow ? 11 : 12, font: "heading", colour: colours.text, fit: false, style: { letterSpacing: "-0.05em", lineHeight: "0.95" } });
  const base = root.getBoundingClientRect();
  const label = kit.text(root, "", { x: tx, y: count.getBoundingClientRect().bottom - base.top + u * 2, size: narrow ? 5 : 5.2, weight: 600, colour: colours.accent, fit: false });
  const sub = kit.text(root, props.sub, { x: tx, y: count.getBoundingClientRect().bottom - base.top + u * 10, size: 3.6, colour: colours.muted, maxWidth: narrow ? safe.width : safe.width * 0.34 });

  // When each style comes on screen: named ones on their sentence, the rest quickly after.
  const named = props.styles.filter((st) => st.line != null);
  const lastNamed = named.length ? kit.at(named[named.length - 1].line) + 1.2 : 1;
  let quick = 0;
  const starts = props.styles.map((st) => (st.line != null ? kit.at(st.line) : lastNamed + quick++ * 0.32));
  const devAt = 0.2;
  return (t) => {
    const d = kit.progress(t, devAt, 1.1, "out");
    dev.group.setAttribute("opacity", String(d));
    dev.group.setAttribute("transform", `translate(0 ${(1 - d) * u * 8})`);
    let on = 0;
    starts.forEach((st, i) => { if (t >= st) on = i; });
    pics.forEach((p, i) => p.setAttribute("opacity", i === on ? "1" : "0"));
    label.textContent = on >= 0 ? props.styles[on].name : "";
    const c = kit.progress(t, 0.5, 1, "out");
    count.style.opacity = String(c);
    sub.style.opacity = String(kit.progress(t, Math.max(1.4, kit.at(0) + 1.4), 0.8, "out"));
  };
});
