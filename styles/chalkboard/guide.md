# Chalkboard

A lesson worked out in chalk on a dark green slate. A stick of chalk writes the working up a line at a time as it's spoken, ruler-straight diagrams show the idea, the answer gets circled, and a felt eraser wipes the board between ideas. It feels like a teacher you can follow: you watch the thinking happen.

**Best for:** maths and science, how something is worked out, a rule and where it comes from, a lesson, a puzzle with an answer. Anything where seeing the steps is the point.

**Example:** `examples/chalkboard`. Read its scene files before writing your own.

## The look

- **The slate** is dark green with faint clouds of old lessons, in a wooden frame with a ledge of chalk. The style paints it, so leave the background alone.
- **Put everything in one board** that wears the chalk grain, and draw into that:

  ```js
  const board = kit.el("div", { style: { position: "absolute", inset: "0", filter: "url(#chalk)" } }, root);
  const s = kit.stage(board);
  ```

  Text goes in `board`, shapes in `s`. The grain is what makes it chalk, and `kit.erase` rubs out what's on `board`.
- **Chalk colours** from `kit.colours.palette`: yellow `[0]`, pink `[1]`, sky blue `[2]`, mint `[3]`, orange `[4]`, lilac `[5]`. White (`kit.colours.text`) does most of the work. Yellow (`kit.colours.accent`) is for the answer and what matters most. Give each quantity its own colour and keep it: if R is blue in the diagram, it's blue in the working.
- **Type:** `font: "heading"` (sketched capitals) for questions, titles and big answers, at least 7. `"body"` (classroom handwriting) for working and labels, at least 4. The body font has maths symbols: ² ≈ √ × π.
- **Lines** are about `kit.u * 0.45` wide with round ends. Diagrams are drawn with a ruler: straight `M x y L x y` paths for lines and radii. Only circles and boxes round words are hand-drawn (`kit.rough`).

## How things arrive

The chalk writes everything, with dust falling from the stick.

```js
const plan = kit.drawing({ pen: "chalk", dust: true });
plan.write(line, { at: kit.at(1) + 0.2, duration: 1.2 });
```

- **Working** goes up one line per sentence: each line starts on its sentence with `kit.at(i)`, about 0.9 seconds plus 0.03 a character.
- **Diagrams** go stroke by stroke: the big shape first (1 to 1.4s), then details quickly (0.2 to 0.45s).
- **The answer** is written big, then circled or boxed in yellow after a beat.
- **The eraser** clears the board when the lesson moves on:

  ```js
  const wipe = kit.erase(board, { seed: 3 });
  // in draw:
  wipe.set(kit.progress(t, kit.at(3) + 0.2, 2.2, "inOut"));
  ```

  Give it an `area` to wipe part of the board and leave the rest, like the rule you've just found.

## Shots that work

- **The question:** written large across the board, underlined twice.
- **The diagram:** a ruler-straight drawing with each part labelled in its own colour, built up sentence by sentence.
- **The working:** three to five lines stacked down the left, a pink note beside the step that needs explaining, the result boxed.
- **The wipe:** the eraser clears the working and leaves only the boxed result standing.
- **The numbers:** the result at the top, the real values written in underneath, the answer big and circled, the source in small writing in a corner.
- **The takeaway:** one sentence in the heading font with a small drawing under it.

## Rules

- **Show the steps.** The style is for following an argument. Don't jump to the answer: write the line that gets there.
- **Keep the board tidy.** Working lines line up on the left. Leave space; a crowded board is hard to follow.
- **Colours mean things.** The same thing keeps the same colour across every scene.
- **Real numbers need a source** on screen, in small writing.
- **Sound:** `chalk` with `for` while chalk writes, timed with `line` to the sentence the writing lands on, so it stays in step with the voice: `{ "line": 1, "at": 0.2, "sound": "chalk", "for": 1.2 }`. Two or three soft `sweep`s (`gain` about 0.4) while the eraser wipes. A `ding` when the final answer is circled, at most once a film.
