import { describe, it, expect } from 'vitest'
import { resolveUnit, resolvePosition, resolveSize } from '../src/utils/units'

describe('resolveUnit', () => {
  it('converts number to percentage string', () => {
    expect(resolveUnit(50)).toBe('50%')
    expect(resolveUnit(0)).toBe('0%')
    expect(resolveUnit(100)).toBe('100%')
  })

  it('passes strings through as-is', () => {
    expect(resolveUnit('10vh')).toBe('10vh')
    expect(resolveUnit('clamp(1rem, 5vw, 3rem)')).toBe('clamp(1rem, 5vw, 3rem)')
    expect(resolveUnit('50px')).toBe('50px')
  })
})

describe('resolvePosition', () => {
  it('resolves mixed number/string positions', () => {
    expect(resolvePosition({ x: 50, y: '10vh' })).toEqual({ left: '50%', top: '10vh' })
  })

  it('resolves all-number positions', () => {
    expect(resolvePosition({ x: 0, y: 100 })).toEqual({ left: '0%', top: '100%' })
  })
})

describe('resolveSize', () => {
  it('returns empty object for undefined', () => {
    expect(resolveSize(undefined)).toEqual({})
  })

  it('resolves partial size (width only)', () => {
    expect(resolveSize({ width: 80 })).toEqual({ width: '80%' })
  })

  it('resolves full size with mixed types', () => {
    expect(resolveSize({ width: '50vw', height: 40 })).toEqual({ width: '50vw', height: '40%' })
  })
})
