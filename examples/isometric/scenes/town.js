// A small town rises out of the ground, block by block: offices with rows of windows,
// trees, and a little park with a recycling bin in the middle. The question floats above.
Bezel.scene((root, kit) => {
  const { u, safe, colours, props } = kit;
  const s = kit.stage();
  const P = colours.palette;
  const N = 8;
  const unit = Math.min(safe.width / (1.732 * N), (safe.height * 0.74) / (N * 0.5 + 5));
  const iso = kit.iso({ x: safe.x + safe.width / 2, y: safe.y + safe.height * 0.97 - N * unit, unit });
  iso.tile(s, { x: 0, y: 0, w: N, d: N, colour: "#DCE6D2", shadow: true });
  iso.tile(s, { x: 0, y: 3.5, w: N, d: 1, colour: "#C7CDD8" });
  iso.tile(s, { x: 3.5, y: 0, w: 1, d: N, colour: "#C7CDD8" });
  iso.tile(s, { x: 4.9, y: 4.9, w: 2.7, d: 2.7, colour: "#B9DBA6" });

  // Windows on a building's two visible faces, as rows of small panes.
  function windows(g, x, y, w, d, h) {
    const panes = [];
    const pane = (corners) => panes.push(kit.svg("polygon", { points: corners.map((p) => p.x + "," + p.y).join(" "), fill: "#FFFFFF", opacity: 0.75 }, g));
    for (let z = 0.45; z < h - 0.3; z += 0.7) {
      for (let i = 0.25; i < w - 0.2; i += 0.55) pane([iso.at(x + i, y + d, z), iso.at(x + i + 0.3, y + d, z), iso.at(x + i + 0.3, y + d, z + 0.35), iso.at(x + i, y + d, z + 0.35)]);
      for (let j = 0.25; j < d - 0.2; j += 0.55) pane([iso.at(x + w, y + j, z), iso.at(x + w, y + j + 0.3, z), iso.at(x + w, y + j + 0.3, z + 0.35), iso.at(x + w, y + j, z + 0.35)]);
    }
    return panes;
  }
  // Back to front, so nearer buildings overlap farther ones.
  const spots = [
    [0.4, 0.4, 2.4, 2.4, 3.4, P[0]], [5, 0.4, 2.4, 1.3, 5.2, P[4]], [5, 2.0, 1.2, 1.1, 2.2, P[3]],
    [0.4, 5, 1.3, 2.4, 2.6, P[1]], [2.0, 5.2, 1.1, 1.1, 1.5, P[6]],
  ];
  const blocks = spots.map(([x, y, w, d, h, colour], i) => {
    const g = kit.svg("g", {}, s);
    const box = iso.box(g, { x, y, w, d, h: 0.01, colour });
    return { box, panes: windows(g, x, y, w, d, h), h, at: 0.3 + i * 0.16 };
  });
  const trees = [[5.5, 5.4, 0.9], [7.0, 5.5, 1.1], [5.4, 7.0, 1.0], [2.4, 2.9, 0.7], [7.2, 3.1, 0.8]].map(([x, y, size], i) =>
    ({ tree: iso.tree(s, { x, y, size, colour: i % 2 ? "#3FA66B" : "#2E8F5A" }), at: 1.3 + i * 0.1 }));
  const bin = iso.box(s, { x: 6.1, y: 6.1, w: 0.6, d: 0.6, h: 0.01, colour: P[0] });
  const lid = iso.box(s, { x: 6.05, y: 6.05, w: 0.7, d: 0.7, h: 0.12, z: 0.9, colour: P[2] });
  const binAt = 1.9;

  const titleEl = kit.text(root, props.title, { x: safe.x + safe.width / 2, y: safe.y, size: kit.shape === "tall" ? 6.5 : 7.5, font: "heading", align: "center" });

  return (t) => {
    for (const b of blocks) {
      const k = kit.spring(t - b.at, { stiffness: 170, damping: 14 });
      b.box.set({ h: Math.max(0.01, b.h * k) });
      const shown = kit.progress(t, b.at + 0.55, 0.3);
      for (const p of b.panes) p.style.opacity = String(0.75 * shown);
    }
    for (const tr of trees) tr.tree.set({ grow: kit.spring(t - tr.at, { stiffness: 240, damping: 12 }) });
    bin.set({ h: Math.max(0.01, 0.9 * kit.spring(t - binAt, { stiffness: 200, damping: 13 })) });
    const l = kit.spring(t - binAt - 0.25, { stiffness: 220, damping: 12 });
    lid.set({ z: 0.9 + (1 - l) * 2 });
    lid.group.style.opacity = String(kit.clamp(l * 4));
    const ti = kit.spring(t - 0.15, { stiffness: 140, damping: 16 });
    titleEl.style.opacity = String(kit.clamp(ti * 2));
    titleEl.style.transform = `translateY(${(1 - ti) * u * 4}px)`;
  };
});
