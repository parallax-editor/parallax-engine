# Changelog

All notable changes to `@parallax-editor/parallax-engine` are documented here.
This project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

The format roughly follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
but releases produced by `npm version` + the publish workflow get their
release notes auto-generated from commit history on GitHub.

## [Unreleased]

### Fixed
- Nuxt runtime: robust scroll reset on in-engine `link.site` navigation —
  `<SiteHost>` re-asserts `scrollTo(0, 0)` across the next two animation
  frames, so the incoming site no longer inherits the outgoing site's
  scroll offset when an async re-scroll (smooth-scroll libs, browser
  restoration, trackpad inertia) landed after the single reset. Previously
  shipped as a temporary consumer-side patch in demo-atlas.
- Nuxt runtime: bfcache guard — returning to a site via the browser's
  Back/Forward across full page loads restored the frozen tab scrolled;
  both hosts (`<SiteHost>` and the bare multi-tenant page) now listen for
  `pageshow` with `persisted` and reset to the top.
- Nuxt runtime: `<SiteHost>` history URLs (`pushState` / `popstate`) now
  respect `app.baseURL`, fixing in-engine navigation on subpath deploys
  (e.g. GitHub Pages project sites). Also previously a demo-side patch.

### Added
- New `fit` prop on `<ParallaxSite>` (`'viewport'` | `'container'`,
  default `'viewport'`). With `fit="container"` the engine fills its host
  element instead of stretching to the viewport — use this when embedding
  the engine as a widget (hero, modal, card) inside a larger page. The
  engine also auto-substitutes the legacy `height: 100vh` section default
  with `100%` so layers resolve their `%` positions against the box.
- `<ParallaxSite>` now auto-normalizes the incoming `site` prop through the
  Zod schema, applying defaults for optional fields (`parallaxMode`,
  `animations`, `fonts`, …). Consumers can hand the engine a raw `site.json`
  with no manual `validateSite` call.

### Fixed
- `injectFonts()` no longer iterates `undefined` when a site lacks
  `meta.fonts` (defensive `?? []`).
- `ParallaxLayer` defends `parallaxMode` and `depth` against `undefined`.
- `TextElement` defends `animations` against `undefined`.

## [0.1.0] — 2026-05-27

Initial public release of the parallax engine as an open-source project.

- Vue 3 library, GPL-3.0-or-later.
- Schema v1.1 (`site.json`) with `views` for independent desktop/mobile trees.
- Element types: `png`, `text` (splitMode words/chars/lines), `component`,
  `audio`, `video`.
- Parallax modes: scroll-vertical, scroll-horizontal, mouse, gyroscope, tilt,
  perspective3d.
- Animation triggers: enter, scroll-range, loop (yoyo), mouse, gyroscope,
  hover, click, depends (cross-element).
- Animation types: fadeIn/Out, translateX/Y, rotate/X/Y, scale, blur, skew,
  clipPath.
- World transitions: fade, wipe, crossfade-blur, zoom, page-flip.
- Custom cursor, per-layer mix-blend-mode, FormBlock with 9 field types +
  honeypot + webhook POST.
- Hardware-tier-aware quality caps for low-end devices.
- Published to npm as `@parallax-editor/parallax-engine` via OIDC Trusted
  Publishing.

[Unreleased]: https://github.com/parallax-editor/parallax-engine/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/parallax-editor/parallax-engine/releases/tag/v0.1.0
