# Swiss poster

A strict grid and one signal colour. Big, neutral type in black, hard edges, lots of white space and a single red that marks what matters. Everything snaps into its cell on the beat.

**Best for:** events and conferences, announcements, launches, schedules, key numbers and any message that should feel confident, clear and designed.

**Example:** `examples/swiss-poster`. Read its scene files before writing your own.

## The look

- **The grid:** `kit.grid(12, 8)` divides the safe area into columns and rows. Place everything with `grid.cell(c, r, cols, rows)`. Nothing sits off the grid.
- **One colour:** black type on warm white, and one red (`kit.colours.accent`) for one thing per scene: a circle, a number, a marker. Never more.
- **Type:** the swiss pairing (Inter). Headings huge and tight (`letterSpacing: "-0.05em"`, `lineHeight: "0.9"`), details small and flush left.
- **Shapes:** circles, bars and squares, flat and hard-edged. No shadows, no gradients, no texture.
- **Show the grid** for a moment at the start with `grid.lines(stage)`, then let it fade.

## How things arrive

- **Snap, don't float:** fast easing that lands hard, such as `(x) => 1 - Math.pow(1 - x, 5)`, over 0.3 to 0.5 seconds.
- **Wipes, not fades:** reveal type with `clipPath` wipes along its column or row, and grow bars and circles from their edge or centre.
- **On the beat:** each item arrives on its own sentence (`kit.at(i)`), and scenes cut hard.

## Shots that work

- **The poster:** a red circle, a black bar and the name set huge along the bottom, with details in the top columns.
- **The numbers:** one column per number, a rule dropping down each, the numbers counting up; one in red.
- **The table:** a programme or list as rows, each with a rule, a red square and its columns.
- **The close:** a red circle filling half the frame and the call to action in black beside it.

## Rules

- **Align everything to the grid,** even small text. Misaligned text is the first thing that breaks the look.
- **One idea per scene,** set big. Cut words rather than shrinking them.
- **Readable:** black or dark grey type only; the red is for shapes and big numbers.
- **Sound:** `tap` and `click` on the beat. Ambient or calm music.
