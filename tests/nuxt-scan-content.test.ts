/**
 * Build-time content scanning. Uses real `fs` against `mkdtemp` fixtures so
 * the directory traversal + slug filtering matches what consumers' real
 * `content/` looks like — no mocking around the spots where bugs love to
 * live (case sensitivity, dotfile dirs, hidden site.json typos).
 */
import { describe, expect, it } from 'vitest'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { listSiteSlugs, hasHomeSlug, buildSeoMap } from '../src/nuxt/scanContent'

function makeContent(layout: Record<string, string | null>): string {
  const root = mkdtempSync(resolve(tmpdir(), 'parallax-engine-nuxt-'))
  for (const [path, content] of Object.entries(layout)) {
    const abs = resolve(root, path)
    if (content === null) {
      mkdirSync(abs, { recursive: true })
    } else {
      mkdirSync(resolve(abs, '..'), { recursive: true })
      writeFileSync(abs, content)
    }
  }
  return root
}

describe('nuxt scanContent', () => {
  it('lists slugs that contain a site.json, in directory order', () => {
    const root = makeContent({
      'aurora/site.json': '{"meta":{"title":"A"}}',
      'bravo/site.json': '{"meta":{"title":"B"}}',
      'charlie/README.md': 'no site.json here', // skipped
      'delta/site.json': '{"meta":{"title":"D"}}',
    })
    expect(listSiteSlugs(root).sort()).toEqual(['aurora', 'bravo', 'delta'])
    rmSync(root, { recursive: true, force: true })
  })

  it('excludes homeSlug when provided', () => {
    const root = makeContent({
      'home/site.json': '{"meta":{"title":"Home"}}',
      'alpha/site.json': '{"meta":{"title":"A"}}',
    })
    expect(listSiteSlugs(root, 'home').sort()).toEqual(['alpha'])
    rmSync(root, { recursive: true, force: true })
  })

  it('hasHomeSlug returns true when home/site.json exists, false otherwise', () => {
    const root = makeContent({ 'home/site.json': '{"meta":{"title":"H"}}' })
    expect(hasHomeSlug(root, 'home')).toBe(true)
    expect(hasHomeSlug(root, 'landing')).toBe(false)
    rmSync(root, { recursive: true, force: true })
  })

  it('listSiteSlugs returns [] for a missing root (consumer hasnt created content/ yet)', () => {
    expect(listSiteSlugs(resolve(tmpdir(), 'parallax-engine-nuxt-DOESNOTEXIST'))).toEqual([])
  })

  it('buildSeoMap extracts only meta + normalises relative ogImage', () => {
    const root = makeContent({
      'aurora/site.json': JSON.stringify({
        meta: { title: 'Aurora', description: 'Desc', ogImage: 'images/og.png', lang: 'es' },
        sections: [],
      }),
      'bravo/site.json': JSON.stringify({
        meta: { title: 'Bravo', ogImage: 'https://cdn.example.com/og.png' },
      }),
      'charlie/site.json': JSON.stringify({
        meta: { title: 'Charlie', ogImage: '/static/og.png' },
      }),
      'delta/site.json': '{"meta":{', // malformed
    })
    const map = buildSeoMap(root, ['aurora', 'bravo', 'charlie', 'delta'])
    expect(map.aurora).toEqual({
      title: 'Aurora',
      description: 'Desc',
      ogImage: '/content/aurora/images/og.png', // relative → prefixed
      lang: 'es',
    })
    expect(map.bravo.ogImage).toBe('https://cdn.example.com/og.png') // absolute kept
    expect(map.charlie.ogImage).toBe('/static/og.png') // root-relative kept
    expect(map.delta).toBeUndefined() // malformed → silently skipped
    rmSync(root, { recursive: true, force: true })
  })
})
