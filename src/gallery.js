/* ═══ Gallery setup — transforms data into carousel items ═══ */

import { state, statusClass } from './state.js';
import { renderCarouselCards, updateCarousel, initCarouselInteractions, restartMotionTimers } from './carousel.js';

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
        return b.number - a.number;
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
            // Use CDN images for all statuses
            if (item.number) {
                if (status === 'sealed') {
                    return {
                        ...item,
                        preview: 'https://cdn.lemonhaze.com/assets/assets/SEALED.png',
                    };
                } else if (status === 'expired') {
                    return {
                        ...item,
                        preview: 'https://cdn.lemonhaze.com/assets/assets/EXPIRED.png',
                    };
                } else {
                    // OPEN - use the specific remote image source
                    return {
                        ...item,
                        preview: `https://bestbefore.space/images/BESTBEFORE_${item.number}.png`,
                    };
                }
            }
            return item;
        })
        .filter((item) => item.preview)
        .sort(sortItems);

    state.carousel.items = allWithPreview;
    state.carousel.index = 0;
    state.carousel.dragOffset = 0;
    state.carousel.pendingDragOffset = 0;
    state.carousel.loadedIndexes = new Set();
    state.carousel.immersive = false;
    document.querySelector('.bb-root')?.classList.remove('is-carousel-immersive');

    renderCarouselCards();
    updateCarousel();
    initCarouselInteractions();
    restartMotionTimers();
};
