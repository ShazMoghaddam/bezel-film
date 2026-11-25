// October 1969: the command types in, then the letters of LOGIN arrive one by one in huge
// type. L arrives. O arrives. G starts to appear, and the screen glitches into a crash
// warning. The note underneath says what that means.
Bezel.scene((root, kit) => {
  const { u, safe, colours, props } = kit;
  const glow = `0 0 ${u * 0.5}px rgb(168 255 168 / .65), 0 0 ${u * 1.6}px rgb(111 215 122 / .35)`;
  const amber = colours.palette[1];

  const date = kit.text(root, props.date, { x: safe.x, y: safe.y, size: 4, font: "body", colour: colours.muted, style: { textShadow: glow } });
  const cmd = kit.text(root, "", { x: safe.x, y: safe.y + u * 5.5, size: 4.4, font: "body", colour: colours.text, style: { textShadow: glow } });
  // The letters, huge and spaced like a slow line.
  const letters = props.word.split("").map((ch, i) => kit.text(root, ch, { x: safe.x + i * u * 17, y: safe.y + safe.height * 0.22, size: 26, font: "heading", colour: colours.text, style: { textShadow: glow, lineHeight: "1" } }));
  const crash = kit.text(root, `*** ${props.crash} ***`, { x: safe.x, y: safe.y + safe.height * 0.62, size: 6.4, font: "heading", colour: amber, style: { textShadow: `0 0 ${u}px ${amber}` } });
  const note = kit.text(root, props.note, { x: safe.x, y: safe.y + safe.height * 0.8, size: 4.4, font: "body", colour: colours.text, style: { textShadow: glow } });

  // Beats: L and O land as the third sentence says them ("It sends L, then O..."),
  // then the crash on "and crashes".
  const lAt = Math.max(2.4, (kit.at(2) || 5) + 0.5), oAt = lAt + 0.7, crashAt = oAt + 0.8;
  return (t) => {
    cmd.textContent = kit.typing("$ " + props.command, t, { at: 0.4, cps: 26, cursor: t < lAt });
    letters.forEach((el, i) => {
      const at = i === 0 ? lAt : i === 1 ? oAt : crashAt;
      if (i < 2) el.style.opacity = t >= at ? "1" : "0";
      else if (i === 2) {
        // G never makes it: a broken flicker of it as the line drops.
        const r = kit.random(Math.floor(t * 20) + 3)();
        el.style.opacity = t >= crashAt && t < crashAt + 0.4 && r > 0.5 ? "0.5" : "0";
        el.style.translate = `${(r - 0.5) * u * 3}px 0`;
      } else el.style.opacity = "0";
    });
    // On the crash, the whole screen jumps for a few frames.
    const jolt = t >= crashAt && t < crashAt + 0.3 ? (kit.random(Math.floor(t * 30))() - 0.5) * u * 1.5 : 0;
    root.style.translate = `0 ${jolt}px`;
    crash.style.opacity = t >= crashAt + 0.1 && Math.floor((t - crashAt) * 3) % 2 === 0 ? "1" : t >= crashAt + 1.6 ? "1" : "0";
    note.textContent = kit.typing(props.note, t, { at: Math.max(crashAt + 0.9, (kit.at(3) || 0) - 0.2), cps: 34 });
  };
});
