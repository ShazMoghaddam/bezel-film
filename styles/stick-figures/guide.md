# Stick figures

Stick people act the idea out on a page from a notebook. Simple characters with big feelings: they shrug, flinch, walk off, point and jump for joy. The story is told by what they do.

**Best for:** ideas about people. Habits, choices, mistakes, workplaces, feelings, cause and effect, a before and after. Anything that's easier to understand as a little story.

**Example:** `examples/stick-figures`. Read its scene files before writing your own.

## The look

- **The page** is cream notebook paper with faint blue rules and a red margin. The style paints it.
- **Ink** is `kit.colours.text`. Characters are always ink.
- **Colour** is for things, not people: the task, the phone, the reward. Use `kit.colours.palette`, with orange (`kit.colours.accent`) for labels and arrows that point at the problem.
- **Props** are simple drawings: `kit.icon(name)` or boxes from `kit.rough`. Soft washes inside them (a colour at 10 to 20%).
- **Type** is handwriting: headings with `font: "heading"`, notes and labels small and quick.

## The cast

```js
const s = kit.stage();
const person = kit.figure(s, { x, y: ground, height: kit.safe.height * 0.45, face: "happy" });
```

- **Poses:** `stand`, `wave`, `point`, `present`, `think`, `cheer`, `shrug`, `hold`, `sad`, and side-on `walkA`, `walkB`, `sit`.
- **Faces:** `happy`, `neutral`, `sad`, `surprised`, or `none`.
- **Blend** between poses with `person.pose("stand", "cheer", p)`. Drive `p` with `kit.spring(t - when)` so moves overshoot and settle, like a real body.
- **Walk** with `person.walk(t)` while moving it with `person.move(x)`; add a small bounce to `y` for weight.
- **Your own pose:** pass joint angles, e.g. `{ lean: -10, head: -14, rs: 30, re: 60 }`. 0 hangs straight down; positive swings to the figure's right.
- **Face the other way** with `flip: true`.
- `person.hand("right")` tells you where its hand is, to put something in it.

## How things arrive

- **Characters** are drawn in with the pen the first time we meet them (`plan.sequence(at, person.paths)`), then act.
- **Props** drop in, pop up or slide on with springs. A heavy thing slams down and squashes a little; a light thing pops and wobbles.
- **Reactions come after causes.** The box lands, then the figure flinches, 0.2 to 0.4 seconds later. That beat is what makes it funny and clear.
- **Labels** are written by the pen, with an arrow to what they name.

## Shots that work

- **The setup:** one figure, one problem (a note over their head, a box beside them).
- **The feeling:** the problem grows or lands, and the figure reacts.
- **The choice:** the figure turns away, walks to something else.
- **The fix:** the big thing breaks into small ones; the figure points at the first.
- **The win:** the figure cheers or jumps, the lesson written beside them.

## Rules

- **Draw the pen last.** In draw, pose and move characters first, then `plan.draw(t)`, or the pen trails behind.
- **One character, maybe two.** More gets confusing at stick-figure size.
- **Big feelings.** Exaggerate poses: arms high, leaning away, head down. Subtle doesn't read.
- **Stand them on something.** A rough ground line under the feet stops them floating.
- **Sound:** `pop` for things appearing, `whoosh` for something big arriving, `ding` for a good idea or a win.
