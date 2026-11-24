# 1930s cartoon

Black-and-white characters with bendy "rubber hose" limbs, white gloves and pie-cut eyes, bouncing to the beat on flickering, grainy film. Iris wipes, title cards and everything dancing.

**Best for:** playful ads, food and drink, launches with a sense of humour, anything that should feel joyful and a little mischievous.

**Example:** `examples/rubber-hose-cartoon`. Read its scene files before writing your own.

## The look

- **Black, white and warm grey only.** Use `kit.colours.text` (ink) and `kit.colours.surface` (paper) for nearly everything; the style adds grain and a vignette over the top.
- **Characters:** `kit.toon(stage, { kind: "rubber", colour: kit.colours.surface, tongue: "#6B6560" })`. Make your own characters: a loaf, a cup, a cloud. Never a mouse, a cat or anything that looks like a famous character.
- **Silhouettes** for backgrounds: rooftops, trees and hills in solid ink, with the characters on a lighter ground in front.
- **Type:** the editorial serif, often italic, for title cards; letter-spaced capitals for small lines.

## How things arrive

- **Everything bounces on the beat.** Use a steady beat, such as `Math.abs(Math.sin(t * Math.PI * 2))` for two bounces a second, to move characters up and down, and squash them as they land with `toon.squash()`.
- **Old film:** in every draw, flicker the brightness and weave the picture a fraction, changing twelve times a second:
  ```js
  const r = kit.random(Math.floor(t * 12) + 1);
  root.style.filter = `brightness(${0.96 + r() * 0.07})`;
  root.style.transform = `translate(${(r() - 0.5) * kit.u * 0.3}px, ${(r() - 0.5) * kit.u * 0.3}px)`;
  ```
- **Iris** in at the start and out at the end: a black frame with a circular hole that grows or shrinks (an SVG path with `fill-rule: evenodd`).
- **Hops and arcs:** characters jump along arcs, squash on landing and stretch in the air.

## Shots that work

- **The title card:** a double frame with corner scrolls, "presents", the title in big italic serif, opening with an iris.
- **The character's entrance:** it walks in, bouncing, and waves at us.
- **The ensemble:** several characters hop into a line and dance in time.
- **The end card:** a ribbon banner with the name, the character bowing, the iris closing on its face.

## Rules

- **Original characters only.** Faces and bodies come from `kit.toon`; dress them as objects, not as known characters.
- **Hide words under a closing iris,** so they don't half-show.
- **Keep it simple:** two or three things moving at once, all on the same beat.
- **Sound:** `pop` with rising pitch for things hopping out, `sweep` for the iris, `ding` for a bright idea. Upbeat music.
