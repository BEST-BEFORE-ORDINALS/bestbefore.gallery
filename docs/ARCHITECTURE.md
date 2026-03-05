# bestbefore.gallery Architecture

## Purpose

This document is the high-level engineering map for `bestbefore.gallery`:

- how the single-page experience boots
- how path-based routing maps to the gallery, about, and vault zones
- where static and live BEST BEFORE data come from
- how the local data-preparation script feeds the production site

## System Components

| Layer | Component | Responsibility |
|---|---|---|
| Frontend | Vite SPA (`index.html`, `src/`) | Carousel, modal, about/FAQ, artists, diary, ledger analytics, deep links |
| Static data | `public/data/*` | Build-ready summary, item roster, diary text, FAQ text |
| Prep pipeline | `scripts/prepare-best-before-data.mjs` | Transforms local source assets and text into browser-served JSON/TXT files |
| External live source | `https://bestbefore.space/best-before.json` | Live phase, palette, block countdown, analytics, and generation timestamp |
| External media | `https://ordinals.com/content/<id>` and `https://bestbefore.space/images/*` | Rendered inscription content and collection preview imagery |
| Hosting | Cloudflare Pages (`wrangler.toml`) | Static hosting and SPA routing deploy target |

## App Flow

### 1. Boot

1. `index.html` boots `src/main.js`.
2. The shell markup for the three-zone experience is rendered first.
3. Critical local files load in parallel:
   - `/data/best-before-summary.json`
   - `/data/best-before-items.json`
   - `/data/bb-diary.txt`
4. The app then attempts to fetch live collection data from `bestbefore.space`.
5. If live data fails, the site continues with local static data instead of hard-failing.

## Experience Zones

### Gallery

- The gallery zone is the primary carousel experience.
- `src/gallery.js` builds carousel items from live data when available, otherwise from static items.
- Preview media is selected by current status:
  - `SEALED` and `EXPIRED` use fixed visual states
  - live/open items use numbered collection preview images

### About

- The about zone renders the project statement, lifecycle framing, and FAQ content.
- Deep links support the full statement and individual FAQ entries.

### Vault

The vault is a tabbed editorial/analytics layer with:

- `artists`
- `diary`
- `analytics` (presented as the ledger)

The vault content is rendered client-side from the shared app state.

## Routing Model

Routing is path-based, not query-based.

Canonical paths include:

- `/gallery`
- `/about`
- `/about/statement`
- `/about/faq/<slug>`
- `/artists`
- `/diary`
- `/diary/<part>`
- `/ledger`
- `/ledger/<section>`
- `/<number>` for direct artwork/card opens

`public/_redirects` rewrites all paths to `index.html` so Cloudflare Pages can serve the SPA correctly.

## Data Boundaries

- `public/data/best-before-summary.json` is the local summary/config source.
- `public/data/best-before-items.json` is the local collection roster.
- `public/data/bb-diary.txt` and related text files drive editorial sections.
- Live collection state from `bestbefore.space` overrides or enriches the local baseline when available.

This means the site is intentionally hybrid:

- local assets provide resilience and editorial control
- live external data provides current block-time truth

## Operational Notes

- The frontend must degrade gracefully when live APIs are unavailable.
- The prep script assumes local source files outside this repo exist in the broader workspace and writes sanitized outputs into `public/data/` and `public/assets/`.
- There are no Cloudflare Functions in this repo today; deployment is static-only.
