<script setup lang="ts">
import { computed, ref, inject, type Ref } from 'vue'
import type { PngElement } from '../../schema'
import type { DeviceType } from '../../composables/useResponsive'
import { mergeResponsiveOverrides } from '../../composables/useResponsive'
import { resolveUnit } from '../../utils/units'
import { useElementAnimations } from '../../composables/useElementAnimations'

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
})

const anchorOffset: Record<string, [string, string]> = {
  'center': ['-50%', '-50%'],
  'top-left': ['0%', '0%'],
  'top-right': ['-100%', '0%'],
  'bottom-left': ['0%', '-100%'],
  'bottom-right': ['-100%', '-100%'],
  'top': ['-50%', '0%'],
  'bottom': ['-50%', '-100%'],
  'left': ['0%', '-50%'],
  'right': ['-100%', '-50%'],
}

const positionStyle = computed(() => {
  const e = el.value
  const [ox, oy] = anchorOffset[e.anchor] || ['-50%', '-50%']
  const base: Record<string, string | number> = {
    position: 'absolute',
    left: resolveUnit(e.position.x),
    top: resolveUnit(e.position.y),
    transform: `translate(${ox}, ${oy})`,
    transformOrigin: (e.anchor || 'center').replace('-', ' '),
  }
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
  if (anim.transition) pos.transition = anim.transition as string
  return pos
})
</script>

<template>
  <img
    v-if="el.visible !== false"
    ref="elementRef"
    :src="el.src"
    :alt="el.alt || ''"
    :style="mergedStyle"
    class="parallax-png-element"
    loading="lazy"
  />
</template>

<style scoped>
.parallax-png-element {
  display: block;
  max-width: none;
  pointer-events: none;
  user-select: none;
}
</style>
