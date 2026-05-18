<script setup lang="ts">
import { computed, ref, inject, type Ref } from 'vue'
import type { PngElement } from '../../schema'
import type { DeviceType } from '../../composables/useResponsive'
import { mergeResponsiveOverrides } from '../../composables/useResponsive'
import { resolveUnit, resolveElementPosition } from '../../utils/units'
import { useElementAnimations } from '../../composables/useElementAnimations'
import ElementLink from './ElementLink.vue'

const props = defineProps<{ element: PngElement }>()

const elementRef = ref<HTMLElement | null>(null)
const sectionProgress = inject<Ref<number>>('sectionProgress', ref(0))
const reducedMotion = inject<Ref<boolean>>('reducedMotion', ref(false))
const device = inject<Ref<DeviceType>>('parallaxDevice', ref('desktop'))

const el = computed(() => mergeResponsiveOverrides(props.element, device.value))

const { style: animStyle } = useElementAnimations({
  animations: props.element.animations,
  sectionProgress,
  reducedMotion,
  elementRef,
  elementId: props.element.id,
})

const isInteractive = computed(() => el.value.interactive || !!el.value.link)

const positionStyle = computed(() => {
  const e = el.value
  const base: Record<string, string | number> = resolveElementPosition(e)
  if (e.size?.width != null) base.width = resolveUnit(e.size.width)
  if (e.size?.height != null) base.height = resolveUnit(e.size.height)
  if (e.opacity !== 1) base.opacity = e.opacity
  if (e.rotation !== 0) base.transform += ` rotate(${e.rotation}deg)`
  return base
})

const mergedStyle = computed(() => {
  const pos = { ...positionStyle.value }
  const anim = animStyle.value
  if (anim.transform) pos.transform = `${pos.transform || ''} ${anim.transform}`.trim()
  if (anim.opacity !== undefined) pos.opacity = anim.opacity
  if (anim.filter) pos.filter = anim.filter as string
  if ((anim as any).clipPath) (pos as any).clipPath = (anim as any).clipPath
  if (anim.transition) pos.transition = anim.transition as string
  return pos
})
</script>

<template>
  <ElementLink v-if="el.visible !== false" :link="el.link">
    <img
      ref="elementRef"
      :data-parallax-id="element.id"
      :src="el.src"
      :alt="el.alt || ''"
      :style="mergedStyle"
      class="parallax-png-element"
      :class="{ interactive: isInteractive }"
      :data-parallax-interactive="isInteractive || undefined"
      loading="lazy"
    />
  </ElementLink>
</template>

<style scoped>
.parallax-png-element {
  display: block;
  max-width: none;
  pointer-events: none;
  user-select: none;
}
.parallax-png-element.interactive {
  pointer-events: auto;
  cursor: pointer;
}
</style>
