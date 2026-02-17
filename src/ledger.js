/* ═══ Ledger — Analytics Module ═══ */

import { escapeHtml } from './state.js';

const MINUTES_PER_BLOCK = 10;

const toFiniteNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const normalizeStatus = (value) => String(value || '').trim().toLowerCase();

const formatNum = (value, fallback = '—') => {
  const num = toFiniteNumber(value);
  return num === null ? fallback : num.toLocaleString('en-US');
};

const formatDuration = (blocks) => {
  const totalBlocks = toFiniteNumber(blocks);
  if (totalBlocks === null || totalBlocks < 0) return '—';

  const minutes = totalBlocks * MINUTES_PER_BLOCK;
  const days = Math.floor(minutes / (60 * 24));
  const years = days / 365.25;

  if (days >= 365) return `${years.toFixed(1)} yrs`;
  if (days > 0) return `${days} days`;

  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours} hrs`;

  return `${Math.floor(minutes)} mins`;
};

const formatDurationWithBlocks = (blocks) => {
  const totalBlocks = toFiniteNumber(blocks);
  if (totalBlocks === null || totalBlocks < 0) return '—';
  return `${formatNum(totalBlocks, '0')} blocks (${formatDuration(totalBlocks)})`;
};

const renderStackedDurationMetric = (blocks) => {
  const totalBlocks = toFiniteNumber(blocks);
  if (totalBlocks === null || totalBlocks < 0) {
    return '<span class="bb-ledger-stacked-metric__main">—</span>';
  }

  const human = formatDuration(totalBlocks);
  return `
    <span class="bb-ledger-stacked-metric">
      <span class="bb-ledger-stacked-metric__main">${escapeHtml(human)}</span>
      <span class="bb-ledger-stacked-metric__sub">(${formatNum(totalBlocks, '0')} blocks)</span>
    </span>
  `;
};

const renderBlockMetric = (block) => {
  const value = toFiniteNumber(block);
  if (value === null || value < 0) {
    return '<span class="bb-ledger-hall-value-main">—</span>';
  }

  return `
    <span class="bb-ledger-hall-value-main">${formatNum(value, '0')}</span>
    <span class="bb-ledger-hall-value-sub">block height</span>
  `;
};

const formatUtcTime = (isoValue) => {
  if (!isoValue) return '—';
  const parsed = new Date(isoValue);
  if (Number.isNaN(parsed.getTime())) return '—';

  const date = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    timeZone: 'UTC',
  }).format(parsed);

  const time = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  }).format(parsed);

  return `${date} ${time} UTC`;
};

const sanitizeColor = (value) => {
  const color = String(value || '').trim();
  return /^#[0-9a-fA-F]{3,8}$/.test(color) ? color : '#808080';
};

const getPaletteName = (value) => {
  if (value && typeof value === 'object') {
    return String(value.id || value.name || '').trim();
  }
  return String(value || '').trim();
};

const getPaletteColors = (item) => {
  if (Array.isArray(item?.palette_colors) && item.palette_colors.length > 0) {
    return item.palette_colors;
  }
  if (Array.isArray(item?.palette?.colors) && item.palette.colors.length > 0) {
    return item.palette.colors;
  }
  return [];
};

const renderSwatch = (colors) => {
  if (!Array.isArray(colors) || colors.length === 0) return '';

  const blocks = colors.map((rawColor) => {
    const color = sanitizeColor(rawColor);
    return `<span class="bb-ledger-swatch-block" style="background-color:${color}" title="${escapeHtml(color)}"></span>`;
  }).join('');

  return `<div class="bb-ledger-swatch-container">${blocks}</div>`;
};

const renderItemLink = (number, label = null) => {
  const safeNumber = toFiniteNumber(number);
  if (safeNumber === null) return '—';

  const text = label || `Nº${safeNumber}`;
  return `<a href="/?item=${safeNumber}" data-bb-number="${safeNumber}" class="bb-ledger-link">${escapeHtml(text)}</a>`;
};

const formatAddress = (addr) => {
  const value = String(addr || '').trim();
  if (!value) return '—';
  if (value.length <= 12) return value;
  return `${value.slice(0, 6)}...${value.slice(-6)}`;
};

const renderWalletLink = (address) => {
  const safeAddress = String(address || '').trim();
  if (!safeAddress) return '—';

  return `<a class="bb-ledger-link" href="https://magiceden.io/u/${encodeURIComponent(safeAddress)}" target="_blank" rel="noreferrer">${escapeHtml(formatAddress(safeAddress))}</a>`;
};

const renderBlockLink = (blockHeight) => {
  const safeBlock = toFiniteNumber(blockHeight);
  if (safeBlock === null) return '—';

  return `<a class="bb-ledger-link" href="https://ordinals.com/block/${safeBlock}" target="_blank" rel="noreferrer">${formatNum(safeBlock, '—')}</a>`;
};

const renderKeyLink = (keyId) => {
  const safeKey = String(keyId || '').trim();
  if (!safeKey) return '—';

  const short = `${safeKey.slice(0, 6)}...${safeKey.slice(-6)}`;
  return `<a class="bb-ledger-link" href="https://ordinals.com/inscription/${encodeURIComponent(safeKey)}" target="_blank" rel="noreferrer">${escapeHtml(short)}</a>`;
};

const resolveSupply = (analytics) => {
  const supply = analytics?.supply;
  if (supply && typeof supply === 'object') {
    return {
      total: supply.total,
      sealed: supply.sealed,
      open: supply.open,
      expired: supply.expired,
      immortal: supply.immortal,
    };
  }

  const counts = analytics?.counts;
  if (counts && typeof counts === 'object') {
    return {
      total: counts.total,
      sealed: counts.sealed,
      open: counts.open,
      expired: counts.expired,
      immortal: counts.immortal_activated ?? counts.immortal,
    };
  }

  return null;
};

const renderSupply = (analytics) => {
  const supply = resolveSupply(analytics);
  if (!supply) return '';

  return `
    <div class="bb-ledger-grid">
      <div class="bb-ledger-card bb-ledger-card--hero">
        <h3 class="bb-ledger-kpi-label">Total</h3>
        <div class="bb-ledger-kpi-value">${formatNum(supply.total, '0')}</div>
        <div class="bb-ledger-kpi-sub">Fixed Supply</div>
      </div>

      <div class="bb-ledger-card">
        <h3 class="bb-ledger-kpi-label">OPEN</h3>
        <div class="bb-ledger-kpi-value">${formatNum(supply.open, '0')}</div>
      </div>

      <div class="bb-ledger-card">
        <h3 class="bb-ledger-kpi-label">SEALED</h3>
        <div class="bb-ledger-kpi-value">${formatNum(supply.sealed, '0')}</div>
      </div>

      <div class="bb-ledger-card">
        <h3 class="bb-ledger-kpi-label">EXPIRED</h3>
        <div class="bb-ledger-kpi-value">${formatNum(supply.expired, '0')}</div>
      </div>

      <div class="bb-ledger-card bb-ledger-card--accent">
        <h3 class="bb-ledger-kpi-label">Immortal (activated)</h3>
        <div class="bb-ledger-kpi-value">${formatNum(supply.immortal, '0')}</div>
      </div>
    </div>
  `;
};

const renderLifetime = (lifetime) => {
  if (!lifetime || !Array.isArray(lifetime.distribution)) return '';

  const rows = lifetime.distribution.map((bucket) => {
    const share = toFiniteNumber(bucket.share);
    const expected = toFiniteNumber(bucket.expected);
    return `
      <tr class="bb-ledger-row">
        <td class="bb-ledger-cell-label">${escapeHtml(bucket.label || '—')}</td>
        <td class="bb-ledger-cell-value">${formatNum(bucket.observed, '0')}</td>
        <td class="bb-ledger-cell-value bb-desktop-only">${expected === null ? '—' : expected.toFixed(2)}</td>
        <td class="bb-ledger-cell-value">${share === null ? '—' : `${(share * 100).toFixed(2)}%`}</td>
      </tr>
    `;
  }).join('');

  const summaryCards = [
    { label: 'Shortest Mortal', value: formatDurationWithBlocks(lifetime.shortest_blocks) },
    { label: 'Average Mortal', value: formatDurationWithBlocks(lifetime.average_blocks) },
    { label: 'Longest Mortal', value: formatDurationWithBlocks(lifetime.longest_blocks) },
  ].map(({ label, value }) => `
    <div class="bb-ledger-inline-stat">
      <span class="bb-ledger-inline-stat__label">${escapeHtml(label)}</span>
      <span class="bb-ledger-inline-stat__value">${escapeHtml(value)}</span>
    </div>
  `).join('');

  return `
    <div class="bb-ledger-section">
      <details class="bb-ledger-collapsible--mobile">
        <summary class="bb-ledger-collapsible__summary">Mortal Lifespan Profile</summary>
        <div class="bb-ledger-collapsible__body">
          <h3 class="bb-ledger-section-title">Mortal Lifespan Profile</h3>
          <div class="bb-ledger-inline-stats">
            ${summaryCards}
          </div>
          <div class="bb-ledger-table-container">
            <table class="bb-ledger-table">
              <thead>
                <tr>
                  <th>Range</th>
                  <th>Count</th>
                  <th class="bb-desktop-only">Model</th>
                  <th>Share</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
              </tbody>
            </table>
          </div>
        </div>
      </details>
    </div>
  `;
};

const renderPaletteDiscoveryBody = (discovered, aliveCount, extinctCount, undiscovered, discoveredRows, undiscoveredPanel) => {
  return `
    <h3 class="bb-ledger-section-title">Palette Discovery</h3>
    <div class="bb-ledger-inline-stats">
      <div class="bb-ledger-inline-stat"><span class="bb-ledger-inline-stat__label">Discovered</span><span class="bb-ledger-inline-stat__value">${formatNum(discovered.length, '0')}</span></div>
      <div class="bb-ledger-inline-stat"><span class="bb-ledger-inline-stat__label">Alive</span><span class="bb-ledger-inline-stat__value">${formatNum(aliveCount, '0')}</span></div>
      <div class="bb-ledger-inline-stat"><span class="bb-ledger-inline-stat__label">Extinct</span><span class="bb-ledger-inline-stat__value">${formatNum(extinctCount, '0')}</span></div>
      <div class="bb-ledger-inline-stat"><span class="bb-ledger-inline-stat__label">Undiscovered</span><span class="bb-ledger-inline-stat__value">${formatNum(undiscovered.length, '0')}</span></div>
    </div>
    <div class="bb-ledger-table-container">
      <table class="bb-ledger-table">
        <thead>
          <tr>
            <th>Palette</th>
            <th>Total</th>
            <th>Active</th>
            <th class="bb-desktop-only">Median Life</th>
          </tr>
        </thead>
        <tbody>
          ${discoveredRows}
        </tbody>
      </table>
    </div>
    ${undiscoveredPanel}
  `;
};

const renderPalettes = (palettes) => {
  if (!palettes || !Array.isArray(palettes.discovered)) return '';

  const discovered = palettes.discovered;
  const undiscovered = Array.isArray(palettes.undiscovered) ? palettes.undiscovered : [];

  const aliveCount = discovered.filter((palette) => toFiniteNumber(palette.alive) > 0).length;
  const extinctCount = discovered.filter((palette) => Boolean(palette.extinct)).length;

  const discoveredRows = discovered.map((palette) => `
    <tr>
      <td class="bb-ledger-cell-swatch">
        <div class="bb-ledger-palette-flex">
          ${renderSwatch(palette.colors)}
          <span class="bb-ledger-palette-stack">
            <span class="bb-ledger-palette-name">${escapeHtml(palette.name || 'Unknown')}</span>
            ${renderPaletteBadges(palette)}
          </span>
        </div>
      </td>
      <td class="bb-ledger-cell-value">${formatNum(palette.total, '0')}</td>
      <td class="bb-ledger-cell-value">${formatNum(palette.alive, '0')}</td>
      <td class="bb-ledger-cell-value bb-desktop-only">${formatDuration(palette.median_lifespan_blocks)}</td>
    </tr>
  `).join('');

  const undiscoveredCards = undiscovered.map((palette) => `
    <article class="bb-ledger-undiscovered-item">
      <div class="bb-ledger-palette-flex">
        ${renderSwatch(palette.colors)}
        <span class="bb-ledger-palette-name">${escapeHtml(palette.name || 'Unknown')}</span>
      </div>
    </article>
  `).join('');

  const undiscoveredPanel = undiscovered.length > 0
    ? `
      <div class="bb-ledger-undiscovered-panel">
        <div class="bb-ledger-undiscovered-head">
          <h4>Undiscovered Palettes</h4>
          <span class="bb-ledger-undiscovered-count">${formatNum(undiscovered.length, '0')}</span>
        </div>
        <div class="bb-ledger-undiscovered-grid">
          ${undiscoveredCards}
        </div>
      </div>
    `
    : '';

  return `
    <div class="bb-ledger-section">
      <details class="bb-ledger-collapsible--mobile">
        <summary class="bb-ledger-collapsible__summary">Palette Discovery</summary>
        <div class="bb-ledger-collapsible__body">
          ${renderPaletteDiscoveryBody(discovered, aliveCount, extinctCount, undiscovered, discoveredRows, undiscoveredPanel)}
        </div>
      </details>
    </div>
  `;
};

const deriveTopSealedCollectors = (items, limit = 5) => {
  if (!Array.isArray(items) || items.length === 0) return [];

  const counts = new Map();
  items.forEach((item) => {
    const address = String(item?.address || '').trim();
    if (!address) return;
    if (normalizeStatus(item?.status) !== 'sealed') return;
    counts.set(address, (counts.get(address) || 0) + 1);
  });

  return [...counts.entries()]
    .map(([address, count]) => ({ address, count }))
    .sort((a, b) => (b.count - a.count) || a.address.localeCompare(b.address))
    .slice(0, limit);
};

const renderWalletLeaderboards = (stats, allItems) => {
  if (!stats) return '';

  const renderSimpleWalletTable = (title, rows, valueCell) => {
    if (!Array.isArray(rows) || rows.length === 0) return '';

    return `
      <div class="bb-ledger-mini-board">
        <h4 class="bb-ledger-mini-title">${escapeHtml(title)}</h4>
        <table class="bb-ledger-table bb-ledger-table--mini">
          <thead>
            <tr>
              <th>Wallet</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((row) => `
              <tr>
                <td class="bb-ledger-address" title="${escapeHtml(row.address || '')}">${renderWalletLink(row.address)}</td>
                <td class="bb-ledger-cell-value">${valueCell(row)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  };

  const cards = [
    renderSimpleWalletTable('Largest Collection', stats.largest_collection, (row) => formatNum(row.count, '0')),
    renderSimpleWalletTable('Most Open', stats.most_open, (row) => formatNum(row.count, '0')),
    renderSimpleWalletTable('Most Sealed', deriveTopSealedCollectors(allItems), (row) => formatNum(row.count, '0')),
    renderSimpleWalletTable('Greatest Cumulative Lifespan', stats.greatest_lifespan, (row) => renderStackedDurationMetric(row.total_blocks)),
    renderSimpleWalletTable('Most Palettes', stats.most_palettes, (row) => formatNum(row.count, '0')),
  ];

  if (Array.isArray(stats.immortal_holders) && stats.immortal_holders.length > 0) {
    cards.push(`
      <div class="bb-ledger-mini-board">
        <h4 class="bb-ledger-mini-title">Immortal Holders</h4>
        <table class="bb-ledger-table bb-ledger-table--mini">
          <thead>
            <tr>
              <th>Wallet</th>
              <th>Count</th>
              <th>Pieces</th>
            </tr>
          </thead>
          <tbody>
            ${stats.immortal_holders.map((row) => `
              <tr>
                <td class="bb-ledger-address" title="${escapeHtml(row.address || '')}">${renderWalletLink(row.address)}</td>
                <td class="bb-ledger-cell-value">${formatNum(row.count, '0')}</td>
                <td class="bb-ledger-cell-value">${Array.isArray(row.piece_numbers) && row.piece_numbers.length > 0 ? row.piece_numbers.map((number) => renderItemLink(number)).join(', ') : '—'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `);
  }

  return `
    <div class="bb-ledger-section">
      <details class="bb-ledger-collapsible--mobile">
        <summary class="bb-ledger-collapsible__summary">Collector Showcase</summary>
        <div class="bb-ledger-collapsible__body">
          <h3 class="bb-ledger-section-title">Collector Showcase</h3>
          <div class="bb-ledger-boards-grid">
            ${cards.join('')}
          </div>
        </div>
      </details>
    </div>
  `;
};

