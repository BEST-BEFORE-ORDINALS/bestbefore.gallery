import sharp from 'sharp';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const names=JSON.parse(await readFile(new URL('public/data/thumbnail-manifest.json',root)));
const out=new URL('public/assets/previews/',root);await mkdir(out,{recursive:true});
const queue=[...names];let count=0;
await Promise.all(Array.from({length:4},async()=>{
  while(queue.length){
    const name=queue.shift();
    let input;
    try{input=await readFile(new URL(`../image-cache/${name}.webp`,root));}
    catch{input=await readFile(new URL(`public/assets/thumbs/${name}-800.webp`,root));}
    for(const width of [200,400,600,800]){
      const bytes=await sharp(input).resize({width,withoutEnlargement:true}).avif({quality:40,effort:4}).toBuffer();
      await writeFile(new URL(`${name}-${width}.avif`,out),bytes);
    }
    if(++count%20===0)console.log(`${count}/${names.length} previews`);
  }
}));
