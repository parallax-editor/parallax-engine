import { describe, it, expect } from 'vitest'
import {
  resolveElementPosition,
  resolveUnit,
  resolveAnchorObjectPosition,
  resolveAnchorOffset,
  ANCHOR_OFFSETS,
} from '../src/utils/units'
import { ANCHOR_TYPES, type PngElement } from '../src/schema'

/**
 * Regression: a `png` intended as a FULL-BLEED background of its layer/section
 * (position {x:0,y:0}, size {width:100,height:100} i.e. 100%×100%, anchor
 * top-left) did NOT cover its layer. The element is rendered as a bare <img>;
 * with an explicit width AND height a replaced element defaults to
 * object-fit:fill (the photo is STRETCHED/distorted to the box), and with only
 * one axis sized it keeps its intrinsic aspect ratio (LETTERBOXES / overflows
 * — never covers). Either way a sized png never produced a clean full-bleed
 * background, and the anchor translate then shifted the wrong-shaped box, so
 * "the anchor on images behaved weird".
 *
 * Fix: PngElement.vue defaults a SIZED png to object-fit:cover so the photo
 * fills its box edge-to-edge with no distortion, plus object-position derived
 * from the SAME anchor table so a non-centered anchor crops toward the
 * anchored side. No schema change. UNSIZED png keep natural rendering. The
 * shared `resolveElementPosition` (also used by TextElement) is unchanged, so
 * the anchor/position geometry — and the text anchor fixes — do not regress.
 *
 * This test setup has no DOM, so we assert the style-object contract the same
 * way positioning.test.ts / text-element-box.test.ts do: it mirrors the
 * `positionStyle` computed in PngElement.vue exactly.
 */

/** Mirrors the positionStyle computed in PngElement.vue. */
function pngElementStyle(e: {
  position: { x: number | string; y: number | string }
  anchor?: string
  size?: { width?: number | string; height?: number | string }
  opacity?: number
  rotation?: number
}): Record<string, string | number> {
  const base: Record<string, string | number> = resolveElementPosition(e)
  const hasWidth = e.size?.width != null
  const hasHeight = e.size?.height != null
  if (hasWidth) base.width = resolveUnit(e.size!.width!)
  if (hasHeight) base.height = resolveUnit(e.size!.height!)
  if (hasWidth || hasHeight) {
    base.objectFit = 'cover'
    base.objectPosition = resolveAnchorObjectPosition(e.anchor)
  }
  if (e.opacity !== undefined && e.opacity !== 1) base.opacity = e.opacity
  if (e.rotation !== undefined && e.rotation !== 0) base.transform += ` rotate(${e.rotation}deg)`
  return base
}

describe('resolveAnchorObjectPosition (sized png cover crop follows the anchor)', () => {
  it('center keeps the photo centered', () => {
    expect(resolveAnchorObjectPosition('center')).toBe('50% 50%')
    expect(resolveAnchorObjectPosition(undefined)).toBe('50% 50%')
  })

  it('top-left keeps the top-left of the photo (full-bleed bg case)', () => {
    expect(resolveAnchorObjectPosition('top-left')).toBe('0% 0%')
  })

  it('bottom-right keeps the bottom-right of the photo', () => {
    expect(resolveAnchorObjectPosition('bottom-right')).toBe('100% 100%')
  })

  it('edge anchors map each axis independently', () => {
    expect(resolveAnchorObjectPosition('top')).toBe('50% 0%')
    expect(resolveAnchorObjectPosition('bottom')).toBe('50% 100%')
    expect(resolveAnchorObjectPosition('left')).toBe('0% 50%')
    expect(resolveAnchorObjectPosition('right')).toBe('100% 50%')
  })

  it('is derived from the SAME ANCHOR_OFFSETS table (cannot drift from placement)', () => {
    for (const a of ANCHOR_TYPES) {
      const [ox, oy] = resolveAnchorOffset(a)
      // offset -50%/-100%/0% ⇒ object-position 50%/100%/0% on each axis,
      // exactly mirroring ANCHOR_OFFSETS so the crop tracks the anchor.
      expect(resolveAnchorObjectPosition(a)).toBe(
        `${ox.replace('-', '')} ${oy.replace('-', '')}`,
      )
      expect(ANCHOR_OFFSETS[a]).toEqual([ox, oy])
    }
  })
})

