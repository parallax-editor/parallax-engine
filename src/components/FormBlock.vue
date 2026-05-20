<script setup lang="ts">
import { ref, computed } from 'vue'

interface FormField {
  name: string
  label: string
  type: 'text' | 'email' | 'tel' | 'number' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'date'
  required?: boolean
  options?: string[]
  min?: number
  max?: number
}

interface FormStyling {
  inputBg?: string
  inputBorder?: string
  inputText?: string
  buttonBg?: string
  buttonText?: string
  fontFamily?: string
}

const props = withDefaults(defineProps<{
  webhookUrl: string
  fields: FormField[]
  submitLabel?: string
  successMessage?: string
  errorMessage?: string
  honeypotField?: string
  styling?: FormStyling
}>(), {
  submitLabel: 'Enviar',
  successMessage: '¡Enviado correctamente!',
  errorMessage: 'Hubo un error. Intenta de nuevo.',
})

type FormState = 'idle' | 'submitting' | 'success' | 'error'

const state = ref<FormState>('idle')
const formData = ref<Record<string, any>>({})
const honeypotValue = ref('')
const fieldErrors = ref<Record<string, string>>({})

// Initialize form data with defaults
for (const field of props.fields) {
  if (field.type === 'checkbox') {
    formData.value[field.name] = false
  } else if (field.type === 'number') {
    formData.value[field.name] = field.min ?? 0
  } else {
    formData.value[field.name] = ''
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const TEL_RE = /^[+\d\s()-]{7,}$/

function validateFields(
  fields: FormField[],
  data: Record<string, string | number | boolean>,
): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const field of fields) {
    const val = data[field.name]
    if (field.required && (val === '' || val === undefined || val === null)) {
      errors[field.name] = 'Campo requerido'
      continue
    }
    if (field.type === 'email' && typeof val === 'string' && val && !EMAIL_RE.test(val)) {
      errors[field.name] = 'Email inválido'
    }
    if (field.type === 'tel' && typeof val === 'string' && val && !TEL_RE.test(val)) {
      errors[field.name] = 'Teléfono inválido'
    }
    if (field.type === 'number' && typeof val === 'number') {
      if (field.min !== undefined && val < field.min) errors[field.name] = `Mínimo: ${field.min}`
      if (field.max !== undefined && val > field.max) errors[field.name] = `Máximo: ${field.max}`
    }
  }
  return errors
}

async function handleSubmit() {
  // Honeypot check
  if (props.honeypotField && honeypotValue.value) {
    state.value = 'success' // silently pretend success
    return
  }

  const errors = validateFields(props.fields, formData.value)
  fieldErrors.value = errors
  if (Object.keys(errors).length > 0) return

  state.value = 'submitting'
  try {
    const response = await fetch(props.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData.value),
    })
    state.value = response.ok ? 'success' : 'error'
  } catch {
    state.value = 'error'
  }
}

const formStyle = computed(() => {
  const s = props.styling
  if (!s) return {}
  return {
    '--form-input-bg': s.inputBg,
    '--form-input-border': s.inputBorder,
    '--form-input-text': s.inputText,
    '--form-button-bg': s.buttonBg,
    '--form-button-text': s.buttonText,
    '--form-font': s.fontFamily,
  } as Record<string, string | undefined>
})
</script>

