// The question is written across the top. Below, a figure is sketched in, a to-do note
// pops up over its head, and it shrugs.
Bezel.scene((root, kit) => {
  const { u, safe, colours, props } = kit;
  const s = kit.stage();
  const title = kit.text(root, props.title, { x: safe.x + safe.width / 2, y: safe.y + u * 2, size: kit.shape === "tall" ? 9 : 10, font: "heading", align: "center" });

  const figH = Math.min(safe.height * 0.55, u * 40);
  const fx = safe.x + safe.width / 2, fy = safe.y + safe.height - u * 2;
  const person = kit.figure(s, { x: fx, y: fy, height: figH, width: u * 0.65, face: "neutral" }).pose("stand");

  // The note: a little square with a folded corner and the task written on it.
  const nw = u * 36, nh = u * 13;
  const nx = fx + figH * 0.25, ny = fy - figH * 1.15;
  const note = kit.svg("g", {}, s);
  kit.svg("path", { d: `M${nx} ${ny} h${nw} v${nh - u * 3} l${-u * 3} ${u * 3} h${-nw + u * 3} z`, fill: "#FFE58A", stroke: colours.text, "stroke-width": u * 0.4, "stroke-linejoin": "round" }, note);
  kit.svg("path", { d: `M${nx + nw - u * 3} ${ny + nh} v${-u * 3} h${u * 3}`, fill: "none", stroke: colours.text, "stroke-width": u * 0.4 }, note);
  const task = kit.text(root, props.task, { x: nx + nw / 2, y: ny + nh / 2 - u * 2.2, size: 3.6, font: "heading", align: "center" });

  const plan = kit.drawing({ pen: true, penColour: colours.accent });
  const t = plan.sequence(0.2, [{ node: title, duration: 1.4 }]);
  plan.sequence(t + 0.1, person.paths.map((node, i) => ({ node, duration: i === 0 ? 0.35 : 0.18 })));
  const noteAt = 2.4;

  return (time) => {
    const p = kit.spring(time - noteAt, { stiffness: 200, damping: 12 });
    note.style.transformOrigin = `${nx}px ${ny + nh}px`;
    note.style.transform = `scale(${Math.max(0, p)}) rotate(${-4 * p}deg)`;
    task.style.opacity = String(kit.clamp(p * 2 - 0.6));
    task.style.rotate = `${-4 * p}deg`;
    person.pose("stand", "shrug", kit.progress(time, noteAt + 0.6, 0.5, "outBack"));
    // Last, so the pen follows the figure as it is now.
    plan.draw(time);
  };
});
