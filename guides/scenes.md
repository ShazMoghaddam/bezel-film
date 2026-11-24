# Writing a scene

A custom scene is a small JavaScript file you write for one film. It draws everything in its part of the film, in any way you like: HTML, SVG or canvas. Bezel Film adds the voice, captions, music, transitions and every platform format around it.

Read `npx bezel-film guide director` first: it's how to plan the film this scene is part of.

## In the film file

```json
{
  "type": "custom",
  "file": "scenes/steps.js",
  "props": { "steps": ["You order", "We make it", "At your door"] },
  "narration": "You order in the app. A barista makes it fresh. And a rider brings it round.",
  "sounds": [{ "at": 0.2, "sound": "tap" }]
}
```

- `file` is relative to the film file. Keep scene files in a `scenes/` folder beside it.
- `props` is anything your code needs. It arrives as `kit.props`, so the words live in the film file, not the code.
- `sounds` land at seconds into the scene: `whoosh`, `sweep`, `swish`, `tap`, `pop`, `click`, `tick`, `ding`.
- The scene lasts as long as its narration, or `duration` seconds.
- Custom and ready-made scenes mix freely in one film.

## The shape of a scene file

```js
Bezel.scene((root, kit) => {
  // 1. Build: make every element once.
  const title = kit.el("h1", {
    text: kit.props.title,
    style: { position: "absolute", left: kit.safe.x + "px", top: kit.safe.y + "px",
             font: `700 ${kit.u * 9}px ${kit.fonts.heading}`, color: kit.colours.text },
  }, root);

  // 2. Draw: return a function that sets everything for the moment t.
  return (t) => {
    title.style.opacity = kit.progress(t, 0.2, 0.6);
  };
});
```

`root` is an empty layer covering the whole frame. `t` is seconds since the scene began.

## The one rule

**Draw each moment from `t` alone.** Bezel Film may ask for any moment, in any order, and the same `t` must always give the same picture. So in your draw function:

- Work everything out from `t`: `kit.progress`, `kit.spring` and `kit.ease` exist for this.
- Don't use `Math.random()`, `Date.now()`, `requestAnimationFrame`, timers or CSS animations and transitions.
- Don't add up from one frame to the next (`x += 2`). Use `x = start + speed * t`.
- For randomness, make a generator once when building, `const rand = kit.random(42)`, and use what it gives you there.

`preview` checks this, and a render won't start if it fails.

## The kit

**The frame**

| | |
| --- | --- |
| `kit.width`, `kit.height` | The frame in pixels |
| `kit.u` | One hundredth of the frame's shorter side. Size everything with it, so one scene works in every format |
| `kit.safe` | `{ x, y, width, height }`: where words and key pictures go, clear of captions and the platform's buttons |
| `kit.shape` | `"wide"`, `"square"` or `"tall"`, to lay out differently for each |

**The film**

| | |
| --- | --- |
| `kit.duration` | The scene's length in seconds |
| `kit.lines` | Each narration sentence: `{ text, start, end }` in seconds into the scene |
| `kit.at(i)` | When sentence `i` starts, so things land on their words |
| `kit.props` | Your `props` from the film file |
| `kit.colours` | The style's `background`, `surface`, `text`, `muted`, `accent` and `palette` (a list) |
| `kit.fonts` | The film's fonts as CSS: `heading`, `body`, `mono` |
| `kit.theme` | `"dark"` or `"light"` |

**Timing and movement**

| | |
| --- | --- |
| `kit.progress(t, start, duration, ease?)` | 0 before `start`, 1 after it ends, eased between. `ease` is a name below or a function |
| `kit.ease` | `linear`, `in`, `out`, `inOut`, `outQuart`, `outExpo`, `outBack` (overshoots a little) |
| `kit.spring(t, { stiffness, damping })` | A spring from 0 to 1 that overshoots and settles. Call it with `t - when` |
| `kit.clamp(x, lo, hi)`, `kit.lerp(a, b, p)` | The usual helpers |
| `kit.random(seed)` | A repeatable random number generator. Use it while building |

**Making things**

| | |
| --- | --- |
| `kit.el(tag, props, parent)` | An HTML element. `props` takes `text`, `class`, `style` (an object or a string) and any attribute |
| `kit.svg(tag, props, parent)` | An SVG element, the same way |
| `kit.asset(path)` | The address of a file in the film's folder, e.g. a picture: `kit.asset("pictures/shop.png")` |

**Drawing lines and writing words**

```js
const plan = kit.drawing({ pen: true, penColour: kit.colours.accent });
plan.write(titleEl, { at: 0.3, duration: 1.2 });       // words write themselves in
plan.line(pathEl, { at: 1.6, duration: 0.6 });         // a path draws itself
const end = plan.sequence(2.4, [path1, path2, label]); // one after another
return (t) => plan.draw(t);
```

`line` works with any SVG shape that has a stroke: `path`, `line`, `polyline`, `circle`, `rect`. With `pen: true`, a marker pen follows the tip as it draws, lifting between strokes. Leave the pen out for a cleaner look.

