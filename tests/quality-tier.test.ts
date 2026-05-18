import { describe, it, expect } from 'vitest'
import { computeQualityTier } from '../src/composables/useQualityTier'

describe('computeQualityTier', () => {
  it('returns default mobile tier for mobile device', () => {
    const tier = computeQualityTier('mobile', false)
    expect(tier.maxLayers).toBe(5)
    expect(tier.blurEnabled).toBe(false)
    expect(tier.loopFps).toBe(30)
  })

  it('returns low-end mobile tier for weak mobile', () => {
    const tier = computeQualityTier('mobile', true)
    expect(tier.maxLayers).toBe(3)
    expect(tier.loopFps).toBe(24)
  })

  it('returns default desktop tier for desktop device', () => {
    const tier = computeQualityTier('desktop', false)
    expect(tier.maxLayers).toBe(20)
    expect(tier.blurEnabled).toBe(true)
    expect(tier.loopFps).toBe(60)
  })

  it('uses site-level quality override if provided', () => {
    const siteQuality = {
      mobile: { maxLayers: 4, blurEnabled: true, loopFps: 45 },
      desktop: { maxLayers: 15, blurEnabled: true, loopFps: 60 },
    }
    const mobileTier = computeQualityTier('mobile', true, siteQuality)
    expect(mobileTier.maxLayers).toBe(4)
    expect(mobileTier.blurEnabled).toBe(true) // override wins over low-end default

    const desktopTier = computeQualityTier('desktop', false, siteQuality)
    expect(desktopTier.maxLayers).toBe(15)
  })
})
