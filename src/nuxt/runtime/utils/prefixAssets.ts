/**
 * Asset path prefixing for a loaded `site.json`. Identical rule to the
 * existing consumers' composables (eventos `prefixAssetPaths`, site
 * `prefixAssetPaths`): a relative path like `images/foo.png` is rewritten to
 * `/content/<slug>/images/foo.png`; absolute / root-relative / data: URLs are
 * left untouched. Applied across `meta.ogImage`, `meta.favicon`,
 * `meta.fonts[].url` (custom-source only), and every `png/video/audio` element
 * `src/poster` in BOTH the legacy v1.0 sections tree AND the v1.1 views trees.
 *
 * Kept here (not in the engine core) because asset routing is a *consumer*
 * concern — the engine itself can run with a `prefixed` site OR with the
 * `assetBase` prop. The Nuxt module always pre-prefixes because the
 * prerendered HTML needs absolute URLs in `<meta og:image>` etc., and the
 * runtime fetch path lands in a place where the engine wouldn't know the
 * slug otherwise.
 */

import type { Site } from '../../../schema'
import { isRelativeAsset } from '../isRelativeAsset'

export function prefixAssetPaths(site: Site, slug: string): Site {
  const base = `/content/${slug}/`
  // Deep-clone so we never mutate what came in (could be a build-time import
  // that other code paths read again later).
  const copy: Site = JSON.parse(JSON.stringify(site))

  if (copy.meta.ogImage && isRelativeAsset(copy.meta.ogImage)) {
    copy.meta.ogImage = base + copy.meta.ogImage
  }
  if (copy.meta.favicon && isRelativeAsset(copy.meta.favicon)) {
    copy.meta.favicon = base + copy.meta.favicon
  }
  if (copy.meta.fonts) {
    for (const font of copy.meta.fonts) {
      if (font.source === 'custom' && font.url && isRelativeAsset(font.url)) {
        font.url = base + font.url
      }
    }
  }
  prefixSectionTree(copy.sections, base)
  if (copy.views) {
    prefixSectionTree(copy.views.desktop?.sections, base)
    prefixSectionTree(copy.views.mobile?.sections, base)
  }
  return copy
}

function prefixSectionTree(sections: Site['sections'] | undefined, base: string): void {
  if (!sections) return
  for (const section of sections) {
    for (const layer of section.layers || []) {
      for (const el of layer.elements || []) {
        if (el.type === 'png' && el.src && isRelativeAsset(el.src)) {
          el.src = base + el.src
        }
        if (el.type === 'gif' && el.src && isRelativeAsset(el.src)) {
          el.src = base + el.src
        }
        if (el.type === 'video') {
          if (el.src && isRelativeAsset(el.src)) el.src = base + el.src
          if (el.poster && isRelativeAsset(el.poster)) el.poster = base + el.poster
        }
        if (el.type === 'audio' && el.src && isRelativeAsset(el.src)) {
          el.src = base + el.src
        }
      }
    }
    // Image-type section backgrounds (v1.1) — the engine resolves these via
    // `assetBase` too, but the prerendered HTML benefits from concrete paths.
    if (section.background && (section.background as any).type === 'image') {
      const bg = section.background as { type: 'image'; value: string }
      if (bg.value && isRelativeAsset(bg.value)) {
        bg.value = base + bg.value
      }
    }
  }
}