**Drawing kit**

| | |
| --- | --- |
| `kit.stage()` | A full-frame SVG layer whose units are the frame's pixels. Put shapes from the parts below on it |
| `kit.text(parent, words, { x, y, size, font, colour, align })` | Words placed by a point: `align` is `"left"`, `"center"` or `"right"`. `size` is in `kit.u`; `font` is `"heading"`, `"body"` or `"mono"` |
| `kit.icon(name, { x, y, size, colour })` | A line drawing from the bundled set of 5,491 (Tabler Icons). Returns `{ svg, paths }`; draw it in with `plan.sequence(at, icon.paths)`. Find names with `npx bezel-film icons coffee` |
| `kit.rough` | Hand-drawn path data: `line`, `rect`, `ellipse`, `underline`, and `arrow` (which returns `{ shaft, head }`). Each takes a `seed`, so it's drawn the same way every time |
| `kit.figure(stage, { x, y, height, face })` | A stick figure standing at `(x, y)`. `.pose("wave")`, `.pose("stand", "cheer", p)` to blend, `.walk(t)`, `.move(x, y)`, `.face("sad")`, `.hand("right")`. Poses: `stand`, `wave`, `point`, `present`, `think`, `cheer`, `shrug`, `hold`, `sad`, `sit`, `walkA`, `walkB` |
| `kit.iso({ x, y, unit })` | Isometric drawing: `.box(stage, { x, y, z, w, d, h, colour })` (change it later with `.set({ h })`), `.tile`, `.tree`, `.grid`, and `.at(x, y, z)` for a screen point |
| `kit.dimension(stage, x1, y1, x2, y2, { label, offset })` | A measurement, as on a technical drawing. Returns `{ paths, label }` to draw in |
| `kit.toon(stage, { x, y, height, kind, colour, face })` | A cartoon character: `kind: "rubber"` (1930s: hose limbs, gloves, pie eyes) or `"flat"` (1950s: box body, thin limbs). Same poses as `kit.figure`, plus `.squash(k)`, `.look(k)` and faces `happy`, `open`, `surprised`, `sad`, `neutral` |
| `kit.stepped(t, fps)` | Time in held steps, like animation drawn on twos: `kit.stepped(t, 12)` |
| `kit.panels([[x, y, w, h], ...])` | Comic panels inside `kit.safe`, given as fractions, with even gutters |
| `kit.speedLines(stage, { kind, cx, cy, box })` | Manga speed lines: `"focus"` bursts from a point, `"motion"` streaks at an `angle`. Clipped to `box` |
| `kit.tone(stage, { kind, size, colour, weight, angle })` | Screentone or hatching to use as a fill: `"dots"`, `"lines"` or `"cross"` |
| `kit.cutout(parent, d, { fill, edge, shadow })` | A shape cut from card or paper: a path with an optional paper rim (`edge`) and a drop shadow. Returns `{ group, shape }` |
| `kit.popup(stage, { base, x })` | A pop-up piece hinged at `y = base`. Draw into `.group`, then `.set(p)` each frame: 0 flat, 1 standing. Drive it with `kit.spring` |
| `kit.scribble(stage, { d, box, colour, angle, seed })` | Crayon colouring-in, clipped to a path or box. `.set(p)` colours it in from 0 to 1 |
| `kit.fold(parent, { points, crease, front, back })` | An origami flap that folds over its crease line. `.set(p)`: 0 open, 1 folded flat, showing its `back` |
| `kit.glow(parent, { cx, cy, r, colour, strength })` | A soft round glow, like light through paper. Change its opacity to flicker it |

## Good practice

- **Lay out from `kit.safe` and `kit.u`**, never fixed pixel numbers, so the scene works from TikTok to a wide LinkedIn video. Check every format the film is for with `preview --for`.
- **Keep words big**: at least `kit.u * 3.5` for body text, more for headings.
- **Use the style's colours and fonts** from the kit, so your scene belongs to the film.
- **Move first, draw the pen last.** In your draw function, pose figures and move shapes first, then call `plan.draw(t)`. The pen follows lines as they are at that moment, so if it goes first it trails a frame behind, and `preview` will say the scene draws differently each time.
- **Build once, move in draw.** Making elements inside `draw` is slow and is the most common mistake.
- **Own work only.** Draw your own pictures with SVG paths and shapes, or use files the user gave you. Don't copy drawings, logos or characters from elsewhere.
- **Nothing from the internet.** Rendering is offline and every outside request is blocked. Put pictures and fonts in the film's folder and load them with `kit.asset`.

## When something's wrong

`npx bezel-film preview <film.json>` names the scene, the file and what to change. The usual fixes:

| Message | Fix |
| --- | --- |
| draws a different picture each time | Something in `draw` isn't worked out from `t`. See the one rule |
| runs outside the safe area | Move or shrink it inside `kit.safe` |
| hard to read | Use `kit.colours.text` on the background, or put a panel behind the words |
| takes long to draw each frame | Move building out of `draw` |
| has a mistake on line N | A typo in the file: fix that line |
