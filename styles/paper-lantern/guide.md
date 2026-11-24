# Paper lantern

Cut paper layers lit from behind at night. Silhouettes of hills, trees, buildings and vehicles are stacked one in front of another in deep blues, each throwing a soft shadow on the next, with warm light glowing through windows, lanterns and the moon.

**Best for:** travel, journeys and places, calm brand stories, memories and milestones, anything quiet and atmospheric.

**Example:** `examples/paper-lantern`. Read its scene files before writing your own.

## The look

- **Night sky:** the style paints a deep blue sky with a warm haze low down, and a faint paper grain over everything.
- **Layers:** three to five silhouettes made with `kit.cutout(stage, d, { fill, shadow: 0.5, shadowColour: "4 6 18" })`, lighter at the back and darker at the front. Each layer's shadow falls on the one behind it; that's the depth.
- **Light from behind:** a thin warm line along a layer's top edge (the same path, stroked in the accent, nudged up a little), and `kit.glow` behind the moon, windows and lamps.
- **Warm against cool:** the accent and warm yellows only for light: windows, lanterns, the sun. Everything else is blue.
- **Words** in cream on the sky, with a faint warm glow, never over a busy layer.

## How things arrive

- **Layers rise into place,** back first, on a slow spring, then drift sideways at different speeds: far slow, near fast. That's the parallax.
- **Light switches on:** windows appear one at a time; glows fade up slowly.
- **Flicker gently:** lanterns and fires change brightness by seeded chance, `kit.random(Math.floor(t * 10) + 1)`, a few times a second.
- **Between scenes:** a long, slow fade.

## Shots that work

- **The landscape:** layered peaks, a moon and the title in its light.
- **The journey:** a vehicle in silhouette with lit windows crosses between layers, the near layer sliding fast.
- **The interior:** a room cut from paper with a window onto moving hills, a lantern and one warm detail.
- **The dawn:** the same layers as the first scene, with the sky turning rose and gold and the sun rising behind them.

## Rules

- **Our own shapes.** Build from simple paths: peaks, pines, arches, boxes. Never copy a known film's or artist's scenes.
- **Layers cover the frame edge.** Draw each one wider than the frame, so drift never shows its end.
- **Readable:** cream on dark sky; for text over a bright sky, move it onto a dark layer.
- **Sound:** `sweep` for openings, `whoosh` for passing vehicles, `ding` for a warm moment. Reflective or calm music.
