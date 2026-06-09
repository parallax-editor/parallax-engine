/**
 * Regression guard for the v0.2.1 → 0.2.2 SSR breakage.
 *
 * Symptom: a fresh `yarn install` of the published tarball produced
 *   `useRoute is not defined` (or equivalent) at SSR time in every route.
 *
 * Root cause: the runtime pages / composables / components relied on Nuxt's
 * auto-imports for `useRoute`, `useAsyncData`, `useRuntimeConfig`, `useHead`,
 * `useSeoMeta`. Nuxt's unimport transform skips files inside `node_modules`,
 * so those auto-imports never landed and the helpers were undefined at runtime.
 * `yarn link` masked the bug locally because realpath resolves outside
 * `node_modules`, which IS in unimport's scan path — so the engine dev loop
 * never saw the failure.
 *
 * Fix: explicit `import { … } from '#imports'` in every runtime source file
 * that touches a Nuxt composable. This test scans the source files and fails
 * if any of those identifiers shows up as a free reference (not preceded by
 * an `import` from `#imports`).
 *
 * Keep both rules in lockstep: if you find yourself adding a new Nuxt
 * composable to a runtime file, ADD it to `NUXT_AUTOIMPORTS` AND import it
 * explicitly. `$fetch` is intentionally excluded — it's a real Nuxt global
 * (globalThis), not an auto-import.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const RUNTIME_ROOT = join(__dirname, '..', 'src', 'nuxt', 'runtime')

const NUXT_AUTOIMPORTS = [
  'useRoute',
  'useRouter',
  'useAsyncData',
  'useFetch',
  'useRuntimeConfig',
  'useHead',
  'useSeoMeta',
  'useState',
  'useNuxtApp',
] as const

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (/\.(vue|ts)$/.test(name)) out.push(full)
  }
  return out
}

describe('nuxt runtime: explicit #imports for auto-importable composables', () => {
  const files = walk(RUNTIME_ROOT)

  it('finds runtime files to scan', () => {
    expect(files.length).toBeGreaterThan(0)
  })

  for (const file of files) {
    const rel = file.slice(RUNTIME_ROOT.length + 1)
    const rawSrc = readFileSync(file, 'utf-8')
    // Strip line + block comments so identifier mentions in JSDoc / inline
    // notes (like the rationale comment in slug.vue itself, which lists
    // `useAsyncData()` as an example) don't trip the call-site regex below.
    const src = rawSrc
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/[^\n]*/g, '')

    // Identifiers explicitly imported from '#imports' in this file.
    const importedFromHash = new Set<string>()
    for (const m of src.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"]#imports['"]/g)) {
      for (const name of m[1].split(',')) {
        const cleaned = name.trim().split(/\s+as\s+/)[0].trim()
        if (cleaned) importedFromHash.add(cleaned)
      }
    }

    for (const id of NUXT_AUTOIMPORTS) {
      // Match the identifier followed by `(` so we only flag actual call
      // sites, not type-only string mentions.
      const callRe = new RegExp(`\\b${id}\\s*\\(`)
      if (!callRe.test(src)) continue

      it(`${rel} explicitly imports ${id} from '#imports'`, () => {
        expect(
          importedFromHash.has(id),
          `${rel} calls ${id}() but does NOT import it from '#imports'.\n` +
            `Auto-imports do not reach files inside node_modules — see the comment in ` +
            `runtime/pages/slug.vue for the full rationale.`,
        ).toBe(true)
      })
    }
  }
})
