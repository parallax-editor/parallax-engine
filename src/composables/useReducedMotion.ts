import { ref, onMounted, onUnmounted, type Ref } from 'vue'

export function useReducedMotion(): Ref<boolean> {
  const isReduced = ref(false)
  let mql: MediaQueryList | null = null

  const update = () => {
    if (mql) isReduced.value = mql.matches
  }

  onMounted(() => {
    if (typeof window === 'undefined') return
    mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    isReduced.value = mql.matches
    mql.addEventListener('change', update)
  })

  onUnmounted(() => {
    mql?.removeEventListener('change', update)
  })

  return isReduced
}
