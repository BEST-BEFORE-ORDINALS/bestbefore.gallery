# Changelog

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
