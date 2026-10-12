import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {parseHTML} from 'linkedom';
import {routeUrl,parseCollectionRoute} from '../src/router.js';
import {pageMetadata,structuredData,diaryDescriptions} from '../src/seo.js';
import {normalizeItems} from '../src/collection.js';
import {parseDiary,renderDiaryMarkup} from '../src/diary.js';
const items=normalizeItems(JSON.parse(readFileSync(new URL('../public/data/collection.json',import.meta.url))));
test('historic and clean routes preserve work identity and collection query state',()=>{
  for(const [from,to]of [['#/grid?status=open&sort=time','/?status=open&sort=time'],['#/work/133','/work/133'],['/133','/work/133'],['#/diary?part=2','/diary/2'],['/diary/6/','/diary/6'],['/rooms?palette=Blue%20Sunset','/rooms?palette=Blue+Sunset']])assert.equal(routeUrl(from),to);
  assert.equal(parseCollectionRoute('/diary/2').part,2);
  assert.equal(parseCollectionRoute('/work/233').work,233);
});
test('all 420 works have unique canonicals, titles, artwork entities and lightweight cards',()=>{
  const urls=new Set(),titles=new Set();
  for(const item of items){
    const meta=pageMetadata({view:'grid',work:item.number},items);
    urls.add(meta.url);titles.add(meta.title);
    assert.equal(meta.path,`/work/${item.number}`);
    assert.equal(structuredData(meta)['@graph'][1].mainEntity.sameAs,item.ordinalsUrl);
    assert.ok(statSync(new URL(`../public/assets/social/work-${item.number}.jpg`,import.meta.url)).size<500000);
  }
  assert.equal(urls.size,420);assert.equal(titles.size,420);
});
test('each diary page contains its own full chapter and only chapter two has the LLM note',()=>{
  const chapters=parseDiary(readFileSync(new URL('../public/data/bb-diary.txt',import.meta.url),'utf8'));
  assert.equal(new Set(diaryDescriptions).size,7);
  for(let part=0;part<=6;part++){
    const {document}=parseHTML(renderDiaryMarkup(chapters,part));
    assert.equal(document.querySelectorAll('.diary-chapter').length,1);
    assert.equal(document.querySelector('.diary-chapter').id,`diary-part-${part}`);
    assert.equal(document.querySelectorAll('.diary-making-note').length,part===2?1:0);
    assert.equal(document.querySelectorAll('.diary-index a[data-diary-part]').length,7);
  }
});

test('FAQ is a clean indexable route with sixteen readable disclosures',async()=>{
  const {renderFaq,faqGroups}=await import('../src/faq.js');
  assert.equal(parseCollectionRoute('/faq').view,'faq');
  const meta=pageMetadata(parseCollectionRoute('/faq'));
  assert.equal(meta.url,'https://bestbefore.gallery/faq');
  assert.equal(meta.noindex,false);
  const {document}=parseHTML(renderFaq());
  assert.equal(document.querySelectorAll('details').length,16);
  assert.equal(document.querySelectorAll('summary').length,16);
  assert.equal(faqGroups.flatMap(g=>g.items).length,16);
  assert.equal(document.querySelector('#faq-activate').hasAttribute('open'),true);
  assert.match(document.querySelector('#faq-who').textContent,/control of the parent inscription/);
  assert.equal(document.querySelector('#faq-activate a').href,'https://inscribe.dev/');
  assert.ok(statSync(new URL('../public/assets/social/faq.jpg',import.meta.url)).size<500000);
});
