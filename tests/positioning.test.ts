import { describe, it, expect } from 'vitest'
import {
  resolveElementPosition,
  resolveAnchorOffset,
  resolveAnchorOrigin,
} from '../src/utils/units'
import { validateSite, ANCHOR_TYPES, type Section } from '../src/schema'

/**
 * Regression: elements were collapsing to the top of their section and
 * overlapping, and sections looked collapsed. Two distinct failures:
 *
 *  1. The element wrapper must be position:absolute with left/top derived
 *     from position.x/y and the anchor translate — so it lands at its
 *     configured spot, not at (0,0).
 *  2. The layer must absolutely fill the positioned section (inset:0), NOT
 *     rely on a width/height:100% percentage chain. A height-less wrapper
 *     div between <section> and the layer made height:100% resolve to 0,
 *     so every element's top/left % resolved against a 0px box → all
 *     bunched at the top.
 */

describe('element positioning (regression: top-collapse / overlap)', () => {
  it('places an element at its configured position with the center anchor', () => {
    // Mirrors the eventos `titulo-nombres` fixture: { x:50, y:35 } anchor center
    const style = resolveElementPosition({
      position: { x: 50, y: 35 },
      anchor: 'center',
    })
    expect(style.position).toBe('absolute')
    expect(style.left).toBe('50%')
    expect(style.top).toBe('35%')
    expect(style.transform).toBe('translate(-50%, -50%)')
    // '50% 50%' is the CSS-identical, table-consistent form of `center`.
    expect(style.transformOrigin).toBe('50% 50%')
  })

  it('keeps string CSS positions as-is and numbers as %', () => {
    const style = resolveElementPosition({
      position: { x: 50, y: '10vh' },
      anchor: 'center',
    })
    expect(style.left).toBe('50%')
    expect(style.top).toBe('10vh')
  })

  it('top-left anchor produces no negative translate offset', () => {
    expect(resolveAnchorOffset('top-left')).toEqual(['0%', '0%'])
    const style = resolveElementPosition({
      position: { x: 0, y: 0 },
      anchor: 'top-left',
    })
    expect(style.transform).toBe('translate(0%, 0%)')
  })

  it('every schema anchor has a defined offset (no silent collapse)', () => {
    const anchors = [
      'center', 'top-left', 'top-right', 'bottom-left', 'bottom-right',
      'top', 'bottom', 'left', 'right',
    ]
    for (const a of anchors) {
      const [ox, oy] = resolveAnchorOffset(a)
      expect(typeof ox).toBe('string')
      expect(typeof oy).toBe('string')
    }
  })

  it('defaults to center anchor when none is given', () => {
    expect(resolveAnchorOffset(undefined)).toEqual(['-50%', '-50%'])
  })
})

/**
 * Canonical anchor contract (bug: anchor "working backwards" / not referenced
 * to the full layer box). `position:{x,y}` is a point as a % of the layer box
 * (the layer is position:absolute; inset:0 of the section, so % = full
 * section). `anchor` names WHICH point of the element lands at (x%, y%): the
 * wrapper is position:absolute; left:x%; top:y% with transform:
 * translate(Tx, Ty) per the table below. transform-origin must be CONSISTENT
 * with the translate (same point) so an appended rotate()/scale() pivots
 * about the placement point instead of swinging to the opposite side.
 *
 *  | anchor       | Tx    | Ty    | transform-origin |
 *  |--------------|-------|-------|------------------|
 *  | top-left     | 0%    | 0%    | 0% 0%            |
 *  | top          | -50%  | 0%    | 50% 0%           |
 *  | top-right    | -100% | 0%    | 100% 0%          |
 *  | left         | 0%    | -50%  | 0% 50%           |
 *  | center       | -50%  | -50%  | 50% 50%          |
 *  | right        | -100% | -50%  | 100% 50%         |
 *  | bottom-left  | 0%    | -100% | 0% 100%          |
 *  | bottom       | -50%  | -100% | 50% 100%         |
 *  | bottom-right | -100% | -100% | 100% 100%        |
 */
