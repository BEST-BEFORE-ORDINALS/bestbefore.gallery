import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { paletteRooms } from '../src/rooms.js';
import { normalizeItems, phase } from '../src/collection.js';
import { parseCollectionRoute } from '../src/router.js';
const items=normalizeItems(JSON.parse(readFileSync(new URL('../public/data/collection.json',import.meta.url))));
test('palette rooms include every revealed living work exactly once',()=>{
  const groups=paletteRooms(items), actual=groups.flatMap(g=>g.items);
  const expected=items.filter(i=>['open','immortal'].includes(phase(i)) && i.palette?.id);
  assert.deepEqual(actual.map(i=>i.number).sort((a,b)=>a-b),expected.map(i=>i.number));
  assert.equal(new Set(actual.map(i=>i.number)).size,actual.length);
  assert.ok(groups.every(g=>g.items.length>0 && g.items.every(i=>i.palette.id===g.name)));
  assert.equal(paletteRooms([]).length,0);
});
test('editorial pages and named palette rooms have shareable routes',()=>{
  for(const view of ['process','exhibition','rooms','artists'])assert.equal(parseCollectionRoute(`#/${view}`).view,view);
  assert.equal(parseCollectionRoute('#/rooms?palette=Blue%20Sunset').palette,'Blue Sunset');
  assert.equal(parseCollectionRoute('#/rooms').palette,'');
});
