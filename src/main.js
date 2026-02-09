import './style.css';
import './beyond.css';

const app = document.querySelector('#app');

const numberFormat = new Intl.NumberFormat('en-US');
const utcDateTime = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'UTC',
});

const statusLabel = {
  open: 'OPEN',
  active: 'ACTIVE',
  sealed: 'SEALED',
  expired: 'EXPIRED',
};

const statusClass = {
  open: 'is-open',
  active: 'is-open',
  sealed: 'is-sealed',
  expired: 'is-expired',
};

const INTRO_AUTO_DELAY_MS = 3200;
const INTRO_EXIT_DURATION_MS = 1800;
const HEARTBEAT_ZOOM_DEFAULT = 1;

const state = {
  activeView: 'gallery',
  galleryMode: 'carousel',
  summary: null,
  items: [],
  aboutFaq: '',
  storyAssets: {},
  carousel: {
    items: [],
    index: 0,
    dragOffset: 0,
    pendingDragOffset: 0,
    dragStartX: 0,
    dragging: false,
    hovering: false,
    timer: null,
    dragRaf: null,
    loadedIndexes: new Set(),
    fullyLoaded: new Set(),
    immersive: false,
  },
  heartbeat: {
    items: [],
    index: 0,
    hovering: false,
    timer: null,
    dragging: false,
    dragStartX: 0,
    dragStartScrollLeft: 0,
    settleTimer: null,
    initialized: false,
  },
  beyond: {
    activeTab: 'artists', // artists, analytics, diary
  },
};

const ARTIST_BIO_LEMONHAZE = `
Lemonhaze is a Montreal born and Puerto Escondido based self-taught artist who merges his background in music, entrepreneurship and expressive writing into an explorative digital art journey.
Continually experimenting with tools like JavaScript, AI, and various digital drawing software, he approaches his work much like music production, often combining multiple tools in a single piece.
His practice is iterative, spontaneous, and modular — touching a wide range of interests from journaling to physical medium while focusing on his personal code-based paint engine.
His art acts both as a means of escape and as a tangible memento, often very personal, capturing the essence of his experiences and emotions.
With a deep appreciation for the lasting nature of the Bitcoin blockchain, he has chosen it as the foundation for his poetic and visual expressions.
Lemonhaze’s singular & offbeat journey as an artist, without the constraints of traditional art education or industry expectations, exudes a raw individuality. Each piece being a modest reflection of his evolving perspective and soul.
`;

const ARTIST_BIO_ORDINALLY = `
ORDINALLY’s first scribbles were on IBM 5081 punch cards his dad brought home from work.
That grid sparked a lifelong love of code and a sense that math is not only rigorous but also beautiful, with patterns, recursion, and constraints forming a kind of language.
After years in technology, Ordinals gave him the perfect way back to making by combining generative code, latent space tools, and diffusion workflows with Bitcoin’s permanence.
ORDINALLY now balances his own creative work with the behind-the-scenes engineering that helps other artists bring their pieces on chain.
`;

const escapeHtml = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const parseDate = (iso) => {
  if (!iso) {
    return 'Unknown date';
  }

  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? 'Unknown date' : utcDateTime.format(parsed);
};

const getNumberLabel = (number) => (number === null ? 'Unknown' : `Nº${number}`);

const getRelativeDiff = (index, activeIndex, total) => {
  let diff = index - activeIndex;

  if (diff > total / 2) {
    diff -= total;
  }

  if (diff < -total / 2) {
    diff += total;
  }

  return diff;
};

const statusCount = (items, status) => items.filter((item) => item.status === status).length;

const stopMotionTimers = () => {
  if (state.carousel.timer) {
    window.clearInterval(state.carousel.timer);
    state.carousel.timer = null;
  }

  if (state.carousel.dragRaf) {
    window.cancelAnimationFrame(state.carousel.dragRaf);
    state.carousel.dragRaf = null;
  }

  if (state.heartbeat.timer) {
    window.clearInterval(state.heartbeat.timer);
    state.heartbeat.timer = null;
  }

  if (state.heartbeat.settleTimer) {
    window.clearTimeout(state.heartbeat.settleTimer);
    state.heartbeat.settleTimer = null;
  }
};

const renderShell = () => {
  app.innerHTML = `
    <div class="bb-root">
      <div class="bb-grain" aria-hidden="true"></div>

      <section class="bb-intro" id="bbIntro" aria-label="Landing intro">
        <div class="bb-intro__core">
          <div class="bb-intro__logo-shell">
            <img class="bb-intro__logo bb-intro__logo--uploaded" src="/assets/logo/bb-uploaded-logo.jpeg" alt="BEST BEFORE logo" />
            <span class="bb-intro__hourglass" aria-hidden="true"></span>
            <span class="bb-intro__sand bb-intro__sand--top" aria-hidden="true"></span>
            <span class="bb-intro__sand bb-intro__sand--stream" aria-hidden="true"></span>
            <span class="bb-intro__sand bb-intro__sand--bottom" aria-hidden="true"></span>
          </div>
          <h1 class="bb-intro__title">BEST BEFORE</h1>
          <p class="bb-intro__caption">BY LEMONHAZE X ORDINALLY</p>
          <button class="bb-intro__enter" id="bbEnterButton" type="button">ENTER MUSEUM</button>
        </div>
      </section>

      <main class="bb-experience">
        <header class="bb-menu">
          <div class="bb-menu__brand-wrap">
            <img src="/assets/logo/bb-uploaded-logo.jpeg" alt="BB" class="bb-menu__mark bb-menu__mark--uploaded" />
            <div class="bb-menu__brand-copy">
              <button class="bb-menu__brand" id="bbBrandButton" type="button">BEST BEFORE</button>
              <p class="bb-menu__subbrand">by Lemonhaze x ORDINALLY</p>
            </div>
          </div>

          <nav class="bb-menu__nav" id="bbMenuNav" aria-label="Museum views">
            <button class="bb-menu__item is-active" data-view="gallery" type="button">GALLERY</button>
            <button class="bb-menu__item" data-view="lifecycle" type="button">ABOUT</button>
            <button class="bb-menu__item" data-view="diary" type="button">BEYOND</button>
          </nav>

          <button class="bb-menu__toggle" id="bbMenuToggle" type="button" aria-label="Toggle menu">
            <span></span>
            <span></span>
          </button>

          <div class="bb-menu__stats" id="bbMenuStats">Loading collection snapshot...</div>
        </header>

        <section class="bb-content">
          <section class="bb-view bb-view--open is-active" data-view="gallery">
            <div class="bb-gallery-tools">
              <div class="bb-mode-toggle" role="tablist" aria-label="Gallery mode">
                <button class="bb-mode-btn is-active" data-mode="carousel" type="button" aria-label="Slideshow Mode">
                  <!-- Custom Carousel Icon: 3 Vertical Rectangles (Middle Taller) -->
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="5" y="8" width="3.5" height="8" rx="0.5" stroke="currentColor" stroke-width="1.2"/>
                    <rect x="10.25" y="5" width="3.5" height="14" rx="0.5" stroke="currentColor" stroke-width="1.2"/>
                    <rect x="15.5" y="8" width="3.5" height="8" rx="0.5" stroke="currentColor" stroke-width="1.2"/>
                  </svg>
                </button>
                <button class="bb-mode-btn" data-mode="heartbeat" type="button" aria-label="Live Mode">
                  <span class="bb-live-dot" aria-hidden="true"></span>
                  LIVE
                </button>
              </div>
            </div>

            <div class="bb-gallery-panel is-active" data-gallery-mode="carousel">
              <div class="bb-gallery-stage" id="bbGalleryStage">
                <button class="bb-carousel-control bb-carousel-control--prev" id="bbPrevBtn" type="button" aria-label="Previous slide">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <polyline points="15 18 9 12 15 6"></polyline>
                  </svg>
                </button>
                <div class="bb-carousel" id="bbCarousel" aria-live="polite"></div>
                <div class="bb-immersive-hud" id="bbImmersiveHud" aria-hidden="true">
                  <p class="bb-immersive-hud__label" id="bbImmersiveLabel"></p>
                  <a id="bbImmersiveLink" href="#" target="_blank" rel="noreferrer">View inscription</a>
                  <button id="bbImmersiveClose" type="button">Close</button>
                </div>
                <button class="bb-carousel-control bb-carousel-control--next" id="bbNextBtn" type="button" aria-label="Next slide">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </button>
              </div>
              <div class="bb-gallery-meta" id="bbGalleryMeta"></div>
            </div>

            <div class="bb-gallery-panel" data-gallery-mode="heartbeat">
              <div class="bb-heartbeat-stage" id="bbHeartbeatStage">
                <button class="bb-heartbeat-control bb-heartbeat-control--prev" id="bbHeartbeatPrev" type="button" aria-label="Previous heartbeat">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <polyline points="15 18 9 12 15 6"></polyline>
                  </svg>
                </button>
                <div class="bb-heartbeat-track-wrap">
                  <div class="bb-heartbeat-track" id="bbHeartbeatTrack"></div>
                </div>
                <div class="bb-heartbeat-info" id="bbHeartbeatInfo"></div>
                <button class="bb-heartbeat-control bb-heartbeat-control--next" id="bbHeartbeatNext" type="button" aria-label="Next heartbeat">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </button>
              </div>
            </div>
          </section>



          <section class="bb-view" data-view="diary">
            <div class="bb-beyond-layout">
              <nav class="bb-sub-nav">
                <button class="bb-sub-nav__item ${state.beyond.activeTab === 'artists' ? 'is-active' : ''}" data-beyond-tab="artists" type="button">ARTISTS</button>
                <button class="bb-sub-nav__item ${state.beyond.activeTab === 'diary' ? 'is-active' : ''}" data-beyond-tab="diary" type="button">DIARY</button>
                <button class="bb-sub-nav__item ${state.beyond.activeTab === 'analytics' ? 'is-active' : ''}" data-beyond-tab="analytics" type="button">ANALYTICS</button>
              </nav>

              <div class="bb-beyond-content" id="bbBeyondContent">
                ${renderBeyondContent()}
              </div>
            </div>
          </section>

          <section class="bb-view" data-view="lifecycle">
            <div class="bb-scroll-view">
              <article class="bb-block">
                <!-- <p class="bb-block__sub">SEALED - OPENED - EXPIRED</p> -->
                <div class="bb-about-rich" id="bbAboutFaq">Loading project description...</div>
              </article>
            </div>
          </section>
        </section>

      </main>
    </div>
  `;
};