const renderHallOfFame = (analytics) => {
  if (!analytics) return '';

  const renderList = (title, items, valueRenderer, valueLabel) => {
    if (!Array.isArray(items) || items.length === 0) return '';

    return `
      <div class="bb-ledger-mini-board bb-ledger-mini-board--hall">
        <h4 class="bb-ledger-mini-title">${escapeHtml(title)}</h4>
        <table class="bb-ledger-table bb-ledger-table--mini">
          <thead>
            <tr>
              <th>#</th>
              <th>Item</th>
              <th>Palette</th>
              <th>${escapeHtml(valueLabel)}</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((item, index) => `
              <tr>
                <td class="bb-ledger-cell-value bb-ledger-cell-rank">${index + 1}</td>
                <td class="bb-ledger-cell-value">${renderItemLink(item.number)}</td>
                <td class="bb-ledger-cell-value">${escapeHtml(item.palette || '—')}</td>
                <td class="bb-ledger-cell-value"><span class="bb-ledger-hall-value">${valueRenderer(item)}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  };

  const cards = [
    renderList('Top 5 Longest Mortal', analytics.top_longest, (item) => renderStackedDurationMetric(item.lifespan_blocks), 'Lifespan'),
    renderList('Top 5 Shortest Mortal', analytics.top_shortest, (item) => renderStackedDurationMetric(item.lifespan_blocks), 'Lifespan'),
    renderList('Next Expiry', analytics.next_expiries, (item) => renderStackedDurationMetric(item.remaining_blocks), 'Remaining'),
    renderList('Immortals', analytics.immortals, (item) => renderBlockMetric(item.activation_block), 'Born (Block)'),
  ].filter(Boolean);

  if (cards.length === 0) return '';

  return `
    <div class="bb-ledger-section">
      <details class="bb-ledger-collapsible--mobile">
        <summary class="bb-ledger-collapsible__summary">Hall of Fame</summary>
        <div class="bb-ledger-collapsible__body">
          <h3 class="bb-ledger-section-title">Hall of Fame</h3>
          <div class="bb-ledger-boards-grid bb-ledger-boards-grid--hall">
            ${cards.join('')}
          </div>
        </div>
      </details>
    </div>
  `;
};

