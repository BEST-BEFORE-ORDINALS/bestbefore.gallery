import { escapeHtml, ARTIST_BIO_LEMONHAZE, ARTIST_BIO_ORDINALLY } from './state.js';
import { imageMarkup, statusChip, timeLeft } from './collection.js';

const arrow = '<span aria-hidden="true"><svg class="ui-arrow" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5 19 19 5M5 5h14v14"/></svg></span>';
const link = (href, label) => `<a class="text-link" href="${href}">${label}${arrow}</a>`;
const findWork = (items, number) => items.find(item => item.number === number);
const work = (items, number, className = '') => {
  const item = findWork(items, number);
  if (!item) return '';
  return `<a class="editorial-work ${className}" href="/work/${number}" data-open-work="${number}">${imageMarkup(item, '(max-width: 700px) 45vw, 28vw', className.startsWith('hero-'))}<span class="editorial-caption"><span>Nº${String(number).padStart(3, '0')} · ${escapeHtml(item.palette?.id || item.status)}</span>${statusChip(item)}</span></a>`;
};

export function renderHomeWorks(items) {
  for (const button of document.querySelectorAll('#hero-works [data-open-work]')) {
    const number=Number(button.dataset.openWork), item=findWork(items,number);
    if(!item||!button)continue;
    const expected=['sealed','expired'].includes(item.status)?item.status.toUpperCase():`BESTBEFORE_${number}`;
    if(!button.querySelector('img')?.getAttribute('src').includes(expected))button.innerHTML=imageMarkup(item,'(max-width: 700px) 45vw, 28vw',true)+'<span class="editorial-caption"></span>';
    button.querySelector('.editorial-caption').innerHTML=`<span>Nº${String(number).padStart(3,'0')} · ${escapeHtml(item.palette?.id||item.status)}</span>${statusChip(item)}`;
  }
}

export function renderProcess(items) {
  return `<div class="editorial-page process-page">
    <header class="editorial-heading"><span class="eyebrow">THE PROCESS · APRIL — SEPTEMBER 2025</span><h1>Learning how <br>to make it <em>alive.</em></h1><div class="editorial-deck"><p>A conversation between an artist and a builder. A summer of starting over. A painting that would eventually have a life of its own.</p>${link('/diary/5', 'Read the visual diary')}</div></header>
    <section class="process-diptych process-comparison" aria-label="Two works from the collection"><div>${work(items, 233)}<span class="figure-note">01 / HORIZON</span></div><div>${work(items, 133)}<span class="figure-note">02 / PUNCH</span></div></section>
    <section class="editorial-two-column"><span class="eyebrow">PAINTING WITH CODE</span><div><h2>“All I needed was for <br>the work to be alive.”</h2><p>The first sketch carried an expiry date at the bottom. The visual language was still unresolved. Through the summer, Lemonhaze rebuilt it in vanilla JavaScript, sharing iterations with Ordinally as textures, movement and colour began to come together.</p><p>A breakthrough in August brought a new set of textures into BEST BEFORE. The work became the result of that exchange: intuitive painting, careful engineering, and a shared willingness to take more time.</p><span class="quote-credit">LEMONHAZE · VISUAL DIARY · AUGUST 20, 2025</span></div></section>
    <section class="process-steps"><article><span class="eyebrow">01 / THE QUESTION</span><h3>What if it could end?</h3><p>On April 29, 2025, a first message proposed artworks with an expiration date. The contrast was there from the beginning: Bitcoin’s permanence and a human life’s uncertainty.</p>${link('/diary/1', 'The first conversation')}</article><article><span class="eyebrow">02 / THE IMAGE</span><h3>Finding the painting.</h3><p>Sketch, render, look again. Colour palettes, swirls, layered textures and subtle movement were developed through months of iteration.</p>${link('/diary/5', 'The visual diary')}</article><article><span class="eyebrow">03 / THE CLOCK</span><h3>Giving it a life.</h3><p>Ordinally connected the work to Bitcoin. The collector’s activation determines its visual identity and lifespan; each new block moves that life forward.</p>${link('/diary/3', 'When the clock starts')}</article></section>
    <section class="watch-form"><div><span class="eyebrow">THE PROCESS IS STILL VISIBLE</span><h2>A work takes shape <br>every time you visit.</h2><p>Open a work and watch its colours and textures build. The living artwork renders from its inscription, in front of you.</p><button class="text-link" data-open-work="233">Watch Nº233 take shape ${arrow}</button></div><div class="process-palette" aria-label="Horizon colour palette">${(findWork(items,233)?.palette?.colors||[]).map(c=>`<span style="background:${c}"></span>`).join('')}</div></section>
    ${editorialNext('THE EXHIBITION', 'A life, witnessed together.', '/exhibition')}
  </div>`;
}