const renderBeyondContent = () => {
  if (state.beyond.activeTab === 'artists') {
    return `
      <div class="bb-artists-grid">
        <article class="bb-artist-profile">
          <h3 class="bb-artist-name">Lemonhaze</h3>
          <div class="bb-artist-bio">
            <p>${ARTIST_BIO_LEMONHAZE.trim().replace(/\n/g, '<br />')}</p>
          </div>
        </article>
        <article class="bb-artist-profile">
          <h3 class="bb-artist-name">ORDINALLY</h3>
          <div class="bb-artist-bio">
            <p>${ARTIST_BIO_ORDINALLY.trim().replace(/\n/g, '<br />')}</p>
          </div>
        </article>
      </div>
    `;
  }

  if (state.beyond.activeTab === 'diary') {
    return `
      <div class="bb-scroll-view bb-scroll-view--diary">
        <article class="bb-block">
          <h2>BEYOND THE CANVAS</h2>
          <p class="bb-block__sub">Fragments and notes tied directly to the collection journey.</p>
          <pre class="bb-pre" id="bbDiaryFocused">${escapeHtml(state.diary || 'Loading diary...')}</pre>
        </article>
      </div>
    `;
  }

  if (state.beyond.activeTab === 'analytics') {
    return `
      <div class="bb-analytics-container">
        <iframe class="bb-analytics-frame" src="https://BESTBEFORE.SPACE" frameborder="0"></iframe>
      </div>
    `;
  }

  return '';
};



const applyLogoToInterface = (assetPath) => {
  const introLogo = document.querySelector('.bb-intro__logo');
  const menuMark = document.querySelector('.bb-menu__mark');

  if (!introLogo || !menuMark) {
    return;
  }

  introLogo.src = assetPath;
  menuMark.src = assetPath;
  introLogo.classList.add('bb-intro__logo--uploaded');
  menuMark.classList.add('bb-menu__mark--uploaded');
};

const applyInvertedFavicon = (assetPath) => {
  if (!assetPath) {
    return;
  }

  const image = new Image();
  image.crossOrigin = 'anonymous';
  image.decoding = 'async';
  image.src = assetPath;

  image.onload = () => {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d', { willReadFrequently: true });

    if (!context) {
      return;
    }

    context.fillStyle = '#000';
    context.fillRect(0, 0, size, size);
    context.drawImage(image, 0, 0, size, size);

    const imageData = context.getImageData(0, 0, size, size);
    const pixels = imageData.data;

    for (let index = 0; index < pixels.length; index += 4) {
      pixels[index] = 255 - pixels[index];
      pixels[index + 1] = 255 - pixels[index + 1];
      pixels[index + 2] = 255 - pixels[index + 2];
    }

    context.putImageData(imageData, 0, 0);

    const invertedDataUrl = canvas.toDataURL('image/png');
    const iconLinks = document.querySelectorAll('link[rel="icon"], link[rel="alternate icon"]');

    iconLinks.forEach((link) => {
      link.setAttribute('href', invertedDataUrl);
      link.setAttribute('type', 'image/png');
    });
  };
};

const resolveLogoAsset = async (preferredAsset) => {
  const candidates = [
    preferredAsset,
    '/assets/logo/bb-uploaded-logo.png',
    '/assets/logo/bb-uploaded-logo.jpeg',
    '/assets/logo/bb-uploaded-logo.jpg',
    '/assets/logo/bb-uploaded-logo.webp',
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate, { method: 'HEAD' });
      if (response.ok) {
        return candidate;
      }
    } catch {
      // Probe next candidate.
    }
  }

  return null;
};

const initIntro = () => {
  const intro = document.querySelector('#bbIntro');
  const enterButton = document.querySelector('#bbEnterButton');
  const introLogo = document.querySelector('.bb-intro__logo');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let autoEnterTimer = null;

  const enterMuseum = () => {
    if (document.body.classList.contains('bb-intro-exit')) {
      return;
    }

    if (autoEnterTimer) {
      window.clearTimeout(autoEnterTimer);
      autoEnterTimer = null;
    }

    window.requestAnimationFrame(() => {
      document.body.classList.add('bb-intro-exit');
    });

    window.setTimeout(() => {
      document.body.classList.add('bb-intro-complete');
      intro.setAttribute('hidden', '');
      restartMotionTimers();
    }, INTRO_EXIT_DURATION_MS);
  };

  enterButton.addEventListener('click', enterMuseum);

  if (prefersReducedMotion) {
    enterMuseum();
    return;
  }

  const scheduleAutoEnter = () => {
    if (document.body.classList.contains('bb-intro-exit')) {
      return;
    }

    autoEnterTimer = window.setTimeout(enterMuseum, INTRO_AUTO_DELAY_MS);
  };

  if (introLogo?.complete) {
    scheduleAutoEnter();
  } else if (introLogo) {
    introLogo.addEventListener('load', scheduleAutoEnter, { once: true });
    introLogo.addEventListener('error', scheduleAutoEnter, { once: true });
  } else {
    scheduleAutoEnter();
  }
};

const setActiveView = (viewId) => {
  state.activeView = viewId;

  if (viewId !== 'gallery' && state.carousel.immersive) {
    setCarouselImmersive(false);
  }

  document.querySelectorAll('.bb-menu__item').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.view === viewId);
  });

  document.querySelectorAll('.bb-view').forEach((view) => {
    view.classList.toggle('is-active', view.dataset.view === viewId);
  });

  restartMotionTimers();
};

const setGalleryMode = (mode) => {
  if (mode !== 'carousel' && state.carousel.immersive) {
    setCarouselImmersive(false);
  }

  state.galleryMode = mode;

  document.querySelectorAll('.bb-mode-btn').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.mode === mode);
  });

  document.querySelectorAll('.bb-gallery-panel').forEach((panel) => {
    panel.classList.toggle('is-active', panel.dataset.galleryMode === mode);
  });

  if (mode === 'carousel') {
    updateCarousel();
  }

  if (mode === 'heartbeat') {
    renderHeartbeat({ centerBehavior: state.heartbeat.initialized ? 'smooth' : 'auto' });
  }

  restartMotionTimers();
};

const initNavigation = () => {
  const menuNav = document.querySelector('#bbMenuNav');
  const menuToggle = document.querySelector('#bbMenuToggle');

  if (menuToggle && menuNav) {
    menuToggle.addEventListener('click', () => {
      menuNav.classList.toggle('is-open');
      menuToggle.classList.toggle('is-active');
    });
  }

  document.querySelectorAll('.bb-menu__item').forEach((button) => {
    button.addEventListener('click', () => {
      setActiveView(button.dataset.view);
      if (menuNav && menuNav.classList.contains('is-open')) {
        menuNav.classList.remove('is-open');
        menuToggle.classList.remove('is-active');
      }
    });
  });

  document.querySelector('#bbBrandButton').addEventListener('click', () => {
    setActiveView('gallery');
  });

  document.querySelectorAll('.bb-mode-btn').forEach((button) => {
    button.addEventListener('click', () => {
      setGalleryMode(button.dataset.mode);
    });
  });

  document.querySelector('#bbHeartbeatPrev')?.addEventListener('click', () => {
    prevHeartbeat();
    restartMotionTimers();
  });

  document.querySelector('#bbHeartbeatNext')?.addEventListener('click', () => {
    nextHeartbeat();
    restartMotionTimers();
  });

  // Beyond sub-navigation delegation
  const beyondNav = document.querySelector('.bb-view[data-view="diary"]');
  if (beyondNav) {
    beyondNav.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-beyond-tab]');
      if (!btn) return;

      if (btn.tagName === 'A') return; // Let links behave naturally

      const tab = btn.dataset.beyondTab;
      state.beyond.activeTab = tab;

      // Update nav state
      beyondNav.querySelectorAll('[data-beyond-tab]').forEach((b) => {
        b.classList.toggle('is-active', b.dataset.beyondTab === tab);
      });

      // Update content
      const contentContainer = document.querySelector('#bbBeyondContent');
      if (contentContainer) {
        contentContainer.innerHTML = renderBeyondContent();
      }
    });
  }
};

const formatBlockTime = (blocks) => {
  if (!blocks || blocks < 0) return '0m';
  const minutes = blocks * 10;
  const days = Math.floor(minutes / (60 * 24));
  const years = (days / 365.25).toFixed(1);

  if (days > 730) return `~${years} YEARS`;
  if (days > 0) return `~${days} DAYS`;
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `~${hours} HOURS`;
  return `~${minutes} MINS`;
};

