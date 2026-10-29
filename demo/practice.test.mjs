import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PracticeProgress,PRACTICE_STEPS,practiceMoveStart} from './practice.mjs';
test('practice advances only after the current operation and never counts a later operation early',()=>{
 const p=new PracticeProgress();p.record('merge');assert.equal(p.ready,false);assert.equal(p.next(),false);
 p.record('reveal');assert.equal(p.ready,true);assert.equal(p.next(),true);assert.equal(p.index,1);assert.equal(p.ready,false);
});
test('every step can be skipped and completion cannot continue into an invalid step',()=>{
 const p=new PracticeProgress();for(const step of PRACTICE_STEPS){assert.equal(p.finished,false);p.next(true);}
 assert.equal(p.finished,true);assert.equal(p.next(true),false);p.record('reveal');assert.equal(p.ready,false);
});
test('the final saving and sharing lesson is informational and can finish without generating content',()=>{
 const p=new PracticeProgress();while(p.index<PRACTICE_STEPS.length-1)p.next(true);
 assert.equal(PRACTICE_STEPS[p.index].action,'sharing-info');
 assert.equal(PRACTICE_STEPS[p.index].informational,true);
 assert.equal(p.next(),true);assert.equal(p.finished,true);
});

test('move practice starts outside the target with an inner margin at phone widths',()=>{
 for(const width of [264,326]){
  const size={w:36,h:80},target={x:width/2-45,y:150,w:90,h:110};
  const p=practiceMoveStart({field:{w:width,h:360},size,target});
  assert.ok(p.x>=24&&p.x+size.w<=width-24);assert.ok(p.y>=24&&p.y+size.h<=336);
  assert.ok(p.x+size.w<=target.x-12);
 }
});
