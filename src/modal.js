/* ═══ Artwork Modal — Live from Chain ═══ */

import { statusLabel, numberFormat, escapeHtml } from './state.js';

/** @type {() => void} */
let _restartMotionTimers;
export const injectRestartMotionTimers = (fn) => { _restartMotionTimers = fn; };

/** @type {() => void} */
let _stopMotionTimers;
export const injectStopMotionTimers = (fn) => { _stopMotionTimers = fn; };

export const firstPresent = (...values) => values.find((value) => value !== null && value !== undefined && value !== '');

const truncateValue = (value, start, end) => (
    value ? `${value.slice(0, start)}...${value.slice(-end)}` : '—'
);

const formatModalBlocks = (value) => (typeof value === 'number' ? numberFormat.format(value) : '—');

export const formatModalTimestamp = (value) => {
    if (value === null || value === undefined || value === '') return '';

    let normalized = value;
    if (typeof normalized === 'number') {
        normalized = normalized < 1e12 ? normalized * 1000 : normalized;
    } else if (typeof normalized === 'string' && /^\d+$/.test(normalized.trim())) {
        const numeric = Number(normalized);
        normalized = numeric < 1e12 ? numeric * 1000 : numeric;
    }

    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) return String(value);

    return new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(parsed);
};

export const formatModalValue = (value) => {
    if (value === null || value === undefined || value === '') return '—';
    return escapeHtml(String(value));
};

export const formatModalBlockTime = (blocks) => {
    if (!blocks || blocks <= 0) return '—';
    const mins = Math.round(blocks * 10);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    const remainMins = mins % 60;
    if (hours < 24) return remainMins > 0 ? `${hours}h ${remainMins}m` : `${hours}h`;
    const days = Math.floor(hours / 24);
    const years = (days / 365.25).toFixed(1);
    if (days > 730) return `~${years} years`;
    const remainHours = hours % 24;
    return remainHours > 0 ? `${days}d ${remainHours}h` : `${days}d`;
};

export const getModalLifespanVisualState = (block) => {
    let lifespanPct = 0;
    let lifespanClass = '';
    let remainingValueClass = '';

    if (block.immortal) {
        return { lifespanPct: 100, lifespanClass: 'is-immortal', remainingValueClass: '' };
    }

    if (block.lifespan && block.remaining != null) {
        lifespanPct = Math.max(0, Math.min(100, (block.remaining / block.lifespan) * 100));
        if (lifespanPct < 10) {
            return {
                lifespanPct,
                lifespanClass: 'is-critical',
                remainingValueClass: 'bb-modal__data-value--danger',
            };
        }

        if (lifespanPct < 20) {
            return {
                lifespanPct,
                lifespanClass: 'is-warning',
                remainingValueClass: 'bb-modal__data-value--warn',
            };
        }
    }

    return { lifespanPct, lifespanClass, remainingValueClass };
};

