/* ═══ Path-based routing and deeplinks ═══ */

import { state } from './state.js';
import { openArtworkModal, closeArtworkModal } from './modal.js';

const LEDGER_SECTIONS = new Set([
  'hall-of-fame',
  'collector-showcase',
  'activation-log',
  'palette-discovery',
  'mortal-lifespan',
]);

const FAQ_SLUGS = new Set([
  'how-does-it-work',
  'whats-the-total-supply',
  'can-i-keep-it-sealed-forever',
  'what-happens-when-it-expires',
]);

let renderVaultContentFn = null;
let initialized = false;
let suppressRouteSync = 0;
let lastNonModalPath = '/gallery';

const withSuppressedSync = (fn) => {
  suppressRouteSync += 1;
  try {
    return fn();
  } finally {
    suppressRouteSync = Math.max(0, suppressRouteSync - 1);
  }
};

const normalizePath = (rawPath = '/') => {
  const safe = String(rawPath || '/').trim() || '/';
  if (safe === '/') return '/';
  return safe.replace(/\/+$/, '') || '/';
};

const isItemPath = (path) => /^\/\d+$/.test(normalizePath(path));

const pathForVaultTab = (tab) => {
  if (tab === 'artists') return '/artists';
  if (tab === 'diary') return '/diary';
  if (tab === 'analytics') return '/ledger';
  return '/vault';
};

const pushPath = (path, { replace = false } = {}) => {
  const normalized = normalizePath(path);
  const current = normalizePath(window.location.pathname);
  if (normalized === current) return;

  if (!isItemPath(normalized)) {
    lastNonModalPath = normalized;
  }

  if (replace) {
    history.replaceState(null, '', normalized);
  } else {
    history.pushState(null, '', normalized);
  }
};

const navigateToPath = (path, { replace = false, behavior = 'smooth' } = {}) => {
  const normalized = normalizePath(path);
  pushPath(normalized, { replace });
  const route = parseRoute(normalized);
  applyRoute(route, { behavior });
};

const createRoute = () => ({
  view: 'gallery',
  tab: null,
  section: null,
  part: null,
  item: null,
  modal: false,
  statement: false,
  faq: null,
  canonicalPath: '/',
});

const parseItemRoute = (first, segments, route) => {
  if (!/^\d+$/.test(first) || segments.length !== 1) {
    return false;
  }

  route.view = 'gallery';
  route.item = Number(first);
  route.modal = true;
  route.canonicalPath = `/${route.item}`;
  return true;
};

const parseAboutRoute = (route, second, third) => {
  route.view = 'about';

  if (second === 'statement') {
    route.statement = true;
    route.canonicalPath = '/about/statement';
    return route;
  }

  if (second === 'faq' && FAQ_SLUGS.has(String(third || ''))) {
    route.faq = third;
    route.canonicalPath = `/about/faq/${third}`;
    return route;
  }

  route.canonicalPath = '/about';
  return route;
};

const parseDiaryRoute = (route, second) => {
  route.view = 'vault';
  route.tab = 'diary';

  if (/^\d+$/.test(String(second || ''))) {
    const part = Number(second);
    if (part >= 1 && part <= 6) {
      route.part = part;
      route.canonicalPath = `/diary/${part}`;
      return route;
    }
  }

  route.canonicalPath = '/diary';
  return route;
};

const parseLedgerRoute = (route, second) => {
  route.view = 'vault';
  route.tab = 'analytics';

  if (LEDGER_SECTIONS.has(String(second || ''))) {
    route.section = second;
    route.canonicalPath = `/ledger/${second}`;
    return route;
  }

  route.canonicalPath = '/ledger';
  return route;
};

export const parseRoute = (rawPathname = window.location.pathname) => {
  const pathname = normalizePath(rawPathname);
  const segments = pathname === '/' ? [] : pathname.slice(1).split('/').filter(Boolean);
  const route = createRoute();

  if (segments.length === 0) {
    route.canonicalPath = '/';
    return route;
  }

  const [first, second, third] = segments;

  if (parseItemRoute(first, segments, route)) {
    return route;
  }

  switch (first) {
    case 'gallery':
      route.view = 'gallery';
      route.canonicalPath = '/gallery';
      return route;
    case 'about':
      return parseAboutRoute(route, second, third);
    case 'vault':
      route.view = 'vault';
      route.tab = 'artists';
      route.canonicalPath = '/vault';
      return route;
    case 'artists':
      route.view = 'vault';
      route.tab = 'artists';
      route.canonicalPath = '/artists';
      return route;
    case 'diary':
      return parseDiaryRoute(route, second);
    case 'ledger':
      return parseLedgerRoute(route, second);
    default:
      route.canonicalPath = '/';
      return route;
  }
};

const getZoneElement = (view) => {
  if (view === 'about') return document.querySelector('#bbZoneAbout');
  if (view === 'vault') return document.querySelector('#bbZoneVault');
  return document.querySelector('#bbZoneGallery');
};

