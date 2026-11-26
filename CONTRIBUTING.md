# Contributing to Bezel Film

Thanks for helping out. Bug reports, ideas and pull requests are all welcome.

## Getting set up

You need Node 22 or later.

```bash
git clone https://github.com/ShazMoghaddam/bezel-film.git
cd bezel-film
npm install
npm run check
```

On Linux, run `export ONNXRUNTIME_NODE_INSTALL_CUDA=skip` before `npm install` to skip large GPU files the voice engine doesn't need.

`npm run check` runs the type checks, tests, generated-file checks and the example film. `npm run smoke` renders a short test film end to end, as CI does.

To render the example film: `npx tsx src/cli.ts render examples/northside-coffee/film.json`.

## How the project fits together

| Folder | What lives there |
| --- | --- |
| `src/spec/` | The film spec (`schema.ts`), the platform presets and their safe zones (`formats.ts`), the font pairings (`fonts.ts`), and validation. `schema.ts` is the source of truth for the film file. `styles.ts` is built from `styles/` by `npm run styles`; don't edit it by hand. |
| `src/render/` | The renderer: voice (`voice.ts`), timing (`timeline.ts`), the scene page and its layouts (`page.ts`, `runtime.ts`, `layout.ts`), custom scenes (the kit in `kit.ts`, the checks in `check.ts`, `preview.ts`), map scenes (`map.ts`), music (`music.ts`, `colours.ts`, `nature.ts`, `instruments.ts`, `soundtrack.ts`), frame capture and ffmpeg (`index.ts`). |
| `src/geo.ts` | Place names and the world map: finds cities, countries and regions, and draws the world. |
| `src/repo.ts`, `src/draft.ts` | `bezel-film draft`: gathering facts about a project, and turning them into a first film. |
| `src/cli.ts` | The `bezel-film` command. |
| `src/init.ts`, `src/agents.ts` | `bezel-film init`, and the list of coding agents and where their instructions go. |
| `styles/` | One folder per style: its settings (`style.json`) and look (`style.css`). See [styles/README.md](styles/README.md) to make one. |
| `fonts/` | The fonts films use. Built by `npm run fonts` from the Fontsource packages; don't edit by hand. |
| `icons/` | The line drawings for `kit.icon()`. Built by `npm run icons` from Tabler Icons; don't edit by hand. |
| `guides/` | The guides agents read with `bezel-film guide`: directing a film, and writing custom scenes. Keep `scenes.md` in step with `src/render/kit.ts`. |
| `agents/instructions.md` | The single source for every agent's instructions. |
| `agents/generated/` | Built from the source. Don't edit these by hand. |
| `schema/` | JSON Schema built from `src/spec/schema.ts`. Don't edit by hand. |
| `instruments/` | Recorded instruments for the music. Built by `npm run instruments`; don't edit by hand. |
| `maps/` | World outlines and places from Natural Earth. Built by `npm run maps`, from a pinned version with checked fingerprints; don't edit by hand. |
| `examples/` | Example films, checked in CI. Each style made for custom scenes has one, named after it. |
| `docs/` | The README banner and social preview, built from `docs/banner.html` (with stills from the example films in `docs/banner/`) by `npm run banner`, the styles gallery (`styles.jpg`), and the demo (`promo.gif`, `promo.mp4`), built from the promo film in `docs/promo/` by `npm run demo`. |

## Trying `init`

`init` normally installs the published package. To try your local changes instead, pack them and point `init` at the tarball:

```bash
npm pack
mkdir /tmp/try-init && cd /tmp/try-init
BEZEL_FILM_INSTALL_SPEC=/path/to/bezel-film-x.y.z.tgz npx --package=/path/to/bezel-film-x.y.z.tgz bezel-film init
```

## Checking layouts

Changed how scenes look? Take a still of every scene in every platform format, then look through them:

```bash
npm run stills -- examples/northside-coffee/film.json all --safe-zones
```

The stills go in `stills/` (ignored by git). Name a few presets instead of `all` to check just those, and leave out `--safe-zones` to see a film as viewers will.

## Checking motion

Changed how things move? Save a strip of frames across every scene's entrance, for each motion level:

```bash
npm run motion -- examples/northside-coffee/film.json youtube
```

The strips go in `motion/` (ignored by git). Add `lively,punchy` to check just those levels. It also checks every frame is exact, by seeking to the same moments again on a fresh page, and fails if any picture differs.

## Keeping CI quick

The render smoke test runs in Microsoft's Playwright container (`mcr.microsoft.com/playwright`), which already has the browser's system libraries. When Dependabot bumps `playwright-core`, bump the container's version in `.github/workflows/check.yml` to match. It still works if you forget, just a little slower.

## Generated files

Two things are generated, and CI fails if they're out of date:

- Changed `src/spec/schema.ts`? Run `npm run schema`.
- Changed `agents/instructions.md`? Run `npm run agents`. Windsurf rule files are capped at 6,000 characters, so Windsurf gets a compact version: wrap anything it can do without in `<!-- full -->` and `<!-- /full -->`, and give it a one-line stand-in with `<!-- compact: … -->` if it needs one. A test checks the limit.
- Changed the scene kit, a style or an example film made with custom scenes? Run `npm run example:shapes` to preview every one of them in 16:9, TikTok, 4:5 and square frames. It takes about 15 minutes, so it isn't part of `npm run check`.
- Changed the welcome film or how films look? Run `npm run demo` (it needs the voice, so run `npx bezel-film setup` first) to refresh the README demo.

Commit the generated files along with your change.

## Pull requests

1. Branch from `main`.
2. Keep each pull request to one change, with tests where it makes sense.
3. Add a line under **Unreleased** in [CHANGELOG.md](CHANGELOG.md).
4. Make sure `npm run check` passes.

## Releasing

Releases publish to npm by themselves, from GitHub Actions, with no npm login.

1. Merge a pull request that bumps the version in `package.json` and `package-lock.json`, and dates the **Unreleased** section of [CHANGELOG.md](CHANGELOG.md).
2. Publish a GitHub release on `main`, tagged `v` plus the version (for example `v0.4.3`).
3. The **Release** workflow checks the tag matches the version and that every music track is in the tag, runs the full check, and publishes to npm with a provenance statement.

npm trusts the workflow directly ([trusted publishing](https://docs.npmjs.com/trusted-publishers)), so there's no token to keep or renew. The tag always exists before the new version reaches npm, so films can download their music straight away.

## Writing style

Docs, errors and CLI messages use plain English, short sentences and British spelling.
