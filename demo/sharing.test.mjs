import {test} from 'node:test';
import assert from 'node:assert/strict';
import {attachSharing} from './sharing.mjs';
test('practice sharing previews a message without creating a saved letter',async()=>{
 const previous={document:globalThis.document,matchMedia:globalThis.matchMedia,fetch:globalThis.fetch};
 const nodes=new Map(),seen=[];let requests=0;
 const el=id=>{if(!nodes.has(id))nodes.set(id,{ownerDocument:globalThis.document,hidden:false,value:'',disabled:false,classList:{toggle(){}},addEventListener(type,fn){this[type]=fn;},setAttribute(){},animate(){return {finished:Promise.resolve()};}});return nodes.get(id);};
 globalThis.document={getElementById:el,createElement:()=>({setAttribute(){},append(){},addEventListener(){}}),addEventListener(){}};el('image-details').prepend=()=>{};globalThis.matchMedia=()=>({matches:true});globalThis.fetch=async()=>{requests++;throw Error('practice must not upload');};
 try{
  attachSharing({practice:true,prepareOpen(){},getSnapshot(){return{};},onAction:a=>seen.push(a)});
  await el('choose-message').click();
  assert.equal(requests,0);assert.deepEqual(seen,['share-preview']);
  assert.match(el('share-text').value,/教學預覽/);assert.equal(el('share-text').readOnly,true);
  assert.equal(el('copy-share').hidden,true);assert.equal(el('share-result').hidden,false);
 }finally{Object.assign(globalThis,previous);}
});
function sharingHarness(clipboard){
 const old=new Map(['document','matchMedia','fetch','navigator','location','getComputedStyle'].map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
 const nodes=new Map();
 const el=id=>{if(!nodes.has(id))nodes.set(id,{ownerDocument:globalThis.document,hidden:true,open:false,attributes:new Map([['hidden','']]),dataset:{},style:{setProperty(){}},classList:{toggle(){},add(){},remove(){}},addEventListener(type,fn){this[type]=fn;},setAttribute(k,v){this.attributes.set(k,v);},removeAttribute(k){this.attributes.delete(k);},hasAttribute(k){return this.attributes.has(k);},replaceChildren(){},append(){},showModal(){this.open=true;},focus(){},select(){}});return nodes.get(id);};
 const globals={document:{getElementById:el,createElement:()=>({setAttribute(){},append(){},addEventListener(){}}),addEventListener(){},createElementNS:()=>({setAttribute(){}})},getComputedStyle:()=>({opacity:'1'}),matchMedia:()=>({matches:true}),fetch:async()=>({ok:true,json:async()=>({data:{id:'a'.repeat(32),createdAt:'2026-10-29T00:00:00Z',expiresAt:'2027-04-29T00:00:00Z'}})}),navigator:{clipboard:{writeText:clipboard}},location:{href:'http://localhost:4173/',hostname:'localhost'}};
 for(const [key,value]of Object.entries(globals))Object.defineProperty(globalThis,key,{value,writable:true,configurable:true});
 el('image-details').prepend=()=>{};
 const sharing=attachSharing({prepareOpen(){},getSnapshot:()=>({width:320,height:480,tokens:[{characters:[{char:'我'}],glyphs:[{x:.5,y:.5}]}]})});
 return{el,sharing,restore(){for(const [key,descriptor]of old){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}}};
}
test('clipboard failure keeps the draft unsealed and offers a manual copy fallback',async()=>{
 const h=sharingHarness(async()=>{throw Error('denied');});
 try{h.el('share').click();await h.el('choose-message').click();await h.el('copy-share').click();assert.equal(h.el('draft-postmark').dataset.sealed,undefined);assert.equal(h.el('share-confirmation').hidden,true);assert.match(h.el('share-message').textContent,/尚未複製/);}finally{h.restore();}
});
test('a copy completing after editing cannot stamp the edited draft',async()=>{
 let finish;const h=sharingHarness(()=>new Promise(resolve=>{finish=resolve;}));
 try{h.el('share').click();await h.el('choose-message').click();const pending=h.el('copy-share').click();h.sharing.edited();finish();await pending;assert.equal(h.el('draft-postmark').dataset.sealed,undefined);assert.match(h.el('share-message').textContent,/先前版本/);}finally{h.restore();}
});

test('a saved draft rejects edit requests until its postmark is explicitly clicked',async()=>{
 const h=sharingHarness(async()=>{});
 try{
  h.el('share').click();await h.el('choose-message').click();await h.el('copy-share').click();
  assert.equal(h.sharing.isLocked(),true);assert.equal(h.sharing.requestEdit(),false);assert.equal(h.sharing.edited(),false);
  assert.match(h.el('version-hint').textContent,/點郵戳解除鎖定/);assert.equal(h.el('draft-postmark').dataset.sealed,'true');
  h.el('unlock-version').click();assert.equal(h.sharing.isLocked(),false);assert.equal(h.sharing.requestEdit(),true);assert.equal(h.sharing.edited(),true);
 }finally{h.restore();}
});
