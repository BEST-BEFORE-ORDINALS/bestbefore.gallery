# bestbefore.gallery Deployment

## Production Target

- Platform: Cloudflare Pages
- Project name: `bestbefore-gallery`
- Config: `wrangler.toml`
- Build output: `dist`
- Compatibility date: `2024-09-23`

## Local Development

Use the pinned Node version from `.nvmrc`:

```bash
nvm use
npm ci
npm run dev
```

Useful local commands:

```bash
npm run build
npm run verify
npm run preview
```

## Data Preparation

If source text or asset material changed, regenerate the browser-served files before building:

```bash
npm run prepare:data
```

This script depends on local workspace source files outside the repo, so it should be run only in the expected workstation layout.

## CI

GitHub Actions verifies the repo on pushes and pull requests by:

1. installing dependencies with `npm ci`
2. running the production build
3. running the repo standards tests

CI uses the same Node major version pinned in `.nvmrc`.

## Deploy

Authenticate first:

```bash
npx wrangler whoami
```

Then deploy:

```bash
npm run verify
npx wrangler pages deploy dist --project-name=bestbefore-gallery
```

## Routing

`public/_redirects` ensures Cloudflare Pages rewrites route requests to the SPA entrypoint:

```text
/* /index.html 200
```

## Operational Notes

- This repo is static-only today; there are no Pages Functions to deploy.
- The local `dist/` folder is build output and should not be treated as source of truth.
