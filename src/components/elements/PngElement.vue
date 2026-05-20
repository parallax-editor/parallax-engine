<script setup lang="ts">
import { computed, ref, inject, type Ref } from 'vue'
import type { PngElement } from '../../schema'
import type { DeviceType } from '../../composables/useResponsive'
import { mergeResponsiveOverrides } from '../../composables/useResponsive'
import { resolveUnit, resolveElementPosition, resolveAnchorObjectPosition, isElementInteractive } from '../../utils/units'
import { useElementAnimations } from '../../composables/useElementAnimations'
import ElementLink from './ElementLink.vue'

const props = defineProps<{ element: PngElement }>()

const elementRef = ref<HTMLElement | null>(null)
const sectionProgress = inject<Ref<number>>('sectionProgress', ref(0))
const reducedMotion = inject<Ref<boolean>>('reducedMotion', ref(false))
const device = inject<Ref<DeviceType>>('parallaxDevice', ref('desktop'))

const el = computed(() => mergeResponsiveOverrides(props.element, device.value))

const { style: animStyle } = useElementAnimations({
  // Reactive getter (merged source) so editing an element's animations updates
  // the live preview without remounting the engine, and per-device animation
  // overrides stay reactive.
  animations: () => el.value.animations,
  sectionProgress,
  reducedMotion,
  elementRef,
  elementId: props.element.id,
})

// Single source of truth (utils/isElementInteractive): a hover/click animation
// makes the element pointer-events:auto even with interactive:false and no link.
const isInteractive = computed(() =>
  isElementInteractive({
    interactive: el.value.interactive,
    link: el.value.link,
    animations: el.value.animations,
  }),
)

const positionStyle = computed(() => {
  const e = el.value
  const base: Record<string, string | number> = resolveElementPosition(e)
  const hasWidth = e.size?.width != null
  const hasHeight = e.size?.height != null
  if (hasWidth) base.width = resolveUnit(e.size!.width!)
  if (hasHeight) base.height = resolveUnit(e.size!.height!)
  // When the author sizes the image (e.g. a full-bleed background:
  // size {100%,100%}, pos {0,0}, anchor top-left), the <img> box is the
  // intended box but a replaced element with an explicit size defaults to
  // object-fit:fill (distorts) — and with only one axis set it keeps its
  // intrinsic aspect (letterboxes/overflows, never covers). Default sized
  // png to object-fit:cover so the photo fills the box edge-to-edge with no
  // distortion, and object-position from the anchor so a non-centered anchor
  // crops toward the anchored side. Unsized png keep natural rendering.
  if (hasWidth || hasHeight) {
    base.objectFit = 'cover'
    base.objectPosition = resolveAnchorObjectPosition(e.anchor)
  }
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
