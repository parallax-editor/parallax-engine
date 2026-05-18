import { ref, onMounted, onUnmounted, type Ref } from 'vue'
import type { CursorConfig } from '../schema'

export interface CursorState {
  x: Ref<number>
  y: Ref<number>
  hovering: Ref<boolean>
  visible: Ref<boolean>
}

export function useCursorEffect(config?: CursorConfig): CursorState {
  const x = ref(0)
  const y = ref(0)
  const hovering = ref(false)
  const visible = ref(false)

  if (!config?.enabled) {
    return { x, y, hovering, visible }
  }

  const onMove = (e: MouseEvent) => {
    x.value = e.clientX
    y.value = e.clientY
    visible.value = true
  }

  const onLeave = () => { visible.value = false }
  const onEnter = () => { visible.value = true }

  onMounted(() => {
    if (typeof window === 'undefined') return
    // Only on non-touch devices
    if (window.matchMedia('(pointer: coarse)').matches) return

    document.addEventListener('mousemove', onMove, { passive: true })
    document.addEventListener('mouseleave', onLeave)
    document.addEventListener('mouseenter', onEnter)

    // Watch for hover on interactive elements
    const onOver = (e: Event) => {
      const target = e.target as HTMLElement
      if (target.closest('[data-parallax-interactive]')) {
        hovering.value = true
      }
    }
    const onOut = (e: Event) => {
      const target = e.target as HTMLElement
      if (target.closest('[data-parallax-interactive]')) {
        hovering.value = false
      }
    }
    document.addEventListener('mouseover', onOver, { passive: true })
    document.addEventListener('mouseout', onOut, { passive: true })
  })

  onUnmounted(() => {
    if (typeof document === 'undefined') return
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseleave', onLeave)
    document.removeEventListener('mouseenter', onEnter)
  })

  return { x, y, hovering, visible }
}
