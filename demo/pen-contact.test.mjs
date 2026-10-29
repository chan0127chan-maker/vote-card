import {test} from 'node:test';
import assert from 'node:assert/strict';
import {penInputContact} from './pen-contact.mjs';
function setup(){const jobs=[],ready=[],feedback=[];const contact=penInputContact({onReady:id=>ready.push(id),onFeedback:v=>feedback.push(v),schedule:(fn,ms)=>{const job={fn,ms};jobs.push(job);return job;},cancel:job=>{job.cancelled=true;}});return{contact,jobs,ready,feedback};}
test('crossing the input bar gives feedback but never freezes the pen or opens input',()=>{
 const {contact,jobs,ready,feedback}=setup();contact.track(1,true);
 assert.deepEqual(ready,[]);assert.deepEqual(feedback,[true]);assert.equal(jobs[0].ms,650);
 contact.track(1,false);assert.equal(jobs[0].cancelled,true);jobs[0].fn();assert.deepEqual(ready,[]);assert.deepEqual(feedback,[true,false]);
});
test('only a sustained visit opens input; leaving and re-entering starts a fresh dwell',()=>{
 const {contact,jobs,ready}=setup();contact.track(1,true);contact.track(1,true);assert.equal(jobs.length,1);
 contact.track(1,false);contact.track(1,true);jobs[0].fn();assert.deepEqual(ready,[]);
 jobs[1].fn();assert.deepEqual(ready,[1]);contact.clear();
});
