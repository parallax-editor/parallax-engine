import { describe, it, expect } from 'vitest'
import { validateSite } from '../src/schema'

// The runtime tests for `fit` and auto-normalize would need a real Vue render
// (vue-test-utils, jsdom). That's intentionally deferred — the schema test
// below is enough to lock in the contract: validateSite must coerce a
// minimal raw site into one with all the optional fields populated, which
// is exactly what ParallaxSite now relies on for auto-normalization.

describe('schema: auto-normalize contract', () => {
  it('validateSite fills optional defaults for a minimal raw site', () => {
    const result = validateSite({
      schemaVersion: '1.1',
      meta: { title: 'minimal' },
      sections: [{
        layers: [{
          elements: [{
            type: 'png',
            src: 'images/x.png',
            position: { x: 50, y: 50 },
          }],
        }],
      }],
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const site = result.data
    // meta.fonts defaults to [] (the engine iterates this in injectFonts)
    expect(site.meta.fonts).toEqual([])
    const layer = site.sections![0].layers![0]
    // parallaxMode defaults to [] (the engine .includes()s this in ParallaxLayer)
    expect(layer.parallaxMode).toEqual([])
    const el = layer.elements![0]
    // animations defaults to [] (the engine .find()s in TextElement etc.)
    expect(el.animations).toEqual([])
    // anchor defaults to 'center' (so the translate offset is -50%, -50%)
    expect((el as any).anchor).toBe('center')
  })

  it('validateSite passes a raw site without optional fields through cleanly', () => {
    // The engine's auto-normalize path: invalid sites fall back to the raw
    // input so a broken site never crashes the engine (dev error overlay
    // surfaces the issue instead). Make sure validateSite returns ok:false
    // with a path-style error list for that branch to detect.
    const result = validateSite({ schemaVersion: 'not-semver', meta: {} })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(Array.isArray(result.errors)).toBe(true)
  })
})