const normalizeActivationLog = (analytics, allItems) => {
  const itemByNumber = new Map((allItems || []).map((item) => [toFiniteNumber(item.number), item]));

  if (analytics && Array.isArray(analytics.activation_log) && analytics.activation_log.length > 0) {
    return analytics.activation_log.map((entry) => {
      const number = toFiniteNumber(entry.number);
      const matched = itemByNumber.get(number) || {};
      const status = normalizeStatus(entry.status || matched.status);

      return {
        number,
        id: entry.id || matched.id || null,
        status,
        immortal: Boolean(entry.immortal ?? matched.immortal),
        palette: getPaletteName(entry.palette) || getPaletteName(matched.palette) || null,
        palette_colors: entry.palette_colors || getPaletteColors(matched),
        activation_block: entry.activation_block ?? matched.activation_block ?? null,
        lifespan_blocks: entry.lifespan_blocks ?? matched.lifespan_blocks ?? null,
        remaining_blocks: matched.remaining_blocks ?? entry.remaining_blocks ?? null,
        key_id: entry.key_id || matched.key_id || null,
        first_palette: Boolean(entry.first_palette),
      };
    }).filter((item) => item.number !== null);
  }

  return (allItems || [])
    .filter((item) => normalizeStatus(item.status) !== 'sealed')
    .map((item) => ({
      number: toFiniteNumber(item.number),
      id: item.id || null,
      status: normalizeStatus(item.status),
      immortal: Boolean(item.immortal),
      palette: getPaletteName(item.palette) || null,
      palette_colors: getPaletteColors(item),
      activation_block: item.activation_block ?? null,
      lifespan_blocks: item.lifespan_blocks ?? null,
      remaining_blocks: item.remaining_blocks ?? null,
      key_id: item.key_id || null,
      first_palette: Boolean(item.first_palette),
    }))
    .filter((item) => item.number !== null);
};

