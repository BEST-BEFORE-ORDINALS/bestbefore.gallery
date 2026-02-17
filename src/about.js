/* ═══ About & FAQ section renderer ═══ */

import { state, statusCount } from './state.js';

export const renderMenuStats = () => {
  const menuStats = document.querySelector('#bbMenuStats');
  if (!menuStats) {
    return;
  }

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

  if (menuStats) {
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
  }
};

export const renderAboutFaq = (text) => {
  const aboutFaq = document.querySelector('#bbAboutFaq');
  if (!aboutFaq) {
    return;
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
        Every piece is born SEALED, waiting in silence.
      </p>
      <p>
        Once OPENED by its collector, the fate is determined and it begins to age on Bitcoin block time until it turns EXPIRED.
      </p>
      <p>
        Many live short lives, some endure, and the rare outlier may never expire - the immortal.
      </p>
    </section>

    <!-- Full Statement (expandable) -->
    <section class="bb-about-statement bb-reveal bb-reveal--delay-3">
      <details class="bb-statement">
        <summary class="bb-statement__toggle">
          <span class="bb-statement__toggle-copy">
            <span class="bb-statement__title">Read the full statement</span>
            <span class="bb-statement__teaser">A deeper note on collector agency, time, and expiry</span>
          </span>
          <span class="bb-statement__chevron" aria-hidden="true"></span>
        </summary>
        <div class="bb-statement__body">

          <h3 class="bb-statement__heading">The Collector's Role</h3>
          <p>You choose when the life of your piece begins. Activation injects the randomness that determines the piece's fate; time and block height write the rest.</p>
          <p>Some collectors may incubate SEALED works for years. Others may activate early to watch an artwork's life unfold in public. A SEALED work invites patience; an activated work invites attention.</p>

          <hr class="bb-statement__rule" />

          <h3 class="bb-statement__heading">Each work is a living system</h3>
          <p>A self-contained performance - ritual, narrative, and time-based artwork in one. Collectors, galleries, museums, and audiences participate in how these works are born, lived, and ended.</p>
          <p>While SEALED, a work exists in suspension. The collector chooses when to activate it. That choice - time, place, context - is already part of the artwork.</p>
          <p>UNSEALING is an act of theater. Whether in private or in public, that single gesture is the moment the work enters time.</p>
          <p>Once opened, the piece lives. Each Bitcoin block unfolds the performance - measured, irreversible, precise.</p>
          <p>EXPIRY is not a failure or shutdown, but a conclusion. A real ending that deserves witnessing, marking, and celebration.</p>
          <p>Bitcoin block time becomes the medium - what tape was to the banana, time itself is here.</p>

          <div class="bb-statement__scenario">
            <p>Imagine this -</p>
            <p>A collector activates a piece. In a gallery. A crowd gathers.</p>
            <p>The block arrives: the work is born. Expiry revealed: eight months.</p>
            <p>Eight months later, the audience returns. The final block hits. The work expires.</p>
            <p class="bb-statement__curtain">Curtain.</p>
          </div>
        </div>
      </details>
    </section>

    <!-- Collapsible FAQ -->
    <section class="bb-about-faq bb-reveal bb-reveal--delay-4">
      <details class="bb-faq-item">
        <summary class="bb-faq-question">How does it work?</summary>
        <div class="bb-faq-answer">
          <p>Each BEST BEFORE piece is an inscription - a piece of art permanently embedded in a Bitcoin transaction. It is born with an unknown lifespan, determined only when the collector "opens" it by inscribing a child. Once opened, the clock starts ticking - measured in Bitcoin blocks (~10 min each).</p>
          <p>Lifespans range from 2 weeks to 90 years, with a 0.69% chance of immortality. 25% expire within 1 month, 50% within 3 years.</p>
        </div>
      </details>

      <details class="bb-faq-item">
        <summary class="bb-faq-question">What's the total supply?</summary>
        <div class="bb-faq-answer">
          <p>420 unique editions, each with its own randomly determined lifespan and palette.</p>
        </div>
      </details>

      <details class="bb-faq-item">
        <summary class="bb-faq-question">Can I keep it sealed forever?</summary>
        <div class="bb-faq-answer">
          <p>Yes. A SEALED piece never ages. It stays frozen in potential - and can be activated years, even decades, from now.</p>
        </div>
      </details>

      <details class="bb-faq-item">
        <summary class="bb-faq-question">What happens when it expires?</summary>
        <div class="bb-faq-answer">
          <p>The artwork displays EXPIRED on a plain black background. The generative art is gone - only the record of its life remains on-chain.</p>
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