const renderMenuStats = () => {
  const menuStats = document.querySelector('#bbMenuStats');
  if (!menuStats) {
    return;
  }

  let total, open, sealed, expired;

  if (state.liveSummary) {
    // Live summary structure: { open: N, sealed: N, expired: N, immortal: N }
    // Total count comes from state.liveItems.length
    total = state.liveItems ? state.liveItems.length : 0;
    open = state.liveSummary.open || 0;
    sealed = state.liveSummary.sealed || 0;
    expired = state.liveSummary.expired || 0;
  } else {
    // Static summary structure: { totals: { total: N, open: N, ... } }
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

const renderDiary = (focused) => {
  const diary = document.querySelector('#bbDiaryFocused');
  if (!diary) {
    return;
  }
  // Use state.aboutFaq (which seems to hold the loaded text based on boot()) or the passed argument
  // Actually boot() loads 'bb-diary-best-before.txt' into 'diaryFocused' variable 
  // and then calls renderDiary(diaryFocused).
  // But wait, renderBeyondContent also renders this. 
  // The user wants the FULL text. 

  // Let's ensure state has it.
  if (focused && !state.diary) {
    state.diary = focused;
  }

  diary.textContent = state.diary || focused || 'No diary text available.';
};

const linkify = (value) => {
  const escaped = escapeHtml(value);
  return escaped.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noreferrer">$1</a>');
};

const formatInlineMarkup = (value) =>
  linkify(value)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br />');

const renderAboutFaq = (text) => {
  const aboutFaq = document.querySelector('#bbAboutFaq');
  if (!aboutFaq) {
    return;
  }

  if (!text) {
    aboutFaq.textContent = 'Project description unavailable.';
    return;
  }

  const assets = state.storyAssets || {};
  const normalizedText = text.replace(/\r/g, '').trim();
  // Allow for Markdown bold markers in the search for the FAQ start.
  const faqStart = normalizedText.search(/^\**_?What['’]s the total supply\?/im);
  const narrativeText = faqStart >= 0 ? normalizedText.slice(0, faqStart).trim() : normalizedText;
  const faqText = faqStart >= 0 ? normalizedText.slice(faqStart).trim() : '';

  const lifecycleTopFigure = assets.lifecycle
    ? `
      <figure class="bb-about-media bb-about-media--lifecycle-top">
        <img src="${assets.lifecycle}" alt="BEST BEFORE lifecycle visual" loading="lazy" decoding="async" />
      </figure>
  `
    : '';

  const introFigure = assets.aboutIntro
    ? `
      <figure class="bb-about-media bb-about-media--intro-inline">
        <img src="${assets.aboutIntro}" alt="BEST BEFORE intro visual" loading="lazy" decoding="async" />
      </figure>
  `
    : '';

  const renderNarrative = (text) => {
    if (!text) return '';
    const blocks = text.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);

    return blocks.map((block) => {
      // Remove Markdown bold wrappers for the heading check if they exist.
      const normalized = block.replace(/^\*\*(.+)\*\*$/, '$1').replaceAll('’', "'").trim();
      const headingMatch = /^(Best Before|How it works\??|The collector's role|About the artists|Lemonhaze|ORDINALLY|IT IS NOT JUST CODE|Expanded Performance Possibilities|Vernissage & Finissage|Collector Rituals|Lottery Theater|Festival Format|Gallery Commitments|Museum Stewardship)$/i.test(
        normalized,
      );

      if (headingMatch) {
        return `<h3 class="bb-about-heading">${escapeHtml(normalized)}</h3>`;
      }

      return `<p>${formatInlineMarkup(block)}</p>`;
    }).join('\n');
  };

  // Split narrative by image placeholders to respect text flow.
  const segments = narrativeText.split(/(<<<(?:LIFECYCLE|INTRO)_IMAGE>>>)/);
  const mainHtml = segments.map((segment) => {
    if (segment === '<<<LIFECYCLE_IMAGE>>>') return lifecycleTopFigure;
    if (segment === '<<<INTRO_IMAGE>>>') return introFigure;
    return renderNarrative(segment);
  }).join('');

  const faqLines = faqText
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const faqItems = [];
  let currentFaq = null;
  faqLines.forEach((line) => {
    // Check for questionmark, optionally followed by bold markers.
    if (/\?\*{0,2}$/.test(line)) {
      if (currentFaq) {
        faqItems.push(currentFaq);
      }
      // Remove potential bold markers from valid questions for clean display
      const cleanQuestion = line.replace(/^\*\*/, '').replace(/\*\*$/, '');
      currentFaq = { question: cleanQuestion, answerLines: [] };
      return;
    }

    if (!currentFaq) {
      return;
    }

    currentFaq.answerLines.push(line);
  });

  if (currentFaq) {
    faqItems.push(currentFaq);
  }

  const faqHtml = faqItems.length
    ? `
      <section class="bb-faq">
        <h3 class="bb-about-heading bb-about-heading--faq">FAQ</h3>
        <div class="bb-faq__list">
          ${faqItems
      .map(
        (item) => `
                <article class="bb-faq__item">
                  <h4 class="bb-faq__q">${escapeHtml(item.question)}</h4>
                  <p class="bb-faq__a">${item.answerLines.map((line) => formatInlineMarkup(line)).join('<br />')}</p>
                </article>
              `,
      )
      .join('')}
        </div>
      </section>
  `
    : '';

  aboutFaq.innerHTML = `${mainHtml}${faqHtml} `;
};

const applyHeartbeatScale = (scale) => {
  const stage = document.querySelector('#bbHeartbeatStage');
  if (!stage) {
    return;
  }

  const normalized = Math.min(1.9, Math.max(0.72, Number(scale) || 1));
  const compactViewport = window.matchMedia('(max-width: 760px)').matches;

  const thumb = Math.round(68 * normalized);
  const gap = Math.max(7, Math.round(14 - (normalized - 1) * 8));
  const activeScale = compactViewport ? 1.46 : 1.72;
  const centerPad = Math.round(thumb * 1.08);

  stage.style.setProperty('--hb-thumb-size', `${thumb} px`);
  stage.style.setProperty('--hb-gap', `${gap} px`);
  stage.style.setProperty('--hb-active-scale', String(activeScale));
  stage.style.setProperty('--hb-center-pad', `${centerPad} px`);
};

const renderLifecycle = () => { };

const renderCarouselCards = () => {
  const carousel = document.querySelector('#bbCarousel');
  if (!carousel) {
    return;
  }

  if (state.carousel.items.length === 0) {
    carousel.innerHTML = '<p class="bb-carousel-empty">No preview items found.</p>';
    return;
  }

  carousel.innerHTML = state.carousel.items
    .map(
      (item, index) => `
      <article class="bb-slide ${statusClass[item.status] || ''}" data-index="${index}" aria-label="${escapeHtml(item.name)}">
        <img
          data-src="${item.preview}"
          data-index="${index}"
          data-ordinals="${item.ordinalsUrl || ''}"
          alt="${escapeHtml(item.name)}"
          loading="lazy"
          decoding="async"
          onload="state.carousel.fullyLoaded.add(${index}); this.classList.add('is-loaded');"
        />
      </article>
      `,
    )
    .join('');

  carousel.querySelectorAll('.bb-slide').forEach((slide) => {
    slide.addEventListener('click', (event) => {
      if (state.carousel.dragging) {
        return;
      }

      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        // Mobile behavior: Tap to skip/advance
        event.stopPropagation();
        nextSlide();
        restartMotionTimers();
        return;
      }

      const targetIndex = Number.parseInt(slide.dataset.index, 10);
      state.carousel.index = targetIndex;
      state.carousel.dragOffset = 0;
      state.carousel.pendingDragOffset = 0;
      setCarouselImmersive(true);
      updateCarousel();
      restartMotionTimers();
    });
  });
};

const updateImmersiveHud = () => {
  const hud = document.querySelector('#bbImmersiveHud');
  const label = document.querySelector('#bbImmersiveLabel');
  const link = document.querySelector('#bbImmersiveLink');

  if (!hud || !label || !link) {
    return;
  }

  if (!state.carousel.immersive || state.carousel.items.length === 0) {
    hud.classList.remove('is-active');
    hud.setAttribute('aria-hidden', 'true');
    return;
  }

  const item = state.carousel.items[state.carousel.index];

  label.textContent = `${item.name} • ${getNumberLabel(item.number)} `;

  if (item.ordinalsUrl) {
    link.href = item.ordinalsUrl;
    link.classList.remove('is-hidden');
  } else {
    link.removeAttribute('href');
    link.classList.add('is-hidden');
  }

  hud.classList.add('is-active');
  hud.setAttribute('aria-hidden', 'false');
};

const setCarouselImmersive = (enabled) => {
  if (state.carousel.immersive === enabled) {
    return;
  }

  state.carousel.immersive = enabled;
  document.querySelector('.bb-root')?.classList.toggle('is-carousel-immersive', enabled);
  updateCarousel();
  updateImmersiveHud();
};

const renderCarouselMeta = () => {
  const target = document.querySelector('#bbGalleryMeta');

  if (state.carousel.items.length === 0) {
    target.innerHTML = '<p>Carousel unavailable.</p>';
    return;
  }

  const item = state.carousel.items[state.carousel.index];
  const current = state.carousel.index + 1;
  const total = state.carousel.items.length;

  target.innerHTML = `
  <div class="bb-gallery-meta__left">
      <p class="bb-gallery-meta__eyebrow">${current} / ${total}</p>
      <h2>${escapeHtml(item.name)}</h2>
      <p>${escapeHtml(getNumberLabel(item.number))} • <span class="${statusClass[item.status] || ''}">${escapeHtml(
    statusLabel[item.status] || item.status,
  )}</span></p>
      <p>${escapeHtml(item.dimensions || '9:16')}</p>
    </div>
  <div class="bb-gallery-meta__right">
    ${item.ordinalsUrl
      ? `<a href="${item.ordinalsUrl}" target="_blank" rel="noreferrer">View inscription</a>`
      : '<span>Sealed</span>'
    }
  </div>
`;
};

const updateCarousel = () => {
  const stage = document.querySelector('#bbGalleryStage');
  const slides = document.querySelectorAll('.bb-slide');
  const total = state.carousel.items.length;

  if (!stage || total === 0) {
    return;
  }

  const stageWidth = stage.clientWidth;
  const sampleSlide = slides[0];
  const slideWidth = sampleSlide ? sampleSlide.offsetWidth : Math.min(350, Math.max(220, stageWidth * 0.22));
  const edgePadding = 10;
  const maxOffset = Math.max(240, stageWidth / 2 - slideWidth / 2 - edgePadding);
  const isDesktop = stageWidth >= 980;
  const isCompact = stageWidth < 760;

  let sideShift = Math.max(260, slideWidth * 1.1 + 26);
  let farShift = Math.max(sideShift + 140, sideShift * 1.3);

  sideShift = Math.min(sideShift, maxOffset * 0.78);
  farShift = Math.min(farShift, Math.max(sideShift + 140, maxOffset + 40));
  if (isDesktop) {
    farShift = Math.max(farShift, maxOffset + 20);
  }
  if (farShift < sideShift + 90) {
    farShift = Math.min(Math.max(sideShift + 140, maxOffset + 40), sideShift + 90);
  }

  const drag = state.carousel.dragOffset;

  slides.forEach((slide, index) => {
    const diff = getRelativeDiff(index, state.carousel.index, total);
    const abs = Math.abs(diff);
    const image = slide.querySelector('img');

    if (image && abs <= 3 && !state.carousel.loadedIndexes.has(index)) {
      image.src = image.dataset.src;
      image.decoding = 'async';
      state.carousel.loadedIndexes.add(index);
    }

    if (image) {
      if (diff === 0 || state.carousel.immersive) {
        image.loading = 'eager';
        image.fetchPriority = 'high';
      } else {
        image.loading = 'lazy';
        image.fetchPriority = 'auto';
      }
    }

    let transform = 'translate3d(-50%, -50%, -760px) scale(0.52)';
    let opacity = 0;
    let zIndex = 1;
    let imageOpacity = 0.22;
    let pointerEvents = 'none';

    if (state.carousel.immersive) {
      if (diff === 0) {
        transform = 'translate3d(-50%, -50%, 0px) scale(1.28)';
        opacity = 1;
        zIndex = 60;
        imageOpacity = 1;
        pointerEvents = 'auto';
      } else {
        transform = 'translate3d(-50%, -50%, -320px) scale(0.8)';
        opacity = 0;
        zIndex = 1;
        imageOpacity = 0;
      }
    } else if (diff === 0) {
      transform = `translate3d(calc(-50% + ${drag}px), -50%, 0px) scale(1.02)`;
      opacity = 1;
      zIndex = 40;
      imageOpacity = 1;
      pointerEvents = 'auto';
    } else if (isCompact) {
      transform = 'translate3d(-50%, -50%, -320px) scale(0.6)';
      opacity = 0;
      zIndex = 1;
      imageOpacity = 0;
      pointerEvents = 'none';
    } else if (diff === -1) {
      transform = `translate3d(calc(-50% - ${sideShift - drag * 0.18}px), -50%, -150px) scale(0.8) rotateY(5deg)`;
      opacity = 0.78;
      zIndex = 24;
      imageOpacity = 0.84;
      pointerEvents = 'auto';
    } else if (diff === 1) {
      transform = `translate3d(calc(-50% + ${sideShift + drag * 0.18}px), -50%, -150px) scale(0.8) rotateY(-5deg)`;
      opacity = 0.78;
      zIndex = 24;
      imageOpacity = 0.84;
      pointerEvents = 'auto';
    } else if (diff === -2) {
      transform = `translate3d(calc(-50% - ${farShift - drag * 0.05}px), -50%, -280px) scale(0.46) rotateY(1.5deg)`;
      opacity = 0.36;
      zIndex = 12;
      imageOpacity = 0.48;
    } else if (diff === 2) {
      transform = `translate3d(calc(-50% + ${farShift + drag * 0.05}px), -50%, -280px) scale(0.46) rotateY(-1.5deg)`;
      opacity = 0.36;
      zIndex = 12;
      imageOpacity = 0.48;
    } else {
      transform = 'translate3d(-50%, -50%, -760px) scale(0.4)';
      opacity = 0;
      zIndex = 1;
      imageOpacity = 0;
      pointerEvents = 'none';
    }

    slide.style.transform = transform;
    slide.style.opacity = String(opacity);
    slide.style.zIndex = String(zIndex);
    slide.style.filter = 'none';
    slide.style.pointerEvents = pointerEvents;
    slide.classList.toggle('is-focus', diff === 0);
    slide.style.transition = state.carousel.dragging
      ? 'none'
      : 'transform 720ms cubic-bezier(0.18, 0.76, 0.24, 1), opacity 540ms ease';

    if (image) {
      const previewSrc = image.dataset.src;
      const ordinalsSrc = image.dataset.ordinals;

      if (state.carousel.immersive && diff === 0 && ordinalsSrc) {
        image.src = ordinalsSrc;
      } else if (previewSrc) {
        image.src = previewSrc;
      }

      image.style.opacity = String(imageOpacity);
      image.style.transition = state.carousel.dragging ? 'none' : 'opacity 420ms ease, filter 420ms ease';
    }
  });

  renderCarouselMeta();
  updateImmersiveHud();
};

const setCarouselIndex = (index) => {
  const total = state.carousel.items.length;
  if (total === 0) {
    return;
  }

  state.carousel.index = ((index % total) + total) % total;
  state.carousel.dragOffset = 0;
  state.carousel.pendingDragOffset = 0;
  updateCarousel();
};

const findNextLoadedIndex = (direction) => {
  const total = state.carousel.items.length;
  const current = state.carousel.index;

  // Scan up to total - 1 items to find the next loaded one.
  // We avoid checking the current item (i=0) because we want to move.
  for (let i = 1; i < total; i++) {
    // direction is 1 (next) or -1 (prev)
    let index = (current + direction * i) % total;
    if (index < 0) index += total;

    if (state.carousel.fullyLoaded.has(index)) {
      return index;
    }
  }

  // Fallback: if nothing else is loaded, just go to the immediate next/prev
  // so the user isn't stuck.
  let fallback = (current + direction) % total;
  if (fallback < 0) fallback += total;
  return fallback;
};

const nextSlide = () => {
  if (state.carousel.items.length === 0) return;
  setCarouselIndex(findNextLoadedIndex(1));
};

const prevSlide = () => {
  if (state.carousel.items.length === 0) return;
  setCarouselIndex(findNextLoadedIndex(-1));
};

const setHeartbeatIndex = (index) => {
  const total = state.heartbeat.items.length;
  if (total === 0) {
    return;
  }

  const normalized = ((index % total) + total) % total;
  if (normalized === state.heartbeat.index && state.heartbeat.initialized) {
    return;
  }

  state.heartbeat.index = normalized;
  renderHeartbeat();
};

const nextHeartbeat = () => {
  setHeartbeatIndex(state.heartbeat.index + 1);
};

const prevHeartbeat = () => {
  setHeartbeatIndex(state.heartbeat.index - 1);
};

const centerHeartbeatNode = (node, behavior = 'smooth') => {
  const wrap = document.querySelector('.bb-heartbeat-track-wrap');
  if (!wrap || !node) {
    return;
  }

  const targetLeft = node.offsetLeft + node.offsetWidth / 2 - wrap.clientWidth / 2;
  wrap.scrollTo({ left: targetLeft, behavior });
};

const renderHeartbeat = ({ rebuild = false } = {}) => {
  const track = document.querySelector('#bbHeartbeatTrack');
  const info = document.querySelector('#bbHeartbeatInfo');

  if (!track || !info) return;

  if (state.heartbeat.items.length === 0) {
    track.innerHTML = '<p class="bb-heartbeat-empty">No active pieces available for heartbeat mode.</p>';
    track.dataset.signature = '';
    info.innerHTML = '';
    return;
  }

  const totalItems = state.heartbeat.items.length;
  const activeIdx = state.heartbeat.index;

  // Windowed Rendering: Only render active item +/- offset
  const windowSize = 25;
  const halfWindow = Math.floor(windowSize / 2);
  let startIdx = Math.max(0, activeIdx - halfWindow);
  let endIdx = Math.min(totalItems, startIdx + windowSize);

  // Adjust start if end is at total
  if (endIdx === totalItems) {
    startIdx = Math.max(0, endIdx - windowSize);
  }

  const signature = `${totalItems}:${startIdx} -${endIdx} `;
  const shouldRebuildTrack = rebuild || track.dataset.signature !== signature;

  if (shouldRebuildTrack) {
    const floorHtml = '<div class="bb-heartbeat-floor"></div>';
    const nodesHtml = state.heartbeat.items.slice(startIdx, endIdx)
      .map((item, i) => {
        const index = startIdx + i;
        const status = item.status?.toLowerCase();
        const isSealed = status === 'sealed';
        const isExpired = status === 'expired';
        const isLive = !isSealed && !isExpired;

        let thumbContent;
        if (isSealed) {
          thumbContent = `<img src="https://cdn.lemonhaze.com/assets/assets/SEALED.png" alt="Sealed" loading="lazy" />`;
        } else if (isExpired) {
          thumbContent = `<img src="https://cdn.lemonhaze.com/assets/assets/EXPIRED.png" alt="Expired" loading="lazy" />`;
        } else {
          // OPENED/LIVE pieces: high-performance iframe
          const isActive = index === activeIdx;
          if (isActive) {
            thumbContent = `<iframe src="${item.preview}" style="border:0;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; webgl; webgl2" allowfullscreen></iframe>`;
          } else {
            // Performance: Use static CDN preview image for non-active open items
            const cdnUrl = `https://cdn.lemonhaze.com/assets/assets/${item.id}.png`;
            thumbContent = `<img src="${cdnUrl}" alt="${escapeHtml(item.name)}" loading="lazy" />`;
          }
        }

        return `
          <div class="bb-heartbeat-node ${isLive ? 'bb-heartbeat-node--live' : ''} ${isSealed ? 'bb-heartbeat-node--sealed' : ''} ${isExpired ? 'bb-heartbeat-node--expired' : ''}" data-index="${index}">
            <span class="bb-heartbeat-node__thumb">${thumbContent}</span>
          </div>
        `;
      })
      .join('');

    track.innerHTML = floorHtml + nodesHtml;
    track.dataset.signature = signature;

    // Add click listeners
    track.querySelectorAll('.bb-heartbeat-node').forEach((node) => {
      node.addEventListener('click', () => {
        const index = parseInt(node.dataset.index, 10);
        setHeartbeatIndex(index);
        restartMotionTimers();
      });
    });
  }

  // Update Transformations
  const nodes = track.querySelectorAll('.bb-heartbeat-node');
  nodes.forEach((node) => {
    const idx = parseInt(node.dataset.index, 10);
    const item = state.heartbeat.items[idx];
    const status = item?.status?.toLowerCase();
    const isOpen = status === 'open';
    const isSealed = status === 'sealed';
    const isExpired = status === 'expired';

    const diff = idx - activeIdx;
    const abs = Math.abs(diff);

    const isMobile = window.innerWidth < 768;
    const lineY = isMobile ? 142.2 : 195.5;
    const gap = isMobile ? 28 : 48; // Consistent visual gap between items
    const baseWidth = isMobile ? 160 : 220; // Unscaled width of a single node

    // Helper to get actual visual width of any item in the track
    const getVisualWidth = (index, isFocus) => {
      const it = state.heartbeat.items[index];
      const open = it.status === 'open';
      const scale = isFocus
        ? (open ? 1 : 1.45)
        : (open ? 0.8 : 0.72);
      return baseWidth * scale;
    };

    // Node unscaled height
    const hUnscaled = isOpen ? (baseWidth * 16 / 9) : baseWidth;

    // Dynamic X Offset calculation
    let xOffset = 0;
    if (diff > 0) {
      // Accumulate widths for items to the right
      xOffset = getVisualWidth(activeIdx, true) / 2 + gap;
      for (let j = 1; j < abs; j++) {
        xOffset += getVisualWidth((activeIdx + j) % totalItems, false) + gap;
      }
      xOffset += getVisualWidth(idx, false) / 2;
    } else if (diff < 0) {
      // Accumulate widths for items to the left
      xOffset = -(getVisualWidth(activeIdx, true) / 2 + gap);
      for (let j = 1; j < abs; j++) {
        xOffset -= (getVisualWidth((activeIdx - j + totalItems) % totalItems, false) + gap);
      }
      xOffset -= getVisualWidth(idx, false) / 2;
    }

    let transform = '';
    let opacity = 0;
    let zIndex = 1;
    let pointerEvents = 'none';

    // Calculate yOffset (pixels) to sit on the floor line precisely
    if (diff === 0) {
      // Focus node: Centered
      const focusScale = isOpen ? 1 : 1.45;
      const yOffset = lineY - (focusScale * hUnscaled / 2);

      transform = `translate3d(-50%, calc(-50% + ${yOffset}px), 0) scale(${focusScale})`;
      opacity = 1;
      zIndex = 100;
      pointerEvents = 'auto';
    } else {
      // Ambient nodes: Dynamic X offset from focus
      const sideScale = isOpen ? 0.8 : 0.72;
      const yOffset = lineY - (sideScale * hUnscaled / 2);

      transform = `translate3d(calc(-50% + ${xOffset}px), calc(-50% + ${yOffset}px), 0) scale(${sideScale})`;
      opacity = Math.max(0, 0.85 - (abs * 0.25));
      zIndex = 50 - abs;
      pointerEvents = abs === 1 ? 'auto' : 'none';
    }

    node.style.setProperty('transform', transform, 'important');
    node.style.opacity = String(opacity);
    node.style.zIndex = String(zIndex);
    node.style.pointerEvents = pointerEvents;
    node.classList.toggle('is-focus', diff === 0);
    node.classList.toggle('is-active', diff === 0);
  });

  // Render Info Panel
  const item = state.heartbeat.items[activeIdx];
  const block = item.block || {};
  const paletteColors = item.palette?.colors || [];

  const paletteHtml = paletteColors.length > 0
    ? `<div class="bb-palette-list">
        <span class="bb-palette-name">${escapeHtml(item.palette?.id || 'Unknown')}</span>
        <div class="bb-palette-swatches">
          ${paletteColors.map(c => `<span class="bb-palette-dot" style="background: ${c}"></span>`).join('')}
        </div>
      </div>`
    : '<span class="bb-info-value">NONE</span>';

  const truncatedId = item.id ? `${item.id.slice(0, 7)}...${item.id.slice(-7)}` : 'UNKNOWN';

  const formattedBlocks = (val) => typeof val === 'number' ? numberFormat.format(val) : '0';

  let remainingStr, totalStr;

  if (item.status === 'sealed') {
    remainingStr = 'Unknown';
    totalStr = 'Unknown';
  } else {
    remainingStr = item.status === 'expired' ? 'EXPIRED' : `${formattedBlocks(block.remaining)} BLOCKS <span class="bb-muted-small">(${formatBlockTime(block.remaining || 0)})</span>`;
    totalStr = `${formattedBlocks(block.lifespan)} BLOCKS <span class="bb-muted-small">(${formatBlockTime(block.lifespan || 0)})</span>`;
  }

  info.innerHTML = `
    <div class="bb-gallery-meta-group">
      <h2 class="bb-gallery-meta__title">${escapeHtml(item.name)}</h2>
      <div class="bb-status-badge is-${item.status}">${escapeHtml(statusLabel[item.status] || item.status)}</div>
    </div>
    
    <div class="bb-info-panel">
      <div class="bb-info-row">
        <span class="bb-info-label">Palette</span>
        ${paletteHtml}
      </div>
      <div class="bb-info-row">
        <span class="bb-info-label">Remaining Lifespan</span>
        <span class="bb-info-value">${remainingStr}</span>
      </div>
      <div class="bb-info-row">
        <span class="bb-info-label">Total Lifespan</span>
        <span class="bb-info-value">${totalStr}</span>
      </div>
      <div class="bb-info-row">
        <span class="bb-info-label">Inscription ID</span>
        <span class="bb-info-value">${escapeHtml(truncatedId)}</span>
      </div>
    </div>

    <div class="bb-pagination">
      <button class="bb-pagination-btn" id="bbLivePrev" type="button" aria-label="Previous">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
      </button>
      <button class="bb-pagination-btn" id="bbLiveNext" type="button" aria-label="Next">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
      </button>
    </div>
  `;

  document.querySelector('#bbLivePrev')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const prevIdx = (state.heartbeat.index - 1 + totalItems) % totalItems;
    setHeartbeatIndex(prevIdx);
    restartMotionTimers();
  });

  document.querySelector('#bbLiveNext')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const nextIdx = (state.heartbeat.index + 1) % totalItems;
    setHeartbeatIndex(nextIdx);
    restartMotionTimers();
  });


};

