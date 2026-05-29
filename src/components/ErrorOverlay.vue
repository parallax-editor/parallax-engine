<script setup lang="ts">
import { inject, type Ref } from 'vue'
import type { EngineError } from '../composables/useErrorHandler'
import { tr } from '../utils/locale'

const errors = inject<Ref<EngineError[]>>('parallaxErrors')
const emit = defineEmits<{ dismiss: [] }>()

function errorLabel(count: number): string {
  return count > 1 ? tr('error.label.plural') : tr('error.label.single')
}
</script>

<template>
  <div v-if="errors && errors.length > 0" class="parallax-error-overlay">
    <div class="parallax-error-header">
      <span>{{ tr('error.engineLog') }} {{ errors.length }} {{ errorLabel(errors.length) }}</span>
      <button @click="emit('dismiss')" class="parallax-error-close" :aria-label="tr('error.dismiss')">&times;</button>
    </div>
    <ul class="parallax-error-list">
      <li v-for="(err, i) in errors" :key="i" class="parallax-error-item">
        <code class="parallax-error-path">{{ err.path }}</code>
        <span class="parallax-error-msg">{{ err.message }}</span>
        <span v-if="err.suggestion" class="parallax-error-suggestion">💡 {{ err.suggestion }}</span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.parallax-error-overlay {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  max-height: 40vh;
  overflow-y: auto;
  background: rgba(180, 20, 20, 0.95);
  color: #fff;
  font-family: monospace;
  font-size: 13px;
  z-index: 99999;
  padding: 12px 16px;
}
.parallax-error-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: bold;
  margin-bottom: 8px;
}
.parallax-error-close {
  background: none;
  border: none;
  color: #fff;
  font-size: 20px;
  cursor: pointer;
}
.parallax-error-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.parallax-error-item {
  padding: 4px 0;
  border-top: 1px solid rgba(255,255,255,0.2);
}
.parallax-error-path {
  color: #ffb3b3;
  margin-right: 8px;
}
.parallax-error-suggestion {
  display: block;
  color: #ffe0b3;
  margin-top: 2px;
}
</style>
