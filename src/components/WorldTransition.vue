<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import type { Site } from '../schema'

export interface TransitionConfig {
  type: 'fade' | 'wipe' | 'crossfade-blur' | 'zoom' | 'page-flip'
  duration: number
}

const props = defineProps<{
  from: Site | null
  to: Site
  transition: TransitionConfig
}>()

const emit = defineEmits<{ complete: [] }>()

const phase = ref<'idle' | 'transitioning' | 'done'>('idle')
const progress = ref(0)
let animRafId: number | null = null
let startTime = 0

function startTransition() {
  if (!props.from) {
    phase.value = 'done'
    emit('complete')
    return
  }
  phase.value = 'transitioning'
  startTime = performance.now()

  function tick(now: number) {
    const elapsed = now - startTime
    progress.value = Math.min(1, elapsed / props.transition.duration)
    if (progress.value >= 1) {
      phase.value = 'done'
      emit('complete')
      return
    }
    animRafId = requestAnimationFrame(tick)
  }
  animRafId = requestAnimationFrame(tick)
}

onUnmounted(() => {
  if (animRafId !== null) cancelAnimationFrame(animRafId)
})

onMounted(() => {
  if (props.from) startTransition()
  else {
    phase.value = 'done'
    emit('complete')
  }
})

watch(() => props.to, () => {
  progress.value = 0
  startTransition()
})

const fromStyle = computed(() => {
  if (phase.value === 'done') return { display: 'none' }
  const p = progress.value
  const t = props.transition.type

  const style: Record<string, string> = {
    position: 'absolute',
    inset: '0',
    zIndex: '1',
  }

  if (t === 'fade') {
    style.opacity = `${1 - p}`
  } else if (t === 'wipe') {
    style.clipPath = `inset(0 0 0 ${p * 100}%)`
  } else if (t === 'crossfade-blur') {
    style.opacity = `${1 - p}`
    style.filter = `blur(${p * 10}px)`
  } else if (t === 'zoom') {
    style.opacity = `${1 - p}`
    style.transform = `scale(${1 + p * 0.3})`
  } else if (t === 'page-flip') {
    style.transform = `perspective(1200px) rotateY(${-p * 90}deg)`
    style.transformOrigin = 'left center'
    style.backfaceVisibility = 'hidden'
  }

  return style
})

const toStyle = computed(() => {
  if (phase.value === 'done') return {}
  const p = progress.value
  const t = props.transition.type

  const style: Record<string, string> = {
    position: 'absolute',
    inset: '0',
    zIndex: '0',
  }

  if (t === 'fade') {
    style.opacity = `${p}`
  } else if (t === 'crossfade-blur') {
    style.opacity = `${p}`
    style.filter = `blur(${(1 - p) * 10}px)`
  } else if (t === 'page-flip') {
    style.transform = `perspective(1200px) rotateY(${(1 - p) * 90}deg)`
    style.transformOrigin = 'right center'
    style.backfaceVisibility = 'hidden'
  }

  return style
})
</script>

<template>
  <div class="world-transition" style="position: relative; overflow: hidden;">
    <!-- Outgoing world -->
    <div v-if="from && phase === 'transitioning'" :style="fromStyle">
      <slot name="from" />
    </div>
    <!-- Incoming world -->
    <div :style="toStyle">
      <slot name="to" />
    </div>
  </div>
</template>
