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

        if (state.carousel.items.length > 1 && !state.carousel.hovering && !state.carousel.dragging) {
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
    stage.style.setProperty('--hb-center-pad', `${centerPad} px`);
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

export const renderCarouselMeta = () => {
    const target = document.querySelector('#bbGalleryMeta');

    if (state.carousel.items.length === 0) {
        target.innerHTML = '<p>Carousel unavailable.</p>';
        return;
    }

    const item = state.carousel.items[state.carousel.index];
    const block = item.block || {};
    const paletteColors = item.palette?.colors || [];

    const paletteHtml = (item.status === 'open' && paletteColors.length > 0)
        ? `<div class="bb-palette-list">
        <span class="bb-palette-name">${escapeHtml(item.palette?.id || 'Unknown')}</span>
        <div class="bb-palette-swatches">
          ${paletteColors.map(c => `<span class="bb-palette-dot" style="background: ${c}"></span>`).join('')}
        </div>
      </div>`
        : '';

    const formattedBlocks = (val) => typeof val === 'number' ? numberFormat.format(val) : '0';
    const formatBlockTime = (blocks) => {
        if (!blocks || blocks <= 0) return '0m';
        const mins = Math.round(blocks * 10);
        if (mins < 60) return `${mins}m`;
        const hours = Math.floor(mins / 60);
        const remainMins = mins % 60;
        if (hours < 24) return remainMins > 0 ? `${hours}h ${remainMins}m` : `${hours}h`;
        const days = Math.floor(hours / 24);
        const remainHours = hours % 24;
        return remainHours > 0 ? `${days}d ${remainHours}h` : `${days}d`;
    };

    let lifespanHtml = '';
    if (item.status === 'open') {
        if (block.immortal) {
            lifespanHtml = '<div class="bb-meta-lifespan"><span class="bb-meta-lifespan__immortal">IMMORTAL — Lives Forever</span></div>';
        } else if (block.remaining) {
            lifespanHtml = `
        <div class="bb-meta-lifespan">
          <span class="bb-meta-lifespan__remaining">${formattedBlocks(block.remaining)} blocks</span>
          <span class="bb-meta-lifespan__time">${formatBlockTime(block.remaining)} remaining</span>
        </div>
      `;
        }
    } else if (item.status === 'sealed') {
        lifespanHtml = '<div class="bb-meta-lifespan"><span class="bb-meta-lifespan__sealed">Awaiting activation</span></div>';
    } else if (item.status === 'expired') {
        lifespanHtml = '<div class="bb-meta-lifespan"><span class="bb-meta-lifespan__expired">Expired</span></div>';
    }

    target.innerHTML = `
  <div class="bb-gallery-meta__left">
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
  </div>
`;
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
    const sampleSlide = slides[0];
    const slideWidth = sampleSlide ? sampleSlide.offsetWidth : Math.min(350, Math.max(220, stageWidth * 0.22));
    const edgePadding = 10;
    const maxOffset = Math.max(240, stageWidth / 2 - slideWidth / 2 - edgePadding);
    const isDesktop = stageWidth >= 980;
    const isCompact = stageWidth < 760;

    // Keep spacing mathematically consistent:
    // center <-> 1st neighbor gap ~= 1st <-> 2nd neighbor gap.
    let sideShift;
    let farShift;

    if (isDesktop) {
        const centerVisualWidth = slideWidth * 1.02;
        const firstVisualWidth = slideWidth * 0.8;
        const secondVisualWidth = slideWidth * 0.46;

        const nearSpan = (centerVisualWidth + firstVisualWidth) / 2;
        const farSpan = (firstVisualWidth + secondVisualWidth) / 2;

        // Push ±2 cards toward arrow lanes for a wider stage feel.
        const arrowCenterInset = 11 + 20; // left/right: 0.7rem + (40px / 2)
        const arrowLanePadding = 8;
        const targetFarShift = stageWidth / 2 - (secondVisualWidth / 2 + arrowCenterInset + arrowLanePadding);

        const minGap = 30;
        const maxGap = 112;
        const minFarShift = nearSpan + farSpan + minGap * 2;
        const maxFarShift = maxOffset + 200;

        farShift = Math.max(minFarShift, Math.min(targetFarShift, maxFarShift));

        const equalGap = Math.min(maxGap, Math.max(minGap, (farShift - nearSpan - farSpan) / 2));
        sideShift = nearSpan + equalGap;
        farShift = sideShift + farSpan + equalGap;
    } else {
        sideShift = Math.max(228, slideWidth * 0.94 + 10);
        sideShift = Math.min(sideShift, maxOffset * 0.8);

        farShift = Math.max(sideShift + 168, sideShift * 1.36);
        farShift = Math.min(farShift, maxOffset + (isCompact ? 30 : 44));

        if (farShift < sideShift + 132) {
            farShift = sideShift + 132;
        }
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
};

export const findNextLoadedIndex = (direction) => {
    const total = state.carousel.items.length;
    const current = state.carousel.index;

    for (let i = 1; i < total; i++) {
        let index = (current + direction * i) % total;
        if (index < 0) index += total;

        if (state.carousel.fullyLoaded.has(index)) {
            return index;
        }
    }

    let fallback = (current + direction) % total;
    if (fallback < 0) fallback += total;
    return fallback;
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
    const block = item.block || {};

    /* Utility: pretty-print large numbers */
    const formattedBlocks = (val) => typeof val === 'number' ? numberFormat.format(val) : '—';

    /* Layout constants – read from CSS custom properties */
    const cs = getComputedStyle(stage);
    const thumbSize = parseInt(cs.getPropertyValue('--hb-thumb-size'), 10) || 68;
    const gap = parseInt(cs.getPropertyValue('--hb-gap'), 10) || 6;

    /* Rebuild the track nodes only when needed */
    if (rebuild || !state.heartbeat.initialized) {
        const getVisualWidth = (i, isFocus) => {
            if (isFocus) {
                const activeScale = parseFloat(cs.getPropertyValue('--hb-active-scale')) || 1.4;
                return Math.round(thumbSize * activeScale);
            }
            return thumbSize;
        };

        const trackHtml = items.map((it, i) => {
            const isFocus = i === index;
            const st = (it.status || '').toLowerCase();
            const cls = statusClass[st] || '';
            const w = getVisualWidth(i, isFocus);
            return `<div class="bb-hb-node ${cls} ${isFocus ? 'is-focus' : ''}"
                   data-index="${i}"
                   style="width:${w}px;height:${thumbSize}px"
                   title="${escapeHtml(it.name)}">
                <img src="${it.preview || ''}" alt="${escapeHtml(it.name)}" loading="lazy" decoding="async" />
              </div>`;
        }).join('');
        track.innerHTML = trackHtml;
        state.heartbeat.initialized = true;

        /* Center the focus node on first paint */
        requestAnimationFrame(() => {
            const focusNode = track.querySelector('.is-focus');
            if (focusNode) centerHeartbeatNode(focusNode, 'instant');
        });
    } else {
        /* Just update focus state */
        const nodes = track.querySelectorAll('.bb-hb-node');
        const activeScale = parseFloat(cs.getPropertyValue('--hb-active-scale')) || 1.4;
        nodes.forEach((node, i) => {
            const isFocus = i === index;
            node.classList.toggle('is-focus', isFocus);
            node.style.width = `${isFocus ? Math.round(thumbSize * activeScale) : thumbSize}px`;
        });

        /* Scroll to center the active node */
        const focusNode = track.querySelector('.is-focus');
        if (focusNode) centerHeartbeatNode(focusNode);
    }

    /* Update info panel */
    const paletteColors = item.palette?.colors || [];
    const paletteHtml = paletteColors.length > 0
        ? `<div class="bb-hb-palette">
        <span class="bb-hb-palette-name">${escapeHtml(item.palette?.id || '')}</span>
        <div class="bb-hb-palette-dots">
          ${paletteColors.map(c => `<span class="bb-hb-dot" style="background:${c}"></span>`).join('')}
        </div>
      </div>`
        : '';

    let lifespanHtml = '';
    if (item.status === 'open') {
        if (block.immortal) {
            lifespanHtml = '<span class="bb-hb-lifespan is-immortal">IMMORTAL</span>';
        } else if (block.remaining) {
            lifespanHtml = `<span class="bb-hb-lifespan">${formattedBlocks(block.remaining)} blocks remaining</span>`;
        }
    } else if (item.status === 'sealed') {
        lifespanHtml = '<span class="bb-hb-lifespan is-sealed">Awaiting activation</span>';
    } else if (item.status === 'expired') {
        lifespanHtml = '<span class="bb-hb-lifespan is-expired">Expired</span>';
    }

    info.innerHTML = `
    <h3 class="bb-hb-title">${escapeHtml(item.name)}</h3>
    <span class="bb-status-badge is-${item.status}">${escapeHtml(statusLabel[item.status] || item.status)}</span>
    ${paletteHtml}
    ${lifespanHtml}
    ${item.ordinalsUrl ? `<a class="bb-hb-link" href="${item.ordinalsUrl}" target="_blank" rel="noreferrer">Ordinals ↗</a>` : ''}
  `;

    /* Wire up click on the track to navigate */
    track.querySelectorAll('.bb-hb-node').forEach(node => {
        if (node._hbClick) return; // Avoid doubling
        node._hbClick = true;
        node.addEventListener('click', (e) => {
            e.stopPropagation();
            const nextIdx = parseInt(node.dataset.index, 10);
            setHeartbeatIndex(nextIdx);
            restartMotionTimers();
        });
    });

    /* Prev/Next buttons */
    const prevBtn = document.querySelector('#bbHeartbeatPrev');
    const nextBtn = document.querySelector('#bbHeartbeatNext');
    if (prevBtn && !prevBtn._hbWired) {
        prevBtn._hbWired = true;
        prevBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const prevIdx = (state.heartbeat.index - 1 + total) % total;
            setHeartbeatIndex(prevIdx);
            restartMotionTimers();
        });
    }
    if (nextBtn && !nextBtn._hbWired) {
        nextBtn._hbWired = true;
        nextBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const nextIdx = (state.heartbeat.index + 1) % total;
            setHeartbeatIndex(nextIdx);
            restartMotionTimers();
        });
    }

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

    const startDrag = (x) => {
        stopMotionTimers();
        state.carousel.dragStartX = x;
        state.carousel.dragging = true;
        state.carousel.pendingDragOffset = 0;
        state.carousel.dragOffset = 0;

        if (state.carousel.dragRaf) cancelAnimationFrame(state.carousel.dragRaf);
        state.carousel.dragRaf = requestAnimationFrame(flushDragFrame);
    };

    const moveDrag = (x) => {
        if (!state.carousel.dragging) return;
        state.carousel.pendingDragOffset = x - state.carousel.dragStartX;
    };

    const finishDrag = (event) => {
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
        const threshold = stageWidth < 768 ? Math.max(30, stageWidth * 0.06) : 60;

        if (finalOffset < -threshold) {
            nextSlide();
        } else if (finalOffset > threshold) {
            prevSlide();
        }

        state.carousel.dragOffset = 0;
        state.carousel.pendingDragOffset = 0;
        updateCarousel();
        restartMotionTimers();

        // Suppress click after drag
        if (Math.abs(finalOffset) > 10) {
            event?.preventDefault?.();
            stage.addEventListener('click', (e) => e.stopPropagation(), { capture: true, once: true });
        }
    };

    // Mouse events
    stage.addEventListener('mousedown', (e) => {
        if (e.button !== 0 || state.carousel.immersive) return;
        e.preventDefault();
        startDrag(e.clientX);
    });

    document.addEventListener('mousemove', (e) => moveDrag(e.clientX));
    document.addEventListener('mouseup', (e) => finishDrag(e));

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
            if (Math.abs(dx) <= Math.abs(dy)) return;
            touchDragActive = true;
            startDrag(touchStartX);
        }

        moveDrag(touch.clientX);
        e.preventDefault();
    }, { passive: false });

    stage.addEventListener('touchend', (e) => {
        if (touchDragActive) {
            finishDrag(e);
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
