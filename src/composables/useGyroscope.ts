import { ref, onMounted, onUnmounted, type Ref } from 'vue'

export interface GyroscopeState {
  /** Normalized tilt X (beta): -1 to 1 */
  tiltX: Ref<number>
  /** Normalized tilt Y (gamma): -1 to 1 */
  tiltY: Ref<number>
  /** Whether gyroscope is available and permitted */
  available: Ref<boolean>
  /** Whether we need to request permission (iOS 13+) */
  needsPermission: Ref<boolean>
  /** Request permission (call from user gesture) */
  requestPermission: () => Promise<boolean>
}

/**
 * Tracks device orientation (gyroscope) normalized to -1..1.
 * Handles iOS permission request automatically.
 */
export function useGyroscope(): GyroscopeState {
  const tiltX = ref(0)
  const tiltY = ref(0)
  const available = ref(false)
  const needsPermission = ref(false)

  const onOrientation = (e: DeviceOrientationEvent) => {
    if (e.beta != null && e.gamma != null) {
      // beta: -180..180 (front-back tilt), clamp to -45..45 and normalize
      tiltX.value = Math.max(-1, Math.min(1, (e.beta - 45) / 45))
      // gamma: -90..90 (left-right tilt), normalize to -1..1
      tiltY.value = Math.max(-1, Math.min(1, e.gamma / 45))
      available.value = true
    }
  }

  const startListening = () => {
    window.addEventListener('deviceorientation', onOrientation, { passive: true })
  }

  const requestPermission = async (): Promise<boolean> => {
    try {
      const DOE = DeviceOrientationEvent as any
      if (typeof DOE.requestPermission === 'function') {
        const permission = await DOE.requestPermission()
        if (permission === 'granted') {
          needsPermission.value = false
          startListening()
          // Remember in sessionStorage
          try { sessionStorage.setItem('parallax-gyro-granted', '1') } catch {}
          return true
        }
        return false
      }
      // Non-iOS: no permission needed
      startListening()
      return true
    } catch {
      return false
    }
  }

  onMounted(() => {
    if (typeof window === 'undefined') return
    if (!('DeviceOrientationEvent' in window)) return

    const DOE = DeviceOrientationEvent as any
    if (typeof DOE.requestPermission === 'function') {
      // iOS 13+ — check if already granted
      try {
        if (sessionStorage.getItem('parallax-gyro-granted') === '1') {
          startListening()
          return
        }
      } catch {}
      needsPermission.value = true
    } else {
      // Android / non-iOS — just start
      startListening()
    }
  })

  onUnmounted(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('deviceorientation', onOrientation)
    }
  })

  return { tiltX, tiltY, available, needsPermission, requestPermission }
}
