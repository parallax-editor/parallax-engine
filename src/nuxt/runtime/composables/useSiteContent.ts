/**
 * `loadSiteContent(slug)` + `useSiteContent(slug)`: dual-path loader for a
 * site.json. Single canonical implementation so consumers don't have to
 * roll their own per-repo, and so the SSR / runtime split stays consistent
 * across `multi-tenant` and `linked-home`.
 *
 *   • Server (`import.meta.server`):  read from disk with `node:fs`. This
 *     runs during prerender, where Nitro's `publicAssets` middleware doesn't
 *     answer its own internal `$fetch` calls, so we go straight to the source.
 *   • Client / dev SSR fetch:         hit `/content/<slug>/site.json` via
 *     `$fetch`, served by the same nitro publicAssets entry the module
 *     registered.
 *
 * Returns null and console.errors on schema-validation failure rather than
 * throwing — a single malformed slug should not nuke the navigation.
 */

import { validateSite, type Site } from '../../../schema'
import { prefixAssetPaths } from '../utils/prefixAssets'
// Explicit imports — see the comment in `runtime/pages/slug.vue` for the full
// rationale. tl;dr: when this composable is consumed from `node_modules`
// (i.e. a fresh `yarn install` of the published tarball), Nuxt's unimport
// transform skips the file and the would-be auto-imports are undefined at
// runtime. `yarn link` masks the bug because realpath resolves outside
// node_modules. Keep these explicit forever.
import { useAsyncData, useRuntimeConfig } from '#imports'

// `$fetch` is a real Nuxt global on globalThis (not an auto-import), so it
// works without an explicit import — declare it for TypeScript only.
declare const $fetch: (...args: any[]) => any

export async function loadSiteContent(slug: string): Promise<Site | null> {
  // Fail fast (and informatively) if someone imports this from outside a
  // Nuxt context — `useRuntimeConfig` / `$fetch` are auto-imports, undefined
  // anywhere else. Without this guard the user gets a downstream
  // "useRuntimeConfig is not defined" with no breadcrumb back to "you need
  // the Nuxt module installed".
  if (typeof useRuntimeConfig !== 'function') {
    throw new Error(
      '[parallax-engine/nuxt] loadSiteContent must run inside a Nuxt app. ' +
        'Did you import it directly instead of relying on auto-imports from the ' +
        '`@parallax-editor/parallax-engine/nuxt` module?',
    )
  }
  try {
    let json: unknown
    if (import.meta.server) {
      // Resolve content/ via runtimeConfig.public.parallax.contentDir, so
      // a consumer that uses a non-default folder name doesn't have to
      // re-wire the module. Fallback to 'content' for typing safety.
      const cfg = useRuntimeConfig()?.public?.parallax ?? {}
      const contentDir: string = cfg.contentDir || 'content'
      const { readFile } = await import('node:fs/promises')
      const { resolve } = await import('node:path')
      const path = resolve(process.cwd(), contentDir, slug, 'site.json')
      const text = await readFile(path, 'utf-8')
      json = JSON.parse(text)
    } else {
      json = await $fetch(`/content/${slug}/site.json`, { responseType: 'json' })
    }
    const result = validateSite(json)
    if (!result.ok) {
      console.error(`[parallax-engine/nuxt] Invalid site.json for "${slug}":`, result.errors)
      return null
    }
    return prefixAssetPaths(result.data, slug)
  } catch (e) {
    console.error(`[parallax-engine/nuxt] Failed to load site "${slug}":`, e)
    return null
  }
}

/**
 * Wrapper for the common page case: lazy-fetched ON THE CLIENT (server:false)
 * so the site.json body never ends up in the prerendered HTML. The page's
 * <head> SEO is built separately from the build-time SEO map (see
 * `useSiteSeo`), which gives social previews concrete OG tags without
 * shipping the engine tree in the HTML.
 *
 * For pages that DO need server-side data (the linked-home `/` route, where
 * the home is part of the prerendered HTML so SSR fonts work via
 * `buildSiteHead`), call `loadSiteContent(slug)` inside `useAsyncData` with
 * the default `server: true` instead.
 */
export function useSiteContent(slug: string) {
  return useAsyncData(`parallax-site-${slug}`, () => loadSiteContent(slug), {
    server: false,
  })
}
