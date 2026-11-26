// How to start: three numbered steps that light up one at a time, beside a terminal that
// shows each step happening.
Bezel.scene((root, kit) => {
  const { u, safe, colours, props } = kit;
  const s = kit.stage();
  const narrow = kit.shape !== "wide";
  const head = kit.text(root, props.heading, { x: safe.x, y: safe.y, size: narrow ? 6.4 : 6, font: "heading", colour: colours.text, maxWidth: safe.width,
    style: { letterSpacing: "-0.04em" } });
  const base = root.getBoundingClientRect();
  const top = head.getBoundingClientRect().bottom - base.top + u * 5;
  const listW = narrow ? safe.width : safe.width * 0.42;
  const tints = ["#7C8CFF", "#FF6B8B", "#3DDC97"];
  let y = top;
  const steps = props.steps.map((st, i) => {
    const num = kit.text(root, String(i + 1), { x: safe.x, y, size: narrow ? 4.4 : 4.6, font: "heading", colour: tints[i], fit: false });
    const words = kit.text(root, st, { x: safe.x + u * 7, y: y + u * 0.3, size: narrow ? 3.8 : 3.6, weight: 600, colour: colours.text, maxWidth: listW - u * 7 });
    y = Math.max(num.getBoundingClientRect().bottom, words.getBoundingClientRect().bottom) - base.top + (narrow ? u * 2.6 : u * 4);
    return { num, words, at: Math.max(0.8 + i * 1.4, kit.at(i + 1)) };
  });
  const req = kit.text(root, props.note, { x: safe.x, y: y + u, size: 2.8, colour: colours.muted, maxWidth: listW });
  // The terminal.
  const tx = narrow ? safe.x : safe.x + safe.width * 0.48;
  const ty = narrow ? req.getBoundingClientRect().bottom - base.top + u * 4 : top;
  const tw = narrow ? safe.width : safe.width * 0.52;
  const th = narrow ? Math.min(safe.y + safe.height - ty, u * 46) : Math.min(safe.y + safe.height - ty, tw * 0.66);
  kit.glow(s, { cx: tx + tw / 2, cy: ty + th / 2, r: tw * 0.6, colour: colours.accent, strength: 0.25 });
  const term = kit.svg("g", { opacity: 0 }, s);
  kit.svg("rect", { x: tx, y: ty, width: tw, height: th, rx: u * 1.6, fill: "#0E1117", stroke: "rgb(255 255 255 / .14)", "stroke-width": 1 }, term);
  kit.svg("rect", { x: tx, y: ty, width: tw, height: u * 5, rx: u * 1.6, fill: "#161A22" }, term);
  ["#FF5F57", "#FEBC2E", "#28C840"].forEach((c, i) => kit.svg("circle", { cx: tx + u * 2.6 + i * u * 2.4, cy: ty + u * 2.5, r: u * 0.7, fill: c }, term));
  const lineSize = narrow ? 2.8 : 2.6;
  const lines = props.terminal.map((l, i) => kit.text(root, "", { x: tx + u * 3, y: ty + u * 8 + i * u * 4.6, size: lineSize, font: "mono", colour: l.colour || colours.text, maxWidth: tw - u * 6,
    style: { whiteSpace: "pre-wrap" } }));
  return (t) => {
    const k = kit.progress(t, 0.1, 0.9, "out");
    head.style.opacity = String(k);
    const tp = kit.progress(t, 0.4, 1, "out");
    term.setAttribute("opacity", String(tp));
    term.setAttribute("transform", `translate(0 ${(1 - tp) * u * 4})`);
    let active = -1;
    steps.forEach((st, i) => {
      if (t >= st.at) active = i;
      const p = kit.progress(t, st.at, 0.7, "out");
      st.num.style.opacity = String(0.25 + p * 0.75);
      st.words.style.opacity = String(0.25 + p * 0.75);
    });
    req.style.opacity = String(kit.progress(t, steps[0].at + 1, 0.8, "out"));
    // Each terminal line belongs to a step and types itself out once that step is named.
    props.terminal.forEach((l, i) => {
      const start = steps[l.step].at + (l.delay || 0);
      const chars = l.type === false ? (t >= start ? l.text.length : 0) : Math.floor(kit.progress(t, start, Math.max(0.4, l.text.length * 0.035), "linear") * l.text.length);
      lines[i].textContent = l.text.slice(0, chars) + (active === l.step && chars > 0 && chars < l.text.length ? "▍" : "");
    });
  };
});
