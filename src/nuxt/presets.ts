/**
 * Preset defaults. Each preset describes a *complete* sensible default for one
 * of the two abstracted client patterns; a consumer overrides only what
 * actually differs in their case.
 *
 *   - `multi-tenant`  → private, isolated invitations (eventos-style).
 *   - `linked-home`   → public portfolio with an engine-editable home
 *                       (daniela-reyes-site-style).
 *
 * The defaults are intentionally OPINIONATED for the most common case so a
 * fresh consumer needs ~zero config. Anything contentious (analytics, custom
 * URLs) stays empty/off.
 */

import type { ParallaxPreset, ResolvedParallaxOptions, ParallaxModuleOptions } from './types'

interface PresetDefaults {
  homeSlug: string
  publicIndex: boolean
  sitemap: boolean
  ga4Id: string
}

const PRESET_DEFAULTS: Record<ParallaxPreset, PresetDefaults> = {
  // Privacy by default: no indexing, no sitemap, no analytics. These three
  // toggles cover the whole "private" story end-to-end — a stray legacy
  // sitemap.xml or robots.txt cannot leak after this module touches the dir
  // because the module always REGENERATES robots.txt and only emits sitemap
  // when explicitly enabled.
  'multi-tenant': {
    homeSlug: 'home', // unused in this preset but kept for typing
    publicIndex: false,
    sitemap: false,
    ga4Id: '',
  },
  // Indexed by default + sitemap on. GA4 stays empty so a consumer must opt in
  // explicitly via the option or `GA4_ID` env — never silently emit gtag.
  'linked-home': {
    homeSlug: 'home',
    publicIndex: true,
    sitemap: true,
    ga4Id: '',
  },
}

export function resolveOptions(input: ParallaxModuleOptions): ResolvedParallaxOptions {
  const preset = input.preset
  if (preset !== 'multi-tenant' && preset !== 'linked-home') {
    throw new Error(
      `[parallax-engine/nuxt] Invalid preset "${preset}". Expected "multi-tenant" or "linked-home".`,
    )
  }
  const defaults = PRESET_DEFAULTS[preset]
  return {
    preset,
    contentDir: input.contentDir ?? 'content',
    siteUrl: (input.siteUrl ?? process.env.SITE_URL ?? '').replace(/\/$/, ''),
    homeSlug: input.homeSlug ?? defaults.homeSlug,
    publicIndex: input.seo?.publicIndex ?? defaults.publicIndex,
    sitemap: input.seo?.sitemap ?? defaults.sitemap,
    ga4Id: input.seo?.ga4Id ?? defaults.ga4Id ?? process.env.GA4_ID ?? '',
    hasComponentsConfig: Boolean(input.componentsConfig),
  }
}
