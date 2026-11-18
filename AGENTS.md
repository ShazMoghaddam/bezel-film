# Working on the Bezel Film repo

This file is for coding agents working on Bezel Film itself. The instructions for agents that use Bezel Film to make films live in `agents/instructions.md`.

- Node 22+, TypeScript, ES modules. Imports inside `src/` use `.js` extensions.
- `src/spec/schema.ts` is the source of truth for the film file. After changing it, run `npm run schema`.
- `agents/instructions.md` is the single source for every agent's file. After changing it, run `npm run agents`. Never edit `agents/generated/` or `schema/` by hand.
- Run `npm run check` before finishing. It must pass.
- Add a line under **Unreleased** in `CHANGELOG.md` for user-facing changes.
- Plain English and British spelling in docs, errors and CLI output. No em dashes.
- Branch names start with `shaz/`. Never push to `main`.
