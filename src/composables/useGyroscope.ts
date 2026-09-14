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
 * Decide whether to surface the iOS-style "enable motion" permission prompt.
 * Pure (no DOM) so it can be unit-tested.
 *
 * The orientation listener is ALWAYS attached regardless of this — desktop,
 * Android, and synthetic events flow without a grant. The prompt is only for
 * touch devices whose `DeviceOrientationEvent` gates real sensor events behind
 * a user-gesture grant: iOS 13+, and Chrome ≥152 which also defines
 * `requestPermission` on DESKTOP (maxTouchPoints 0), where no prompt belongs.
 */
export function shouldPromptForGyroPermission(
  hasRequestPermission: boolean,
  maxTouchPoints: number,
  alreadyGranted: boolean,
): boolean {
  return hasRequestPermission && maxTouchPoints > 0 && !alreadyGranted
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

    // Attach immediately. Platforms that deliver orientation events without an
    // explicit grant (desktop + Android, and synthetic events) work right away.
    startListening()

    // Surface the activation prompt only where a user-gesture grant is actually
    // required (see shouldPromptForGyroPermission). Before Chrome 152 the mere
    // presence of requestPermission meant iOS; Chrome now defines it on desktop
    // too, so we also require a touch device.
    const DOE = DeviceOrientationEvent as any
    let granted = false
    try { granted = sessionStorage.getItem('parallax-gyro-granted') === '1' } catch {}
    if (shouldPromptForGyroPermission(
      typeof DOE.requestPermission === 'function',
      navigator.maxTouchPoints,
      granted,
    )) {
      needsPermission.value = true
    }
  })

  onUnmounted(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('deviceorientation', onOrientation)
    }
  })

  return { tiltX, tiltY, available, needsPermission, requestPermission }
}