const scrollToView = (view, behavior = 'auto') => {
  const target = getZoneElement(view);
  if (!target) return;

  const scrollContainer = document.querySelector('.bb-scroll-container');
  if (scrollContainer) {
    scrollContainer.scrollTo({ top: target.offsetTop, behavior });
    return;
  }

  target.scrollIntoView({ behavior });
};

const activateVaultTab = (tab) => {
  if (!tab) return;
  state.vault.activeTab = tab;

  const vaultZone = document.querySelector('#bbZoneVault');
  if (vaultZone) {
    vaultZone.querySelectorAll('[data-vault-tab]').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.vaultTab === tab);
    });
  }

  const content = document.querySelector('#bbVaultContent');
  if (content && renderVaultContentFn) {
    content.innerHTML = renderVaultContentFn();
  }
};

const applyAboutDeepState = (route, behavior = 'auto') => {
  const statement = document.querySelector('details[data-about-statement]');
  const faqs = Array.from(document.querySelectorAll('.bb-faq-item[data-faq-slug]'));

  if (statement) {
    statement.open = Boolean(route.statement);
  }

  faqs.forEach((faq) => {
    faq.open = route.faq ? faq.dataset.faqSlug === route.faq : false;
  });

  const target = route.faq
    ? faqs.find((faq) => faq.dataset.faqSlug === route.faq)
    : route.statement
      ? statement
      : null;

  if (target) {
    target.scrollIntoView({ behavior, block: 'start' });
  }
};

const applyDiaryPart = (part, behavior = 'auto') => {
  if (!part) return;

  const diaryWrap = document.querySelector('.bb-diary-scroll-snap');
  if (!diaryWrap) return;

  const titles = Array.from(diaryWrap.querySelectorAll('.bb-diary-card--chapter .bb-diary-chapter-title'));
  const regex = new RegExp(`^Part\\s+${part}\\b`, 'i');
  const title = titles.find((node) => regex.test((node.textContent || '').trim()));
  const card = title?.closest('.bb-diary-card');
  if (!card) return;

  diaryWrap.scrollTo({
    top: Math.max(0, card.offsetTop - 8),
    behavior,
  });
};

const applyLedgerSection = (section, behavior = 'auto') => {
  if (!section) return;

  const node = document.querySelector(`[data-ledger-section="${section}"]`);
  if (!node) return;

  const details = node.querySelector('details.bb-ledger-collapsible--mobile');
  if (details) {
    details.open = true;
  }

  node.scrollIntoView({ behavior, block: 'start' });
};

const openItemByNumber = (number, { modal = false } = {}) => {
  const desired = Number(number);
  if (!Number.isFinite(desired) || desired <= 0) {
    return false;
  }

  if (typeof window.bbOpenItem !== 'function') {
    return false;
  }

  const found = window.bbOpenItem(desired, { immersive: false, scroll: false });
  if (!found) {
    return false;
  }

  if (modal) {
    const item = state.carousel.items.find((entry) => Number(entry?.number) === desired);
    if (item) {
      openArtworkModal(item);
    }
  }

  return true;
};

const schedulePostRender = (fn) => {
  requestAnimationFrame(() => requestAnimationFrame(fn));
};

const applyRoute = (route, { behavior = 'auto' } = {}) => {
  withSuppressedSync(() => {
    if (route.view === 'vault') {
      activateVaultTab(route.tab || 'artists');
    }

    scrollToView(route.view, behavior);

    if (!(route.modal && route.item)) {
      closeArtworkModal();
    }

    if (route.view === 'gallery' && route.item) {
      const opened = openItemByNumber(route.item, { modal: route.modal });
      if (!opened) {
        pushPath('/gallery', { replace: true });
      }
    }

    if (route.view === 'about') {
      schedulePostRender(() => applyAboutDeepState(route, behavior));
    }

    if (route.view === 'vault' && route.tab === 'diary' && route.part) {
      schedulePostRender(() => applyDiaryPart(route.part, behavior));
    }

    if (route.view === 'vault' && route.tab === 'analytics' && route.section) {
      schedulePostRender(() => applyLedgerSection(route.section, behavior));
    }
  });
};

const syncFromLocation = ({ behavior = 'auto' } = {}) => {
  const route = parseRoute(window.location.pathname);
  if (route.canonicalPath !== normalizePath(window.location.pathname)) {
    pushPath(route.canonicalPath, { replace: true });
  }
  applyRoute(route, { behavior });
};

