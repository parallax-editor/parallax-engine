<script setup lang="ts">
const emit = defineEmits<{ unmute: [] }>()
</script>

<template>
  <button
    class="parallax-unmute-btn"
    @click="emit('unmute')"
    aria-label="Activar sonido"
  >
    🔊
  </button>
</template>

<style scoped>
.parallax-unmute-btn {
  position: absolute;
  bottom: 8px;
  right: 8px;
  z-index: 10;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 50%;
  background: var(--color-accent, rgba(0, 0, 0, 0.6));
  color: var(--color-paper, #fff);
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  transition: transform 0.2s;
}
.parallax-unmute-btn:hover {
  transform: scale(1.1);
}
.parallax-unmute-btn:focus-visible {
  outline: 2px solid var(--color-ink, #000);
  outline-offset: 2px;
}
</style>
