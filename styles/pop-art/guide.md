# Pop art

Comic dots and bold outlines. Flat primary colours with thick black edges, halftone dot shading, starbursts and speech bubbles that punch in, and repeating patterns of one bold object.

**Best for:** loud product ads, food and drink, launches, sales, anything playful that should grab attention fast.

**Example:** `examples/pop-art`. Read its scene files before writing your own.

## The look

- **Ground:** yellow with a field of Ben-Day dots, painted by the style. Scenes can lay their own panel colour with a dot fill over it.
- **Outlines:** every shape has a thick black outline (`stroke`, about `u * 0.6`). Hard offset shadows, never soft ones.
- **Dot shading:** `kit.tone(stage, { kind: "dots", ... })` as a fill over a shape at about 0.3 opacity gives the comic-print shading.
- **Comic shapes:** `kit.burst` for "POW!" starbursts, `kit.bubble` for speech and thought bubbles, `kit.speedLines` for drama, `kit.panels` for comic panels.
- **Colours:** red, yellow, blue, black and white, from `kit.colours`. One bold object can repeat into a pattern.
- **Type:** heavy capitals (the bold pairing), with a black outline (`WebkitTextStroke`) and a hard shadow for the big words.

## How things arrive

- **Pop and slam:** springs with little damping (`kit.spring(t - at, { stiffness: 300, damping: 12 })`) so things overshoot and settle. Starbursts spin in as they grow.
- **Hard cuts:** no fades. Things are there or they aren't.
- **Type speech out** a few letters at a time on twos with `kit.stepped`.

## Shots that work

- **The pattern:** one object repeated in a wall that pops in row by row, then a white panel slams down with the name.
- **The hero:** the product bouncing up into a panel of dots and speed lines, a starburst behind it and a speech bubble.
- **The choice:** three panels side by side, one per option, each slamming in on its word.
- **The sign-off:** a huge starburst with the name on it in outlined capitals.

## Rules

- **Our own characters and art.** Never copy a famous painting or comic, or draw a known character.
- **No fake facts:** loud is fine; made-up claims about real things are not.
- **Readable:** black type on white or yellow; light type only with a heavy black outline.
- **Sound:** `pop` for every punch-in, `whoosh` for movement, `ding` to sign off. Upbeat music.
