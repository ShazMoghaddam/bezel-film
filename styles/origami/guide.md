# Origami

Folded paper that unfolds into each idea. A sheet lands on a plain table and folds, crease by crease, into a shape that means something: an envelope, a letter, a plane. Flat colour, crisp edges, one soft shadow, and flaps that visibly turn over.

**Best for:** product launches, apps and services, simple "three steps" stories, anything about making things simpler, tidier or calmer.

**Example:** `examples/origami`. Read its scene files before writing your own.

## The look

- **The table:** a plain warm off-white, painted by the style. Lots of space around each model.
- **Paper:** two sides, a white side and a coloured side (`kit.colours.accent` or a palette colour). Start a sheet white side up, so each fold shows the colour.
- **Flaps:** `kit.fold(parent, { points, crease, front, back })` is one flap of paper, folding over its crease line. `fold.set(p)`: 0 open, 1 folded flat. It darkens as it turns edge-on and shows its back once over, so you can see the fold happen.
- **Models:** build from flat polygons: the middle of the sheet, then flaps on top. Shade facets that face away with `color-mix(in oklab, colour, #000 20%)`.
- **Depth:** one soft blurred ellipse under each model, and a light `drop-shadow` on the model itself. Nothing else.
- **Type:** clean and modern, set beside the model with plenty of room.

## How things arrive

- **Drop, then fold:** the sheet drops onto the table with a spring and a small turn; then flaps fold one at a time, about 0.4 seconds apart, each easing in and out.
- **Show the creases:** a dashed line where the next fold goes, just before it folds, the way an origami diagram shows it.
- **Then it moves:** a finished model can fly, slide onto a pile or unfold again. Paper moves lightly: curves, not straight lines.
- **Between scenes:** a soft fade.

## Shots that work

- **The opening fold:** a square folds into the product's shape, then the name sets down beside it.
- **Three piles:** three sheets fold and land in three labelled places.
- **The flight:** a plane folds its wings up and flies off on a dotted trail.
- **The unfold:** the first model opens back into a flat sheet with its crease pattern, beside the name and the call to action.

## Rules

- **Real folds only.** A flap turns over its crease line. Don't morph one shape into another.
- **One colour per idea.** The accent for the main thing; palette colours to tell piles or steps apart.
- **Readable:** dark text on the light table; light text only on a dark chip.
- **Sound:** `swish` for each fold, `tap` as things land, `whoosh` for flight, `ding` at the end. Calm music.