const activationSort = (a, b) => {
  const leftBlock = toFiniteNumber(a.activation_block);
  const rightBlock = toFiniteNumber(b.activation_block);

  if (leftBlock !== null && rightBlock !== null) {
    return leftBlock - rightBlock;
  }

  if (leftBlock !== null) return -1;
  if (rightBlock !== null) return 1;
  return (a.number || 0) - (b.number || 0);
};

const getLifeLabel = (entry) => {
  if (entry.immortal) return 'Immortal';

  const status = normalizeStatus(entry.status);
  if (status === 'open' && toFiniteNumber(entry.remaining_blocks) !== null) {
    return `Expires in ${formatDuration(entry.remaining_blocks)}`;
  }

  if (toFiniteNumber(entry.lifespan_blocks) !== null) {
    return `Lived ${formatDuration(entry.lifespan_blocks)}`;
  }

  return '—';
};

const getStatusTag = (status) => {
  const normalized = normalizeStatus(status);
  if (normalized === 'open') {
    return '<span class="bb-status-alive">OPEN</span>';
  }
  if (normalized === 'expired') {
    return '<span class="bb-status-dead">EXPIRED</span>';
  }
  return `<span class="bb-status-neutral">${escapeHtml((normalized || 'unknown').toUpperCase())}</span>`;
};

