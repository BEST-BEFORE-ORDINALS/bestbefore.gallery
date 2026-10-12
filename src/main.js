import './gallery.css';
import { applyMetadata, pageMetadata } from './seo.js';
import './refined.css';
import './ledger-artists.css';
import { state, loadJson } from './state.js';
import { normalizeItems, phase, setThumbnailManifest } from './collection.js';
import { createGrid } from './grid.js';
import { createCanvas } from './canvas.js';
import { openArtworkModal, closeArtworkModal, updateArtworkModal } from './modal.js';
import { initCollectionRouting, currentRouteUrl } from './router.js';
import { renderLedger } from './ledger.js';
import { renderDiary } from './diary.js';
import { renderProcess, renderExhibition, exhibitionMoment, renderHomeWorks, renderArtists, renderAbout } from './editorial.js';
import { createRooms } from './rooms.js';
import { createLiveStudies } from './live-study.js';
let routing, route={}, renderKey='', revision=0, browseItems=[];
const $=s=>document.querySelector(s);
const grid=createGrid($('#grid'),n=>routing.openWork(n),$('#grid-pagination'));
const rooms=createRooms($('#information'),n=>routing.openWork(n),hash=>routing.navigate(hash));
const board=createCanvas($('#canvas'),n=>routing.openWork(n));
const studies=createLiveStudies(()=>state.items);
let canvasArrangement='', gridScroll=0;
function render(next){
  studies.setSuspended(currentRouteUrl().startsWith('/work/'));
  const previous=route.view;route=next;
  const key=JSON.stringify(next)+revision;if(key===renderKey)return;renderKey=key;
  if(previous==='grid'&&next.view!=='grid')gridScroll=window.scrollY;
  const isCanvas=next.view==='canvas',isCollection=['grid','canvas'].includes(next.view);
  renderShell(next,previous);
  renderCollection(next,previous,isCanvas);
  renderInformation(next,previous,isCollection);
  studies.refresh();
}

