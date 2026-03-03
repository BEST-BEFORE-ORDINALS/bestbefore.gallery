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
// Typewriter utility — appends chars as inline spans (for later decay)
// ─────────────────────────────────────────────────────────────────────────────
const appendChar = (el, char) => {
  if (char === ' ' || char === '\u00A0') {
    el.appendChild(document.createTextNode('\u00A0'));
  } else {
    const s = document.createElement('span');
    s.className = 'bb-char';
    s.textContent = char;
    el.appendChild(s);
  }
};

const typeInto = (el, text, speed, onDone) => {
  el.classList.add('is-typing');
  let i = 0;
  const next = () => {
    if (i >= text.length) {
      el.classList.remove('is-typing');
      onDone?.();
      return;
    }
    appendChar(el, text[i]);
    i++;
    setTimeout(next, speed + (Math.random() * 8 - 4)); // slight jitter
  };
  next();
};

// ─────────────────────────────────────────────────────────────────────────────
// Random character decay — shuffles all .bb-char spans, erases in batches
// ─────────────────────────────────────────────────────────────────────────────
const startDecay = (container, onDone) => {
  const chars = [...container.querySelectorAll('.bb-char')];
  // Fisher-Yates shuffle
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  let idx = 0;
  const tick = setInterval(() => {
    const batch = 2 + Math.floor(Math.random() * 3);
    for (let b = 0; b < batch; b++) {
      if (idx >= chars.length) {
        clearInterval(tick);
        // Wait for last chars to finish their exit animation, then reveal
        setTimeout(onDone, 420);
        return;
      }
      chars[idx].classList.add('is-dying');
      idx++;
    }
  }, 55);
};

// ─────────────────────────────────────────────────────────────────────────────
// Content reveal — quote, statement, and FAQ arrive in sequence
// ─────────────────────────────────────────────────────────────────────────────
// Triggered after typing completes; stays visible through later text decay
// ─────────────────────────────────────────────────────────────────────────────
const revealContent = (aboutFaq) => {
  if (aboutFaq.dataset.bbContentRevealed === '1') return;
  aboutFaq.dataset.bbContentRevealed = '1';

  const show = (el, delay = 0) => {
    if (!el) return;
    setTimeout(() => {
      el.style.display = '';
      requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('is-revealed')));
    }, delay);
  };

  // Pull quote lands first
  show(aboutFaq.querySelector('#bbPullQuote'), 60);

  // Then statement, then FAQ with a soft stagger
  show(aboutFaq.querySelector('#bbStatement'), 380);

  const faqSection = aboutFaq.querySelector('#bbFaq');
  if (faqSection) {
    show(faqSection, 560);
    faqSection.querySelectorAll('.bb-faq-item').forEach((item, i) => {
      setTimeout(() => item.classList.add('is-revealed'), 700 + i * 130);
    });
  }

  // Vault hint
  show(aboutFaq.querySelector('#bbVaultHint'), 1200);
};

// ─────────────────────────────────────────────────────────────────────────────
// Post-decay — collapse the narrative cleanly so content pulls up
// ─────────────────────────────────────────────────────────────────────────────
const revealAfterDecay = (aboutFaq) => {
  const narrative = aboutFaq.querySelector('#bbNarrative');
  if (!narrative) {
    revealContent(aboutFaq);
    return;
  }

  const finish = () => {
    narrative.style.display = 'none';
    revealContent(aboutFaq);
  };

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    narrative.style.height = '0';
    narrative.style.paddingTop = '0';
    narrative.style.paddingBottom = '0';
    narrative.style.opacity = '0';
    finish();
    return;
  }

  // Smooth collapse so following blocks glide up instead of snapping.
  narrative.style.willChange = 'height, padding, opacity, filter, transform';
  narrative.style.overflow = 'hidden';
  const styles = window.getComputedStyle(narrative);
  const h = narrative.scrollHeight || narrative.offsetHeight;
  narrative.style.height = h + 'px';
  narrative.style.paddingTop = styles.paddingTop;
  narrative.style.paddingBottom = styles.paddingBottom;
  narrative.style.opacity = '1';
  narrative.style.filter = 'blur(0)';
  narrative.style.transform = 'translateY(0)';
  void narrative.offsetHeight;
  narrative.style.transition = [
    'height 900ms cubic-bezier(0.22, 1, 0.36, 1)',
    'padding-top 900ms cubic-bezier(0.22, 1, 0.36, 1)',
    'padding-bottom 900ms cubic-bezier(0.22, 1, 0.36, 1)',
    'opacity 700ms ease',
    'filter 700ms ease',
    'transform 900ms cubic-bezier(0.22, 1, 0.36, 1)',
  ].join(', ');

  let completed = false;
  const handleEnd = (event) => {
    if (event.propertyName !== 'height' || completed) return;
    completed = true;
    narrative.removeEventListener('transitionend', handleEnd);
    finish();
  };
  narrative.addEventListener('transitionend', handleEnd);

  requestAnimationFrame(() => {
    narrative.style.height = '0';
    narrative.style.paddingTop = '0';
    narrative.style.paddingBottom = '0';
    narrative.style.opacity = '0';
    narrative.style.filter = 'blur(8px)';
    narrative.style.transform = 'translateY(-10px)';
  });

  // Fallback in case transitionend is skipped.
  setTimeout(() => {
    if (completed) return;
    completed = true;
    narrative.removeEventListener('transitionend', handleEnd);
    finish();
  }, 1200);

  // Post-decay hero copy removed; pull quote handles the text reveal.
};

