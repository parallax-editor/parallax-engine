import { describe, it, expect } from 'vitest'
import { resolveUnit, resolvePosition, resolveSize, resolveAssetUrl, isRelativeAssetPath } from '../src/utils/units'

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

describe('isRelativeAssetPath', () => {
  it('treats bare paths as relative', () => {
    expect(isRelativeAssetPath('images/foo.png')).toBe(true)
    expect(isRelativeAssetPath('fonts/x.otf')).toBe(true)
  })
  it('treats http(s)/root/protocol-relative/data/blob as NOT relative', () => {
    expect(isRelativeAssetPath('https://cdn.com/a.png')).toBe(false)
    expect(isRelativeAssetPath('http://x/a.png')).toBe(false)
    expect(isRelativeAssetPath('/content/s/images/a.png')).toBe(false)
    expect(isRelativeAssetPath('//cdn/a.png')).toBe(false)
    expect(isRelativeAssetPath('data:image/png;base64,AAAA')).toBe(false)
    expect(isRelativeAssetPath('blob:abc')).toBe(false)
  })
})

describe('resolveAssetUrl', () => {
  it('prefixes a relative path with the assetBase (one slash)', () => {
    expect(resolveAssetUrl('/content/home/', 'images/a.png')).toBe('/content/home/images/a.png')
    // base sin barra final + src relativo → exactamente UNA barra entre ambos
    expect(resolveAssetUrl('/content/home', 'images/a.png')).toBe('/content/home/images/a.png')
  })
  it('leaves non-relative paths untouched regardless of base', () => {
    expect(resolveAssetUrl('/content/home/', 'https://cdn/a.png')).toBe('https://cdn/a.png')
    expect(resolveAssetUrl('/content/home/', '/already/abs.png')).toBe('/already/abs.png')
    expect(resolveAssetUrl('/content/home/', 'data:image/png;base64,AA')).toBe('data:image/png;base64,AA')
  })
  it('without assetBase returns the path verbatim (backwards-compatible)', () => {
    expect(resolveAssetUrl('', 'images/a.png')).toBe('images/a.png')
    expect(resolveAssetUrl(undefined, 'images/a.png')).toBe('images/a.png')
  })
  it('handles empty/nullish src', () => {
    expect(resolveAssetUrl('/content/home/', '')).toBe('')
    expect(resolveAssetUrl('/content/home/', null)).toBe('')
    expect(resolveAssetUrl('/content/home/', undefined)).toBe('')
  })
})
