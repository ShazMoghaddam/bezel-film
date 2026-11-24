# Data on paper

A data journal on graph paper. Charts are drawn mark by mark in coloured pencil, shaded with hatching, and annotated with notes in the margin. It feels like someone working the numbers out in front of you.

**Best for:** one striking number or comparison, explained slowly and clearly. Science, climate, health, money, survey results, "how much of X is Y".

**Example:** `examples/data-on-paper`. Read its scene files before writing your own.

## The look

- **The paper** is warm white graph paper with faint blue squares, painted by the style.
- **Pencil:** put `filter: "url(#pencil)"` on every mark, so lines and fills catch the paper like graphite.
- **Shading is hatching,** never flat colour: `kit.tone(stage, { kind: "lines", colour, size, angle })` as a fill. Use `"cross"` for a second kind.
- **Colours:** blue `palette[0]` for the main quantity, teal `[5]`, green `[2]` and orange `[3]` for others, red (`accent`) for notes and the thing to notice.
- **Type:** the editorial serif. Headings with `font: "heading"`; notes in `"body"` with `style: { fontStyle: "italic" }`; sources and small figures in `"mono"`.

## How things arrive

- **Lines** are drawn in with `kit.drawing()` (no pen): axes first, then outlines.
- **Fills** come after their outline: hatching fades or sweeps in (grow a bar's width with `kit.progress`).
- **Many small things,** like the squares of a waffle chart, shade in one after another at a steady pace, so the count feels real.
- **Notes** are written in last, beside what they describe, with a small curved arrow.

## Shots that work

- **The question,** written at the top, with a simple pencil drawing of the subject.
- **The waffle:** 100 squares, one per percent. Shade them in groups as each group is spoken. Show the empty squares faintly first.
- **The bars:** a few labelled bars, numbers written at their ends, one note on the bar that matters.
- **The line:** axes, then the line drawn left to right, with dots on the key points.
- **The takeaway:** a single drawing and one line of type, and the source at the foot of the page.

## Rules

- **Real numbers only.** Use figures the user gave you or that you can source, round them honestly ("about 97"), and show the source in small type on the last scene.
- **One chart per scene.** Split a busy chart across scenes and build it up.
- **Keep labels horizontal and close** to what they label. No legends if a label will do.
- **Leave white space.** It's a page, not a dashboard.
- **Quiet sound.** `tick` as a group lands, `pop` for the reveal. Calm or ambient music.
