// A comic panel: blue dots behind, speed lines bursting out, the bottle bouncing up into
// frame, a "POW!" starburst punching in behind it and a speech bubble that types out.
Bezel.scene((root, kit) => {
  const { u, colours, props, width, height, safe } = kit;
  const s = kit.stage();
  const ink = colours.text;
  const wide = kit.shape === "wide";

  // The panel's own ground: pale blue with big blue dots, framed in black.
  kit.svg("rect", { x: 0, y: 0, width, height, fill: "#BFD7F5" }, s);
  kit.svg("rect", { x: 0, y: 0, width, height, fill: kit.tone(s, { kind: "dots", size: u * 2.4, colour: "#1D4FB8", weight: 0.3, angle: 30 }), opacity: 0.55 }, s);
  const bx = wide ? safe.x + safe.width * 0.32 : width / 2, by = safe.y + safe.height * 0.98;
  const lines = kit.speedLines(s, { kind: "focus", cx: bx, cy: by - safe.height * 0.45, box: { x: 0, y: 0, width, height }, count: 70, inner: u * 26, colour: "#FFFFFF", seed: 3 });

  // The starburst behind the bottle, with the shout on it.
  const sx = wide ? bx + safe.width * 0.18 : safe.x + safe.width * 0.2, sy = safe.y + safe.height * (wide ? 0.22 : 0.52);
  const burst = kit.svg("g", {}, s);
  kit.burst(burst, { cx: sx, cy: sy, r: u * 17, points: 16, fill: "#FFE14D", stroke: ink, strokeWidth: u * 0.6, seed: 4 });
  kit.burst(burst, { cx: sx, cy: sy, r: u * 12, points: 12, fill: colours.accent, stroke: ink, strokeWidth: u * 0.4, seed: 7, inner: 0.78 });
  const shout = kit.text(root, props.shout, { x: sx, y: sy - u * 4.6, size: 7, font: "heading", align: "center", colour: "#FFFFFF", style: { textTransform: "uppercase", WebkitTextStroke: `${u * 0.25}px ${ink}`, rotate: "-8deg" } });

  // The bottle: red sauce in clear glass, a black cap and a white label.
  const bw = Math.min(safe.width * 0.17, u * 24), bh = Math.min(safe.height * 0.78, bw * 2.8);
  const bottle = kit.svg("g", {}, s);
  const x0 = bx - bw / 2, top = by - bh, neck = bw * 0.36;
  const shape = `M${x0} ${by} V${top + bh * 0.42} Q${x0} ${top + bh * 0.3} ${bx - neck / 2} ${top + bh * 0.2} V${top + bh * 0.08} H${bx + neck / 2} V${top + bh * 0.2} Q${x0 + bw} ${top + bh * 0.3} ${x0 + bw} ${top + bh * 0.42} V${by} Z`;
  kit.svg("path", { d: shape, fill: colours.accent, stroke: ink, "stroke-width": u * 0.7, "stroke-linejoin": "round" }, bottle);
  kit.svg("path", { d: shape, fill: kit.tone(s, { kind: "dots", size: u * 1.2, colour: ink, weight: 0.3 }), opacity: 0.25 }, bottle);
  kit.svg("rect", { x: bx - neck / 2 - u * 0.6, y: top, width: neck + u * 1.2, height: bh * 0.1, fill: ink }, bottle);
  kit.svg("path", { d: `M${x0 + bw * 0.16} ${top + bh * 0.48} V${by - bh * 0.06}`, stroke: "#FFFFFF", "stroke-width": u * 1.1, "stroke-linecap": "round" }, bottle);
  const ly = top + bh * 0.52, lh = bh * 0.26;
  kit.svg("rect", { x: x0 - u * 0.2, y: ly, width: bw + u * 0.4, height: lh, fill: "#FFFFFF", stroke: ink, "stroke-width": u * 0.5 }, bottle);
  const label = kit.text(root, props.label, { x: bx, y: ly + lh / 2 - u * 3.4, size: 5.6, font: "heading", align: "center", colour: colours.accent, style: { textTransform: "uppercase" } });

  // The speech bubble, its tail pointing down at the bottle's cap.
  const bubW = Math.min(wide ? safe.width * 0.36 : safe.width * 0.8, u * 64), bubH = u * 17;
  const bubX = wide ? bx + bw * 1.1 : width / 2 - bubW / 2, bubY = wide ? safe.y + safe.height * 0.5 : safe.y;
  const bubble = kit.bubble(s, { x: bubX, y: bubY, width: bubW, height: bubH, tail: [bx + bw * 0.62, top + bh * 0.36], stroke: ink, strokeWidth: u * 0.6 });
  const speech = kit.text(root, "", { x: bubX + bubW / 2, y: bubY + bubH / 2 - u * 4, size: 3.8, font: "heading", align: "center", colour: ink, maxWidth: bubW * 0.78, style: { textTransform: "uppercase", lineHeight: "1.15" } });

  return (t) => {
    const up = kit.spring(t - 0.15, { stiffness: 220, damping: 13 });
    bottle.setAttribute("transform", `translate(0 ${(1 - up) * bh * 1.1}) rotate(${(1 - up) * 10} ${bx} ${by})`);
    label.style.translate = `-50% ${(1 - up) * bh * 1.1}px`;
    lines.style.opacity = String(kit.progress(t, 0.5, 0.2));
    const pow = kit.spring(t - 0.8, { stiffness: 300, damping: 11 });
    const show = t >= 0.8;
    burst.style.opacity = shout.style.opacity = show ? "1" : "0";
    burst.setAttribute("transform", `translate(${sx} ${sy}) scale(${Math.max(0, pow)}) rotate(${(1 - pow) * -40}) translate(${-sx} ${-sy})`);
    shout.style.scale = String(Math.max(0, pow));
    // The bubble pops at the second beat, then the words type out on twos.
    const at = Math.max(1.6, (kit.at(0) || 0) + 1.2);
    const b = kit.spring(t - at, { stiffness: 300, damping: 14 });
    bubble.group.style.opacity = t >= at ? "1" : "0";
    bubble.group.setAttribute("transform", `translate(${bubX + bubW / 2} ${bubY + bubH / 2}) scale(${Math.max(0, b)}) translate(${-(bubX + bubW / 2)} ${-(bubY + bubH / 2)})`);
    const chars = Math.floor(kit.stepped(Math.max(0, t - at - 0.2), 12) * 22);
    speech.textContent = props.speech.slice(0, chars);
  };
});
