import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { normalizeItems, phase, sortCollection } from '../src/collection.js';
import { parseCollectionRoute } from '../src/router.js';
import { zoomAt } from '../src/canvas.js';
const feed=JSON.parse(readFileSync(new URL('../public/data/collection.json',import.meta.url)));
const items=normalizeItems(feed);
test('all 420 identities survive normalization and phases are exclusive',()=>{
  assert.equal(items.length,420);assert.equal(new Set(items.map(i=>i.number)).size,420);
  assert.equal(items[0].number,1);assert.equal(items.at(-1).number,420);
  const total=['sealed','open','expired','immortal'].reduce((sum,p)=>sum+items.filter(i=>phase(i)===p).length,0);
  assert.equal(total,420);assert.ok(items.filter(i=>phase(i)==='immortal').every(i=>i.block.immortal));
});
test('collection routes validate filters, sorts and work links',()=>{
  assert.deepEqual(parseCollectionRoute('#/canvas?arrange=palette'),{view:'canvas',work:null,status:'all',sort:'number',arrange:'palette'});
  assert.equal(parseCollectionRoute('#/grid?status=open&sort=time').sort,'time');
  assert.equal(parseCollectionRoute('#/work/128').work,128);
  assert.equal(parseCollectionRoute('#/grid?status=bad&sort=bad').status,'all');
  assert.equal(parseCollectionRoute('#/canvas?arrange=bad').arrange,'number');
});
test('time sort puts completed works first and immortals/sealed at the end',()=>{
  const sorted=sortCollection(items,'time');assert.equal(sorted[0].status,'expired');
  const open=sorted.filter(i=>phase(i)==='open');
  assert.ok(open.every((i,n)=>n===0||i.block.remaining>=open[n-1].block.remaining));
  assert.equal(sortCollection(items,'number')[127].number,128);
});
test('cursor-relative zoom preserves its world point even at zoom bounds',()=>{
  const camera={x:-500,y:140,scale:.65},x=180,y=420;
  for(const factor of [.001,.5,2,100]){const next=zoomAt(camera,factor,x,y);assert.ok(Math.abs((x-next.x)/next.scale-(x-camera.x)/camera.scale)<1e-8);assert.ok(Math.abs((y-next.y)/next.scale-(y-camera.y)/camera.scale)<1e-8);assert.ok(next.scale>=.08&&next.scale<=2.5);}
});
test('all current preview tiers exist and fit the image budget',()=>{
  const root=new URL('../public/assets/thumbs/',import.meta.url);
  const names=JSON.parse(readFileSync(new URL('../public/data/thumbnail-manifest.json',import.meta.url)));
  for(const name of names)for(const size of [96,200,400,800])assert.ok(statSync(new URL(`${name}-${size}.webp`,root)).size<=300000);
  assert.ok(statSync(new URL('../public/assets/social-preview.png',import.meta.url)).size<500000);
  assert.equal(readdirSync(root).length,names.length*4);
});

test('diary routes support all six chapters and validate the part query',()=>{
  assert.equal(parseCollectionRoute('#/diary').view,'diary');
  assert.equal(parseCollectionRoute('#/diary?part=5').part,5);
  assert.equal(parseCollectionRoute('#/diary?part=99').part,6);
  assert.equal(parseCollectionRoute('#/diary?part=bad').part,0);
});
