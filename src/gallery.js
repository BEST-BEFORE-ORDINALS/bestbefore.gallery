/* ═══ Gallery setup — transforms data into carousel items ═══ */

import { state } from './state.js';
import { renderCarouselCards, updateCarousel, initCarouselInteractions, restartMotionTimers, renderCarouselMeta, updateImmersiveHud, setCarouselImmersive, setCarouselIndex } from './carousel.js';

export const setupGallery = () => {
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
        return (parseInt(a.number, 10) || 0) - (parseInt(b.number, 10) || 0);
    };

    /* Setup Carousel - Uses ALL artworks from Live Data first, then fallback */
    let carouselPool = [];

    if (state.liveItems && Array.isArray(state.liveItems) && state.liveItems.length > 0) {
        carouselPool = state.liveItems;
    } else {
        carouselPool = state.items;
    }

    // Use ALL artworks, not just OPEN — map with appropriate preview images
    const allWithPreview = carouselPool
        .map((item) => {
            const status = (item.status || '').toLowerCase();
            // Keep existing desktop sources, add lighter mobile previews.
            if (item.number) {
                if (status === 'sealed') {
                    return {
                        ...item,
                        preview: 'https://cdn.lemonhaze.com/assets/assets/SEALED.png',
                        previewMobile: 'https://bestbefore.space/images/SEALED_800.webp',
                    };
                } else if (status === 'expired') {
                    return {
                        ...item,
                        preview: 'https://cdn.lemonhaze.com/assets/assets/EXPIRED.png',
                        previewMobile: 'https://bestbefore.space/images/EXPIRED_800.webp',
                    };
                } else {
                    // OPEN uses numbered sources on desktop + mobile-optimized _800 variant.
                    return {
                        ...item,
                        preview: `https://bestbefore.space/images/BESTBEFORE_${item.number}.png`,
                        previewMobile: `https://bestbefore.space/images/BESTBEFORE_${item.number}_800.webp`,
                    };
                }
            }
            return item;
        })
        .filter((item) => item.preview)
        .sort(sortItems);

    state.carousel.items = allWithPreview;
    state.carousel.index = Math.floor(Math.random() * allWithPreview.length);
    state.carousel.dragOffset = 0;
    state.carousel.pendingDragOffset = 0;
    state.carousel.loadedIndexes = new Set();
    state.carousel.fullyLoaded = new Set();
    state.carousel.hdLoadedIndexes = new Set();
    state.carousel.hdLoadingIndexes = new Set();
    state.carousel.immersive = false;
    document.querySelector('.bb-root')?.classList.remove('is-carousel-immersive');

    renderCarouselCards();
    // Update state first
    updateCarousel();
    // Render initial metadata since it's no longer in updateCarousel loop
    renderCarouselMeta();
    updateImmersiveHud();

    initCarouselInteractions();
    restartMotionTimers();

    const openItemFromNumber = (number, options = {}) => {
        const { immersive = false, scroll = true } = options;
        const desiredNumber = Number(number);
        if (!Number.isFinite(desiredNumber)) {
            return false;
        }

        const index = state.carousel.items.findIndex((entry) => Number(entry?.number) === desiredNumber);
        if (index === -1) {
            return false;
        }

        setCarouselIndex(index);
        setCarouselImmersive(Boolean(immersive));

        if (scroll) {
            const galleryZone = document.querySelector('#bbZoneGallery');
            if (galleryZone) {
                galleryZone.scrollIntoView({ behavior: 'smooth' });
            }
        }

        return true;
    };

    /* Expose navigation helper for Ledger */
    window.bbOpenItem = (number, options = {}) => {
        const { immersive = false, scroll = true } = options;
        return openItemFromNumber(number, { immersive, scroll });
    };
};
