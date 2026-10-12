import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseDiary } from '../src/diary.js';
test('the full original diary retains its prelude and six parts',()=>{
  const text=readFileSync(new URL('../public/data/bb-diary.txt',import.meta.url),'utf8');
  const chapters=parseDiary(text);
  assert.deepEqual(chapters.map(c=>c.number),[0,1,2,3,4,5,6]);
  assert.match(chapters[0].text,/I want the work to be more human/);
  assert.match(chapters[1].text,/April 29, 2025/);
  assert.ok(chapters.every(c=>c.text.length>100));
});
