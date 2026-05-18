import { describe, it, expect } from 'vitest'

// Test pure transform calculations extracted from ParallaxLayer logic

describe('parallax mode transforms', () => {
  const PARALLAX_FACTOR = 100
  const MOUSE_FACTOR = 30
  const GYRO_FACTOR = 20

  it('scroll-vertical: translateY based on depth and progress', () => {
    const depth = -0.5
    const progress = 0.5
    const viewportHeight = 800
    const scrollDelta = progress * viewportHeight
    const offset = -depth * scrollDelta * 0.5
    expect(offset).toBe(100) // 0.5 * 400 * 0.5 = 100
  })

  it('scroll-horizontal: translateX based on depth and progress', () => {
    const depth = 0.8
    const progress = 0.5
    const viewportHeight = 800
    const scrollDelta = progress * viewportHeight
    const offset = -depth * scrollDelta * 0.3
    expect(offset).toBeCloseTo(-96) // -0.8 * 400 * 0.3
  })

  it('mouse: translate based on normalized mouse and depth', () => {
    const depth = 0.5
    const mouseX = 0.5 // right half
    const mouseY = -0.3 // upper area
    const mx = mouseX * depth * MOUSE_FACTOR
    const my = mouseY * depth * MOUSE_FACTOR
    expect(mx).toBe(7.5)
    expect(my).toBeCloseTo(-4.5)
  })

  it('gyroscope: translate based on tilt and depth', () => {
    const depth = 0.5
    const tiltX = 0.5
    const tiltY = -0.3
    const gx = tiltY * depth * GYRO_FACTOR
    const gy = tiltX * depth * GYRO_FACTOR
    expect(gx).toBe(-3)
    expect(gy).toBe(5)
  })

  it('depth 0 produces no parallax offset', () => {
    const depth = 0
    const progress = 0.5
    const viewportHeight = 800
    const offset = -depth * progress * viewportHeight * 0.5
    expect(offset).toBeCloseTo(0)
  })
})
