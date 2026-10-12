/* ═══ Artwork Modal — Live from Chain ═══ */

import { statusLabel, numberFormat, escapeHtml } from './state.js';
import { createBestBeforePlayer } from './best-before-player.js';
import { imageMarkup, phase, statusChip, timeLeft } from './collection.js';

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

const buildModalArtworkMediaHtml = (item) => `<iframe class="bb-modal__iframe" title="${escapeHtml(item.name)} — Live from chain" sandbox="allow-scripts allow-downloads"></iframe>`;

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

const countdownMarkup = item => {
    const b=item.block||{}, p=phase(item);
    const value=p==='immortal'?'∞':p==='sealed'?'Not yet':p==='expired'?'0':numberFormat.format(b.remaining??0);
    const progress=b.lifespan?Math.max(0,Math.min(100,100*(b.remaining||0)/b.lifespan)):p==='immortal'?100:0;
    return `<span class="countdown-label">${p==='sealed'?'Waiting to begin':p==='immortal'?'Beyond time':p==='expired'?'The countdown is over':'Expires in'}</span><div class="countdown-number">${value} <small>${['open','expired'].includes(p)?'blocks':''}</small></div><div class="countdown-track"><i style="width:${progress}%"></i></div><span class="countdown-note">${timeLeft(item)}${p==='open'?` · ${(100-progress).toFixed(1)}% of life used`:''}</span>`;
};
export const updateArtworkModal = items => {
    const overlay=document.querySelector('.bb-modal-overlay');if(!overlay)return;
    const item=items.find(i=>i.number===Number(overlay.dataset.number));if(!item)return;
    overlay.querySelector('.countdown').innerHTML=countdownMarkup(item);
    overlay.querySelector('.modal-status').innerHTML=statusChip(item);
};
export const closeArtworkModal = () => {
    const overlay=document.querySelector('.bb-modal-overlay');if(!overlay)return;
    overlay._artworkFrame?.destroy();overlay._cleanup?.();overlay.remove();
    document.body.style.overflow='';document.querySelector('#app').inert=false;
    overlay._returnFocus?.focus({preventScroll:true});
    window.dispatchEvent(new CustomEvent('bb:modal-close'));
    _restartMotionTimers?.();
};
export const openArtworkModal = item => {
    const existing=document.querySelector('.bb-modal-overlay');
    if(existing?.dataset.number===String(item.number))return;
    const returnFocus=existing?existing._returnFocus:document.activeElement;
    existing?._artworkFrame?.destroy();existing?._cleanup?.();existing?.remove();
    _stopMotionTimers?.();
    const overlay=document.createElement('div');overlay.className='bb-modal-overlay';overlay.dataset.number=item.number;overlay._returnFocus=returnFocus;
    const b=item.block||{};
    const colors=(item.palette?.colors||[]).filter(c=>/^#[0-9a-f]{3,8}$/i.test(c));
    overlay.innerHTML=`<div class="bb-modal" id="bbArtworkModal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <button class="bb-modal__close" aria-label="Close artwork">×</button>
      <div class="bb-modal__stage"><span class="modal-edition">BEST BEFORE / ${String(item.number).padStart(3,'0')}</span>
        <button class="modal-prev" type="button" aria-label="Previous artwork"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="m15 6-6 6 6 6"/></svg></button>
        <div class="bb-modal__artwork">${imageMarkup(item,'(max-width: 700px) 85vw, 40vw',true)}<iframe class="bb-modal__iframe" title="${escapeHtml(item.name)} — Live artwork" sandbox="allow-scripts allow-downloads"></iframe></div>
        <button class="modal-next" type="button" aria-label="Next artwork"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="m9 6 6 6-6 6"/></svg></button>
        <span class="modal-media-note">GENERATIVE HTML · 1800 × 3200 · BITCOIN</span>
      </div>
      <aside class="bb-modal__details">
        <div class="modal-status">${statusChip(item)}</div>
        <h2 id="modal-title">BEST BEFORE Nº${item.number}</h2>
        <p class="modal-credit">${escapeHtml(item.palette?.id||'Unrevealed')} · Lemonhaze × Ordinally</p>
        <div class="modal-swatches" aria-label="Artwork palette">${colors.map(c=>`<span style="background:${c}" title="${c}"></span>`).join('')}</div>
        <div class="countdown" aria-live="polite">${countdownMarkup(item)}</div>
        <dl class="modal-metadata"><div><dt>OPENED</dt><dd>${b.activation?`Block ${numberFormat.format(b.activation)}`:'Awaiting activation'}</dd></div><div><dt>EXPIRES</dt><dd>${b.immortal?'Never':b.expiry?`Block ${numberFormat.format(b.expiry)}`:'Unrevealed'}</dd></div><div><dt>FORMAT</dt><dd>HTML · 1800 × 3200</dd></div><div><dt>INSCRIPTION</dt><dd><a href="${item.ordinalsUrl}" target="_blank" rel="noreferrer">ordinals.com ↗</a></dd></div></dl>
        <div class="modal-actions"><div class="bb-modal__capture"></div><div class="modal-secondary"><button data-solo aria-pressed="false">Solo view</button><a href="https://ord.net/collection/best-before-by-lemonhaze-x-ordinally" target="_blank" rel="noreferrer">Ord.net ↗</a></div><p class="modal-shortcuts">← → browse · S save · Esc close</p></div>
      </aside>
    </div>`;
    document.body.append(overlay);document.body.style.overflow='hidden';document.querySelector('#app').inert=true;
    const step=direction=>window.dispatchEvent(new CustomEvent('bb:modal-step',{detail:{direction}}));
    overlay.querySelector('.bb-modal__close').onclick=closeArtworkModal;
    overlay.querySelector('.modal-prev').onclick=()=>step(-1);overlay.querySelector('.modal-next').onclick=()=>step(1);
    overlay.addEventListener('click',e=>{if(e.target===overlay)closeArtworkModal();});
    overlay.querySelector('[data-solo]').onclick=e=>{const solo=overlay.querySelector('.bb-modal').classList.toggle('is-solo');e.target.setAttribute('aria-pressed',String(solo));e.target.textContent=solo?'Show details':'Solo view';};
    const key=e=>{
      if(e.key==='Escape')closeArtworkModal();
      if(!/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)){
        if(e.key==='ArrowLeft'){e.preventDefault();step(-1);}if(e.key==='ArrowRight'){e.preventDefault();step(1);}
      }
      if(e.key==='Tab'){
        const focusable=[...overlay.querySelectorAll('button:not(:disabled),a,select:not(:disabled)')].filter(el=>el.getClientRects().length);
        const first=focusable[0],last=focusable.at(-1);
        if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
        else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
      }
    };
    document.addEventListener('keydown',key);overlay._cleanup=()=>document.removeEventListener('keydown',key);
    let touch;
    const stage=overlay.querySelector('.bb-modal__stage');
    stage.addEventListener('touchstart',e=>{if(e.touches.length===1)touch={x:e.touches[0].clientX,y:e.touches[0].clientY};},{passive:true});
    stage.addEventListener('touchend',e=>{if(!touch)return;const dx=e.changedTouches[0].clientX-touch.x,dy=e.changedTouches[0].clientY-touch.y;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.5)step(dx<0?1:-1);touch=null;},{passive:true});
    overlay._artworkFrame=createBestBeforePlayer({frame:overlay.querySelector('iframe'),viewport:overlay.querySelector('.bb-modal__artwork'),controls:overlay.querySelector('.bb-modal__capture'),id:item.id,onClose:closeArtworkModal});
    overlay.querySelector('.bb-modal__close').focus({preventScroll:true});
};
