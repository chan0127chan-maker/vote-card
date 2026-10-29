import {test} from 'node:test';
import assert from 'node:assert/strict';
import {postmarkMotion} from './postmark-motion.mjs';
function setup(reduced){
 const oldDoc=globalThis.document,oldStyle=globalThis.getComputedStyle,attrs=new Map([['hidden','']]),animations=[];
 const svg={dataset:{},replaceChildren(){},append(){},setAttribute:(k,v)=>attrs.set(k,v),removeAttribute:k=>attrs.delete(k),hasAttribute:k=>attrs.has(k),animate(){let resolve,reject;const a={finished:new Promise((a,b)=>{resolve=a;reject=b;}),cancel:()=>reject(Error('cancelled')),finish:()=>resolve()};animations.push(a);return a;}};
 globalThis.document={createElementNS:()=>({setAttribute(){}})};globalThis.getComputedStyle=()=>({opacity:'1'});
 return{svg,animations,motion:postmarkMotion(svg,{matches:reduced}),restore(){globalThis.document=oldDoc;globalThis.getComputedStyle=oldStyle;}};
}
test('a seal changes the actual SVG hidden attribute, including reduced motion',()=>{
 const h=setup(true);try{h.motion.show({savedAt:'2026-10-29T00:00:00Z'});assert.equal(h.svg.hasAttribute('hidden'),false);assert.equal(h.svg.dataset.sealed,'true');h.motion.hide();assert.equal(h.svg.hasAttribute('hidden'),true);}finally{h.restore();}
});
test('a stamp returning during fade cannot be hidden by the old fade completion',async()=>{
 const h=setup(false);try{h.motion.show({savedAt:'2026-10-29T00:00:00Z'});h.motion.hide();const oldFade=h.animations[1];h.motion.show({savedAt:'2026-10-29T01:00:00Z'});oldFade.finish();await Promise.resolve();assert.equal(h.svg.hasAttribute('hidden'),false);assert.equal(h.svg.dataset.sealed,'true');}finally{h.restore();}
});
