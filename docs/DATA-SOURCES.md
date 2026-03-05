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
| Collection roster context | `https://magiceden.io/ordinals/marketplace/best-before-by-lemonhaze-x-ordinally` | Linked marketplace reference from the UI |

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
