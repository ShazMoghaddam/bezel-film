// Up on a cliff: the same rule, a much longer sightline. A small sketch beside the working.
Bezel.scene((root, kit) => {
  const { u, safe, colours } = kit;
  const [yellow, pink] = colours.palette;
  const narrow = kit.shape !== "wide";
  const board = kit.el("div", { style: { position: "absolute", inset: "0", filter: "url(#chalk)" } }, root);
  const s = kit.stage(board);
  const base = root.getBoundingClientRect();
  const box = (node) => { const r = node.getBoundingClientRect(); return { x: r.left - base.left, y: r.top - base.top, w: r.width, h: r.height }; };
  const ruler = (a, b) => "M" + a.x.toFixed(1) + " " + a.y.toFixed(1) + " L" + b.x.toFixed(1) + " " + b.y.toFixed(1);

  // The working, on the left (or the top, in narrow frames).
  const x = safe.x + safe.width * (narrow ? 0.04 : 0.06);
  let y = safe.y + safe.height * (narrow ? 0.03 : 0.12);
  const question = kit.text(board, kit.props.question, { x, y, size: narrow ? 6.5 : 7, font: "heading", colour: colours.text, maxWidth: narrow ? safe.width * 0.92 : safe.width * 0.5 });
  y += box(question).h + u * 4;
  const sum = kit.text(board, kit.props.sum, { x, y, size: narrow ? 4.6 : 5, colour: colours.text, maxWidth: narrow ? safe.width * 0.92 : safe.width * 0.5 });
  y += box(sum).h + u * 5;
  const answer = kit.text(board, kit.props.answer, { x: x + u * 2, y, size: narrow ? 8 : 9, font: "heading", colour: yellow });
  const ab = box(answer);
  const ring = kit.svg("path", { d: kit.rough.ellipse(ab.x + ab.w / 2, ab.y + ab.h / 2, ab.w * 0.6 + u * 2, ab.h * 0.62 + u * 1.1, { seed: 21, wobble: 0.8, turns: 1.12 }),
    fill: "none", stroke: yellow, "stroke-width": u * 0.5, "stroke-linecap": "round" }, s);
  const note = kit.text(board, kit.props.note, { x, y: ab.y + ab.h + u * 3.4, size: 3.8, colour: pink, maxWidth: narrow ? safe.width * 0.9 : safe.width * 0.42 });

  // The sketch: a cliff on the curve of the sea, you on top, your sightline to the horizon.
  const area = narrow
    ? { x: safe.x, y: box(note).y + box(note).h + u * 3, w: safe.width, h: safe.y + safe.height - (box(note).y + box(note).h + u * 3) }
    : { x: safe.x + safe.width * 0.54, y: safe.y + safe.height * 0.08, w: safe.width * 0.46, h: safe.height * 0.84 };
  // In narrow frames a rounder Earth and a lower cliff keep the horizon on the board.
  const R = area.w * (narrow ? 1.2 : 1.5);
  const cliffH = Math.min(area.h * (narrow ? 0.3 : 0.34), area.w * (narrow ? 0.15 : 0.22));
  const O = { x: narrow ? area.x + cliffH * 1.25 + u * 3 : area.x + area.w * 0.24, y: area.y + area.h * 0.62 + R };
  const top = { x: O.x, y: O.y - R - cliffH };
  const theta = Math.acos(R / (R + cliffH));
  const T = { x: O.x + R * Math.sin(theta), y: O.y - R * Math.cos(theta) };
  // The sea's curve, from behind the headland to just past the horizon.
  const onSea = (x) => ({ x, y: O.y - Math.sqrt(R * R - (x - O.x) * (x - O.x)) });
  const back = onSea(O.x - cliffH * 1.25);
  const from = Math.asin((back.x - O.x) / R) - 0.04;
  let sea = "";
  for (let i = 0; i <= 24; i++) {
    const a = from + (i / 24) * (theta + 0.06 - from);
    sea += (i ? " L" : "M") + (O.x + R * Math.sin(a)).toFixed(1) + " " + (O.y - R * Math.cos(a)).toFixed(1);
  }
  const chalk = (colour, w = 0.42) => kit.svg("g", { fill: "none", stroke: colour, "stroke-width": u * w, "stroke-linecap": "round", "stroke-linejoin": "round" }, s);
  const seaLine = kit.svg("path", { d: sea }, chalk(colours.palette[2]));
  const foot = { x: O.x, y: O.y - R };
  // Land behind you, then a rugged face dropping to the sea.
  const cliff = kit.svg("path", { d: "M" + back.x + " " + back.y + " Q " + (top.x - cliffH * 0.95) + " " + (top.y - cliffH * 0.05) + " " + (top.x + cliffH * 0.12) + " " + top.y
    + " L" + (top.x + cliffH * 0.22) + " " + (top.y + cliffH * 0.3) + " L" + (top.x + cliffH * 0.14) + " " + (top.y + cliffH * 0.52) + " L" + (top.x + cliffH * 0.3) + " " + (top.y + cliffH * 0.78) + " L" + (top.x + cliffH * 0.26) + " " + foot.y }, chalk(colours.text));
  const fig = cliffH * 0.2;
  const eye = { x: top.x - fig * 0.1, y: top.y - fig * 1.05 };
  const person = kit.svg("path", { d: ruler({ x: eye.x, y: top.y }, { x: eye.x, y: top.y - fig * 0.8 }) + " " + kit.rough.ellipse(eye.x, top.y - fig * 0.95, fig * 0.16, fig * 0.16, { seed: 3, wobble: 0.3 }) }, chalk(colours.text, 0.3));
  const sight = kit.svg("path", { d: ruler(eye, { x: T.x + (T.x - eye.x) * 0.08, y: T.y + (T.y - eye.y) * 0.08 }) }, chalk(yellow, 0.45));
  // The height, measured beside the face.
  const barX = back.x - u * 2;
  const bar = kit.svg("path", { d: ruler({ x: barX, y: top.y }, { x: barX, y: foot.y }) + " " + ruler({ x: barX - u, y: top.y }, { x: barX + u, y: top.y }) + " " + ruler({ x: barX - u, y: foot.y }, { x: barX + u, y: foot.y }) }, chalk(pink, 0.3));
  // Beside the bar, or above it in narrow frames where there's no room to its left.
  const height = narrow
    ? kit.text(board, kit.props.height, { x: barX - u, y: top.y - u * 5.2, size: 3.4, colour: pink, fit: false })
    : kit.text(board, kit.props.height, { x: barX - u * 1.6, y: (top.y + foot.y) / 2 - u * 2, size: 3.4, align: "right", colour: pink, fit: false });

  const plan = kit.drawing({ pen: "chalk", dust: true });
  plan.write(question, { at: 0.2, duration: 1 });
  plan.sequence(1.3, [{ node: seaLine, duration: 0.5 }, { node: cliff, duration: 0.5 }, { node: person, duration: 0.25 }, { node: bar, duration: 0.2 }, { node: height, duration: 0.25 }, { node: sight, duration: 0.5 }]);
  plan.write(sum, { at: kit.at(1) + 0.1, duration: 1.4 });
  plan.write(answer, { at: kit.at(1) + 1.8, duration: 0.8 });
  plan.line(ring, { at: kit.at(1) + 2.7, duration: 0.7 });
  plan.write(note, { at: kit.at(2) + 0.2, duration: 1.2 });
  return (time) => plan.draw(time);
});
