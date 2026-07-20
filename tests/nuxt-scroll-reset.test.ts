/**
 * Regression guard for the "world opens scrolled down" bug (demo-atlas, jul 2026).
 *
 * Two independent mechanisms could leave a site NOT at the top:
 *
 * 1. In-engine navigation (`link.site` cross-fade): a single `scrollTo(0,0)`
 *    loses the race against any async re-scroll that lands after it
 *    (smooth-scroll libs, browser restoration, trackpad inertia). The incoming
 *    world inherited the outgoing world's offset. Fix: `resetScroll()` re-asserts
 *    the reset across the next two animation frames. This was first shipped as a
 *    TEMPORARY consumer-side patch (demo-atlas `scripts/patch-sitehost-baseurl.mjs`)
 *    "hasta parallax-engine 0.2.7" — this test pins its engine-side landing.
 *
 * 2. bfcache: navigating back/forward across full page loads restores the frozen
 *    tab — scroll included. Guard: `pageshow` + `event.persisted` → reset.
 *    Needed in BOTH hosts: SiteHost (linked-home) and the bare multi-tenant page.
 *
 * Same commit also folds in the other half of that temporary patch: history
 * URLs must respect `app.baseURL` (subpath deploys like GitHub Pages).
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const RUNTIME_ROOT = join(__dirname, '..', 'src', 'nuxt', 'runtime')
const siteHost = readFileSync(join(RUNTIME_ROOT, 'components', 'SiteHost.vue'), 'utf-8')
const slugPage = readFileSync(join(RUNTIME_ROOT, 'pages', 'slug.vue'), 'utf-8')

describe('SiteHost: robust scroll reset on in-engine navigation', () => {
  it('defines resetScroll with a double requestAnimationFrame re-assert', () => {
    const m = siteHost.match(/function resetScroll\(\)[\s\S]*?^}/m)
    expect(m, 'resetScroll() must exist in SiteHost').toBeTruthy()
    const body = m![0]
    const rafCount = (body.match(/requestAnimationFrame\(/g) || []).length
    expect(rafCount, 'resetScroll must re-assert across two animation frames').toBeGreaterThanOrEqual(2)
    const scrollCount = (body.match(/window\.scrollTo\(0, 0\)/g) || []).length
    expect(scrollCount, 'resetScroll must call window.scrollTo(0, 0) three times').toBeGreaterThanOrEqual(3)
  })

  it('go() uses resetScroll, not a bare scrollTo', () => {
    expect(siteHost).toMatch(/current\.value = \{ slug, site \}\s*\n\s*resetScroll\(\)/)
  })

  it('guards against bfcache restoration via pageshow + persisted', () => {
    expect(siteHost).toMatch(/addEventListener\('pageshow'/)
    expect(siteHost).toMatch(/removeEventListener\('pageshow'/)
    expect(siteHost).toMatch(/persisted\) resetScroll\(\)/)
  })
})

describe('SiteHost: history URLs respect app.baseURL (subpath deploys)', () => {
  it('derives APP_BASE from runtimeConfig app.baseURL, normalized to a trailing slash', () => {
    expect(siteHost).toMatch(/const APP_BASE[\s\S]*?app[\s\S]*?baseURL/)
  })
  it('slugToUrl and urlToSlug are APP_BASE-aware', () => {
    expect(siteHost).toMatch(/function slugToUrl[\s\S]*?APP_BASE/)
    expect(siteHost).toMatch(/function urlToSlug[\s\S]*?APP_BASE/)
  })
})

describe('multi-tenant slug page: bfcache guard', () => {
  it('registers pageshow + persisted → scrollTo(0, 0) (bare host has no SiteHost to do it)', () => {
    expect(slugPage).toMatch(/addEventListener\('pageshow'/)
    expect(slugPage).toMatch(/removeEventListener\('pageshow'/)
    expect(slugPage).toMatch(/persisted\) window\.scrollTo\(0, 0\)/)
  })
})
