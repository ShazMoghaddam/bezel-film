# 1950s cartoon

Flat colour, simple geometric characters and snappy movement, like the limited animation of 1950s studios. Pose to pose, with confident holds, starbursts and boomerang shapes, and a warm cream palette.

**Best for:** friendly how-tos, tips and steps, brand stories that should feel warm and a little retro, anything for a broad audience.

**Example:** `examples/mid-century-cartoon`. Read its scene files before writing your own.

## The look

- **Backgrounds** are flat blocks: a wall, a floor, a counter, a window. No gradients. Tint palette colours towards the cream background for big areas (`color-mix(in srgb, colour 25%, background)`).
- **Decoration:** starbursts, boomerangs, dots and simple stars, floating gently on the wall.
- **Characters:** `kit.toon(stage, { kind: "flat", colour: kit.colours.surface })`. A rounded box body, thin limbs, dot eyes. Use `flip: true` to face left.
- **Props** are built from flat shapes with a dark outline (`kit.colours.text`) and a solid offset shadow.
- **Type:** the condensed font, in capitals, for titles and step names, slightly tilted.

## How things arrive

- **On twos.** Pass time through `kit.stepped(t, 12)` before using it, so everything moves in held steps, like hand-drawn animation. This is the style's signature.
- **Pop and settle:** things spring in with `kit.spring` and a firm overshoot, then hold still.
- **Characters** change pose on the beat (switch pose every half second) rather than blending smoothly, and squash a little as they land.
- **Cuts,** not fades, between scenes.

## Shots that work

- **The title card:** a tilted panel with the title, a starburst spinning slowly behind it, the character popping up to wave.
- **The step:** a big numeral in a circle with the step's name, the prop on a counter, the character pointing at it.
- **The prop at work:** a grinder handle turning in steps, a thermometer rising, a timer sweeping its laps.
- **The payoff:** the character relaxing with the result, with hearts or stars popping out.

## Rules

- **Get the facts right on screen.** If a step says four minutes, show four minutes.
- **One character.** It's the viewer's guide through the steps.
- **Limited palette per scene:** the background, one accent and the ink.
- **Sound:** `pop` for appearances, `tick` for mechanical moves, `ding` when something's ready. Upbeat music.
