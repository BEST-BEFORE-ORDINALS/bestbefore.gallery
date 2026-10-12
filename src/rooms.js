import { escapeHtml } from './state.js';
import { imageMarkup, phase, timeLeft, statusChip, paletteHue } from './collection.js';

export function paletteRooms(items) {
  const groups = new Map();
  for (const item of items) {
    if (!['open','immortal'].includes(phase(item)) || !item.palette?.id) continue;
    const name = item.palette.id;
    if (!groups.has(name)) groups.set(name, {name, colors:item.palette.colors, items:[]});
    groups.get(name).items.push(item);
  }
  return [...groups.values()].sort((a,b)=>paletteHue(a.items[0])-paletteHue(b.items[0]) || a.name.localeCompare(b.name));
}
export function createRooms(root, open, navigate) {
  let groups=[], current=0;
  root.addEventListener('click', event=>{
    const button=event.target.closest('button,a');if(!button)return;
    if(button.dataset.roomWork&&!event.metaKey&&!event.ctrlKey&&!event.shiftKey&&!event.altKey){event.preventDefault();open(Number(button.dataset.roomWork));}
    if(button.dataset.roomStep){const next=(current+Number(button.dataset.roomStep)+groups.length)%groups.length;navigate(`/rooms?palette=${encodeURIComponent(groups[next].name)}`);}
  });
  root.addEventListener('change',event=>{if(event.target.matches('[data-room-select]'))navigate(`/rooms?palette=${encodeURIComponent(event.target.value)}`);});
  return { render(items,requested) {
    groups=paletteRooms(items);current=Math.max(0,groups.findIndex(g=>g.name===requested));
    const group=groups[current];
    if(!group){root.innerHTML='<p class="empty-state">No revealed palettes are available yet.</p>';return [];}
    root.innerHTML=`<header class="rooms-heading"><span class="eyebrow">ANOTHER WAY INTO THE COLLECTION</span><div><h1>A room for <br>every <em>palette.</em></h1><p>Shared colours. Separate lives. <br>Spend time with works that began<br>from the same palette.</p></div></header><div class="rooms-navigation"><span class="room-position">ROOM ${String(current+1).padStart(2,'0')} / ${String(groups.length).padStart(2,'0')}</span><label><span class="sr-only">Choose a palette room</span><select data-room-select>${groups.map(g=>`<option value="${escapeHtml(g.name)}" ${g.name===group.name?'selected':''}>${escapeHtml(g.name)} · ${g.items.length}</option>`).join('')}</select></label><div><button data-room-step="-1" aria-label="Previous palette">←</button><button data-room-step="1" aria-label="Next palette">→</button></div></div><div class="room-heading"><h2>${escapeHtml(group.name)}</h2><div class="room-swatches" aria-label="${escapeHtml(group.name)} palette">${group.colors.map(c=>`<span style="background:${c}"></span>`).join('')}</div><span>${group.items.length} living ${group.items.length===1?'work':'works'}</span></div><div class="room-works">${group.items.map(i=>`<a class="room-work" href="/work/${i.number}" data-room-work="${i.number}">${imageMarkup(i,'(max-width:700px) 70vw, 25vw')}<span class="room-work-caption"><span>Nº${String(i.number).padStart(3,'0')}</span>${statusChip(i)}</span><span class="room-time">${timeLeft(i)}</span></a>`).join('')}</div><div class="rooms-end"><p>These are the revealed, living works. <br>Sealed lives and expired works remain part of the full collection.</p><a class="text-link" href="/">Return to all 420 <span aria-hidden="true"><svg class="ui-arrow" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5 19 19 5M5 5h14v14"/></svg></span></a><a class="text-link" href="/process">How the visual came to life <span aria-hidden="true"><svg class="ui-arrow" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5 19 19 5M5 5h14v14"/></svg></span></a></div>`;
    return group.items;
  }};
}
