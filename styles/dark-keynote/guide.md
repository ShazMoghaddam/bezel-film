# Dark keynote

A product launch on a black stage. The product's screens are the star: a phone or laptop rises into a soft pool of light, the app moves on its screen, and big, clean type says one thing at a time.

**Best for:** app and software launches, feature announcements, product demos, startup pitches.

**Example:** `examples/dark-keynote`. Read its scene files before writing your own.

## The look

- **The stage:** near-black with a faint light from above, painted by the style. No texture, no clutter.
- **Devices:** `kit.device(stage, { kind: "phone" | "laptop" | "browser", x, y, width })` draws a generic device and gives you `screen` (its box) and `content` (a group clipped to it). Draw the app's interface into `content`: rows, cards, blocks and labels in SVG.
- **The app:** a dark interface with the palette's colours for categories. Make it believable: real-looking labels, times and names.
- **Type:** the swiss pairing (Inter), big and tight (`letterSpacing: "-0.04em"`). One heading per scene, white; supporting words in the muted grey. A gradient fill on the product name only.
- **Light:** `kit.glow` behind a device in the accent colour, low strength.

## How things arrive

- **Slow and sure:** long `"out"` easing, 0.8 to 1.4 seconds. Devices rise or slide in; words fade up with a small lift.
- **The app does the talking:** after the device lands, animate one thing in its interface per sentence: items dropping into place, a block moving, a number changing.
- **Between scenes:** slow fades.

## Shots that work

- **The reveal:** the name rises into the light in big gradient type, with the line underneath.
- **The phone:** a phone on one side showing the core action, the claim in two short lines on the other.
- **The laptop:** a bigger view, with features listed on the left lighting up one at a time as the screen shows each.
- **The close:** the app icon, the name, "Available today" and where.

## Rules

- **Generic devices only:** no real brands' hardware outlines, logos or interface copied from real apps.
- **One idea per scene,** big. The screen shows it; the words name it.
- **Readable:** white and light grey on black. Interface text inside devices can be small, but the scene's own words can't.
- **Sound:** `sweep` for reveals, soft `pop` for items landing in the app, `ding` to close. Epic or calm music.
