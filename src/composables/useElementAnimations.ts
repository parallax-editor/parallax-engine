import {
  computed, ref, onMounted, onUnmounted,
  type Ref, type CSSProperties,
} from 'vue'
import type { Animation } from '../schema'

// ─── Easing functions ──────────────────────────────────────────────────────────

const easingFns: Record<string, (t: number) => number> = {
  linear: (t) => t,
  easeIn: (t) => t * t,
  easeOut: (t) => t * (2 - t),
  easeInOut: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeInCubic: (t) => t * t * t,
  easeOutCubic: (t) => (--t) * t * t + 1,
  easeInOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1),
  easeInQuart: (t) => t * t * t * t,
  easeOutQuart: (t) => 1 - (--t) * t * t * t,
  easeInOutQuart: (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t),
  easeInQuint: (t) => t * t * t * t * t,
  easeOutQuint: (t) => 1 + (--t) * t * t * t * t,
  easeInOutQuint: (t) => (t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * (--t) * t * t * t * t),
}

function applyEasing(t: number, easing: string): number {
  const fn = easingFns[easing] || easingFns.easeInOut
  return fn(Math.max(0, Math.min(1, t)))
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val))
}

// ─── Animation type → CSS property mapping ─────────────────────────────────────

type AnimValue = { prop: 'opacity' | 'transform' | 'filter'; format: (v: number) => string }

const animMap: Record<string, AnimValue> = {
  fadeIn: { prop: 'opacity', format: (v) => `${v}` },
  fadeOut: { prop: 'opacity', format: (v) => `${v}` },
  translateX: { prop: 'transform', format: (v) => `translateX(${v}px)` },
  translateY: { prop: 'transform', format: (v) => `translateY(${v}px)` },
  rotate: { prop: 'transform', format: (v) => `rotate(${v}deg)` },
  rotateX: { prop: 'transform', format: (v) => `rotateX(${v}deg)` },
  rotateY: { prop: 'transform', format: (v) => `rotateY(${v}deg)` },
  scale: { prop: 'transform', format: (v) => `scale(${v})` },
  blur: { prop: 'filter', format: (v) => `blur(${v}px)` },
  skew: { prop: 'transform', format: (v) => `skew(${v}deg)` },
}

// ─── Composable ─────────────────────────────────────────────────────────────────

export interface ElementAnimationOptions {
  animations: Animation[]
  sectionProgress: Ref<number>
  reducedMotion: Ref<boolean>
  elementRef: Ref<HTMLElement | null>
}

export function useElementAnimations(options: ElementAnimationOptions) {
  const { animations, sectionProgress, reducedMotion, elementRef } = options
  const hasEntered = ref(false)
  let observer: IntersectionObserver | null = null

  // Setup IntersectionObserver for 'enter' trigger
  onMounted(() => {
    const enterAnims = animations.filter((a) => a.trigger === 'enter')
    if (enterAnims.length === 0 || !elementRef.value) return

    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !hasEntered.value) {
            hasEntered.value = true
            observer?.disconnect()
          }
        }
      },
      { threshold: 0.1 },
    )
    observer.observe(elementRef.value)
  })

  onUnmounted(() => {
    observer?.disconnect()
  })

  const style = computed<CSSProperties>(() => {
    const transforms: string[] = []
    let opacity: number | undefined
    let filter: string | undefined
    let transition: string | undefined

    for (const anim of animations) {
      const mapping = animMap[anim.type]
      if (!mapping) continue

      // Reduced motion: skip motion animations, keep opacity instant
      if (reducedMotion.value) {
        if (anim.type === 'fadeIn' || anim.type === 'fadeOut') {
          opacity = anim.to
        }
        continue
      }

      if (anim.trigger === 'enter') {
        const value = hasEntered.value ? anim.to : anim.from
        if (mapping.prop === 'opacity') {
          opacity = value
        } else if (mapping.prop === 'transform') {
          transforms.push(mapping.format(value))
        } else if (mapping.prop === 'filter') {
          filter = mapping.format(value)
        }
        // Add CSS transition for enter animations
        if (hasEntered.value) {
          const dur = anim.duration ?? 600
          const delay = anim.delay ?? 0
          transition = `all ${dur}ms ${anim.easing} ${delay}ms`
        }
      } else if (anim.trigger === 'scroll') {
        const range = anim.range ?? [0, 1]
        const rangeSize = range[1] - range[0]
        const rawProgress = rangeSize > 0
          ? (sectionProgress.value - range[0]) / rangeSize
          : 0
        const easedProgress = applyEasing(clamp(rawProgress, 0, 1), anim.easing)
        const value = anim.from + (anim.to - anim.from) * easedProgress

        if (mapping.prop === 'opacity') {
          opacity = value
        } else if (mapping.prop === 'transform') {
          transforms.push(mapping.format(value))
        } else if (mapping.prop === 'filter') {
          filter = mapping.format(value)
        }
      }
      // mouse, gyroscope, loop triggers → Fase 2
    }

    const result: CSSProperties = {}
    if (transforms.length > 0) result.transform = transforms.join(' ')
    if (opacity !== undefined) result.opacity = opacity
    if (filter) result.filter = filter
    if (transition) result.transition = transition
    return result
  })

  return { style }
}
