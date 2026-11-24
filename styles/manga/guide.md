# Manga

A black-and-white comic page brought to life. Panels slam in on the beat, speed lines burst from the action, screentone shades the night, and sound effects are lettered big across the frame.

**Best for:** dramatic launches, before and after stories, anything with tension and a reveal. Products, games, campaigns, big announcements.

**Example:** `examples/manga`. Read its scene files before writing your own.

## The look

- **Ink on white.** Panels have thick black borders and white gutters. Red (`kit.colours.accent`) is a rare highlight: one line or one word.
- **Panels:** `kit.panels([[x, y, w, h], ...])` lays out rectangles inside `kit.safe`, as fractions, with even gutters. Use different layouts for wide and tall frames (`kit.shape`).
- **Screentone** for shade and mood: `kit.tone(stage, { kind: "dots", weight })`. Heavier for night, lighter for dawn.
- **Speed lines:** `kit.speedLines(stage, { kind: "focus", cx, cy, box })` for impact, `{ kind: "motion", angle }` for movement. Always pass the panel as `box`.
- **Sound effects:** the heading font, huge, tilted, with a white outline: `style: { WebkitTextStroke: "...px #FFFFFF", paintOrder: "stroke fill" }`.
- **Speech:** an oval bubble with a tail, in the body font, short.
- **Captions** in white boxes with a black border.

## How things arrive

- **Panels slam in,** one per beat: a quick scale from 1.08 to 1 in a sixth of a second. Time them to sentences with `kit.at(i)`.
- **Inside a panel, push in slowly** (scale the contents a little over time) so nothing sits dead. Clip on an outer group and scale an inner one, so contents never cross the border.
- **Impact:** objects rattle (a jitter seeded by frame number), sound effects spring in, speed lines flash on.
- **Cuts** between scenes, no fades.

## Shots that work

- **The problem page:** three panels in a row: the setting, the close-up with a sound effect, the reaction in a bubble.
- **The splash:** one panel, focus lines exploding from the product, a caption question across the top.
- **The sequence:** a row of panels showing time passing, each with a time stamp.
- **The name:** the name slamming in through motion lines, with a tagline on a black strip.

## Rules

- **Our own drawings.** Draw people simply (`kit.figure`, or a head and closed eyes) and let objects carry the story. Never imitate a known series or character.
- **Text big and few.** One bubble or one caption per panel.
- **Contrast:** black, white and tone. Readable at a glance on a phone.
- **Sound:** `whoosh` as panels slam in, `sweep` for a reveal, `tap` for impacts. Dramatic music.
