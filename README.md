# BEST BEFORE

> *What if art could expire?*

Living artworks with a BEST BEFORE date — 420 unique HTML pieces inscribed on Bitcoin, each with a lifespan measured in blocks.

**[bestbefore.gallery](https://bestbefore.gallery)**

---

## The Concept

Every piece is born **SEALED**, waiting in silence.

Once **OPENED** by its collector, the fate is determined. The artwork begins to age on Bitcoin block time — roughly 10 minutes per block — until it turns **EXPIRED**. Lifespans range from two weeks to ninety years, determined at the moment of activation. A rare 0.69% chance never expires at all: **IMMORTAL**.

Bitcoin block time becomes the medium. What tape was to the banana, time itself is here.

UNSEALING is an act of theater. Whether in private or in public, that single gesture is the moment the work enters time. EXPIRY is not a failure or shutdown, but a conclusion — a real ending that deserves witnessing, marking, and celebration.

### Lifecycle

```
SEALED → OPEN → EXPIRED
                      ↘ IMMORTAL (0.69%)
```

| Phase | Meaning |
|-------|---------|
| **SEALED** | Dormant. Waiting. The collector holds the key. |
| **OPEN** | Alive. The clock is running. Each block counts. |
| **EXPIRED** | Concluded. Only the record of its life remains on-chain. |
| **IMMORTAL** | The rare outlier. Never expires. |

---

## How to Activate a Piece

**Unsealing is an on-chain act.** To move a piece from SEALED to OPEN, the collector must inscribe a child inscription using the SEALED BEST BEFORE piece as its parent.

This is a native Bitcoin/Ordinals mechanism — child inscriptions permanently reference their parent on-chain. The act of creating that child is what triggers activation: the gallery reads the child's existence, determines the lifespan from the parent's seed, and the block countdown begins.

**Step by step:**

1. Hold the SEALED BEST BEFORE inscription in your wallet
2. Inscribe any content as a child, with the BB inscription set as the parent
3. The moment that child inscription is confirmed on-chain, the piece is OPEN — lifespan locked, clock running

There is no button, no website transaction, no off-chain trigger. The collector's wallet action is the artwork action. That alignment — between ownership, agency, and permanence — is the point.

Lifespans are revealed at activation, not before. You don't know if your piece will live two weeks or ninety years until you open it.

---

## The Collection

**420 unique editions** — each a generative HTML inscription, rendered entirely in the browser from a seed determined at activation. No two pieces share the same lifespan, palette, or timing.

A collaboration between **Lemonhaze** and **ORDINALLY**.

---

## The Site

The gallery is built as a single-page, scroll-driven experience across three zones:

### Carousel
An immersive, full-screen viewer cycling through the collection. Each card shows the artwork alongside its current phase, palette, and live block countdown. The carousel updates against live data — what you see reflects the actual on-chain state at load time.

### About & FAQ
The full statement on collector agency, time, and the role of expiry in the work. Expandable. Includes the lifecycle diagram and answers to the questions people actually ask.

### The Vault
Three tabs:

**Artists** — biographical notes on Lemonhaze and ORDINALLY. Their backgrounds, motivations, and the paths that led to this collaboration.

**Diary** — a running written record from inside the project. Entries from both artists across the life of the collection: decisions made, pieces activated, moments witnessed, reflections on expiry. The diary is the closest thing to liner notes for a time-based artwork — it documents what no on-chain record can.

**Ledger** — live analytics across all 420 pieces: phase distribution, average remaining lifespan, immortal count, expiry timeline. The collection's vital signs, updated in real time.

---

## Data

The site pulls from a live API that reflects the current Bitcoin block height:

| Source | URL | Used For |
|--------|-----|----------|
| Live collection state | `https://bestbefore.space/best-before.json` | Phase, palette, block data (lifespan, remaining, activation, expiry) per inscription |
| Collection roster | `https://bestbefore.space/magic_eden_collection.json` | Inscription IDs, names, high-res images |
| On-chain content | `https://ordinals.com/content/<id>` | Rendered HTML artwork |

---

## Stack

- Vanilla JavaScript (no framework)
- Vite
- Cloudflare Pages

---

## Artists

**Lemonhaze** — Montreal born, Puerto Escondido based. Self-taught. Merges music, entrepreneurship, and writing into a digital art practice anchored in his own code-based paint engine. Bitcoin is his canvas.
→ [lemonhaze.com](https://lemonhaze.com)

**ORDINALLY** — First scribbles on IBM punch cards. Generative code, latent space tools, and diffusion workflows brought together through Ordinals. Balances his own creative work with behind-the-scenes engineering for other artists on-chain.

---

## Related

- [lemonhaze.com](https://lemonhaze.com) — Lemonhaze's full catalogue, including BEST BEFORE as a collection alongside all other works
- [bestbefore.space](https://bestbefore.space) — The live data API powering the gallery
