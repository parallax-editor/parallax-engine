import {
  computed, ref, watch, onMounted, onUnmounted, inject,
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

/**
 * CSS timing-function equivalents for the schema's easing presets.
 * The schema allows easings like `easeOutCubic`/`easeInQuart` that are NOT
 * valid CSS `transition-timing-function` keywords. Emitting them verbatim in
 * the `transition` shorthand makes the browser reject the WHOLE shorthand, so
 * `enter`/`hover`/`click`/`depends` animations would jump instantly with no
 * tween (a root cause of "enter fadeIn does not run"). Map every preset to a
 * real cubic-bezier so the transition is always a valid, animated declaration.
 */
const cssEasing: Record<string, string> = {
  linear: 'linear',
  easeIn: 'cubic-bezier(0.42, 0, 1, 1)',
  easeOut: 'cubic-bezier(0, 0, 0.58, 1)',
  easeInOut: 'cubic-bezier(0.42, 0, 0.58, 1)',
  easeInCubic: 'cubic-bezier(0.55, 0.055, 0.675, 0.19)',
  easeOutCubic: 'cubic-bezier(0.215, 0.61, 0.355, 1)',
  easeInOutCubic: 'cubic-bezier(0.645, 0.045, 0.355, 1)',
  easeInQuart: 'cubic-bezier(0.895, 0.03, 0.685, 0.22)',
  easeOutQuart: 'cubic-bezier(0.165, 0.84, 0.44, 1)',
  easeInOutQuart: 'cubic-bezier(0.77, 0, 0.175, 1)',
  easeInQuint: 'cubic-bezier(0.755, 0.05, 0.855, 0.06)',
  easeOutQuint: 'cubic-bezier(0.23, 1, 0.32, 1)',
  easeInOutQuint: 'cubic-bezier(0.86, 0, 0.07, 1)',
}

export function cssEasingFor(easing: string): string {
  return cssEasing[easing] || cssEasing.easeInOut
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
  // Reactive getter for the element's animations. A getter (not a plain
  // `Animation[]`) so the composable re-derives when the editor patches a
  // NEW animations array onto the live element without remounting the engine
  // (engineKey is stable to preserve scroll/selection). Callers pass
  // `() => el.value.animations` (the merged, responsive-aware source).
  animations: () => Animation[]
  sectionProgress: Ref<number>
  reducedMotion: Ref<boolean>
  elementRef: Ref<HTMLElement | null>
  elementId?: string
}

export function useElementAnimations(options: ElementAnimationOptions) {
  const { sectionProgress, reducedMotion, elementRef, elementId } = options
  // Reactive view of the animations array — recomputes whenever the editor
  // swaps in a new array (or a responsive override changes it).
  const anims = computed(() => options.animations() ?? [])
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

  const hasLoopAnims = computed(() => anims.value.some((a) => a.trigger === 'loop'))
  const hasHoverAnims = computed(() => anims.value.some((a) => a.trigger === 'hover'))
  const hasClickAnims = computed(() => anims.value.some((a) => a.trigger === 'click'))
  const hasDependsAnims = computed(() => anims.value.some((a) => a.trigger === 'depends'))

  function startLoopRaf() {
    if (!hasLoopAnims.value || loopRafId !== null) return
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

    // IntersectionObserver for enter + visibility.
    // threshold:0 (any pixel visible) so a thin/short text box — including a
    // split/animated heading whose box is only a couple of px tall before it
    // animates in — still fires reliably. threshold:0.1 could never be met by
    // such a box, which made enter/scroll inconsistent. No rootMargin shrink:
    // isElementVisible also gates the loop rAF, so it must reflect true
    // viewport intersection (a negative bottom margin starved bottom-of-hero
    // loop animations like scroll-hint).
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          isElementVisible.value = entry.isIntersecting
          if (entry.isIntersecting && !hasEntered.value) {
            // Defer the from→to flip to the next frame so the browser paints
            // the `from` state (with the transition already on the element)
            // BEFORE the value changes. Flipping in the same commit that
            // first attaches the transition means the browser sees no prior
            // value to tween from, so the element snaps instead of animating
            // (root cause of "enter fadeIn does not run").
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                hasEntered.value = true
              })
            })
            if (interactionBus && elementId) {
              interactionBus.emit({ elementId, event: 'enter', active: true })
            }
          }
        }
      },
      { threshold: 0 },
    )
    observer.observe(elementRef.value)

    // Hover/click listeners. Attached on a STABLE condition (current OR
    // future hover/click animation, or an interaction-bus element) rather than
    // a one-shot read of the animation list, so the editor flipping a trigger
    // TO hover/click after mount still works: the listeners just flip the
    // isHovered/isClicked refs, and the reactive `style` (which reads
    // `anims.value`) then applies the now-present hover/click animation. The
    // listeners are harmless no-ops when no hover/click animation is present.
    if (hasHoverAnims.value || hasClickAnims.value || (interactionBus && elementId)) {
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
      elementRef.value.addEventListener('click', () => {
        isClicked.value = !isClicked.value // toggle
        if (interactionBus && elementId) {
          interactionBus.emit({ elementId, event: 'click', active: isClicked.value })
        }
      })
    }

    if (hasLoopAnims.value) startLoopRaf()
  })

  // React to the editor adding/removing a loop animation without a remount:
  // start the rAF when a loop appears, stop it (and reset loopTime so the next
  // loop starts clean) when the last loop is removed. startLoopRaf is
  // idempotent (guards on loopRafId), so a redundant start is a no-op.
  watch(hasLoopAnims, (has) => {
    if (!elementRef.value) return
    if (has) {
      startLoopRaf()
    } else if (loopRafId !== null) {
      cancelAnimationFrame(loopRafId)
      loopRafId = null
      loopTime.value = 0
    }
  })

  onUnmounted(() => {
    observer?.disconnect()
    if (loopRafId !== null) cancelAnimationFrame(loopRafId)
  })

  // Track depends trigger activations
  const dependsActive = computed(() => {
    if (!hasDependsAnims.value || !interactionBus) return new Map<string, boolean>()
    const map = new Map<string, boolean>()
    for (const anim of anims.value) {
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

  // CSS property name the engine writes for each AnimProp, used to build a
  // PROPERTY-SCOPED transition. A scoped transition (e.g. `opacity 800ms ...`)
  // — never `all` — is critical: an `all` transition also tweens a
  // co-located loop/scroll-driven transform that updates every rAF frame,
  // freezing it into a slow lerp toward a moving target (regression: the
  // scroll-hint loop stopped animating once enter emitted a transition).
  const cssPropFor: Record<AnimProp, string> = {
    opacity: 'opacity',
    transform: 'transform',
    filter: 'filter',
    clipPath: 'clip-path',
  }

  // CSS properties written EVERY rAF frame by a continuous trigger
  // (loop/scroll/mouse/gyroscope). A CSS `transition` must NEVER be emitted for
  // one of these: a hover/click/enter animation on the SAME property (e.g. a
  // hover-rotate while a loop-rotate also writes transform) would otherwise tell
  // the browser to tween every per-frame write toward a moving target — the
  // continuous motion freezes into a slow lerp and looks frozen/laggy on load
  // (the reported flor-surreal "looks frozen/odd"). The continuous animation is
  // its own smooth tween via rAF, so it needs no CSS transition; the
  // discrete-trigger one silently loses its transition on that shared property
  // rather than corrupting the continuous one.
  const CONTINUOUS_TRIGGERS = new Set(['loop', 'scroll', 'mouse', 'gyroscope'])
  // Derived reactively so a trigger changing to/from a continuous trigger
  // recomputes which CSS properties are off-limits for a transition.
  const continuouslyDrivenProps = computed(() => {
    const set = new Set<string>()
    for (const a of anims.value) {
      if (CONTINUOUS_TRIGGERS.has(a.trigger)) {
        const m = animMap[a.type]
        if (m) set.add(cssPropFor[m.prop])
      }
    }
    return set
  })

  const style = computed<CSSProperties>(() => {
    const transforms: string[] = []
    let opacity: number | undefined
    let filter: string | undefined
    let clipPath: string | undefined
    // Property-scoped transitions, de-duped by CSS property (first writer of a
    // property wins, mirroring the previous single-transition behaviour).
    const transitionByProp = new Map<string, string>()

    for (const anim of anims.value) {
      const mapping = animMap[anim.type]
      if (!mapping) continue

      // Reduced motion: no movement/blur. A fade resolves straight to its
      // end state so the element is ALWAYS visible (never a blank box waiting
      // on a scroll/enter that the user disabled motion for) with a short,
      // gentle opacity transition.
      if (reducedMotion.value) {
        if (anim.type === 'fadeIn' || anim.type === 'fadeOut') {
          opacity = anim.to
          if (!transitionByProp.has('opacity')) transitionByProp.set('opacity', 'opacity 200ms ease')
        }
        continue
      }

      let value: number | undefined
      let useTransition = false

      if (anim.trigger === 'enter') {
        value = hasEntered.value ? anim.to : anim.from
        // Always emit the transition (even before entering) so it is already
        // attached to the element when hasEntered flips on the next frame.
        useTransition = true
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

      if (useTransition) {
        const cssProp = cssPropFor[mapping.prop]
        // Never transition a property that a continuous trigger also writes
        // every frame — the transition would lerp/freeze that continuous
        // animation. The discrete-trigger animation still updates the value
        // instantly (its rotate/scale snaps), it just loses the CSS tween on a
        // shared property; the continuous motion stays smooth.
        if (!transitionByProp.has(cssProp) && !continuouslyDrivenProps.value.has(cssProp)) {
          const dur = anim.duration ?? 600
          const delay = anim.delay ?? 0
          transitionByProp.set(
            cssProp,
            `${cssProp} ${dur}ms ${cssEasingFor(anim.easing)} ${delay}ms`,
          )
        }
      }
    }
    const transition = transitionByProp.size > 0
      ? [...transitionByProp.values()].join(', ')
      : undefined

    const result: CSSProperties = {}
    if (transforms.length > 0) result.transform = transforms.join(' ')
    if (opacity !== undefined) result.opacity = opacity
    if (filter) result.filter = filter
    if (clipPath) (result as any).clipPath = clipPath
    if (transition) result.transition = transition
    return result
  })

  return { style, isHovered, isClicked, hasEntered }
}
