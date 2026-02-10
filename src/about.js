/* ═══ About & FAQ section renderer ═══ */

import { state, statusCount } from './state.js';

export const renderMenuStats = () => {
  const menuStats = document.querySelector('#bbMenuStats');
  if (!menuStats) {
    return;
  }

  let total, open, sealed, expired;

  if (state.liveSummary) {
    total = state.liveItems ? state.liveItems.length : 0;
    open = state.liveSummary.open || 0;
    sealed = state.liveSummary.sealed || 0;
    expired = state.liveSummary.expired || 0;
  } else {
    const summary = state.summary;
    total = summary?.totals?.total ?? state.items.length;
    open = summary?.totals?.open ?? statusCount(state.items, 'open');
    sealed = summary?.totals?.sealed ?? statusCount(state.items, 'sealed');
    expired = summary?.totals?.expired ?? statusCount(state.items, 'expired');
  }

  if (menuStats) {
    menuStats.innerHTML = `
      <span>${open} OPEN</span>
      <span>${sealed} SEALED</span>
      <span>${expired} EXPIRED</span>
    `;
  }
};

export const renderAboutFaq = (text) => {
  const aboutFaq = document.querySelector('#bbAboutFaq');
  if (!aboutFaq) {
    return;
  }

  // Get live stats for dynamic content — mirror the same source as renderMenuStats
  let openCount, sealedCount, expiredCount, immortalCount;

  if (state.liveSummary) {
    openCount = state.liveSummary.open || 0;
    sealedCount = state.liveSummary.sealed || 0;
    expiredCount = state.liveSummary.expired || 0;
    immortalCount = state.liveSummary.immortal || 0;
  } else {
    const summary = state.summary;
    openCount = summary?.totals?.open ?? statusCount(state.items, 'open');
    sealedCount = summary?.totals?.sealed ?? statusCount(state.items, 'sealed');
    expiredCount = summary?.totals?.expired ?? statusCount(state.items, 'expired');
    immortalCount = summary?.totals?.immortal ?? 0;
  }

  // Build dramatic story-first HTML
  aboutFaq.innerHTML = `
    <!-- Hero Question -->
    <section class="bb-about-hero bb-reveal">
      <h2 class="bb-about-hero__question">What if art could expire?</h2>
      <p class="bb-about-hero__tagline">Living artworks with a BEST BEFORE date</p>
    </section>

    <!-- Lifecycle Visual (using existing image) -->
    <section class="bb-lifecycle-visual bb-reveal bb-reveal--delay-1">
      <figure class="bb-lifecycle-image">
        <img src="/assets/story/lifecycle.webp" alt="BEST BEFORE lifecycle: SEALED → OPEN → EXPIRED" loading="lazy" decoding="async" />
      </figure>
    </section>

    <!-- Core Narrative -->
    <section class="bb-about-narrative bb-reveal bb-reveal--delay-2">
      <p class="bb-about-narrative__lead">
        Every piece is born SEALED at inscription, waiting in silence.
      </p>
      <p>
        Once OPENED by its collector, the fate is determined and it begins to age on Bitcoin block time until it turns EXPIRED.
      </p>
      <p>
        Many live short lives, some endure, and the rare outlier may never expire - the immortal.
      </p>
    </section>

    <!-- Live Stats -->
    <section class="bb-about-stats bb-reveal bb-reveal--delay-3">
      <div class="bb-about-stats__grid">
        <div class="bb-about-stat bb-about-stat--open">
          <span class="bb-about-stat__number">${openCount}</span>
          <span class="bb-about-stat__label">OPEN</span>
        </div>
        <div class="bb-about-stat bb-about-stat--sealed">
          <span class="bb-about-stat__number">${sealedCount}</span>
          <span class="bb-about-stat__label">SEALED</span>
        </div>
        <div class="bb-about-stat bb-about-stat--expired">
          <span class="bb-about-stat__number">${expiredCount}</span>
          <span class="bb-about-stat__label">EXPIRED</span>
        </div>
        <div class="bb-about-stat bb-about-stat--immortal">
          <span class="bb-about-stat__number">${immortalCount}</span>
          <span class="bb-about-stat__label">IMMORTAL</span>
        </div>
      </div>
    </section>

    <!-- Collapsible FAQ -->
    <section class="bb-about-faq bb-reveal bb-reveal--delay-4">
      <details class="bb-faq-item">
        <summary class="bb-faq-question">How does it work?</summary>
        <div class="bb-faq-answer">
          <p>Each BEST BEFORE piece is inscribed on Bitcoin with an unknown lifespan, determined only when the collector "opens" it via a child inscription. Once opened, the clock starts ticking — measured in Bitcoin blocks (~10 min each).</p>
          <p>Lifespans range from 2 weeks to 90 years, with a 0.69% chance of immortality. 25% expires within 1 month, 50% expires within 3 years.</p>
        </div>
      </details>

      <details class="bb-faq-item">
        <summary class="bb-faq-question">What's the total supply?</summary>
        <div class="bb-faq-answer">
          <p>420 unique editions, each with its own randomly determined lifespan and palette. Every piece is one-of-a-kind.</p>
        </div>
      </details>

      <details class="bb-faq-item">
        <summary class="bb-faq-question">Can I keep it sealed forever?</summary>
        <div class="bb-faq-answer">
          <p>Yes! A SEALED piece never ages. It remains frozen in potential — a perpetual mystery. Some collectors may never open their pieces, preserving the suspended anticipation indefinitely.</p>
        </div>
      </details>

      <details class="bb-faq-item">
        <summary class="bb-faq-question">What happens when it expires?</summary>
        <div class="bb-faq-answer">
          <p>The artwork transforms visually to its EXPIRED state — a permanent memorial to its lived experience. The generative art remains, but overlaid with the mark of time passed.</p>
        </div>
      </details>

      <details class="bb-faq-item">
        <summary class="bb-faq-question">Who are the artists?</summary>
        <div class="bb-faq-answer">
          <p><strong>Lemonhaze</strong> and <strong>ORDINALLY</strong></p>
        </div>
      </details>
    </section>

    <!-- Scroll hint to Vault -->
    <div class="bb-section-hint" id="bbVaultHint">
      <span class="bb-scroll-hint__text">THE VAULT</span>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="20" height="20">
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    </div>
  `;

  // Add intersection observer for lifecycle animation
  const lifecycle = aboutFaq.querySelector('.bb-lifecycle-visual');
  if (lifecycle) {
    const scrollRoot = document.querySelector('.bb-scroll-container');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          lifecycle.classList.add('is-animated');
        }
      });
    }, {
      root: scrollRoot || null,
      threshold: 0.5,
    });
    observer.observe(lifecycle);
  }
};

export const renderLifecycle = () => { };
