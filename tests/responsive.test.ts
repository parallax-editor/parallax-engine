import { describe, it, expect } from 'vitest'
import { mergeResponsiveOverrides } from '../src/composables/useResponsive'

describe('mergeResponsiveOverrides', () => {
  const baseElement = {
    type: 'png' as const,
    position: { x: 50, y: 50 },
    size: { width: 100 },
    opacity: 1,
    visible: true,
    mobile: { opacity: 0.5, visible: false },
    desktop: { position: { x: 10, y: 20 } },
  }

  it('merges mobile overrides when device is mobile', () => {
    const result = mergeResponsiveOverrides(baseElement, 'mobile')
    expect(result.opacity).toBe(0.5)
    expect(result.visible).toBe(false)
    expect(result.position).toEqual({ x: 50, y: 50 }) // unchanged
  })

  it('merges desktop overrides when device is desktop', () => {
    const result = mergeResponsiveOverrides(baseElement, 'desktop')
    expect(result.position).toEqual({ x: 10, y: 20 }) // replaced
    expect(result.opacity).toBe(1) // unchanged
  })

  it('returns element unchanged if no overrides for device', () => {
    const noOverrides = { type: 'png' as const, position: { x: 50, y: 50 }, opacity: 1, visible: true }
    const result = mergeResponsiveOverrides(noOverrides, 'mobile')
    expect(result).toEqual(noOverrides)
  })

  it('handles text element overrides', () => {
    const textEl = {
      type: 'text' as const,
      position: { x: 50, y: 50 },
      content: 'Hello',
      fontSize: '24px',
      mobile: { fontSize: '16px' },
    }
    const result = mergeResponsiveOverrides(textEl, 'mobile')
    expect(result.fontSize).toBe('16px')
    expect(result.content).toBe('Hello')
  })
})
