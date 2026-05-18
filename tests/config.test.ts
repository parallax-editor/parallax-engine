import { describe, it, expect } from 'vitest'
import { defineParallaxConfig } from '../src/config'

describe('defineParallaxConfig', () => {
  it('returns the config object as-is', () => {
    const config = defineParallaxConfig({
      components: {
        TestButton: {
          component: {} as any, // mock
          label: 'Test Button',
          description: 'A test button',
          editableProps: {
            text: { type: 'string', label: 'Button Text', default: 'Click' },
            variant: { type: 'select', label: 'Variant', options: ['primary', 'secondary'] },
          },
        },
      },
    })
    expect(config.components.TestButton).toBeDefined()
    expect(config.components.TestButton.label).toBe('Test Button')
    expect(config.components.TestButton.editableProps?.text.type).toBe('string')
  })

  it('handles empty components', () => {
    const config = defineParallaxConfig({ components: {} })
    expect(config.components).toEqual({})
  })
})
