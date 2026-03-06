/* ═══ Carousel — rendering, animation, drag, heartbeat, timers ═══ */

import { state, numberFormat, escapeHtml, statusLabel, statusClass, getNumberLabel, getRelativeDiff } from './state.js';
import { openArtworkModal } from './modal.js';

/* ── Motion timers ── */

export const stopMotionTimers = () => {
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

export const restartMotionTimers = () => {
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

        if (state.carousel.autoplay && state.carousel.items.length > 1 && !state.carousel.hovering && !state.carousel.dragging) {
            state.carousel.timer = window.setInterval(() => {
                nextSlide();
            }, 4600);
        }
        return;
    }

    if (state.galleryMode === 'heartbeat') {
        state.heartbeat.timer = null;
    }
};

/* ── Logo utilities ── */

export const applyLogoToInterface = (assetPath) => {
    const introLogo = document.querySelector('.bb-intro__logo');
    const headerMark = document.querySelector('.bb-header__mark');

    if (!introLogo && !headerMark) {
        return;
    }

    if (introLogo) {
        introLogo.src = assetPath;
        introLogo.classList.add('bb-intro__logo--uploaded');
    }

    if (headerMark) {
        headerMark.src = assetPath;
        headerMark.classList.add('bb-header__mark--uploaded');
    }
};

