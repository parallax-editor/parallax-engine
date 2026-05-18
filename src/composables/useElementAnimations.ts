import {
  computed, ref, onMounted, onUnmounted, inject,
  type Ref, type CSSProperties, type ComputedRef,
} from 'vue'
import type { Animation, QualityTier } from '../schema'
import type { MouseState } from './useMouseTracking'
import type { GyroscopeState } from './useGyroscope'
import type { InteractionBus } from './useInteractionBus'

// ─── Easing functions ──────────────────────────────────────────────────────────

const easingFns: Record<string, (t: number) => number> = {
  linear: (t) => t,
  easeIn: (t) => t * t,
  easeOut: (t) => t * (2 - t),
  easeInOut: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeInCubic: (t) => t * t * t,
  easeOutCubic: (t) => { const u = t - 1; return u * u * u + 1 },
  easeInOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1),
  easeInQuart: (t) => t * t * t * t,
  easeOutQuart: (t) => { const u = t - 1; return 1 - u * u * u * u },
  easeInOutQuart: (t) => { const u = t - 1; return t < 0.5 ? 8 * t * t * t * t : 1 - 8 * u * u * u * u },
  easeInQuint: (t) => t * t * t * t * t,
  easeOutQuint: (t) => { const u = t - 1; return 1 + u * u * u * u * u },
  easeInOutQuint: (t) => { const u = t - 1; return t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * u * u * u * u * u },
}

function applyEasing(t: number, easing: string): number {
  const fn = easingFns[easing] || easingFns.easeInOut
  return fn(clamp(t, 0, 1))
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val))
}

// ─── Loop interpolation (exported for testing) ─────────────────────────────────

export function computeLoopValue(
  elapsed: number,
  duration: number,
  from: number,
  to: number,
  yoyo: boolean,
  easing: string,
): number {
  if (duration <= 0) return to
  const rawProgress = (elapsed % duration) / duration
  const cycle = Math.floor(elapsed / duration)
  const isReverse = yoyo && cycle % 2 === 1
  const progress = isReverse ? 1 - rawProgress : rawProgress
  const eased = applyEasing(progress, easing)
  return from + (to - from) * eased
}

// ─── Animation type → CSS property mapping ─────────────────────────────────────

type AnimProp = 'opacity' | 'transform' | 'filter' | 'clipPath'
type AnimValue = { prop: AnimProp; format: (v: number) => string }

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
  clipPath: { prop: 'clipPath', format: (v) => `inset(0 ${100 - v}% 0 0)` },
}

// ─── Composable ─────────────────────────────────────────────────────────────────

export interface ElementAnimationOptions {
  animations: Animation[]
  sectionProgress: Ref<number>
  reducedMotion: Ref<boolean>
  elementRef: Ref<HTMLElement | null>
  elementId?: string
}

