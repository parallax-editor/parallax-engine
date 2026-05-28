# Publishing @parallax-editor/parallax-engine to npm

Step-by-step for the maintainer to release the engine to the public npm
registry as a **scoped** package under the `@parallax-editor` org.
**Cost: $0/month** — npm is free for public packages forever (no limits on
downloads or bandwidth).

This repo uses **npm Trusted Publishing (OIDC)** — there is no long-lived
`NPM_TOKEN` secret. Each release is authenticated by a short-lived token
that npm mints for the specific GitHub Actions workflow + environment +
tag. If a token ever leaked it would expire in minutes.

The full release flow is automated by `.github/workflows/publish.yml`:
pushing a `vX.Y.Z` tag triggers a CI job that runs tests, builds, and
`npm publish --provenance` using the OIDC token.

## One-time setup

### 1. npm account + org

1. Maintainer has an account at <https://www.npmjs.com>.
2. Organization `parallax-editor` exists.
3. The maintainer is a member of the org with publish rights.

### 2. Enable 2FA on npm (strongly recommended)

1. <https://www.npmjs.com/settings/~/profile> → Two-Factor Authentication.
2. Choose **Authorization & Publishing**.
3. Add your authenticator app (1Password, Authy, Google Authenticator).

### 3. Configure Trusted Publishing on npm

1. Open <https://www.npmjs.com/settings/parallax-editor/trusted-publishers>
   (org Settings → Trusted Publishers).
2. Click **Add trusted publisher** → **GitHub Actions**.
3. Fill in:
   - **Organization or user**: `parallax-editor`
   - **Repository**: `parallax-engine`
   - **Workflow filename**: `publish.yml`
   - **Environment name**: `npm-publish`
4. Save.

(If `Trusted Publishers` is not visible at the org level, configure it at
the package level after the first publish — but for a brand-new package
the org-level config lets the first publish use OIDC directly.)

### 4. Create the `npm-publish` environment in GitHub

1. <https://github.com/parallax-editor/parallax-engine/settings/environments>
   → **New environment** → name `npm-publish`.
2. (Optional, recommended for hardening) Add a required reviewer so each
   publish needs one human approval.
3. Save.

That's it for setup. No tokens, no secrets to rotate.

## Releasing a new version

Inside the `parallax-engine` repo:

```bash
# Make sure main is clean and tests pass
git checkout main
git pull
yarn test
yarn build

# Bump version, commit, tag, push
npm version patch -m "release: v%s"   # or `minor` / `major`
git push
git push --tags
```

Pushing the `vX.Y.Z` tag triggers `.github/workflows/publish.yml`, which:
1. Installs deps with frozen lockfile.
2. Runs `yarn test`.
3. Runs `yarn build`.
4. Runs `npm publish --provenance` using the OIDC token (no NPM_TOKEN).

Watch the run at
<https://github.com/parallax-editor/parallax-engine/actions>.

When green, the new version is live at
<https://www.npmjs.com/package/@parallax-editor/parallax-engine>.

## Verifying the package contents before publishing

```bash
# Show exactly what will be uploaded (without publishing):
npm pack --dry-run

# Or produce the tarball locally to inspect it:
npm pack
tar -tzf parallax-editor-parallax-engine-*.tgz | sort
```

The `files` field in `package.json` whitelists `dist/`, `ai/`, `LICENSE`,
and `README.md`. Source files, tests, and configs are excluded.

## First publish gotchas

- **Scope must be public**: scoped packages default to private. The workflow
  passes `--provenance`; `publishConfig.access = "public"` in `package.json`
  forces public access so manual `npm publish` from your laptop also
  publishes publicly without extra flags.
- **npm version requirement**: Trusted Publishing needs npm 11.5.1+. The
  workflow runs `npm install -g npm@latest` before publishing, so the CI
  step always uses a fresh CLI. For a local publish, upgrade with
  `npm install -g npm@latest`.
- **Environment must exist**: if `npm-publish` doesn't exist as a GitHub
  environment, the job fails immediately ("environment not found"). Create
  it under repo Settings → Environments before tagging the first release.
- **Provenance** (`--provenance`) attaches a signed SLSA attestation from
  GitHub Actions, visible on the package page on npm.

## Rolling a release back

`npm unpublish` is restricted to the first 72 hours after publishing (or
versions with zero downloads). For older versions use `npm deprecate`:

```bash
npm deprecate @parallax-editor/parallax-engine@0.1.2 "Broken build, use 0.1.3"
```

(A manual deprecate from your laptop needs an old-style token because
Trusted Publishing only covers `publish`. Generate a short-lived granular
token for this one operation and revoke it immediately afterwards.)

## Manual publish (fallback)

If for any reason the CI publish doesn't work and you need to publish from
your laptop:

```bash
yarn test && yarn build
npm publish --access public --provenance
```

This needs `npm login` with 2FA — npm will ask for an OTP at publish time.
