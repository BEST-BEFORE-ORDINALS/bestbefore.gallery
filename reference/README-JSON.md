# BEST BEFORE — JSON API Reference

Machine-readable collection data served at:

```
https://bestbefore.space/best-before.json
```

Updated every Bitcoin block (~10 minutes).

---

## Overview

BEST BEFORE is a collection of 420 Bitcoin ordinal inscriptions with deterministic lifetimes. Each inscription starts **SEALED** and transitions to **OPEN** when a child inscription (the "key") is inscribed on-chain. The key's inscription ID, combined with the block hash, produces a deterministic seed that controls the inscription's palette, lifespan, and a 3/420 chance of immortality. When the chain tip reaches the expiry block, a mortal inscription becomes **EXPIRED**.

The JSON contains two main sections:

- **`inscriptions`** — raw per-inscription data (420 objects, one per piece)
- **`analytics`** — pre-computed statistics, leaderboards, and derived data

All block-count fields use Bitcoin blocks as the unit. To convert: **1 day = 144 blocks**, **1 year = 52,560 blocks**.

---

## What bestbefore.space Currently Serves

The site is hosted on Cloudflare Pages and updated every block. The current content:

| URL | Description |
|-----|-------------|
| `/` | HTML report — the current frontend (single-page, monospace, dark theme) |
| `/tip` | Plain-text file containing just the current block height (e.g. `936067`). Use this to poll for changes without downloading the full JSON. |
| `/best-before.json` | Master collection JSON (this document) |
| `/images/BESTBEFORE_{n}.png` | Rendered inscription image, 1800x3200 PNG (~18 MB). `{n}` is 1-based. |
| `/images/BESTBEFORE_{n}.webp` | Lossy compressed WebP, 1200px wide (<2 MB) |
| `/images/BESTBEFORE_{n}_800.webp` | Lossless WebP, 800px wide (used by Magic Eden) |
| `/images/SEALED.png` | Static placeholder for sealed inscriptions |
| `/images/EXPIRED.png` | Static placeholder for expired inscriptions |
| `/magic_eden_collection.json` | Magic Eden marketplace metadata |
| `/keys-collection.json` | Magic Eden metadata for the Keys sub-collection |

Images only exist for OPEN and EXPIRED inscriptions (those that have been unsealed). SEALED inscriptions use `SEALED.png`. Expired inscriptions' rendered images persist but the canonical display is `EXPIRED.png`.

### Current HTML Report Sections

The HTML report at `bestbefore.space` renders these sections, all of which can be reproduced from the JSON:

| Section | JSON Source | Description |
|---------|------------|-------------|
| **Status overview** | `summary` or `analytics.counts` | Total/SEALED/OPEN/EXPIRED/Immortal counts |
| **Lifetime stats** | `analytics.lifetime` | Shortest, longest, average mortal lifespan; distribution table comparing observed vs. expected counts per bucket |
| **Top mortal lifespans** | `analytics.top_longest`, `analytics.top_shortest` | 5 longest and 5 shortest mortal lifespans with piece links |
| **Soonest to expire** | `analytics.next_expiries` | 5 OPEN mortals closest to expiry, with remaining blocks and countdown |
| **Immortal roll call** | `analytics.immortals` | All immortal pieces with palette, activation block, and key link |
| **Palette discovery** | `analytics.palettes` | Discovered vs. undiscovered palettes; alive/extinct/rediscovered status; color swatches; median lifespan per palette |
| **Activation log** | `analytics.activation_log` | Chronological table of every unsealing: piece, palette (with "first" badge), lifespan, key |
| **Collector showcase** | `analytics.wallet_stats` | Six leaderboards: largest collection, most OPEN, greatest lifespan, most palettes, immortal holders, soonest expiring |

### Building an Alternative Frontend

The `analytics` object contains everything needed to reproduce or extend the current report without recomputing anything from the raw inscription data. A typical approach:

1. Poll `/tip` to detect new blocks (tiny plain-text response). Only fetch `best-before.json` when the tip changes.
2. Use `analytics.*` for all aggregate views, tables, and leaderboards.
3. Use `inscriptions[]` for per-piece detail views (e.g. individual inscription pages).
4. Construct image URLs from piece numbers: `https://bestbefore.space/images/BESTBEFORE_{number}.webp`
5. Construct ordinals.com links from inscription IDs: `https://ordinals.com/inscription/{id}`
6. Construct block links from heights: `https://ordinals.com/block/{height}`

The JSON is intentionally **content-only** — no HTML, no pre-formatted strings, no embedded URLs. All display formatting (time approximations, number formatting, URL construction) is left to the consumer.

