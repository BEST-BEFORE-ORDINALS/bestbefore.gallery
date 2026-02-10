/* ═══ Artwork Modal — Live from Chain ═══ */

import { state, statusLabel, numberFormat, escapeHtml } from './state.js';

/** @type {() => void} */
let _restartMotionTimers;
export const injectRestartMotionTimers = (fn) => { _restartMotionTimers = fn; };

/** @type {() => void} */
let _stopMotionTimers;
export const injectStopMotionTimers = (fn) => { _stopMotionTimers = fn; };

export const closeArtworkModal = () => {
    const overlay = document.querySelector('.bb-modal-overlay');
    if (!overlay) return;

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

    if (_restartMotionTimers) _restartMotionTimers();
};

export const openArtworkModal = (item) => {
    if (_stopMotionTimers) _stopMotionTimers();

    const existing = document.querySelector('.bb-modal-overlay');
    if (existing) existing.remove();

    const block = item.block || {};
    const paletteColors = item.palette?.colors || [];
    const status = (item.status || 'unknown').toLowerCase();

    const contentUrl = `https://ordinals.com/content/${item.id}`;
    const isMobile = window.matchMedia('(max-width: 768px)').matches;

    const fmtBlocks = (val) => typeof val === 'number' ? numberFormat.format(val) : '—';
    const firstPresent = (...vals) => vals.find((v) => v !== null && v !== undefined && v !== '');
    const fmtTimestamp = (value) => {
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
    const fmtValue = (val) => {
        if (val === null || val === undefined || val === '') return '—';
        return escapeHtml(String(val));
    };
    const fmtBlockTime = (blocks) => {
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

    let lifespanPct = 0;
    let lifespanClass = '';
    let remainingValueClass = '';
    if (block.immortal) {
        lifespanPct = 100;
        lifespanClass = 'is-immortal';
    } else if (block.lifespan && block.remaining != null) {
        lifespanPct = Math.max(0, Math.min(100, (block.remaining / block.lifespan) * 100));
        if (lifespanPct < 10) {
            lifespanClass = 'is-critical';
            remainingValueClass = 'bb-modal__data-value--danger';
        } else if (lifespanPct < 20) {
            lifespanClass = 'is-warning';
            remainingValueClass = 'bb-modal__data-value--warn';
        }
    }

    const badgeClass = block.immortal ? 'is-immortal' : `is-${status}`;
    const badgeLabel = block.immortal ? 'IMMORTAL' : statusLabel[status] || status.toUpperCase();

    let lifespanHtml = '';
    if (status === 'open') {
        if (block.immortal) {
            lifespanHtml = `
        <div class="bb-modal__data-row">
          <span class="bb-modal__data-label">Lifespan</span>
          <span class="bb-modal__data-value bb-modal__data-value--immortal">∞ FOREVER</span>
        </div>
        <div class="bb-modal__lifespan-bar">
          <div class="bb-modal__lifespan-fill is-immortal"></div>
        </div>`;
        } else if (block.lifespan && block.remaining != null) {
            lifespanHtml = `
        <div class="bb-modal__data-row">
          <span class="bb-modal__data-label">Remaining</span>
          <span class="bb-modal__data-value${remainingValueClass ? ` ${remainingValueClass}` : ''}">${fmtBlocks(block.remaining)} blocks</span>
        </div>
        <div class="bb-modal__data-row">
          <span class="bb-modal__data-label">Time Left</span>
          <span class="bb-modal__data-value">${fmtBlockTime(block.remaining)}</span>
        </div>
        <div class="bb-modal__data-row">
          <span class="bb-modal__data-label">Total Lifespan</span>
          <span class="bb-modal__data-value">${fmtBlocks(block.lifespan)} blocks</span>
        </div>
        <div class="bb-modal__lifespan-bar">
          <div class="bb-modal__lifespan-fill ${lifespanClass}" style="width: ${lifespanPct.toFixed(1)}%"></div>
        </div>`;
        } else {
            lifespanHtml = `
        <div class="bb-modal__data-row">
          <span class="bb-modal__data-label">Lifespan</span>
          <span class="bb-modal__data-value bb-modal__data-value--warn">Live block data unavailable</span>
        </div>`;
        }
    } else if (status === 'sealed') {
        lifespanHtml = `
      <div class="bb-modal__data-row">
        <span class="bb-modal__data-label">Lifespan</span>
        <span class="bb-modal__data-value bb-modal__data-value--warn">Awaiting activation</span>
      </div>`;
    } else if (status === 'expired') {
        lifespanHtml = `
      <div class="bb-modal__data-row">
        <span class="bb-modal__data-label">Lifespan</span>
        <span class="bb-modal__data-value bb-modal__data-value--danger">Expired</span>
      </div>
      <div class="bb-modal__data-row">
        <span class="bb-modal__data-label">Lived For</span>
        <span class="bb-modal__data-value">${fmtBlocks(block.lifespan)} blocks (${fmtBlockTime(block.lifespan)})</span>
      </div>`;
    }

    const rawSignature = firstPresent(
        item.signature,
        item.signatureText,
        item.sig,
        item.palette?.signature,
    );
    const signatureText = rawSignature ? String(rawSignature) : '';
    const signatureDisplay = signatureText;

    const paletteHtml = (item.palette && paletteColors.length > 0) ? `
    <div class="bb-modal__palette">
      <span class="bb-modal__palette-name">${escapeHtml(item.palette.id || 'Unknown')}</span>
      <div class="bb-modal__palette-swatches">
        ${paletteColors.map(c => `<span class="bb-modal__palette-dot" style="background: ${c}"></span>`).join('')}
      </div>
    </div>` : '';
    const signatureHtml = signatureDisplay
        ? `
    <div class="bb-modal__signature">
      <span class="bb-modal__signature-inline">${escapeHtml(signatureDisplay)}</span>
    </div>`
        : '';

    const truncAddr = item.address
        ? `${item.address.slice(0, 10)}...${item.address.slice(-8)}`
        : '—';
    const truncId = item.id
        ? `${item.id.slice(0, 12)}...${item.id.slice(-8)}`
        : '—';
    const dimensionsValue = status === 'open' ? '1800 x 3200 px' : item.dimensions;
    const mobilePreviewUrl = item.previewMobile
        || (status === 'sealed'
            ? 'https://bestbefore.space/images/SEALED_800.webp'
            : status === 'expired'
                ? 'https://bestbefore.space/images/EXPIRED_800.webp'
                : item.number
                    ? `https://bestbefore.space/images/BESTBEFORE_${item.number}_800.webp`
                    : item.preview
                        || contentUrl);
    const fallbackPreviewUrl = item.preview || contentUrl;
    const artworkMediaHtml = isMobile
        ? `<img class="bb-modal__image" src="${escapeHtml(mobilePreviewUrl)}" alt="${escapeHtml(item.name)}" loading="eager" decoding="async" onerror="if(this.dataset.fallback!=='1'){this.dataset.fallback='1';this.src='${escapeHtml(fallbackPreviewUrl)}';}" />`
        : `<iframe class="bb-modal__iframe" src="${contentUrl}" title="${escapeHtml(item.name)} — Live from chain" sandbox="allow-scripts allow-same-origin" loading="eager"></iframe>`;
    const satValue = firstPresent(
        item.sat_name,
        item.sat,
        item.satNumber,
        item.satoshi,
        item.satpoint,
    );
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
    const activationTimestampDisplay = fmtTimestamp(activationTimestampValue);
    const satRowHtml = satValue
        ? `
          <div class="bb-modal__data-row">
            <span class="bb-modal__data-label">Sat</span>
            <span class="bb-modal__data-value">${escapeHtml(String(satValue))}</span>
          </div>`
        : '';
    const activationTimestampRowHtml = activationTimestampValue
        ? `
          <div class="bb-modal__data-row">
            <span class="bb-modal__data-label">Activation Timestamp</span>
            <span class="bb-modal__data-value">${escapeHtml(String(activationTimestampDisplay))}</span>
          </div>`
        : '';

    const metadataRowsHtml = `
          <div class="bb-modal__data-row">
            <span class="bb-modal__data-label">Inscription ID</span>
            <span class="bb-modal__data-value">${escapeHtml(truncId)}</span>
          </div>
          <div class="bb-modal__data-row">
            <span class="bb-modal__data-label">Dimensions</span>
            <span class="bb-modal__data-value">${fmtValue(dimensionsValue)}</span>
          </div>
          <div class="bb-modal__data-row">
            <span class="bb-modal__data-label">Inscription Block</span>
            <span class="bb-modal__data-value">${fmtBlocks(block.inscription)}</span>
          </div>
          <div class="bb-modal__data-row">
            <span class="bb-modal__data-label">Activation Block</span>
            <span class="bb-modal__data-value">${fmtBlocks(block.activation)}</span>
          </div>
          <div class="bb-modal__data-row">
            <span class="bb-modal__data-label">Expiry Block</span>
            <span class="bb-modal__data-value">${fmtBlocks(block.expiry)}</span>
          </div>
          <div class="bb-modal__data-row">
            <span class="bb-modal__data-label">Current Block Height</span>
            <span class="bb-modal__data-value">${fmtBlocks(block.tip)}</span>
          </div>
          ${satRowHtml}
          ${activationTimestampRowHtml}`;

    const overlay = document.createElement('div');
    overlay.className = 'bb-modal-overlay';
    overlay.innerHTML = `
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

    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
        overlay.classList.add('is-active');
    });

    document.body.style.overflow = 'hidden';

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
