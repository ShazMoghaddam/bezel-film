# Pixel game

A 90s video game. Pixel-art sprites, chunky black text boxes with white borders, menus with a blinking cursor, coins and XP bars, and a "LEVEL UP!" for every point you make.

**Best for:** learning and habits, onboarding, gaming and tech, "level up" stories, anything playful about progress.

**Example:** `examples/pixel-game`. Read its scene files before writing your own.

## The look

- **Screen:** night blue with faint scanlines, painted by the style. Everything has hard pixel edges.
- **Sprites:** `kit.pixels(stage, { art, palette, x, y, size })` draws pixel art from rows of characters. Keep sprites small (about 12 to 16 pixels wide) and draw them at a large `size`. Two frames swapped on twos make a walk.
- **The pixel grid:** pick a pixel size (`P = Math.round(u * 0.8)`) and round every position to it, so nothing sits between pixels.
- **Text boxes:** black with a white border (`border`, `boxShadow` on `kit.text`), in the pixel font, typed out with `kit.typing`.
- **Type:** the pixel pairing: Press Start 2P for headings and boxes, VT323 for small text.
- **Colours:** bright game colours from `kit.colours.palette`: gold for rewards, green for health, red for damage.

## How things arrive

- **On twos, in whole pixels:** move things with `kit.stepped` and round positions to the pixel grid. No smooth sub-pixel slides.
- **Game beats:** things bounce in with a spring, blink on and off, and pop a "+1" or "-33" that floats up.
- **Hard cuts** between scenes, like changing screens.

## Shots that work

- **The title screen:** stars, pixel mountains, the name dropping in with a bounce and "PRESS START" blinking.
- **The level:** the hero walking across scrolling ground, collecting coins as a counter ticks up.
- **The battle:** an enemy that stands for the problem, a menu with the right choice picked, hits draining its HP bar.
- **The level-up:** "LEVEL UP!" with sparkles, an XP bar filling and stats ticking up.

## Rules

- **Our own sprites.** Never draw a known game character, enemy or logo.
- **Readable:** pixel text at 2.4 `u` or bigger, white or gold on black or night blue.
- **Sound:** `tick` for coins, `tap` for hits, `click` for menus, `ding` for level-ups. Upbeat music.
