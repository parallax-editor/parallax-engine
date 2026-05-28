# parallax-engine

[![npm](https://img.shields.io/npm/v/parallax-engine.svg)](https://www.npmjs.com/package/parallax-engine)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](./LICENSE)

Open-source Vue 3 engine for immersive parallax sites driven by a JSON schema (`site.json`). The rendering core of the **Parallax** system — paired with [`parallax-editor`](https://github.com/parallax-editor/parallax-editor), a local Illustrator-style editor, and any number of consumer sites that render `site.json` files.

> Built end-to-end with [Claude Code](https://claude.com/claude-code).

## Install

```bash
npm install parallax-engine
# or
yarn add parallax-engine
```

Peer dependency: `vue ^3.4.0`. Consumer apps should `dedupe: ['vue']` in their Vite config to avoid double Vue instances when the engine is linked locally.

## Usage

```ts
import { ParallaxSite } from 'parallax-engine'
import { validateSite } from 'parallax-engine/schema'
import 'parallax-engine/style.css'
```

See [`ai/contract.md`](./ai/contract.md) for the full `site.json` schema and authoring contract.

## Exports

- `parallax-engine` — Vue components, composables, utils, config helper
- `parallax-engine/schema` — Zod schema + TypeScript types (no Vue dependency)
- `parallax-engine/style.css` — built CSS

## Local development (contributors)

```bash
yarn install
yarn dev          # watch build (rebuilds on save → dist/)
yarn build        # full build (vite + vue-tsc declarations)
yarn typecheck    # vue-tsc --noEmit
yarn test         # Vitest unit tests
```

To develop the engine alongside a consumer (e.g. parallax-editor) without
publishing, use `yarn link` or [`yalc`](https://github.com/wclr/yalc):

```bash
# in parallax-engine
yarn link
yarn dev          # keep the watch build running

# in the consumer
yarn link parallax-engine
```

## License

[GPL-3.0-or-later](./LICENSE). Any redistribution or fork must remain
open-source under a compatible GPL license. Network-service use does not
trigger source disclosure — if you need that copyleft scope, use
[`parallax-editor`](https://github.com/parallax-editor/parallax-editor),
which is licensed under AGPL-3.0.
