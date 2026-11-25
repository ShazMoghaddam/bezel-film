# Watercolour

A nature journal that paints itself. Soft washes bloom on cotton paper, a fine dip-pen line draws over them, and notes are written in the margins with little inked arrows.

**Best for:** nature and science, travel journals, food and recipes, gentle explainers, personal stories and anything that should feel handmade and calm.

**Example:** `examples/watercolour`. Read its scene files before writing your own.

## The look

- **Paper:** warm cotton paper with a visible tooth, painted by the style over everything. Leave plenty of it bare.
- **Washes:** `kit.wash(stage, { d, colour, opacity, from, filter: "url(#paint)" })` lays thin colour that blooms out from a point. Build things up in two or three washes: a pale one first, then a stronger one over part of it.
- **Ink:** fine lines with `filter: "url(#ink)"`, round caps, about `u * 0.2` wide, drawn in with `plan.line` after the paint underneath has bloomed.
- **Colours:** earthy and natural from `kit.colours.palette`: leaf green, sky blue, ochre, burnt orange. Keep washes see-through (opacity 0.3 to 0.85) so the paper shows.
- **Words:** a serif title, then small italic notes beside things, as in a field journal, each with an inked arrow when it points at something.

## How things arrive

- **Paint, then ink:** washes bloom first (`wash.set(kit.progress(...))`, about a second each), and ink lines draw over them once they're down.
- **Slow and calm:** nothing snaps. Use long progress times, `"out"` easing and soft fades between scenes.
- **Life:** a gentle idle on anything alive: wings opening and closing, leaves swaying.

## Shots that work

- **The title page:** one subject painted large, with the title written beside it and a margin note.
- **The row:** the same subject at several stages along a painted band, each labelled underneath.
- **The map:** land painted in a wash, the coast inked, and a dotted route drawn while something travels along it.
- **The place:** a small landscape painted in layers, with the closing line written at the side.

## Rules

- **Our own drawings.** Paint from simple shapes. Never trace a photo or copy an artist's painting.
- **True facts.** Journals are for real observations: check every number and name the source on screen.
- **Readable:** dark ink colours for words; keep words off busy washes.
- **Sound:** soft `swish` for brushstrokes, `tap` for notes, `ding` for a key fact. Reflective or calm music.
