# Changelog

## 2026-10-12
- Add pre-rendered section, diary and individual work pages with canonical URLs, structured data and a full sitemap.
- Preserve legacy links and lightbox history while making work links crawlable.
- Add 435 individual social cards, cropped cleanly to the artwork without a frame.
- Feature 233 and 133 in Process, 189 in Exhibition, and credit Lemonhaze’s opening quote.

## 2026-03-05
- Added repo docs for architecture, data sources, and deployment.
- Added Node version pinning, EditorConfig, CODEOWNERS, Dependabot, PR template, and Cloudflare Pages config.
- Updated CI to use the pinned Node version and a single `npm run verify` gate.
- Expanded standards tests to enforce repo docs and governance/config files.

## 2026-03-05
- Added MIT license.
- Added baseline governance docs (`CONTRIBUTING.md`, `SECURITY.md`).
- Added standards test suite (`tests/standards.test.mjs`).
- Added CI workflow for build + tests.
- Added `test` and `verify` scripts in `package.json`.