describe('PngElement full-bleed background (regression: 100%×100% png did not cover its layer)', () => {
  it('png pos{0,0} size{100,100} anchor top-left → box fills the layer + object-fit:cover', () => {
    // The exact full-bleed background a non-technical author places on a layer.
    const style = pngElementStyle({
      position: { x: 0, y: 0 },
      size: { width: 100, height: 100 },
      anchor: 'top-left',
    })

    // The element box IS the layer/section box: top-left corner at (0,0),
    // width/height 100% of the absolutely-filled layer, no translate offset.
    expect(style.position).toBe('absolute')
    expect(style.left).toBe('0%')
    expect(style.top).toBe('0%')
    expect(style.width).toBe('100%')
    expect(style.height).toBe('100%')
    expect(style.transform).toBe('translate(0%, 0%)')

    // The photo COVERS the box edge-to-edge with no distortion (the fix:
    // a sized <img> would otherwise default to object-fit:fill = stretch).
    expect(style.objectFit).toBe('cover')
    // top-left anchor ⇒ crop keeps the top-left of the photo.
    expect(style.objectPosition).toBe('0% 0%')
  })

  it('one-axis size (width only) still gets cover (else it letterboxes at intrinsic aspect)', () => {
    const style = pngElementStyle({
      position: { x: 0, y: 0 },
      size: { width: 100 },
      anchor: 'top-left',
    })
    expect(style.width).toBe('100%')
    expect(style.height).toBeUndefined()
    expect(style.objectFit).toBe('cover')
    expect(style.objectPosition).toBe('0% 0%')
  })

  it('a sized png with a NON-center anchor still positions correctly AND crops to that side', () => {
    // size in px, anchor bottom-right at pos {92,92}: the anchor translate is
    // unchanged (geometry intact) and the cover crop follows the anchor.
    const style = pngElementStyle({
      position: { x: 92, y: 92 },
      size: { width: '120px', height: '80px' },
      anchor: 'bottom-right',
    })
    expect(style.left).toBe('92%')
    expect(style.top).toBe('92%')
    expect(style.width).toBe('120px')
    expect(style.height).toBe('80px')
    // bottom-right anchor: bottom-right corner of the box lands at (92,92).
    expect(style.transform).toBe('translate(-100%, -100%)')
    expect(style.objectFit).toBe('cover')
    expect(style.objectPosition).toBe('100% 100%')
  })

  it('an UNSIZED png is untouched: no object-fit forced, natural anchor geometry', () => {
    const style = pngElementStyle({
      position: { x: 50, y: 35 },
      anchor: 'center',
    })
    expect(style.left).toBe('50%')
    expect(style.top).toBe('35%')
    expect(style.transform).toBe('translate(-50%, -50%)')
    expect(style.width).toBeUndefined()
    expect(style.height).toBeUndefined()
    // No size ⇒ engine does NOT force object-fit; the png renders naturally.
    expect(style.objectFit).toBeUndefined()
    expect(style.objectPosition).toBeUndefined()
  })

  it('full-bleed png keeps appended rotate() after the anchor translate (no geometry regression)', () => {
    const style = pngElementStyle({
      position: { x: 0, y: 0 },
      size: { width: 100, height: 100 },
      anchor: 'top-left',
      rotation: 10,
    })
    expect(style.transform).toBe('translate(0%, 0%) rotate(10deg)')
    expect(style.objectFit).toBe('cover')
  })

  it('the fix does not change resolveElementPosition (text & png share it — anchor fixes intact)', () => {
    // Sanity: a SIZED png and an equivalent text element resolve the SAME
    // wrapper geometry; only the png gets the extra object-fit/position.
    const geo = resolveElementPosition({ position: { x: 0, y: 0 }, anchor: 'top-left' })
    expect(geo).toEqual({
      position: 'absolute',
      left: '0%',
      top: '0%',
      transform: 'translate(0%, 0%)',
      transformOrigin: '0% 0%',
    })
  })
})

/** Type-level: the fix needs NO schema change (no objectFit field added). */
describe('schema contract unchanged (sacred contract: png needs no new field)', () => {
  it('a full-bleed png validates with only existing fields', () => {
    const png: PngElement = {
      type: 'png',
      src: '/images/bg.jpg',
      position: { x: 0, y: 0 },
      size: { width: 100, height: 100 },
      anchor: 'top-left',
      opacity: 1,
      rotation: 0,
      visible: true,
      interactive: false,
      animations: [],
    }
    expect(png.type).toBe('png')
    // @ts-expect-error — there is intentionally NO `objectFit` field on the schema.
    expect(png.objectFit).toBeUndefined()
  })
})
