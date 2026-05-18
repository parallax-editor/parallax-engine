import { describe, it, expect } from 'vitest'
import {
  validateSite,
  siteSchema,
  SCHEMA_VERSION,
  type Site,
} from '../src/schema'
import { resolveSections, toViews } from '../src/utils/views'
import { mergeResponsiveOverrides } from '../src/composables/useResponsive'

// ─── Fixtures ──────────────────────────────────────────────────────────────────

/** Legacy doc: root `sections` + per-element mobile/desktop overrides. */
function legacyDoc(): Record<string, unknown> {
  return {
    schemaVersion: '1.0',
    meta: { title: 'Legacy' },
    sections: [{
      id: 'hero',
      layers: [{
        id: 'l1',
        elements: [{
          type: 'text',
          id: 'title',
          content: 'Hola',
          position: { x: 50, y: 50 },
          fontSize: '64px',
          opacity: 1,
          mobile: { fontSize: '28px', opacity: 0.8 },
          desktop: { position: { x: 40, y: 20 } },
        }],
      }],
    }],
  }
}

/** Views doc: independent desktop + mobile trees. */
function viewsDoc(): Record<string, unknown> {
  return {
    schemaVersion: '1.1',
    meta: { title: 'Views' },
    views: {
      desktop: {
        sections: [{
          id: 'd-hero',
          layers: [{ id: 'd-l', elements: [{ type: 'text', id: 'd-t', content: 'Desktop', position: { x: 50, y: 50 } }] }],
        }],
      },
      mobile: {
        sections: [{
          id: 'm-hero',
          layers: [{ id: 'm-l', elements: [{ type: 'text', id: 'm-t', content: 'Mobile', position: { x: 50, y: 60 } }] }],
        }],
      },
    },
  }
}

/** Views doc with NO mobile tree (mobile must fall back to desktop). */
function viewsDocDesktopOnly(): Record<string, unknown> {
  return {
    schemaVersion: '1.1',
    meta: { title: 'Views desktop-only' },
    views: {
      desktop: {
        sections: [{
          id: 'd-hero',
          layers: [{ id: 'd-l', elements: [{ type: 'text', id: 'd-t', content: 'Desktop', position: { x: 50, y: 50 } }] }],
        }],
      },
    },
  }
}

// ─── Version ───────────────────────────────────────────────────────────────────

describe('SCHEMA_VERSION (v1.1)', () => {
  it('is 1.1', () => {
    expect(SCHEMA_VERSION).toBe('1.1')
  })
})

// ─── (d) Both 1.0 and 1.1 validate ─────────────────────────────────────────────

describe('schemaVersion compatibility', () => {
  it('accepts schemaVersion 1.0 (legacy content, never rejected)', () => {
    const r = validateSite(legacyDoc())
    expect(r.ok).toBe(true)
  })

  it('accepts schemaVersion 1.1', () => {
    const r = validateSite({ ...legacyDoc(), schemaVersion: '1.1' })
    expect(r.ok).toBe(true)
  })

  it('accepts a 1.0 doc that uses the new views path', () => {
    const r = validateSite({ ...viewsDoc(), schemaVersion: '1.0' })
    expect(r.ok).toBe(true)
  })

  it('accepts a 1.1 doc that uses the legacy sections path', () => {
    const r = validateSite({ ...legacyDoc(), schemaVersion: '1.1' })
    expect(r.ok).toBe(true)
  })
})

// ─── Schema: views shape ───────────────────────────────────────────────────────

describe('views schema', () => {
  it('validates a views doc with desktop + mobile', () => {
    expect(validateSite(viewsDoc()).ok).toBe(true)
  })

  it('validates a views doc with desktop only (mobile optional)', () => {
    expect(validateSite(viewsDocDesktopOnly()).ok).toBe(true)
  })

  it('rejects views without desktop', () => {
    const r = validateSite({
      schemaVersion: '1.1',
      meta: { title: 'Bad' },
      views: { mobile: { sections: [] } },
    })
    expect(r.ok).toBe(false)
  })

  it('a doc with neither sections content nor views still validates (legacy empty stays valid)', () => {
    const r = validateSite({ schemaVersion: '1.0', meta: { title: 'Empty' }, sections: [] })
    expect(r.ok).toBe(true)
  })

  it('legacy `sections` and `views` may coexist', () => {
    const r = validateSite({ ...legacyDoc(), ...viewsDoc(), schemaVersion: '1.1' })
    expect(r.ok).toBe(true)
  })
})

// ─── (a) Legacy path: resolveSections + overrides unchanged ────────────────────

describe('resolveSections — legacy path', () => {
  it('returns the legacy sections for BOTH viewports (same reference tree)', () => {
    const site = siteSchema.parse(legacyDoc()) as Site
    const desktop = resolveSections(site, 'desktop')
    const mobile = resolveSections(site, 'mobile')
    expect(desktop).toBe(site.sections)
    expect(mobile).toBe(site.sections)
    expect(desktop).toEqual(mobile)
  })

  it('per-element mobile/desktop overrides still apply via existing logic', () => {
    const site = siteSchema.parse(legacyDoc()) as Site
    const el = resolveSections(site, 'mobile')[0].layers[0].elements[0] as any
    const m = mergeResponsiveOverrides(el, 'mobile')
    const d = mergeResponsiveOverrides(el, 'desktop')
    expect(m.fontSize).toBe('28px')
    expect(m.opacity).toBe(0.8)
    expect(d.position).toEqual({ x: 40, y: 20 })
    // base element untouched
    expect(el.fontSize).toBe('64px')
  })
})

