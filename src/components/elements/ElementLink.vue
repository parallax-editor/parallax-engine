<script setup lang="ts">
import type { ElementLink } from '../../schema'

defineProps<{ link?: ElementLink }>()
</script>

<template>
  <a
    v-if="link"
    :href="link.href"
    :target="link.target"
    :rel="link.rel || (link.target === '_blank' ? 'noopener noreferrer' : undefined)"
    :aria-label="link.ariaLabel"
    class="parallax-element-link"
  >
    <slot />
  </a>
  <slot v-else />
</template>

<style scoped>
.parallax-element-link {
  display: contents;
  color: inherit;
  text-decoration: none;
  pointer-events: auto;
  cursor: pointer;
}
</style>
