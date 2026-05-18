import { ref, onMounted, onUnmounted, type Ref } from 'vue'

export interface MouseState {
  /** Normalized X position: -1 (left) to 1 (right) */
  mouseX: Ref<number>
  /** Normalized Y position: -1 (top) to 1 (bottom) */
  mouseY: Ref<number>
}

/**
 * Tracks mouse position normalized to -1..1 range.
 * Only active on desktop (no-op on touch devices).
 */
export function useMouseTracking(): MouseState {
  const mouseX = ref(0)
  const mouseY = ref(0)

  const onMouseMove = (e: MouseEvent) => {
    mouseX.value = (e.clientX / window.innerWidth) * 2 - 1
    mouseY.value = (e.clientY / window.innerHeight) * 2 - 1
  }

  onMounted(() => {
    if (typeof window === 'undefined') return
    // Skip on touch-primary devices
    if (window.matchMedia('(pointer: coarse)').matches) return
    window.addEventListener('mousemove', onMouseMove, { passive: true })
  })

  onUnmounted(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('mousemove', onMouseMove)
    }
  })

  return { mouseX, mouseY }
}
