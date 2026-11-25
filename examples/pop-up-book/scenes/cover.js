// The cover spread: the hills and the sun spring up off the page, then the title sign
// pops up in front of them on two posts, and a row of flowers pops up last of all.
Bezel.scene((root, kit) => {
  const { u, safe, colours, props, width } = kit;
  const s = kit.stage();
  const ink = colours.text, rim = "#FFFFFF";
  const base = safe.y + safe.height * 0.97;
  const left = safe.x - u * 4, right = safe.x + safe.width + u * 4;

  // A bumpy hilltop from left to right, closed down to the page.
  const hills = (top, amp, bumps, seed) => {
    const rand = kit.random(seed);
    let d = `M${left} ${base} L${left} ${top}`;
    const step = (right - left) / bumps;
    for (let i = 0; i < bumps; i++) {
      const x = left + step * (i + 0.5), h = amp * (0.6 + rand() * 0.6);
      d += ` Q${x} ${top - h * 2} ${left + step * (i + 1)} ${top + (rand() - 0.5) * amp * 0.3}`;
    }
    return d + ` L${right} ${base} Z`;
  };

  // Back layer: far hills with the sun fixed above them on the same card.
  const back = kit.popup(s, { base, x: width / 2 });
  const sunX = safe.x + safe.width * 0.8, sunY = safe.y + safe.height * 0.2, R = u * 7.5;
  let rays = "";
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    rays += `M${sunX + Math.cos(a - 0.12) * R * 1.15} ${sunY + Math.sin(a - 0.12) * R * 1.15} L${sunX + Math.cos(a) * R * 1.75} ${sunY + Math.sin(a) * R * 1.75} L${sunX + Math.cos(a + 0.12) * R * 1.15} ${sunY + Math.sin(a + 0.12) * R * 1.15} Z `;
  }
  kit.cutout(back.group, rays, { fill: "#E9A13B", edge: rim, edgeWidth: u * 0.45 });
  kit.cutout(back.group, `M${sunX - R} ${sunY} a${R} ${R} 0 1 0 ${R * 2} 0 a${R} ${R} 0 1 0 ${-R * 2} 0 Z`, { fill: "#F2C14E", edge: rim });
  // The sun's stalk down to the hills, as the card would really be cut.
  kit.cutout(back.group, `M${sunX - u * 0.8} ${sunY + R} L${sunX + u * 0.8} ${sunY + R} L${sunX + u * 0.8} ${safe.y + safe.height * 0.62} L${sunX - u * 0.8} ${safe.y + safe.height * 0.62} Z`, { fill: "#E9A13B", edge: rim, edgeWidth: u * 0.35, shadow: 0 });
  // Two clouds on stalks.
  const circle = (x, y, r) => `M${x - r} ${y} a${r} ${r} 0 1 0 ${r * 2} 0 a${r} ${r} 0 1 0 ${-r * 2} 0 Z `;
  [[0.1, 0.22, 1], [0.3, 0.1, 0.8]].forEach(([fx, fy, k]) => {
    const x = safe.x + safe.width * fx, y = safe.y + safe.height * fy, r = u * 4 * k;
    kit.cutout(back.group, `M${x + r * 1.1} ${y + r} h${u} V${safe.y + safe.height * 0.62} h${-u} Z`, { fill: "#E8E1D2", shadow: 0 });
    kit.cutout(back.group, circle(x, y, r) + circle(x + r * 1.2, y - r * 0.5, r * 1.25) + circle(x + r * 2.5, y, r) + `M${x} ${y} V${y + r} H${x + r * 2.5} V${y} Z`, { fill: "#FFFFFF", edge: rim });
  });
  kit.cutout(back.group, hills(safe.y + safe.height * 0.6, u * 4, 4, 3), { fill: "#8CC084", edge: rim });

  // Middle layer: nearer hills, a darker green.
  const mid = kit.popup(s, { base, x: width / 2 });
  kit.cutout(mid.group, hills(safe.y + safe.height * 0.76, u * 3, 5, 8), { fill: "#4E9A5F", edge: rim });

  // The title sign: a board on two posts.
  const sign = kit.popup(s, { base, x: width / 2 });
  // The sign is wider on narrow frames, so the title keeps to two or three short lines.
  const bw = kit.shape === "wide" ? Math.min(safe.width * 0.62, u * 96) : safe.width * 0.86, bh = kit.shape === "wide" ? u * 25 : u * 30;
  const bx = width / 2 - bw / 2, by = safe.y + safe.height * 0.16;
  for (const px of [bx + bw * 0.22, bx + bw * 0.78]) {
    kit.cutout(sign.group, `M${px - u * 1.2} ${by + bh - u} L${px + u * 1.2} ${by + bh - u} L${px + u * 1.2} ${base} L${px - u * 1.2} ${base} Z`, { fill: "#9B6A43", edge: rim, edgeWidth: u * 0.4 });
  }
  kit.cutout(sign.group, `M${bx + u * 3} ${by} H${bx + bw - u * 3} Q${bx + bw} ${by} ${bx + bw} ${by + u * 3} V${by + bh - u * 3} Q${bx + bw} ${by + bh} ${bx + bw - u * 3} ${by + bh} H${bx + u * 3} Q${bx} ${by + bh} ${bx} ${by + bh - u * 3} V${by + u * 3} Q${bx} ${by} ${bx + u * 3} ${by} Z`, { fill: "#FFFDF7", edge: rim, lift: u });
  const kicker = kit.text(root, props.kicker, { x: width / 2, y: by + u * 3.2, size: 3, align: "center", colour: colours.accent, weight: 800, style: { letterSpacing: "0.12em", textTransform: "uppercase" } });
  const title = kit.text(root, props.title, { x: width / 2, y: by + u * 8, size: kit.shape === "wide" ? 7 : 6, font: "heading", align: "center", colour: ink, maxWidth: bw - u * 8, style: { textWrap: "balance", lineHeight: "1.05" } });

  // Front layer: a row of flowers on stalks.
  const front = kit.popup(s, { base, x: width / 2 });
  const petals = ["#C8412A", "#7A4FA3", "#2B6CB0", "#C8412A", "#B35A06", "#7A4FA3", "#2B6CB0"];
  const n = 7;
  for (let i = 0; i < n; i++) {
    const fx = safe.x + (safe.width * (i + 0.5)) / n + (i % 2 ? u * 2 : -u * 2);
    if (Math.abs(fx - width / 2) < bw * 0.42 && i > 0 && i < n - 1) continue;
    const fy = base - u * (9 + (i % 3) * 3), r = u * 2.6;
    kit.cutout(front.group, `M${fx - u * 0.5} ${fy} L${fx + u * 0.5} ${fy} L${fx + u * 0.5} ${base} L${fx - u * 0.5} ${base} Z M${fx} ${base - u * 3} q${u * 3} ${-u * 2} ${u * 4} ${-u * 4} q${-u * 3} 0 ${-u * 4} ${u * 4} Z`, { fill: "#3E7D4C", edge: rim, edgeWidth: u * 0.35 });
    let flower = "";
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      flower += `M${fx + Math.cos(a) * r - r * 0.62} ${fy + Math.sin(a) * r} a${r * 0.62} ${r * 0.62} 0 1 0 ${r * 1.24} 0 a${r * 0.62} ${r * 0.62} 0 1 0 ${-r * 1.24} 0 Z `;
    }
    kit.cutout(front.group, flower, { fill: petals[i], edge: rim, edgeWidth: u * 0.4 });
    kit.cutout(front.group, `M${fx - r * 0.55} ${fy} a${r * 0.55} ${r * 0.55} 0 1 0 ${r * 1.1} 0 a${r * 0.55} ${r * 0.55} 0 1 0 ${-r * 1.1} 0 Z`, { fill: "#F2C14E", shadow: 0 });
  }

  const pop = (t, at) => kit.spring(t - at, { stiffness: 170, damping: 11 });
  return (t) => {
    back.set(pop(t, 0.15));
    mid.set(pop(t, 0.45));
    sign.set(pop(t, 0.8));
    front.set(pop(t, 1.25));
    const up = kit.clamp((pop(t, 0.8) - 0.85) * 6);
    kicker.style.opacity = title.style.opacity = String(up);
    title.style.translate = `-50% ${(1 - up) * u * 2}px`;
    kicker.style.translate = `-50% ${(1 - up) * u * 2}px`;
  };
});