export const exhibitionMoments = [
  {label:'The opening', state:'SEALED → OPEN', title:'An opening in the truest sense.', text:'A collector chooses a place and a moment. The audience gathers. A confirmed activation reveals the work and its lifespan together. No one knows, beforehand, how long that life will be.', image:'SEALED', caption:'Before the reveal · a work waiting to begin'},
  {label:'The duration', state:'OPEN', title:'Let the work set the duration.', text:'A gallery could commit to keeping a work on display for its entire life. Weeks, years, perhaps decades. The institution’s promise becomes part of the performance.', image:'BESTBEFORE_189', caption:'During its life · a painting measured in blocks'},
  {label:'The finale', state:'EXPIRED', title:'Come back for the last block.', text:'When the remaining blocks approach zero, an audience could gather again. The living image ends. The inscription remains, carrying the record of what was witnessed.', image:'EXPIRED', caption:'After expiry · the inscription remains'}
];
export function exhibitionMoment(index) {
  const m = exhibitionMoments[index] || exhibitionMoments[0];
  const living=m.image==='BESTBEFORE_189';
  const media=living?`<div class="study-frame" data-live-study="189"><img src="/assets/thumbs/BESTBEFORE_189-400.webp" width="400" height="711" alt="BEST BEFORE Nº189 — Ocean, live display study"/></div>`:`<img src="/assets/thumbs/${m.image}-400.webp" width="400" height="400" alt="${m.state==='EXPIRED'?'Expired artwork':'Sealed artwork'}"/>`;
  return `<div class="exhibition-wall ${living?'is-open':''}" data-study-container><div class="wall-work">${media}<span class="wall-label">BEST BEFORE <br>LEMONHAZE × ORDINALLY</span></div><span class="wall-caption">EXHIBITION STUDY / ${living?'LIVE ARTWORK':m.state}</span>${living?'<div class="study-actions"><button class="study-toggle" data-study-toggle aria-pressed="true">Pause live artwork</button><button class="study-expand" data-study-expand aria-label="View live exhibition full screen" aria-expanded="false">Full screen <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/></svg></button></div>':''}</div><div class="exhibition-moment-copy"><span class="eyebrow">${m.caption}</span><h2>${m.title}</h2><p>${m.text}</p></div>`;
}
export function renderExhibition() {
  return `<div class="editorial-page exhibition-page"><header class="editorial-heading"><span class="eyebrow">EXHIBITION & PERFORMANCE</span><h1>The opening. <br>The life. <br><em>The last block.</em></h1><div class="editorial-deck"><p>What happens when a work’s entire life becomes an exhibition? A possibility for galleries, museums, collectors—and everyone who comes to witness it.</p>${link('/diary/4', 'From the performance diary')}</div></header>
    <section class="exhibition-study" aria-label="Explore an exhibition scenario"><div class="exhibition-tabs" role="group" aria-label="Exhibition moments">${exhibitionMoments.map((m,i)=>`<button data-exhibition-moment="${i}" aria-pressed="${i===1}"><span>0${i+1}</span>${m.label}</button>`).join('')}</div><div id="exhibition-moment" aria-live="polite">${exhibitionMoment(1)}</div></section>
    <section class="editorial-quote"><span class="eyebrow">FROM THE DIARY / PART 04</span><blockquote>“A ritual, a story, <br>a self-contained <br>performance art.”</blockquote><span class="quote-credit">LEMONHAZE · BEST BEFORE</span></section>
    <section class="exhibition-formats"><div><span class="eyebrow">POSSIBLE WAYS TO SHOW THE WORK</span><h2>Time is part <br>of the exhibition.</h2><p>These possibilities began in the artists’ conversation. Each leaves room for the collector, the institution and the audience to shape what comes next.</p></div><div class="format-list"><article><span>01</span><div><h3>A public unsealing</h3><p>Make activation the event. One work or many, revealed in front of an audience, with each lifespan unknown until it begins.</p></div></article><article><span>02</span><div><h3>A gallery commitment</h3><p>Keep the work on display until it expires. A promise whose duration the institution cannot choose in advance.</p></div></article><article><span>03</span><div><h3>A museum’s stewardship</h3><p>If an immortal emerges, imagine a museum committing to its ongoing care. An open-ended life, and an open-ended responsibility.</p></div></article><article><span>04</span><div><h3>A closing gathering</h3><p>Return for the finale. Mark the end of the living image, and the time spent in its company.</p></div></article></div></section>
    <section class="exhibition-note"><span class="eyebrow">FOR A FUTURE PRESENTATION</span><p>The live work is the centre of the display. A portrait screen, room to stand with it, and its remaining blocks beside it. The act of looking becomes an awareness of time.</p>${link('https://x.com/ordbestbefore', 'Start a conversation')}</section>
    ${editorialNext('THE COLLECTION', 'Which life will you spend time with?', '/')}
  </div>`;
}
function editorialNext(label,title,href){return `<a class="editorial-next" href="${href}"><span class="eyebrow">${label}</span><span>${title}</span><span aria-hidden="true"><svg class="ui-arrow" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5 19 19 5M5 5h14v14"/></svg></span></a>`;}

