import {test} from 'node:test';
import assert from 'node:assert/strict';
import {resolvePenDrop,inPenGroove,penIntent,tipInGroove,armPenReturn} from './pen-state.mjs';
test('a pen released outside the groove stays at its accumulated position',()=>{
 const first=resolvePenDrop({offset:{x:0,y:0},delta:{x:30,y:-160},overRest:false,hasWords:true});
 assert.deepEqual(first,{dock:false,offset:{x:30,y:-160}});
 const second=resolvePenDrop({offset:first.offset,delta:{x:-10,y:40},overRest:false,hasWords:true});
 assert.deepEqual(second,{dock:false,offset:{x:20,y:-120}});
});
test('returning to the groove resets the pose and requests composition only when words exist',()=>{
 assert.deepEqual(resolvePenDrop({offset:{x:30,y:-160},delta:{x:-30,y:160},overRest:true,hasWords:true}),{dock:true,offset:{x:0,y:0}});
 assert.equal(resolvePenDrop({offset:{x:0,y:0},delta:{x:0,y:0},overRest:true,hasWords:false}).dock,false);
});
test('groove detection follows the visible horizontal pen rather than transparent button boxes',()=>{
 const groove={left:20,top:500,width:300,height:26};
 assert.equal(inPenGroove({left:35,top:503,width:270,height:20},groove),true);
 assert.equal(inPenGroove({left:35,top:443,width:270,height:20},groove),false);
 assert.equal(inPenGroove({left:180,top:503,width:270,height:20},groove),false);
});

test('returning to the groove takes priority over a nearby input trigger',()=>{
 assert.equal(penIntent({overRest:true,hasWords:true,atInput:true}),'dock');
 assert.equal(penIntent({overRest:false,hasWords:true,atInput:true}),'compose');
 assert.equal(penIntent({overRest:false,hasWords:true,atInput:false}),'place');
});

test('touching the groove with the tip is enough even when the grip remains far away',()=>{
 const groove={left:20,top:500,width:300,height:26},pen={left:80,top:260,width:84,height:84};
 assert.equal(inPenGroove(pen,groove,{x:70,y:500}),true);
 assert.equal(tipInGroove({x:70,y:500},groove),true);
 assert.equal(tipInGroove({x:70,y:470},groove),false);
});

test('lifting the tip across its original groove must not immediately put the pen away',()=>{
 const groove={left:20,top:500,width:300,height:26};
 assert.equal(armPenReturn(false,{left:20,top:390,width:300,height:84},groove,{x:130,y:510}),false);
 assert.equal(armPenReturn(false,{left:20,top:350,width:300,height:84},groove,{x:130,y:460}),true);
 assert.equal(armPenReturn(true,{left:20,top:470,width:300,height:84},groove,{x:130,y:510}),true);
});
test('horizontal pen layout never auto-docks on a drag release even inside the groove',()=>{
 const drop=resolvePenDrop({offset:{x:10,y:-30},delta:{x:-5,y:20},overRest:true,hasWords:true,manualDock:true});
 assert.deepEqual(drop,{dock:false,offset:{x:5,y:-10}});
 assert.equal(penIntent({overRest:true,hasWords:true,atInput:false,manualDock:true}),'place');
});
