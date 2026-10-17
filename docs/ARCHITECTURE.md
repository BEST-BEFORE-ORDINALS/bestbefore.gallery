# BEST BEFORE architecture

## Stack and build

Vite 7 and vanilla JavaScript serve a static Cloudflare Pages site. The build runs
Vite followed by `scripts/prerender.mjs`. Build-only LinkeDOM renders the same
editorial, diary, grid, rooms and Ledger markup used in the browser. There are
436 HTML documents: the homepage, nine other sections, six additional diary
chapters and all 420 works. The optional Canvas is noindex; the sitemap lists
435 canonical URLs. No framework or server runtime is introduced.

## Routing and navigation

`router.js` uses the History API with normal anchors:

- `/` — collection, with `?status=open&sort=time` filters
- `/rooms?palette=Horizon` — palette rooms
- `/diary` and `/diary/1` through `/diary/6` — individual diary chapters
- `/process`, `/exhibition`, `/ledger`, `/artists`, `/about`, `/faq`
- `/work/133` — individual work, opening the shared live lightbox
- `/canvas?arrange=palette` — optional spatial view

Old `/#/…` URLs are normalized in the browser. Historic `/1`–`/420` links redirect
with HTTP 301 to `/work/1`–`/work/420`; `/grid` redirects to `/`. Unknown paths
return the real static 404. Cloudflare serves built `.html` files at extensionless
paths. The legacy parser remains available for older integrations.

Opening a work preserves its underlying view, grid expansion, canvas camera and
scroll position. Previous/next replaces the modal history entry so closing
returns in one step. A direct work link closes into the default collection.
Metadata follows client navigation as well as being present in every HTML file.

## Data and views

`main.js` loads `/data/collection.json` and the thumbnail manifest, then refreshes
`https://bestbefore.space/best-before.json` every 60 seconds while visible.
Saved/offline data is labeled. `collection.js` normalizes identities, exclusive
states, palettes, preview tiers and block-time labels. Immortals are not counted
again as open. Time estimates use the average 10-minute block interval.

`grid.js` starts with 12 works, adds 24 or shows all, and can retract to 12.
Filtering and sorting cover the full collection. `rooms.js` groups revealed,
living works by palette. `canvas.js` retains cursor zoom, pan, viewport culling
and tiered loading as a secondary route.

`editorial.js` renders Process, Exhibition, About and Artists. The homepage uses
139 (Balance) and 402 (SOLSTICE); Process uses 233 (Horizon) and 133 (Punch), with
233 as its live playback link. Both exhibition studies use 189 (Ocean).
The original BB logo and Space Grotesk/JetBrains Mono remain self-hosted.
Tab and Apple touch icons use self-contained 32px/180px PNGs derived from the
original BB mark; the legacy SVG embeds its image rather than fetching an
external resource, which browsers block in SVG image contexts.

`diary.js` preserves the original source and serves one full chapter per path,
with a chapter index and next-chapter link. Only Part 2 carries the existing LLM
note. The homepage opening quote is attributed to Lemonhaze, April 29, 2025;
there is no added general diary authorship note.

`ledger.js` renders live analytics and saved snapshot fallbacks, with exclusive
counts, activation records and expandable sections. `ledger-artists.css` styles
its responsive tables and the artist bios. Lemonhaze’s bio follows lemonhaze.com
as of October 12, 2026; Artists remains linked in the footer.

## Indexable pages and sharing

`seo.js` supplies unique titles, descriptions, canonical URLs, Open Graph/Twitter
metadata and WebSite/WebPage/VisualArtwork JSON-LD. Work pages include a readable
preview and identity before JavaScript opens the live renderer. Diary chapters
have separate text and metadata. Filtered views canonicalize to their section.

`scripts/prepare-social.mjs` generates 436 1200 × 630 JPEG cards using the actual
committed artwork previews and original BB logo. The artwork is cropped to its
canvas without a decorative frame. Cards stay below 500 KB. These are saved
preview images, not real-time renderings; regenerate them when imagery changes.

## Live studies

`live-study.js` mounts the original renderer in a clipped 9:16 frame. Visibility,
route changes, pause, reduced-motion preference and modal entry govern renderer
lifetime. Full screen keeps the same renderer and supports native fullscreen
plus a viewport fallback. Return/Escape restores the prior view and scroll.
The opening and finale stages are illustrative; no action activates an inscription.