export const applyInvertedFavicon = (assetPath) => {
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

export const resolveLogoAsset = async (preferredAsset) => {
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

/* ── Heartbeat scale ── */

export const applyHeartbeatScale = (scale) => {
    const stage = document.querySelector('#bbHeartbeatStage');
    if (!stage) {
        return;
    }

    const normalized = Math.min(1.9, Math.max(0.72, Number(scale) || 1));
    const compactViewport = window.matchMedia('(max-width: 760px)').matches;

    const thumb = Math.round(68 * normalized);
    const gap = Math.max(2, Math.round(6 * normalized));
    const activeScale = compactViewport
        ? Math.min(1.2, 1 + (normalized - 1) * 0.3)
        : Math.min(1.4, 1 + (normalized - 1) * 0.5);
    const centerPad = Math.round(4 * normalized);

    stage.style.setProperty('--hb-thumb-size', `${thumb}px`);
    stage.style.setProperty('--hb-gap', `${gap}px`);
    stage.style.setProperty('--hb-active-scale', String(activeScale));
    stage.style.setProperty('--hb-center-pad', `${centerPad}px`);
};

export const renderLifecycle = () => { };

/* ── Carousel cards ── */

export const renderCarouselCards = () => {
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
        <div class="bb-slide__media">
          <img
            class="bb-slide__img bb-slide__img--low"
            src="${item.previewMobile || item.preview}"
            data-src-low="${item.previewMobile || item.preview}"
            data-index="${index}"
            alt="${escapeHtml(item.name)}"
            loading="lazy"
            decoding="async"
            onload="state.carousel.fullyLoaded.add(${index}); this.classList.add('is-loaded'); this.dataset.ready='1';"
            onerror="if(this.dataset.fallback !== '1'){this.dataset.fallback='1'; this.dataset.ready='0'; this.src=this.dataset.srcLow || '';}"
          />
          <img
            class="bb-slide__img bb-slide__img--high"
            data-src-hd="${item.preview || item.previewMobile || ''}"
            data-src-ordinals="${item.ordinalsUrl || ''}"
            data-index="${index}"
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            onload="this.dataset.ready='1'; this.classList.add('is-loaded');"
            onerror="if(this.dataset.fallback !== '1'){this.dataset.fallback='1'; this.dataset.ready='0'; if(this.dataset.srcHd){this.dataset.currentSrc=this.dataset.srcHd; this.src=this.dataset.srcHd;}}"
          />
        </div>
      </article>
      `,
        )
        .join('');
};

/* ── Immersive HUD ── */

export const updateImmersiveHud = () => {
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

export const setCarouselImmersive = (enabled) => {
    if (state.carousel.immersive === enabled) {
        return;
    }

    state.carousel.immersive = enabled;
    document.querySelector('.bb-root')?.classList.toggle('is-carousel-immersive', enabled);
    updateCarousel();
    updateImmersiveHud();
};

/* ── Carousel meta (below carousel) ── */

export const formatCarouselMetaBlockTime = (blocks) => {
    if (!blocks || blocks <= 0) return '0m';
    const mins = Math.round(blocks * 10);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d`;
    const months = Math.floor(days / 30);
    if (months < 12) return months === 1 ? '1 month' : `${months} months`;
    const years = Math.floor(days / 365);
    return years === 1 ? '1 year' : `${years} years`;
};

const formatCarouselMetaBlocks = (value) => (typeof value === 'number' ? numberFormat.format(value) : '0');

const buildCarouselPaletteHtml = (item) => {
    const paletteColors = item.palette?.colors || [];
    if (item.status !== 'open' || paletteColors.length === 0) {
        return '';
    }

    return `<div class="bb-palette-list">
        <span class="bb-palette-name">${escapeHtml(item.palette?.id || 'Unknown')}</span>
        <div class="bb-palette-swatches">
          ${paletteColors.map(c => `<span class="bb-palette-dot" style="background: ${c}"></span>`).join('')}
        </div>
      </div>`;
};

export const buildCarouselLifespanHtml = (item) => {
    const block = item.block || {};

    if (item.status === 'open') {
        if (block.immortal) {
            return '<div class="bb-meta-lifespan"><span class="bb-meta-lifespan__immortal">IMMORTAL — Lives Forever</span></div>';
        }

        if (block.remaining) {
            return `
        <div class="bb-meta-lifespan">
          <span class="bb-meta-lifespan__remaining">${formatCarouselMetaBlocks(block.remaining)} blocks</span>
          <span class="bb-meta-lifespan__time">${formatCarouselMetaBlockTime(block.remaining)} remaining</span>
        </div>
      `;
        }

        return '';
    }

    if (item.status === 'sealed') {
        return '<div class="bb-meta-lifespan"><span class="bb-meta-lifespan__sealed">Awaiting activation</span></div>';
    }

    if (item.status !== 'expired') {
        return '';
    }

    const tip = typeof block.tip === 'number' ? block.tip : null;
    const expiry = typeof block.expiry === 'number' ? block.expiry : null;
    const blocksSinceExpiry = tip !== null && expiry !== null ? Math.max(0, tip - expiry) : null;

    if (blocksSinceExpiry !== null) {
        return `<div class="bb-meta-lifespan"><span class="bb-meta-lifespan__expired">${formatCarouselMetaBlockTime(blocksSinceExpiry)} ago</span></div>`;
    }

    return '<div class="bb-meta-lifespan"><span class="bb-meta-lifespan__expired">Time unavailable</span></div>';
};

export const getCarouselJumpMax = (items) => {
    const maxKnownNumber = items.reduce((max, entry) => {
        const numeric = Number(entry?.number);
        return Number.isFinite(numeric) ? Math.max(max, numeric) : max;
    }, 0);

    return maxKnownNumber > 0 ? maxKnownNumber : 420;
};

export const resolveCarouselJumpTarget = (rawValue, items, jumpMax = getCarouselJumpMax(items)) => {
    const desiredNumber = Number.parseInt(String(rawValue || '').trim(), 10);

    if (!Number.isFinite(desiredNumber) || desiredNumber < 1 || desiredNumber > jumpMax) {
        return { error: `Enter 1-${jumpMax}`, index: -1 };
    }

    const index = items.findIndex((entry) => Number(entry?.number) === desiredNumber);
    if (index === -1) {
        return { error: `Nº${desiredNumber} not found`, index: -1 };
    }

    return { error: '', index };
};

const buildCarouselMetaMarkup = (item, jumpMax, paletteHtml, lifespanHtml) => `
  <div class="bb-gallery-meta__left is-${item.status}">
    <h2>${escapeHtml(item.name)}</h2>
    <div class="bb-gallery-meta__status">
      <span class="bb-status-badge is-${item.status}">${escapeHtml(statusLabel[item.status] || item.status)}</span>
      ${paletteHtml}
    </div>
    ${lifespanHtml}
  </div>
  <div class="bb-gallery-meta__right">
    ${item.ordinalsUrl
        ? `<a href="${item.ordinalsUrl}" target="_blank" rel="noreferrer">View inscription</a>`
        : ''
    }
    <div class="bb-carousel-jump">
      <span class="bb-carousel-jump__label">Jump to #</span>
      <form class="bb-carousel-jump__form" id="bbCarouselJumpForm" novalidate>
        <input
          id="bbCarouselJumpInput"
          class="bb-carousel-jump__input"
          type="text"
          inputmode="numeric"
          pattern="[0-9]*"
          min="1"
          max="${jumpMax}"
          step="1"
          placeholder="1-${jumpMax}"
          aria-label="Jump to edition number"
        />
        <button class="bb-carousel-jump__btn" type="submit">Go</button>
      </form>
      <span class="bb-carousel-jump__feedback" id="bbCarouselJumpFeedback" aria-live="polite"></span>
    </div>
  </div>
`;

const bindCarouselJumpForm = (target, jumpMax) => {
    const jumpForm = target.querySelector('#bbCarouselJumpForm');
    const jumpInput = target.querySelector('#bbCarouselJumpInput');
    const jumpFeedback = target.querySelector('#bbCarouselJumpFeedback');
    if (!jumpForm || !jumpInput || !jumpFeedback) {
        return;
    }

    jumpForm.addEventListener('submit', (event) => {
        event.preventDefault();

        const result = resolveCarouselJumpTarget(jumpInput.value, state.carousel.items, jumpMax);
        jumpInput.classList.remove('is-invalid');
        jumpFeedback.textContent = '';

        if (result.error) {
            jumpInput.classList.add('is-invalid');
            jumpFeedback.textContent = result.error;
            return;
        }

        setCarouselIndex(result.index);
        restartMotionTimers();
    });
};

export const renderCarouselMeta = () => {
    const target = document.querySelector('#bbGalleryMeta');
    if (!target) {
        return;
    }

    if (state.carousel.items.length === 0) {
        target.innerHTML = '<p>Carousel unavailable.</p>';
        return;
    }

    const item = state.carousel.items[state.carousel.index];
    const jumpMax = getCarouselJumpMax(state.carousel.items);
    const paletteHtml = buildCarouselPaletteHtml(item);
    const lifespanHtml = buildCarouselLifespanHtml(item);

    target.innerHTML = buildCarouselMetaMarkup(item, jumpMax, paletteHtml, lifespanHtml);
    bindCarouselJumpForm(target, jumpMax);
};

const DESKTOP_HD_PRELOAD_RADIUS = 2;
const DESKTOP_HD_REFRESH_RADIUS = 3;

const normalizeCarouselIndex = (index, total) => ((index % total) + total) % total;

const queueHdPreload = (index, total, slides) => {
    if (total === 0) {
        return;
    }

    const normalizedIndex = normalizeCarouselIndex(index, total);
    if (state.carousel.hdLoadedIndexes.has(normalizedIndex) || state.carousel.hdLoadingIndexes.has(normalizedIndex)) {
        return;
    }

    const highImage = slides[normalizedIndex]?.querySelector('.bb-slide__img--high');
    const hdSrc = highImage?.dataset.srcHd;
    if (!hdSrc) {
        return;
    }

    state.carousel.hdLoadingIndexes.add(normalizedIndex);

    const preloader = new Image();
    preloader.decoding = 'async';
    preloader.src = hdSrc;

    preloader.onload = async () => {
        if (typeof preloader.decode === 'function') {
            try {
                await preloader.decode();
            } catch {
                // Decode can fail on some browsers/cross-origin images even when load succeeds.
            }
        }

        state.carousel.hdLoadingIndexes.delete(normalizedIndex);
        state.carousel.hdLoadedIndexes.add(normalizedIndex);

        const activeTotal = state.carousel.items.length;
        if (activeTotal === 0) {
            return;
        }

        const diff = Math.abs(getRelativeDiff(normalizedIndex, state.carousel.index, activeTotal));
        if (diff <= DESKTOP_HD_REFRESH_RADIUS && !state.carousel.dragging) {
            updateCarousel();
        }
    };

    preloader.onerror = () => {
        state.carousel.hdLoadingIndexes.delete(normalizedIndex);
    };
};

const preloadDesktopHdWindow = (slides, total) => {
    if (total === 0) {
        return;
    }

    for (let offset = -DESKTOP_HD_PRELOAD_RADIUS; offset <= DESKTOP_HD_PRELOAD_RADIUS; offset += 1) {
        queueHdPreload(state.carousel.index + offset, total, slides);
    }
};

export const getCarouselShiftLayout = ({ stageWidth, slideWidth, maxOffset, isDesktop, isCompact }) => {
    if (isDesktop) {
        const centerVisualWidth = slideWidth * 1.02;
        const firstVisualWidth = slideWidth * 0.8;
        const secondVisualWidth = slideWidth * 0.46;
        const nearSpan = (centerVisualWidth + firstVisualWidth) / 2;
        const farSpan = (firstVisualWidth + secondVisualWidth) / 2;
        const arrowCenterInset = 11 + 20;
        const arrowLanePadding = 8;
        const targetFarShift = stageWidth / 2 - (secondVisualWidth / 2 + arrowCenterInset + arrowLanePadding);
        const minGap = 30;
        const maxGap = 112;
        const minFarShift = nearSpan + farSpan + minGap * 2;
        const maxFarShift = maxOffset + 200;
        const constrainedFarShift = Math.max(minFarShift, Math.min(targetFarShift, maxFarShift));
        const equalGap = Math.min(maxGap, Math.max(minGap, (constrainedFarShift - nearSpan - farSpan) / 2));
        const sideShift = nearSpan + equalGap;
        return {
            sideShift,
            farShift: sideShift + farSpan + equalGap,
        };
    }

    let sideShift = Math.max(228, slideWidth * 0.94 + 10);
    sideShift = Math.min(sideShift, maxOffset * 0.8);

    let farShift = Math.max(sideShift + 168, sideShift * 1.36);
    farShift = Math.min(farShift, maxOffset + (isCompact ? 30 : 44));
    if (farShift < sideShift + 132) {
        farShift = sideShift + 132;
    }

    return { sideShift, farShift };
};

export const getCarouselSlidePresentation = ({ immersive, diff, isCompact, drag, sideShift, farShift }) => {
    if (immersive) {
        if (diff === 0) {
            return {
                transform: 'translate3d(-50%, -50%, 0px) scale(1.28)',
                opacity: 1,
                zIndex: 60,
                imageOpacity: 1,
                pointerEvents: 'auto',
            };
        }

        return {
            transform: 'translate3d(-50%, -50%, -320px) scale(0.8)',
            opacity: 0,
            zIndex: 1,
            imageOpacity: 0,
            pointerEvents: 'none',
        };
    }

    if (diff === 0) {
        return {
            transform: `translate3d(calc(-50% + ${drag}px), -50%, 0px) scale(1.02)`,
            opacity: 1,
            zIndex: 40,
            imageOpacity: 1,
            pointerEvents: 'auto',
        };
    }

    if (isCompact) {
        return {
            transform: 'translate3d(-50%, -50%, -320px) scale(0.6)',
            opacity: 0,
            zIndex: 1,
            imageOpacity: 0,
            pointerEvents: 'none',
        };
    }

    if (diff === -1) {
        return {
            transform: `translate3d(calc(-50% - ${sideShift - drag * 0.18}px), -50%, -150px) scale(0.8) rotateY(5deg)`,
            opacity: 0.78,
            zIndex: 24,
            imageOpacity: 0.84,
            pointerEvents: 'auto',
        };
    }

    if (diff === 1) {
        return {
            transform: `translate3d(calc(-50% + ${sideShift + drag * 0.18}px), -50%, -150px) scale(0.8) rotateY(-5deg)`,
            opacity: 0.78,
            zIndex: 24,
            imageOpacity: 0.84,
            pointerEvents: 'auto',
        };
    }

    if (diff === -2) {
        return {
            transform: `translate3d(calc(-50% - ${farShift - drag * 0.05}px), -50%, -280px) scale(0.46) rotateY(1.5deg)`,
            opacity: 0.36,
            zIndex: 12,
            imageOpacity: 0.48,
            pointerEvents: 'none',
        };
    }

    if (diff === 2) {
        return {
            transform: `translate3d(calc(-50% + ${farShift + drag * 0.05}px), -50%, -280px) scale(0.46) rotateY(-1.5deg)`,
            opacity: 0.36,
            zIndex: 12,
            imageOpacity: 0.48,
            pointerEvents: 'none',
        };
    }

    return {
        transform: 'translate3d(-50%, -50%, -760px) scale(0.4)',
        opacity: 0,
        zIndex: 1,
        imageOpacity: 0,
        pointerEvents: 'none',
    };
};

const hideCarouselSlide = (slide, { clearTransform = false } = {}) => {
    if (slide.style.display !== 'none') {
        slide.style.display = 'none';
    }

    if (clearTransform) {
        slide.style.transform = '';
    }
};

const primeCompactNeighborSlide = ({ lowImage, abs, index, lowSrc }) => {
    if (!lowImage || abs > 2 || state.carousel.loadedIndexes.has(index)) {
        return;
    }

    lowImage.loading = 'eager';
    lowImage.fetchPriority = 'low';
    lowImage.src = lowSrc;
    lowImage.dataset.currentSrc = lowSrc;
    lowImage.decoding = 'async';
    state.carousel.loadedIndexes.add(index);
};

const ensureCarouselSlideVisible = (slide) => {
    if (slide.style.display === 'none') {
        slide.style.display = 'grid';
    }
};

const ensureCarouselLowImage = ({ lowImage, abs, index, lowSrc }) => {
    if (!lowImage || abs > 3 || state.carousel.loadedIndexes.has(index)) {
        return;
    }

    lowImage.src = lowSrc;
    lowImage.dataset.currentSrc = lowSrc;
    lowImage.decoding = 'async';
    state.carousel.loadedIndexes.add(index);
};

const syncCarouselLowImagePriority = ({ lowImage, diff, immersive }) => {
    if (!lowImage) {
        return;
    }

    if (diff === 0 || immersive) {
        lowImage.loading = 'eager';
        lowImage.fetchPriority = 'high';
        return;
    }

    lowImage.loading = 'lazy';
    lowImage.fetchPriority = 'auto';
};

const syncCarouselHighImage = ({ highImage, abs, isMobileViewport, targetHighSrc, lowReady, wantsOrdinals, hdReady }) => {
    if (isMobileViewport || !highImage || abs > 3 || !targetHighSrc || !lowReady) {
        return;
    }

    const currentHighSrc = highImage.dataset.currentSrc || '';
    if (currentHighSrc !== targetHighSrc) {
        highImage.dataset.ready = '0';
        highImage.dataset.fallback = '0';
        highImage.dataset.currentSrc = targetHighSrc;
        highImage.src = targetHighSrc;
        highImage.decoding = 'async';

        if (!wantsOrdinals && hdReady) {
            highImage.dataset.ready = '1';
        }
        return;
    }

    if (!wantsOrdinals && hdReady) {
        highImage.dataset.ready = '1';
    }
};

const applyCarouselSlidePresentation = ({ slide, presentation, dragging, settleTransformMs, settleOpacityMs, diff }) => {
    slide.style.transform = presentation.transform;
    slide.style.opacity = String(presentation.opacity);
    slide.style.zIndex = String(presentation.zIndex);
    slide.style.filter = 'none';
    slide.style.pointerEvents = presentation.pointerEvents;
    slide.classList.toggle('is-focus', diff === 0);
    slide.style.transition = dragging
        ? 'none'
        : `transform ${settleTransformMs}ms cubic-bezier(0.18, 0.76, 0.24, 1), opacity ${settleOpacityMs}ms ease`;
};

const syncCarouselSlideImageOpacity = ({ lowImage, highImage, highLoaded, imageOpacity, dragging }) => {
    if (lowImage) {
        lowImage.style.opacity = String(highLoaded ? 0 : imageOpacity);
        lowImage.style.transition = dragging ? 'none' : 'opacity 420ms ease, filter 420ms ease';
    }

    if (highImage) {
        highImage.style.opacity = String(highLoaded ? imageOpacity : 0);
        highImage.style.transition = dragging ? 'none' : 'opacity 420ms ease, filter 420ms ease';
    }
};

const updateCarouselSlide = ({
    slide,
    index,
    total,
    isCompact,
    isMobileViewport,
    sideShift,
    farShift,
    drag,
    settleTransformMs,
    settleOpacityMs,
}) => {
    const diff = getRelativeDiff(index, state.carousel.index, total);
    const abs = Math.abs(diff);
    const lowImage = slide.querySelector('.bb-slide__img--low');
    const highImage = slide.querySelector('.bb-slide__img--high');
    const lowSrc = lowImage?.dataset.srcLow || '';
    const hdSrc = highImage?.dataset.srcHd || lowSrc;
    const ordinalsSrc = highImage?.dataset.srcOrdinals || '';
    const wantsOrdinals = state.carousel.immersive && diff === 0 && Boolean(ordinalsSrc);
    const targetHighSrc = wantsOrdinals ? ordinalsSrc : hdSrc;
    const hdReady = !isMobileViewport && state.carousel.hdLoadedIndexes.has(index);
    const lowReady = Boolean(lowImage && (lowImage.dataset.ready === '1' || lowImage.complete));

    if (isCompact && !state.carousel.immersive && diff !== 0) {
        primeCompactNeighborSlide({ lowImage, abs, index, lowSrc });
        hideCarouselSlide(slide);
        return;
    }

    if (abs > 4 && !state.carousel.immersive) {
        hideCarouselSlide(slide, { clearTransform: true });
        return;
    }

    ensureCarouselSlideVisible(slide);
    ensureCarouselLowImage({ lowImage, abs, index, lowSrc });
    syncCarouselLowImagePriority({ lowImage, diff, immersive: state.carousel.immersive });
    syncCarouselHighImage({ highImage, abs, isMobileViewport, targetHighSrc, lowReady, wantsOrdinals, hdReady });

    const presentation = getCarouselSlidePresentation({
        immersive: state.carousel.immersive,
        diff,
        isCompact,
        drag,
        sideShift,
        farShift,
    });
    applyCarouselSlidePresentation({
        slide,
        presentation,
        dragging: state.carousel.dragging,
        settleTransformMs,
        settleOpacityMs,
        diff,
    });

    const highLoaded = !isMobileViewport
        && highImage
        && lowReady
        && highImage.dataset.currentSrc === targetHighSrc
        && highImage.dataset.ready === '1';

    syncCarouselSlideImageOpacity({
        lowImage,
        highImage,
        highLoaded,
        imageOpacity: presentation.imageOpacity,
        dragging: state.carousel.dragging,
    });
};

/* ── Core carousel update ── */

export const updateCarousel = () => {
    const stage = document.querySelector('#bbGalleryStage');
    const slides = document.querySelectorAll('.bb-slide');
    const total = state.carousel.items.length;

    if (!stage || total === 0) {
        return;
    }

    const stageWidth = stage.clientWidth;
    const isMobileViewport = window.matchMedia('(max-width: 760px)').matches;
    // Fix: Use the ACTIVE slide for measurement, as slides[0] might be display:none (width=0) due to optimization
    const sampleSlide = slides[state.carousel.index] || slides[0];
    const measuredSlideWidth = sampleSlide
        ? (sampleSlide.getBoundingClientRect().width || sampleSlide.offsetWidth || 0)
        : 0;
    const slideWidth = measuredSlideWidth > 1
        ? measuredSlideWidth
        : Math.min(350, Math.max(220, stageWidth * 0.22));
    const edgePadding = 10;
    const maxOffset = Math.max(240, stageWidth / 2 - slideWidth / 2 - edgePadding);
    const isDesktop = stageWidth >= 980;
    const isCompact = stageWidth < 760;
    const settleTransformMs = isCompact ? 460 : 720;
    const settleOpacityMs = isCompact ? 320 : 540;

    if (!isMobileViewport) {
        preloadDesktopHdWindow(slides, total);
    }

    const { sideShift, farShift } = getCarouselShiftLayout({ stageWidth, slideWidth, maxOffset, isDesktop, isCompact });
    const drag = state.carousel.dragOffset;

    slides.forEach((slide, index) => {
        updateCarouselSlide({
            slide,
            index,
            total,
            isCompact,
            isMobileViewport,
            sideShift,
            farShift,
            drag,
            settleTransformMs,
            settleOpacityMs,
        });
    });

    // renderCarouselMeta(); // Moved to setCarouselIndex to avoid thrashing
    // updateImmersiveHud(); // Moved to setCarouselIndex
};

/* ── Index management ── */

export const setCarouselIndex = (index) => {
    const total = state.carousel.items.length;
    if (total === 0) {
        return;
    }

    state.carousel.index = ((index % total) + total) % total;
    state.carousel.dragOffset = 0;
    state.carousel.pendingDragOffset = 0;
    updateCarousel();

    // Update metadata only when index changes
    renderCarouselMeta();
    updateImmersiveHud();
};

export const findNextLoadedIndex = (direction) => {
    const total = state.carousel.items.length;
    if (total === 0) return 0;

    // Always move sequentially; preloading is handled by updateCarousel().
    // This prevents navigation from getting trapped in a tiny "loaded" subset.
    let next = (state.carousel.index + direction) % total;
    if (next < 0) next += total;
    return next;
};

export const nextSlide = () => {
    if (state.carousel.items.length === 0) return;
    setCarouselIndex(findNextLoadedIndex(1));
};

export const prevSlide = () => {
    if (state.carousel.items.length === 0) return;
    setCarouselIndex(findNextLoadedIndex(-1));
};

/* ── Heartbeat ── */

export const setHeartbeatIndex = (index) => {
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

export const nextHeartbeat = () => {
    setHeartbeatIndex(state.heartbeat.index + 1);
};

export const prevHeartbeat = () => {
    setHeartbeatIndex(state.heartbeat.index - 1);
};

export const centerHeartbeatNode = (node, behavior = 'smooth') => {
    const wrap = document.querySelector('.bb-heartbeat-track-wrap');
    if (!wrap || !node) {
        return;
    }

    const targetLeft = node.offsetLeft + node.offsetWidth / 2 - wrap.clientWidth / 2;
    wrap.scrollTo({ left: targetLeft, behavior });
};

export const getHeartbeatNodeWidth = (thumbSize, activeScale, isFocus) => (
    isFocus ? Math.round(thumbSize * activeScale) : thumbSize
);

export const buildHeartbeatLifespanHtml = (item) => {
    const block = item.block || {};

    if (item.status === 'open') {
        if (block.immortal) {
            return '<span class="bb-hb-lifespan is-immortal">IMMORTAL</span>';
        }

        if (block.remaining) {
            return `<span class="bb-hb-lifespan">${formatCarouselMetaBlocks(block.remaining)} blocks remaining</span>`;
        }

        return '';
    }

    if (item.status === 'sealed') {
        return '<span class="bb-hb-lifespan is-sealed">Awaiting activation</span>';
    }

    if (item.status === 'expired') {
        return '<span class="bb-hb-lifespan is-expired">Expired</span>';
    }

    return '';
};

const getHeartbeatLayout = (stage) => {
    const styles = getComputedStyle(stage);
    const thumbSize = parseInt(styles.getPropertyValue('--hb-thumb-size'), 10) || 68;
    const activeScale = parseFloat(styles.getPropertyValue('--hb-active-scale')) || 1.4;
    return { thumbSize, activeScale };
};

const buildHeartbeatTrackHtml = (items, index, thumbSize, activeScale) => (
    items.map((entry, itemIndex) => {
        const isFocus = itemIndex === index;
        const status = (entry.status || '').toLowerCase();
        const width = getHeartbeatNodeWidth(thumbSize, activeScale, isFocus);
        return `<div class="bb-hb-node ${statusClass[status] || ''} ${isFocus ? 'is-focus' : ''}"
                   data-index="${itemIndex}"
                   style="width:${width}px;height:${thumbSize}px"
                   title="${escapeHtml(entry.name)}">
                <img src="${entry.preview || ''}" alt="${escapeHtml(entry.name)}" loading="lazy" decoding="async" />
              </div>`;
    }).join('')
);

const updateHeartbeatTrackFocus = (track, index, thumbSize, activeScale) => {
    track.querySelectorAll('.bb-hb-node').forEach((node, itemIndex) => {
        const isFocus = itemIndex === index;
        node.classList.toggle('is-focus', isFocus);
        node.style.width = `${getHeartbeatNodeWidth(thumbSize, activeScale, isFocus)}px`;
    });
};

const syncHeartbeatTrack = ({ track, items, index, thumbSize, activeScale, rebuild }) => {
    if (rebuild || !state.heartbeat.initialized) {
        track.innerHTML = buildHeartbeatTrackHtml(items, index, thumbSize, activeScale);
        state.heartbeat.initialized = true;

        requestAnimationFrame(() => {
            const focusNode = track.querySelector('.is-focus');
            if (focusNode) {
                centerHeartbeatNode(focusNode, 'instant');
            }
        });
        return;
    }

    updateHeartbeatTrackFocus(track, index, thumbSize, activeScale);
    const focusNode = track.querySelector('.is-focus');
    if (focusNode) {
        centerHeartbeatNode(focusNode);
    }
};

const buildHeartbeatPaletteHtml = (item) => {
    const paletteColors = item.palette?.colors || [];
    if (paletteColors.length === 0) {
        return '';
    }

    return `<div class="bb-hb-palette">
        <span class="bb-hb-palette-name">${escapeHtml(item.palette?.id || '')}</span>
        <div class="bb-hb-palette-dots">
          ${paletteColors.map(c => `<span class="bb-hb-dot" style="background:${c}"></span>`).join('')}
        </div>
      </div>`;
};

const buildHeartbeatInfoMarkup = (item) => `
    <h3 class="bb-hb-title">${escapeHtml(item.name)}</h3>
    <span class="bb-status-badge is-${item.status}">${escapeHtml(statusLabel[item.status] || item.status)}</span>
    ${buildHeartbeatPaletteHtml(item)}
    ${buildHeartbeatLifespanHtml(item)}
    ${item.ordinalsUrl ? `<a class="bb-hb-link" href="${item.ordinalsUrl}" target="_blank" rel="noreferrer">Ordinals ↗</a>` : ''}
  `;

const wireHeartbeatNodeClicks = (track) => {
    track.querySelectorAll('.bb-hb-node').forEach(node => {
        if (node._hbClick) return;
        node._hbClick = true;
        node.addEventListener('click', (event) => {
            event.stopPropagation();
            const nextIdx = parseInt(node.dataset.index, 10);
            setHeartbeatIndex(nextIdx);
            restartMotionTimers();
        });
    });
};

const bindHeartbeatControl = (selector, delta) => {
    const button = document.querySelector(selector);
    if (!button || button._hbWired) {
        return;
    }

    button._hbWired = true;
    button.addEventListener('click', (event) => {
        event.stopPropagation();
        setHeartbeatIndex(state.heartbeat.index + delta);
        restartMotionTimers();
    });
};

export const renderHeartbeat = ({ rebuild = false } = {}) => {
    const track = document.querySelector('#bbHeartbeatTrack');
    const info = document.querySelector('#bbHeartbeatInfo');
    const stage = document.querySelector('#bbHeartbeatStage');

    if (!track || !info || !stage) return;

    const items = state.heartbeat.items;
    const total = items.length;
    if (total === 0) {
        info.innerHTML = '<p class="bb-heartbeat-empty">No items.</p>';
        return;
    }

    const index = state.heartbeat.index;
    const item = items[index];
    const { thumbSize, activeScale } = getHeartbeatLayout(stage);

    syncHeartbeatTrack({ track, items, index, thumbSize, activeScale, rebuild });
    info.innerHTML = buildHeartbeatInfoMarkup(item);
    wireHeartbeatNodeClicks(track);
    bindHeartbeatControl('#bbHeartbeatPrev', -1);
    bindHeartbeatControl('#bbHeartbeatNext', 1);
};

/* ── Carousel interactions (drag, click, keyboard) ── */

export const initCarouselInteractions = () => {
    const stage = document.querySelector('#bbGalleryStage');
    if (!stage) return;
    if (stage.dataset.interactionsBound === 'true') return;
    stage.dataset.interactionsBound = 'true';

    const resetCarouselDrag = () => {
        if (state.carousel.dragRaf) {
            cancelAnimationFrame(state.carousel.dragRaf);
            state.carousel.dragRaf = null;
        }
        if (!state.carousel.dragging && state.carousel.dragOffset === 0 && state.carousel.pendingDragOffset === 0) {
            return;
        }
        state.carousel.dragging = false;
        state.carousel.dragOffset = 0;
        state.carousel.pendingDragOffset = 0;
        updateCarousel();
        restartMotionTimers();
    };

    const flashCarouselControls = () => {
        const prevBtn = document.querySelector('#bbPrevBtn');
        const nextBtn = document.querySelector('#bbNextBtn');
        if (prevBtn && nextBtn) {
            prevBtn.classList.add('is-flash');
            nextBtn.classList.add('is-flash');
            setTimeout(() => {
                prevBtn.classList.remove('is-flash');
                nextBtn.classList.remove('is-flash');
            }, 1200);
        }
    };

    const clickNext = (event) => {
        event.stopPropagation();
        nextSlide();
        restartMotionTimers();
    };

    const clickPrev = (event) => {
        event.stopPropagation();
        prevSlide();
        restartMotionTimers();
    };

    const flushDragFrame = () => {
        if (state.carousel.pendingDragOffset !== state.carousel.dragOffset) {
            state.carousel.dragOffset = state.carousel.pendingDragOffset;
            updateCarousel();
        }

        if (state.carousel.dragging) {
            state.carousel.dragRaf = requestAnimationFrame(flushDragFrame);
        }
    };

    let dragStartTs = 0;
    let prevMoveX = 0;
    let prevMoveTs = 0;
    let lastMoveX = 0;
    let lastMoveTs = 0;

    const startDrag = (x, ts = performance.now()) => {
        stopMotionTimers();
        state.carousel.dragStartX = x;
        state.carousel.dragging = true;
        state.carousel.pendingDragOffset = 0;
        state.carousel.dragOffset = 0;
        dragStartTs = ts;
        prevMoveX = x;
        prevMoveTs = ts;
        lastMoveX = x;
        lastMoveTs = ts;

        if (state.carousel.dragRaf) cancelAnimationFrame(state.carousel.dragRaf);
        state.carousel.dragRaf = requestAnimationFrame(flushDragFrame);
    };

    const moveDrag = (x, ts = performance.now()) => {
        if (!state.carousel.dragging) return;
        state.carousel.pendingDragOffset = x - state.carousel.dragStartX;
        prevMoveX = lastMoveX;
        prevMoveTs = lastMoveTs;
        lastMoveX = x;
        lastMoveTs = ts;
    };

    const finishDrag = (event, ts = performance.now()) => {
        if (!state.carousel.dragging) return;

        if (state.carousel.dragRaf) {
            cancelAnimationFrame(state.carousel.dragRaf);
            state.carousel.dragRaf = null;
        }

        state.carousel.dragging = false;
        const finalOffset = state.carousel.pendingDragOffset;

        // Get stage width for threshold calculation
        const stageEl = document.querySelector('#bbGalleryStage');
        const stageWidth = stageEl ? stageEl.clientWidth : 800;
        const isMobile = stageWidth < 768;
        const distanceThreshold = isMobile
            ? Math.min(42, Math.max(24, stageWidth * 0.055))
            : 60;
        const elapsedMs = Math.max(1, ts - dragStartTs);
        const averageVelocity = finalOffset / elapsedMs;
        const instantDt = Math.max(1, lastMoveTs - prevMoveTs);
        const instantVelocity = (lastMoveX - prevMoveX) / instantDt;
        const velocity = Math.abs(instantVelocity) > 0.01 ? instantVelocity : averageVelocity;
        const flickVelocityThreshold = isMobile ? 0.42 : 0.5; // px/ms
        const hasDistanceCommit = Math.abs(finalOffset) >= distanceThreshold;
        const hasVelocityCommit = Math.abs(velocity) >= flickVelocityThreshold && Math.abs(finalOffset) >= 10;

        if (hasDistanceCommit || hasVelocityCommit) {
            const direction = hasVelocityCommit ? Math.sign(velocity) : Math.sign(finalOffset);
            if (direction < 0) {
                nextSlide();
            } else if (direction > 0) {
                prevSlide();
            }
        }

        state.carousel.dragOffset = 0;
        state.carousel.pendingDragOffset = 0;
        updateCarousel();
        restartMotionTimers();

        // Suppress click after drag
        const clickSuppressThreshold = isMobile ? 16 : 10;
        if (Math.abs(finalOffset) > clickSuppressThreshold) {
            event?.preventDefault?.();
            stage.addEventListener('click', (e) => e.stopPropagation(), { capture: true, once: true });
        }
    };

    // Mouse events
    stage.addEventListener('mousedown', (e) => {
        if (e.button !== 0 || state.carousel.immersive) return;
        e.preventDefault();
        startDrag(e.clientX, e.timeStamp || performance.now());
    });

    document.addEventListener('mousemove', (e) => moveDrag(e.clientX, e.timeStamp || performance.now()));
    document.addEventListener('mouseup', (e) => finishDrag(e, e.timeStamp || performance.now()));

    // Touch events
    let touchStartX = 0;
    let touchStartY = 0;
    let touchDragActive = false;

    stage.addEventListener('touchstart', (e) => {
        if (state.carousel.immersive) return;
        const touch = e.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        touchDragActive = false;
    }, { passive: true });

    stage.addEventListener('touchmove', (e) => {
        if (state.carousel.immersive) return;
        const touch = e.touches[0];
        const dx = touch.clientX - touchStartX;
        const dy = touch.clientY - touchStartY;

        if (!touchDragActive) {
            if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
            // Let vertical intent pass through to page scrolling.
            if (Math.abs(dx) <= Math.abs(dy) * 1.15) return;
            touchDragActive = true;
            startDrag(touchStartX, e.timeStamp || performance.now());
        }

        moveDrag(touch.clientX, e.timeStamp || performance.now());
        e.preventDefault();
    }, { passive: false });

    stage.addEventListener('touchend', (e) => {
        if (touchDragActive) {
            finishDrag(e, e.timeStamp || performance.now());
        }
        touchDragActive = false;
    });
    stage.addEventListener('touchcancel', () => {
        touchDragActive = false;
        resetCarouselDrag();
    });
    window.addEventListener('blur', resetCarouselDrag);

    // Heartbeat drag
    const hbWrap = document.querySelector('.bb-heartbeat-track-wrap');
    if (hbWrap) {
        const snapHeartbeatToCenter = () => {
            const track = document.querySelector('#bbHeartbeatTrack');
            if (!track) return;

            const nodes = track.querySelectorAll('.bb-hb-node');
            if (nodes.length === 0) return;

            const wrapRect = hbWrap.getBoundingClientRect();
            const centerX = wrapRect.left + wrapRect.width / 2;

            let closestIdx = 0;
            let closestDist = Infinity;

            nodes.forEach((node, i) => {
                const rect = node.getBoundingClientRect();
                const nodeCenterX = rect.left + rect.width / 2;
                const dist = Math.abs(nodeCenterX - centerX);
                if (dist < closestDist) {
                    closestDist = dist;
                    closestIdx = i;
                }
            });

            if (closestIdx !== state.heartbeat.index) {
                setHeartbeatIndex(closestIdx);
            } else {
                const focusNode = nodes[closestIdx];
                if (focusNode) centerHeartbeatNode(focusNode);
            }
        };

        const queueHeartbeatSettle = () => {
            if (state.heartbeat.settleTimer) {
                clearTimeout(state.heartbeat.settleTimer);
            }
            state.heartbeat.settleTimer = setTimeout(() => {
                if (!state.heartbeat.dragging) {
                    snapHeartbeatToCenter();
                }
                state.heartbeat.settleTimer = null;
            }, 180);
        };

        hbWrap.addEventListener('mousedown', (e) => {
            state.heartbeat.dragging = true;
            state.heartbeat.dragStartX = e.clientX;
            state.heartbeat.dragStartScrollLeft = hbWrap.scrollLeft;
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!state.heartbeat.dragging) return;
            const dx = e.clientX - state.heartbeat.dragStartX;
            hbWrap.scrollLeft = state.heartbeat.dragStartScrollLeft - dx;
        });

        const finishHeartbeatDrag = (event) => {
            if (!state.heartbeat.dragging) return;
            state.heartbeat.dragging = false;

            const finalDx = (event.clientX || event.changedTouches?.[0]?.clientX || 0) - state.heartbeat.dragStartX;
            if (Math.abs(finalDx) > 5) {
                event?.preventDefault?.();
                hbWrap.addEventListener('click', (e) => e.stopPropagation(), { capture: true, once: true });
            }
            queueHeartbeatSettle();
        };

        document.addEventListener('mouseup', finishHeartbeatDrag);

        hbWrap.addEventListener('touchstart', (e) => {
            state.heartbeat.dragging = true;
            state.heartbeat.dragStartX = e.touches[0].clientX;
            state.heartbeat.dragStartScrollLeft = hbWrap.scrollLeft;
        }, { passive: true });

        hbWrap.addEventListener('touchmove', (e) => {
            if (!state.heartbeat.dragging) return;
            const dx = e.touches[0].clientX - state.heartbeat.dragStartX;
            hbWrap.scrollLeft = state.heartbeat.dragStartScrollLeft - dx;
        }, { passive: true });

        hbWrap.addEventListener('touchend', finishHeartbeatDrag);
        hbWrap.addEventListener('scroll', () => {
            if (!state.heartbeat.dragging) queueHeartbeatSettle();
        }, { passive: true });
    }

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        if (e.key === 'ArrowRight') {
            nextSlide();
            restartMotionTimers();
            flashCarouselControls();
        } else if (e.key === 'ArrowLeft') {
            prevSlide();
            restartMotionTimers();
            flashCarouselControls();
        } else if (e.key === 'Escape' && state.carousel.immersive) {
            setCarouselImmersive(false);
            restartMotionTimers();
        }
    });

    // Button listeners
    const nextBtn = document.querySelector('#bbNextBtn');
    const prevBtn = document.querySelector('#bbPrevBtn');
    if (nextBtn) nextBtn.addEventListener('click', clickNext);
    if (prevBtn) prevBtn.addEventListener('click', clickPrev);

    // Immersive close button
    const closeBtn = document.querySelector('#bbImmersiveClose');
    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            setCarouselImmersive(false);
            restartMotionTimers();
        });
    }

    // Click on carousel cards
    stage.addEventListener('click', (e) => {
        if (state.carousel.immersive) return;

        const slide = e.target.closest('.bb-slide');
        if (!slide) return;

        const clickedIndex = parseInt(slide.dataset.index, 10);

        if (clickedIndex === state.carousel.index) {
            const item = state.carousel.items[clickedIndex];
            if (item) {
                openArtworkModal(item);
            }
        } else {
            setCarouselIndex(clickedIndex);
            restartMotionTimers();
        }
    });

    // Hover pause
    stage.addEventListener('mouseenter', () => {
        state.carousel.hovering = true;
        stopMotionTimers();
    });

    stage.addEventListener('mouseleave', () => {
        state.carousel.hovering = false;
        if (!state.carousel.dragging) restartMotionTimers();
    });
};