export const buildModalLifespanHtml = (status, block) => {
    if (status === 'open') {
        if (block.immortal) {
            return `
        <div class="bb-modal__data-row">
          <span class="bb-modal__data-label">Lifespan</span>
          <span class="bb-modal__data-value bb-modal__data-value--immortal">∞ FOREVER</span>
        </div>
        <div class="bb-modal__lifespan-bar">
          <div class="bb-modal__lifespan-fill is-immortal"></div>
        </div>`;
        }

        if (block.lifespan && block.remaining != null) {
            const { lifespanPct, lifespanClass, remainingValueClass } = getModalLifespanVisualState(block);
            return `
        <div class="bb-modal__data-row">
          <span class="bb-modal__data-label">Remaining</span>
          <span class="bb-modal__data-value${remainingValueClass ? ` ${remainingValueClass}` : ''}">${formatModalBlocks(block.remaining)} blocks</span>
        </div>
        <div class="bb-modal__data-row">
          <span class="bb-modal__data-label">Time Left</span>
          <span class="bb-modal__data-value">${formatModalBlockTime(block.remaining)}</span>
        </div>
        <div class="bb-modal__data-row">
          <span class="bb-modal__data-label">Total Lifespan</span>
          <span class="bb-modal__data-value">${formatModalBlocks(block.lifespan)} blocks</span>
        </div>
        <div class="bb-modal__lifespan-bar">
          <div class="bb-modal__lifespan-fill ${lifespanClass}" style="width: ${lifespanPct.toFixed(1)}%"></div>
        </div>`;
        }

        return `
        <div class="bb-modal__data-row">
          <span class="bb-modal__data-label">Lifespan</span>
          <span class="bb-modal__data-value bb-modal__data-value--warn">Live block data unavailable</span>
        </div>`;
    }

    if (status === 'sealed') {
        return `
      <div class="bb-modal__data-row">
        <span class="bb-modal__data-label">Lifespan</span>
        <span class="bb-modal__data-value bb-modal__data-value--warn">Awaiting activation</span>
      </div>`;
    }

    if (status === 'expired') {
        return `
      <div class="bb-modal__data-row">
        <span class="bb-modal__data-label">Lifespan</span>
        <span class="bb-modal__data-value bb-modal__data-value--danger">Expired</span>
      </div>
      <div class="bb-modal__data-row">
        <span class="bb-modal__data-label">Lived For</span>
        <span class="bb-modal__data-value">${formatModalBlocks(block.lifespan)} blocks (${formatModalBlockTime(block.lifespan)})</span>
      </div>`;
    }

    return '';
};

const getModalSignatureDisplay = (item) => {
    const rawSignature = firstPresent(
        item.signature,
        item.signatureText,
        item.sig,
        item.palette?.signature,
    );
    return rawSignature ? String(rawSignature) : '';
};

const buildModalPaletteHtml = (item) => {
    const paletteColors = item.palette?.colors || [];
    if (!item.palette || paletteColors.length === 0) {
        return '';
    }

    return `
    <div class="bb-modal__palette">
      <span class="bb-modal__palette-name">${escapeHtml(item.palette.id || 'Unknown')}</span>
      <div class="bb-modal__palette-swatches">
        ${paletteColors.map(c => `<span class="bb-modal__palette-dot" style="background: ${c}"></span>`).join('')}
      </div>
    </div>`;
};

const buildModalSignatureHtml = (signatureDisplay) => (
    signatureDisplay
        ? `
    <div class="bb-modal__signature">
      <span class="bb-modal__signature-inline">${escapeHtml(signatureDisplay)}</span>
    </div>`
        : ''
);

const getModalPreviewUrls = (item, status, contentUrl) => {
    const mobilePreviewUrl = item.previewMobile
        || (status === 'sealed'
            ? 'https://bestbefore.space/images/SEALED_800.webp'
            : status === 'expired'
                ? 'https://bestbefore.space/images/EXPIRED_800.webp'
                : item.number
                    ? `https://bestbefore.space/images/BESTBEFORE_${item.number}_800.webp`
                    : item.preview
                        || contentUrl);

    return {
        mobilePreviewUrl,
        fallbackPreviewUrl: item.preview || contentUrl,
    };
};

const buildModalArtworkMediaHtml = (item, status, isMobile, contentUrl) => {
    if (!isMobile) {
        return `<iframe class="bb-modal__iframe" src="${contentUrl}" title="${escapeHtml(item.name)} — Live from chain" sandbox="allow-scripts allow-same-origin" loading="eager"></iframe>`;
    }

    const { mobilePreviewUrl, fallbackPreviewUrl } = getModalPreviewUrls(item, status, contentUrl);
    return `<img class="bb-modal__image" src="${escapeHtml(mobilePreviewUrl)}" alt="${escapeHtml(item.name)}" loading="eager" decoding="async" onerror="if(this.dataset.fallback!=='1'){this.dataset.fallback='1';this.src='${escapeHtml(fallbackPreviewUrl)}';}" />`;
};