const restartMotionTimers = () => {
  stopMotionTimers();

  if (!document.body.classList.contains('bb-intro-complete')) {
    return;
  }

  if (state.activeView !== 'gallery') {
    return;
  }

  if (state.galleryMode === 'carousel') {
    if (state.carousel.immersive) {
      return;
    }

    if (state.carousel.items.length > 1 && !state.carousel.hovering && !state.carousel.dragging) {
      state.carousel.timer = window.setInterval(() => {
        nextSlide();
      }, 4600);
    }
    return;
  }

  if (state.galleryMode === 'heartbeat') {
    // Heartbeat mode is manual-only by design (drag/click/buttons/arrow keys).
    // No autoplay interval should run here.
    state.heartbeat.timer = null;
  }
};

const initCarouselInteractions = () => {
  const stage = document.querySelector('#bbGalleryStage');
  const prevButton = document.querySelector('#bbPrevBtn');
  const nextButton = document.querySelector('#bbNextBtn');
  const immersiveClose = document.querySelector('#bbImmersiveClose');
  let controlsTimer = null;
  const flashCarouselControls = () => {
    if (!stage) {
      return;
    }

    stage.classList.add('is-controls-visible');
    if (controlsTimer) {
      window.clearTimeout(controlsTimer);
    }
    controlsTimer = window.setTimeout(() => {
      stage.classList.remove('is-controls-visible');
      controlsTimer = null;
    }, 1200);
  };

  const clickNext = (event) => {
    event.stopPropagation();
    nextSlide();
    restartMotionTimers();
  };

  // Click to next on mobile (if not immersive)
  document.querySelector('#bbCarousel')?.addEventListener('click', (e) => {
    const isMobile = window.innerWidth < 768;
    if (isMobile && !state.carousel.immersive) {
      nextSlide();
      restartMotionTimers();
    }
  });

  const clickPrev = (event) => {
    event.stopPropagation();
    prevSlide();
    restartMotionTimers();
  };

  const flushDragFrame = () => {
    state.carousel.dragRaf = null;

    if (state.galleryMode !== 'carousel' || !state.carousel.dragging) {
      return;
    }

    state.carousel.dragOffset = state.carousel.pendingDragOffset;
    updateCarousel();
  };

  prevButton.addEventListener('pointerdown', (event) => event.stopPropagation());
  nextButton.addEventListener('pointerdown', (event) => event.stopPropagation());
  prevButton.addEventListener('click', clickPrev);
  nextButton.addEventListener('click', clickNext);
  immersiveClose?.addEventListener('click', (event) => {
    event.stopPropagation();
    setCarouselImmersive(false);
    restartMotionTimers();
  });

  stage.addEventListener('mouseenter', () => {
    state.carousel.hovering = true;
    restartMotionTimers();
  });

  stage.addEventListener('mouseleave', () => {
    state.carousel.hovering = false;
    restartMotionTimers();
  });

  stage.addEventListener('pointerdown', (event) => {
    if (state.galleryMode !== 'carousel') {
      return;
    }

    if (event.target.closest('.bb-carousel-control')) {
      return;
    }

    if (event.target.closest('.bb-immersive-hud')) {
      return;
    }

    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    state.carousel.dragging = true;
    flashCarouselControls();
    state.carousel.dragStartX = event.clientX;
    state.carousel.dragOffset = 0;
    state.carousel.pendingDragOffset = 0;
    if (state.carousel.dragRaf) {
      window.cancelAnimationFrame(state.carousel.dragRaf);
      state.carousel.dragRaf = null;
    }
    stage.setPointerCapture(event.pointerId);
    restartMotionTimers();
  });

  stage.addEventListener('click', (event) => {
    if (!state.carousel.immersive) {
      return;
    }

    if (event.target.closest('.bb-slide') || event.target.closest('.bb-immersive-hud')) {
      return;
    }

    setCarouselImmersive(false);
    restartMotionTimers();
  });

  stage.addEventListener('pointermove', (event) => {
    if (state.galleryMode !== 'carousel' || !state.carousel.dragging) {
      return;
    }

    state.carousel.pendingDragOffset = event.clientX - state.carousel.dragStartX;

    if (!state.carousel.dragRaf) {
      state.carousel.dragRaf = window.requestAnimationFrame(flushDragFrame);
    }
  });

  const finishDrag = (event) => {
    if (!state.carousel.dragging) {
      return;
    }

    const threshold = 80;
    const offset = state.carousel.pendingDragOffset;

    if (state.carousel.dragRaf) {
      window.cancelAnimationFrame(state.carousel.dragRaf);
      state.carousel.dragRaf = null;
    }

    state.carousel.dragging = false;
    state.carousel.dragOffset = 0;
    state.carousel.pendingDragOffset = 0;

    if (offset <= -threshold) {
      nextSlide();
    } else if (offset >= threshold) {
      prevSlide();
    } else {
      updateCarousel();
    }

    try {
      stage.releasePointerCapture(event.pointerId);
    } catch {
      // No-op when capture is already released.
    }

    restartMotionTimers();
  };

  stage.addEventListener('pointerup', finishDrag);
  stage.addEventListener('pointercancel', finishDrag);

  stage.addEventListener('touchstart', () => {
    if (state.galleryMode !== 'carousel') {
      return;
    }
    flashCarouselControls();
  });

  const heartbeatStage = document.querySelector('#bbHeartbeatStage');
  const heartbeatTrackWrap = document.querySelector('.bb-heartbeat-track-wrap');
  const heartbeatTrack = document.querySelector('#bbHeartbeatTrack');

  const snapHeartbeatToCenter = () => {
    if (!heartbeatTrackWrap || !heartbeatTrack || state.heartbeat.items.length === 0) {
      return;
    }

    const nodes = [...heartbeatTrack.querySelectorAll('.bb-heartbeat-node')];
    if (nodes.length === 0) {
      return;
    }

    const wrapRect = heartbeatTrackWrap.getBoundingClientRect();
    const wrapCenter = wrapRect.left + wrapRect.width / 2;

    let nearestIndex = state.heartbeat.index;
    let nearestDistance = Number.POSITIVE_INFINITY;

    nodes.forEach((node) => {
      const nodeRect = node.getBoundingClientRect();
      const nodeCenter = nodeRect.left + nodeRect.width / 2;
      const distance = Math.abs(nodeCenter - wrapCenter);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = Number.parseInt(node.dataset.index, 10);
      }
    });

    setHeartbeatIndex(nearestIndex);
    restartMotionTimers();
  };

  const queueHeartbeatSettle = () => {
    if (state.heartbeat.settleTimer) {
      window.clearTimeout(state.heartbeat.settleTimer);
    }

    state.heartbeat.settleTimer = window.setTimeout(() => {
      state.heartbeat.settleTimer = null;
      if (!state.heartbeat.dragging && state.galleryMode === 'heartbeat') {
        snapHeartbeatToCenter();
      }
    }, 120);
  };

  heartbeatStage.addEventListener('mouseenter', () => {
    state.heartbeat.hovering = true;
    restartMotionTimers();
  });

  heartbeatStage.addEventListener('mouseleave', () => {
    state.heartbeat.hovering = false;
    restartMotionTimers();
  });

  if (heartbeatTrackWrap) {
    heartbeatTrackWrap.addEventListener('pointerdown', (event) => {
      if (state.galleryMode !== 'heartbeat') {
        return;
      }

      if (event.pointerType === 'mouse' && event.button !== 0) {
        return;
      }

      state.heartbeat.dragging = true;
      state.heartbeat.dragStartX = event.clientX;
      state.heartbeat.dragStartScrollLeft = heartbeatTrackWrap.scrollLeft;
      heartbeatTrackWrap.classList.add('is-dragging');
      heartbeatTrackWrap.setPointerCapture(event.pointerId);
      restartMotionTimers();
    });

    heartbeatTrackWrap.addEventListener('pointermove', (event) => {
      if (state.galleryMode !== 'heartbeat' || !state.heartbeat.dragging) {
        return;
      }

      const delta = event.clientX - state.heartbeat.dragStartX;
      heartbeatTrackWrap.scrollLeft = state.heartbeat.dragStartScrollLeft - delta;
      queueHeartbeatSettle();
    });

    const finishHeartbeatDrag = (event) => {
      if (!state.heartbeat.dragging) {
        return;
      }

      state.heartbeat.dragging = false;
      heartbeatTrackWrap.classList.remove('is-dragging');

      try {
        heartbeatTrackWrap.releasePointerCapture(event.pointerId);
      } catch {
        // No-op when capture is already released.
      }

      snapHeartbeatToCenter();
    };

    heartbeatTrackWrap.addEventListener('pointerup', finishHeartbeatDrag);
    heartbeatTrackWrap.addEventListener('pointercancel', finishHeartbeatDrag);
    heartbeatTrackWrap.addEventListener(
      'scroll',
      () => {
        const segmentWidth = heartbeatTrack ? heartbeatTrack.scrollWidth / 3 : 0;
        if (segmentWidth > 0) {
          if (heartbeatTrackWrap.scrollLeft < segmentWidth * 0.4) {
            heartbeatTrackWrap.scrollLeft += segmentWidth;
          } else if (heartbeatTrackWrap.scrollLeft > segmentWidth * 1.6) {
            heartbeatTrackWrap.scrollLeft -= segmentWidth;
          }
        }
        queueHeartbeatSettle();
      },
      { passive: true },
    );
  }

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && state.carousel.immersive) {
      setCarouselImmersive(false);
      restartMotionTimers();
      return;
    }

    if (state.activeView !== 'gallery') {
      return;
    }

    if (event.key === 'ArrowLeft') {
      if (state.galleryMode === 'carousel') {
        prevSlide();
      } else {
        prevHeartbeat();
      }
      restartMotionTimers();
    }

    if (event.key === 'ArrowRight') {
      if (state.galleryMode === 'carousel') {
        nextSlide();
      } else {
        nextHeartbeat();
      }
      restartMotionTimers();
    }
  });

  window.addEventListener('resize', () => {
    updateCarousel();
    renderHeartbeat({ centerBehavior: 'auto' });
  });
};

