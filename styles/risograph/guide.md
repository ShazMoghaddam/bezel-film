# Risograph

A zine printed one ink at a time. Two or three bright inks, pink, blue and yellow, overlap into new colours where they cross. Every layer is a little out of register, and the ink is grainy where it didn't quite cover.

**Best for:** indie brands, events and gigs, community projects, creative studios, explainers with a handmade, printed feel.

**Example:** `examples/risograph`. Read its scene files before writing your own.

## The look

- **Paper:** uncoated off-white with fine grain over everything, painted by the style.
- **Inks:** draw each colour into its own `kit.ink(stage, { colour, shift, filter: "url(#riso)" })` layer. Inks multiply, so pink over yellow makes orange, pink over blue makes purple and blue over yellow makes green.
- **Out of register:** give each ink a small `shift` (about `u * 0.3` to `u * 0.6`) in a different direction. That offset is the look.
- **Riso colours:** fluorescent pink `#FF48B0`, blue `#0078BF` and yellow `#FFE800` for shapes. Words in the navy (`kit.colours.text`).
- **Shapes:** bold flat shapes: circles, hills, stripes, simple figures. No outlines; the overlaps make the detail.
- **Type:** condensed capitals, set in the navy with `mixBlendMode: "multiply"`.

## How things arrive

- **One pass at a time:** each ink appears in turn, wiping across like paper going under a drum (a clip rect growing left to right), or stamping on with a quick spring.
- **Then the words:** type wipes in once the picture is printed.
- **Between scenes:** hard cuts, like turning pages of a zine.

## Shots that work

- **The poster:** a sun and hills printed yellow, then pink, then blue, with the title beside it.
- **The diagram:** a side view of how something works, drawn in one or two inks.
- **The overlap:** three circles, one per ink, showing the colours they make together.
- **The sign-off:** a line printed in two inks slightly apart, with the message in navy below.

## Rules

- **Two or three inks per scene,** never more. The limit is what makes it riso.
- **Our own art.** Simple shapes, made by us; never copy a real poster or zine.
- **Readable:** words in the navy, never in pink or yellow. Decorative ink type is drawing, not text: say it again in navy.
- **Sound:** `swish` for each pass, `tap` for stamps, `ding` to close. Upbeat or calm music.
