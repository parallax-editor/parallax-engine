/**
 * Shared "is this asset path relative?" check used by `scanContent.ts`
 * (build-time OG image normalisation) and `runtime/utils/prefixAssets.ts`
 * (runtime path prefixing of a loaded site.json). The engine root has its
 * own copy in `utils/units.ts` — that one stays alone so tree-shaking the
 * Nuxt subpath out for non-Nuxt consumers keeps working. Two definitions
 * inside `/nuxt` were one too many; this file is the single source of
 * truth for the module subpath.
 *
 * Returns true for paths that should be prefixed with the site's content
 * base. Everything else (http(s), protocol-relative, root-relative, data:,
 * blob:) is left untouched.
 */
export function isRelativeAsset(p: string): boolean {
  return (
    !p.startsWith('http://') &&
    !p.startsWith('https://') &&
    !p.startsWith('//') &&
    !p.startsWith('/') &&
    !p.startsWith('data:') &&
    !p.startsWith('blob:')
  )
}
