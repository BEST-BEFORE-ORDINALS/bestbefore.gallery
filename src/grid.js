import { imageMarkup, phase, timeLeft, numberLabel, statusChip, sortCollection } from './collection.js';
import { escapeHtml } from './state.js';
export function createGrid(root, open, pagination) {
  const initialLimit=12;
  let filtered=[], limit=initialLimit, key='';
  const card = (item) => `<button class="work-card" data-work="${item.number}">
    <div class="work-card__image ${item.status}">${imageMarkup(item,'(max-width: 700px) 44vw, (max-width: 1100px) 23vw, 15vw')}<span class="work-card__enter" aria-hidden="true">↗</span></div>
    <div class="work-card__heading"><span>Nº ${numberLabel(item.number)}</span>${statusChip(item)}</div>
    <div class="work-card__caption"><span>${escapeHtml(item.palette?.id || (item.status === 'sealed' ? 'Unrevealed' : 'Expired'))}</span><span>${timeLeft(item)}</span></div>
  </button>`;
  function paint(){
    root.innerHTML = filtered.length ? filtered.slice(0,limit).map(card).join('') : '<p class="empty-state">No works in this state yet.</p>';
    if(pagination)pagination.innerHTML=`<span role="status">${Math.min(limit,filtered.length)} of ${filtered.length} works</span>${limit<filtered.length?'<button class="text-link" data-more>Show 24 more <span aria-hidden="true">↓</span></button><button class="quiet-link" data-all>Show all works</button>':'<span class="eyebrow">YOU’VE SEEN EVERY WORK IN THIS VIEW</span>'}${limit>initialLimit&&filtered.length>initialLimit?'<button class="quiet-link" data-less>Show less <span aria-hidden="true">↑</span></button>':''}`;
  }
  root.addEventListener('click', event => { const card = event.target.closest('[data-work]'); if (card) open(Number(card.dataset.work)); });
  pagination?.addEventListener('click',event=>{
    const more=event.target.closest('[data-more]'),all=event.target.closest('[data-all]'),less=event.target.closest('[data-less]');if(!more&&!all&&!less)return;
    if(less){
      limit=initialLimit;paint();
      root.closest('section')?.scrollIntoView({block:'start',behavior:'instant'});
      root.querySelector('[data-work]')?.focus({preventScroll:true});
      return;
    }
    const firstNew=limit;limit=all?filtered.length:limit+24;paint();
    root.querySelectorAll('[data-work]')[firstNew]?.focus({preventScroll:true});
  });
  return { render(items, route) {
    const nextKey=route.status+':'+route.sort;if(nextKey!==key){limit=initialLimit;key=nextKey;}
    filtered=sortCollection(items.filter(i=>route.status==='all'||phase(i)===route.status),route.sort);paint();return filtered;
  }};
}
