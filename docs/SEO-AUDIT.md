# BEST BEFORE technical SEO and mobile audit

Audit date: October 12, 2026. Scope: public homepage HTML and rendered UI,
metadata, crawler access, social cards, historic links, HTTP responses, image
loading, mobile Lighthouse, and the gallery's URL architecture.

## Findings addressed in this release

- Add one absolute homepage canonical URL, plus WebSite and CollectionPage JSON-LD
  identifying the collection and its two creators. This is descriptive structured
  data, not a promise of a Google rich result.
- Keep the static hero and descriptive text in the initial HTML, with a title,
  description, English language declaration and mobile viewport.
- Add a sitemap and link it from robots.txt. The sitemap intentionally lists only
  the indexable root URL; fragment routes are not separate sitemap entries.
- Complete Open Graph image dimensions/type, site name and Twitter image alt text.
  The shared PNG remains 1200 × 675 and 135,426 bytes.
- Remove the wildcard SPA rewrite that returned the homepage with status 200 for
  missing assets and arbitrary paths. Return a real 404 with a noindex error page.
  Preserve historic artwork, artist and diary URLs with explicit 301 redirects.
- Serve AVIF previews in 200/400/600/800px tiers with WebP fallbacks. The 600px tier
  avoids an unnecessary jump from 400 to 800px on high-density mobile displays.
  Correct the homepage sizes hints and add the missing 200px Process source.
- Preconnect the live-feed origin, preload the small saved collection snapshot,
  and add explicit cache policies for preview images, local fonts and data.
- Replace decorative diagonal arrow characters with accessible, currentColor SVGs
  so mobile fonts cannot substitute colored emoji glyphs.

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

1. **Separate indexable pages.** Navigation currently uses fragment URLs such as
   `/#/diary` and `/#/work/133`. Google advises using regular paths and the History
   API for distinct pages. The next structural SEO release should add pre-rendered
   `/diary`, `/process`, `/exhibition`, `/artists` and `/work/133` pages, unique
   canonical/title/description metadata, crawlable artwork links and a full
   sitemap, while preserving existing shared links. This release keeps the
   approved routing behavior; it does not claim each work is separately indexed.
2. **Work-specific social cards.** Crawlers do not send fragment identifiers to
   the server. Shared work links therefore currently use the collection card.
   Regular pre-rendered work paths would allow artwork-specific cards.
3. **Search Console and field data.** Index coverage, search queries, sitemap
   submission and real-user Core Web Vitals were not verified: this audit has no
   Search Console data. After deployment, submit the sitemap and monitor indexing
   and mobile field LCP/INP/CLS there.
4. **Freshly activated works.** Works not yet present in the committed thumbnail
   manifest use the image origin's fallback. Refresh both preview sets when new
   works activate to keep their images lightweight too.

## References

- [Google: JavaScript SEO basics, fragments and canonical URLs](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
- [Browser-level image lazy loading](https://web.dev/articles/browser-level-image-lazy-loading)

The audit includes browser checks of visible mobile images, SVG arrows, portrait
framing, and native/fallback fullscreen entry and exit. Physical iPhone and Android
hardware testing remains distinct from browser viewport simulation.