const renderActivationLog = (analytics, allItems) => {
  const entries = normalizeActivationLog(analytics, allItems).sort(activationSort);
  if (entries.length === 0) return '';

  const rows = entries.map((entry, index) => {
    const paletteBadges = entry.first_palette ? '<span class="bb-ledger-badge">FIRST</span>' : '';

    return `
      <tr>
        <td class="bb-ledger-cell-value">${index + 1}</td>
        <td class="bb-ledger-cell-value">${renderItemLink(entry.number)}</td>
        <td class="bb-ledger-cell-value">${getStatusTag(entry.status)}</td>
        <td class="bb-ledger-cell-swatch">
          <div class="bb-ledger-palette-flex">
            ${renderSwatch(entry.palette_colors)}
            <span class="bb-ledger-palette-stack">
              <span class="bb-ledger-palette-name">${escapeHtml(entry.palette || 'Unknown')}</span>
              ${paletteBadges}
            </span>
          </div>
        </td>
        <td class="bb-ledger-cell-value bb-desktop-only">${renderBlockLink(entry.activation_block)}</td>
        <td class="bb-ledger-cell-value">${escapeHtml(getLifeLabel(entry))}</td>
        <td class="bb-ledger-cell-value bb-desktop-only">${renderKeyLink(entry.key_id)}</td>
      </tr>
    `;
  }).join('');

  const mobileRows = entries.map((entry, index) => {
    const paletteBadges = entry.first_palette ? '<span class="bb-ledger-badge">FIRST</span>' : '';

    return `
      <article class="bb-ledger-log-mobile-item">
        <header class="bb-ledger-log-mobile-head">
          <span class="bb-ledger-log-mobile-index">#${index + 1}</span>
          <span class="bb-ledger-log-mobile-number">${renderItemLink(entry.number)}</span>
          <span class="bb-ledger-log-mobile-status">${getStatusTag(entry.status)}</span>
        </header>
        <div class="bb-ledger-log-mobile-palette">
          <div class="bb-ledger-palette-flex">
            ${renderSwatch(entry.palette_colors)}
            <span class="bb-ledger-palette-stack">
              <span class="bb-ledger-palette-name">${escapeHtml(entry.palette || 'Unknown')}</span>
              ${paletteBadges}
            </span>
          </div>
        </div>
        <div class="bb-ledger-log-mobile-life">${escapeHtml(getLifeLabel(entry))}</div>
      </article>
    `;
  }).join('');

  return `
    <div class="bb-ledger-section">
      <details class="bb-ledger-collapsible--mobile bb-ledger-collapsible--log">
        <summary class="bb-ledger-collapsible__summary">Activation Log</summary>
        <div class="bb-ledger-collapsible__body">
          <h3 class="bb-ledger-section-title">Activation Log</h3>
          <div class="bb-ledger-log-mobile">
            ${mobileRows}
          </div>
          <div class="bb-ledger-table-container bb-ledger-log-container bb-ledger-log-desktop">
            <table class="bb-ledger-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Item</th>
                  <th>Status</th>
                  <th>Palette</th>
                  <th class="bb-desktop-only">Born (Block)</th>
                  <th>Lifespan</th>
                  <th class="bb-desktop-only">Key</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
              </tbody>
            </table>
          </div>
        </div>
      </details>
    </div>
  `;
};

