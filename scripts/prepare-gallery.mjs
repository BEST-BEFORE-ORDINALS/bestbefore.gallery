import sharp from 'sharp';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const out = new URL('public/assets/thumbs/', root);
const cache = new URL('../image-cache/', root);
await mkdir(out, { recursive: true }); await mkdir(cache, { recursive: true });
const response = await fetch('https://bestbefore.space/best-before.json');
if (!response.ok) throw new Error('Collection feed unavailable');
const feed = await response.json();
const items = feed.inscriptions.map(({ id, phase, palette, block, address, signature }) => ({ id, phase, palette, block, address, signature }));
await writeFile(new URL('public/data/collection.json', root), JSON.stringify({ generated_at: feed.generated_at, tip: feed.tip, inscriptions: items }));
const names = ['SEALED', 'EXPIRED', ...items.filter(i => i.phase === 'OPEN').map(i => `BESTBEFORE_${Number(i.id.split('i').pop()) + 1}`)];
let done = 0;
async function process(name) {
  const file = new URL(`${name}.webp`, cache);
  let bytes;
  try { bytes = await readFile(file); } catch {
    const res = await fetch(`https://bestbefore.space/images/${name}_800.webp`);
    if (!res.ok) throw new Error(`Image unavailable: ${name}`);
    bytes = Buffer.from(await res.arrayBuffer()); await writeFile(file, bytes);
  }
  for (const width of [96, 200, 400, 800]) {
    let quality = width === 800 ? 76 : 72;
    let image = await sharp(bytes).resize({ width, withoutEnlargement: true }).webp({ quality }).toBuffer();
    while (image.length > 300000 && quality > 5) { quality -= 8; image = await sharp(bytes).resize({ width }).webp({ quality }).toBuffer(); }
    await writeFile(new URL(`${name}-${width}.webp`, out), image);
  }
  console.log(`${++done}/${names.length} ${name}`);
}
const queue = [...names];
await Promise.all(Array.from({ length: 6 }, async () => { while (queue.length) await process(queue.shift()); }));
await writeFile(new URL('public/data/thumbnail-manifest.json', root), JSON.stringify(names));
// Palette PNG remains compatible with social crawlers and under 500 KB.
let social;
for (const colours of [128, 64, 32, 16]) {
  social = await sharp(new URL('public/assets/social-preview.png', root).pathname).resize({ width: 1200 }).png({ palette: true, colours, dither: 0 }).toBuffer();
  if (social.length < 500000) break;
}
if (social.length > 500000) throw new Error('Social image exceeds 500 KB');
await writeFile(new URL('public/assets/social-preview.png', root), social);
console.log(`Social preview: ${social.length} bytes`);
