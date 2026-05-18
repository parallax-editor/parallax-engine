<script setup lang="ts">
import { computed, ref, inject, type Ref } from 'vue'
import type { TextElement } from '../../schema'
import type { DeviceType } from '../../composables/useResponsive'
import { mergeResponsiveOverrides } from '../../composables/useResponsive'
import { resolveUnit } from '../../utils/units'
import { useElementAnimations } from '../../composables/useElementAnimations'
import ElementLink from './ElementLink.vue'

const props = defineProps<{ element: TextElement }>()

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

// ─── Split text ────────────────────────────────────────────────────────────────

const splitParts = computed(() => {
  const mode = el.value.splitMode
  if (!mode || mode === 'none') return null
  const text = el.value.content
  if (mode === 'chars') return text.split('')
  if (mode === 'words') return text.split(/(\s+)/) // preserve spaces
  if (mode === 'lines') return text.split('\n')
  return null
})

const stagger = computed(() => el.value.staggerDelay || 50)

// ─── Styles ────────────────────────────────────────────────────────────────────

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
  if (e.font) base.fontFamily = e.font
  if (e.fontSize) base.fontSize = e.fontSize
  if (e.fontWeight) base.fontWeight = e.fontWeight
  if (e.color) base.color = e.color
  if (e.letterSpacing) base.letterSpacing = e.letterSpacing
  if (e.lineHeight) base.lineHeight = e.lineHeight
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

const tag = computed(() => el.value.semanticTag || 'p')
const isInteractive = computed(() => el.value.interactive || !!el.value.link)
</script>

<template>
  <ElementLink v-if="el.visible !== false" :link="el.link">
    <component
      :is="tag"
      ref="elementRef"
      :data-parallax-id="element.id"
      :style="mergedStyle"
      class="parallax-text-element"
      :class="{ interactive: isInteractive }"
      :data-parallax-interactive="isInteractive || undefined"
    >
      <!-- Split text mode -->
      <template v-if="splitParts">
        <span
          v-for="(part, i) in splitParts"
          :key="i"
          class="split-part"
          :style="{
            display: 'inline-block',
            animationDelay: `${i * stagger}ms`,
            whiteSpace: part === ' ' ? 'pre' : undefined,
          }"
        >{{ part }}</span>
      </template>
      <!-- Normal mode -->
      <template v-else>{{ el.content }}</template>
    </component>
  </ElementLink>
</template>

<style scoped>
.parallax-text-element {
  margin: 0;
  pointer-events: none;
  user-select: none;
}
.parallax-text-element.interactive {
  pointer-events: auto;
  cursor: pointer;
}
.split-part {
  opacity: 0;
  transform: translateY(20px);
  animation: splitReveal 0.6s ease forwards;
}
@keyframes splitReveal {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