function renderShell(next,previous){
  const isCanvas=next.view==='canvas',isCollection=['grid','canvas'].includes(next.view);
  document.body.classList.toggle('canvas-mode',isCanvas);
  document.body.dataset.page=next.view;
  const titles={grid:'What if art could expire?',rooms:'Colour rooms',process:'The process',exhibition:'Exhibition & performance',diary:'The diary',about:'The project',artists:'The artists',ledger:'Collection ledger',canvas:'Canvas'};
  document.title=`BEST BEFORE — ${titles[next.view]||titles.grid}`;
  $('#home-editorial').hidden=next.view!=='grid';$('#grid-pagination').hidden=isCanvas;
  if(previous && previous!==next.view && next.view!=='grid')window.scrollTo(0,0);
  $('#hero').hidden=next.view!=='grid';$('#diary-feature').hidden=next.view!=='grid';$('#information').dataset.view=next.view;$('#collection').hidden=!isCollection;$('#information').hidden=isCollection;
  $('#grid').hidden=isCanvas;$('#canvas').hidden=!isCanvas;
  $('.site-footer').hidden=isCanvas;
  $('[data-nav="grid"]').classList.toggle('active',isCollection||next.view==='rooms');
  for(const name of ['ledger','diary','process','exhibition'])$(`[data-nav="${name}"]`).classList.toggle('active',next.view===name);
  document.querySelectorAll('[data-nav]').forEach(a=>{if(a.classList.contains('active'))a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
  document.querySelectorAll('[data-view]').forEach(a=>{a.classList.toggle('active',a.dataset.view===next.view);a.setAttribute('aria-current',a.dataset.view===next.view?'page':'false');});
  document.querySelectorAll('[data-status]').forEach(b=>{b.classList.toggle('active',b.dataset.status===next.status);b.setAttribute('aria-pressed',String(b.dataset.status===next.status));});
  $('.status-filters').hidden=isCanvas;$('#sort-label').textContent=isCanvas?'Arrange by':'Sort by';
  $('#sort-select').setAttribute('aria-label',isCanvas?'Arrange works':'Sort works');
  $('#sort-select').innerHTML=(isCanvas?[['number','Number'],['palette','Palette'],['lifespan','Lifespan']]:[['number','Number'],['time','Time left'],['palette','Palette']]).map(([v,l])=>`<option value="${v}">${l}</option>`).join('');
  $('#sort-select').value=isCanvas?next.arrange:next.sort;
}
function renderCollection(next,previous,isCanvas){
  if(next.view==='grid'){browseItems=grid.render(state.items,next);$('#result-count').textContent=`${browseItems.length} works`;if(previous&&previous!=='grid')window.scrollTo(0,gridScroll);}
  if(isCanvas){browseItems=state.items;$('#result-count').textContent='420 works · drag to explore';if(canvasArrangement!==next.arrange+revision){board.render(state.items,next.arrange);canvasArrangement=next.arrange+revision;}}
  board.setActive(isCanvas);
}
function renderInformation(next,previous,isCollection){
  $('#information').classList.toggle('information--diary',next.view==='diary');
  if(!isCollection && next.view!=='rooms')browseItems=state.items;
  if(next.view==='rooms')browseItems=rooms.render(state.items,next.palette);
  if(next.view==='process')$('#information').innerHTML=renderProcess(state.items);
  if(next.view==='exhibition' && (previous!=='exhibition'||!$('#information').querySelector('.exhibition-page')))$('#information').innerHTML=renderExhibition();
  if(next.view==='diary')renderDiary($('#information'),next.part);
  if(next.view==='artists')$('#information').innerHTML=renderArtists();
  if(next.view==='ledger')renderLedgerPage(previous);
  if(next.view==='about')$('#information').innerHTML=renderAbout();
}
function renderLedgerPage(previous){
    const expanded=new Map(previous==='ledger'?[...$('#information').querySelectorAll('[data-ledger-section]')].map(el=>[el.dataset.ledgerSection,el.querySelector('details')?.open]):[]);
    $('#information').innerHTML=renderLedger(state.analytics,state.items,{tip:state.tip,generatedAt:state.liveGeneratedAt,live:!!state.liveItems});
    $('#information').querySelectorAll('[data-ledger-section]').forEach(el=>{if(expanded.has(el.dataset.ledgerSection))el.querySelector('details').open=expanded.get(el.dataset.ledgerSection);});
}
function adopt(feed,live=false){
  state.items=normalizeItems(feed);state.liveItems=live?state.items:null;state.analytics=feed.analytics||state.analytics;state.liveGeneratedAt=feed.generated_at;state.tip=feed.tip;
  const counts=Object.fromEntries(['open','sealed','expired','immortal'].map(p=>[p,state.items.filter(i=>phase(i)===p).length]));
  $('#live-counts').innerHTML=Object.entries(counts).map(([p,n])=>`<span class="${p}"><i></i><b>${n}</b> ${p}</span>`).join('');
  $('#chain-height').textContent=`BLOCK ${Number(feed.tip).toLocaleString()}`;
  $('#feed-status').textContent=`${live?'Live feed':'Saved snapshot'} · updated ${new Date(feed.generated_at).toLocaleString(undefined,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}`;
  renderHomeWorks(state.items);
  revision++;if(routing){routing.refresh();updateArtworkModal(state.items);}
}
$('.status-filters').addEventListener('click',e=>{const b=e.target.closest('[data-status]');if(b)routing.navigate(`/?status=${b.dataset.status}&sort=${route.sort}`);});
$('#sort-select').addEventListener('change',e=>routing.navigate(route.view==='canvas'?`/canvas?arrange=${e.target.value}`:`/?status=${route.status}&sort=${e.target.value}`));
$('#information').addEventListener('click',e=>{if(e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;const a=e.target.closest('a');const match=a?.getAttribute('href')?.match(/^\/work\/(\d+)$/);if(match){e.preventDefault();routing.openWork(Number(match[1]));}});
window.addEventListener('bb:modal-step',e=>{const current=Number(document.querySelector('.bb-modal-overlay')?.dataset.number);const index=browseItems.findIndex(i=>i.number===current);const next=browseItems[(index+e.detail.direction+browseItems.length)%browseItems.length];if(next)routing.openWork(next.number,{replace:true});});
async function refreshLive(){
  try{const response=await fetch('https://bestbefore.space/best-before.json',{signal:AbortSignal.timeout(12000)});if(!response.ok)throw new Error();const feed=await response.json();if(feed.inscriptions?.length!==420)throw new Error();if(feed.generated_at!==state.liveGeneratedAt)adopt(feed,true);else $('#feed-status').textContent=`Live feed · block ${Number(feed.tip).toLocaleString()}`;}
  catch{$('#feed-status').textContent=`Saved snapshot · live feed unavailable · last update ${new Date(state.liveGeneratedAt).toLocaleString()}`;}
}
document.addEventListener('click',e=>{
  const work=e.target.closest('[data-open-work]');if(work&&!e.defaultPrevented){if(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;e.preventDefault();routing.openWork(Number(work.dataset.openWork));return;}
  const moment=e.target.closest('[data-exhibition-moment]');if(moment){const index=Number(moment.dataset.exhibitionMoment);$('#exhibition-moment').innerHTML=exhibitionMoment(index);document.querySelectorAll('[data-exhibition-moment]').forEach(b=>b.setAttribute('aria-pressed',String(b===moment)));studies.refresh();return;}
  if(e.target.closest('.skip-link,[data-scroll-collection]')){e.preventDefault();if(route.view!=='grid')routing.navigate('/');$('#collection').scrollIntoView({behavior:'smooth'});$('.collection-title h2').setAttribute('tabindex','-1');$('.collection-title h2').focus({preventScroll:true});}
});
async function boot(){
  try{const[feed,manifest]=await Promise.all([loadJson('/data/collection.json'),loadJson('/data/thumbnail-manifest.json')]);setThumbnailManifest(manifest);adopt(feed);
    routing=initCollectionRouting({render,metadata:next=>applyMetadata(pageMetadata(next,state.items)),open:number=>{const item=state.items.find(i=>i.number===number);if(item)openArtworkModal(item);else{$('#feed-status').textContent='That work could not be found. Showing the collection.';location.replace('/work/'+number);}},close:closeArtworkModal});
    window.bbOpenItem=number=>{routing.openWork(number);return true;};
    refreshLive();setInterval(()=>{if(!document.hidden)refreshLive();},60000);
  }catch{$('#grid').innerHTML='<p class="empty-state">The collection could not be loaded. <button onclick="location.reload()">Try again</button></p>';}
}
boot();
