// The opening: a slow pool of light comes up on the black stage, the name rises into it
// in big gradient type, and the line fades in beneath. Nothing else.
Bezel.scene((root, kit) => {
  const { u, safe, colours, props, width } = kit;
  const s = kit.stage();
  const [blue, pink] = colours.palette;
  const light = kit.glow(s, { cx: width / 2, cy: safe.y + safe.height * 0.42, r: safe.width * 0.42, colour: blue, strength: 0.32 });
  const name = kit.text(root, props.name, { x: width / 2, y: safe.y + safe.height * 0.26, size: 22, font: "heading", align: "center", colour: colours.text,
    style: { letterSpacing: "-0.05em", lineHeight: "1.05", paddingBottom: `${u}px`, background: `linear-gradient(100deg, ${colours.text} 30%, ${blue} 62%, ${pink} 90%)`, WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" } });
  const line = kit.text(root, props.line, { x: width / 2, y: safe.y + safe.height * 0.62, size: 5.2, align: "center", colour: colours.muted, style: { letterSpacing: "-0.01em" } });

  return (t) => {
    light.style.opacity = String(kit.progress(t, 0, 2, "inOut"));
    const n = kit.progress(t, 0.4, 1.4, "out");
    name.style.opacity = String(n);
    name.style.translate = `-50% ${(1 - n) * u * 4}px`;
    // The gradient drifts slowly across the letters, like light on glass.
    name.style.backgroundPosition = `${(t * 6) % 200}% 0`;
    name.style.backgroundSize = "200% 100%";
    const l = kit.progress(t, Math.max(1.6, kit.at(1) || 0), 1, "out");
    line.style.opacity = String(l);
    line.style.translate = `-50% ${(1 - l) * u * 2}px`;
  };
});
