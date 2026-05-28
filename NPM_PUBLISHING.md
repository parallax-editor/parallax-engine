# Publishing @parallax-editor/parallax-engine to npm

Step-by-step for the maintainer to release the engine to the public npm
registry as a **scoped** package under the `@parallax-editor` org.
**Cost: $0/month** — npm is free for public packages forever (no limits on
downloads or bandwidth).

The workflow is fully automated by `.github/workflows/publish.yml`: pushing a
`vX.Y.Z` tag triggers a CI job that runs tests, builds, and `npm publish` with
the secret token.

## One-time setup

### 1. npm account + org

1. Account created at <https://www.npmjs.com>.
2. Organization `parallax-editor` created.

Anyone publishing under the `@parallax-editor` scope must be a member of the
npm org.

### 2. Enable 2FA on npm (strongly recommended)

1. <https://www.npmjs.com/settings/~/profile> → Two-Factor Authentication.
2. Choose **Authorization & Publishing** (not just Authorization) so token-less
   publishes also require 2FA.
3. Add your authenticator app (1Password, Authy, Google Authenticator).

### 3. Generate a granular access token for CI

1. <https://www.npmjs.com/settings/~/tokens/granular-access-tokens/new>.
2. Token name: `parallax-engine GitHub Actions`.
3. Expiration: 1 year (rotate annually).
4. Permissions: **Read and write**.
5. Packages and scopes:
   - First publish (the package doesn't exist on npm yet) → select scope
     `@parallax-editor` with **Read and write** so the token can create the
     package. After the first successful publish you can tighten this to
     "Only select packages" → `@parallax-editor/parallax-engine`.
6. Click **Generate token**. Copy it once — you won't see it again.

### 4. Add the token as a GitHub Actions secret

Easiest from your shell:

```bash
gh secret set NPM_TOKEN \
  --repo parallax-editor/parallax-engine \
  --body "<paste-token-here>"
```

(Or via the web: <https://github.com/parallax-editor/parallax-engine/settings/secrets/actions>
→ New repository secret → name `NPM_TOKEN`.)

That's it for setup. From now on each release is one command.

## Releasing a new version

Inside the `parallax-engine` repo:

```bash
# Make sure main is clean and tests pass
git checkout main
git pull
yarn test
yarn build

# Bump the version, commit, tag, push
npm version patch -m "release: v%s"   # or `minor` / `major`
git push
git push --tags
```

Pushing the `vX.Y.Z` tag triggers `.github/workflows/publish.yml`, which:
1. Installs deps with frozen lockfile.
2. Runs `yarn test`.
3. Runs `yarn build`.
4. Runs `npm publish --access public --provenance` using `NPM_TOKEN`.

Watch the run at <https://github.com/parallax-editor/parallax-engine/actions>.

When it's green, the new version is live at
<https://www.npmjs.com/package/@parallax-editor/parallax-engine>.

## Verifying the package contents before publishing

```bash
# Show exactly what will be uploaded (without publishing):
npm pack --dry-run

# Or produce the tarball locally to inspect it:
npm pack
tar -tzf parallax-editor-parallax-engine-*.tgz | sort
```

The `files` field in `package.json` whitelists `dist/`, `ai/`, `LICENSE`, and
`README.md`. Source files, tests, and configs are excluded.

## First publish gotchas

- **Scope must be public**: scoped packages default to private, which requires
  a paid npm plan. The workflow already passes `--access public`, and
  `publishConfig.access = "public"` is set in `package.json` so a manual
  `npm publish` from your laptop also publishes publicly without extra flags.
- **2FA required during publish**: with "Authorization & Publishing" 2FA, npm
  rejects the publish unless the token was minted *after* enabling 2FA. If you
  ever see `OTP required` from CI, regenerate the token after confirming 2FA
  is set.
- **Provenance** (`--provenance`) attaches a signed SLSA attestation from
  GitHub Actions. Requires the `id-token: write` permission (already declared
  in the workflow). Optional but nice for supply-chain integrity.

## Rolling a release back

`npm unpublish` is restricted to the first 72 hours after publishing (or
versions with zero downloads). For older versions use `npm deprecate` to mark
them broken without removing them:

```bash
npm deprecate @parallax-editor/parallax-engine@0.1.2 "Broken build, use 0.1.3"
```

## Token rotation

Rotate the `NPM_TOKEN` at least once a year (or immediately if compromised):

1. Generate a new granular token (same steps as initial setup, scope it to
   `@parallax-editor/parallax-engine` only).
2. Replace the value of `NPM_TOKEN` in GitHub Settings → Secrets.
3. Revoke the old token at <https://www.npmjs.com/settings/~/tokens>.
