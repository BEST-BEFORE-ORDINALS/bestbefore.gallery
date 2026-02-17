/* ═══════════════════════════════════════════════════════════════
   BEST BEFORE — Gallery Application
   Entry point. Imports modules and orchestrates boot sequence.
   ═══════════════════════════════════════════════════════════════ */

import './style.css';
import './vault.css';

import { state, loadJson, loadText, renderLoadError } from './state.js';
import { initNavigation, injectCarouselImmersive, injectRenderVaultContent } from './navigation.js';
import { renderMenuStats, renderAboutFaq, renderLifecycle } from './about.js';
import { renderVaultContent, renderDiary } from './vault.js';
import { injectRestartMotionTimers, injectStopMotionTimers } from './modal.js';
import {
  stopMotionTimers,
  restartMotionTimers,
  resolveLogoAsset,
  applyLogoToInterface,
  applyInvertedFavicon,
  setCarouselImmersive,
} from './carousel.js';
import { setupGallery } from './gallery.js';
import { initRouting } from './router.js';

/* ── Wire up cross-module dependencies ── */
injectCarouselImmersive(setCarouselImmersive);
injectRenderVaultContent(renderVaultContent);
injectRestartMotionTimers(restartMotionTimers);
injectStopMotionTimers(stopMotionTimers);

/* ── Expose state globally for inline onload handlers ── */
window.state = state;

/* ── DOM root ── */
const app = document.querySelector('#app');

/* ── Shell renderer ── */
const renderShell = () => {
  app.innerHTML = `
    <div class="bb-root bb-scroll-container">
      <div class="bb-grain" aria-hidden="true"></div>

      <!-- Minimal floating header -->
      <header class="bb-header">
        <div class="bb-header__brand">
          <img src="/assets/logo/bb-uploaded-logo.jpeg" alt="BB" class="bb-header__mark" />
          <div class="bb-header__brand-text">
            <span class="bb-header__title">BEST BEFORE</span>
            <span class="bb-header__subtitle">BY LEMONHAZE X ORDINALLY</span>
          </div>
        </div>
        <div class="bb-header__zone" id="bbZoneIndicator">THE GALLERY</div>
        <div class="bb-header__stats" id="bbMenuStats">Loading...</div>
      </header>

      <main class="bb-experience">
        <!-- Zone 1: The Gallery -->
        <section class="bb-zone bb-zone--gallery" id="bbZoneGallery" data-zone="gallery">
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
          
          <!-- Scroll hint -->
          <button class="bb-scroll-hint" id="bbScrollHint" type="button" aria-label="Scroll to learn more">
            <span class="bb-scroll-hint__text">ABOUT</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
        </section>

        <!-- Zone 2: About -->
        <section class="bb-zone bb-zone--about" id="bbZoneAbout" data-zone="about">
          <div class="bb-zone__content">
            <div class="bb-about-rich" id="bbAboutFaq">Loading project description...</div>
          </div>
        </section>

        <!-- Zone 3: The Vault -->
        <section class="bb-zone bb-zone--vault" id="bbZoneVault" data-zone="vault">
          <div class="bb-zone__content">
            <nav class="bb-sub-nav">
              <button class="bb-sub-nav__item ${state.vault.activeTab === 'artists' ? 'is-active' : ''}" data-vault-tab="artists" type="button">ARTISTS</button>
              <button class="bb-sub-nav__item ${state.vault.activeTab === 'diary' ? 'is-active' : ''}" data-vault-tab="diary" type="button">DIARY</button>
              <button class="bb-sub-nav__item ${state.vault.activeTab === 'analytics' ? 'is-active' : ''}" data-vault-tab="analytics" type="button">LEDGER</button>
            </nav>

            <div class="bb-vault-content" id="bbVaultContent">
              ${renderVaultContent()}
            </div>
          </div>
        </section>
      </main>
    </div>
  `;
};

/* ═══ Boot sequence ═══ */

const boot = async () => {
  renderShell();
  document.body.classList.add('bb-intro-complete');
  initNavigation();

  try {
    // Load critical local data first.
    const [summary, items, diaryText] = await Promise.all([
      loadJson('/data/best-before-summary.json'),
      loadJson('/data/best-before-items.json'),
      loadText('/data/bb-diary.txt'),
    ]);

    state.summary = summary;
    state.items = items;
    state.storyAssets = summary?.storyAssets || {};

    // Attempt to load live data, but don't block the app if it fails.
    try {
      const liveResponse = await loadJson('https://bestbefore.space/best-before.json');
      state.liveSummary = liveResponse?.summary || null;
      state.analytics = liveResponse?.analytics || null;
      state.liveGeneratedAt = liveResponse?.generated_at || null;

      const rawInscriptions = liveResponse?.inscriptions || [];
      state.liveItems = rawInscriptions.map((item) => {
        const idMatch = item.id?.match(/i(\d+)$/);
        const number = idMatch ? parseInt(idMatch[1], 10) + 1 : null;
        return {
          ...item,
          number,
          name: `BEST BEFORE Nº${number || '?'}`,
          status: item.phase?.toLowerCase() || 'unknown',
          // Keep the full palette object for modal/carousel compatibility.
          palette: item.palette || null,
          palette_id: item.palette?.id || null,
          palette_colors: item.palette?.colors || [],
          activation_block: item.block?.activation,
          lifespan_blocks: item.block?.lifespan,
          remaining_blocks: item.block?.remaining,
          immortal: item.block?.immortal || false,
          // Keep the full block object for modal metadata and live lifespan bars.
          block: item.block || {},
          preview: `https://ordinals.com/content/${item.id}`,
          ordinalsUrl: `https://ordinals.com/inscription/${item.id}`,
        };
      });
    } catch (e) {
      console.warn('Failed to load live data, falling back to static content.', e);
      state.liveItems = null;
      state.liveSummary = null;
      state.analytics = null;
      state.liveGeneratedAt = null;
    }

    const logoAsset = await resolveLogoAsset(summary?.logoAsset);
    if (logoAsset) {
      applyLogoToInterface(logoAsset);
      applyInvertedFavicon(logoAsset);
    }

    renderMenuStats();
    renderDiary(diaryText);
    renderAboutFaq();
    renderLifecycle();
    setupGallery();
    initRouting({ renderVaultContent });

    // Set up scroll-triggered reveals AFTER content is rendered
    if ('IntersectionObserver' in window) {
      const scrollRoot = document.querySelector('.bb-scroll-container');
      const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
          }
        });
      }, {
        root: scrollRoot || null,
        threshold: 0.15,
        rootMargin: '0px 0px -40px 0px',
      });

      document.querySelectorAll('.bb-reveal').forEach(el => revealObserver.observe(el));
    }
  } catch (error) {
    renderLoadError(`Data load issue: ${error.message}`);
  }
};

boot();
