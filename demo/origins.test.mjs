import { test } from 'node:test';
import assert from 'node:assert/strict';
import { catalogCharacters, personalCharacters, originGroups, characterText, normalizePersonalText } from './origins.mjs';
const source={id:'s',title:'春曉',author:'孟浩然',body:'夜來風雨聲',verification:'verified'};
const entry={id:'w',text:'風雨',provenance:'quotation',sourceLinks:[{sourceId:'s',note:'節錄',excerpt:'夜來風雨聲'}]};
test('split characters keep the original word, exact character index and source snapshot',()=>{
 const chars=catalogCharacters(entry,{s:source});
 assert.equal(chars[1].char,'雨');assert.equal(chars[1].index,1);
 const group=originGroups([chars[1]])[0];
 assert.equal(group.originalWord,'風雨');assert.equal(group.sliced,true);assert.equal(group.links[0].source.title,'春曉');
});
test('merged or reversed words retain separate origins instead of claiming a new quotation',()=>{
 const a=catalogCharacters(entry,{s:source});const b=personalCharacters('我愛','personal-test');
 assert.equal(characterText([...b,...a]),'我愛風雨');
 assert.deepEqual(originGroups([...b,...a]).map(g=>g.type),['personal','catalog']);
 assert.equal(originGroups([a[1],a[0]]).length,2);
});
test('editing the catalog later cannot alter a word already picked',()=>{
 const sources={s:structuredClone(source)};const chars=catalogCharacters(entry,sources);
 sources.s.title='改過的書';assert.equal(originGroups(chars)[0].links[0].source.title,'春曉');
});
test('personal text has no fabricated source and is bounded plain text',()=>{
 assert.equal(originGroups(personalCharacters('我想你','x'))[0].links.length,0);
 assert.equal(normalizePersonalText(' 我\n想你 '),'我想你');
 assert.throws(()=>normalizePersonalText('字'.repeat(33)));
 assert.equal(characterText(personalCharacters('我🌿你','unicode')),'我🌿你');
});
