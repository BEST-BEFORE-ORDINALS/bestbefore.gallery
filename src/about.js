/* ═══ About & FAQ section renderer ═══ */

import { state, statusCount } from './state.js';

export const renderMenuStats = () => {
  const menuStats = document.querySelector('#bbMenuStats');
  if (!menuStats) return;

  let total, open, sealed, expired, immortal;

  if (state.liveSummary) {
    total = state.liveItems ? state.liveItems.length : 0;
    open = state.liveSummary.open || 0;
    sealed = state.liveSummary.sealed || 0;
    expired = state.liveSummary.expired || 0;
    immortal = state.liveSummary.immortal || 0;
  } else {
    const summary = state.summary;
    total = summary?.totals?.total ?? state.items.length;
    open = summary?.totals?.open ?? statusCount(state.items, 'open');
    sealed = summary?.totals?.sealed ?? statusCount(state.items, 'sealed');
    expired = summary?.totals?.expired ?? statusCount(state.items, 'expired');
    immortal = summary?.totals?.immortal ?? 0;
  }

  menuStats.innerHTML = `
    <div class="bb-header__stats-row">
      <span class="bb-header__stat">${open} OPEN</span>
      <span class="bb-header__stat">${sealed} SEALED</span>
    </div>
    <div class="bb-header__stats-row">
      <span class="bb-header__stat">${expired} EXPIRED</span>
      <span class="bb-header__stat">${immortal} IMMORTAL</span>
    </div>
  `;
};

// ─────────────────────────────────────────────────────────────────────────────
// Scroll-unfold reveal for About section blocks
// ─────────────────────────────────────────────────────────────────────────────
const initAboutScrollUnfold = (aboutFaq) => {
  const revealTargets = [...aboutFaq.querySelectorAll('.bb-about-unfold')];
  if (!revealTargets.length) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    revealTargets.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  revealTargets.forEach((el, index) => {
    el.style.transitionDelay = `${Math.min(index * 70, 420)}ms`;
  });

  const scrollRoot = document.querySelector('.bb-scroll-container');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, {
    root: scrollRoot || null,
    threshold: 0.2,
    rootMargin: '0px 0px -10% 0px',
  });

  revealTargets.forEach((el) => observer.observe(el));
};

// ─────────────────────────────────────────────────────────────────────────────
// Main renderer
// ─────────────────────────────────────────────────────────────────────────────
export const renderAboutFaq = () => {
  const aboutFaq = document.querySelector('#bbAboutFaq');
  if (!aboutFaq) return;

  aboutFaq.innerHTML = `
    <section class="bb-about-hero">
      <h2 class="bb-about-hero__title bb-about-unfold">BEST BEFORE</h2>
      <p class="bb-about-hero__question bb-about-unfold">What if art could expire?</p>
    </section>

    <section class="bb-about-narrative" id="bbNarrative">
      <p class="bb-about-narrative__lead bb-about-unfold" id="bbNarrP0">Every piece is born SEALED, waiting in silence.</p>
      <p class="bb-about-unfold" id="bbNarrP1">Once OPENED by its collector, the fate is determined — it begins to age on Bitcoin block time until it turns EXPIRED.</p>
      <p class="bb-about-unfold" id="bbNarrP2">Many live short lives, some endure, and the rare outlier may never expire — the immortal.</p>
    </section>

    <div class="bb-pull-quote bb-about-unfold" id="bbPullQuote">
      <blockquote class="bb-quote">Carpe Diem</blockquote>
    </div>

    <section class="bb-about-statement bb-about-unfold" id="bbStatement">
      <details class="bb-statement" data-about-statement>
        <summary class="bb-statement__toggle">
          <span class="bb-statement__toggle-copy">
            <span class="bb-statement__title">Read the full statement</span>
            <span class="bb-statement__teaser">A deeper note on collector agency, time, and expiry</span>
          </span>
          <span class="bb-statement__chevron" aria-hidden="true"></span>
        </summary>
        <div class="bb-statement__body">
          <h3 class="bb-statement__heading">Each work is a living system</h3>
          <p>A self-contained performance — ritual, narrative, and time-based artwork in one. Collectors, galleries, museums, and audiences participate in how these works are born, lived, and ended.</p>
          <p>While SEALED, a work exists in suspension. The collector chooses when to activate it. That choice — time, place, context — is already part of the artwork.</p>
          <p>UNSEALING is an act of theater. Whether in private or in public, that single gesture is the moment the work enters time.</p>
          <p>Once opened, the piece lives. Each Bitcoin block unfolds the performance — measured, irreversible, precise.</p>
          <p>EXPIRY is not a failure or shutdown, but a conclusion. A real ending that deserves witnessing, marking, and celebration.</p>
          <p>Bitcoin block time becomes the medium — what tape was to the banana, time itself is here.</p>
          <div class="bb-statement__scenario">
            <p>Imagine this —</p>
            <p>A collector activates a piece. In a gallery. A crowd gathers.</p>
            <p>The block arrives: the work is born. Expiry revealed: eight months.</p>
            <p>Eight months later, the audience returns. The final block hits. The work expires.</p>
            <p class="bb-statement__curtain">Curtain.</p>
          </div>
          <hr class="bb-statement__rule" />
          <h3 class="bb-statement__heading">The Collector's Role</h3>
          <p>You choose when the life of your piece begins. Activation injects the randomness that determines the piece's fate; time and block height write the rest.</p>
          <p>Some collectors may incubate SEALED works for years. Others may activate early to watch an artwork's life unfold in public. A SEALED work invites patience; an activated work invites attention.</p>
        </div>
      </details>
    </section>

    <section class="bb-about-faq" id="bbFaq">
      <details class="bb-faq-item bb-about-unfold" data-faq-slug="how-does-it-work">
        <summary class="bb-faq-question">How does it work?</summary>
        <div class="bb-faq-answer">
          <p>Each BEST BEFORE piece is an inscription — a piece of art permanently embedded in a Bitcoin transaction. It is born with an unknown lifespan, determined only when the collector "opens" it by inscribing a child. Once opened, the clock starts ticking — measured in Bitcoin blocks (~10 min each).</p>
          <p>Lifespans range from 2 weeks to 90 years, with a 0.69% chance of immortality. 25% expire within 1 month, 50% within 3 years.</p>
        </div>
      </details>
      <details class="bb-faq-item bb-about-unfold" data-faq-slug="whats-the-total-supply">
        <summary class="bb-faq-question">What's the total supply?</summary>
        <div class="bb-faq-answer">
          <p>420 unique editions, each with its own randomly determined lifespan and palette.</p>
        </div>
      </details>
      <details class="bb-faq-item bb-about-unfold" data-faq-slug="can-i-keep-it-sealed-forever">
        <summary class="bb-faq-question">Can I keep it sealed forever?</summary>
        <div class="bb-faq-answer">
          <p>Yes. A SEALED piece never ages. It stays frozen in potential — and can be activated years, even decades, from now.</p>
        </div>
      </details>
      <details class="bb-faq-item bb-about-unfold" data-faq-slug="what-happens-when-it-expires">
        <summary class="bb-faq-question">What happens when it expires?</summary>
        <div class="bb-faq-answer">
          <p>The artwork displays EXPIRED on a plain black background. The generative art is gone — only the record of its life remains on-chain.</p>
        </div>
      </details>
    </section>

    <div class="bb-section-hint" id="bbVaultHint">
      <span class="bb-scroll-hint__text">THE VAULT</span>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="20" height="20">
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    </div>
  `;

  initAboutScrollUnfold(aboutFaq);
};

export const renderLifecycle = () => {};
