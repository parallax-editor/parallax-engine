/**
 * Framework-agnostic head builder for parallax sites.
 *
 * Why this exists: `<ParallaxSite>` injects @font-face / Google Fonts <link>
 * tags imperatively on mount (works for SPA + editor). On SSR/SSG hosts
 * (Nuxt, Next, plain Vite SSR) the prerendered HTML never sees that path,
 * so fonts are absent until JS hydrates. This module exposes a pure helper
 * that turns `site.meta` into a unhead-compatible head config the consumer
 * can feed to whatever head abstraction it already uses:
 *
 *   import { buildSiteHead } from '@parallax-editor/parallax-engine'
 *   useHead(buildSiteHead(site.meta, { assetBase }))      // Nuxt / @unhead/vue
 *   // …or read `link`/`style` and map to the framework's own API.
 *
 * Pure: no Vue, no DOM, safe to call in Node SSR. Idempotent: same input →
 * byte-identical output (link/style entries carry stable `key` slots so
 * unhead/Nuxt dedupes them across navigations and the client-side DOM
 * injection inside ParallaxSite will skip anything SSR already added).
 */

import type { SiteMeta } from '../schema'
import { resolveAssetUrl } from './units'

export interface SiteHeadLink {
  key: string
  rel: string
  href: string
  /** Carried so the engine's runtime DOM dedupe (`[data-parallax-font="X"]`)
   *  can skip what SSR already inserted. */
  'data-parallax-font': string
}

export interface SiteHeadStyle {
  key: string
  textContent: string
  'data-parallax-font': string
}

export interface SiteHead {
  link: SiteHeadLink[]
  style: SiteHeadStyle[]
}

export interface BuildSiteHeadOptions {
  /** Mirrors `<ParallaxSite>`'s `assetBase` prop so custom-font URLs resolve
   *  against the same base whether the head is built SSR-side or runtime. */
  assetBase?: string
  /** Optional Google Fonts weight axis. The engine has always requested
   *  300;400;500;600;700 — kept as the default so existing deploys are
   *  byte-identical, but consumers can narrow it (perf) or widen it. */
  googleWeights?: string
}

const DEFAULT_GOOGLE_WEIGHTS = '300;400;500;600;700'

export function buildSiteHead(
  meta: SiteMeta,
  opts: BuildSiteHeadOptions = {},
): SiteHead {
  const link: SiteHeadLink[] = []
  const style: SiteHeadStyle[] = []
  const assetBase = opts.assetBase ?? ''
  const weights = opts.googleWeights || DEFAULT_GOOGLE_WEIGHTS
  const fonts = meta.fonts ?? []

  for (const font of fonts) {
    if (font.source === 'google') {
      link.push({
        key: `parallax-font-${font.family}`,
        rel: 'stylesheet',
        href: `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font.family)}:wght@${weights}&display=swap`,
        'data-parallax-font': font.family,
      })
    } else if (font.source === 'custom' && font.url) {
      style.push({
        key: `parallax-font-${font.family}`,
        textContent: `@font-face { font-family: '${font.family}'; src: url('${resolveAssetUrl(assetBase, font.url)}'); font-display: swap; }`,
        'data-parallax-font': font.family,
      })
    }
  }

  return { link, style }
}
