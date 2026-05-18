<script setup lang="ts">
import { computed, ref, inject, type Ref, type ComputedRef, type Component } from 'vue'
import type { ComponentElement } from '../../schema'
import type { DeviceType } from '../../composables/useResponsive'
import type { EngineError } from '../../composables/useErrorHandler'
import { mergeResponsiveOverrides } from '../../composables/useResponsive'
import { resolveUnit } from '../../utils/units'
import { useElementAnimations } from '../../composables/useElementAnimations'

const props = defineProps<{ element: ComponentElement }>()

const elementRef = ref<HTMLElement | null>(null)
const sectionProgress = inject<Ref<number>>('sectionProgress', ref(0))
const reducedMotion = inject<Ref<boolean>>('reducedMotion', ref(false))
const device = inject<Ref<DeviceType>>('parallaxDevice', ref('desktop'))
const components = inject<ComputedRef<Record<string, Component>>>('parallaxComponents', computed(() => ({})))
const reportError = inject<(e: EngineError) => void>('parallaxReportError', () => {})

const el = computed(() => mergeResponsiveOverrides(props.element, device.value))

const resolvedComponent = computed(() => {
  const name = el.value.name
  const comp = components.value[name]
  if (!comp) {
    reportError({
      path: `element.component.${name}`,
      message: `Component "${name}" is not registered`,
      suggestion: `Register it via the components prop on <ParallaxSite> or in parallax.config.ts`,
    })
    return null
  }
  return comp
})

const { style: animStyle } = useElementAnimations({
  animations: props.element.animations,
  sectionProgress,
  reducedMotion,
  elementRef,
})

const positionStyle = computed(() => {
  const e = el.value
  const base: Record<string, string | number> = {
    position: 'absolute',
    left: resolveUnit(e.position.x),
    top: resolveUnit(e.position.y),
  }
  if (e.size?.width != null) base.width = resolveUnit(e.size.width)
  if (e.size?.height != null) base.height = resolveUnit(e.size.height)
  return base
})

const mergedStyle = computed(() => {
  const pos = { ...positionStyle.value }
  const anim = animStyle.value
  if (anim.transform) pos.transform = anim.transform as string
  if (anim.opacity !== undefined) pos.opacity = anim.opacity
  if (anim.transition) pos.transition = anim.transition as string
  return pos
})
</script>

<template>
  <div
    v-if="el.visible !== false && resolvedComponent"
    ref="elementRef"
    :style="mergedStyle"
    class="parallax-component-element"
  >
    <component :is="resolvedComponent" v-bind="el.props || {}" />
  </div>
</template>

<style scoped>
.parallax-component-element {
  pointer-events: auto;
}
</style>