const bindInteractionRouting = () => {
  document.addEventListener('click', (event) => {
    if (suppressRouteSync > 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (!(event.target instanceof Element)) return;

    const ledgerItemLink = event.target.closest('.bb-ledger-link[data-bb-number]');
    if (ledgerItemLink) {
      navigateToPath('/gallery', { behavior: 'smooth' });
      return;
    }

    if (event.defaultPrevented) return;

    const tabButton = event.target.closest('[data-vault-tab]');
    if (tabButton) {
      const path = pathForVaultTab(tabButton.dataset.vaultTab);
      navigateToPath(path, { behavior: 'smooth' });
      return;
    }

    if (event.target.closest('#bbScrollHint')) {
      navigateToPath('/about', { behavior: 'smooth' });
      return;
    }

    if (event.target.closest('#bbVaultHint')) {
      navigateToPath('/vault', { behavior: 'smooth' });
      return;
    }

    if (event.target.closest('.bb-header__brand')) {
      navigateToPath('/gallery', { behavior: 'smooth' });
      return;
    }

  });

  const getOpenLedgerSection = () => {
    const openDetails = document.querySelector('[data-ledger-section] details.bb-ledger-collapsible--mobile[open]');
    const openSection = openDetails?.closest('[data-ledger-section]')?.getAttribute('data-ledger-section');
    return openSection && LEDGER_SECTIONS.has(openSection) ? openSection : null;
  };

  const getOpenFaqSlug = () => {
    const openFaq = document.querySelector('.bb-faq-item[data-faq-slug][open]');
    const slug = openFaq?.getAttribute('data-faq-slug');
    return slug && FAQ_SLUGS.has(slug) ? slug : null;
  };

  const handleLedgerToggle = (target) => {
    if (!target.matches('details.bb-ledger-collapsible--mobile')) {
      return false;
    }

    const section = target.closest('[data-ledger-section]')?.getAttribute('data-ledger-section');
    if (!section || !LEDGER_SECTIONS.has(section)) {
      return true;
    }

    const fallbackSection = getOpenLedgerSection();
    pushPath(target.open ? `/ledger/${section}` : (fallbackSection ? `/ledger/${fallbackSection}` : '/ledger'));
    return true;
  };

  const handleStatementToggle = (target) => {
    if (!target.matches('details[data-about-statement]')) {
      return false;
    }

    const fallbackSlug = getOpenFaqSlug();
    pushPath(target.open ? '/about/statement' : (fallbackSlug ? `/about/faq/${fallbackSlug}` : '/about'));
    return true;
  };

  const closeOtherFaqs = (target) => {
    document.querySelectorAll('.bb-faq-item[data-faq-slug]').forEach((faq) => {
      if (faq !== target) {
        faq.open = false;
      }
    });

    const statement = document.querySelector('details[data-about-statement]');
    if (statement) {
      statement.open = false;
    }
  };

  const handleFaqToggle = (target) => {
    if (!target.matches('.bb-faq-item[data-faq-slug]')) {
      return false;
    }

    const slug = target.getAttribute('data-faq-slug');
    if (!slug || !FAQ_SLUGS.has(slug)) {
      return true;
    }

    if (target.open) {
      withSuppressedSync(() => {
        closeOtherFaqs(target);
      });
      pushPath(`/about/faq/${slug}`);
      return true;
    }

    const openSlug = getOpenFaqSlug();
    pushPath(openSlug ? `/about/faq/${openSlug}` : '/about');
    return true;
  };

  document.addEventListener('toggle', (event) => {
    if (suppressRouteSync > 0) return;

    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (handleLedgerToggle(target)) return;
    if (handleStatementToggle(target)) return;
    handleFaqToggle(target);
  }, true);

  window.addEventListener('bb:view-change', (event) => {
    if (suppressRouteSync > 0) return;
    if (isItemPath(window.location.pathname)) return;

    const view = String(event?.detail?.view || '').toLowerCase();
    if (view === 'about') {
      pushPath('/about', { replace: true });
      return;
    }
    if (view === 'gallery') {
      pushPath('/gallery', { replace: true });
      return;
    }
    if (view === 'vault') {
      pushPath(pathForVaultTab(state.vault.activeTab), { replace: true });
    }
  });

  window.addEventListener('bb:modal-open', (event) => {
    if (suppressRouteSync > 0) return;

    const number = Number(event?.detail?.number);
    if (!Number.isFinite(number) || number <= 0) return;

    const current = normalizePath(window.location.pathname);
    if (!isItemPath(current)) {
      lastNonModalPath = current;
    }

    pushPath(`/${number}`);
  });

  window.addEventListener('bb:modal-close', () => {
    if (suppressRouteSync > 0) return;
    if (!isItemPath(window.location.pathname)) return;
    navigateToPath(lastNonModalPath || '/gallery', { behavior: 'auto' });
  });

  window.addEventListener('popstate', () => {
    syncFromLocation({ behavior: 'auto' });
  });
};

export const initRouting = ({ renderVaultContent }) => {
  renderVaultContentFn = renderVaultContent;

  if (!isItemPath(window.location.pathname)) {
    lastNonModalPath = normalizePath(window.location.pathname);
  }

  if (!initialized) {
    bindInteractionRouting();
    initialized = true;
  }

  syncFromLocation({ behavior: 'auto' });
};
