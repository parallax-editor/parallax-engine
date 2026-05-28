# parallax-engine

Shared parallax engine (Vue 3 library). Core of the Parallax system (engine + editor + consumers).

## Commands

```bash
yarn dev        # watch build (rebuilds on save, output in dist/)
yarn build      # full build: vite build + vue-tsc declarations
yarn test       # Vitest unit tests
yarn typecheck  # vue-tsc --noEmit
```

## Exports

- `parallax-engine` — Vue components, composables, utils, config helper
- `parallax-engine/schema` — Zod schema + TypeScript types (no Vue dependency)

## Architecture

- `src/schema.ts` — **THE SACRED CONTRACT (§4)**. Every consumer respects this schema. Changes here ripple through every consumer.
- `src/components/` — ParallaxSite, ParallaxSection, ParallaxLayer, elements (Png, Text, Component, Audio, Video), FormBlock, WorldTransition, ErrorOverlay, GyroscopePrompt, CustomCursor, UnmuteButton
- `src/composables/` — useScrollProgress, useElementAnimations, useReducedMotion, useErrorHandler, useResponsive, useQualityTier, useMouseTracking, useGyroscope, useInteractionBus, useCursorEffect
- `src/config.ts` — `defineParallaxConfig()` for registering custom components
- `src/utils/` — ids (auto-assign), units (number→%, string→as-is)
- `tests/` — Vitest suites

## Engine features

- **Parallax**: scroll-vertical, scroll-horizontal, mouse, gyroscope, tilt, perspective3d
- **Sections**: continuous, pinned (sticky), snap, horizontal scroll direction
- **Animation triggers**: enter, scroll, loop (yoyo), mouse, gyroscope, hover, click, depends (cross-element)
- **Animation types**: fadeIn/Out, translateX/Y, rotate/X/Y, scale, blur, skew, clipPath
- **Elements**: png, text (splitMode words/chars/lines), component, audio, video — all support an optional link
- **Interactivity**: hover/click event bus, depends trigger between elements by ID
- **Responsive**: per-element mobile/desktop overrides
- **Quality tiers**: hardware auto-detection, caps layers/blur/fps
- **FormBlock**: 9 field types, validation, honeypot, webhook POST, ARIA
- **A11y**: prefers-reduced-motion, semantic tags, alt, ARIA, focus-visible
- **Errors**: red dev overlay / silent console.error in prod
- **Transitions**: fade, wipe, crossfade-blur, zoom, page-flip between worlds
- **Custom cursor**: configurable color/size/blendMode
- **Blend modes**: per-layer mix-blend-mode

## Assets — `assetBase` (engine resolves paths, NOT the consumer)

`site.json` stores **relative**, canonical asset paths (`images/foo.png`, `fonts/x.otf`, `video.poster`, image-type section backgrounds). **The engine is self-sufficient**: the consumer only declares WHERE it serves the assets for that site by passing the **`assetBase`** prop to `<ParallaxSite>` (e.g. `assetBase="/content/<slug>/"`), and the engine prefixes EVERY relative path (`png/video/audio.src`, `video.poster`, `@font-face url` for custom fonts, and image-type section backgrounds) via `resolveAssetUrl` (`utils/units.ts`). The consumer must **not** rewrite `site.json`.

- **Additive / backwards-compatible:** without `assetBase`, paths are used verbatim (legacy behavior) and in **dev** the engine **logs a console warning** (`[parallax-engine] … assetBase prop not provided…`) — "ask for it".
- **Never touches** non-relative paths: `http(s)://`, root-relative (`/…`), protocol-relative (`//…`), `data:`, or `blob:`.
- **OG image / favicon** are `<head>` metadata (SEO) the engine does NOT render → those are still prefixed by the consumer's SEO layer.
- Test: `tests/units.test.ts` covers `resolveAssetUrl`/`isRelativeAssetPath`.

## Distribution / linking

The engine ships to **npm** as `parallax-engine` (GPL-3.0-or-later). Consumers install with `yarn add @parallax-editor/parallax-engine` and declare the standard dep (`"@parallax-editor/parallax-engine": "^x.y.z"`). They need `vite.resolve.dedupe: ['vue']` to avoid double Vue instances.

For simultaneous engine + consumer development (without publishing): `yarn link` or [`yalc`](https://github.com/wclr/yalc). The background build (`yarn dev`) keeps `dist/` fresh; the consumer picks up changes on reload.

## Schema v1.1

The schema is defined in full in `src/schema.ts`. It is additive-only — every new field is optional and backwards-compatible. v1.1 adds `views` (independent desktop/mobile trees); v1.0 remains 100% valid. Do NOT bump to v2 without a planned migration.

## AI doc — `ai/contract.md` (SOURCE OF TRUTH for LLMs)

`ai/contract.md` is the **self-contained `site.json` authoring contract** that the editor injects into every `claude -p`. Thanks to this, consumer content repos **do not need to ship any skill** — the editor + engine are the only source. The editor bundles it (`parallax-editor/scripts/embed-contract.mjs`), so it works even when the engine repo is not present on the user's machine.

**MAINTENANCE RULE (mandatory):** **whenever you modify the engine** — especially `src/schema.ts`, `src/config.ts` (editableProps), or any feature/behavior that affects how a `site.json` is written — **check whether `ai/contract.md` needs an update and update it in the SAME commit.** There is a test (`tests/contract-doc.test.ts`) that fails if the doc drifts from the schema version or enums (element types, animation types, triggers, easing, transitions); but you maintain the prose and examples yourself.

## Git hooks

Pre-commit hook versioned in `hooks/pre-commit`, activated with `git config --local core.hooksPath hooks` (local repo config; the hook lives in the tree). On every `git commit` it runs, in order: `yarn lint` **if** the `lint` script exists in `package.json` (today it does not → skipped with a note), `yarn typecheck` (vue-tsc), and `yarn test` (Vitest, offline). Any failure → commit blocked with a clear message. Emergency: `git commit --no-verify`. The editor's auto-commit-on-save passes `--no-verify` on purpose (see `parallax-editor`), so it never fires this hook.
