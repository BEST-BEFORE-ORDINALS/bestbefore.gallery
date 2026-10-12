import { escapeHtml } from './state.js';

export function parseDiary(text) {
  const cleaned = text.replace(/<!--[^]*?-->/g, '').trim();
  const chapters = [];
  let current;
  for (const line of cleaned.split('\n')) {
    const heading = /^(Prelude:|Part\s+(\d+)\s*(.*))$/i.exec(line.trim());
    if (heading) {
      const number = Number(heading[2] || 0);
      const rawTitle = (heading[3] || '').replace(/^\s*[:(]\s*/, '').replace(/[):]+$/, '').trim();
      current = { number, title: number ? rawTitle || `Part ${number}` : 'The first spark', lines: [] };
      chapters.push(current);
    } else if (current) current.lines.push(line);
  }
  return chapters.map(chapter => ({ ...chapter, text: chapter.lines.join('\n').trim() }));
}

export const chapterNote = chapter => chapter.number === 2 ? `<aside class="diary-making-note" aria-label="A note on this chapter"><span>A NOTE ON THIS CHAPTER</span><p>Using the tools of our time, this chapter was generated with a large language model (LLM) from the full chat log between Lemonhaze and Ordinally during the making of BEST BEFORE. It brings months of conversation into a composite day.</p></aside>` : '';

const paragraphMarkup = text => text.split(/\n\s*\n/).filter(Boolean).map(block => {
  if (block.startsWith('#### ')) {
    const [title, ...rest] = block.split('\n');
    return `<h3>${escapeHtml(title.replace(/^#+\s*/, ''))}</h3>${rest.length ? `<p>${escapeHtml(rest.join('\n'))}</p>` : ''}`;
  }
  const isTimestamp = /^[LO]\s*:\s*(April|June|July|August|September)/.test(block) && block.length < 100;
  return `<p${isTimestamp ? ' class="diary-timestamp"' : ''}>${escapeHtml(block).replaceAll('\n', '<br>')}</p>`;
}).join('');
let diaryPromise;
let lastPart;
export async function renderDiary(root, part = 0) {
  if (!root.querySelector('.diary-reader')) root.innerHTML = '<p class="loading-state">Opening the diary…</p>';
  try {
    diaryPromise ||= fetch('/data/bb-diary.txt').then(response => {
      if (!response.ok) throw new Error('Diary unavailable');
      return response.text();
    }).then(parseDiary);
    const chapters = await diaryPromise;
    if (root.dataset.view !== 'diary') return;
    const needsMarkup = !root.querySelector('.diary-reader');
    if (needsMarkup) {
      root.innerHTML = `<div class="diary-reader">
        <header class="diary-header"><span class="eyebrow">THE DIARY · BY LEMONHAZE</span><h1>Before the works,<br>there was a conversation.</h1><div class="diary-intro"><p>Follow the conversations and experiments that shaped BEST BEFORE, from the first idea through a summer of making.</p><span>DECEMBER 2024 — SEPTEMBER 2025<br>PRELUDE + SIX PARTS</span></div><p class="diary-authorship">Written by Lemonhaze, except for Ordinally’s passages marked “O” and “A Day in the Life”, an LLM-generated chapter drawn from the making-of conversations.</p></header>
        <div class="diary-layout"><nav class="diary-index" aria-label="Diary chapters"><span class="eyebrow">CONTENTS</span>${chapters.map(chapter => `<a href="#/diary?part=${chapter.number}" data-diary-part="${chapter.number}"><span>${chapter.number ? String(chapter.number).padStart(2, '0') : '00'}</span>${escapeHtml(chapter.title)}</a>`).join('')}<a class="diary-back" href="#/grid">Back to the collection <svg class="ui-arrow" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5 19 19 5M5 5h14v14"/></svg></a></nav>
        <div class="diary-pages">${chapters.map(chapter => `<article class="diary-chapter" id="diary-part-${chapter.number}"><div class="diary-chapter-meta"><span>${chapter.number ? `PART ${String(chapter.number).padStart(2, '0')}` : 'PRELUDE'}</span><span>${Math.max(1, Math.ceil(chapter.text.split(/\s+/).length / 220))} MIN READ</span></div><h2>${escapeHtml(chapter.title)}</h2>${chapterNote(chapter)}${paragraphMarkup(chapter.text)}</article>`).join('')}<a class="diary-finish" href="#/grid">Now, meet the works <span><svg class="ui-arrow" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5 19 19 5M5 5h14v14"/></svg></span></a></div></div>
      </div>`;
    }
    root.querySelectorAll('[data-diary-part]').forEach(a => {
      a.classList.toggle('active', Number(a.dataset.diaryPart) === part);
      if (Number(a.dataset.diaryPart) === part) a.setAttribute('aria-current', 'location');
      else a.removeAttribute('aria-current');
    });
    if (part !== lastPart || needsMarkup) {
      if (part > 0) document.querySelector(`#diary-part-${part}`)?.scrollIntoView({ block: 'start' });
      else window.scrollTo(0, 0);
    }
    lastPart = part;
  } catch {
    diaryPromise = null;
    if (root.dataset.view === 'diary') root.innerHTML = '<p class="empty-state">The diary could not be loaded. Please refresh to try again.</p>';
  }
}
