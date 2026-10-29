import {normalizeSignature} from './policy.mjs';
import { renderSources } from './source-content.mjs';
import { sheetMotion } from './sheet-motion.mjs';
const $=id=>document.getElementById(id);
export function attachExperience({stage,field,prepareOpen,addPersonal,onOrigins,showPolicy,signatureValue=()=>'',canEdit=()=>true}) {
 const sourceSheet=$('source-sheet'),composeSheet=$('compose-sheet'),input=$('personal-text'),error=$('personal-error'),bring=$('bring'),ghost=$('personal-ghost');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const sources=sheetMotion(sourceSheet,reduced),composer=sheetMotion(composeSheet,reduced);
 let point=null,pull=null,suppressClick=false,blankTap=null,blankStart=null,returnFocus=null;
 function closePanels(){sources.close(true);composer.close(true);clearPull();}
 function showOrigins(token,gesture={}) {
  if(showPolicy){showPolicy();onOrigins?.();return;}
  prepareOpen();returnFocus=token.el;
  $('source-word').textContent=token.text;
  renderSources($('source-body'),token.characters);
  $('source-caption').textContent='生活裡的詞，可以慢慢聚焦成一件關心的事。';
  sources.open(gesture);sourceSheet.scrollTop=0;
  onOrigins?.();
 }
 function openComposer(position=null,gesture={}) {
  if(!canEdit())return;
  prepareOpen();point=position;returnFocus=bring;
  input.value=signatureValue();error.textContent='';$('personal-count').textContent=[...input.value].length+' / 12';
  composer.open(gesture);input.focus();
 }
 for(const sheet of [sourceSheet,composeSheet]) {
  sheet.addEventListener('click',event=>{if(event.target!==sheet)return;const r=sheet.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)(sheet===sourceSheet?sources:composer).outside();});
  sheet.addEventListener('close',()=>{if(!sheet.open&&returnFocus?.isConnected)returnFocus.focus({preventScroll:true});});
 }
 $('close-source').addEventListener('click',()=>sources.close());
 $('cancel-personal').addEventListener('click',()=>composer.close());
 input.addEventListener('input',()=>{$('personal-count').textContent=`${[...input.value].length} / 12`;error.textContent='';});
 $('personal-form').addEventListener('submit',event=>{
  event.preventDefault();
  try{if(!canEdit()){error.textContent='請先取消，點郵戳解除鎖定後再署名。';return;}const text=normalizeSignature(input.value);if(addPersonal(text,point)===false)return;composer.close();input.value='';}
  catch(e){error.textContent=e.message;}
 });
 function clearPull(){if(pull&&bring.hasPointerCapture(pull.id))bring.releasePointerCapture(pull.id);pull=null;ghost.style.opacity='';ghost.style.transform='';}
 bring.addEventListener('pointerdown',event=>{if(!event.isPrimary||event.button!==0)return;if(!canEdit())return;pull={id:event.pointerId,x:event.clientX,y:event.clientY,dy:0};bring.setPointerCapture(event.pointerId);});
 bring.addEventListener('pointermove',event=>{if(!pull||event.pointerId!==pull.id)return;pull.dy=event.clientY-pull.y;ghost.style.opacity=String(Math.min(1,Math.max(0,-pull.dy/55)));ghost.style.transform=`translate(-50%,${Math.max(-150,Math.min(0,pull.dy))}px)`;});
 bring.addEventListener('pointerup',event=>{
  if(!pull||event.pointerId!==pull.id)return;
  const rising=pull.dy<-32;suppressClick=rising;
  clearPull();if(rising)openComposer({x:event.clientX,y:event.clientY});
 });
 for(const type of ['pointercancel','lostpointercapture']) bring.addEventListener(type,()=>{pull=null;ghost.style.opacity='';ghost.style.transform='';});
 bring.addEventListener('click',()=>{if(suppressClick){suppressClick=false;return;}openComposer();});
 stage.addEventListener('dblclick',event=>{if(event.target.closest('.word,button'))return;openComposer({x:event.clientX,y:event.clientY});});
 stage.addEventListener('pointerdown',event=>{if(event.pointerType!=='touch'||event.target.closest('.word,button'))return;blankStart={x:event.clientX,y:event.clientY};});
 stage.addEventListener('pointerup',event=>{
  if(event.pointerType!=='touch'||!blankStart||event.target.closest('.word,button'))return;
  const still=Math.hypot(event.clientX-blankStart.x,event.clientY-blankStart.y)<8;blankStart=null;
  if(!still)return;
  if(blankTap&&event.timeStamp-blankTap.time<350&&Math.hypot(blankTap.x-event.clientX,blankTap.y-event.clientY)<35){blankTap=null;openComposer({x:event.clientX,y:event.clientY});}
  else blankTap={x:event.clientX,y:event.clientY,time:event.timeStamp};
 });
 window.addEventListener('blur',clearPull);
 return {showOrigins,openComposer,closePanels};
}
