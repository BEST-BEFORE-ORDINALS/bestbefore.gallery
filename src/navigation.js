/* ═══ Navigation — zone observer, scroll hints, vault tabs ═══ */

import { state } from './state.js';

/** @type {() => void} */
let _setCarouselImmersive; // Lazy-resolved to break carousel ↔ nav cycle
export const injectCarouselImmersive = (fn) => { _setCarouselImmersive = fn; };

/** @type {() => string} */
let _renderVaultContent;
export const injectRenderVaultContent = (fn) => { _renderVaultContent = fn; };

export const initNavigation = () => {
    const scrollContainer = document.querySelector('.bb-scroll-container');
    const zoneIndicator = document.querySelector('#bbZoneIndicator');
    const scrollHint = document.querySelector('#bbScrollHint');
    const zones = document.querySelectorAll('.bb-zone');

    const zoneNames = {
        gallery: 'THE GALLERY',
        about: 'ABOUT',
        vault: 'THE VAULT',
    };

    const scrollToZone = (target) => {
        if (!target) return;
        if (scrollContainer) {
            scrollContainer.scrollTo({ top: target.offsetTop, behavior: 'smooth' });
            return;
        }
        target.scrollIntoView({ behavior: 'smooth' });
    };

    if (zoneIndicator && zones.length > 0) {
        let zoneRaf = null;

        const updateActiveZone = () => {
            const scrollTop = scrollContainer ? scrollContainer.scrollTop : window.scrollY;
            const viewportHeight = scrollContainer ? scrollContainer.clientHeight : window.innerHeight;
            // Lower probe to 60% of viewport to better detect bottom sections like Vault
            const probeY = scrollTop + viewportHeight * 0.6;

            let containingZone = null;
            let bestZone = null;
            let bestDistance = Infinity;

            zones.forEach((zoneEl) => {
                const zoneTop = zoneEl.offsetTop;
                const zoneBottom = zoneTop + zoneEl.offsetHeight;

                if (probeY >= zoneTop && probeY < zoneBottom) {
                    containingZone = zoneEl;
                }

                const zoneCenter = zoneEl.offsetTop + zoneEl.offsetHeight / 2;
                const distance = Math.abs(zoneCenter - probeY);
                if (distance < bestDistance) {
                    bestDistance = distance;
                    bestZone = zoneEl;
                }
            });

            if (containingZone) {
                bestZone = containingZone;
            }

            if (!bestZone) return;

            const zone = bestZone.dataset.zone;
            if (!zone) return;
            if (zone === state.activeView && zoneIndicator.textContent === (zoneNames[zone] || zone.toUpperCase())) {
                return;
            }

            state.activeView = zone;
            zoneIndicator.textContent = zoneNames[zone] || zone.toUpperCase();

            if (scrollHint) {
                scrollHint.style.opacity = zone === 'gallery' ? '1' : '0';
                scrollHint.style.pointerEvents = zone === 'gallery' ? 'auto' : 'none';
            }
        };

        const requestZoneUpdate = () => {
            if (zoneRaf) return;
            zoneRaf = requestAnimationFrame(() => {
                zoneRaf = null;
                updateActiveZone();
            });
        };

        if (scrollContainer) {
            scrollContainer.addEventListener('scroll', requestZoneUpdate, { passive: true });
        } else {
            window.addEventListener('scroll', requestZoneUpdate, { passive: true });
        }
        window.addEventListener('resize', requestZoneUpdate);
        requestZoneUpdate();
    }

    if (scrollHint && scrollContainer) {
        scrollHint.addEventListener('click', () => {
            const aboutZone = document.querySelector('#bbZoneAbout');
            scrollToZone(aboutZone);
        });
    }

    // Use event delegation for the Vault hint since it's rendered dynamically
    if (scrollContainer) {
        scrollContainer.addEventListener('click', (e) => {
            const hint = e.target.closest('#bbVaultHint');
            if (hint) {
                const vaultZone = document.querySelector('#bbZoneVault');
                scrollToZone(vaultZone);
            }
        });
    }

    const brandElement = document.querySelector('.bb-header__brand');
    if (brandElement && scrollContainer) {
        brandElement.style.cursor = 'pointer';
        brandElement.addEventListener('click', () => {
            const galleryZone = document.querySelector('#bbZoneGallery');
            scrollToZone(galleryZone);
        });
    }

    // Vault sub-navigation delegation
    const vaultZone = document.querySelector('#bbZoneVault');
    if (vaultZone) {
        vaultZone.addEventListener('click', (e) => {
            const ledgerLink = e.target.closest('.bb-ledger-link[data-bb-number]');
            if (ledgerLink) {
                const desiredNumber = Number(ledgerLink.dataset.bbNumber);
                if (Number.isFinite(desiredNumber) && typeof window.bbOpenItem === 'function') {
                    e.preventDefault();
                    window.bbOpenItem(desiredNumber, { immersive: false, scroll: true });
                    return;
                }
            }

            const btn = e.target.closest('[data-vault-tab]');
            if (!btn) return;
            if (btn.tagName === 'A') return;

            const tab = btn.dataset.vaultTab;
            state.vault.activeTab = tab;
            state.activeView = 'vault';

            if (zoneIndicator) {
                zoneIndicator.textContent = zoneNames.vault;
            }

            if (scrollHint) {
                scrollHint.style.opacity = '0';
                scrollHint.style.pointerEvents = 'none';
            }

            vaultZone.querySelectorAll('[data-vault-tab]').forEach((b) => {
                b.classList.toggle('is-active', b.dataset.vaultTab === tab);
            });

            const contentContainer = document.querySelector('#bbVaultContent');
            if (contentContainer && _renderVaultContent) {
                contentContainer.innerHTML = _renderVaultContent();
            }
        });
    }
};
