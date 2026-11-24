# Isometric world

A small, bright world seen from above at an angle, like a model on a table. Buildings rise from the ground, roads unroll, and things move through it to show how a system works, step by step.

**Best for:** how things work in the real world. Journeys, supply chains, cities, factories, logistics, how a product gets made or delivered, how a service works behind the scenes.

**Example:** `examples/isometric`. Read its scene files before writing your own.

## The look

- **The world** sits on a ground tile with a soft shadow, on a pale sky that the style paints.
- **Blocks** are lit from the top left: `kit.iso` shades each face for you. Use the palette's strong colours for things that matter, white and greys for buildings in the background.
- **Ground** colours: grass `#DCE6D2`, park `#B9DBA6`, road `#C7CDD8` with white dashes, factory floor `#E1E6EF`.
- **Labels** are white pills with a little shadow, in the heading font, floating above what they name or on the floor in front of it.
- **Type** is the rounded `friendly` font. Titles at the top, short.

## Building the world

```js
const s = kit.stage();
const iso = kit.iso({ x: kit.safe.x + kit.safe.width / 2, y: top, unit });
iso.tile(s, { x: 0, y: 0, w: 8, d: 8, colour: "#DCE6D2", shadow: true });
const tower = iso.box(s, { x: 1, y: 1, w: 2, d: 2, h: 0.01, colour: kit.colours.palette[0] });
// in draw: tower.set({ h: 4 * kit.spring(t - 0.4) });
```

- **Size the world to the frame.** For an N by N grid: `unit = Math.min(safe.width / (1.732 * N), safe.height / (N * 0.5 + tallest))`.
- **Draw back to front.** Things with a smaller x + y are farther away, so make them first. Bins in front of a belt are made after the belt.
- `iso.box` for buildings, machines, vehicles and parcels; `iso.tile` for floors, roads and water; `iso.tree` for trees; `iso.grid` for a planning grid.
- **Detail sells it:** windows on buildings, dashes on roads, trees around the edges, a lid on a bin. Small things, many of them.
- `iso.at(x, y, z)` gives the screen point for a grid point: use it to place labels and wheels.

## How things arrive

- **Rise:** blocks grow from the ground with `kit.spring`, staggered 0.1 to 0.2 seconds apart, back to front.
- **Travel:** vehicles and parcels move along roads and belts with easing in and out, and stop where something happens.
- **Pop:** small things (trees, lids, labels) spring in at full size with a slight overshoot.
- **Flow:** streams of items move at a constant speed, so the system feels like it's running.

## Shots that work

- **The place:** the whole little world rises; the question floats above.
- **The journey:** one vehicle moves through it and stops at the key moment, with a label.
- **The machine:** a belt or a process with items flowing through and being changed or sorted.
- **The result:** a pile, a stack or a finished product, built up piece by piece.
- **The steps:** blocks rising as a staircase, one per step, each labelled.

## Rules

- **One world per scene.** Zoom in by making a new, closer world in the next scene, not by shrinking things.
- **Leave room for the title** at the top and the captions at the bottom: the world sits in the middle of `kit.safe`.
- **Keep labels off busy faces.** Put them in clear space above or in front, never over a coloured face.
- **Sound:** `tap` as blocks land, `click` for machines, `whoosh` for vehicles, `tick` for small things piling up.
