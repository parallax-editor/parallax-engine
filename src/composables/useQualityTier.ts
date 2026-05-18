import { computed, type Ref } from 'vue'
import type { Quality, QualityTier } from '../schema'
import type { DeviceType } from './useResponsive'

const DEFAULT_MOBILE: QualityTier = { maxLayers: 5, blurEnabled: false, loopFps: 30 }
const DEFAULT_DESKTOP: QualityTier = { maxLayers: 20, blurEnabled: true, loopFps: 60 }
const LOW_END_MOBILE: QualityTier = { maxLayers: 3, blurEnabled: false, loopFps: 24 }

/**
 * Detects if device is low-end.
 * Uses hardwareConcurrency as a rough proxy.
 */
export function isLowEndDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  const cores = navigator.hardwareConcurrency ?? 4
  return cores <= 4
}

/**
 * Computes the active quality tier based on device type,
 * device capability, and optional site-level quality overrides.
 */
export function useQualityTier(
  device: Ref<DeviceType>,
  siteQuality?: Quality,
) {
  const tier = computed<QualityTier>(() => {
    if (device.value === 'mobile') {
      if (siteQuality?.mobile) return siteQuality.mobile
      return isLowEndDevice() ? LOW_END_MOBILE : DEFAULT_MOBILE
    }
    if (siteQuality?.desktop) return siteQuality.desktop
    return DEFAULT_DESKTOP
  })

  return tier
}

/**
 * Pure function for computing quality tier — for unit testing.
 */
export function computeQualityTier(
  device: DeviceType,
  lowEnd: boolean,
  siteQuality?: Quality,
): QualityTier {
  if (device === 'mobile') {
    if (siteQuality?.mobile) return siteQuality.mobile
    return lowEnd ? LOW_END_MOBILE : DEFAULT_MOBILE
  }
  if (siteQuality?.desktop) return siteQuality.desktop
  return DEFAULT_DESKTOP
}
