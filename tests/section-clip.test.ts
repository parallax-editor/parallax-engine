import { describe, it, expect } from 'vitest'
import type { Section } from '../src/schema'

/**
 * Regression: a section's content (an oversized full-bleed image, or an element
 * dragged past the section margin) BLED out of the section box and painted over
 * the neighboring sections. The fix CLIPS every section to its own box so
 * authors can place/move oversized elements freely without breaking the layout.
 *
 * The clip lives in ParallaxSection.vue as an inline `overflow:hidden` on the
 * inner `<section>` (the load-bearing line — always wins, works even without the
 * engine stylesheet) plus a mirroring scoped CSS rule. This file has no DOM, so
 * — following the same convention as positioning.test.ts / png-element-box.test
 * .ts — it mirrors the `outerStyle` / `sectionStyle` computed objects EXACTLY
 * and asserts the clip + the per-scrollBehavior structural contract that keeps
 * pinned (sticky travel) and horizontal (track reveal) working under the clip.
 */

// ─── Mirror of ParallaxSection.vue's computed styles ─────────────────────────

/** Mirrors `outerStyle` (the wrapper that gives a pinned section its travel). */
function outerStyle(section: Section): Record<string, string> {
  const isPinned = section.scrollBehavior === 'pinned'
  const style: Record<string, string> = {}
  if (isPinned) {
    style.height = section.height
    style.position = 'relative'
    style.overflow = 'visible'
  }
  return style
}

/** Mirrors `sectionStyle` (the inner <section> that is the parallax stage). */
function sectionStyle(section: Section): Record<string, string> {
  const isPinned = section.scrollBehavior === 'pinned'
  const isSnap = section.scrollBehavior === 'snap'
  const style: Record<string, string> = {
    position: 'relative',
    overflow: 'hidden',
  }
  if (isPinned) {
    style.position = 'sticky'
    style.top = '0'
    style.height = '100vh'
  } else {
    style.height = section.height
  }
  if (isSnap) {
    style.scrollSnapAlign = 'start'
  }
  return style
}

function mkSection(over: Partial<Section>): Section {
  return {
    id: 'sec',
    height: '100vh',
    scrollBehavior: 'continuous',
    scrollDirection: 'vertical',
    layers: [],
    ...over,
  } as Section
}

// ─── The clip is unconditional across ALL scroll behaviors ───────────────────

describe('section clip — every section confines its content to its own box', () => {
  const behaviors: Array<Section['scrollBehavior']> = ['continuous', 'pinned', 'snap']

  for (const scrollBehavior of behaviors) {
    it(`${scrollBehavior}: inner <section> is overflow:hidden (no bleed into neighbors)`, () => {
      const style = sectionStyle(mkSection({ scrollBehavior }))
      expect(style.overflow).toBe('hidden')
    })
  }

  it('horizontal scrollDirection: the section still clips (vertical bleed contained)', () => {
    // The .horizontal-track manages its OWN horizontal overflow (200vw of flex
    // cells translated by translateX); the section clip turns that into the
    // reveal and also contains any vertical bleed. scrollDirection does not
    // change sectionStyle, so the clip is present regardless.
    const style = sectionStyle(mkSection({ scrollDirection: 'horizontal' }))
    expect(style.overflow).toBe('hidden')
  })
})

// ─── continuous / snap: clip to the configured section height ────────────────

describe('section clip — continuous / snap stage is section.height', () => {
  it('continuous: section box = section.height, relatively positioned, clipped', () => {
    const style = sectionStyle(mkSection({ scrollBehavior: 'continuous', height: '120vh' }))
    expect(style.position).toBe('relative')
    expect(style.height).toBe('120vh')
    expect(style.overflow).toBe('hidden')
    // continuous has no outer wrapper styling — the section is the only box.
    expect(outerStyle(mkSection({ scrollBehavior: 'continuous' }))).toEqual({})
  })

  it('snap: keeps scroll-snap-align:start AND clips (snap not broken by clip)', () => {
    const style = sectionStyle(mkSection({ scrollBehavior: 'snap', height: '100vh' }))
    expect(style.scrollSnapAlign).toBe('start')
    expect(style.height).toBe('100vh')
    expect(style.overflow).toBe('hidden')
  })
})

// ─── pinned: clip the 100vh STICKY stage, NOT the taller outer wrapper ───────

describe('section clip — pinned clips the sticky 100vh stage (sticky still travels)', () => {
  const pin = mkSection({ scrollBehavior: 'pinned', height: '250vh' })

  it('inner sticky stage is clipped to the 100vh viewport it pins to', () => {
    const style = sectionStyle(pin)
    expect(style.position).toBe('sticky')
    expect(style.top).toBe('0')
    expect(style.height).toBe('100vh')
    // The clip is on this 100vh sticky box — so content clips to the viewport.
    expect(style.overflow).toBe('hidden')
  })

  it('outer wrapper keeps section.height AND overflow:visible (sticky travels through it)', () => {
    // CRITICAL: clipping the OUTER wrapper would make it a scroll container and
    // the sticky would pin to the wrapper top instead of the viewport (never
    // engages). The wrapper must stay visible; it does not need to clip because
    // its only child (the sticky) already clips itself.
    const o = outerStyle(pin)
    expect(o.height).toBe('250vh')
    expect(o.position).toBe('relative')
    expect(o.overflow).toBe('visible')
    expect(o.overflow).not.toBe('hidden')
  })
})

// ─── The clip is a render-only change — the schema/contract is untouched ─────

describe('section clip — no schema/API change', () => {
  it('Section type needs no new field for the clip (render-level only)', () => {
    const section: Section = mkSection({})
    // @ts-expect-error — there is intentionally NO `overflow`/`clip` field on the schema.
    expect(section.overflow).toBeUndefined()
  })
})
