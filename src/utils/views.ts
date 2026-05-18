/**
 * Views resolver + migration helper (schema v1.1)
 *
 * v1.0 (legacy): a single shared `site.sections` tree; per-element
 * `mobile`/`desktop` overrides differentiate viewports at render time
 * (handled by `useResponsive` / `mergeResponsiveOverrides`).
 *
 * v1.1: a site MAY instead carry `site.views` — two complete, independent
 * section trees (`desktop` required, `mobile` optional). The two trees are
 * fully independent; NO per-element override merging is applied on this path.
 *
 * Both models stay valid forever. These helpers are the canonical bridge:
 *  - `resolveSections(site, viewport)` → the Section[] the engine should render.
 *  - `toViews(site)` → opt-in migration that "splits" a legacy doc into two
 *    real trees (mobile = legacy sections with element overrides flattened).
 */

import type { Section, Site } from '../schema'

export type Viewport = 'desktop' | 'mobile'

/**
 * Canonical section resolver. Never throws.
 *
 * - `site.views` present:
 *     - `desktop` → `site.views.desktop.sections`
 *     - `mobile`  → `site.views.mobile?.sections ?? site.views.desktop.sections`
 *       (mobile falls back to desktop when the mobile tree is absent)
 * - legacy (`site.views` absent): BOTH viewports → `site.sections`. The engine's
 *   existing per-element `mobile`/`desktop` override behavior continues to apply
 *   downstream on this legacy path exactly as before — this function does not
 *   touch it.
 * - Nothing resolvable → `[]` (engine empty/error policy takes over).
 */
export function resolveSections(
  site: Site | null | undefined,
  viewport: Viewport,
): Section[] {
  if (!site) return []

  if (site.views) {
    if (viewport === 'mobile') {
      return site.views.mobile?.sections ?? site.views.desktop?.sections ?? []
    }
    return site.views.desktop?.sections ?? []
  }

  // Legacy path: shared tree for both viewports. Per-element responsive
  // override resolution stays exactly where it was (useResponsive).
  return site.sections ?? []
}

// ─── Migration helper ──────────────────────────────────────────────────────────

/** Keys an element-level `mobile`/`desktop` override block may carry. */
const OVERRIDE_KEYS = [
  'position',
  'size',
  'anchor',
  'opacity',
  'rotation',
  'visible',
  'fontSize',
  'fontWeight',
  'color',
  'letterSpacing',
  'lineHeight',
] as const

/**
 * Flattens an element's legacy `mobile` override onto the element, producing a
 * NEW element (input untouched). Mirrors `mergeResponsiveOverrides` semantics:
 * present override keys win; nested objects (position/size) are replaced whole;
 * `mobile`/`desktop` blocks are dropped from the flattened result (the views
 * path does not use them). `id` and every other field are preserved.
 */
function flattenMobile<T extends Record<string, any>>(element: T): T {
  const out: Record<string, any> = { ...element }
  const ov = element.mobile as Record<string, any> | undefined
  if (ov) {
    for (const key of OVERRIDE_KEYS) {
      if (ov[key] !== undefined) out[key] = ov[key]
    }
  }
  delete out.mobile
  delete out.desktop
  return out as T
}

function mapSectionsFlattened(sections: Section[]): Section[] {
  return sections.map((section) => ({
    ...section,
    layers: section.layers.map((layer) => ({
      ...layer,
      elements: layer.elements.map((el) => flattenMobile(el)),
    })),
  }))
}

/**
 * Opt-in migration for the editor / consumers. Pure, deterministic, no mutation
 * of `site`, ids preserved.
 *
 * - If `site.views` already exists → returns a structural deep clone unchanged
 *   (idempotent; never re-migrates).
 * - Else → returns a site whose `views.desktop.sections` is the legacy sections
 *   verbatim, and `views.mobile.sections` is a deep clone of the legacy sections
 *   with each element's legacy `mobile` override applied/flattened (so the two
 *   trees are genuinely independent and the author can diverge them freely).
 *
 * The original legacy `sections` is left intact on the returned site for maximum
 * backward-compat; consumers/editor should prefer `resolveSections` regardless.
 */
export function toViews(site: Site): Site {
  const copy: Site = JSON.parse(JSON.stringify(site))

  if (copy.views) return copy

  const legacy = copy.sections ?? []
  copy.views = {
    desktop: { sections: JSON.parse(JSON.stringify(legacy)) as Section[] },
    mobile: { sections: mapSectionsFlattened(legacy) },
  }

  return copy
}