// ─── (b) Views path: desktop/mobile + fallback ─────────────────────────────────

describe('resolveSections — views path', () => {
  it('desktop returns the desktop tree', () => {
    const site = siteSchema.parse(viewsDoc()) as Site
    const s = resolveSections(site, 'desktop')
    expect(s[0].id).toBe('d-hero')
    expect((s[0].layers[0].elements[0] as any).content).toBe('Desktop')
  })

  it('mobile returns the mobile tree', () => {
    const site = siteSchema.parse(viewsDoc()) as Site
    const s = resolveSections(site, 'mobile')
    expect(s[0].id).toBe('m-hero')
    expect((s[0].layers[0].elements[0] as any).content).toBe('Mobile')
  })

  it('mobile falls back to desktop when mobile tree is absent', () => {
    const site = siteSchema.parse(viewsDocDesktopOnly()) as Site
    const s = resolveSections(site, 'mobile')
    expect(s[0].id).toBe('d-hero')
    expect(s).toBe(site.views!.desktop.sections)
  })

  it('never throws; returns [] when nothing resolvable', () => {
    expect(resolveSections(null, 'desktop')).toEqual([])
    expect(resolveSections(undefined as any, 'mobile')).toEqual([])
    expect(resolveSections({} as any, 'desktop')).toEqual([])
  })
})

// ─── (c) toViews migration ─────────────────────────────────────────────────────

describe('toViews — opt-in migration', () => {
  it('splits a legacy doc into independent desktop + mobile trees', () => {
    const site = siteSchema.parse(legacyDoc()) as Site
    const migrated = toViews(site)
    expect(migrated.views).toBeDefined()
    expect(migrated.views!.desktop.sections).toBeDefined()
    expect(migrated.views!.mobile).toBeDefined()
  })

  it('desktop tree preserves legacy sections verbatim (ids preserved)', () => {
    const site = siteSchema.parse(legacyDoc()) as Site
    const migrated = toViews(site)
    const d = migrated.views!.desktop.sections
    expect(d[0].id).toBe('hero')
    expect(d[0].layers[0].id).toBe('l1')
    expect(d[0].layers[0].elements[0].id).toBe('title')
    expect((d[0].layers[0].elements[0] as any).fontSize).toBe('64px')
  })

  it('mobile tree flattens each element mobile override, drops override blocks, keeps ids', () => {
    const site = siteSchema.parse(legacyDoc()) as Site
    const migrated = toViews(site)
    const mEl = migrated.views!.mobile!.sections[0].layers[0].elements[0] as any
    expect(mEl.id).toBe('title')
    expect(mEl.fontSize).toBe('28px') // mobile override flattened in
    expect(mEl.opacity).toBe(0.8)
    expect(mEl.content).toBe('Hola') // preserved
    expect(mEl.mobile).toBeUndefined() // override block dropped
    expect(mEl.desktop).toBeUndefined()
  })

  it('is pure — does not mutate input', () => {
    const site = siteSchema.parse(legacyDoc()) as Site
    const snapshot = JSON.parse(JSON.stringify(site))
    toViews(site)
    expect(site).toEqual(snapshot)
  })

  it('is deterministic — same input yields equal output', () => {
    const site = siteSchema.parse(legacyDoc()) as Site
    expect(toViews(site)).toEqual(toViews(site))
  })

  it('the two trees are independent (mutating one does not affect the other)', () => {
    const site = siteSchema.parse(legacyDoc()) as Site
    const migrated = toViews(site)
    ;(migrated.views!.mobile!.sections[0].layers[0].elements[0] as any).content = 'CHANGED'
    expect((migrated.views!.desktop.sections[0].layers[0].elements[0] as any).content).toBe('Hola')
  })

  it('is idempotent — never re-migrates a doc that already has views', () => {
    const site = siteSchema.parse(viewsDoc()) as Site
    const r = toViews(site)
    expect(r.views!.desktop.sections[0].id).toBe('d-hero')
    expect(r.views!.mobile!.sections[0].id).toBe('m-hero')
    // resolve still works after idempotent pass-through
    expect(resolveSections(r, 'mobile')[0].id).toBe('m-hero')
  })

  it('migrated doc validates and resolves per viewport', () => {
    const site = siteSchema.parse(legacyDoc()) as Site
    const migrated = toViews(site)
    expect(validateSite(migrated).ok).toBe(true)
    expect(resolveSections(migrated, 'desktop')[0].id).toBe('hero')
    expect((resolveSections(migrated, 'mobile')[0].layers[0].elements[0] as any).fontSize).toBe('28px')
  })
})
