import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sheetMotion } from './sheet-motion.mjs';
function fixture(reduce=false){
 const animations=[],listeners={},classes=new Set();
 const sheet={open:false,querySelectorAll:()=>[],style:{setProperty(){}},ownerDocument:{addEventListener:(name,fn)=>listeners['document:'+name]=fn,defaultView:{getComputedStyle:()=>({opacity:'.6',transform:'matrix(1,0,0,1,0,5)'})}},
  classList:{add:n=>classes.add(n),remove:n=>classes.delete(n)},
  showModal(){this.open=true;},close(){this.open=false;listeners.close?.();},addEventListener(n,fn){listeners[n]=fn;},
  animate(){let resolve,reject;const finished=new Promise((a,b)=>{resolve=a;reject=b;});const a={finished,cancel:()=>reject(new Error('cancelled')),finish:()=>resolve()};animations.push(a);return a;}};
 return {sheet,animations,listeners,motion:sheetMotion(sheet,typeof reduce==='object'?reduce:{matches:reduce})};
}
test('closing keeps the dialog modal until its fade finishes; Escape uses the same path',async()=>{
 const f=fixture();f.motion.open();let prevented=false;
 f.listeners.cancel({preventDefault(){prevented=true;}});
 assert.ok(prevented&&f.sheet.open&&f.sheet.inert);
 f.animations.at(-1).finish();await Promise.resolve();await Promise.resolve();
 assert.equal(f.sheet.open,false);
});
test('reopening during exit cannot be closed by the previous completion',async()=>{
 const f=fixture();f.motion.open();f.motion.close();const exit=f.animations.at(-1);
 f.motion.open();exit.finish();await Promise.resolve();await Promise.resolve();
 assert.equal(f.sheet.open,true);
 f.motion.close(true);assert.equal(f.sheet.open,false);
});
test('reduced motion opens and closes immediately without running animations',()=>{
 const f=fixture(true);f.motion.open();assert.ok(f.sheet.open);
 f.motion.close();assert.equal(f.sheet.open,false);assert.equal(f.animations.length,0);
});
test('the pointer gesture that opens a dialog cannot immediately dismiss it through the backdrop',()=>{
 const f=fixture(true);f.motion.open({pointerId:7,fromPointer:true});
 f.motion.outside();assert.ok(f.sheet.open);
 f.listeners['document:pointerup']({pointerId:7});f.motion.outside();assert.ok(f.sheet.open);
 f.motion.close();assert.equal(f.sheet.open,false);
});

test('enabling reduced motion during exit closes immediately without a stale completion',async()=>{
 let changed;const preference={matches:false,addEventListener:(name,fn)=>{changed=fn;}};
 const f=fixture(preference);f.motion.open();f.motion.close();assert.equal(f.sheet.open,true);
 preference.matches=true;changed();assert.equal(f.sheet.open,false);
 f.animations.at(-1).finish();await Promise.resolve();assert.equal(f.sheet.open,false);
});
