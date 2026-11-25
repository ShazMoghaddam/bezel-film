// The working, written up a line at a time as it's spoken, like a teacher at the board.
// A note in pink explains the shortcut, and the result is boxed in yellow.
Bezel.scene((root, kit) => {
  const { u, safe, colours } = kit;
  const [yellow, pink] = colours.palette;
  const narrow = kit.shape !== "wide";
  const board = kit.el("div", { style: { position: "absolute", inset: "0", filter: "url(#chalk)" } }, root);
  const s = kit.stage(board);
  const steps = kit.props.steps;
  const size = narrow ? 5.2 : 6;
  const gap = size * u * 1.55;
  const x = safe.x + safe.width * (narrow ? 0.04 : 0.12);
  const top = safe.y + (safe.height - gap * steps.length) / 2;

  const lines = steps.map((line, i) => kit.text(board, line, { x, y: top + i * gap, size, colour: i === steps.length - 1 ? yellow : colours.text }));
  const base = root.getBoundingClientRect();
  const box = lines[lines.length - 1].getBoundingClientRect();
  const frame = kit.svg("path", { d: kit.rough.rect(box.left - base.left - u * 1.6, box.top - base.top - u * 0.6, box.width + u * 3.2, box.height + u * 1.2, { seed: 6 }),
    fill: "none", stroke: yellow, "stroke-width": u * 0.45, "stroke-linecap": "round" }, s);
  const third = lines[2].getBoundingClientRect();
  const note = kit.text(board, kit.props.note, { x: narrow ? x : third.right - base.left + u * 5, y: narrow ? third.bottom - base.top + u * 0.4 : third.top - base.top + u * 1.2, size: 3.6, colour: pink, maxWidth: narrow ? safe.width * 0.8 : safe.width * 0.3 });

  // Each line starts as its sentence is spoken.
  const plan = kit.drawing({ pen: "chalk", dust: true });
  const when = [kit.at(0) + 0.3, kit.at(1) + 0.2, kit.at(1) + 1.6, kit.at(2) + 0.6, kit.at(3) + 0.3];
  lines.forEach((node, i) => plan.write(node, { at: when[i], duration: 0.9 + steps[i].length * 0.03 }));
  plan.write(note, { at: kit.at(2) + 2.2, duration: 1.1 });
  plan.line(frame, { at: when[when.length - 1] + 1.6, duration: 0.7 });

  // Then the eraser clears the working and leaves the rule standing.
  const wipe = kit.erase(board, { area: { x: 0, y: 0, width: kit.width, height: box.top - base.top - u * 2.2 }, seed: 5 });
  const wipeAt = kit.at(3) + 2.8;
  const wipeFor = Math.min(2.2, kit.duration - wipeAt - 0.15);
  return (time) => {
    plan.draw(time);
    wipe.set(kit.progress(time, wipeAt, wipeFor, "inOut"));
  };
});
