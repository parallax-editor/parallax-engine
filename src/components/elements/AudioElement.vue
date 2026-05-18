<script setup lang="ts">
import { ref, computed, inject, onMounted, onUnmounted, type Ref } from 'vue'
import type { AudioElement } from '../../schema'
import type { DeviceType } from '../../composables/useResponsive'
import { mergeResponsiveOverrides } from '../../composables/useResponsive'
import { resolveUnit, resolveElementPosition } from '../../utils/units'
import UnmuteButton from '../UnmuteButton.vue'

const props = defineProps<{ element: AudioElement }>()

const audioRef = ref<HTMLAudioElement | null>(null)
const device = inject<Ref<DeviceType>>('parallaxDevice', ref('desktop'))
const el = computed(() => mergeResponsiveOverrides(props.element, device.value))

const isVisible = ref(false)
const isMuted = ref(true)
let observer: IntersectionObserver | null = null

onMounted(() => {
  // Lazy load: only set src when visible
  const wrapper = audioRef.value?.parentElement
  if (!wrapper) return
  observer = new IntersectionObserver(
    (entries) => {
      const wasVisible = isVisible.value
      isVisible.value = entries[0]?.isIntersecting ?? false
      if (isVisible.value && !wasVisible && audioRef.value) {
        audioRef.value.src = el.value.src
        if (el.value.autoplay) audioRef.value.play().catch(() => {})
      }
      // Pause when leaving viewport
      if (!isVisible.value && wasVisible && audioRef.value) {
        audioRef.value.pause()
      }
    },
    { rootMargin: '200px' },
  )
  observer.observe(wrapper)
})

onUnmounted(() => { observer?.disconnect() })

function handleUnmute() {
  if (audioRef.value) {
    audioRef.value.muted = false
    isMuted.value = false
  }
}

const positionStyle = computed(() => {
  const e = el.value
  const base: Record<string, string | number> = resolveElementPosition(e)
  if (e.size?.width != null) base.width = resolveUnit(e.size.width)
  return base
})
</script>

<template>
  <div v-if="el.visible !== false" :style="positionStyle" class="parallax-audio-element">
    <audio
      ref="audioRef"
      :muted="el.muted !== false"
      :loop="el.loopMedia || false"
      :volume="el.volume ?? 1"
      :controls="el.controls || false"
      preload="none"
    />
    <UnmuteButton v-if="isMuted && isVisible && el.autoplay" @unmute="handleUnmute" />
  </div>
</template>

<style scoped>
.parallax-audio-element {
  pointer-events: auto;
}
</style>
