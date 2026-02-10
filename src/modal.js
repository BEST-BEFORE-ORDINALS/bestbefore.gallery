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

    const fmtBlocks = (val) => typeof val === 'number' ? numberFormat.format(val) : '—';
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
    if (block.immortal) {
        lifespanPct = 100;
        lifespanClass = 'is-immortal';
    } else if (block.lifespan && block.remaining != null) {
        lifespanPct = Math.max(0, Math.min(100, (block.remaining / block.lifespan) * 100));
        if (lifespanPct < 15) lifespanClass = 'is-low';
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
        } else {
            lifespanHtml = `
        <div class="bb-modal__data-row">
          <span class="bb-modal__data-label">Remaining</span>
          <span class="bb-modal__data-value ${lifespanPct < 15 ? 'bb-modal__data-value--danger' : 'bb-modal__data-value--accent'}">${fmtBlocks(block.remaining)} blocks</span>
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

    const paletteHtml = (item.palette && paletteColors.length > 0) ? `
    <div class="bb-modal__palette">
      <span class="bb-modal__palette-name">${escapeHtml(item.palette.id || 'Unknown')}</span>
      <div class="bb-modal__palette-swatches">
        ${paletteColors.map(c => `<span class="bb-modal__palette-dot" style="background: ${c}"></span>`).join('')}
      </div>
    </div>` : '';

    const truncAddr = item.address
        ? `${item.address.slice(0, 10)}...${item.address.slice(-8)}`
        : '—';

    const overlay = document.createElement('div');
    overlay.className = 'bb-modal-overlay';
    overlay.innerHTML = `
    <div class="bb-modal is-solo" id="bbArtworkModal">
      <div class="bb-modal__toggle">
        <button class="bb-modal__toggle-btn is-active" data-modal-view="solo" type="button">Solo</button>
        <button class="bb-modal__toggle-btn" data-modal-view="details" type="button">Details</button>
      </div>
      <button class="bb-modal__close" type="button" aria-label="Close modal">&times;</button>

      <div class="bb-modal__artwork">
        <iframe class="bb-modal__iframe" src="${contentUrl}" title="${escapeHtml(item.name)} — Live from chain" sandbox="allow-scripts allow-same-origin" loading="eager"></iframe>
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

        <hr class="bb-modal__detail-divider" />

        <div class="bb-modal__data-grid">
          ${lifespanHtml}
        </div>

        <hr class="bb-modal__detail-divider" />

        <div class="bb-modal__data-grid">
          <div class="bb-modal__data-row">
            <span class="bb-modal__data-label">Inscription</span>
            <span class="bb-modal__data-value">${fmtBlocks(block.inscription)}</span>
          </div>
          ${block.activation ? `
          <div class="bb-modal__data-row">
            <span class="bb-modal__data-label">Activation</span>
            <span class="bb-modal__data-value">${fmtBlocks(block.activation)}</span>
          </div>` : ''}
          ${block.expiry ? `
          <div class="bb-modal__data-row">
            <span class="bb-modal__data-label">Expiry Block</span>
            <span class="bb-modal__data-value">${fmtBlocks(block.expiry)}</span>
          </div>` : ''}
          <div class="bb-modal__data-row">
            <span class="bb-modal__data-label">Current Tip</span>
            <span class="bb-modal__data-value">${fmtBlocks(block.tip)}</span>
          </div>
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