const buildModalSatRowHtml = (item) => {
    const satValue = firstPresent(
        item.sat_name,
        item.sat,
        item.satNumber,
        item.satoshi,
        item.satpoint,
    );

    return satValue
        ? `
          <div class="bb-modal__data-row">
            <span class="bb-modal__data-label">Sat</span>
            <span class="bb-modal__data-value">${escapeHtml(String(satValue))}</span>
          </div>`
        : '';
};

const buildModalActivationTimestampRowHtml = (item) => {
    const activationTimestampValue = firstPresent(
        item.activationTimestamp,
        item.activation_timestamp,
        item.activationTimestampIso,
        item.activation_timestamp_iso,
        item.block?.activationTimestamp,
        item.block?.activation_timestamp,
        item.activatedAtIso,
        item.activatedAt,
        item.openedAtIso,
        item.openedAt,
    );

    if (!activationTimestampValue) {
        return '';
    }

    return `
          <div class="bb-modal__data-row">
            <span class="bb-modal__data-label">Activation Timestamp</span>
            <span class="bb-modal__data-value">${escapeHtml(String(formatModalTimestamp(activationTimestampValue)))}</span>
          </div>`;
};

const buildModalMetadataRowsHtml = (item, status, block) => {
    const truncId = truncateValue(item.id, 12, 8);
    const dimensionsValue = status === 'open' ? '1800 x 3200 px' : item.dimensions;

    return `
          <div class="bb-modal__data-row">
            <span class="bb-modal__data-label">Inscription ID</span>
            <span class="bb-modal__data-value">${escapeHtml(truncId)}</span>
          </div>
          <div class="bb-modal__data-row">
            <span class="bb-modal__data-label">Dimensions</span>
            <span class="bb-modal__data-value">${formatModalValue(dimensionsValue)}</span>
          </div>
          <div class="bb-modal__data-row">
            <span class="bb-modal__data-label">Inscription Block</span>
            <span class="bb-modal__data-value">${formatModalBlocks(block.inscription)}</span>
          </div>
          <div class="bb-modal__data-row">
            <span class="bb-modal__data-label">Activation Block</span>
            <span class="bb-modal__data-value">${formatModalBlocks(block.activation)}</span>
          </div>
          <div class="bb-modal__data-row">
            <span class="bb-modal__data-label">Expiry Block</span>
            <span class="bb-modal__data-value">${formatModalBlocks(block.expiry)}</span>
          </div>
          <div class="bb-modal__data-row">
            <span class="bb-modal__data-label">Current Block Height</span>
            <span class="bb-modal__data-value">${formatModalBlocks(block.tip)}</span>
          </div>
          ${buildModalSatRowHtml(item)}
          ${buildModalActivationTimestampRowHtml(item)}`;
};

const buildModalMarkup = ({
    item,
    status,
    badgeClass,
    badgeLabel,
    paletteHtml,
    signatureHtml,
    artworkMediaHtml,
    lifespanHtml,
    metadataRowsHtml,
    truncAddr,
}) => `
    <div class="bb-modal" id="bbArtworkModal">
      <div class="bb-modal__toggle">
        <button class="bb-modal__toggle-btn" data-modal-view="solo" type="button">Solo</button>
        <button class="bb-modal__toggle-btn is-active" data-modal-view="details" type="button">Details</button>
      </div>
      <button class="bb-modal__close" type="button" aria-label="Close modal">&times;</button>

      <div class="bb-modal__artwork">
        ${artworkMediaHtml}
      </div>

      <div class="bb-modal__details">
        <div>
          <h2 class="bb-modal__detail-title">${escapeHtml(item.name)}</h2>
          <p class="bb-modal__detail-edition">Edition ${item.number || '?'} / 420</p>
        </div>

        <div class="bb-modal__detail-status">
          <span class="bb-modal__status-badge ${badgeClass}">${badgeLabel}</span>
        </div>

        ${paletteHtml}
        ${signatureHtml}

        <hr class="bb-modal__detail-divider" />

        <div class="bb-modal__data-grid">
          ${lifespanHtml}
        </div>

        <hr class="bb-modal__detail-divider" />

        <div class="bb-modal__data-grid">
          ${metadataRowsHtml}
        </div>

        <hr class="bb-modal__detail-divider" />

        <div>
          <span class="bb-modal__data-label">Owner</span>
          <p class="bb-modal__address">${escapeHtml(truncAddr)}</p>
        </div>

        ${item.ordinalsUrl ? `<a class="bb-modal__ext-link" href="${item.ordinalsUrl}" target="_blank" rel="noreferrer">View on Ordinals &rarr;</a>` : ''}
      </div>
    </div>
  `;

