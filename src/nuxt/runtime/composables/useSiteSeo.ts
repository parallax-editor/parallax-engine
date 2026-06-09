/**
 * Per-slug SEO lookup against the build-time map the module bakes into
 * `runtimeConfig.public.parallax.seoMap`. Returns `null` when the slug isn't
 * in the snapshot — that's the "new site on S3 since last build" case, and
 * pages should fall back to a generic OG.
 *
 * The body of each site stays a runtime fetch — only `meta` ships in the
 * prerendered HTML, so social previews and search engines see real OG tags
 * while the engine tree stays out of the static bundle.
 */

import type { SiteSeoMap } from '../../types'
// Explicit import — see `runtime/pages/slug.vue` for the full rationale.
// Auto-imports don't reach files inside `node_modules`, so we ship the real
// import even though the composable is technically Nuxt-auto-importable for
// consumers.
import { useRuntimeConfig } from '#imports'

export interface SiteSeo {
  title: string
  description?: string
  ogImage?: string
  lang?: string
}

export function useSiteSeo(slug: string): SiteSeo | null {
  const map = (useRuntimeConfig()?.public?.parallax?.seoMap || {}) as SiteSeoMap
  const entry = map[slug]
  return entry ? { ...entry } : null
}

/** Build a full absolute URL from the configured `siteUrl` + a path. Returns
 *  the path unchanged when `siteUrl` is empty (relative-only deploys). Used
 *  by the runtime pages to emit `<meta og:url>` / canonical correctly. */
export function buildCanonical(path: string): string {
  const cfg = useRuntimeConfig()?.public?.parallax || {}
  const siteUrl: string = cfg.siteUrl || ''
  if (!siteUrl) return path
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  return siteUrl + (path.startsWith('/') ? path : `/${path}`)
}
