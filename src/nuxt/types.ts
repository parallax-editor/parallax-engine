/**
 * Public option types for the Nuxt module
 * (`@parallax-editor/parallax-engine/nuxt`). Kept in their own file so the
 * runtime composables and the module entry both import the SAME definitions —
 * a consumer's `nuxt.config.ts` type-checks against the same shape that
 * `useSiteContent()` / `useSiteSeo()` see at runtime.
 *
 * Versioning: this is the v0.2.0 public surface. Adding a new field stays
 * additive (optional + a default), removing or renaming one is a breaking
 * change → minor bump until 1.0.
 */

/**
 * Which scaffold the module should set up. `multi-tenant` is for repos where
 * every URL is a private, self-contained site (no home, no cross-links,
 * `robots Disallow: /`, no sitemap, no analytics — e.g. an invitations repo
 * served per URL). `linked-home` is for portfolios where `/` is a special
 * engine-editable "home" site that links out to other sites via `link.site`
 * elements (public, sitemap, optional GA4, in-engine cross-fade navigation
 * via `<SiteHost>` — e.g. a public catalog rooted at one home).
 *
 * Both presets share the same content layout (`content/<slug>/site.json` +
 * `content/<slug>/images/`), asset routing (`/content/<slug>/…`), and
 * runtime composable (`useSiteContent`). The shape of the rendered pages is
 * what diverges.
 */
export type ParallaxPreset = 'multi-tenant' | 'linked-home'

/**
 * Privacy / discoverability knobs derived (with sensible defaults) per preset
 * but always overridable by the consumer. Splitting them out lets a
 * `multi-tenant` repo opt INTO a sitemap (e.g. semi-public catalog of public
 * invitations) or a `linked-home` repo opt OUT (staging deploys).
 */
export interface ParallaxSeoOptions {
  /**
   * When true, the module writes a permissive `robots.txt` (`Allow: /` +
   * sitemap reference). When false, it writes a hard disallow
   * (`User-agent: *\nDisallow: /`). Default: derived from preset
   * (`linked-home` → true, `multi-tenant` → false). The module always
   * generates `robots.txt` so a stray previous version cannot leak
   * indexability.
   */
  publicIndex?: boolean
  /**
   * Generate `sitemap.xml` listing the home (linked-home only) + every
   * known slug under `content/`. Default: derived from preset (`linked-home`
   * → true, `multi-tenant` → false). Always reflects ONLY the slugs that
   * existed at build time — slugs added post-deploy show up after the next
   * `yarn generate`.
   */
  sitemap?: boolean
  /**
   * GA4 measurement ID (e.g. `G-XXXXXXXXXX`). When set, the module
   * injects the standard gtag.js loader + init snippet into `app.head` for
   * every prerendered page. Default: `''` (no analytics). The
   * `multi-tenant` preset leaves this empty — privacy by default.
   */
  ga4Id?: string
}

export interface ParallaxModuleOptions {
  /** See {@link ParallaxPreset}. Required — there is no sane default that fits
   *  both shapes. */
  preset: ParallaxPreset
  /**
   * Where site folders live, relative to the Nuxt project root. Each
   * direct child whose name is a slug and which contains a `site.json` is
   * treated as a site. Default: `'content'`.
   */
  contentDir?: string
  /**
   * Canonical URL of the deployed site, used to build absolute URLs in
   * `<meta property="og:url">` and `sitemap.xml`. Should NOT have a
   * trailing slash. Default: `process.env.SITE_URL` or `''` (relative
   * URLs only).
   */
  siteUrl?: string
  /**
   * Slug treated as the "home" site (rendered at `/`). Only consulted when
   * `preset === 'linked-home'`; ignored for `multi-tenant`. Default:
   * `'home'`. The folder must exist under `contentDir` with a valid
   * `site.json` for the home page to prerender — otherwise the build still
   * succeeds but `/` 404s.
   */
  homeSlug?: string
  /**
   * Path (relative to the Nuxt project root) of the consumer's
   * `parallax.config.ts` — the custom-components catalog passed to
   * `<ParallaxSite :components>`. When set, the module emits a runtime
   * import alias so the engine receives the registry on every page;
   * absent, only the engine's built-in `FormBlock` is available. Default:
   * `undefined` (no custom components — fine for `multi-tenant`).
   */
  componentsConfig?: string
  /**
   * Privacy / SEO knobs. Each field is independently overridable; unspecified
   * fields fall back to the preset's default. See {@link ParallaxSeoOptions}.
   */
  seo?: ParallaxSeoOptions
}

/**
 * Resolved options after preset defaults + consumer overrides have been
 * folded. This is what gets serialized into `runtimeConfig.public.parallax`
 * so the runtime composables / pages can read it without re-resolving the
 * preset. Internal — the consumer only ever fills `ParallaxModuleOptions`.
 */
export interface ResolvedParallaxOptions {
  preset: ParallaxPreset
  contentDir: string
  siteUrl: string
  homeSlug: string
  publicIndex: boolean
  sitemap: boolean
  ga4Id: string
  hasComponentsConfig: boolean
}

/**
 * Build-time SEO snapshot: only the meta subset of `site.json` we feel safe
 * baking into the prerendered HTML for social previews. The full site body
 * stays fetched at runtime — see `useSiteContent`. Keys are slugs.
 */
export interface SiteSeoMap {
  [slug: string]: {
    title: string
    description?: string
    ogImage?: string
    lang?: string
  }
}