<template>
  <form
    v-if="state === 'idle' || state === 'submitting'"
    class="parallax-form"
    :style="formStyle"
    @submit.prevent="handleSubmit"
    novalidate
  >
    <div v-for="field in fields" :key="field.name" class="form-field">
      <label :for="`pf-${field.name}`">
        {{ field.label }}
        <span v-if="field.required" aria-hidden="true">*</span>
      </label>

      <input
        v-if="['text', 'email', 'tel', 'date'].includes(field.type)"
        :id="`pf-${field.name}`"
        :type="field.type"
        :required="field.required"
        v-model="formData[field.name]"
        :aria-invalid="!!fieldErrors[field.name]"
      />

      <input
        v-else-if="field.type === 'number'"
        :id="`pf-${field.name}`"
        type="number"
        :min="field.min"
        :max="field.max"
        :required="field.required"
        v-model.number="formData[field.name]"
        :aria-invalid="!!fieldErrors[field.name]"
      />

      <textarea
        v-else-if="field.type === 'textarea'"
        :id="`pf-${field.name}`"
        :required="field.required"
        v-model="formData[field.name]"
        rows="3"
        :aria-invalid="!!fieldErrors[field.name]"
      />

      <select
        v-else-if="field.type === 'select'"
        :id="`pf-${field.name}`"
        :required="field.required"
        v-model="formData[field.name]"
        :aria-invalid="!!fieldErrors[field.name]"
      >
        <option value="" disabled>Seleccionar...</option>
        <option v-for="opt in field.options" :key="opt" :value="opt">{{ opt }}</option>
      </select>

      <div v-else-if="field.type === 'radio'" class="radio-group" role="radiogroup" :aria-labelledby="`pf-${field.name}`">
        <label v-for="opt in field.options" :key="opt" class="radio-label">
          <input type="radio" :name="field.name" :value="opt" v-model="formData[field.name]" />
          {{ opt }}
        </label>
      </div>

      <label v-else-if="field.type === 'checkbox'" class="checkbox-label">
        <input :id="`pf-${field.name}`" type="checkbox" v-model="formData[field.name]" />
        {{ field.label }}
      </label>

      <p v-if="fieldErrors[field.name]" class="field-error" role="alert">
        {{ fieldErrors[field.name] }}
      </p>
    </div>

    <!-- Honeypot -->
    <input
      v-if="honeypotField"
      :name="honeypotField"
      v-model="honeypotValue"
      tabindex="-1"
      autocomplete="off"
      style="position: absolute; left: -9999px; opacity: 0; height: 0;"
      aria-hidden="true"
    />

    <button type="submit" :disabled="state === 'submitting'" class="form-submit">
      {{ state === 'submitting' ? '...' : submitLabel }}
    </button>
  </form>

  <div v-else-if="state === 'success'" class="parallax-form-msg success" aria-live="polite">
    {{ successMessage }}
  </div>

  <div v-else-if="state === 'error'" class="parallax-form-msg error" aria-live="polite" role="alert">
    {{ errorMessage }}
    <button @click="state = 'idle'" class="form-retry">Reintentar</button>
  </div>
</template>

<style scoped>
.parallax-form {
  font-family: var(--form-font, var(--font-body, sans-serif));
  display: flex;
  flex-direction: column;
  gap: 16px;
  pointer-events: auto;
}
.form-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.form-field label {
  font-weight: 600;
  font-size: 14px;
}
.form-field input,
.form-field textarea,
.form-field select {
  padding: 10px 12px;
  border: 1px solid var(--form-input-border, var(--color-ink, #ccc));
  border-radius: 6px;
  background: var(--form-input-bg, var(--color-paper, #fff));
  color: var(--form-input-text, var(--color-ink, inherit));
  font-family: inherit;
  font-size: 14px;
}
.form-field input:focus-visible,
.form-field textarea:focus-visible,
.form-field select:focus-visible {
  outline: 2px solid var(--color-accent, #333);
  outline-offset: 1px;
}
.field-error {
  color: #c00;
  font-size: 12px;
  margin: 0;
}
.form-submit {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  background: var(--form-button-bg, var(--color-accent, #333));
  color: var(--form-button-text, var(--color-paper, #fff));
  font-family: inherit;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}
.form-submit:disabled {
  opacity: 0.6;
  cursor: wait;
}
.form-submit:focus-visible {
  outline: 2px solid var(--color-ink, #000);
  outline-offset: 2px;
}
.parallax-form-msg {
  padding: 24px;
  text-align: center;
  font-size: 18px;
  font-family: var(--form-font, var(--font-body, sans-serif));
}
.form-retry {
  display: block;
  margin: 12px auto 0;
  background: none;
  border: 1px solid currentColor;
  border-radius: 6px;
  padding: 8px 16px;
  cursor: pointer;
  font-family: inherit;
}
</style>