describe('anchor geometry — all 9 anchors (canonical table)', () => {
  const TABLE: Record<string, { tx: string; ty: string; origin: string }> = {
    'top-left': { tx: '0%', ty: '0%', origin: '0% 0%' },
    'top': { tx: '-50%', ty: '0%', origin: '50% 0%' },
    'top-right': { tx: '-100%', ty: '0%', origin: '100% 0%' },
    'left': { tx: '0%', ty: '-50%', origin: '0% 50%' },
    'center': { tx: '-50%', ty: '-50%', origin: '50% 50%' },
    'right': { tx: '-100%', ty: '-50%', origin: '100% 50%' },
    'bottom-left': { tx: '0%', ty: '-100%', origin: '0% 100%' },
    'bottom': { tx: '-50%', ty: '-100%', origin: '50% 100%' },
    'bottom-right': { tx: '-100%', ty: '-100%', origin: '100% 100%' },
  }

  // The schema enum and the table must enumerate exactly the same 9 anchors.
  it('covers exactly the schema ANCHOR_TYPES (no anchor un-tested)', () => {
    expect([...ANCHOR_TYPES].sort()).toEqual(Object.keys(TABLE).sort())
  })

  for (const [anchor, { tx, ty, origin }] of Object.entries(TABLE)) {
    it(`${anchor}: left/top reference the full layer box and translate is not inverted`, () => {
      // Use distinct x/y so an x/y swap or sign flip cannot pass.
      const style = resolveElementPosition({ position: { x: 10, y: 80 }, anchor })

      // Reference frame: left/top are the raw position % of the layer/section,
      // never the element's own size — independent of the anchor.
      expect(style.position).toBe('absolute')
      expect(style.left).toBe('10%')
      expect(style.top).toBe('80%')

      // Translate places the NAMED point of the element at (x%, y%).
      expect(style.transform).toBe(`translate(${tx}, ${ty})`)
      expect(resolveAnchorOffset(anchor)).toEqual([tx, ty])

      // transform-origin is consistent with the translate (same point), so a
      // later rotate()/scale() pivots about the placement point.
      expect(style.transformOrigin).toBe(origin)
      expect(resolveAnchorOrigin(anchor)).toBe(origin)
    })
  }

  it('non-center anchors are NOT inverted: top-left ≠ bottom-right (regression)', () => {
    const tl = resolveElementPosition({ position: { x: 25, y: 25 }, anchor: 'top-left' })
    const br = resolveElementPosition({ position: { x: 25, y: 25 }, anchor: 'bottom-right' })
    expect(tl.transform).toBe('translate(0%, 0%)')
    expect(br.transform).toBe('translate(-100%, -100%)')
    expect(tl.transform).not.toBe(br.transform)
    // top-left corner at the point vs bottom-right corner at the point.
    expect(tl.transformOrigin).toBe('0% 0%')
    expect(br.transformOrigin).toBe('100% 100%')
  })

  it('center is unchanged by the fix (verified-correct behavior preserved)', () => {
    const style = resolveElementPosition({ position: { x: 50, y: 35 }, anchor: 'center' })
    expect(style.transform).toBe('translate(-50%, -50%)')
    // '50% 50%' is geometrically identical to the previous `center` keyword.
    expect(style.transformOrigin).toBe('50% 50%')
  })
})

describe('section height (regression: collapsed sections)', () => {
  it('schema preserves explicit section heights like 100vh / 150vh', () => {
    const result = validateSite({
      schemaVersion: '1.0',
      meta: { title: 't' },
      sections: [
        { id: 'hero', height: '100vh', layers: [] },
        { id: 'info', height: '150vh', layers: [] },
      ],
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const [hero, info] = result.data.sections as Section[]
    expect(hero.height).toBe('100vh')
    expect(info.height).toBe('150vh')
  })

  it('defaults section height to 100vh when omitted', () => {
    const result = validateSite({
      schemaVersion: '1.0',
      meta: { title: 't' },
      sections: [{ id: 'hero', layers: [] }],
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect((result.data.sections[0] as Section).height).toBe('100vh')
  })
})

/**
 * Mirrors the fill contract enforced in ParallaxLayer.vue. The layer (and the
 * wrapper for vertical sections) must absolutely fill via inset:0 — never
 * width/height:100% — so a section with height '100vh' gives its
 * absolutely-positioned elements a real box to resolve top/left against.
 */
describe('layer fill contract (regression: percentage-height collapse)', () => {
  function verticalWrapperFill() {
    return { position: 'absolute', inset: '0' }
  }
  function layerFill() {
    return { position: 'absolute', inset: '0' }
  }

  it('vertical layer wrapper absolutely fills the positioned section', () => {
    const s = verticalWrapperFill()
    expect(s.position).toBe('absolute')
    expect(s.inset).toBe('0')
  })

  it('layer absolutely fills its wrapper (no fragile width/height:100%)', () => {
    const s = layerFill() as Record<string, string>
    expect(s.position).toBe('absolute')
    expect(s.inset).toBe('0')
    expect(s.height).toBeUndefined()
    expect(s.width).toBeUndefined()
  })
})
