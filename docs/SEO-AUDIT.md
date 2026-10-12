# BEST BEFORE technical SEO and mobile audit

Audit date: October 12, 2026. Scope: public homepage HTML and rendered UI,
metadata, crawler access, social cards, historic links, HTTP responses, image
loading, mobile Lighthouse, and the gallery's URL architecture.

## Findings addressed in this release

- Pre-render 435 documents with readable content before JavaScript. Main sections,
  seven diary chapters and all 420 works have independent paths. The optional
  canvas is noindex; all other 434 URLs appear in the generated sitemap.
- Use crawlable anchors and History API navigation. Preserve old hash bookmarks
  and redirect numeric work paths to their new canonical URLs.
- Supply unique title/description/canonical and Open Graph/Twitter metadata per
  page, plus WebSite/WebPage and individual VisualArtwork structured data.
- Generate individual 1200 × 630 JPEG cards from actual artwork previews. All
  cards are below 500 KB, and the artwork has no decorative frame.
- Preserve real 404 responses for missing paths and assets.
- Keep AVIF 200/400/600/800px previews with WebP fallbacks, lazy loading, accurate
  sizes, self-hosted fonts and explicit caching. Decorative arrows use SVG.

## Measurements

Mobile Lighthouse uses simulated throttling; these are lab samples, not field
Core Web Vitals or guarantees for every device. Scores vary between runs.

| Build | Performance | LCP | Total transferred |
| --- | ---: | ---: | ---: |
| Production before changes | 85 | 4.2 s | 895,750 bytes |
| Updated Cloudflare preview | 100 | 1.7 s | 454,105 bytes |

Accessibility and best-practices scored 100 in both runs. The prior production
site passed Lighthouse's basic SEO checks (100), despite the architecture gaps
below. Cloudflare automatically adds noindex to preview deployments, so their
indexability score is intentionally lower; production must be checked separately.
The transfer totals cover Lighthouse's loading sample, not browsing all 420 works
or downloading/recording a live inscription.

## Remaining priorities

- Search Console index coverage, sitemap submission and real-user Core Web Vitals
  require account data and were not verified. Having indexable pages does not
  mean search engines have already indexed them.
- Refresh thumbnail/AVIF sets and social cards when newly activated works receive
  previews. Cards and pre-rendered metadata use the committed snapshot; the
  browser still loads current live data for the actual artwork and countdown.
- Social platforms can cache an older card until they crawl the shared URL again.

## References

- [Google: JavaScript SEO basics, fragments and canonical URLs](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
- [Browser-level image lazy loading](https://web.dev/articles/browser-level-image-lazy-loading)

The audit includes browser checks of visible mobile images, SVG arrows, portrait
framing, and native/fallback fullscreen entry and exit. Physical iPhone and Android
hardware testing remains distinct from browser viewport simulation.
