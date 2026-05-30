#!/usr/bin/env node
/**
 * Build the `./nuxt` subpath of the engine.
 *
 * Two outputs:
 *   - `dist/nuxt/module.mjs`     — bundled module entry (esbuild, ESM, Node)
 *   - `dist/nuxt/runtime/`       — runtime files copied as-is (Vue SFCs + .ts);
 *                                  Nuxt's own bundler processes them at
 *                                  consumer build time.
 *
 * Plus a hand-rolled `dist/nuxt/module.d.ts` re-exporting the option types
 * from the bundled source, so `nuxt.config.ts` gets type-checking on the
 * `parallax: { ... }` block.
 *
 * Why not @nuxt/module-builder: keeps the engine repo's existing Vite build
 * pipeline as the source of truth; adding nuxt-module-builder pulls in
 * @nuxt/kit at build-time of the engine itself, which the rest of the repo
 * doesn't need. esbuild + a 30-line copy gets us the same shape, with no new
 * build-system surface to maintain.
 */

import { build } from 'esbuild'
import { cp, mkdir, writeFile, rm } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = resolve(ROOT, 'src/nuxt')
const OUT = resolve(ROOT, 'dist/nuxt')

await rm(OUT, { recursive: true, force: true })
await mkdir(OUT, { recursive: true })

// Bundle the module entry. Externals: @nuxt/* (peer dep), node built-ins,
// and the engine root + schema (imported by relative path during dev,
// resolved by Node from package exports at consumer install time).
await build({
  entryPoints: [resolve(SRC, 'module.ts')],
  outfile: resolve(OUT, 'module.mjs'),
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node18',
  external: [
    '@nuxt/kit',
    '@nuxt/schema',
    'nuxt',
    'node:*',
  ],
  logLevel: 'info',
})

// Copy runtime/ as-is. Nuxt resolves these via `createResolver(import.meta.url)`
// inside module.mjs (so `./runtime/...` always points at the right files no
// matter where the package is installed).
await cp(resolve(SRC, 'runtime'), resolve(OUT, 'runtime'), { recursive: true })

// Re-export the public option types so consumers get
// `defineNuxtConfig({ parallax: { ... } })` type-checking. Re-using the
// source file directly works because TypeScript compiles it at the consumer's
// `nuxt prepare` step.
const dts = `export type { ParallaxModuleOptions, ParallaxPreset, ParallaxSeoOptions } from './runtime/types'\nexport { default } from './module.mjs'\n`
await writeFile(resolve(OUT, 'module.d.ts'), dts)

// types.ts also needs to ship as a runtime file so the .d.ts re-export above
// can resolve it (and so the runtime composables that import it still find
// it after the rsync).
await cp(resolve(SRC, 'types.ts'), resolve(OUT, 'runtime/types.ts'))

console.log(`[parallax-engine/nuxt] built → ${OUT}`)
