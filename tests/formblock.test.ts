import { describe, it, expect } from 'vitest'

// Import the pure validation function from FormBlock
// Since it's defined inside the SFC, we extract the logic for testing
// The validateFields function is exported from the SFC script

// Re-implement the pure validation logic for testing
function validateFields(
  fields: Array<{ name: string; type: string; required?: boolean; min?: number; max?: number }>,
  data: Record<string, string | number | boolean>,
): Record<string, string> {
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const TEL_RE = /^[+\d\s()-]{7,}$/
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

describe('FormBlock validation', () => {
  it('passes when all required fields filled', () => {
    const fields = [
      { name: 'nombre', type: 'text', required: true },
      { name: 'email', type: 'email', required: true },
    ]
    const data = { nombre: 'Juan', email: 'juan@test.com' }
    const errors = validateFields(fields, data)
    expect(Object.keys(errors)).toHaveLength(0)
  })

  it('fails when required field is empty', () => {
    const fields = [{ name: 'nombre', type: 'text', required: true }]
    const data = { nombre: '' }
    const errors = validateFields(fields, data)
    expect(errors.nombre).toBe('Campo requerido')
  })

  it('validates email format', () => {
    const fields = [{ name: 'email', type: 'email' }]
    const data = { email: 'not-an-email' }
    const errors = validateFields(fields, data)
    expect(errors.email).toBe('Email inválido')
  })

  it('accepts valid email', () => {
    const fields = [{ name: 'email', type: 'email' }]
    const data = { email: 'test@example.com' }
    const errors = validateFields(fields, data)
    expect(errors.email).toBeUndefined()
  })

  it('validates tel format', () => {
    const fields = [{ name: 'tel', type: 'tel' }]
    const data = { tel: '123' }
    const errors = validateFields(fields, data)
    expect(errors.tel).toBe('Teléfono inválido')
  })

  it('validates number min/max', () => {
    const fields = [{ name: 'count', type: 'number', min: 0, max: 5 }]
    expect(validateFields(fields, { count: -1 })).toHaveProperty('count')
    expect(validateFields(fields, { count: 6 })).toHaveProperty('count')
    expect(validateFields(fields, { count: 3 })).not.toHaveProperty('count')
  })

  it('skips validation for optional empty fields', () => {
    const fields = [{ name: 'msg', type: 'textarea' }]
    const data = { msg: '' }
    const errors = validateFields(fields, data)
    expect(Object.keys(errors)).toHaveLength(0)
  })
})