export function renderArtists() {
  const bio = text => text.trim().split(/\n\s*\n/).map(p=>`<p>${escapeHtml(p)}</p>`).join('');
  const artists = [
    {name:'Lemonhaze', image:'lemonhaze-avatar.webp', role:'ARTIST · PAINTING WITH CODE', text:ARTIST_BIO_LEMONHAZE, url:'https://lemonhaze.com', label:'Visit lemonhaze.com'},
    {name:'Ordinally', image:'ordinally-avatar.webp', role:'ARTIST · CREATIVE ENGINEERING', text:ARTIST_BIO_ORDINALLY, url:'https://x.com/veryordinally', label:'Follow Ordinally'}
  ];
  return `<div class="editorial-page artists-page"><header class="editorial-heading"><span class="eyebrow">THE ARTISTS / LEMONHAZE × ORDINALLY</span><h1>Two practices.<br><em>420 lives.</em></h1><div class="editorial-deck"><p>BEST BEFORE grew out of a conversation. Meet the two people behind the collection.</p>${link('/diary','Read their conversation')}</div></header>${artists.map((a,i)=>`<article class="artist-profile"><div class="artist-portrait"><img src="/assets/${a.image}" width="480" height="480" alt="${a.name}" loading="lazy"/><span class="eyebrow">0${i+1} / ${a.role}</span></div><div class="artist-writing"><h2>${a.name}</h2><div class="artist-bio">${bio(a.text)}</div><a class="text-link" href="${a.url}" target="_blank" rel="noreferrer">${a.label}${arrow}</a></div></article>`).join('')}${editorialNext('THE DIARY','A summer of making it alive.','/diary')}</div>`;
}

export const renderAbout=()=>`<span class="eyebrow">THE PROJECT</span><h1>Forever on-chain.<br>Only briefly alive.</h1><p>BEST BEFORE is a collection of 420 generative HTML works by Lemonhaze × Ordinally, inscribed on Bitcoin at 1800 × 3200 pixels. Each starts sealed. Activation reveals its palette and starts its lifespan, measured in Bitcoin blocks.</p><div class="about-states"><article><i class="sealed"></i><h2>Sealed</h2><p>A possibility, waiting to be opened.</p></article><article><i class="open"></i><h2>Open</h2><p>A living work. Every new block brings it closer to its end.</p></article><article><i class="expired"></i><h2>Expired</h2><p>The life is over. The inscription remains.</p></article><article><i class="immortal"></i><h2>Immortal</h2><p>The 0.69% exception. A life without a countdown.</p></article></div><a class="about-link" href="https://ord.net/collection/best-before-by-lemonhaze-x-ordinally" target="_blank" rel="noreferrer">Explore on Ord.net <svg class="ui-arrow" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5 19 19 5M5 5h14v14"/></svg></a>`;
