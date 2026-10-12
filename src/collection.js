import { escapeHtml } from './state.js';
export const phases = ['all', 'open', 'sealed', 'expired', 'immortal'];
export const phase = item => item.block?.immortal ? 'immortal' : item.status;
export const numberLabel = n => String(n).padStart(3, '0');
export const normalizeItems = feed => feed.inscriptions.map(item => {
  const number = Number(item.id.split('i').pop()) + 1;
  return { ...item, number, name: `BEST BEFORE Nº${number}`, status: item.phase.toLowerCase(),
    ordinalsUrl: `https://ordinals.com/inscription/${item.id}`, activation_block: item.block?.activation,
    lifespan_blocks: item.block?.lifespan, remaining_blocks: item.block?.remaining, immortal: !!item.block?.immortal };
}).sort((a,b) => a.number - b.number);
export const imageName = item => ['sealed', 'expired'].includes(item.status) ? item.status.toUpperCase() : `BESTBEFORE_${item.number}`;
let thumbnails = new Set();
export const setThumbnailManifest = names => { thumbnails = new Set(names); };
export const thumbnail = (item, width = 400) => thumbnails.has(imageName(item)) ? `/assets/thumbs/${imageName(item)}-${width}.webp` : `https://bestbefore.space/images/${imageName(item)}_800.webp`;
export const imageMarkup = (item, sizes = '(max-width: 600px) 45vw, (max-width: 1000px) 30vw, 16vw', eager = false) => `<img src="${thumbnail(item, 200)}" srcset="${[200,400,800].map(w=>`${thumbnail(item,w)} ${w}w`).join(', ')}" sizes="${sizes}" width="800" height="1422" loading="${eager ? 'eager' : 'lazy'}" decoding="async" alt="BEST BEFORE Nº${item.number}${item.palette?.id ? ` — ${escapeHtml(item.palette.id)}` : ` — ${phase(item)}`}" />`;
export const timeLeft = item => {
  if (phase(item) === 'immortal') return 'No expiry';
  if (item.status === 'sealed') return 'Awaiting activation';
  if (item.status === 'expired') return 'Life complete';
  const blocks = item.block?.remaining;
  if (blocks == null) return 'Time unavailable';
  const days = Math.max(0, blocks) / 144;
  return days >= 365 ? `≈ ${(days / 365.25).toFixed(1)} years left` : days >= 1 ? `≈ ${Math.floor(days)} days left` : `${Math.max(0, blocks).toLocaleString()} blocks left`;
};
export const paletteHue = item => {
  const hex = item.palette?.colors?.find(c => /^#[0-9a-f]{6}$/i.test(c));
  if (!hex) return 999;
  const [r,g,b] = [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);
  const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;
  if (!d) return 0;
  return ((max===r?(g-b)/d+(g<b?6:0):max===g?(b-r)/d+2:(r-g)/d+4)*60);
};
export const sortCollection = (items, sort) => [...items].sort((a,b) => {
  if (sort === 'palette') return paletteHue(a)-paletteHue(b) || (a.palette?.id || '').localeCompare(b.palette?.id || '') || a.number-b.number;
  if (sort === 'time' || sort === 'lifespan') {
    const value = i => phase(i)==='immortal'||i.status==='sealed' ? Infinity : (sort==='time'?i.block?.remaining:i.block?.lifespan) ?? Infinity;
    return value(a)-value(b) || a.number-b.number;
  }
  return a.number-b.number;
});
export const statusChip = item => `<span class="status-chip ${phase(item)}"><i></i>${phase(item)}</span>`;
