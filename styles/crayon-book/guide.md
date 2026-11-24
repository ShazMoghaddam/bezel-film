# Crayon book

A picture book drawn in wax crayon on dark blue paper. Outlines draw themselves, colour is scribbled in back and forth, soft watercolour washes bloom behind things, and the crayon texture boils gently on twos, like a hand-made animation.

**Best for:** bedtime-story explainers, science for curious minds, gentle "why" questions, children's products and charities, anything warm and handmade.

**Example:** `examples/crayon-book`. Read its scene files before writing your own.

## The look

- **Paper:** dark blue sugar paper, painted by the style. Draw on it; don't cover it.
- **Crayon lines:** paths with `filter: "url(#crayon)"`, round caps and joins. Use `kit.rough` for shapes that wobble like a hand drew them.
- **Colouring in:** `kit.scribble(stage, { d, colour, angle, seed })` fills a shape with crayon strokes; set its group's `filter` to `url(#crayon)`. Change the angle between neighbouring shapes, as a child would.
- **Watercolour:** a soft bloom behind important things: a shape with `filter: "url(#wash)"` at low opacity, a little lighter than the paper.
- **Colours:** bright crayon colours from `kit.colours.palette` on the dark paper. Cream for writing and outlines.
- **Writing:** the heading font is handwritten. Labels sit beside what they name, written in with `plan.write`.

## How things arrive

- **Draw, then colour:** outline with `plan.line`, then scribble the fill in with `scribble.set(kit.progress(...))`, the way you'd draw it yourself.
- **Boil on twos:** in draw, change the crayon filter's seed every other frame so the texture shifts slightly:
  `document.querySelectorAll("#crayon feTurbulence").forEach((f, i) => f.setAttribute("seed", String(5 + (Math.floor(kit.stepped(t, 8) * 8) % 3) * 7 + i)))`.
- **Move on twos:** things that travel jump in small steps with `kit.stepped(t, 12)`, not smooth slides.
- **Between scenes:** a soft fade.

## Shots that work

- **The cover:** a night sky drawn in, a big scribbled moon or sun, a little house on a hill, and the question written in.
- **The diagram:** a child's diagram of how something works, labelled by hand, with one thing moving.
- **The row:** the same object drawn several ways in a row, each named as it's coloured.
- **The goodnight page:** one big friendly drawing and the takeaway written beside it.

## Rules

- **Our own drawings.** Simple shapes, made by us. Never draw a known character or copy a real picture book.
- **Facts stay right.** A gentle look still needs true facts. Name your source when there's a number.
- **Readable:** cream writing on the dark paper. Keep crayon texture off small words.
- **Sound:** `swish` as crayon strokes go down, `tap` for each new thing, `ding` for the takeaway. Calm music.
