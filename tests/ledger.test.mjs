import test from 'node:test';
import assert from 'node:assert/strict';
import { renderLedger } from '../src/ledger.js';
const items=[{number:1,status:'sealed'},{number:2,status:'open',remaining_blocks:100},{number:3,status:'open',immortal:true},{number:4,status:'expired'}];
test('Ledger categories are exclusive even when feed open counts include immortals',()=>{
 const html=renderLedger({counts:{total:4,open:2,sealed:1,expired:1,immortal:1}},items,{tip:100});
 for(const phase of ['open','sealed','expired','immortal']){
  const card=html.match(new RegExp(`data-ledger-status="${phase}"[\\s\\S]*?</a>`))[0];
  assert.match(card,/<strong class="bb-ledger-kpi-value">1<\/strong>/);
 }
});
test('Ledger snapshot remains usable without live analytics or block metadata',()=>{
 const html=renderLedger(null,items);
 assert.match(html,/SAVED SNAPSHOT/);
 assert.match(html,/BLOCK —/);
 assert.match(html,/Activation history/);
 assert.match(html,/data-bb-number="2"/);
 assert.doesNotMatch(html,/\/block\/0/);
});
