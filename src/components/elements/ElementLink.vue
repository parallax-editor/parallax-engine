<script setup lang="ts">
import { inject, computed } from 'vue'
import type { ElementLink } from '../../schema'

const props = defineProps<{ link?: ElementLink }>()

// Inyectados por ParallaxSite. `navigate` emite el evento de navegación
// in-engine; `mode` distingue editor (dev) de sitio publicado (prod).
const navigate = inject<((slug: string) => void) | null>('parallaxNavigate', null)
const mode = inject<'dev' | 'prod'>('parallaxMode', 'prod')

// Navegación a otro sitio: SOLO cuando hay link.site, estamos en prod y hay un
// handler de navegación. En dev (editor) el elemento debe seguir siendo
// editable, así que NO navega.
const isSiteNav = computed(() => !!props.link?.site && mode === 'prod' && !!navigate)

function onSiteNav(e: MouseEvent) {
  e.preventDefault()
  if (props.link?.site && navigate) navigate(props.link.site)
}
</script>

<template>
  <!-- Navegación in-engine a otro sitio (prod): click → emite navigate(slug). -->
  <a
    v-if="isSiteNav"
    href="#"
    :aria-label="link!.ariaLabel"
    class="parallax-element-link"
    @click="onSiteNav"
  >
    <slot />
  </a>
  <!-- Enlace URL normal. -->
  <a
    v-else-if="link && link.href"
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
