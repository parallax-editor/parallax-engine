import { describe, it, expect } from 'vitest'
import { TRANSITION_TYPES } from '../src/schema'

describe('World transitions', () => {
  it('recognizes all 5 transition types', () => {
    expect(TRANSITION_TYPES).toEqual(['fade', 'wipe', 'crossfade-blur', 'zoom', 'page-flip'])
  })

  it('transition types are valid strings', () => {
    for (const type of TRANSITION_TYPES) {
      expect(typeof type).toBe('string')
      expect(type.length).toBeGreaterThan(0)
    }
  })
})