const setupGallery = () => {
  /* Define sort helper to reuse */
  const sortItems = (a, b) => {
    if (a.number === null && b.number === null) {
      return 0;
    }
    if (a.number === null) {
      return 1;
    }
    if (b.number === null) {
      return -1;
    }
    return b.number - a.number;
  };

  /* Setup Carousel (Slideshow) - Uses Static Data */
  const openWithPreview = state.items
    .filter((item) => item.status === 'open' && item.preview)
    .sort(sortItems);

  state.carousel.items = openWithPreview;
  state.carousel.index = 0;
  state.carousel.dragOffset = 0;
  state.carousel.pendingDragOffset = 0;
  state.carousel.loadedIndexes = new Set();
  state.carousel.immersive = false;
  document.querySelector('.bb-root')?.classList.remove('is-carousel-immersive');

  /* Setup Heartbeat (Live) - Uses Live Data if available */
  let heartbeatPool;

  if (state.liveItems && Array.isArray(state.liveItems) && state.liveItems.length > 0) {
    // Map live items: use 'id' to construct ordinals content URL.
    heartbeatPool = state.liveItems.map((item) => ({
      ...item,
      preview: `https://ordinals.com/content/${item.id}`,
      ordinalsUrl: `https://ordinals.com/inscription/${item.id}`,
    })).sort((a, b) => sortItems(b, a)); // Reverse sort: Ascending (1 -> 420)
  } else {
    // Fallback to static items if live data failed
    heartbeatPool = state.items
      .filter((item) => item.preview)
      .sort(sortItems);
  }

  state.heartbeat.items = heartbeatPool;
  state.heartbeat.index = heartbeatPool.length ? Math.floor(Math.random() * heartbeatPool.length) : 0;
  state.heartbeat.dragging = false;
  state.heartbeat.dragStartX = 0;
  state.heartbeat.dragStartScrollLeft = 0;
  state.heartbeat.initialized = false;
  if (state.heartbeat.settleTimer) {
    window.clearTimeout(state.heartbeat.settleTimer);
    state.heartbeat.settleTimer = null;
  }

  renderCarouselCards();
  updateCarousel();
  renderHeartbeat({ rebuild: true, centerBehavior: 'auto' });
  initCarouselInteractions();
  setGalleryMode(state.galleryMode);
  restartMotionTimers();
};

