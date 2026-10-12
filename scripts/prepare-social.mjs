import sharp from 'sharp';
import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { normalizeItems,imageName } from '../src/collection.js';
import { escapeHtml } from '../src/state.js';
import { sectionMeta,diaryTitles } from '../src/seo.js';
const root=new URL('../',import.meta.url),out=new URL('public/assets/social/',root);await mkdir(out,{recursive:true});
const feed=JSON.parse(await readFile(new URL('public/data/collection.json',root))),items=normalizeItems(feed);
const logo=await sharp(new URL('public/assets/logo/bb-original-256.webp',root).pathname).resize(76,76).png().toBuffer();
const jobs=items.map(item=>({key:`work-${item.number}`,item,title:`Nº${String(item.number).padStart(3,'0')}`,subtitle:item.palette?.id||'A life on Bitcoin',label:'420 WORKS · LEMONHAZE × ORDINALLY'}));
const sectionWork={faq:233,grid:139,rooms:402,diary:139,process:133,exhibition:189,ledger:402,artists:139,about:402,canvas:189};
for(const [key,[title]] of Object.entries(sectionMeta))jobs.push({key,item:items.find(i=>i.number===sectionWork[key]),title:key==='grid'?'What if art':'BEST BEFORE',subtitle:key==='grid'?'could expire?':title,label:'LEMONHAZE × ORDINALLY'});
for(let i=1;i<=6;i++)jobs.push({key:`diary-${i}`,item:items.find(candidate=>candidate.number===[139,402,133,189,233,315][i-1]),title:`The diary / 0${i}`,subtitle:diaryTitles[i],label:'BEST BEFORE · LEMONHAZE × ORDINALLY'});
function textLines(text){
  const words=text.split(' '),lines=[''];
  for(const word of words){const i=lines.length-1;if((lines[i]+' '+word).trim().length>30)lines.push(word);else lines[i]=(lines[i]+' '+word).trim();}
  return lines.slice(0,3);
}
async function renderCard(job){
  const name=imageName(job.item),bytes=await readFile(new URL(`public/assets/thumbs/${name}-800.webp`,root));
  const artwork=await sharp(bytes).resize({width:290,height:516,fit:'cover'}).png().toBuffer();
  const lines=textLines(job.subtitle).map((line,i)=>`<text x="64" y="${345+i*43}" font-size="34" fill="#b8c1ac">${escapeHtml(line)}</text>`).join('');
  const svg=Buffer.from(`<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg"><rect width="1200" height="630" fill="#111210"/><g font-family="Helvetica,Arial,sans-serif"><text x="163" y="93" fill="#e8eddf" font-size="28" letter-spacing="1">BEST BEFORE</text><text x="164" y="120" fill="#98a28d" font-size="13" letter-spacing="2">${escapeHtml(job.label)}</text><path d="M64 171H693" stroke="#3b4134"/><text x="60" y="283" fill="#e8eddf" font-size="${job.key.startsWith('work-')?104:70}" letter-spacing="-3">${escapeHtml(job.title)}</text>${lines}<text x="64" y="540" fill="#a6b296" font-size="17" letter-spacing="1.8">INSCRIBED FOREVER. ALIVE FOR A MOMENT.</text><text x="64" y="577" fill="#79816e" font-size="15" letter-spacing="1">BESTBEFORE.GALLERY</text></g></svg>`);
  const card=await sharp(svg).composite([{input:logo,left:64,top:60},{input:artwork,left:809,top:58}]).jpeg({quality:86,mozjpeg:true}).toBuffer();
  if(card.length>500000)throw Error(`${job.key}: social card too large`);
  await writeFile(new URL(`${job.key}.jpg`,out),card);
}
const queue=[...jobs];await Promise.all(Array.from({length:4},async()=>{while(queue.length)await renderCard(queue.shift());}));
console.log(`Generated ${jobs.length} artwork and section social cards.`);
