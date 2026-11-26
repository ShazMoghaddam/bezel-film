// The question, set big in white on the black stage, one line at a time, with a small lift.
Bezel.scene((root, kit) => {
  const { u, safe, colours, props } = kit;
  const narrow = kit.shape !== "wide";
  const size = narrow ? 9.5 : 9;
  const lines = props.lines.map((text, i) => kit.text(root, text, { x: safe.x + safe.width / 2, y: 0, size, font: "heading", align: "center", colour: i === props.lines.length - 1 ? colours.muted : colours.text,
    maxWidth: safe.width, style: { letterSpacing: "-0.04em", lineHeight: "1.02", textWrap: "balance" } }));
  // Stack them in the middle of the safe area, however many lines each wrapped to.
  const heights = lines.map((l) => l.getBoundingClientRect().height);
  const gap = u * 3;
  let y = safe.y + (safe.height - heights.reduce((a, b) => a + b, 0) - gap * (lines.length - 1)) / 2;
  lines.forEach((l, i) => { l.style.top = y + "px"; y += heights[i] + gap; });
  const at = lines.map((_, i) => Math.max(0.3 + i * 0.8, kit.at(i) + 0.1));
  return (t) => lines.forEach((l, i) => {
    const k = kit.progress(t, at[i], 1, "out");
    l.style.opacity = String(k);
    l.style.transform = `translateY(${(1 - k) * u * 2.5}px)`;
  });
});
