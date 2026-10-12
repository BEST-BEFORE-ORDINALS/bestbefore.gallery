import { escapeHtml } from './state.js';
import { imageMarkup, phase } from './collection.js';
export const sectionMeta={
  grid:['What if art could expire?','420 living generative artworks by Lemonhaze × Ordinally, inscribed on Bitcoin. Explore a collection whose lives are measured in blocks.'],
  rooms:['A room for every palette','Explore BEST BEFORE by palette. Shared colours, separate lives: discover living generative artworks by Lemonhaze × Ordinally.'],
  diary:['The diary','Read the conversations and experiments behind BEST BEFORE, from the first idea to a summer of making living generative art.'],
  process:['The process','Follow the textures, code and experiments that shaped BEST BEFORE, 420 living artworks by Lemonhaze × Ordinally.'],
  exhibition:['Exhibition & performance','Imagine BEST BEFORE in a gallery or museum: a public opening, a living artwork, and an exhibition whose duration is set by Bitcoin.'],
  ledger:['The collection ledger','Explore the lives of all 420 BEST BEFORE artworks: activations, lifespans, palettes and collectors, recorded in Bitcoin blocks.'],
  artists:['Lemonhaze & Ordinally','Meet Lemonhaze and Ordinally, the two artists behind BEST BEFORE, a collection of 420 generative artworks inscribed on Bitcoin.'],
  about:['About the project','What if art could expire? Discover the idea behind BEST BEFORE, its sealed, open, expired and immortal lives, and its inscription on Bitcoin.'],
  canvas:['Collection canvas','Explore the BEST BEFORE collection on a pannable, zoomable canvas.'],
};
export const diaryTitles=['The first spark','First steps','A Day in the Life','Open','Performance','Visual','Individual thoughts & last logs'];
export const diaryDescriptions=[
  'The first spark of BEST BEFORE: Lemonhaze’s starting point for art that lives, changes and expires, just like we do.',
  'The first steps toward BEST BEFORE: early exchanges and experiments in making a generative artwork with a finite life.',
  'A Day in the Life: an LLM-generated reconstruction drawn from the full making-of conversation behind BEST BEFORE.',
  'Opening BEST BEFORE: conversations about activation, the first block and the beginning of an artwork’s life.',
  'BEST BEFORE as performance: conversations about public openings, exhibition and the passing of time.',
  'The visual language of BEST BEFORE: conversations about colour, texture and painting with code.',
  'Individual thoughts and last logs from the making of BEST BEFORE, by Lemonhaze and Ordinally.',
];
export function pageMetadata(route,items=[],origin='https://bestbefore.gallery') {
  const item=items.find(i=>i.number===route.work),view=route.view||'grid';
  const [label,sectionDescription]=sectionMeta[view]||sectionMeta.grid;
  const description=view==='diary'?diaryDescriptions[route.part||0]:sectionDescription;
  const part=route.part||0;
  const path=item?`/work/${item.number}`:view==='grid'?'/':view==='diary'&&part?`/diary/${part}`:`/${view}`;
  const title=item?`BEST BEFORE Nº${item.number}${item.palette?.id?` — ${item.palette.id}`:''}`:view==='diary'&&part?`${diaryTitles[part]} — BEST BEFORE diary`:`BEST BEFORE — ${label}`;
  const card=item?`work-${item.number}`:view==='diary'&&part?`diary-${part}`:view;
  return {title,description:item?`BEST BEFORE Nº${item.number}${item.palette?.id?`, ${item.palette.id},`:':'} a generative HTML artwork by Lemonhaze × Ordinally, inscribed on Bitcoin. Watch the live work and explore its life in blocks.`:description,path,url:origin+path,image:`${origin}/assets/social/${card}.jpg`,imageAlt:item?`BEST BEFORE Nº${item.number}${item.palette?.id?` — ${item.palette.id}`:''}, artwork preview`:`${label} — BEST BEFORE by Lemonhaze × Ordinally`,noindex:view==='canvas',item};
}
export function structuredData(meta){
  const creators=[{'@type':'Person',name:'Lemonhaze',url:'https://lemonhaze.com'},{'@type':'Person',name:'Ordinally'}];
  const origin=new URL(meta.url).origin;
  const page={'@type':meta.item?'ItemPage':'WebPage','@id':meta.url+'#page',url:meta.url,name:meta.title,description:meta.description,image:meta.image,isPartOf:{'@id':origin+'/#website'}};
  if(meta.item)page.mainEntity={'@type':'VisualArtwork','@id':meta.url+'#artwork',name:`BEST BEFORE Nº${meta.item.number}`,url:meta.url,image:meta.image,creator:creators,artform:'Generative art',artMedium:'HTML and JavaScript inscribed on Bitcoin',isPartOf:{'@type':'CreativeWorkSeries',name:'BEST BEFORE',url:origin+'/'},sameAs:meta.item.ordinalsUrl};
  return {'@context':'https://schema.org','@graph':[{'@type':'WebSite','@id':origin+'/#website',url:origin+'/',name:'BEST BEFORE',inLanguage:'en'},page]};
}
export function applyMetadata(meta,doc=document){
  doc.title=meta.title;
  doc.querySelector('link[rel="canonical"]').setAttribute('href',meta.url);
  const tags={'name:description':meta.description,'property:og:title':meta.title,'property:og:description':meta.description,'property:og:url':meta.url,'property:og:image':meta.image,'property:og:image:alt':meta.imageAlt,'property:og:image:width':'1200','property:og:image:height':'630','property:og:image:type':'image/jpeg','name:twitter:title':meta.title,'name:twitter:description':meta.description,'name:twitter:image':meta.image,'name:twitter:image:alt':meta.imageAlt,'name:robots':meta.noindex?'noindex,follow':'index,follow,max-image-preview:large'};
  for(const [key,value]of Object.entries(tags)){
    const attr=key.slice(0,key.indexOf(':'));const tagName=key.slice(attr.length+1);
    let el=doc.querySelector(`meta[${attr}="${tagName}"]`);
    if(!el){el=doc.createElement('meta');el.setAttribute(attr,tagName);doc.head.append(el);}
    el.setAttribute('content',value);
  }
  const data=doc.querySelector('script[type="application/ld+json"]');
  data.textContent=JSON.stringify(structuredData(meta)).replaceAll('<','\\u003c');
}
export function renderWorkPage(item){
  const description=pageMetadata({work:item.number,view:'grid'},[item]).description;
  return `<article class="work-page"><header class="editorial-heading"><span class="eyebrow">LEMONHAZE × ORDINALLY / 420 GENERATIVE WORKS</span><h1>BEST BEFORE Nº${item.number}</h1><p>${escapeHtml(description)}</p></header><div class="work-page-body"><a href="/work/${item.number}" data-open-work="${item.number}" aria-label="Open live artwork Nº${item.number}">${imageMarkup(item,'(max-width:700px) 80vw, 450px',true)}</a><div><h2>${escapeHtml(item.palette?.id||'A life on Bitcoin')}</h2><p>Open the live artwork to see its current state and countdown. Each activation starts a life measured in Bitcoin blocks.</p><p>1800 × 3200 · Generative HTML</p><a class="text-link" href="${item.ordinalsUrl}">View inscription</a><p class="snapshot-note">Preview state: ${phase(item)}. The live work determines its current state.</p></div></div><nav class="work-page-nav" aria-label="Browse artworks">${item.number>1?`<a href="/work/${item.number-1}">Previous work</a>`:''}<a href="/">All 420 works</a>${item.number<420?`<a href="/work/${item.number+1}">Next work</a>`:''}</nav></article>`;
}
