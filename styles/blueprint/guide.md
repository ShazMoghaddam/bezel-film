# Blueprint

Technical drawings plotted in white on blue paper. Precise lines, measurements, sections and callouts, labelled in capitals, with a title block in the corner. It makes a product or an idea feel engineered and considered.

**Best for:** products, hardware, inventions, architecture, engineering, how something is built, specs and features. Anything with a shape, parts and numbers.

**Example:** `examples/blueprint`. Read its scene files before writing your own.

## The look

- **The paper** is deep blue with a fine grid. The style paints it.
- **Lines** are white (`kit.colours.text`), thin (`kit.u * 0.28`, at least 1.5 pixels) and exact. Centre lines are thinner and dash-dot.
- **Measurements** are in yellow (`kit.colours.accent`). Callouts and notes use light blue (`kit.colours.palette[1]`) or yellow.
- **Type:** headings and labels in capitals with `font: "heading"`; numbers, drawing numbers and table keys with `font: "mono"`.
- **No hand-drawn wobble.** Everything is straight, round and true.

## How things arrive

Lines are plotted at a steady speed, the way a pen plotter draws: use `how: "linear"` and no pen.

```js
const plan = kit.drawing();
plan.line(outline, { at: 0.8, duration: 2.0, how: "linear" });
```

- **Symmetry:** draw both halves of a symmetrical part at once (two paths, same timing).
- **Order:** centre line, then the outline, then details, then measurements, then labels. Like a draughtsman.
- **Measurements:** `kit.dimension(stage, x1, y1, x2, y2, { label: "260", offset })` makes extension lines, the dimension line, ticks and a label. Draw its `paths` in sequence and fade its `label` in after. A negative `offset` puts it on the other side.
- **Fills** don't fill: they hatch. Diagonal lines clipped to the shape, swept in left to right.
- **Stamps and tables** arrive last: a spec table ruled and filled in row by row, an `APPROVED` stamp slammed down.

## Shots that work

- **The view:** the object's outline plotted, with a title block in a corner (name, drawing number, scale).
- **The size:** the same view with its measurements, each plotted as it's spoken.
- **The section:** cut in half to show the inside, hatched, with a callout on the clever part.
- **The parts:** an exploded view, parts sliding apart along a dashed axis, each with a numbered balloon.
- **The specs:** a table of materials and numbers, stamped.

## Rules

- **Build shapes from numbers.** Work out paths from a few measurements, so every view of the object matches.
- **Real proportions.** If it's 260 by 74, draw it 260 by 74.
- **Leader lines** have a dot or a circle where they touch, then bend once and run flat to their label.
- **Leave space.** Drawings sit to one side, with notes in the clear space beside them.
- **Calm music, few effects.** `tick` as a measurement lands, a low `tap` (`pitch: -5`) for a stamp.
