import {test} from 'node:test';
import assert from 'node:assert/strict';
import {nextFragment,relatedTopics,selectionFor,normalizeSignature,focusTopics,completeFragmentIds} from './policy.mjs';
const words=[{id:'eat',text:'好好吃飯',role:'wish'},{id:'walk',text:'慢慢走',role:'wish'},{id:'elder',text:'長輩',role:'audience'},{id:'child',text:'孩子',role:'audience'},{id:'with',text:'一起',role:'feeling'}];
test('first two reveals alternate wishes and people and never repeat visible words',()=>{
 assert.equal(nextFragment(words,[],0,()=>0).role,'wish');
 assert.equal(nextFragment(words,['eat'],1,()=>0).role,'audience');
 assert.notEqual(nextFragment(words,['eat','elder'],2,()=>0).id,'eat');
});
test('topic suggestions use both fragments, and never invent a missing policy',()=>{
 const topics=[{id:'teeth',wishes:['eat'],audiences:['elder']},{id:'lunch',wishes:['eat'],audiences:['child']}];
 assert.deepEqual(relatedTopics(topics,['eat','elder']).map(t=>t.id),['teeth']);
 assert.deepEqual(relatedTopics(topics,['walk','elder']),[]);
});
test('candidate selection retains missing records and marks single-person coverage',()=>{
 const data={topics:[{id:'teeth',records:[{candidateId:'a',status:'pledge'},{candidateId:'b',status:'uncollected'}]}],candidates:[{id:'a',name:'甲'},{id:'b',name:'乙'}]};
 assert.equal(selectionFor(data,'teeth',['b']).records[0].status,'uncollected');
 assert.equal(selectionFor(data,'teeth',['b']).partial,true);
 assert.equal(selectionFor(data,'teeth',['a','b']).partial,false);
 assert.throws(()=>selectionFor(data,'teeth',[]));
});
test('signature is bounded and cannot become a free-form letter',()=>{
 assert.equal(normalizeSignature('  小明  '),'小明');
 assert.throws(()=>normalizeSignature('字'.repeat(13)));
 assert.throws(()=>normalizeSignature('名\n字'));
});
test('policy codes narrow from a life need to age and identity, without manual choice',()=>{
 const pool=[{id:'eat',codes:['need:eating']},{id:'elder',codes:['age:senior']},{id:'child',codes:['age:child']}];
 const topics=[{id:'dentures',codes:['need:eating','age:senior']},{id:'lunch',codes:['need:eating','age:child']}];
 assert.equal(focusTopics(topics,pool,['eat']).length,2);
 assert.deepEqual(focusTopics(topics,pool,['eat','elder']).map(t=>t.id),['dentures']);
 assert.deepEqual(focusTopics(topics,pool,['eat','child']).map(t=>t.id),['lunch']);
});
test('a deleted letter no longer activates the complete fragment policy code',()=>{
 const origin={wordId:'elder',wordText:'長輩',id:'catalog:one'};
 const a={char:'長',index:0,origin},b={char:'輩',index:1,origin};
 assert.deepEqual(completeFragmentIds([{characters:[a]},{characters:[b]}]),['elder']);
 assert.deepEqual(completeFragmentIds([{characters:[a]}]),[]);
});
