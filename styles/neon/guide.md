# Neon

Glass tubes that flicker on at night. Signs glow on a dark brick wall in hot pink, cyan and yellow, sputter as they switch on, hum once they're lit, and spill their colour onto the wall.

**Best for:** bars, restaurants and nightlife, music and events, late-night brands, anything with a city-after-dark mood.

**Example:** `examples/neon`. Read its scene files before writing your own.

## The look

- **The wall:** dark brick and a vignette, painted by the style. Keep it dark; the signs are the only light.
- **Tubes:** `kit.neon(stage, d, { colour, width })` draws one tube along a path: the dim glass, then the lit tube with a white-hot core and a halo. Draw pictures as simple outlines, as a sign maker bends glass: one continuous line where you can.
- **Glowing words:** `kit.text` with a light tint of the colour and a stacked `textShadow`: white close in, then the tube colour wider and wider.
- **Colours:** two or three tube colours per scene from `kit.colours.palette`. A `kit.glow` behind a sign lets it light the wall.
- **Type:** rounded and friendly, like bent glass, heavy weight.

## How things arrive

- **Sputter on:** a tube is off, then flickers by seeded chance for half a second (`kit.random(Math.floor(t * 14) + seed)`), then holds. Light one tube after another, not all at once.
- **Hum:** lit tubes dip slightly now and then, by seeded chance. Steam and smoke tubes pulse gently.
- **Chase:** rows of bulbs light in a travelling wave with `kit.stepped`.
- **Between scenes:** a quick fade, like a sign switching off.

## Shots that work

- **The sign:** the main picture in tubes, then the name glowing beneath it.
- **The hours:** a neon clock and an "OPEN" sign that blinks on a slow beat.
- **The menu:** a row of small icon signs, each lighting with its word.
- **The way in:** a big arrow with chasing bulbs, and where to find it.

## Rules

- **Our own signs.** Never copy a real venue's sign or a brand's logo.
- **Readable:** words in light tints with glow; never dark text. Keep each sign to a word or two.
- **Sound:** `click` and `tick` as tubes catch, `sweep` for the last move. Ambient music.
