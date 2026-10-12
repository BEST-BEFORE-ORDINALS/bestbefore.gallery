import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { parseHTML } from 'linkedom';
import { normalizeItems,setThumbnailManifest,phase } from '../src/collection.js';
import { parseCollectionRoute } from '../src/router.js';
import { pageMetadata,applyMetadata,renderWorkPage } from '../src/seo.js';
import { renderProcess,renderExhibition,renderArtists,renderAbout } from '../src/editorial.js';
import { parseDiary,renderDiaryMarkup } from '../src/diary.js';
import { renderLedger } from '../src/ledger.js';
import { createRooms } from '../src/rooms.js';
import { renderFaq } from '../src/faq.js';
import { createGrid } from '../src/grid.js';
const root=new URL('../',import.meta.url),out=new URL('dist/',root);
const origin=(process.env.SITE_URL||'https://bestbefore.gallery').replace(/\/$/,'');
const template=await readFile(new URL('index.html',out),'utf8');
const feed=JSON.parse(await readFile(new URL('public/data/collection.json',root)));
const items=normalizeItems(feed),chapters=parseDiary(await readFile(new URL('public/data/bb-diary.txt',root),'utf8'));
setThumbnailManifest(JSON.parse(await readFile(new URL('public/data/thumbnail-manifest.json',root))));
const paths=['/','/rooms','/diary','/process','/exhibition','/ledger','/artists','/about','/faq','/canvas',...Array.from({length:6},(_,i)=>`/diary/${i+1}`),...items.map(i=>`/work/${i.number}`)];
function showView(doc,route){
  const view=route.work?'work':route.view,home=view==='grid';
  for(const id of ['hero','diary-feature','home-editorial','collection'])doc.getElementById(id).hidden=!home;
  const info=doc.getElementById('information');info.hidden=home;info.dataset.view=view;
  doc.body.dataset.page=view;
  doc.querySelectorAll('[data-nav]').forEach(a=>{const active=a.dataset.nav===(route.work?'grid':view);a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
  if(!home)doc.querySelectorAll('#hero img').forEach(img=>{img.setAttribute('loading','lazy');img.removeAttribute('fetchpriority');});
  return info;
}
function renderContent(doc,route){
  const info=showView(doc,route),noop=()=>{};
  if(route.work){info.innerHTML=renderWorkPage(items.find(i=>i.number===route.work));return;}
  const renderers={faq:renderFaq,process:()=>renderProcess(items),exhibition:renderExhibition,artists:renderArtists,about:renderAbout,diary:()=>renderDiaryMarkup(chapters,route.part),ledger:()=>renderLedger(feed.analytics,items,{tip:feed.tip,generatedAt:feed.generated_at,live:false})};
  if(renderers[route.view])info.innerHTML=renderers[route.view]();
  if(route.view==='diary'){info.classList.add('information--diary');info.dataset.diaryPart=route.part;}
  if(route.view==='rooms')createRooms(info,noop,noop).render(items,'');
  if(route.view==='grid'){
    createGrid(doc.getElementById('grid'),noop,doc.getElementById('grid-pagination')).render(items,route);
    doc.getElementById('live-counts').innerHTML=['open','sealed','expired','immortal'].map(p=>`<span class="${p}"><i></i><b>${items.filter(i=>phase(i)===p).length}</b> ${p}</span>`).join('');
  }
  if(route.view==='canvas')info.innerHTML='<h1>The collection canvas</h1><p>Drag and zoom through all 420 works. JavaScript enables the interactive canvas.</p><a href="/">Browse the collection grid</a>';
}
const sitemap=[];
for(const path of paths){
  const {document:doc}=parseHTML(template),route=parseCollectionRoute(path),meta=pageMetadata(route,items,origin);
  renderContent(doc,route);applyMetadata(meta,doc);
  const file=new URL(path==='/'?'index.html':`${path.slice(1)}.html`,out);
  await mkdir(new URL('./',file),{recursive:true});await writeFile(file,'<!doctype html>\n'+doc.documentElement.outerHTML);
  if(!meta.noindex)sitemap.push(meta.url);
}
await writeFile(new URL('sitemap.xml',out),'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+sitemap.map(url=>`<url><loc>${url}</loc></url>`).join('')+'</urlset>\n');
await writeFile(new URL('robots.txt',out),`User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`);
console.log(`Pre-rendered ${paths.length} pages; ${sitemap.length} sitemap URLs.`);
