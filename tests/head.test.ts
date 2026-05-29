import { describe, it, expect } from 'vitest'
import { buildSiteHead } from '../src/utils/head'
import type { SiteMeta } from '../src/schema'

const baseMeta: SiteMeta = {
  title: 'Test',
  fonts: [],
  lang: 'es',
}

describe('buildSiteHead', () => {
  it('returns empty link/style when no fonts', () => {
    const out = buildSiteHead(baseMeta)
    expect(out.link).toEqual([])
    expect(out.style).toEqual([])
  })

  it('emits Google font link with default weight axis + dedupe key', () => {
    const out = buildSiteHead({
      ...baseMeta,
      fonts: [{ family: 'Inter', source: 'google' }],
    })
    expect(out.link).toHaveLength(1)
    const link = out.link[0]
    expect(link.rel).toBe('stylesheet')
    expect(link.href).toContain('family=Inter')
    expect(link.href).toContain('wght@300;400;500;600;700')
    expect(link['data-parallax-font']).toBe('Inter')
    expect(link.key).toBe('parallax-font-Inter')
  })

  it('honors a narrower googleWeights override', () => {
    const out = buildSiteHead(
      { ...baseMeta, fonts: [{ family: 'Inter', source: 'google' }] },
      { googleWeights: '400;700' },
    )
    expect(out.link[0].href).toContain('wght@400;700')
  })

  it('emits @font-face style block for custom fonts', () => {
    const out = buildSiteHead(
      {
        ...baseMeta,
        fonts: [{ family: 'Mystery', source: 'custom', url: 'fonts/mystery.otf' }],
      },
      { assetBase: '/content/home/' },
    )
    expect(out.style).toHaveLength(1)
    const s = out.style[0]
    expect(s.textContent).toContain("font-family: 'Mystery'")
    expect(s.textContent).toContain("url('/content/home/fonts/mystery.otf')")
    expect(s.textContent).toContain('font-display: swap')
    expect(s['data-parallax-font']).toBe('Mystery')
  })

  it('skips custom fonts that lack a url', () => {
    const out = buildSiteHead({
      ...baseMeta,
      fonts: [{ family: 'NoUrl', source: 'custom' }],
    })
    expect(out.style).toEqual([])
    expect(out.link).toEqual([])
  })

  it('escapes spaces in Google family names via URL encoding', () => {
    const out = buildSiteHead({
      ...baseMeta,
      fonts: [{ family: 'Playfair Display', source: 'google' }],
    })
    expect(out.link[0].href).toContain('family=Playfair%20Display')
  })

  it('is idempotent — same input yields byte-identical output', () => {
    const meta: SiteMeta = {
      ...baseMeta,
      fonts: [
        { family: 'Inter', source: 'google' },
        { family: 'Mystery', source: 'custom', url: 'fonts/m.woff2' },
      ],
    }
    expect(buildSiteHead(meta)).toEqual(buildSiteHead(meta))
  })

  it('does not touch absolute custom font URLs', () => {
    const out = buildSiteHead({
      ...baseMeta,
      fonts: [{ family: 'CDN', source: 'custom', url: 'https://cdn.example/x.woff2' }],
    }, { assetBase: '/content/home/' })
    expect(out.style[0].textContent).toContain("url('https://cdn.example/x.woff2')")
  })
})
