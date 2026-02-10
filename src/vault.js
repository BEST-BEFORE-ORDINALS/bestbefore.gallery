/* ═══ Vault — Artists, Diary, Ledger tabs ═══ */

import { state, ARTIST_BIO_LEMONHAZE, ARTIST_BIO_ORDINALLY, escapeHtml } from './state.js';

/* ── Diary content (loaded externally) ── */
let DIARY_CONTENT = '';
export const setDiaryContent = (text) => { DIARY_CONTENT = text; };
export const getDiaryContent = () => DIARY_CONTENT;

/* ── Diary parser ── */

export const parseDiary = (text) => {
  const lines = (text || '').split('\n');
  const cards = [];
  let currentCard = null;

  const flushCard = () => {
    if (currentCard) {
      currentCard.content = currentCard.content.trim();
      if (currentCard.content || currentCard.title) {
        cards.push(currentCard);
      }
      currentCard = null;
    }
  };

  const startCard = (type, title = '', date = '') => {
    flushCard();
    currentCard = { type, title, date, content: '' };
  };

  const dateRegex = /^(?:([LO]\s?:?)\s+)?([A-Za-z]+ \d{1,2}(?:, \d{4})?.*)/;
  const partRegex = /^(Part \d+.*)/;
  const headerRegex = /^#### (.*)/;

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    if (trimmed.startsWith('<!--')) return;

    const partMatch = trimmed.match(partRegex);
    if (partMatch) {
      startCard('chapter', partMatch[1]);
      return;
    }

    const headerMatch = trimmed.match(headerRegex);
    if (headerMatch) {
      startCard('section', headerMatch[1]);
      return;
    }

    let dateMatch = trimmed.match(dateRegex);
    if (dateMatch) {
      const fullLine = trimmed;
      let headerText = fullLine;
      let contentPart = '';
      let speakerPart = dateMatch[1] || '';

      if (headerText.endsWith(':')) {
        headerText = headerText.slice(0, -1);
      } else {
        let restOfLine = fullLine;
        if (speakerPart) {
          restOfLine = dateMatch[2];
        }
        const splitMatch = restOfLine.match(/^(.+?):\s+(.*)$/);

        if (splitMatch) {
          headerText = (speakerPart ? fullLine.substring(0, fullLine.indexOf(restOfLine)) : '') + splitMatch[1];
          contentPart = splitMatch[2];
        }
      }

      startCard('entry', '', headerText);

      if (contentPart) {
        currentCard.content += contentPart + '\n';
      }
      return;
    }

    if (currentCard) {
      currentCard.content += trimmed + '\n\n';
    } else {
      startCard('intro');
      currentCard.content += trimmed + '\n\n';
    }
  });

  flushCard();
  return cards;
};

export const renderDiaryCards = (cards) => {
  return cards.map(card => {
    let classes = `bb-diary-card bb-diary-card--${card.type}`;
    let html = '';

    if (card.type === 'chapter') {
      html += `<h3 class="bb-diary-chapter-title">${escapeHtml(card.title)}</h3>`;
    } else if (card.type === 'section') {
      html += `<h4 class="bb-diary-section-title">${escapeHtml(card.title)}</h4>`;
    } else if (card.type === 'entry') {
      let dateHtml = escapeHtml(card.date);
      dateHtml = dateHtml.replace(/^([LO]\s?:?)\s*/, '<span class="bb-diary-speaker">$1</span> ');
      html += `<div class="bb-diary-date">${dateHtml}</div>`;
    }

    if (card.content) {
      let formattedContent = escapeHtml(card.content)
        .replace(/\n\n/g, '</p><p>')
        .replace(/^([LO]:)/gm, '<strong>$1</strong>');

      if (formattedContent.startsWith('Prelude:')) {
        formattedContent = formattedContent.replace('Prelude:', '<span class="bb-diary-prelude-title">Prelude</span>');
      }

      html += `<div class="bb-diary-content"><p>${formattedContent}</p></div>`;
    }

    return `<article class="${classes}">${html}</article>`;
  }).join('');
};

/* ── Vault content renderer ── */

export const renderVaultContent = () => {
  if (state.vault.activeTab === 'artists') {
    return `
      <div class="bb-vault-section bb-artists-grid">
        <article class="bb-artist-card">
          <div class="bb-artist-avatar">
            <img src="https://ordinals.com/content/757c7d19f53501b9f1e11f49f1731622d5d257eed99c721b32af0438d0d1f9cfi0" alt="Lemonhaze" loading="lazy" />
          </div>
          <div class="bb-artist-info">
            <h3 class="bb-artist-name">Lemonhaze</h3>
            <div class="bb-artist-bio">
              <p>${ARTIST_BIO_LEMONHAZE.trim().replace(/\n/g, '<br />')}</p>
            </div>
          </div>
        </article>
        <article class="bb-artist-card">
          <div class="bb-artist-avatar">
            <iframe src="https://ordinals.com/content/23ab1013ce5b3745b007125b692191793ad52c2b83252e8e888838686d7e209ai0" title="ORDINALLY" loading="lazy"></iframe>
          </div>
          <div class="bb-artist-info">
            <h3 class="bb-artist-name">ORDINALLY</h3>
            <div class="bb-artist-bio">
              <p>${ARTIST_BIO_ORDINALLY.trim().replace(/\n/g, '<br />')}</p>
            </div>
          </div>
        </article>
      </div>
    `;
  }

  if (state.vault.activeTab === 'diary') {
    const cards = parseDiary(DIARY_CONTENT);
    return `
      <div class="bb-vault-section bb-diary-journal">
        <header class="bb-diary-header">
          <h2>Beyond the Canvas</h2>
          <p class="bb-diary-subtitle">Fragments from the creative journey</p>
        </header>
        <div class="bb-diary-scroll-snap">
          ${renderDiaryCards(cards)}
        </div>
      </div>
    `;
  }

  if (state.vault.activeTab === 'analytics') {
    return `
      <div class="bb-vault-section bb-ledger-container">
        <header class="bb-ledger-header">
          <h2>The Ledger</h2>
          <p class="bb-ledger-subtitle">On-chain records and analytics</p>
        </header>
        <iframe class="bb-ledger-frame" src="https://BESTBEFORE.SPACE" frameborder="0"></iframe>
      </div>
    `;
  }

  return '';
};

/* ── Render diary into the DOM ── */

export const renderDiary = (text) => {
  // Diary rendering happens inside renderVaultContent when the diary tab is active.
  // This is called during boot with the diary text to set the content.
  setDiaryContent(text);
};
