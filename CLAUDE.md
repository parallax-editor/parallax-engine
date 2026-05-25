# parallax-engine

Engine de parallax compartido (Vue 3 library). Núcleo de todo el sistema de sitios de Daniela Reyes.

## Comandos

```bash
yarn dev        # Watch build (recompila al guardar, output en dist/)
yarn build      # Build completo: vite build + vue-tsc declarations
yarn test       # 76 unit tests con Vitest
yarn typecheck  # vue-tsc --noEmit
```

## Exports

- `parallax-engine` — componentes Vue, composables, utils, config helper
- `parallax-engine/schema` — Zod schema + tipos TypeScript (sin dependencia de Vue)

## Arquitectura

- `src/schema.ts` — **EL CONTRATO SAGRADO (§4)**. Todos los repos respetan este schema. Cambios aquí rompen los 4 repos.
- `src/components/` — ParallaxSite, ParallaxSection, ParallaxLayer, elements (Png, Text, Component, Audio, Video), FormBlock, WorldTransition, ErrorOverlay, GyroscopePrompt, CustomCursor, UnmuteButton
- `src/composables/` — useScrollProgress, useElementAnimations, useReducedMotion, useErrorHandler, useResponsive, useQualityTier, useMouseTracking, useGyroscope, useInteractionBus, useCursorEffect
- `src/config.ts` — `defineParallaxConfig()` para registro de componentes custom
- `src/utils/` — ids (auto-assign), units (number→%, string→as-is)
- `tests/` — 11 suites, 76 tests

## Features del engine

- **Parallax**: scroll-vertical, scroll-horizontal, mouse, gyroscope, tilt, perspective3d
- **Secciones**: continuous, pinned (sticky), snap, horizontal scroll direction
- **Animaciones triggers**: enter, scroll, loop (yoyo), mouse, gyroscope, hover, click, depends (cross-element)
- **Animaciones types**: fadeIn/Out, translateX/Y, rotate/X/Y, scale, blur, skew, clipPath
- **Elementos**: png, text (splitMode words/chars/lines), component, audio, video — todos con link opcional
- **Interactividad**: event bus hover/click, depends trigger entre elementos por ID
- **Responsive**: overrides mobile/desktop por elemento
- **Quality tiers**: auto-detección hardware, caps layers/blur/fps
- **FormBlock**: 9 field types, validación, honeypot, webhook POST, ARIA
- **A11y**: prefers-reduced-motion, semantic tags, alt, ARIA, focus-visible
- **Errores**: dev overlay rojo / prod console.error silent
- **Transiciones**: fade, wipe, crossfade-blur, zoom, page-flip entre mundos
- **Custom cursor**: configurable color/size/blendMode
- **Blend modes**: mix-blend-mode por layer

## Assets — `assetBase` (el engine resuelve las rutas, NO el consumidor)

El `site.json` guarda rutas de assets **relativas** y canónicas (`images/foo.png`, `fonts/x.otf`, `video.poster`, fondos de sección tipo imagen). **El engine es autosuficiente**: el consumidor solo declara DÓNDE sirve los assets de ese site pasando la prop **`assetBase`** a `<ParallaxSite>` (p. ej. `assetBase="/content/<slug>/"`), y el engine prefija TODA ruta relativa (`png/video/audio.src`, `video.poster`, `@font-face url` de fuentes custom y fondos de sección imagen) vía `resolveAssetUrl` (`utils/units.ts`). El consumidor **no** debe reescribir el `site.json`.

- **Additive / backwards-compatible:** sin `assetBase`, las rutas se usan tal cual (comportamiento previo) y en **dev** el engine **avisa por consola** (`[parallax-engine] … no se pasó la prop assetBase…`) — "lo pida".
- **Nunca toca** rutas no-relativas: `http(s)://`, root-relativas (`/…`), protocol-relative (`//…`), `data:` ni `blob:`.
- **OG image / favicon** son meta de `<head>` (SEO) que el engine NO renderiza → eso lo sigue prefijando el consumidor en su capa de SEO.
- Test: `tests/units.test.ts` cubre `resolveAssetUrl`/`isRelativeAssetPath`.

## Linking

Los 3 repos consumidores declaran `"parallax-engine": "link:../parallax-engine"` en package.json. `yarn install` crea el symlink automáticamente. Los consumidores necesitan `vite.resolve.dedupe: ['vue']` para evitar doble instancia.

## Schema v1.1

El schema se define completo en `src/schema.ts`. Es additive-only — todos los campos nuevos son opcionales y backwards-compatible. v1.1 añade `views` (árboles desktop/mobile independientes); v1.0 sigue 100% válido. No subir a v2 sin migración planificada.

## Doc de IA — `ai/contract.md` (FUENTE DE VERDAD para LLMs)

`ai/contract.md` es el **contrato de autoría de `site.json` auto-contenido** que el editor inyecta en cada `claude -p`. Gracias a esto los repos de contenido (eventos / portafolio / un tercero) **ya NO llevan ningún skill** — el editor + el engine son la única fuente. El editor lo empaqueta en su bundle (`parallax-editor/scripts/embed-contract.mjs`), así que funciona aunque el repo del engine no esté en la máquina de Daniela.

**REGLA DE MANTENIMIENTO (obligatoria):** **siempre que modifiques el engine** — especialmente `src/schema.ts`, `src/config.ts` (editableProps), o cualquier feature/comportamiento que afecte cómo se escribe un `site.json` — **revisa si hay que ajustar `ai/contract.md` y actualízalo en el MISMO commit.** Hay un test (`tests/contract-doc.test.ts`) que falla si la doc se desincroniza de la versión del schema o de los enums (tipos de elemento, animación, triggers, easing, transiciones); pero la prosa y los ejemplos los mantienes tú.

## Git hooks

Hook `pre-commit` versionado en `hooks/pre-commit`, activado con `git config --local core.hooksPath hooks` (config local del repo; el hook vive en el árbol). En cada `git commit` corre, en orden: `yarn lint` **si** existe el script `lint` en `package.json` (hoy no existe → se omite con nota), `yarn typecheck` (vue-tsc) y `yarn test` (Vitest, offline). Cualquier fallo → commit bloqueado con mensaje claro en español. Emergencia: `git commit --no-verify`. El auto-commit-on-save del editor pasa `--no-verify` a propósito (ver `parallax-editor`), así que nunca dispara este hook.