export function useElementAnimations(options: ElementAnimationOptions) {
  const { animations, sectionProgress, reducedMotion, elementRef, elementId } = options
  const hasEntered = ref(false)
  const isHovered = ref(false)
  const isClicked = ref(false)
  const loopTime = ref(0)
  let observer: IntersectionObserver | null = null
  let loopRafId: number | null = null
  let lastTimestamp = 0
  const isElementVisible = ref(false)

  // Inject shared state
  const mouse = inject<MouseState>('parallaxMouse', {
    mouseX: { value: 0 }, mouseY: { value: 0 },
  } as any)
  const gyroscope = inject<GyroscopeState>('parallaxGyroscope', {
    tiltX: { value: 0 }, tiltY: { value: 0 }, available: { value: false },
  } as any)
  const quality = inject<ComputedRef<QualityTier>>('parallaxQuality', computed(() => ({
    maxLayers: 20, blurEnabled: true, loopFps: 60,
  })))
  const interactionBus = inject<InteractionBus>('parallaxInteractionBus', null as any)

  const hasLoopAnims = animations.some((a) => a.trigger === 'loop')
  const hasHoverAnims = animations.some((a) => a.trigger === 'hover')
  const hasClickAnims = animations.some((a) => a.trigger === 'click')
  const hasDependsAnims = animations.some((a) => a.trigger === 'depends')

  function startLoopRaf() {
    if (!hasLoopAnims || loopRafId !== null) return
    const minInterval = 1000 / quality.value.loopFps
    lastTimestamp = performance.now()

    function tick(now: number) {
      if (!isElementVisible.value) {
        loopRafId = requestAnimationFrame(tick)
        return
      }
      const delta = now - lastTimestamp
      if (delta >= minInterval) {
        loopTime.value += delta
        lastTimestamp = now
      }
      loopRafId = requestAnimationFrame(tick)
    }
    loopRafId = requestAnimationFrame(tick)
  }

  onMounted(() => {
    if (!elementRef.value) return

    // IntersectionObserver for enter + visibility
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          isElementVisible.value = entry.isIntersecting
          if (entry.isIntersecting && !hasEntered.value) {
            hasEntered.value = true
            if (interactionBus && elementId) {
              interactionBus.emit({ elementId, event: 'enter', active: true })
            }
          }
        }
      },
      { threshold: 0.1 },
    )
    observer.observe(elementRef.value)

    // Hover/click listeners for interactive elements
    if (hasHoverAnims || (interactionBus && elementId)) {
      elementRef.value.addEventListener('mouseenter', () => {
        isHovered.value = true
        if (interactionBus && elementId) {
          interactionBus.emit({ elementId, event: 'hover', active: true })
        }
      })
      elementRef.value.addEventListener('mouseleave', () => {
        isHovered.value = false
        if (interactionBus && elementId) {
          interactionBus.emit({ elementId, event: 'hover', active: false })
        }
      })
    }

    if (hasClickAnims || (interactionBus && elementId)) {
      elementRef.value.addEventListener('click', () => {
        isClicked.value = !isClicked.value // toggle
        if (interactionBus && elementId) {
          interactionBus.emit({ elementId, event: 'click', active: isClicked.value })
        }
      })
    }

    if (hasLoopAnims) startLoopRaf()
  })

  onUnmounted(() => {
    observer?.disconnect()
    if (loopRafId !== null) cancelAnimationFrame(loopRafId)
  })

  // Track depends trigger activations
  const dependsActive = computed(() => {
    if (!hasDependsAnims || !interactionBus) return new Map<string, boolean>()
    const map = new Map<string, boolean>()
    for (const anim of animations) {
      if (anim.trigger === 'depends' && anim.dependsOn && anim.dependsEvent) {
        map.set(
          `${anim.dependsOn}:${anim.dependsEvent}`,
          interactionBus.isActive(anim.dependsOn, anim.dependsEvent),
        )
      }
    }
    // Force reactivity by reading activeSet
    void interactionBus.activeSet.value
    return map
  })

  const style = computed<CSSProperties>(() => {
    const transforms: string[] = []
    let opacity: number | undefined
    let filter: string | undefined
    let clipPath: string | undefined
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

      let value: number | undefined
      let useTransition = false

      if (anim.trigger === 'enter') {
        value = hasEntered.value ? anim.to : anim.from
        if (hasEntered.value) useTransition = true
      } else if (anim.trigger === 'scroll') {
        const range = anim.range ?? [0, 1]
        const rangeSize = range[1] - range[0]
        const rawProgress = rangeSize > 0
          ? (sectionProgress.value - range[0]) / rangeSize
          : 0
        const easedProgress = applyEasing(clamp(rawProgress, 0, 1), anim.easing)
        value = anim.from + (anim.to - anim.from) * easedProgress
      } else if (anim.trigger === 'loop') {
        const dur = anim.duration ?? 1000
        value = computeLoopValue(loopTime.value, dur, anim.from, anim.to, anim.yoyo ?? false, anim.easing)
      } else if (anim.trigger === 'mouse') {
        const isX = anim.type === 'translateX' || anim.type === 'rotateY' || anim.type === 'skew'
        const normalized = isX ? mouse.mouseX.value : mouse.mouseY.value
        const t = (normalized + 1) / 2
        value = anim.from + (anim.to - anim.from) * t
      } else if (anim.trigger === 'gyroscope') {
        const isX = anim.type === 'translateX' || anim.type === 'rotateY' || anim.type === 'skew'
        const normalized = isX ? gyroscope.tiltY.value : gyroscope.tiltX.value
        const t = (normalized + 1) / 2
        value = anim.from + (anim.to - anim.from) * t
      } else if (anim.trigger === 'hover') {
        value = isHovered.value ? anim.to : anim.from
        useTransition = true
      } else if (anim.trigger === 'click') {
        value = isClicked.value ? anim.to : anim.from
        useTransition = true
      } else if (anim.trigger === 'depends') {
        if (anim.dependsOn && anim.dependsEvent) {
          const key = `${anim.dependsOn}:${anim.dependsEvent}`
          const active = dependsActive.value.get(key) ?? false
          value = active ? anim.to : anim.from
          useTransition = true
        }
      }

      if (value === undefined) continue

      if (mapping.prop === 'opacity') {
        opacity = value
      } else if (mapping.prop === 'transform') {
        transforms.push(mapping.format(value))
      } else if (mapping.prop === 'filter') {
        filter = mapping.format(value)
      } else if (mapping.prop === 'clipPath') {
        clipPath = mapping.format(value)
      }

      if (useTransition && !transition) {
        const dur = anim.duration ?? 600
        const delay = anim.delay ?? 0
        transition = `all ${dur}ms ${anim.easing} ${delay}ms`
      }
    }

    const result: CSSProperties = {}
    if (transforms.length > 0) result.transform = transforms.join(' ')
    if (opacity !== undefined) result.opacity = opacity
    if (filter) result.filter = filter
    if (clipPath) (result as any).clipPath = clipPath
    if (transition) result.transition = transition
    return result
  })

  return { style, isHovered, isClicked }
}
