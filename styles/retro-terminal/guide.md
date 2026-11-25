# Retro terminal

Glowing green text on an old monitor. Commands are typed in at a prompt, logs scroll, progress bars fill with hashes, big characters power up like phosphor and a block cursor blinks at the end of every line.

**Best for:** tech history, developer tools, security and systems, release notes, anything told as a log, a hack or a boot sequence.

**Example:** `examples/retro-terminal`. Read its scene files before writing your own.

## The look

- **The monitor:** dark green-black with scanlines and dark curved corners over everything, painted by the style.
- **Text:** the terminal pairing (VT323), in phosphor green from `kit.colours`, with a soft glow (`textShadow` in the text colour). Use `whiteSpace: "pre"` for anything that lines up in columns.
- **One colour, mostly:** green for everything; amber (`kit.colours.palette[1]`) only for warnings and crashes.
- **ASCII:** boxes drawn with `+`, `-` and `|`, progress bars of `#` and `.`, arrows as `>`.
- **Big moments:** a single character or word set huge, powering up with a flicker.

## How things arrive

- **Typed, never faded:** `kit.typing(text, t, { at, cps, cursor: true })` types text at a set speed with a blinking block cursor. Commands type slowly, system output fast.
- **Line by line:** output appears a line at a time, top to bottom, like a real terminal.
- **Glitches:** a crash jolts the screen for a few frames by seeded chance and flashes a warning.
- **Hard cuts** between scenes, like clearing the screen.

## Shots that work

- **The boot:** a few system lines, then the title typed in large with the cursor.
- **The event:** a date, a command, then the result in huge characters.
- **The symbol:** one big character powering up, with labels typed on either side.
- **The load:** a command, a progress bar, an OK, a text-mode page, and a last line with the cursor still blinking.

## Rules

- **True facts.** Logs look precise, so check every date and name, and show your sources.
- **Readable:** green on black at 4 `u` or bigger for body text. Don't type long paragraphs: one line per idea.
- **Sound:** `click` and `tick` for keys and lines, `ding` for success. Ambient music.