const renderPaletteBadges = (palette) => {
  const badges = [];

  const first = toFiniteNumber(palette.first_activation_index);
  if (first !== null && first > 0) {
    badges.push(`<span class="bb-ledger-badge">FIRST #${formatNum(first, '0')}</span>`);
  }

  if (palette.rediscovered) {
    badges.push('<span class="bb-ledger-badge bb-ledger-badge--muted">REDISCOVERED</span>');
  }

  if (palette.extinct) {
    badges.push('<span class="bb-ledger-badge bb-ledger-badge--danger">EXTINCT</span>');
  }

  return badges.length ? `<span class="bb-ledger-badges">${badges.join('')}</span>` : '';
};

export const renderLedger = (analytics, allItems, meta = {}) => {
  if (!analytics) {
    return `
      <div class="bb-vault-section bb-ledger-container">
        <header class="bb-ledger-header">
          <h2>The Ledger</h2>
          <p class="bb-ledger-subtitle">Connecting...</p>
        </header>
        <div class="bb-ledger-loading">
          <p>Reading the chain...</p>
        </div>
      </div>
    `;
  }

  const blockHeight = analytics.block_height ?? analytics.tip ?? meta.tip;
  let blockLine = '';

  if (toFiniteNumber(blockHeight) !== null) {
    blockLine = `Block Height: ${formatNum(blockHeight, '—')}`;
  }

  const generatedAt = formatUtcTime(meta.generatedAt || meta.generated_at);
  const updatedLine = generatedAt !== '—' ? `Updated: ${generatedAt}` : '';

  if (!blockLine && !updatedLine) {
    blockLine = 'On-chain records and analytics';
  }

  const subtitleMarkup = `
    <p class="bb-ledger-subtitle">
      ${blockLine ? `<span class="bb-ledger-subtitle-line">${escapeHtml(blockLine)}</span>` : ''}
      ${updatedLine ? `<span class="bb-ledger-subtitle-line">${escapeHtml(updatedLine)}</span>` : ''}
    </p>
  `;

  return `
    <div class="bb-vault-section bb-ledger-container">
      <header class="bb-ledger-header">
        <h2>The Ledger</h2>
        ${subtitleMarkup}
      </header>

      <div class="bb-ledger-content">
        ${renderSupply(analytics)}
        ${renderHallOfFame(analytics)}
        ${renderWalletLeaderboards(analytics.wallet_stats, allItems)}
        ${renderActivationLog(analytics, allItems)}
        ${renderPalettes(analytics.palettes)}
        ${renderLifetime(analytics.lifetime)}
      </div>
    </div>
  `;
};
