// What it takes: two big figures (the one-time download and the time to make a film), then
// a terminal chip for draft, which turns a README into a first film.
Bezel.scene((root, kit) => {
  const { u, safe, colours, props } = kit;
  const narrow = kit.shape !== "wide";
  const base = root.getBoundingClientRect();
  const tints = ["#4CC9F0", "#FFB84D"];
  const cols = narrow ? 1 : 2;
  const cw = (safe.width - u * 6 * (cols - 1)) / cols;
  let y = safe.y + (narrow ? 0 : safe.height * 0.06);
  const cards = props.figures.map((f, i) => {
    const x = narrow ? safe.x : safe.x + i * (cw + u * 6);
    const yy = narrow ? y : y;
    const big = kit.text(root, f.value, { x, y: yy, size: narrow ? 11 : 12, font: "heading", colour: tints[i], fit: false, style: { letterSpacing: "-0.05em", lineHeight: "1" } });
    const lab = kit.text(root, f.label, { x, y: big.getBoundingClientRect().bottom - base.top + u * 1.5, size: narrow ? 3.8 : 3.6, weight: 600, colour: colours.text, maxWidth: cw });
    const note = kit.text(root, f.note, { x, y: lab.getBoundingClientRect().bottom - base.top + u * 1, size: 2.9, colour: colours.muted, maxWidth: cw, style: { textWrap: "balance" } });
    if (narrow) y = note.getBoundingClientRect().bottom - base.top + u * 5;
    return { els: [big, lab, note], at: Math.max(0.3 + i * 1.5, kit.at(f.line) + 0.1) };
  });
  const bottom = Math.max(...cards.map((c) => c.els[2].getBoundingClientRect().bottom - base.top));
  const dy = bottom + u * (narrow ? 5 : 8);
  const dlab = kit.text(root, props.draft.label, { x: safe.x, y: dy, size: narrow ? 3.8 : 3.6, weight: 600, colour: colours.text, maxWidth: safe.width });
  const chip = kit.text(root, props.draft.command, { x: safe.x, y: dlab.getBoundingClientRect().bottom - base.top + u * 2, size: narrow ? 3.2 : 3.4, font: "mono", colour: "#3DDC97", fit: true, maxWidth: safe.width,
    style: { padding: `${u * 1.4}px ${u * 2.4}px`, background: "#0E1117", border: "1px solid rgb(255 255 255 / .14)", borderRadius: `${u * 1.2}px`, whiteSpace: "nowrap" } });
  const draftAt = Math.max(3.4, kit.at(props.draft.line));
  return (t) => {
    for (const c of cards) c.els.forEach((el, j) => {
      const p = kit.progress(t, c.at + j * 0.25, 0.9, "out");
      el.style.opacity = String(p);
      el.style.transform = `translateY(${(1 - p) * u * 2}px)`;
    });
    const n = String(props.draft.command).length;
    [dlab].forEach((el) => (el.style.opacity = String(kit.progress(t, draftAt, 0.8, "out"))));
    chip.style.opacity = String(kit.progress(t, draftAt + 0.3, 0.6, "out"));
    const shown = Math.floor(kit.progress(t, draftAt + 0.5, n * 0.035, "linear") * n);
    chip.textContent = props.draft.command.slice(0, Math.max(shown, 1));
  };
});
