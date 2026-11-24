# Pop-up book

An open storybook where each spread springs up off the page. Thick card cut-outs with white rims stand up one layer after another, back to front, with a springy overshoot and soft shadows, and a pull tab slides as things move.

**Best for:** explainers for children and families, "how it works" stories, nature and science, warm brand stories. Anything that suits a picture book.

**Example:** `examples/pop-up-book`. Read its scene files before writing your own.

## The look

- **The book:** the style paints cream pages with a fold down the middle. Scenes stand pieces on it; don't cover the page with a flat background.
- **Card cut-outs:** `kit.cutout(parent, d, { fill, edge: "#FFFFFF" })` draws a shape with a white paper rim and a drop shadow. Every piece is a cut-out: hills, sun, signs, flowers, characters.
- **Layers:** three or four, back to front, each a `kit.popup(stage, { base })` group. Far layers are paler, near layers stronger. Things high in the air (a sun, a cloud) sit on a thin stalk down to their layer, as real pop-ups do.
- **Colours:** friendly and saturated, from `kit.colours.palette`, on cream. Greens for land, the accent for the one thing that matters.
- **Words** on cards: a cream card with a white rim (`background`, `boxShadow` on `kit.text`), never straight on a busy layer.

## How things arrive

- **Stand up in order:** `popup.set(kit.spring(t - at, { stiffness: 170, damping: 11 }))`, each layer about 0.2 to 0.3 seconds after the one behind it. The spring's overshoot is what makes it feel like card.
- **Words after the card:** fade text in once its card is up, with a small rise.
- **Movement inside a spread:** one thing moves at a time: a bee on a path, a pull tab sliding, a wheel turning. Keep the layers still once they're up.
- **Between scenes:** a quick fade, like turning the page.

## Shots that work

- **The cover:** the scene layers up, then a sign on two posts pops up in front with the title.
- **The journey:** a character travels across the layers on a dotted trail, stopping at each point of the story.
- **The cut-away:** a thing on one side (a hive, a house, a machine) and a card beside it showing the inside.
- **The fact:** an object on the left and a card on a stand with one number, big.

## Rules

- **Our own drawings.** Build everything from simple shapes. Never draw a known character or copy a real book's art.
- **Hinge at the page.** Every pop-up stands on a base line inside `kit.safe`; nothing floats loose.
- **Readable on a phone:** words big and short, on their own card.
- **Sound:** `pop` as pieces stand up, `whoosh` to open, `ding` for the fact. Upbeat or calm music.
