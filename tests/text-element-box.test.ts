import { describe, it, expect } from 'vitest'
import { resolveElementPosition, TEXT_BOX_RESET } from '../src/utils/units'

/**
 * Regression: the rendered semantic tag (<h1>..<h6>, <p>, <span>) carries the
 * browser user-agent default margin (e.g. <h1> has margin-block ≈ 0.67em).
 * Left in place that margin shifts the text box down and effectively cancels
 * the vertical translateY(-50%) of an `anchor:center` element, so a y:35
 * element rendered its visual center at ≈41.7% instead of 35% (drift
 * proportional to font-size: h1 ≈ +6.7%, small text ≈ +2.8%).
 *
 * Fix: TextElement.vue spreads TEXT_BOX_RESET into the element's inline style
 * (margin:0; padding:0; box-sizing:border-box), neutralizing the UA box on the
 * rendered tag itself — inline, so it is exact even when a consumer does not
 * import the engine's stylesheet. Themed typography from the schema still
 * applies (it is layered on top of this base, not replaced).
 *
 * This test setup has no DOM, so we assert the style-object contract the same
 * way positioning.test.ts does: TextElement builds positionStyle as
 * { ...resolveElementPosition(e), ...TEXT_BOX_RESET, <themed typography> }.
 */

/** Mirrors the positionStyle computed in TextElement.vue for the parts under test. */
function textElementBaseStyle(e: {
  position: { x: number | string; y: number | string }
  anchor?: string
}): Record<string, string | number> {
  return {
    ...resolveElementPosition(e),
    ...TEXT_BOX_RESET,
  }
}

describe('TextElement box normalization (regression: UA margin breaks anchor centering)', () => {
  it('TEXT_BOX_RESET zeroes the UA box of the semantic tag', () => {
    expect(TEXT_BOX_RESET.margin).toBe('0')
    expect(TEXT_BOX_RESET.padding).toBe('0')
    expect(TEXT_BOX_RESET.boxSizing).toBe('border-box')
  })

  it('titulo-nombres (h1, anchor:center, y:35) gets zero margin AND intact anchor math → center at 35%', () => {
    // Mirrors the eventos `titulo-nombres` fixture on :3001/sofia-y-juan.
    const style = textElementBaseStyle({ position: { x: 50, y: 35 }, anchor: 'center' })

    // Anchor geometry intact: top:35% + translate(-50%,-50%) ⇒ visual center at 35%.
    expect(style.position).toBe('absolute')
    expect(style.left).toBe('50%')
    expect(style.top).toBe('35%')
    expect(style.transform).toBe('translate(-50%, -50%)')

    // UA margin neutralized inline (the only thing that explained the +6.7% drift).
    expect(style.margin).toBe('0')
    expect(style.padding).toBe('0')
    expect(style.boxSizing).toBe('border-box')
  })

  it('themed typography still applies on top of the box reset (fix does not flatten styling)', () => {
    // Reproduces the TextElement.vue layering: box reset first, theme last.
    const e = {
      position: { x: 50, y: 35 },
      anchor: 'center',
      font: 'Playfair Display',
      fontSize: '48px',
      fontWeight: 700 as const,
      color: '#1a1a1a',
      letterSpacing: '0.04em',
      lineHeight: 1.1,
    }
    const style: Record<string, string | number> = { ...textElementBaseStyle(e) }
    if (e.font) style.fontFamily = e.font
    if (e.fontSize) style.fontSize = e.fontSize
    if (e.fontWeight) style.fontWeight = e.fontWeight
    if (e.color) style.color = e.color
    if (e.letterSpacing) style.letterSpacing = e.letterSpacing
    if (e.lineHeight) style.lineHeight = e.lineHeight

    expect(style.fontFamily).toBe('Playfair Display')
    expect(style.fontSize).toBe('48px')
    expect(style.letterSpacing).toBe('0.04em')
    expect(style.lineHeight).toBe(1.1)
    // ...while the UA-box neutralization survives the merge.
    expect(style.margin).toBe('0')
    expect(style.padding).toBe('0')
  })
})
