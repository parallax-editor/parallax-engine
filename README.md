<div align="center">

<img src="docs/icon.png" width="120" height="120" alt="Parallax Engine logo" />

# parallax-engine

**Vue 3 engine for immersive websites driven by a JSON schema.**

[![npm](https://img.shields.io/npm/v/@parallax-editor/parallax-engine.svg?color=d6c7a6)](https://www.npmjs.com/package/@parallax-editor/parallax-engine)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-d6c7a6.svg)](./LICENSE)
[![CI](https://github.com/parallax-editor/parallax-engine/actions/workflows/ci.yml/badge.svg)](https://github.com/parallax-editor/parallax-engine/actions/workflows/ci.yml)
[![Pages](https://github.com/parallax-editor/parallax-engine/actions/workflows/pages.yml/badge.svg)](https://parallax-editor.github.io/parallax-engine/)
[![Built with Claude Code](https://img.shields.io/badge/built%20with-Claude%20Code-d6c7a6)](https://claude.com/claude-code)

[**Docs**](https://parallax-editor.github.io/parallax-engine/) · [**npm**](https://www.npmjs.com/package/@parallax-editor/parallax-engine) · [**Editor**](https://github.com/parallax-editor/parallax-editor) · [**Authoring contract**](./ai/contract.md)

</div>

---

Parallax Engine renders **layered, depth-aware websites** from a single
`site.json` file. Scroll parallax, mouse and gyroscope motion, animation
triggers, interactive elements, world-to-world transitions — all driven by a
declarative schema instead of imperative code.

It is the rendering core of the **Parallax** system: pair it with the
[Parallax Editor](https://github.com/parallax-editor/parallax-editor) — a
local Illustrator-style desktop app — to compose sites visually.

```ts
import { ParallaxSite } from '@parallax-editor/parallax-engine'
import '@parallax-editor/parallax-engine/style.css'

const site = {
  schemaVersion: '1.1',
  meta: { title: 'Hello, depth' },
  sections: [{
    background: { type: 'color', value: '#0b0b0c' },
    layers: [
      { depth: -0.6, parallaxMode: ['scroll-vertical'], elements: [
        { type: 'png', src: 'images/sky.png',  position: { x: 50, y: 30 } }
      ]},
      { depth:  0.4, parallaxMode: ['mouse'],            elements: [
        { type: 'png', src: 'images/flora.png', position: { x: 50, y: 70 },
          animations: [{ type: 'rotate', trigger: 'loop', from: -3, to: 3,
                         duration: 4000, yoyo: true }] }
      ]}
    ]
  }]
}
```

```vue
<ParallaxSite :site="site" assetBase="/content/hello/" />
```

## Why?

- **JSON-first**: every scene is data. Version it in git, transform it with
  scripts, hand it to an LLM, edit it visually — same source of truth.
- **Real depth**: layers move at different speeds with scroll, pointer, or
  device tilt. Not a CSS approximation.
- **Animation grammar**: 11 animation types × 8 triggers (`enter`, `scroll`,
  `loop`, `hover`, `click`, `mouse`, `gyroscope`, `depends`). Compose
  behavior without writing animation code.
- **World transitions**: navigate between full scenes (`link.site`) with
  cinematic fades, wipes, zooms, page-flips — no Vue Router required.
- **Responsive by design**: per-element mobile/desktop overrides, or
  fully independent `views` for radically different layouts.
- **A11y built in**: `prefers-reduced-motion`, semantic tags, ARIA, focus
  rings, alt text. Performance auto-tiers down on lower-end hardware.

## Install

```bash
npm install @parallax-editor/parallax-engine
# or
yarn add @parallax-editor/parallax-engine
```

Peer dependency: `vue ^3.4.0`. In consumer Vite configs, set
`resolve.dedupe: ['vue']` to avoid double Vue instances.

## What ships in the package

| Export | Purpose |
|---|---|
| `@parallax-editor/parallax-engine` | Vue components (`ParallaxSite`, `ParallaxSection`, …), composables, utils, `defineParallaxConfig()` |
| `@parallax-editor/parallax-engine/schema` | Zod schema + TypeScript types. **No Vue dependency** — usable from build tools, CLIs, validators. |
| `@parallax-editor/parallax-engine/style.css` | Built stylesheet. Import once at the app root. |

## Schema highlights (v1.1)

```jsonc
Site {
  schemaVersion: "1.1",
  meta: { title, description?, ogImage?, fonts?, transition?, lang? },
  theme?: { colors: { ink, paper, accent }, typography: { display, body } },
  // EITHER (v1.0 legacy) ─────────────────────────
  sections?: [ Section ],   // single tree + per-element mobile/desktop overrides
  // OR (v1.1) ─────────────────────────────────────
  views?: { desktop: { sections }, mobile?: { sections } }
}
```

Full schema + authoring contract: [`ai/contract.md`](./ai/contract.md). The
contract is also the source of truth the Parallax Editor injects into its
AI assistant, so an LLM authoring a `site.json` "speaks the same language"
as the runtime.

## Features at a glance

- **Parallax modes**: scroll-vertical, scroll-horizontal, mouse, gyroscope, tilt, perspective3d
- **Section behaviors**: continuous, pinned (sticky), snap, horizontal scroll direction
- **Animation triggers**: enter, scroll-range, loop (yoyo), mouse, gyroscope, hover, click, depends (cross-element)
- **Animation types**: fadeIn/Out, translateX/Y, rotate/X/Y, scale, blur, skew, clipPath
- **Element types**: `png`, `text` (splitMode words/chars/lines), `component` (custom Vue), `audio`, `video`
- **World transitions**: fade, wipe, crossfade-blur, zoom, page-flip
- **Custom cursor**, **mix-blend-mode per layer**, **FormBlock** (9 field types + honeypot + webhook)
- **Quality tiers**: hardware auto-detection caps layers/blur/fps on low-end devices

## Development (contributors)

```bash
yarn install
yarn dev          # watch build (rebuilds on save → dist/)
yarn build        # full build (vite + vue-tsc declarations)
yarn typecheck    # vue-tsc --noEmit
yarn test         # Vitest unit tests
```

To iterate on the engine alongside a consumer (e.g. parallax-editor) without
publishing, use [`yarn link`](https://classic.yarnpkg.com/lang/en/docs/cli/link/)
or [`yalc`](https://github.com/wclr/yalc):

```bash
# in parallax-engine
yarn link
yarn dev

# in your consumer app
yarn link @parallax-editor/parallax-engine
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the schema-stewardship rules
(the `ai/contract.md` test will fail if the schema and the doc drift).

## Releasing

Publishes to npm via [Trusted Publishing (OIDC)](./NPM_PUBLISHING.md) when a
`vX.Y.Z` tag is pushed.

## Acknowledgments

- Built end-to-end with [Claude Code](https://claude.com/claude-code).
- Smooth-scroll powered by [Lenis](https://github.com/darkroomengineering/lenis).
- Schema validation by [Zod](https://github.com/colinhacks/zod).

## License

[GPL-3.0-or-later](./LICENSE). Any redistribution or fork must remain
open-source under a compatible GPL license. For copyleft over network
services see the AGPL-licensed
[Parallax Editor](https://github.com/parallax-editor/parallax-editor).