const loadJson = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed loading ${url}`);
  }

  return response.json();
};

const loadText = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed loading ${url}`);
  }

  return response.text();
};

const renderLoadError = (message) => {
  const menuStats = document.querySelector('#bbMenuStats');
  if (!menuStats) {
    return;
  }
  menuStats.innerHTML = `<span>${escapeHtml(message)}</span>`;
};

const DIARY_CONTENT = `<!--BEST BEFORE by Lemonhaze & ORDINALLY-->

<!--

Prelude: "The concept? Art for art’s sake, art that is timeless, art with the guts to make you feel uncomfortable with the truth most people won’t say."

- December 24, 2024 11:43 AM (Phú Quc, Vietnam)

This was the very first spark. Before 'Best Before'

I heard people say "art is all about concept now"
or "art on bitcoin must use the chain data" bla bla bla...

I was somewhat irritated. A concept? Futile!

Using the data just for the sake of it? Not exactly for me.

What does it even mean?!! To me. To you. To us, as human beings.

Some many questions and life went on...

January, February, March, April - oh God it was Rock and Roll!

It's morning, April 29th I left Thailand for Hong Kong a couple of days ago.

Did it again right on arrival. Things have gotten this wild.

Now I'm starting to think about how quickly things can turn bad in life.

You always think it's not gonna happen to you - but what if it does?! Lingering thoughts kept knocking at my door.

I'm circling back to old conversations with my childhood friend about how genetic play a large role in health.

And the other variables and intangibles of life that impact and determine one's fate.

I always mention the example of the person who had an healthy lifestyle but got hit by a car at 24.

Versus that son of a bitch who drank and smoked since he's 10 years old and lives until he's 89.

The chain and my work might last but I'm fucking things up right now.

Letting myself die ... no! Even worse - accelerating my own demise.

This time I more strongly realize how time is passing by.

For myself and for the one I love - my family that I miss dearly.

Again, so many questions... but now I have an idea.

Or should I say, a "concept".

I want the work to be more human and expire just like we do .

Suddenly I need the chain to determine fate and keep track of time.

April 29, 2025 - 1:24pm: Hello sir! Hope you’re doing great.

(...)

Part 1 (First steps):

L: April 29, 2025 - 1:24pm:

Hello sir! Hope you’re doing great. I’m reaching out cuz I’m flirting with an idea/concept for a new work that would require chain interactivity (which is beyond my depth), and so I was wondering if you could be the right person (complementary) to make this thing come to life with me?

While I’m still in the very early stages of brainstorming and iterating on the details of this potential project, here’s a brief overview of the general idea: “Best Before” (temporary title): Artworks with a date of expiration. Quite literally.

Each piece (inscription) has its own expiration date in Bitcoin block height, randomly determined at birth (mint/inscribe) within a given set of parameters.

Once expired, the original visual (artwork) should change to display “EXPIRED” on a plain black background – and nothing else – aka the artwork is now gone, and all we see is that plain 'EXPIRED'.

My goal here is to explore the contrast between Bitcoin’s promise of permanence and the reality that we, humans, have an expiration date (death) embedded in our DNA from birth (even if that date is unknown)... Permanence vs. Impermanence. example of artwork outputs (image below)

I have quite a few more things in my mind already, but these are the big lines to give you an idea of the technical work required.

Timeline? I'm flexible but aiming to bring this to term sometimes during the summer late-July-ish... I haven't talked about this project with anyone yet - other than you, here, in this message.

And if it's not your thing, not possible, or any reasons, I will totally understand and respect the decision - but still feel free to point me in another potential direction if you know of one.. (ex: Lifo was the 2nd on my list to reach out after you) Thanks in advance.

Cheers.

-Lemon

O: April 29, 2025 - 1:28pm

Love the concept. With some flexibility on timeline like you say this would be interesting for me - the next 2-3 weeks are already really busy for me, but for a launch in July or so it should work. Let me think through the technical work a bit, but at first glance it sounds doable and conceptually very interesting.

O: June 12, 2025 - 9:14 PM

Hey! How are things looking on your end? I'd have capacity starting from next week to start digging into this. Just talking to Danny, exciting to see you in the Artist Circle...

L: June 12, 2025 - 11:49 PM

Hey mate! Things have been good - a bit busy with making my new website hopefully I can get things to work "fine enough" to deploy a first mini version this weekend and be ready to focus on this next week - if anything maybe from Wednesday if things dont work out as planned for my site ahah But yeah, next week Ill be good to put my mind officially on this!

O: June 13, 2025 - 3:11 PM

No rush, Wednesday is good for me. If you want, we could have a call to kick things off? But we can also do things async, both are fine for me.

L: June 13, 2025 - 3:13 PM

Lets make a first intro call yes  - but then we can work async its fine. I’m in Vietnam UTC+7

Part 2 (A Day in the Life of Lemonhaze and Ordinally: The Journey to "Best Before"):

Based on the full conversation log from April to September 2025, here's a narrative reconstruction of a typical "day" in the life of Lemonhaze (L) and Ordinally (O), two collaborators forging an innovative Bitcoin Ordinals art project called "Best Before." This isn't a literal 24-hour snapshot but a composite drawing from their ongoing exchanges, capturing the essence of their creative process, technical challenges, and community interactions. The log reveals a blend of artistic iteration, technical problem-solving and personal reflections.

#### Morning: Brainstorming and Iteration (Creative Flow and Feedback)
The day often begins with Lemonhaze sharing new sketches, code snippets, or visual experiments, reflecting his immersive, iterative approach to art. He sends images of evolving artwork—organic shapes, dynamic textures, and effects like the "wobble" or emboss, aiming to make paintings feel "alive." For example, on June 19, L muses about breaking the grid or using WebGL to enhance the "living" quality, inspired by themes of impermanence versus Bitcoin's permanence. His excitement is palpable, describing breakthroughs as "caveman discovering fire" moments (e.g., August 18, refining textures). This creative drive is evident in L's reflection on June 25: "How can I paint, without having to justify myself or without making something that is 'too deliberately' (perhaps 'too obvious' is better term) in line with the original concept, that it would make it just unoriginal in the end?"
Ordinally, the technical anchor, responds with tools and insights, such as a beta function for expiry date distributions or a visualizer app to simulate lifetimes (June 19). Their Discord exchanges show a rhythm of async collaboration : L works in vanilla JavaScript (eschewing p5.js), while O tests on regtestnet , proposing ideas like child inscriptions for activation (July 16) or linguistic symmetry (SEALED to OPEN to EXPIRED). They debate concepts like collector - driven randomness , ensuring the artwork ' s lifecycle — pre - activation , alive , expired — mirrors the project ' s theme . O ' s input often grounds the vision , as seen on July 4: " The more I work on this , the more I think the core concept is really strong - the irreplaceable value of the time we have in our life , and the strong call to ' carpe diem ' - use the time before you expire ..." Permanence vs . Impermanence . L explores Bitcoin ' s eternal blockchain against human mortality , while O ensures the tech aligns , using random seeds from child inscription IDs and bathtub curves for death rates . This duality is highlighted in O ' s July 29 suggestion : " We could also have the collector input a seed - that is then inscribed into their piece - and then mixed with a future blockhash ," emphasizing the blend of human choice and blockchain determinism . The morning sets the tone for a partnership where L ' s intuitive artistry sparks ideas , and O provides practical feedback .

#### Midday : Technical Hurdles and Optimizations (The Grind)
Afternoons are consumed by technical challenges and performance tweaks . L grapples with texture optimizations , often doing late changes like removing white edges (August 18) or rethinking swirls (July 29). L shares his struggles on July 31: " I have some crazy (unreleased) set of texture function , but they are quite heavy and slow to render , that it makes it impracticable yet for inscriptions ... I still need to find better ways to optimize the code etc .. but I ' m not so good at that yet ahahah ." O dives into profiling , suggesting optimizations like Uint32 views for pixel operations or moving swirls to WebGL shaders to cut load times (July 28). His " quantized " swirl , initially an optimization attempt , sparks a creative pivot , leading to a 50/50 blend of " L - Swirl " and " O - Swirl " (July 29), though L later leans toward his original for consistency (August 20). They refine parameters : minimum lifetime (2 weeks), maximum (90 years), and a survival curve with a " golden era " (3-60 years of relative calm) and 0.69% immortals . O runs simulations on regtestnet , while L tests hundreds of outputs , trimming palettes from 49 to 45 to balance variety and coherence (August 24-28). O ' s custom " Long Canyon " palette , derived from his inscribed photograph (August 27), adds a personal touch . Insights from O ' s palette tool underscore their methodical approach : " The ΔE is essentially a measure of ' perceptive distance '... I ' d say anything above ΔE of 10 is pretty clearly distinguishable ," helping ensure palette diversity (August 27). Technical discussions extend to fixing edge continuation for seamless textures (June 24) and debating 3 D showroom views (June 25), with both opting for 2 D to avoid distractions from the core concept . They share music (L's Jkriv, O's Nils Frahm, July 2-4), mention hikes or fevers (August 1), and weave in personal anecdotes , grounding the technical grind in human connection . O ' s August 21 note on recording limitations —" Recording is hard ... in - browser it ' s super hard if not impossible to do well "— reflects the shared frustration and resilience in overcoming tech barriers , including experimenting with progressive rendering to mitigate initial load times (September 12-15).

#### Afternoon : Community Engagement and Planning (Building Momentum)
Afternoon exchanges shift toward community and logistics . They coordinate parent inscriptions and plan a Signals phase for price discovery (September 8-22, targeting a mid-September mint). L proposes embedding timestamps of their chats in the code as a " making of " easter egg (August 25), while O suggests a Q & A to explain the game theory of collector activation (August 12). They discuss platforms for child inscriptions , favoring flexibility (August 14). L shares outputs subtly on Twitter / X to gauge reception (July 19), while O engages trusted collaborators like Steven from Ancora for feedback on survival curves (August 15). They balance artistic integrity with market realities , debating supply (222 vs. 420) and pricing , aiming for accessibility without chasing hype (July 29). L ' s July 9 scheduling dilemma — pushing " Best Before " to late August to build momentum after another release — shows strategic foresight : " Let ' s use that as a starting point to perhaps get a bit of attention towards and build momentum for that larger release that we ' re currently working on ." Unfolding ideas , like collector rituals (unsealing at specific blocks like 888,888) and gallery commitments to display until expiry (September 4), add layers of cultural potential , emphasizing community - driven storytelling .

#### Evening : Finalizing and Reflecting (Nearing the Finish Line)
Evenings focus on wrapping up tasks . L finalizes palettes , recorder tweaks , and his Gentleman remix (August 17), while O completes simulations and tests progressive rendering to mitigate load times (August 9). They settle on a 420- piece supply , and plan a two - week Signals phase to build anticipation . L ' s excitement peaks , likening himself to a " kid on Christmas Eve " (August 30), while O reflects on a " super productive summer " with lessons learned (August 30). Final tweaks include enhancing textures with an emboss effect (September 18) and debating progressive rendering for smoother unseal experiences (September 12-15), culminating in a refined build with timelapse options . They navigate external pressures . Their shared vision — quality over hype , authenticity over market pandering — keeps them aligned . L ' s August 20 insight on outputs —" The more I generate output with the latest version ... the more I fail to find outputs I dislike "— captures the project ' s maturation . This " day " captures a dynamic partnership blending L ' s intuitive , iterative artistry with O ' s structured , technical precision . " Best Before " evolves from a conceptual exploration of mortality and permanence to a technically sophisticated project with collector - driven activation and a robust novel features . Their collaboration thrives on mutual respect , shared enthusiasm (e.g., music exchanges, palette creation), and a commitment to pushing Ordinals ' boundaries . Ultimately , their process embodies the project ' s core : embracing life ' s fleeting nature while etching enduring value on Bitcoin .

Part 3 (OPEN):

Early July , we faced one of the most crucial problems of all : when and how to start the clock ? O and I shared a few ideas but nothing conclusive yet - we needed more time ... And then , boom ! July 16 th arrived . O dropped in our chat and tells me all about this child activation thing he ' s been brainstorming with Nick a few days before while discussing potential mint / inscribing options . Admittedly , it took me a good 20 minutes to wrap my head around the implications of it all - but once it clicked , I was in awe . One of the things I like the most about " generative art " is seeing the collectors involved in the generation and randomness of the piece itself - and now collectors were gonna have absolute control over when to start the clock : I ' m in love !!! Suddenly , I can see all sorts of cool game theory and approaches to collecting this already exciting piece of art we were working on . Are you gonna keep it SEALED ? What if it' s EXPIRED in a few months ? And what if it ' s immortal ? As always , so many questions but exciting ones . Since each inscription can remain SEALED for decades / centuries , the collection was no longer going to end in 90 years . ' Best Before ' became exponentially more timeless and appealing to collect on that day .

Part 4 (PERFORMANCE):

" Best Before "... It ' s not just code .
Not just concept .

Each piece is a living system .

A ritual , a story , a self - contained performance art .

Museums , galleries , collectors , performers : everyone can play a role in shaping how these works live and die .

SEALED = latent performance The collector decides when to press play . That decision alone (time, place, context) is part of the art .

UNSEALING = act of theater Whether in private or in public , that single gesture is performance .

The lifespan = durational art Once opened , the piece lives - each block unfolding the performance .

EXPIRY = finale Not just code executing , but a literal ending that deserves celebration. Something like the banana on the wall - but instead of tape , you ’ ve got Bitcoin block time itself as the medium.

Picture this : A collector activates a piece . In a gallery. Crowd gathers. The block hits : the work is born - expiry ? 8 months ! Eight months later ? Same crowd returns . Final block arrives : the work expires . Curtain closes .

And this is just on the surface ... Here are some more ideas that we ' ve brought up so far :

Vernissage & Finissage Traditional exhibitions have openings and closings . Here , the artwork itself dictates both . A piece is unveiled at the vernissage (unsealed live), and years later the exhibition ends with the actual expiry - the piece itself shutting the lights off .

Collector Rituals Collectors can turn their choice into a cultural and networked event . " I ' ll unseal my piece at block 888,888." The community shows up . It becomes folklore . Think of card - pack opening streams - but with way higher stakes .

Lottery Theater Every birth is a surprise . Two weeks ? Ten years ? An immortal ? Stream it ! Let the randomness play out in front of an audience or something else you come up with . Let people cheer or gasp as fate is revealed .

Festival Format Organize an event . A whole fair where collectors unseal their works live on stage . Each one unique , each one unpredictable . The exhibition is the act of activation .

Gallery Commitments A gallery pledges : " We ' ll keep this piece live on display until it dies ". Whether that ’ s 2 weeks or 20 years . That promise itself becomes part of the art .

Museum Insurance Museums could issue contracts : if an immortal emerges , they guarantee to house it forever . The museum becomes the afterlife caretaker of an artwork that will never expire .

--- SO MUCH MORE CAN BE DONE IT ' S UP TO OUR IMAGINATION !!! ---

Part 5 (VISUAL):

Before and After : Just like the idea evolved - so did the visual . In my first message to O , I included a sketch (April 29) with an expiry date stamped at the bottom . I still had no clue what I really wanted to do for the visual - in fact , I have to admit my first thought was to make the work as boring / ugly as possible to focus on the concept and go full satirical - but one might say , I was talked out of it !

O : June 12, 2025 - 9:14 PM

" Hey ! How are things looking on your end ? I ' d have capacity starting from next week to start digging into this ." Shortly after , we had a good first call covering all sorts of things - and what stuck with me the most was our shared enthusiasm for the journey ahead of us . At the time I was just finishing my new website , a learning experience that opened my eyes to all the possibilities of creating in vanilla JavaScript without relying on external libraries - so at least I knew I wanted to keep going in that direction . But nothing more . I ’ m not a coder by any means but little by little over the years , I ’ m learning and building my own little weird system that allows me to do what I call : painting . This time I had to start over .

L : June 25 - 2:02 PM :

" How can I paint , without having to justify myself or without making something that is ' too deliberately ' (perhaps 'too obvious' is the better term) in line with the original concept , that it would make it just unoriginal in the end ?"

L : August 20 - 3:22 PM :

" I wanted to paint without having to justify - all I needed was for the work to be alive . It was summer 2025." I started from scratch and shared various iterations with O along the way - right after the first week . I very rarely , if ever , ask for feedback for my work - but knowing we ' re going full long - form - I make exceptions . O never disappoints with his inputs - always very pertinent without interfering in my own raw approach to creating . As summer went by , deep down I was not satisfied with the work yet (June 30) even if out loud I was saying otherwise . But on our first call , O said we ' didn ' t need to rush anything - so I took his words for cash and took my time . O kept himself busy over the summer with the family and inscribing like he always does - the George Martin of Ordinals . On my end , I had my first solo show in Montreal - all the while continuing my creative exploration outside the ' Best Before ' code . I needed a little get away after all … And so between July and early August as I was working on some stuff I had this " caveman discovering fire " moment - suddenly I had new ideas on how to craft my textures . I was enjoying the latest breakthroughs , but didn ' t dare to try these new textures on the ' Best Before ' code . Until I did ...

L : August 18, 2025 - 8:19 PM

" I think you ' re gonna hate me " At least now I was truly satisfied and ready to move forward with getting things done for real . It was going to be the current and final iteration of Best Before . Or was it ? Yes and No Believe it or not - we are still here making the most out of the time we have left before we put this one on - chain . Elevating and polishing till the end .

Part 6: INDIVIDUAL THOUGHTS & LAST LOGS

O : August 30, 2025 - 1:00 PM

Flag - planting is vital : it tells us there ’ s land . Map - making is culture : it tells us how to live there . Good ecosystems honor the dash and the draft ; canons accrue to atlases.

L: August 30, 2025 - 2:08 PM

Yesterday I realized how everything is fragile. One move away from everything vanishing - or flourishing.

L: August 30, 2025 - 2:58 PM

I had it all. My works flying in China. "Minute, papillon!" qui s'envolent. Consequences for what? "Not speaking up!" Now risking it all for the brawl. I should be careful, I know. "Lemon, speak up or you are corrupt!". Fuck off! I'm sticking to my guns with my rock.

L: August 30, 2025 - 3:29 PM

There's always a thin line between what kills you and what keeps you alive. Reflecting on the past few months, it was an elevating experience. Now is it gonna be a success at the box office?

L: August 30, 2025 - 6:34 PM

You’re living it, whether you know it or not.

L: September 4, 2025 - 11:21 AM

Perspective is everything. If it looks good at first glance. Now I have to get back to business.

O: September 5, 2025 - 11:38 PM

Rhythm is mercy. We are not built for one endless register. Limits give shape.

L: September 8, 2025 - 5:57 PM

Contrary to my habits, I don't care how much pieces I own from this one, I'll buy how much as I want on secondary if I'm happy with the raise. They don't know it yet but I'm the one auditioning the market with this release.

L: September 20, 2025 - 22:02 PM

I have a good and a bad news. The good news is: I won't be complaining. The bad news is: I won't be complaining.

L: September 20, 2025 - 22:13 PM

I kinda feel bad for O. He woke up today feeling happy and excited for it all - and don't get me wrong - I feel exactly the same about the work. I'm really proud of what we did. But this time, despite what I said - the financials are more important than they ever were before. I've set myself a threshold for the target raise of this release and it's nowhere near - not even close. At least now I really know what the market think I'm worth...

L: September 20, 2025 - 22:22 PM

I was always fine with earning less than I usually do (outside of art) in order to focus on my craft full-time - but the buffer I allowed myself to burn is now EXPIRED! It's kind of beautiful isn't it? The expiry of my own journey perfectly timed with the release of a work that expires. A performance within the performance. I will enjoy the silence. Will you? Maybe I'll be more like a normal person now, instead of fueling my own obsessive delusion. And if I ever have time for this shit again, you'll find me on-chain - nowhere else. But first I have to get back to real life for a few years and refill the war chest. Because NEVER AGAIN I will sell my works to the public. You better believe it.

L: September 20, 2025 - 9:02 AM (11:02 PM)

Yes the timestamps are weird, I'm currently in the air, flying back from Asia to Mexico and I already switched the clock on my phone. Tired Boy by Joey Pecoraro (song)

L: September 21, 2025 - 1:15 PM

My Dear O, it was an honor and pleasure to do this one with you. Thank you for everything.

L: September 21, 2025 - 1:27 PM

Somehow, I'm back to square one: as down as I was when the ideas for Best Before originally came to me. EXPIRED.

O: September 22, 2025 - 1:32 AM

Received Lemonhaze’s raw diary - to be included with Best Before - last night. Heavy reading before sleep; not much of it after. This corner of Bitcoin art is still preciously early. Grateful for everyone who’s stayed, and to our backers on Signals/Gamma. Thank you

L: September 22, 2025 - 4:20 PM

Big thank you to the entire team at Gamma for doing God's work during the whole process of this release and more broadly for Art on Bitcoin over the past few years. Nick, Brett, Albert, Carole and everyone else involved - you are heroes, and I'm deeply grateful to have you around.

L: September 22, 2025 - 4:37 PM

Finally, thank you to all the collectors who made it possible for me to live my dream over the past couple of years. I'm deeply grateful for everything and wish you all the best for the road ahead. Cheers to you my friends.

L: September 22, 2025 - 4:50 PM

Today I cried. I don't remember when was the last time I did. This reality pains me, you have no idea. Believe me when I say I wish it could be otherwise, but the number one rule is to survive.

-FNST
-->`;

