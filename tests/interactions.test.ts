import { describe, it, expect } from 'vitest'
import { useInteractionBus } from '../src/composables/useInteractionBus'

describe('InteractionBus', () => {
  it('emits and tracks active state', () => {
    const bus = useInteractionBus()
    expect(bus.isActive('el-1', 'hover')).toBe(false)

    bus.emit({ elementId: 'el-1', event: 'hover', active: true })
    expect(bus.isActive('el-1', 'hover')).toBe(true)
    expect(bus.last.value?.elementId).toBe('el-1')

    bus.emit({ elementId: 'el-1', event: 'hover', active: false })
    expect(bus.isActive('el-1', 'hover')).toBe(false)
  })

  it('tracks multiple elements independently', () => {
    const bus = useInteractionBus()
    bus.emit({ elementId: 'el-1', event: 'hover', active: true })
    bus.emit({ elementId: 'el-2', event: 'click', active: true })

    expect(bus.isActive('el-1', 'hover')).toBe(true)
    expect(bus.isActive('el-2', 'click')).toBe(true)
    expect(bus.isActive('el-1', 'click')).toBe(false)
  })

  it('handles enter events', () => {
    const bus = useInteractionBus()
    bus.emit({ elementId: 'el-1', event: 'enter', active: true })
    expect(bus.isActive('el-1', 'enter')).toBe(true)
  })
})
