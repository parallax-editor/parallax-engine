/**
 * Pure option resolution for the Nuxt module presets. Doesn't touch
 * @nuxt/kit (kept out of the test dep graph) — every reachable branch of
 * resolveOptions is exercised here against the two presets so a regression
 * in preset defaults breaks loudly.
 */
import { describe, expect, it } from 'vitest'
import { resolveOptions } from '../src/nuxt/presets'

describe('nuxt presets — resolveOptions', () => {
  it('multi-tenant: private by default (no index, no sitemap, no GA4)', () => {
    const r = resolveOptions({ preset: 'multi-tenant' })
    expect(r.preset).toBe('multi-tenant')
    expect(r.publicIndex).toBe(false)
    expect(r.sitemap).toBe(false)
    expect(r.ga4Id).toBe('')
    expect(r.contentDir).toBe('content')
    expect(r.homeSlug).toBe('home') // never used in this preset but defaulted
  })

  it('linked-home: public by default (index + sitemap on)', () => {
    const r = resolveOptions({ preset: 'linked-home' })
    expect(r.publicIndex).toBe(true)
    expect(r.sitemap).toBe(true)
    expect(r.ga4Id).toBe('') // never auto — must be set explicitly
  })

  it('consumer overrides win over preset defaults', () => {
    const r = resolveOptions({
      preset: 'multi-tenant',
      seo: { publicIndex: true, sitemap: true, ga4Id: 'G-XXXX' },
    })
    expect(r.publicIndex).toBe(true)
    expect(r.sitemap).toBe(true)
    expect(r.ga4Id).toBe('G-XXXX')
  })

  it('contentDir + siteUrl + homeSlug all override + siteUrl trailing slash stripped', () => {
    const r = resolveOptions({
      preset: 'linked-home',
      contentDir: 'sites',
      siteUrl: 'https://example.com/',
      homeSlug: 'landing',
    })
    expect(r.contentDir).toBe('sites')
    expect(r.siteUrl).toBe('https://example.com')
    expect(r.homeSlug).toBe('landing')
  })

  it('hasComponentsConfig flips when componentsConfig is provided', () => {
    const off = resolveOptions({ preset: 'linked-home' })
    expect(off.hasComponentsConfig).toBe(false)
    const on = resolveOptions({ preset: 'linked-home', componentsConfig: './parallax.config.ts' })
    expect(on.hasComponentsConfig).toBe(true)
  })

  it('invalid preset throws with a useful message', () => {
    expect(() => resolveOptions({ preset: 'whatever' as any })).toThrow(/Invalid preset/)
  })
})
