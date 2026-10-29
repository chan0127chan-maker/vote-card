import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitCharacters, joinTokens, inDiscardZone, flickIntent, spatialOrder, dropAction } from './actions.mjs';
test('double tap can separate all characters, without dropping any',()=>{
 assert.deepEqual(splitCharacters('藏很久的'),['藏','很','久','的']);
 assert.deepEqual(splitCharacters('的'),['的']);
});
test('the incoming text is appended below the target, never sorted',()=>{
 assert.equal(joinTokens('愛','我'),'愛我');
 assert.equal(joinTokens('我','愛'),'我愛');
 assert.equal(joinTokens('想說','藏很久的'),'想說藏很久的');
 assert.equal(joinTokens('字'.repeat(20),'句'.repeat(12)).length,32);
});
const stage={left:20,right:370,top:80,bottom:760};
test('only the bottom discard area accepts a slow drop',()=>{
 assert.ok(inDiscardZone({x:150,y:750},stage));
 assert.equal(inDiscardZone({x:150,y:500},stage),false);
});
test('a fast outward flick discards, but a quick move inside or a paused drag does not',()=>{
 const start={x:180,y:300};
 assert.ok(flickIntent({start,end:{x:360,y:310},velocity:{x:1.8,y:.1},stage}));
 assert.equal(flickIntent({start,end:{x:260,y:310},velocity:{x:1.8,y:.1},stage}),false);
 assert.equal(flickIntent({start,end:{x:360,y:310},velocity:{x:0,y:0},stage}),false);
});
test('free placement retains a vertical reading order without moving the items',()=>{
 const a={text:'我',x:160,y:30,w:40},b={text:'想',x:165,y:100,w:40},c={text:'你',x:40,y:20,w:40};
 assert.deepEqual(spatialOrder([c,b,a]),[a,b,c]);
 assert.equal(a.x,160);
});
test('an intentional overlap merges even near an edge; the discard zone remains explicit',()=>{
 const input={start:{x:180,y:300},end:{x:360,y:310},velocity:{x:2,y:0},stage,hasTarget:true};
 assert.equal(dropAction(input),'merge');
 assert.equal(dropAction({...input,end:{x:200,y:750}}),'discard');
});
