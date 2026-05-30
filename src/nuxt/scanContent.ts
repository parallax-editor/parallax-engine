/**
 * Build-time discovery of sites. Used by the module to (a) feed
 * `nitro.prerender.routes`, (b) build the SEO map for `linked-home`, and (c)
 * emit `sitemap.xml`. Pure: no Nuxt/Nitro imports, just `fs` — so it's safe
 * to invoke from `setup()` before kit is fully wired.
 */

import { existsSync, readdirSync, readFileSync, statSync, type Dirent } from 'node:fs'
import { resolve } from 'node:path'
import type { SiteSeoMap } from './types'
import { isRelativeAsset } from './runtime/isRelativeAsset'

/**
 * Returns the slugs (folder names) that have a `site.json`, in their natural
 * directory order. Excludes `homeSlug` when provided — useful for
 * `linked-home`, where home is rendered at `/`, not `/home`.
 */
export function listSiteSlugs(contentRoot: string, homeSlug?: string): string[] {
  if (!existsSync(contentRoot)) return []
  // `withFileTypes: true` + `encoding: 'utf-8'` pins the overload to the
  // string-Dirent variant. Without `encoding`, recent @types/node default to
  // the buffer variant whose `.name` is a `NonSharedBuffer`, which would
  // poison every downstream comparison.
  let entries: Dirent[]
  try {
    entries = readdirSync(contentRoot, { withFileTypes: true, encoding: 'utf-8' })
  } catch {
    return []
  }
  return entries
    .filter((d) => {
      if (!d.isDirectory()) return false
      if (homeSlug && d.name === homeSlug) return false
      return existsSync(resolve(contentRoot, d.name, 'site.json'))
    })
    .map((d) => d.name)
}

/**
 * True iff `<contentRoot>/<homeSlug>/site.json` exists. Lets the module
 * conditionally register the `/` route — a `linked-home` consumer may have
 * not yet created the home (build still succeeds, `/` 404s).
 */
export function hasHomeSlug(contentRoot: string, homeSlug: string): boolean {
  const p = resolve(contentRoot, homeSlug, 'site.json')
  try {
    return existsSync(p) && statSync(p).isFile()
  } catch {
    return false
  }
}

/**
 * Build the SEO snapshot map for every (non-home) slug. Reads each
 * `site.json` with `fs` and extracts ONLY the `meta` subset
 * (title/description/ogImage/lang) — never the sections tree, never anything
 * else. The full body stays a runtime fetch via `useSiteContent`.
 *
 * `ogImage` is normalised to a root-relative URL (`/content/<slug>/<rel>`)
 * when the author wrote a relative path; absolute / root-relative / data:
 * URLs are kept verbatim. Same rule as the runtime asset prefixer — so the
 * baked `<meta property="og:image">` is a valid absolute URL when combined
 * with `siteUrl`.
 *
 * Silent on per-file failures: a single corrupted `site.json` skips that
 * slug but doesn't break the others. The full schema validation happens in
 * `useSiteContent` at runtime, where errors can surface to the consumer.
 */
export function buildSeoMap(contentRoot: string, slugs: string[]): SiteSeoMap {
  const out: SiteSeoMap = {}
  for (const slug of slugs) {
    try {
      const raw = JSON.parse(readFileSync(resolve(contentRoot, slug, 'site.json'), 'utf-8'))
      const meta = raw?.meta ?? {}
      const ogImage: string | undefined = meta.ogImage
      out[slug] = {
        title: meta.title || slug,
        description: meta.description,
        ogImage: normaliseOgImage(slug, ogImage),
        lang: meta.lang,
      }
    } catch (e) {
      // Don't break the build for one bad file — runtime validation will
      // surface schema errors on visit — but DO log so the slug's silent
      // disappearance from the seoMap (and from sitemap.xml when enabled)
      // shows up in the build output. Otherwise a stray trailing comma in
      // a `meta` block silently erases the OG image and no one notices.
      console.warn(
        `[parallax-engine/nuxt] skipping "${slug}" in seoMap (site.json read/parse failed):`,
        e instanceof Error ? e.message : e,
      )
    }
  }
  return out
}

function normaliseOgImage(slug: string, og: string | undefined): string | undefined {
  if (!og) return undefined
  // Relative author input → prefix with /content/<slug>/ so the
  // baked-into-HTML <meta og:image> resolves where the asset actually lives.
  // Absolute / root-relative / data: URLs are left as-is.
  return isRelativeAsset(og) ? `/content/${slug}/${og}` : og
}
