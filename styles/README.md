# Making a style

A style is a folder here. The folder's name is the style's name, in lowercase words joined by hyphens, such as `swiss-grid`.

| File | What it does |
| --- | --- |
| `style.json` | Settings: name, label, description, theme, font pairing, colours, motion and layout. Required. |
| `style.css` | The look: backdrop, texture, cards, lines, anything the shared CSS doesn't decide. |
| `filters.svg` | SVG filters the CSS can use, such as wobbly ink lines or print grain. Optional. |
| `guide.md` | For styles made for custom scenes: how the style looks and moves, for agents to follow (`bezel-film guide <name>`). Pair it with an example film in `examples/<name>`. |

Start by copying `data-story`, then:

1. Change `style.json`. `theme` is `"dark"` or `"light"`, and sets the charts' theme. `font` is one of the pairings in `src/spec/fonts.ts`.
2. Write `style.css`. The shared CSS in `src/render/page.ts` comes first, so your rules win.
3. Run `npm run styles` to add the style to the list, then `npm run check`.
4. Take stills of the example films in your style, in every format, and look through them (see "Checking layouts" in CONTRIBUTING.md).

## What a style's CSS can use

Colours from `style.json`, as CSS variables:

| Variable | Use |
| --- | --- |
| `--bg`, `--surface` | The background, and cards and panels on it |
| `--text`, `--muted` | Main and quieter text |
| `--accent` | Buttons, highlights and progress |
| `--p0` to `--p6` | The palette, one colour per series, point or stop |
| `--c` | The current scene's or item's colour, from the palette |

Fonts and sizes:

| Variable | Use |
| --- | --- |
| `--heading`, `--body`, `--mono` | The film's font pairing. Use these rather than naming a font, so `font` can swap them |
| `--u` | One hundredth of the frame's shorter side. Size everything with it, so it scales to every format |

Layers and hooks:

- `.backdrop` sits behind everything and drifts slowly. `.grain` sits over it for texture. Both are empty until a style paints them.
- `html` carries `data-style` (the style's name), `data-theme` and a shape class: `shape-wide`, `shape-square` or `shape-tall`.
- Each scene is a `section.scene` with `scene-<type>`, for example `scene-stat`. Inside are classes such as `.display`, `.heading`, `.lead`, `.card`, `.chip`, `.stat-value`, `.points`, `.journey`, `.code`, `.quote`, `.cta` and `.sticker`.

## Rules

- **Readable first.** The tests check that `text` and `muted` reach 4.5 to 1 contrast against `background` and `surface`, and that the accent and every palette colour reach 3 to 1 against `background` (WCAG AA).
- **Our own work.** Styles take inspiration from common art styles, but the colours, CSS and filters are written here. Don't copy another project's code, style guides or assets.
- **Offline.** No web fonts, images or anything else from the internet. Draw with CSS and SVG, or ship a file in the folder.
- **Leave movement to the motion system.** Styles change how things look, not when they move.
