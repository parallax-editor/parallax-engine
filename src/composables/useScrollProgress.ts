import { ref, onMounted, onUnmounted, type Ref } from 'vue'

export interface ScrollState {
  scrollY: Ref<number>
  viewportHeight: Ref<number>
}

/**
 * Tracks global scroll position.
 * Uses Lenis instance if provided, falls back to native scroll.
 */
export function useScrollProgress(lenisInstance?: Ref<any | null>): ScrollState {
  const scrollY = ref(0)
  const viewportHeight = ref(0)
  let raf: number | null = null

  const updateFromNative = () => {
    scrollY.value = window.scrollY
    viewportHeight.value = window.innerHeight
  }

  const onLenisScroll = ({ scroll }: { scroll: number }) => {
    scrollY.value = scroll
  }

  onMounted(() => {
    if (typeof window === 'undefined') return

    viewportHeight.value = window.innerHeight

    if (lenisInstance?.value) {
      lenisInstance.value.on('scroll', onLenisScroll)
    } else {
      window.addEventListener('scroll', updateFromNative, { passive: true })
      window.addEventListener('resize', updateFromNative, { passive: true })
      updateFromNative()
    }
  })

  onUnmounted(() => {
    if (raf) cancelAnimationFrame(raf)
    if (lenisInstance?.value) {
      lenisInstance.value.off('scroll', onLenisScroll)
    } else if (typeof window !== 'undefined') {
      window.removeEventListener('scroll', updateFromNative)
      window.removeEventListener('resize', updateFromNative)
    }
  })

  return { scrollY, viewportHeight }
}
