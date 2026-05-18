import { ref, type Ref } from 'vue'

export type InteractionEvent = 'hover' | 'click' | 'enter'

export interface InteractionPayload {
  elementId: string
  event: InteractionEvent
  active: boolean // true = started (mouseenter/click), false = ended (mouseleave)
}

export interface InteractionBus {
  /** Last interaction that occurred */
  last: Ref<InteractionPayload | null>
  /** Set of currently active element+event combos (e.g. "el-1:hover") */
  activeSet: Ref<Set<string>>
  /** Emit an interaction event */
  emit: (payload: InteractionPayload) => void
  /** Check if a specific element+event is currently active */
  isActive: (elementId: string, event: InteractionEvent) => boolean
}

export function useInteractionBus(): InteractionBus {
  const last = ref<InteractionPayload | null>(null)
  const activeSet = ref<Set<string>>(new Set())

  const key = (id: string, ev: InteractionEvent) => `${id}:${ev}`

  const emit = (payload: InteractionPayload) => {
    last.value = payload
    const k = key(payload.elementId, payload.event)
    if (payload.active) {
      activeSet.value = new Set([...activeSet.value, k])
    } else {
      const next = new Set(activeSet.value)
      next.delete(k)
      activeSet.value = next
    }
  }

  const isActive = (elementId: string, event: InteractionEvent) => {
    return activeSet.value.has(key(elementId, event))
  }

  return { last, activeSet, emit, isActive }
}
