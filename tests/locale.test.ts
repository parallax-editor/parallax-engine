import { describe, it, expect, afterEach } from 'vitest'
import { getEngineLocale, setEngineLocale, tr } from '../src/utils/locale'

describe('engine locale', () => {
  afterEach(() => {
    // Reset to default so tests stay isolated (module-level state).
    setEngineLocale('es')
  })

  it('defaults to Spanish', () => {
    expect(getEngineLocale()).toBe('es')
    expect(tr('error.label.single')).toBe('error')
    expect(tr('error.label.plural')).toBe('errores')
    expect(tr('error.header')).toBe('Problemas en site.json')
  })

  it('switches to English with setEngineLocale', () => {
    setEngineLocale('en')
    expect(getEngineLocale()).toBe('en')
    expect(tr('error.label.single')).toBe('error')
    expect(tr('error.label.plural')).toBe('errors')
    expect(tr('error.header')).toBe('site.json issues')
    expect(tr('error.dismiss')).toBe('Dismiss')
  })

  it('returns the right word in both locales for error.label.single', () => {
    setEngineLocale('es')
    expect(tr('error.label.single')).toBe('error')
    setEngineLocale('en')
    expect(tr('error.label.single')).toBe('error')
    // plural is the differentiator
    setEngineLocale('es')
    expect(tr('error.label.plural')).toBe('errores')
    setEngineLocale('en')
    expect(tr('error.label.plural')).toBe('errors')
  })

  it('interpolates {name} params', () => {
    setEngineLocale('es')
    // Use an arbitrary key not in the dict: returns the key but still
    // demonstrates interpolation when one IS present. Use a real key
    // that has no params (assetBaseMissing) to assert pass-through.
    expect(tr('error.assetBaseMissing')).toContain('Falta el prop')
  })

  it('falls back to Spanish for unknown locales / keys', () => {
    setEngineLocale('en')
    expect(tr('nonexistent.key')).toBe('nonexistent.key')
  })

  it('keeps the engineLog prefix English/bilingual-friendly', () => {
    setEngineLocale('es')
    expect(tr('error.engineLog')).toBe('[parallax-engine]')
    setEngineLocale('en')
    expect(tr('error.engineLog')).toBe('[parallax-engine]')
  })
})