### Best Before player and recording

The individual viewer fetches the original on-chain HTML and runs it in a `srcdoc` iframe with an opaque origin (`allow-scripts allow-downloads`, without `allow-same-origin`). The adapter preserves the inscription ID and real chain lookups, removes the renderer’s page background and inset, and aligns both canvas layers to a 900 × 1600 display viewport without changing their native 1800 × 3200 resolution. The bounded source adaptation fails visibly if the renderer version changes.

The thumbnail covers only chain loading. As soon as the original canvas exists, a `drawing` message reveals the live frame so visitors see the artwork take shape. The separate `ready` message enables exports after rendering completes.

A per-instance token and source-window checks authenticate messages between viewer and frame. PNG uses the renderer’s own save function. MP4 capture scales both canvas layers to fit 1080 × 1920 (1920 × 1080 for landscape), with even dimensions and no upscaling. The authenticated bridge transfers one ImageBitmap at a time to the parent. The lazily loaded `best-before-mp4.js` uses WebCodecs through Mediabunny to encode H.264 High (up to Level 4.1) at a 6 Mbps constant bitrate target, with exactly 30 explicitly timestamped frames per second and a generated stereo 48 kHz AAC-LC silent access unit repeated to the selected duration, avoiding browser audio-encoder priming padding. The 15/30/60-second exports are finalized as non-fragmented MP4s with front-loaded metadata. No microphone, AudioContext, external conversion service, or cross-origin isolation is needed. The encoder checks actual codec support, frame count, and an 8 Mbps average video bitrate ceiling before download. Unsupported browsers fail clearly without downloading a raw fallback. The recorder modules are identical across the two sites. The unmodified Mediabunny dependency is pinned; its license and source links are published at `/third-party/mediabunny.txt`. Recording is enabled only for fully rendered OPEN works. Cancellation, hidden-tab changes, and modal teardown stop capture; closing the viewer also removes listeners, observers, and the embedded document.

The gallery viewer separates the toolbar, artwork stage, and scrollable details. Export controls live in the right details sidebar alongside the palette on both sites. Solo hides that sidebar against an opaque background, leaving the artwork unobstructed. Lemonhaze retains its existing viewer palette. Deep-link startup adopts any prerendered wrapper and replaces serialized capture controls before initializing a fresh player.

### Mobile image and exhibition refinement

Collection previews use AVIF picture sources with WebP fallbacks and a 600px
intermediate tier for high-density screens. `scripts/prepare-avif.mjs` generates
the committed files. Decorative diagonal arrows are SVGs, independent of mobile
emoji fonts. See `SEO-AUDIT.md` for technical search findings and measurements.

`modal-exhibition.js` adds a framed fullscreen presentation from both Details and
Solo. It preserves the current live iframe, hides only its display HUD through the
existing authenticated message bridge, and restores the prior mode on return.
Native fullscreen and the viewport fallback share the same layout. Portrait sizing
uses both available dimensions; exhibition study scaling covers the exact frame
content box, avoiding fractional-pixel gaps.

SEALED and EXPIRED modal faces use a square viewport from the saved preview
through the live renderer, including Solo and Exhibition. Their original
responsive phase renderer receives 900 × 900, while living works keep 900 × 1600.
The preview remains visible until the inactive phase bitmap exists, preventing
a blank loading flash. Chain phase messages update presentation when necessary.

## Collector FAQ

`faq.js` contains sixteen brief answers in three native disclosure groups. `/faq`
is pre-rendered, has individual metadata and a social card, and is linked in the
eighth (bottom-right) footer position. Disclosure state survives live-feed
refreshes. The page links to inscribe.dev, Lemonhaze’s X and the Discord invite
published on lemonhaze.com.

Activation wording was checked against `public/data/bb-about-faq.txt`, the
inscription’s Lifecycle implementation (first child and its confirmation block),
and the [Ordinal Theory Handbook’s provenance specification](https://docs.ordinals.com/inscriptions/provenance.html).
The service’s [Parent Inscription field](https://inscribe.dev/) was checked on
October 12, 2026. Calendar durations are estimates; no fixed final count of
immortal works is promised.
