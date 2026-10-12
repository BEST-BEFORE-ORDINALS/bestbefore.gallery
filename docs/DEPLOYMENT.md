# bestbefore.gallery Deployment

## Production Target

- Platform: Cloudflare Pages
- Project name: `best-before`
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
SITE_URL=https://bestbefore.gallery npm run verify
npx wrangler pages deploy dist --project-name=best-before --branch=main
```

## Routing

`npm run build` pre-renders 435 HTML documents and generates the sitemap and
robots.txt. `SITE_URL` supplies their absolute metadata origin. Cloudflare serves
`work/133.html` at `/work/133`. Old numeric work paths have explicit 301 redirects;
old hash bookmarks migrate client-side. Unknown paths and missing assets return
404, not the application shell.

After changing artwork previews or card design, run `npm run prepare:social`
before verification. The 435 generated JPEG cards are committed source assets.
Verify a clean work URL without JavaScript, its social image, the sitemap and an
unknown URL on the preview deployment before shipping production.

## Operational Notes

- This repo is static-only today; there are no Pages Functions to deploy.
- The local `dist/` folder is build output and should not be treated as source of truth.

## Grid/canvas preview branch

The redesign received visual approval for production on October 12, 2026.
Use the explicit production command above for approved releases; use the preview
branch below when reviewing further visual changes.
The existing Pages domain is `best-before-ctf.pages.dev`.

```sh
SITE_URL=https://preview-grid-canvas-redesign.best-before-ctf.pages.dev npm run verify
npx wrangler pages deploy dist --project-name=best-before --branch=preview-grid-canvas-redesign
```

`SITE_URL` sets absolute Open Graph and Twitter card URLs at build time so the
preview card uses the preview's compressed image. It defaults to the production
origin for production builds. No merge is necessary for a direct
Pages preview deployment. Use the returned deployment URL to verify the output.

Validation covers all 420 identities, exclusive statuses, URL parsing, image
budgets and cursor zoom invariants, alongside the existing repository checks.
Browser QA must also cover history/scroll restoration, touch gestures, exports,
and both desktop and mobile layouts. Lighthouse results are measurements of the
specific browser run, not a guarantee for every device or network.