// ─────────────────────────────────────────────────────────────────────────────
// Main renderer
// ─────────────────────────────────────────────────────────────────────────────
export const renderAboutFaq = () => {
  const aboutFaq = document.querySelector('#bbAboutFaq');
  if (!aboutFaq) return;
  delete aboutFaq.dataset.bbContentRevealed;

  aboutFaq.innerHTML = `
    <!-- ── Hero — permanent, never typed, never erased ── -->
    <section class="bb-about-hero">
      <h2 class="bb-about-hero__title">BEST BEFORE</h2>
      <p class="bb-about-hero__question">What if art could expire?</p>
      <div class="bb-about-lifespan" id="bbAboutLifespan">
        <div class="bb-about-lifespan__fill" id="bbLifespanFill"></div>
      </div>
    </section>

    <!-- ── Narrative — typed in, decays on idle ── -->
    <section class="bb-about-narrative" id="bbNarrative">
      <p class="bb-about-narrative__lead" id="bbNarrP0"></p>
      <p id="bbNarrP1"></p>
      <p id="bbNarrP2"></p>
    </section>

    <!-- ── Pull quote — fades in after typing, before FAQ ── -->
    <div class="bb-pull-quote bb-post-decay-el" id="bbPullQuote" style="display:none">
      <blockquote class="bb-quote">Carpe Diem</blockquote>
    </div>

    <!-- ── Statement — appears closed after FAQ ── -->
    <section class="bb-about-statement bb-post-decay-el" id="bbStatement" style="display:none">
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

    <!-- ── FAQ — hidden until post-decay ── -->
    <section class="bb-about-faq bb-post-decay-el" id="bbFaq" style="display:none">
      <details class="bb-faq-item" data-faq-slug="how-does-it-work">
        <summary class="bb-faq-question">How does it work?</summary>
        <div class="bb-faq-answer">
          <p>Each BEST BEFORE piece is an inscription — a piece of art permanently embedded in a Bitcoin transaction. It is born with an unknown lifespan, determined only when the collector "opens" it by inscribing a child. Once opened, the clock starts ticking — measured in Bitcoin blocks (~10 min each).</p>
          <p>Lifespans range from 2 weeks to 90 years, with a 0.69% chance of immortality. 25% expire within 1 month, 50% within 3 years.</p>
        </div>
      </details>
      <details class="bb-faq-item" data-faq-slug="whats-the-total-supply">
        <summary class="bb-faq-question">What's the total supply?</summary>
        <div class="bb-faq-answer">
          <p>420 unique editions, each with its own randomly determined lifespan and palette.</p>
        </div>
      </details>
      <details class="bb-faq-item" data-faq-slug="can-i-keep-it-sealed-forever">
        <summary class="bb-faq-question">Can I keep it sealed forever?</summary>
        <div class="bb-faq-answer">
          <p>Yes. A SEALED piece never ages. It stays frozen in potential — and can be activated years, even decades, from now.</p>
        </div>
      </details>
      <details class="bb-faq-item" data-faq-slug="what-happens-when-it-expires">
        <summary class="bb-faq-question">What happens when it expires?</summary>
        <div class="bb-faq-answer">
          <p>The artwork displays EXPIRED on a plain black background. The generative art is gone — only the record of its life remains on-chain.</p>
        </div>
      </details>
    </section>

    <!-- ── Vault hint — hidden until post-decay ── -->
    <div class="bb-section-hint bb-post-decay-el" id="bbVaultHint" style="display:none">
      <span class="bb-scroll-hint__text">THE VAULT</span>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="20" height="20">
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    </div>
  `;

  // ── Paragraphs to type ──
  const paragraphs = [
    {
      id: 'bbNarrP0',
      text: 'Every piece is born SEALED, waiting in silence.',
      speed: 24,
    },
    {
      id: 'bbNarrP1',
      text: 'Once OPENED by its collector, the fate is determined — it begins to age on Bitcoin block time until it turns EXPIRED.',
      speed: 19,
    },
    {
      id: 'bbNarrP2',
      text: 'Many live short lives, some endure, and the rare outlier may never expire — the immortal.',
      speed: 22,
    },
  ];

  // ── Lifespan clock ──
  const LIFESPAN_MS = 25 * 1000; // 25 seconds of cumulative idle
  const IDLE_THRESHOLD_MS = 700; // ms of inactivity before considered idle

  const barFill = document.getElementById('bbLifespanFill');
  const narrative = document.getElementById('bbNarrative');

  let lifespanRemaining = LIFESPAN_MS;
  let lastInteractionAt = Date.now();
  let clockStarted = false;
  let decayStarted = false;
  let clockInterval = null;

  const onInteract = () => {
    if (decayStarted) return;
    lastInteractionAt = Date.now();
  };

  const startClock = () => {
    if (clockStarted) return;
    clockStarted = true;

    // Register interaction listeners
    document.addEventListener('mousemove', onInteract, { passive: true });
    document.addEventListener('scroll', onInteract, { passive: true, capture: true });
    document.addEventListener('touchmove', onInteract, { passive: true });
    document.addEventListener('keydown', onInteract);
    document.addEventListener('touchstart', onInteract, { passive: true });

    clockInterval = setInterval(() => {
      if (decayStarted) {
        clearInterval(clockInterval);
        return;
      }

      const idleDuration = Date.now() - lastInteractionAt;

      if (idleDuration >= IDLE_THRESHOLD_MS) {
        lifespanRemaining -= 100;
        const pct = Math.max(0, (lifespanRemaining / LIFESPAN_MS) * 100);
        if (barFill) barFill.style.width = `${pct}%`;

        if (lifespanRemaining <= 0) {
          clearInterval(clockInterval);
          decayStarted = true;
          triggerDecay();
        }
      }
    }, 100);
  };

  const triggerDecay = () => {
    // Hide the lifespan bar
    const lifespanBar = document.getElementById('bbAboutLifespan');
    if (lifespanBar) {
      lifespanBar.style.transition = 'opacity 0.6s';
      lifespanBar.style.opacity = '0';
    }

    // Remove any active typing cursor
    narrative?.querySelectorAll('.is-typing').forEach(el => el.classList.remove('is-typing'));

    // Decay all typed chars; collapse the empty narrative space, then reveal
    startDecay(narrative, () => {
      narrative.classList.add('is-decayed');
      revealAfterDecay(aboutFaq);
    });
  };

  // ── Typewriter sequence ──
  const typeSequence = (index) => {
    if (index >= paragraphs.length) {
      // Reveal right after typing completes; content remains through decay.
      setTimeout(() => revealContent(aboutFaq), 180);
      return;
    }

    const { id, text, speed } = paragraphs[index];
    const el = document.getElementById(id);
    if (!el) { typeSequence(index + 1); return; }

    typeInto(el, text, speed, () => {
      setTimeout(() => typeSequence(index + 1), 320);
    });
  };

  // ── Start when About zone enters viewport ──
  let sequenceStarted = false;

  const scrollRoot = document.querySelector('.bb-scroll-container');
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && !sequenceStarted) {
      sequenceStarted = true;
      observer.disconnect();

      // Small entrance delay, then begin typing
      setTimeout(() => {
        startClock();
        typeSequence(0);
      }, 400);
    }
  }, {
    root: scrollRoot || null,
    threshold: 0.25,
  });

  observer.observe(aboutFaq);
};

export const renderLifecycle = () => {};
