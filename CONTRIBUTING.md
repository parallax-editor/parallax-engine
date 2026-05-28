# Contributing to parallax-engine

Thanks for your interest in improving the engine! This repo is the rendering
core of the Parallax system (paired with the
[Parallax Editor](https://github.com/parallax-editor/parallax-editor)).

## Local setup

```bash
yarn install
yarn dev        # watch build (rebuilds on save → dist/)
yarn test       # Vitest suite
yarn typecheck  # vue-tsc --noEmit
yarn build      # full build
```

## Working on the engine alongside the editor

The editor depends on `parallax-engine` from npm. To iterate on both at once
without publishing, use `yarn link` or [`yalc`](https://github.com/wclr/yalc):

```bash
# in parallax-engine
yarn link
yarn dev          # keep the watch build running

# in parallax-editor
yarn link parallax-engine
```

## The schema is sacred

`src/schema.ts` is the contract every consumer respects. Changes must be
**additive and backwards-compatible** (new fields optional, never breaking
existing ones). Do not bump the major schema version without a planned
migration.

If you change `src/schema.ts` or `src/config.ts`, update `ai/contract.md` in
the **same commit** — there is a test (`tests/contract-doc.test.ts`) that
fails if the doc drifts from the schema version or enums.

## Pull requests

- Keep PRs focused; one logical change per PR.
- Add a Vitest case for any behavior change.
- Run `yarn test` and `yarn typecheck` before pushing — CI runs them again.
- Conventional-ish commit messages are appreciated but not required.

## License

By contributing you agree your contributions are licensed under
[GPL-3.0-or-later](./LICENSE).
