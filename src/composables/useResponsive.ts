import { ref, onMounted, onUnmounted, type Ref } from 'vue'

export type DeviceType = 'mobile' | 'desktop'

const MOBILE_BREAKPOINT = 768

/**
 * Detects mobile vs desktop based on viewport width.
 * Returns a reactive ref that updates on resize.
 */
export function useResponsive(): Ref<DeviceType> {
  const device = ref<DeviceType>('desktop')
  let mql: MediaQueryList | null = null

  const update = () => {
    if (mql) device.value = mql.matches ? 'mobile' : 'desktop'
  }

  onMounted(() => {
    if (typeof window === 'undefined') return
    mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`)
    device.value = mql.matches ? 'mobile' : 'desktop'
    mql.addEventListener('change', update)
  })

  onUnmounted(() => {
    mql?.removeEventListener('change', update)
  })

  return device
}

/**
 * Merges responsive overrides onto element base props.
 * Pure function for testability.
 */
export function mergeResponsiveOverrides<T extends Record<string, any>>(
  element: T,
  device: DeviceType,
): T {
  const overrides = device === 'mobile' ? element.mobile : element.desktop
  if (!overrides) return element
  // Shallow merge: overrides win, but nested objects (position, size) are replaced entirely
  return { ...element, ...overrides }
}