const boot = async () => {
  renderShell();
  initIntro();
  initNavigation();

  try {
    // Load critical local data first.
    const [summary, items, aboutFaq] = await Promise.all([
      loadJson('/data/best-before-summary.json'),
      loadJson('/data/best-before-items.json'),
      loadText('/data/bb-about-faq.txt'),
    ]);

    state.summary = summary;
    state.items = items;
    state.aboutFaq = aboutFaq;
    state.diary = DIARY_CONTENT;
    state.storyAssets = summary?.storyAssets || {};

    // Attempt to load live data, but don't block the app if it fails.
    try {
      const liveResponse = await loadJson('https://bestbefore.space/best-before.json');
      state.liveSummary = liveResponse?.summary || null;

      // The API returns { inscriptions: [...] }, extract and transform.
      const rawInscriptions = liveResponse?.inscriptions || [];
      state.liveItems = rawInscriptions.map((item) => {
        // Extract number from inscription ID suffix (e.g., '...i2' means index 2, so number = 3)
        const idMatch = item.id?.match(/i(\d+)$/);
        const number = idMatch ? parseInt(idMatch[1], 10) + 1 : null;
        return {
          ...item,
          number,
          name: `BEST BEFORE Nº${number || '?'}`,
          status: item.phase?.toLowerCase() || 'unknown',
          palette: item.palette, // { id, colors }
          block: item.block,     // { tip, inscription, activation, expiry, immortal, lifespan, remaining }
          preview: `https://ordinals.com/content/${item.id}`,
          ordinalsUrl: `https://ordinals.com/inscription/${item.id}`,
        };
      });
    } catch (e) {
      console.warn('Failed to load live data, falling back to static content.', e);
      state.liveItems = null; // Will fallback to state.items in setupGallery
      state.liveSummary = null;
    }

    const logoAsset = await resolveLogoAsset(summary?.logoAsset);
    if (logoAsset) {
      applyLogoToInterface(logoAsset);
      applyInvertedFavicon(logoAsset);
    }

    renderMenuStats();
    renderDiary(state.diary);
    renderAboutFaq(aboutFaq);
    renderLifecycle();
    setupGallery();
  } catch (error) {
    renderLoadError(`Data load issue: ${error.message}`);
  }
};

boot();
