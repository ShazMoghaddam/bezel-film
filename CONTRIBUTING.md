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

`npm run check` runs the type checks, tests, generated-file checks and the example film. `npm run smoke` renders a short test film end to end, as CI does.

To render the example film: `npx tsx src/cli.ts render examples/northside-coffee/film.json`.

## How the project fits together

| Folder | What lives there |
| --- | --- |
| `src/spec/` | The film spec (`schema.ts`) and validation. This is the source of truth for the film file. |
| `src/render/` | The renderer: voice (`voice.ts`), timing (`timeline.ts`), the scene page (`page.ts`, `runtime.ts`), frame capture and ffmpeg (`index.ts`). |
| `src/cli.ts` | The `bezel-film` command. |
| `styles/` | One folder per style: colours, fonts and motion. |
| `agents/instructions.md` | The single source for every agent's instructions. |
| `agents/generated/` | Built from the source. Don't edit these by hand. |
| `schema/` | JSON Schema built from `src/spec/schema.ts`. Don't edit by hand. |
| `examples/` | Example films, checked in CI. |

## Generated files

Two things are generated, and CI fails if they're out of date:

- Changed `src/spec/schema.ts`? Run `npm run schema`.
- Changed `agents/instructions.md`? Run `npm run agents`.

Commit the generated files along with your change.

## Pull requests

1. Branch from `main`.
2. Keep each pull request to one change, with tests where it makes sense.
3. Add a line under **Unreleased** in [CHANGELOG.md](CHANGELOG.md).
4. Make sure `npm run check` passes.

## Writing style

Docs, errors and CLI messages use plain English, short sentences and British spelling.
