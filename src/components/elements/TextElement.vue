<script setup lang="ts">
import { computed, ref, inject, type Ref } from 'vue'
import type { TextElement } from '../../schema'
import { resolveUnit } from '../../utils/units'
import { useElementAnimations } from '../../composables/useElementAnimations'

const props = defineProps<{ element: TextElement }>()

const elementRef = ref<HTMLElement | null>(null)
const sectionProgress = inject<Ref<number>>('sectionProgress', ref(0))
const reducedMotion = inject<Ref<boolean>>('reducedMotion', ref(false))

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
  const el = props.element
  const [ox, oy] = anchorOffset[el.anchor] || ['-50%', '-50%']
  const base: Record<string, string | number> = {
    position: 'absolute',
    left: resolveUnit(el.position.x),
    top: resolveUnit(el.position.y),
    transform: `translate(${ox}, ${oy})`,
    transformOrigin: el.anchor.replace('-', ' '),
  }
  if (el.size?.width != null) base.width = resolveUnit(el.size.width)
  if (el.size?.height != null) base.height = resolveUnit(el.size.height)
  if (el.opacity !== 1) base.opacity = el.opacity
  if (el.rotation !== 0) base.transform += ` rotate(${el.rotation}deg)`
  if (el.font) base.fontFamily = el.font
  if (el.fontSize) base.fontSize = el.fontSize
  if (el.fontWeight) base.fontWeight = el.fontWeight
  if (el.color) base.color = el.color
  if (el.letterSpacing) base.letterSpacing = el.letterSpacing
  if (el.lineHeight) base.lineHeight = el.lineHeight
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

const tag = computed(() => props.element.semanticTag || 'p')
</script>

<template>
  <component
    v-if="element.visible !== false"
    :is="tag"
    ref="elementRef"
    :style="mergedStyle"
    class="parallax-text-element"
  >
    {{ element.content }}
  </component>
</template>

<style scoped>
.parallax-text-element {
  margin: 0;
  pointer-events: none;
  user-select: none;
}
</style>
