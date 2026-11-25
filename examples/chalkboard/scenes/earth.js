// You, standing on a chalk Earth. Your sightline just touches the curve: that's the
// horizon. The triangle it makes with the Earth's centre is what we'll solve.
Bezel.scene((root, kit) => {
  const { u, safe, colours } = kit;
  const [yellow, pink, blue] = colours.palette;
  const board = kit.el("div", { style: { position: "absolute", inset: "0", filter: "url(#chalk)" } }, root);
  const s = kit.stage(board);
  const R = Math.min(safe.height * 0.34, safe.width * 0.3);
  const O = { x: safe.x + safe.width * (kit.shape === "wide" ? 0.38 : 0.5), y: safe.y + safe.height * 0.62 };
  const h = R * 0.42;
  const eye = { x: O.x, y: O.y - R - h };
  const theta = Math.acos(R / (R + h));
  const T = { x: O.x + R * Math.sin(theta), y: O.y - R * Math.cos(theta) };
  const beyond = { x: T.x + (T.x - eye.x) * 0.35, y: T.y + (T.y - eye.y) * 0.35 };

  const chalk = (colour, w = 0.45) => kit.svg("g", { fill: "none", stroke: colour, "stroke-width": u * w, "stroke-linecap": "round", "stroke-linejoin": "round" }, s);
  const white = chalk(colours.text), sight = chalk(yellow, 0.5), radii = chalk(blue, 0.35), tall = chalk(pink, 0.45);
  // Diagram lines are drawn with a ruler: straight, only the chalk itself is rough.
  const ruler = (a, b) => "M" + a.x.toFixed(1) + " " + a.y.toFixed(1) + " L" + b.x.toFixed(1) + " " + b.y.toFixed(1);
  const earth = kit.svg("path", { d: kit.rough.ellipse(O.x, O.y, R, R, { seed: 2, wobble: 0.5, turns: 1.01 }) }, white);
  // A little stick figure standing on top, eyes at the top of h.
  const feet = { x: O.x, y: O.y - R }, hip = { x: O.x, y: feet.y - h * 0.45 }, neck = { x: O.x, y: feet.y - h * 0.82 };
  const headR = h * 0.1;
  const person = kit.svg("path", { d: ruler({ x: hip.x - h * 0.14, y: feet.y }, hip) + " " + ruler(hip, { x: hip.x + h * 0.14, y: feet.y }) + " " + ruler(hip, neck)
    + " " + ruler({ x: neck.x - h * 0.16, y: neck.y + h * 0.2 }, { x: neck.x, y: neck.y + h * 0.04 }) + " " + ruler({ x: neck.x, y: neck.y + h * 0.04 }, { x: neck.x + h * 0.16, y: neck.y + h * 0.2 }) }, white);
  const head = kit.svg("path", { d: kit.rough.ellipse(O.x, eye.y + headR * 0.2, headR, headR, { seed: 8, wobble: 0.4 }) }, white);
  const line = kit.svg("path", { d: ruler(eye, beyond) }, sight);
  const r1 = kit.svg("path", { d: ruler(O, feet) }, radii);
  const r2 = kit.svg("path", { d: ruler(O, T) }, radii);
  const hMark = kit.svg("path", { d: ruler({ x: eye.x - h * 0.42, y: feet.y }, { x: eye.x - h * 0.42, y: eye.y }) + " " + ruler({ x: eye.x - h * 0.42 - u, y: feet.y }, { x: eye.x - h * 0.42 + u, y: feet.y }) + " " + ruler({ x: eye.x - h * 0.42 - u, y: eye.y }, { x: eye.x - h * 0.42 + u, y: eye.y }) }, tall);
  const corner = (() => {
    const k = u * 2.2, a = { x: (O.x - T.x) / R, y: (O.y - T.y) / R }, b = { x: (eye.x - T.x) / Math.hypot(eye.x - T.x, eye.y - T.y), y: (eye.y - T.y) / Math.hypot(eye.x - T.x, eye.y - T.y) };
    return kit.svg("path", { d: "M" + (T.x + a.x * k) + " " + (T.y + a.y * k) + " L" + (T.x + (a.x + b.x) * k) + " " + (T.y + (a.y + b.y) * k) + " L" + (T.x + b.x * k) + " " + (T.y + b.y * k) }, chalk(colours.text, 0.3));
  })();

  const label = (words, x, y, colour, align = "left") => kit.text(board, words, { x, y, size: 4.2, colour, align, fit: false });
  const you = label(kit.props.you, eye.x + h * 0.3, eye.y - u * 5.6, colours.text);
  const hz = label(kit.props.horizon, T.x + u * 2.5, T.y - u * 1.5, yellow);
  const hl = label("h", eye.x - h * 0.42 - u * 1.8, (eye.y + feet.y) / 2 - u * 2.6, pink, "right");
  const rl = label("R", (O.x + T.x) / 2 + u * 1.6, (O.y + T.y) / 2 - u * 1, blue);
  const dl = label("d", (eye.x + T.x) / 2 + u * 1.2, (eye.y + T.y) / 2 - u * 5, yellow);

  const plan = kit.drawing({ pen: "chalk", dust: true });
  // Each part lands on its sentence: you and the Earth, the sightline, then the triangle.
  plan.sequence(kit.at(0) + 0.2, [{ node: earth, duration: 1.4 }, { node: person, duration: 0.35 }, { node: head, duration: 0.35 }, { node: you, duration: 0.4 }]);
  plan.sequence(kit.at(1) + 0.3, [{ node: line, duration: 0.8 }, { node: hz, duration: 0.6 }, { node: dl, duration: 0.2 }]);
  plan.sequence(kit.at(2) + 0.2, [{ node: r1, duration: 0.45 }, { node: r2, duration: 0.45 }, { node: rl, duration: 0.2 }, { node: corner, duration: 0.3 }, { node: hMark, duration: 0.3 }, { node: hl, duration: 0.2 }]);

  // On the last sentence the eraser clears the board, ready for the working.
  const wipe = kit.erase(board, { seed: 3 });
  const wipeAt = kit.at(3) + 0.2;
  const wipeFor = Math.min(2.4, kit.duration - wipeAt - 0.15);
  return (time) => {
    plan.draw(time);
    wipe.set(kit.progress(time, wipeAt, wipeFor, "inOut"));
  };
});
