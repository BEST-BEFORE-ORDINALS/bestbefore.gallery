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
- The individual artwork viewer uses the sandboxed Best Before player on desktop and mobile; see “Best Before player and recording” below.
- The artwork frame receives keyboard focus on opening and after switching Solo/Details, so **S** reaches the inscription's PNG export handler. Its existing clickable S control remains accessible in the artwork's information popup. The frame fitting observer and listeners are removed on close/replacement.

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


### Best Before player and recording

The individual viewer fetches the original on-chain HTML and runs it in a `srcdoc` iframe with an opaque origin (`allow-scripts allow-downloads`, without `allow-same-origin`). The adapter preserves the inscription ID and real chain lookups, removes the renderer’s page background and inset, and aligns both canvas layers to a 900 × 1600 display viewport without changing their native 1800 × 3200 resolution. The bounded source adaptation fails visibly if the renderer version changes.

The thumbnail covers only chain loading. As soon as the original canvas exists, a `drawing` message reveals the live frame so visitors see the artwork take shape. The separate `ready` message enables exports after rendering completes.

A per-instance token and source-window checks authenticate messages between viewer and frame. PNG uses the renderer’s own save function. MP4 composites the base and WebGL canvases at 30 fps and records 15, 30, or 60 seconds using an available MP4 MediaRecorder codec. Unsupported browsers show an unavailable state rather than downloading a different container with an MP4 extension. Recording is enabled only for fully rendered OPEN works. Cancellation, hidden-tab changes, and modal teardown stop capture; closing the viewer also removes listeners, observers, and the embedded document.

The gallery viewer separates the toolbar, artwork stage, and scrollable details. Export controls live in the right details sidebar alongside the palette on both sites. Solo hides that sidebar against an opaque background, leaving the artwork unobstructed. Lemonhaze retains its existing viewer palette. Deep-link startup adopts any prerendered wrapper and replaces serialized capture controls before initializing a fresh player.

## Collection redesign (preview)

The default entry point is now a static HTML hero and collection shell. `main.js`
loads a compact saved feed immediately, then refreshes `bestbefore.space` every
60 seconds while the tab is visible. It labels saved/offline data explicitly.
Immortals are an exclusive category: the upstream open count includes them.

- `collection.js`: normalizes the shared state, status, palette ordering, image tiers and time labels.
- `grid.js`: uniform responsive grid, status filters, number/time/palette sorting.
- `canvas.js`: cursor-relative zoom, pointer pan/pinch, keyboard pan, viewport culling,
  96/200/400/800px image tiers, and swatches below usable thumbnail size. Camera
  position lives in the mounted view and survives opening/closing the lightbox.
- `router.js`: hash routes and modal history; the old path parser remains in
  `legacy-router.js` for existing integrations and tests. Numeric legacy work
  URLs redirect locally to the equivalent hash deep link.
- `modal.js`: shared responsive dialog with focus management, live block metadata,
  keyboard/swipe navigation and the existing `best-before-player.js` export bridge.
- `ledger.js`: reused for the analytics view and work links.

Routes: `/#/grid?status=open&sort=time`, `/#/canvas?arrange=palette`,
`/#/work/128`, `/#/about`, and `/#/ledger`. Work navigation replaces the current
modal history entry, so closing returns to the originating view in one step.
A direct work link closes into the default grid. Time estimates use the average
10-minute block interval; the block countdown only changes with live feed data.

The app loads only Space Grotesk and JetBrains Mono, self-hosted as Latin WOFF2.
The old carousel modules remain unmounted and can be used as a fallback source.

### Diary

The diary is a primary navigation destination and a static, prominent homepage
feature. `diary.js` loads the existing `bb-diary.txt` on demand, preserving its
original Prelude and six parts. The reading layout includes a chapter index,
reading-time estimates and deep links such as `/#/diary?part=3`. Old `/diary/3`
links are normalized to that route. The diary is not reloaded on every feed tick.

### Editorial refinement

The home combines a static opening, two featured works, the original BB logo,
and a prominent diary excerpt. The grid initially mounts 12 works, with explicit
24-work increments and a show-all action; sorting and filtering still operate on
the entire collection. Expansion survives lightbox close and view switches.

`rooms.js` groups all currently living, revealed works by their actual palette.
`#/rooms?palette=Blue%20Sunset` shares the selected room. Previous/next controls and
a native palette selector provide a finite alternative to spatial navigation.
The legacy canvas remains available at `#/canvas` but is absent from the primary
view switch. Room artwork links use the same live lightbox and history behavior.

`editorial.js` provides Process and Exhibition pages at `#/process` and
`#/exhibition`. Process draws on the visual diary; the exhibition scenario and
possible presentation formats draw on Part 4. Its three-stage display study is
illustrative UI only: it never activates or changes an inscription. The original
diary remains intact and is linked directly from each related section.

`refined.css` layers the editorial design over the existing gallery/player rules.
The mark uses lossless WebP size variants of the repository's original
`bb-uploaded-logo.jpeg`, with CSS contrast and inversion for the dark surfaces; no replacement logo is drawn.

### Live display studies

`live-study.js` mounts the original on-chain renderer inside a clipped 9:16 frame
in the home exhibition teaser and the Exhibition page's living stage. It reuses
`buildBestBeforeDocument` without wiring export controls or parent keyboard
shortcuts. Intersection visibility, tab visibility, explicit pause, modal entry,
and route/stage changes control renderer lifetime; offscreen frames are removed.
Reduced-motion visitors receive the still preview until they choose Play.
Display studies hide the inscription's loading HUD while the painting draws.
The opening and finale remain illustrative stills. No study changes chain state.

The process teaser and process page show complete works, replacing enlarged
thumbnail texture crops. The artist’s preferred selections are curated by section:
139 (Balance) and 402 (SOLSTICE) in the hero; 169 (90s festival) and 315 (Modernist
Clash) in both the home process teaser and process page; and 133 (Punch) in
both live exhibition studies. The process playback link opens 169. Hero metadata follows the numbers declared in the static markup. Only Diary Part 2 has an editorial note
identifying its LLM generation from the full making-of chat log. Source diary text
and the other chapters are unchanged.

The Ledger is a primary navigation destination, with an additional entry beside
the collection introduction describing its lifespans, activations and records.

Lightbox previous/next controls use centred SVG chevrons in 44px hit targets,
independent of font glyph baselines.

Expanded grids offer Show less, including after Show all. It restores the first
12 results, preserves the active filter and sort, scrolls to the collection, and
places keyboard focus on the first retained work.

### Ledger, artists and expanded display

`ledger-artists.css` styles the Ledger overview, two-column milestone tables,
mobile activation records and artist biographies. The overview derives exclusive
status counts from collection items, so immortals are not also counted as open.
Saved collection data can render the overview and activation records before live
analytics arrive. Open/closed Ledger sections survive feed refreshes.

`#/artists` displays the biographies from `state.js`, with the original portraits
compressed to local WebP. Lemonhaze’s bio is updated from lemonhaze.com/about
(October 12, 2026); Ordinally’s original bio is preserved. The Artists link is in
the footer only, as requested; legacy `/artists` resolves to the new route.

Both live exhibition studies offer full screen. The same sandboxed renderer is
resized without reloading; native Fullscreen API is used when available, with a
viewport overlay fallback on unsupported browsers. Return/Escape restores the
study and scroll position. The overlay keeps keyboard focus in its controls.
Solo view reserves separate vertical space for its caption and Show details.