export const closeArtworkModal = () => {
    const overlay = document.querySelector('.bb-modal-overlay');
    if (!overlay) return;
    if (overlay.dataset.closing === '1') return;
    overlay.dataset.closing = '1';

    if (overlay._escHandler) {
        document.removeEventListener('keydown', overlay._escHandler);
    }

    overlay.classList.remove('is-active');

    setTimeout(() => {
        const iframe = overlay.querySelector('iframe');
        if (iframe) iframe.src = 'about:blank';
        overlay.remove();
    }, 450);

    document.body.style.overflow = '';
    window.dispatchEvent(new CustomEvent('bb:modal-close'));

    if (_restartMotionTimers) _restartMotionTimers();
};

export const openArtworkModal = (item) => {
    if (_stopMotionTimers) _stopMotionTimers();

    const existing = document.querySelector('.bb-modal-overlay');
    if (existing) existing.remove();

    const block = item.block || {};
    const status = (item.status || 'unknown').toLowerCase();
    const contentUrl = `https://ordinals.com/content/${item.id}`;
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    const badgeClass = block.immortal ? 'is-immortal' : `is-${status}`;
    const badgeLabel = block.immortal ? 'IMMORTAL' : statusLabel[status] || status.toUpperCase();
    const paletteHtml = buildModalPaletteHtml(item);
    const signatureHtml = buildModalSignatureHtml(getModalSignatureDisplay(item));
    const artworkMediaHtml = buildModalArtworkMediaHtml(item, status, isMobile, contentUrl);
    const lifespanHtml = buildModalLifespanHtml(status, block);
    const metadataRowsHtml = buildModalMetadataRowsHtml(item, status, block);
    const truncAddr = truncateValue(item.address, 10, 8);

    const overlay = document.createElement('div');
    overlay.className = 'bb-modal-overlay';
    overlay.innerHTML = buildModalMarkup({
        item,
        status,
        badgeClass,
        badgeLabel,
        paletteHtml,
        signatureHtml,
        artworkMediaHtml,
        lifespanHtml,
        metadataRowsHtml,
        truncAddr,
    });

    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
        overlay.classList.add('is-active');
    });

    document.body.style.overflow = 'hidden';
    window.dispatchEvent(new CustomEvent('bb:modal-open', {
        detail: {
            number: item?.number ?? null,
            id: item?.id ?? null,
        },
    }));

    overlay.querySelector('.bb-modal__close').addEventListener('click', closeArtworkModal);

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeArtworkModal();
    });

    const escHandler = (e) => {
        if (e.key === 'Escape') {
            closeArtworkModal();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
    overlay._escHandler = escHandler;

    overlay.querySelectorAll('[data-modal-view]').forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = document.querySelector('#bbArtworkModal');
            const view = btn.dataset.modalView;
            modal.classList.toggle('is-solo', view === 'solo');
            overlay.querySelectorAll('[data-modal-view]').forEach(b => {
                b.classList.toggle('is-active', b.dataset.modalView === view);
            });
        });
    });
};
