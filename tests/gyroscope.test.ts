import { describe, it, expect } from 'vitest'
import { shouldPromptForGyroPermission } from '../src/composables/useGyroscope'

describe('shouldPromptForGyroPermission', () => {
  it('desktop Chrome ≥152 (requestPermission exists, no touch) → no prompt', () => {
    // The regression: Chrome 152 exposes requestPermission on desktop. The old
    // code treated that as iOS and never attached the listener. The prompt must
    // NOT appear on a device with no sensor.
    expect(shouldPromptForGyroPermission(true, 0, false)).toBe(false)
  })

  it('pre-152 desktop (no requestPermission) → no prompt', () => {
    expect(shouldPromptForGyroPermission(false, 0, false)).toBe(false)
  })

  it('iOS 13+ (requestPermission + touch, not yet granted) → prompt', () => {
    expect(shouldPromptForGyroPermission(true, 5, false)).toBe(true)
  })

  it('iOS already granted this session → no prompt', () => {
    expect(shouldPromptForGyroPermission(true, 5, true)).toBe(false)
  })

  it('Android Chrome (requestPermission + touch) → prompt', () => {
    expect(shouldPromptForGyroPermission(true, 1, false)).toBe(true)
  })

  it('touch device without requestPermission → no prompt', () => {
    expect(shouldPromptForGyroPermission(false, 5, false)).toBe(false)
  })
})
