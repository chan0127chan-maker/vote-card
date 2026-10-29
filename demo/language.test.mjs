import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEXICON, createLanguageHistory, createLanguageRound, drawFragment, suggestedOrder } from './language.mjs';
const feat = { tempo: .5, reach: .5, axis: .5 };
const seeded = seed => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const drawAll = (round, rng) => Array.from({length:8}, () => drawFragment(round, feat, rng));
test('every editable fragment stays two to four characters', () => {
  assert.ok(LEXICON.length >= 24);
  for (const unit of LEXICON) for (const text of [unit.opening, ...unit.endings]) {
    assert.ok([...text].length >= 2 && [...text].length <= 4, text);
  }
});
test('a round draws eight independent fragments across at least three kinds', () => {
  for (let seed = 1; seed <= 80; seed++) {
    const rng=seeded(seed), round=createLanguageRound(feat,rng), words=drawAll(round,rng);
    assert.equal(new Set(words.map(w=>w.text)).size,8);
    assert.ok(new Set(words.map(w=>w.kind)).size>=3);
    assert.equal(drawFragment(round,feat,rng),null);
  }
});
test('consecutive rounds do not recycle the previous eight words', () => {
  const rng=seeded(5), history=createLanguageHistory(), signatures=new Set();
  let previous=[];
  for(let i=0;i<100;i++) {
    const round=createLanguageRound(feat,rng,history), words=drawAll(round,rng);
    assert.ok(words.every(w=>!previous.includes(w.text)));
    signatures.add(words.map(w=>w.text).sort().join('/'));
    previous=words.map(w=>w.text);
  }
  assert.equal(signatures.size,100);
  assert.ok(history.recentWords.length<=96 && history.recentUnits.length<=24);
});
test('the rest has more than a two-way cycle and never invents words', () => {
  const rng=seeded(12), round=createLanguageRound(feat,rng), words=drawAll(round,rng), seen=new Set();
  for(let version=0;version<12;version++) {
    const ordered=suggestedOrder(words,round,version);
    assert.deepEqual(new Set(ordered),new Set(words));
    seen.add(ordered.map(w=>w.text).join('/'));

  }
  assert.equal(seen.size,12);
});
test('partial rounds keep only the words already drawn', () => {
  const rng=seeded(20), round=createLanguageRound(feat,rng);
  const words=Array.from({length:3},()=>drawFragment(round,feat,rng));
  assert.deepEqual(new Set(suggestedOrder(words,round)),new Set(words));
});
test('published catalogs and single-word draft previews keep their source records',()=>{
 const entry={id:'culture',text:'風雨',kind:'image',tags:['weather'],weight:3,provenance:'quotation',sourceLinks:[{sourceId:'spring'}]};
 const round=createLanguageRound(feat,seeded(3),createLanguageHistory(),[entry]);
 const word=drawFragment(round,feat);
 assert.equal(word.text,'風雨');assert.equal(word.catalogEntry.id,'culture');
 assert.equal(drawFragment(round,feat),null);
 assert.equal(createLanguageRound(feat,seeded(4),createLanguageHistory(),[]).remaining.length,0);
});
