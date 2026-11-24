# Whiteboard

An explainer drawn live on a clean board. A marker pen writes the headings, sketches each idea the moment it's spoken, and joins ideas with arrows. It feels like a good teacher thinking out loud.

**Best for:** explaining how something works, a concept, a process, money, science, a lesson. Anything where watching it get drawn helps it make sense.

**Example:** `examples/whiteboard`. Read its scene files before writing your own.

## The look

- **The board** is white, brighter in the middle. The style paints it, so leave the background alone.
- **Ink** is `kit.colours.text` (near black) for drawings and most words.
- **Marker colours** from `kit.colours.palette`: blue `[0]`, red `[1]`, green `[2]`, purple `[3]`, orange `[4]`. Red (`kit.colours.accent`) is for what matters most: a circled word, a key arrow. Use one or two colours per scene, not all of them.
- **Fills** are soft marker washes: a colour at 10 to 25% behind a drawing, filled in after the outline is drawn (`color-mix(in srgb, colour 16%, transparent)`).
- **Type** is handwriting: `font: "heading"` for headings and numbers, `"body"` for labels. Big: headings at least 7, labels at least 4 (`kit.u` units).
- **Lines** are about `kit.u * 0.55` wide, with round ends.

## How things arrive

Everything is drawn or written by the pen. Nothing fades or slides in, except colour washes.

```js
const plan = kit.drawing({ pen: true, penColour: kit.colours.accent });
plan.sequence(kit.at(0), [{ node: title, duration: 0.9 }, { node: underline, duration: 0.4 }]);
```

- **Words** write in at about 0.08 seconds per letter: 0.6 to 1.2 seconds for a heading.
- **Drawings** go stroke by stroke: the main outline slowest (0.5 to 0.9s), details quick (0.15 to 0.3s).
- **One thing at a time.** The pen can't be in two places. Use `plan.sequence` so each mark follows the last, and land each idea on its sentence with `kit.at(i)`.
- **Hold** the finished picture for a beat before the scene ends.

## Building blocks

| To draw | Use |
| --- | --- |
| Objects (a cup, a phone, a truck, a lightbulb) | `kit.icon(name, { x, y, size })`, then `plan.sequence(at, icon.paths)`. Find names with `npx bezel-film icons <word>` |
| People | `kit.figure(stage, { x, y, height })`, posed with `.pose("wave")`. Draw them in with `plan.sequence(at, person.paths)` |
| Boxes, circles round words, underlines | `kit.rough.rect`, `kit.rough.ellipse`, `kit.rough.underline`: hand-drawn, never perfect |
| Arrows between ideas | `kit.rough.arrow(x1, y1, x2, y2)`: draw the shaft, then the head |
| A quick chart | Axes with `kit.rough.line`, the line as a path, dots that pop in with `kit.spring` |

Put shapes on `kit.stage()`, whose units are the frame's pixels. Measure text with `el.getBoundingClientRect()` to circle or underline it.

## Shots that work

- **The question:** a heading written in, the key word circled in red.
- **The thing:** one drawing, big, with its label written beside it.
- **The process:** two to four drawings in a row, each drawn as its step is spoken, joined by arrows.
- **The number:** a figure written big, underlined twice.
- **The lesson:** a stick figure cheering beside the takeaway.

## Rules

- **Draw the pen last.** In draw, move and pose things first, then call `plan.draw(t)`, so the pen follows where things are now.
- **Keep it sparse.** A whiteboard scene has two to five things on it. Whitespace makes it readable.
- **Keep it hand-made.** No photos, no gradients, no shadows, no perfect geometry.
- **One idea per scene.** When the board is full, cut to a clean board.
- **Sound:** `swish` as an arrow or underline draws, `pop` when a number lands. Keep effects quiet (`gain` 0.4 to 0.6) under the marker's work.
