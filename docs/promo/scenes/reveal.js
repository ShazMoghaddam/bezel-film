// The reveal: the Bezel Film mark rises into the light, the name in gradient type beside it
// (or under it in narrow frames), then the line and two small facts.
Bezel.scene((root, kit) => {
  const { u, safe, colours, props } = kit;
  const s = kit.stage();
  const narrow = kit.shape !== "wide";
  const cx = safe.x + safe.width / 2;
  const markSize = u * (narrow ? 20 : 16);
  const markY = safe.y + safe.height * (narrow ? 0.12 : 0.16);
  // The mark: a rounded square in the brand's colours with a play triangle cut into it.
  const defs = kit.svg("defs", {}, s);
  const grad = kit.svg("linearGradient", { id: "bf-mark", x1: "0", y1: "0", x2: "1", y2: "1" }, defs);
  ["#4C8DFF", "#9B5DE5", "#FF5D73", "#FFB020", "#2EC4B6"].forEach((c, i) => kit.svg("stop", { offset: String(i / 4), "stop-color": c }, grad));
  const mark = kit.svg("g", {}, s);
  kit.svg("rect", { x: cx - markSize / 2, y: markY, width: markSize, height: markSize, rx: markSize * 0.28, fill: "url(#bf-mark)" }, mark);
  const tri = markSize * 0.36;
  kit.svg("path", { d: `M${cx - tri * 0.35} ${markY + markSize / 2 - tri * 0.6} L${cx + tri * 0.62} ${markY + markSize / 2} L${cx - tri * 0.35} ${markY + markSize / 2 + tri * 0.6} Z`, fill: colours.background }, mark);
  const name = kit.text(root, "", { x: cx, y: markY + markSize + u * 4, size: narrow ? 13 : 12, font: "heading", align: "center", colour: colours.text, fit: false,
    style: { letterSpacing: "-0.045em", lineHeight: "1" } });
  name.innerHTML = 'Bezel <span style="background:linear-gradient(90deg,#4C8DFF,#9B5DE5 45%,#FF5D73);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:#C9B8FF">Film</span>';
  const base = root.getBoundingClientRect();
  const below = (el, gap) => el.getBoundingClientRect().bottom - base.top + gap;
  const line = kit.text(root, props.line, { x: cx, y: below(name, u * 3), size: narrow ? 5 : 4.6, align: "center", colour: colours.text, maxWidth: safe.width, style: { textWrap: "balance" } });
  const facts = kit.text(root, props.facts, { x: cx, y: below(line, u * 2.5), size: 3.4, weight: 500, align: "center", colour: colours.muted, maxWidth: safe.width });

  return (t) => {
    const m = kit.progress(t, 0.2, 1.2, "out");
    mark.setAttribute("opacity", String(m));
    mark.setAttribute("transform", `translate(0 ${(1 - m) * u * 6})`);
    [[name, 0.8], [line, Math.max(1.6, kit.at(1))], [facts, Math.max(2.4, kit.at(2))]].forEach(([el, at]) => {
      const k = kit.progress(t, at, 1, "out");
      el.style.opacity = String(k);
      el.style.transform = `translateY(${(1 - k) * u * 2}px)`;
    });
  };
});