---

## Root Object

| Field | Type | Description |
|-------|------|-------------|
| `api` | `string` | Always `"bestbefore.collection.v1"` |
| `generated_at` | `string\|null` | ISO 8601 timestamp of snapshot |
| `tip` | `number\|null` | Bitcoin block height at time of snapshot |
| `count` | `number` | Total inscriptions (always 420) |
| `summary` | `object` | Phase counts (see below) |
| `inscriptions` | `array` | 420 inscription objects |
| `analytics` | `object` | Pre-computed analytics (see below) |

### `summary`

| Field | Type | Description |
|-------|------|-------------|
| `sealed` | `number` | Count of SEALED inscriptions |
| `open` | `number` | Count of OPEN inscriptions |
| `expired` | `number` | Count of EXPIRED inscriptions |
| `immortal` | `number` | Count of immortal inscriptions (subset of open) |

---

## Inscription Object

Each element of the `inscriptions` array:

| Field | Type | Description |
|-------|------|-------------|
| `api` | `string` | Always `"bestbefore.v1"` |
| `generated_at` | `string` | ISO 8601 timestamp |
| `id` | `string` | Inscription ID (`{txid}i{index}`) |
| `phase` | `string` | `"SEALED"` \| `"OPEN"` \| `"EXPIRED"` |
| `seed` | `string\|null` | 64-char hex seed (null when SEALED) |
| `palette` | `object\|null` | Palette assignment (null when SEALED) |
| `address` | `string\|null` | Current holder's Bitcoin address |
| `sat_name` | `string\|null` | Ordinal sat name |
| `signature` | `string\|null` | Inscription's text signature (parsed from content) |
| `block` | `object` | Block height data and lifecycle timing |
| `lineage` | `object` | Parent/child relationship data |
| `overrides` | `object` | Reserved for manual overrides |

### `palette`

Present when inscription is OPEN or EXPIRED; null when SEALED.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Palette name (e.g. `"NeonFunk"`, `"Infrared"`) |
| `colors` | `string[]` | Hex color codes (e.g. `["#FF0000", "#00FF00"]`) |

### `block`

| Field | Type | Description |
|-------|------|-------------|
| `tip` | `number\|null` | Chain tip at snapshot time |
| `inscription` | `number\|null` | Block when this inscription was revealed |
| `activation` | `number\|null` | Block when key was inscribed (null if SEALED) |
| `activationNumber` | `number\|null` | Inscription number of the activating key |
| `activationTimestamp` | `string\|null` | ISO 8601 timestamp of activation block |
| `expiry` | `number\|null` | Block at which inscription expires (null if SEALED or immortal) |
| `immortal` | `boolean` | Whether this inscription lives forever |
| `lifespan` | `number\|null` | Total lifespan in blocks (`expiry - activation`; null if SEALED or immortal) |
| `remaining` | `number\|null` | Blocks until expiry (`expiry - tip`; null if SEALED, immortal, or expired) |

### `lineage`

| Field | Type | Description |
|-------|------|-------------|
| `mode` | `string` | `"PARENT"` \| `"LEGIT_CHILD"` \| `"BOOTLEG"` |
| `reason` | `string` | Human-readable explanation of mode determination |
| `delegateId` | `string\|null` | Delegate inscription ID |
| `firstParentId` | `string\|null` | First parent inscription ID |
| `firstParentsFirstChildId` | `string\|null` | First child of the first parent |
| `parentIds` | `string[]` | Parent inscription IDs |
| `childIds` | `string[]` | Child inscription IDs |
| `selfTxid` | `string\|null` | This inscription's transaction ID |
| `gateTxid` | `string\|null` | Gate transaction ID |

### `overrides`

Reserved for manual corrections. Both fields are currently always null.

| Field | Type | Description |
|-------|------|-------------|
| `phase` | `null` | Phase override |
| `seedOverride` | `null` | Seed override |

---

## Analytics Object

Pre-computed statistics derived from the inscription data. All values are raw data — no HTML, no formatted strings, no URLs. Inscription IDs and block heights can be used to construct URLs:

- Inscription: `https://ordinals.com/inscription/{id}`
- Block: `https://ordinals.com/block/{block_height}`

### `analytics` — top level

