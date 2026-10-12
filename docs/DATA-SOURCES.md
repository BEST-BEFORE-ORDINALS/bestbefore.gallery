# bestbefore.gallery Data Sources

## Browser-Served Local Data

| File | Role |
|---|---|
| `public/data/best-before-summary.json` | Summary metadata, story asset references, and baseline collection context |
| `public/data/best-before-items.json` | Static item roster used as fallback when live data is unavailable |
| `public/data/bb-diary.txt` | Primary diary text rendered in the vault |
| `public/data/bb-diary-best-before.txt` | BEST BEFORE-focused extracted diary subset |
| `public/data/bb-about-faq.txt` | About/FAQ text source |

## Live External Data

| Source | URL | Used For |
|---|---|---|
| Live collection state | `https://bestbefore.space/best-before.json` | Current phase, palette, activation/expiry block data, analytics, generation timestamp |
| Collection preview images | `https://bestbefore.space/images/*` | Numbered open/live preview images |
| On-chain content | `https://ordinals.com/content/<id>` | Direct inscription rendering |
| Collection marketplace link | `https://gamma.io/ordinals/collections/best-before/items` | Official marketplace reference linked from the UI |

## Local Preparation Pipeline

The repo includes one preparation script:

```bash
npm run prepare:data
```

It reads source material from the wider workspace, including:

- BEST BEFORE image directories
- provenance JSON
- diary RTF text
- about/FAQ RTF text

It then writes normalized outputs into:

- `public/data/`
- `public/assets/logo/`
- `public/assets/story/`
- `public/assets/outputs/`

## Data Strategy

The site is designed to keep working if live BEST BEFORE data is temporarily unavailable:

- local summary/items/diary files provide a stable baseline
- live data is treated as an enhancement layer
- the gallery prefers live items when present, but falls back to local items

## Notes

- `public/assets/outputs/` is intentionally ignored in git because it can contain large generated render outputs.
- The repo does not currently maintain its own backend; `bestbefore.space` is the live truth source for collection state.

## Lightweight gallery assets

Run `npm run prepare:gallery` to refresh the compact saved feed, image manifest,
and WebP previews from the public live endpoint and its existing 800px image tier.
This does not require the legacy workstation source directories used by
`prepare:data`. It writes 96, 200, 400 and 800px tiers under
`public/assets/thumbs/`. Open works have individual images; sealed and expired
works share their canonical status artwork. Originals are cached outside the
repository in `../image-cache/` to avoid repeat downloads. The gallery never
loads the multi-megabyte PNG previews. Newly opened works absent from the manifest
use the upstream 800px WebP until the next preparation run.

`public/data/collection.json` is a compact snapshot, not an authoritative live
state. Live data replaces it asynchronously. The snapshot date is visible before
and after JavaScript starts. The static HTML count snapshot should be updated
when refreshing assets. Analytics are fetched from the live feed for the ledger.

The social image is a 1200px indexed PNG below 500 KB. Hash work links share the
collection card, because URL fragments are not sent to social crawlers.

The refined homepage and editorial pages use excerpts and paraphrases from
`public/data/bb-diary.txt`: Prelude, First Steps, OPEN, PERFORMANCE and VISUAL.
Exhibition formats are possibilities described in that diary, not announcements
of scheduled shows or institutional commitments. Process imagery uses existing
collection previews; the enlarged surface is explicitly captioned as a detail.

Artist biographies are stored in `ARTIST_BIO_LEMONHAZE` and
`ARTIST_BIO_ORDINALLY` in `state.js`. Lemonhaze’s text is copied from
https://lemonhaze.com/about on October 12, 2026 at the artist’s request.
Ordinally’s original biography is preserved. Portraits retain the original site's sources:
Lemonhaze inscription `757c7d19f53501b9f1e11f49f1731622d5d257eed99c721b32af0438d0d1f9cfi0`
and `public/assets/ordinally-avatar.png`, compressed as local 480px WebP variants.

### Mobile AVIF previews

`npm run prepare:avif` generates local 200, 400, 600 and 800px AVIF previews at
quality 40. It prefers the original cached images in `../image-cache/` and can
fall back to the committed 800px WebP previews. `<picture>` selects AVIF on
supported browsers and preserves the existing WebP fallback. Regenerate these
alongside the WebP tiers whenever the thumbnail manifest is updated.

## Search and social snapshots

The build pre-renders section, diary and work documents from `collection.json`
and `bb-diary.txt`. `prepare:social` uses the same saved collection identities and
local 800px previews for individual share cards. Sealed/expired works retain their
state images; no unrevealed artwork is exposed. Refresh cards after updating
preview data. Runtime block counts and the original inscription remain live.
