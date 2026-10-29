import {policyStrip} from './policy-panel.mjs';
import {capturePolicyVisual} from './print-layout.mjs';
import {drawPolicyCard} from './policy-art.mjs';
import {imageBlob} from './letter-art.mjs';
import {drawCover} from './postcard.mjs';
export function attachReaderPolicy(scene){
 const paper=document.querySelector('.letter-page'),panel=policyStrip(scene.policy);paper.append(panel);
 new ResizeObserver(()=>paper.style.setProperty('--policy-height',panel.getBoundingClientRect().height+'px')).observe(panel);
 const button=document.createElement('button');button.textContent='議題回應';button.className='letter-policy-button';button.addEventListener('click',()=>panel.scrollIntoView({block:'nearest',behavior:'smooth'}));document.querySelector('.letter-tools').prepend(button);
 const hit=document.createElement('button');hit.className='reader-policy-hit';hit.setAttribute('aria-label','看看這張信聚焦的議題');hit.addEventListener('click',()=>panel.scrollIntoView({block:'nearest',behavior:'smooth'}));document.querySelector('.letter-frame').append(hit);
 const save=document.createElement('button');save.textContent='存成圖片';save.addEventListener('click',async()=>{save.disabled=true;try{const canvas=document.createElement('canvas');if(paper.classList.contains('cover-visible'))await drawCover(canvas,scene.format);else await drawPolicyCard(canvas,scene,capturePolicyVisual(panel));const url=URL.createObjectURL(await imageBlob(canvas)),a=document.createElement('a');a.href=url;a.download='1128-'+(scene.format==='facebook'?'facebook':'story')+'-我的關心.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}finally{save.disabled=false;}});document.querySelector('.letter-tools').append(save);
}