| Field | Type | Description |
|-------|------|-------------|
| `api` | `string` | Always `"bestbefore.analytics.v1"` |
| `tip` | `number` | Block height at computation time |
| `counts` | `object` | Phase counts |
| `activation_log` | `array` | Chronological record of all unsealings |
| `palettes` | `object` | Palette discovery and status |
| `lifetime` | `object` | Lifespan statistics for mortal inscriptions |
| `top_longest` | `array` | Top 5 longest mortal lifespans |
| `top_shortest` | `array` | Top 5 shortest mortal lifespans |
| `next_expiries` | `array` | Top 5 soonest-to-expire OPEN inscriptions |
| `immortals` | `array` | All immortal inscriptions |
| `wallet_stats` | `object` | Six collector leaderboards |

### `counts`

| Field | Type | Description |
|-------|------|-------------|
| `total` | `number` | Total inscriptions (420) |
| `open` | `number` | Currently OPEN |
| `sealed` | `number` | Still SEALED |
| `expired` | `number` | Expired |
| `immortal_activated` | `number` | Immortal inscriptions (OPEN, never expire) |

### `activation_log[]`

Ordered chronologically by activation block, then by piece number within the same block.

| Field | Type | Description |
|-------|------|-------------|
| `number` | `number` | Piece number (1-based display number) |
| `id` | `string` | Inscription ID |
| `activation_block` | `number` | Block height of unsealing |
| `palette` | `string\|null` | Palette name |
| `palette_colors` | `string[]\|null` | Hex color codes |
| `first_palette` | `boolean` | True if this is the first time this palette appears |
| `lifespan_blocks` | `number\|null` | Total lifespan in blocks (null if immortal) |
| `immortal` | `boolean` | Whether this inscription is immortal |
| `status` | `string` | Current status: `"OPEN"` or `"EXPIRED"` |
| `key_id` | `string` | Inscription ID of the activating key |

### `palettes`

#### `palettes.discovered[]`

Palettes that have appeared on at least one unsealed inscription.

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Palette name |
| `colors` | `string[]\|null` | Hex color codes |
| `total` | `number` | Total pieces with this palette |
| `alive` | `number` | Currently OPEN pieces with this palette |
| `extinct` | `boolean` | True if no OPEN pieces remain (all expired) |
| `rediscovered` | `boolean` | True if palette went extinct then reappeared on a new unsealing |
| `median_lifespan_blocks` | `number\|null` | Median lifespan of mortal pieces (null if all immortal) |
| `first_activation_index` | `number\|null` | Position in activation log where this palette first appeared |

#### `palettes.undiscovered[]`

Palettes that exist in the collection's palette catalog but have not yet appeared on any unsealed inscription.

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Palette name |
| `colors` | `string[]\|null` | Hex color codes |

### `lifetime`

Statistics across all mortal (non-immortal) activated inscriptions.

| Field | Type | Description |
|-------|------|-------------|
| `shortest_blocks` | `number\|null` | Shortest mortal lifespan in blocks |
| `longest_blocks` | `number\|null` | Longest mortal lifespan in blocks |
| `average_blocks` | `number\|null` | Mean mortal lifespan in blocks |
| `distribution` | `array` | Lifespan distribution buckets |

#### `lifetime.distribution[]`

Bins for the bathtub-curve lifetime model. Four mortal bins plus one immortal row.

| Field | Type | Description |
|-------|------|-------------|
| `label` | `string` | Bin label: `"2w–1m"`, `"1m–3y"`, `"3y–60y"`, `"60y–90y"`, or `"immortal"` |
| `observed` | `number` | Observed count in this bin |
| `expected` | `number\|null` | Expected count from the calibrated hazard model (null for immortal) |
| `share` | `number` | Fraction 0–1 (mortal bins: share among mortals; immortal: share among all activated) |

Bin boundaries in blocks:

| Label | Lower (blocks) | Upper (blocks) | Approx time |
|-------|----------------|----------------|-------------|
| `2w–1m` | 2,016 | 4,320 | 14 days – 30 days |
| `1m–3y` | 4,320 | 157,680 | 30 days – 3 years |
| `3y–60y` | 157,680 | 3,153,600 | 3 years – 60 years |
| `60y–90y` | 3,153,600 | 4,730,400 | 60 years – 90 years |

### `top_longest[]` / `top_shortest[]`

Top 5 mortal inscriptions by lifespan (longest or shortest).

| Field | Type | Description |
|-------|------|-------------|
| `number` | `number` | Piece number (1-based) |
| `id` | `string` | Inscription ID |
| `lifespan_blocks` | `number` | Lifespan in blocks |
| `palette` | `string\|null` | Palette name |
| `status` | `string` | `"OPEN"` or `"EXPIRED"` |

### `next_expiries[]`

Top 5 OPEN mortal inscriptions closest to expiring.

