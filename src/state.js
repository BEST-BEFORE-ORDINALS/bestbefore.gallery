/* ═══ Shared state, constants, and utility functions ═══ */

export const numberFormat = new Intl.NumberFormat('en-US');
export const utcDateTime = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
});

export const statusLabel = {
    open: 'OPEN',
    active: 'ACTIVE',
    sealed: 'SEALED',
    expired: 'EXPIRED',
};

export const statusClass = {
    open: 'is-open',
    active: 'is-open',
    sealed: 'is-sealed',
    expired: 'is-expired',
};

export const INTRO_AUTO_DELAY_MS = 3200;
export const INTRO_EXIT_DURATION_MS = 1800;
export const HEARTBEAT_ZOOM_DEFAULT = 1;

export const state = {
    activeView: 'gallery',
    galleryMode: 'carousel',
    summary: null,
    liveSummary: null,
    liveItems: null,
    analytics: null,
    liveGeneratedAt: null,
    items: [],
    aboutFaq: '',
    storyAssets: {},
    carousel: {
        items: [],
        index: 0,
        autoplay: false,
        dragOffset: 0,
        pendingDragOffset: 0,
        dragStartX: 0,
        dragging: false,
        hovering: false,
        timer: null,
        dragRaf: null,
        loadedIndexes: new Set(),
        fullyLoaded: new Set(),
        hdLoadedIndexes: new Set(),
        hdLoadingIndexes: new Set(),
        immersive: false,
    },
    heartbeat: {
        items: [],
        index: 0,
        hovering: false,
        timer: null,
        dragging: false,
        dragStartX: 0,
        dragStartScrollLeft: 0,
        settleTimer: null,
        initialized: false,
    },
    vault: {
        activeTab: 'artists', // artists, analytics, diary
    },
};

export const ARTIST_BIO_LEMONHAZE = `
Lemonhaze is the artistic practice of Frédérick Nathaniel St-Louis (b. 1990), a Montréal-born, self-taught artist working between Montréal and Puerto Escondido.

The work moves through images, textures, and writing. Black, ink-like marks recur across shifting grounds. Place, identity, and time keep returning: a city remembered, a figure changing, a work that ages on block time. Since 2023, Bitcoin has been the primary medium.

He came to this from music and writing, outside art school. Code, drawing, and generative systems became the tools; the Paint Engines extend the same practice.

The work is held by more than 100 collectors and has been shown internationally, including in Sotheby’s Contemporary Discoveries, New York (2025).
`;

export const ARTIST_BIO_ORDINALLY = `
ORDINALLY's first scribbles were on IBM 5081 punch cards his dad brought home from work.

That grid sparked a lifelong love of code and a sense that math is not only rigorous but also beautiful, with patterns, recursion, and constraints forming a kind of language.

After years in technology, Ordinals gave him the perfect way back to making by combining generative code, latent space tools, and diffusion workflows with Bitcoin's permanence.

ORDINALLY now balances his own creative work with the behind-the-scenes engineering that helps other artists bring their pieces on chain.
`;

/* ── Utility Functions ── */

export const escapeHtml = (value) =>
    String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');

export const parseDate = (iso) => {
    if (!iso) {
        return 'Unknown date';
    }

    const parsed = new Date(iso);
    return Number.isNaN(parsed.getTime()) ? 'Unknown date' : utcDateTime.format(parsed);
};

export const getNumberLabel = (number) => (number === null ? 'Unknown' : `Nº${number}`);

export const getRelativeDiff = (index, activeIndex, total) => {
    let diff = index - activeIndex;

    if (diff > total / 2) {
        diff -= total;
    }

    if (diff < -total / 2) {
        diff += total;
    }

    return diff;
};

export const statusCount = (items, status) => items.filter((item) => item.status === status).length;

export const formatBlockTime = (blocks) => {
    if (!blocks || blocks < 0) return '0m';
    const minutes = blocks * 10;
    const days = Math.floor(minutes / (60 * 24));
    const years = (days / 365.25).toFixed(1);

    if (days > 730) return `~${years} YEARS`;
    if (days > 0) return `~${days} DAYS`;
    const hours = Math.floor(minutes / 60);
    if (hours > 0) return `~${hours} HOURS`;
    return `~${minutes} MINS`;
};

export const linkify = (value) => {
    const escaped = escapeHtml(value);
    return escaped.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noreferrer">$1</a>');
};

export const formatInlineMarkup = (value) =>
    linkify(value)
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br />');

/* ── Data loaders ── */

export const loadJson = async (url) => {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed loading ${url}`);
    }

    return response.json();
};

export const loadText = async (url) => {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed loading ${url}`);
    }

    return response.text();
};

export const renderLoadError = (message) => {
    const menuStats = document.querySelector('#bbMenuStats');
    if (!menuStats) {
        return;
    }
    menuStats.innerHTML = `<span>${escapeHtml(message)}</span>`;
};
