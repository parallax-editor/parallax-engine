import { describe, it, expect } from 'vitest'
import { computeLoopValue } from '../src/composables/useElementAnimations'

describe('computeLoopValue', () => {
  it('returns from value at elapsed=0', () => {
    const val = computeLoopValue(0, 1000, 0, 100, false, 'linear')
    expect(val).toBe(0)
  })

  it('returns to value at elapsed=duration', () => {
    const val = computeLoopValue(1000, 1000, 0, 100, false, 'linear')
    // At exactly duration, modulo wraps to 0, so it's the start of next cycle
    expect(val).toBe(0)
  })

  it('returns midpoint at half duration (linear)', () => {
    const val = computeLoopValue(500, 1000, 0, 100, false, 'linear')
    expect(val).toBe(50)
  })

  it('yoyo reverses on odd cycles', () => {
    // First cycle: forward (0→100)
    const forward = computeLoopValue(500, 1000, 0, 100, true, 'linear')
    expect(forward).toBe(50)

    // Second cycle: reverse (100→0)
    const reverse = computeLoopValue(1500, 1000, 0, 100, true, 'linear')
    expect(reverse).toBe(50) // 50% into reverse = midpoint
  })

  it('applies easing correctly', () => {
    // easeIn at t=0.5 should be 0.25 (t*t)
    const val = computeLoopValue(500, 1000, 0, 100, false, 'easeIn')
    expect(val).toBe(25)
  })

  it('handles duration=0 gracefully', () => {
    const val = computeLoopValue(500, 0, 0, 100, false, 'linear')
    expect(val).toBe(100) // returns to
  })

  it('loops correctly across multiple cycles', () => {
    // 2500ms into a 1000ms loop = 500ms into 3rd cycle
    const val = computeLoopValue(2500, 1000, 0, 100, false, 'linear')
    expect(val).toBe(50)
  })
})