| Field | Type | Description |
|-------|------|-------------|
| `number` | `number` | Piece number (1-based) |
| `id` | `string` | Inscription ID |
| `remaining_blocks` | `number` | Blocks until expiry |
| `expiry_block` | `number` | Block height of expiry |
| `palette` | `string\|null` | Palette name |

### `immortals[]`

All immortal inscriptions, sorted by activation block.

| Field | Type | Description |
|-------|------|-------------|
| `number` | `number` | Piece number (1-based) |
| `id` | `string` | Inscription ID |
| `palette` | `string\|null` | Palette name |
| `palette_colors` | `string[]\|null` | Hex color codes |
| `activation_block` | `number` | Block height of unsealing |
| `key_id` | `string` | Inscription ID of activating key |

### `wallet_stats`

Six leaderboards, each an array of up to 5 entries. Addresses are full Bitcoin addresses.

#### `wallet_stats.largest_collection[]`

Top holders by total inscriptions held.

| Field | Type | Description |
|-------|------|-------------|
| `address` | `string` | Bitcoin address |
| `count` | `number` | Total inscriptions held |

#### `wallet_stats.most_open[]`

Top holders by count of OPEN inscriptions.

| Field | Type | Description |
|-------|------|-------------|
| `address` | `string` | Bitcoin address |
| `count` | `number` | OPEN inscriptions held |

#### `wallet_stats.greatest_lifespan[]`

Top holders by sum of mortal lifespan blocks across all their inscriptions.

| Field | Type | Description |
|-------|------|-------------|
| `address` | `string` | Bitcoin address |
| `total_blocks` | `number` | Sum of lifespan blocks |

#### `wallet_stats.most_palettes[]`

Top holders by number of distinct palettes in their collection.

| Field | Type | Description |
|-------|------|-------------|
| `address` | `string` | Bitcoin address |
| `count` | `number` | Distinct palette count |

#### `wallet_stats.immortal_holders[]`

All wallets holding at least one immortal inscription.

| Field | Type | Description |
|-------|------|-------------|
| `address` | `string` | Bitcoin address |
| `count` | `number` | Immortal inscriptions held |
| `piece_numbers` | `number[]` | Piece numbers (1-based, sorted) |

#### `wallet_stats.soonest_expiring[]`

Top 5 wallets whose nearest-to-expire piece is soonest.

| Field | Type | Description |
|-------|------|-------------|
| `address` | `string` | Bitcoin address |
| `remaining_blocks` | `number` | Blocks until their soonest piece expires |
| `piece_number` | `number` | Piece number of the soonest-expiring piece |
| `piece_id` | `string` | Inscription ID of that piece |

---

## Numbering Convention

- **File index**: 0-based (file `0.json` through `419.json`)
- **Display number**: 1-based (`number` fields in analytics, used in "BEST BEFORE Nº1" through "Nº420")
- Conversion: `display_number = file_index + 1`

## Block-to-Time Conversion

All durations are in Bitcoin blocks. Approximate conversions:

| Unit | Blocks |
|------|--------|
| 1 hour | 6 |
| 1 day | 144 |
| 1 month | 4,320 |
| 1 year | 52,560 |

Actual block times vary. These use the 10-minute target.

## Lifecycle State Machine

```
SEALED ──(key inscribed)──> OPEN ──(tip ≥ expiry)──> EXPIRED
                              │
                              └──(immortal: expiry=null)──> OPEN forever
```

- **SEALED**: No child inscription yet. `seed`, `palette`, `activation`, `expiry` are all null.
- **OPEN**: Child key inscribed. Seed determined. Palette and lifespan assigned. Either mortal (has `expiry`) or immortal (`expiry` is null, `block.immortal` is true).
- **EXPIRED**: Chain tip reached or passed the expiry block. Terminal state.

## Deterministic Model

Every outcome is determined on-chain at the moment of unsealing:

- **Seed**: `sha256(selfInscriptionId + childInscriptionId + activationBlockHash)` — 64-char hex.
- **Palette**: Assigned deterministically from the seed. The collection has a fixed catalog of named palettes, each with specific hex colors.
- **Immortality**: 3 out of 420 chance (per the piecewise hazard function). Immortal inscriptions have no expiry.
- **Lifespan**: For mortals, drawn from a calibrated bathtub-curve hazard model. Short lifespans (2 weeks–1 month) and very long lifespans (60–90 years) are more common; mid-range (1 month–3 years) and late-range (3–60 years) fill the middle.

The base inscription (parent of all 420):
```
c8192d6e0d90877d0ecb5d25151ea6dfe8964b7f96d5aaeffb0013c78cf3b322
```
