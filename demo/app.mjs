import { ShakeDetector } from './shake.mjs';
import { toFeatures, summarize } from './words.mjs';
import { createLanguageHistory, createLanguageRound, drawFragment, suggestedOrder } from './language.mjs?v=16';
import { locateThought, emergence } from './thoughts.mjs';
import { localImpulse, stepMotion, penSwayAngle } from './motion.mjs?v=21';
import { sentenceLayout, nearRest, nearInput } from './composition.mjs';
import { splitCharacters, inDiscardZone, spatialOrder, dropAction } from './actions.mjs?v=15';
import { catalogCharacters, personalCharacters, characterText } from './origins.mjs';
import { loadCatalog } from './catalog.mjs';
import { attachExperience } from './experience.mjs';
import { airEase } from './sheet-motion.mjs';
import { attachSharing } from './sharing.mjs';
import { attachActivity } from './activity.mjs';
import { attachPractice,practiceMoveStart } from './practice.mjs';
import {resolvePenDrop,inPenGroove,penIntent,tipInGroove,armPenReturn} from './pen-state.mjs';
import {penInputContact} from './pen-contact.mjs';
import {attachPostcard} from './postcard.mjs';
import {nextFragment,completeFragmentIds} from './policy.mjs';
import {attachPolicyPanel} from './policy-panel.mjs';
import {attachSocialFormats} from './social-formats.mjs';

const $ = (id) => document.getElementById(id);
const pen = $('pen'), position = $('pen-position'), stage = document.querySelector('.stage');
const field = $('words'), reduced = matchMedia('(prefers-reduced-motion: reduce)');
const detector = new ShakeDetector(), MAX = 8;
const mobileLayout=matchMedia('(max-width:679px)');
const isPractice=new URL(location.href).searchParams.get('practice')==='1';
let policyController=null,signature='',signatureNode=null,lastWordDrag=0,wordClickTimer=null;
let practiceController=null,penReturnArmed=false,mobilePenRaised=false,reflowing=false;
const practiced=(action,detail={})=>practiceController?.record(action,detail);
let freeComposition = false, mergeTarget = null, lastTap = null, sourceHold;
let currentCatalog={words:[],sources:{}}, personalOrder=100;
const catalogLimit=()=>Math.min(MAX,currentCatalog.words.length);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(Math.max(lo, hi), v));
let motionFrame = 0, motionTime = 0, lastPen, penOffset = { x: 0, y: 0 }, penFree={x:0,y:0}, arranged = false;
const languageHistory = createLanguageHistory();
let languageRound = null, suggestionVersion = 0, compositionEdited = false;
let strokes = [], words = [], pointer = null, origin, bounds, drag = null, zTop = 1;
const inputContact=penInputContact({
 onFeedback:active=>$('bring').classList.toggle('contact',active),
 onReady:id=>{
  if(pointer!==id)return;
  if(!mobileLayout.matches&&words.length&&penOverRest())return;
  release();experience.openComposer(null,{pointerId:id,fromPointer:true});
 }
});

async function reset() {
  if(!sharing.requestEdit())return;
  policyController?.reset();signature='';if(signatureNode)signatureNode.textContent='';
  experience.closePanels();
  sharing.edited();sharing.close();
  clearTimeout(sourceHold);
  release(true);
  settleWords();
  endDrag();
  for (const animation of field.getAnimations({ subtree: true })) animation.cancel();
  field.replaceChildren();
  languageRound = null;
  suggestionVersion = 0;
  compositionEdited = false;
  strokes = [];
  words = [];
  $('share').disabled=true;
  zTop = 1;
  arranged = false; freeComposition = false; lastTap = null;
  stage.classList.remove('dragging', 'discard-ready');
  field.classList.remove('arranged', 'editing', 'free-composition');
  position.classList.remove('docked');
  $('rest').hidden = true;
  $('rest').setAttribute('aria-label',mobileLayout.matches?'筆槽：點一下收筆並排列字句':'收筆：把詞排成直式句子');
  $('rest').title = '收筆，排成一句';
  $('rest').classList.remove('ready');
  $('reveal').textContent = '浮現';
  $('pen').setAttribute('aria-label', '木頭筆：按住來回搖動，空白鍵浮字，Enter 收筆排列');
  $('hint').classList.remove('hidden');
  $('hint').removeAttribute('aria-hidden');
  $('reveal').disabled = true;
  try {
    currentCatalog=await loadCatalog();
    $('reveal').disabled=!currentCatalog.words.length;
    $('catalog-note').hidden=!currentCatalog.preview && currentCatalog.words.length>0;
    $('catalog-note').textContent=currentCatalog.preview?'草稿預覽':currentCatalog.words.length?'':'詞庫尚無已發布的詞，仍可補上自己的文字。';
    $('status').textContent='可以搖動木筆，讓文字浮現；點詞看聚焦的議題，橫線可留署名。';
  } catch(error) {
    currentCatalog={words:[],sources:{}};
    $('catalog-note').hidden=false;
    $('catalog-note').textContent=error.message+' 仍可補上自己的文字。';
  }
}
function place(s, x, y) {
  const nextX=clamp(x,0,field.clientWidth-s.w),nextY=clamp(y,0,field.clientHeight-s.h);
  if(!reflowing&&(nextX!==s.x||nextY!==s.y)&&!sharing.edited())return false;
  s.x=nextX;s.y=nextY;
  s.el.style.transform = `translate(${s.x}px, ${s.y}px)`;
}
function clearMotion(s) {
  s.motion = { x: 0, y: 0, vx: 0, vy: 0 };
  s.impulses = [];
  s.el.style.translate = '';
}
function settleWords() {
  cancelAnimationFrame(motionFrame);
  motionFrame = 0;
  motionTime = 0;
  for (const s of words) clearMotion(s);
}
function animateWords(now) {
  motionFrame = 0;
  if (reduced.matches) { settleWords(); return; }
  const dt = motionTime ? (now - motionTime) / 1000 : 1 / 60;
  motionTime = now;
  let active = false;
  for (const s of words) {
    if (drag?.s === s) continue;
    const waiting = [];
    for (const pulse of s.impulses) {
      if (pulse.at > now) waiting.push(pulse);
      else { s.motion.vx += pulse.vx; s.motion.vy += pulse.vy; }
    }
    s.impulses = waiting;
    s.motion = stepMotion(s.motion, dt, s.stiffness, s.damping);
    s.motion.x = clamp(s.motion.x, -s.x, field.clientWidth - s.w - s.x);
    s.motion.y = clamp(s.motion.y, -s.y, field.clientHeight - s.h - s.y);
    s.el.style.translate = `${s.motion.x}px ${s.motion.y}px`;
    if (waiting.length || Object.values(s.motion).some(v => v !== 0)) active = true;
    else s.el.style.translate = '';
  }
  if (active) motionFrame = requestAnimationFrame(animateWords);
  else motionTime = 0;
}
function stirWords(dx, dy, x, y) {
  if (reduced.matches || arranged) return;
  const r = field.getBoundingClientRect(), now = performance.now();
  let added = false;
  for (const s of words) {
    if (drag?.s === s) continue;
    const pulse = localImpulse({
      from: { x: x - dx, y: y - dy }, to: { x, y },
      center: { x: r.left + s.x + s.w / 2, y: r.top + s.y + s.h / 2 }, spin: s.spin,
    });
    if (Math.hypot(pulse.vx, pulse.vy) < .15) continue;
    s.impulses.push({ vx: pulse.vx, vy: pulse.vy, at: now + pulse.delay + s.phase });
    if (s.impulses.length > 64) s.impulses.shift();
    added = true;
  }
  if (added && !motionFrame) motionFrame = requestAnimationFrame(animateWords);
}
reduced.addEventListener('change', () => { if (reduced.matches) settleWords(); });
function renderWord(s, characters) {
  s.characters = characters;
  s.text = characterText(characters);
  const maxHeight = Math.max(120, field.clientHeight - 24);
  s.el.querySelector('.ink').style.maxHeight = `${maxHeight}px`;
  const ink = s.el.querySelector('.ink');
  const glyphs = [...s.text].map((char, index) => {
    const glyph = document.createElement('span');
    glyph.className = 'glyph';
    glyph.dataset.index = index;
    glyph.textContent = char;
    return glyph;
  });
  ink.replaceChildren(...glyphs);
  s.el.setAttribute('aria-label', `「${s.text}」，點一下或空白鍵看議題；拖疊串接；雙擊或 Enter 拆字；Delete 刪除`);
  s.el.title = '點一下看議題，雙擊拆字';
  s.w = s.el.offsetWidth; s.h = s.el.offsetHeight;
}
function makeWord(text, order, characters = personalCharacters(text)) {
  const el = document.createElement('div'), ink = document.createElement('span');
  el.className = 'word'; el.tabIndex = 0; el.setAttribute('role', 'listitem');
  ink.className = 'ink'; el.append(ink); field.append(el);
  const s = { el, order, stiffness: 4.5 + Math.random() * 2, damping: 5.8 + Math.random() * .6,
    spin: Math.random() < .5 ? -1 : 1, phase: Math.random() * 75 };
  renderWord(s, characters);
  clearMotion(s);
  return s;
}
function stampObstacle(){
 const area=field.getBoundingClientRect(),s=$('share').getBoundingClientRect();return{x:s.left-area.left,y:s.top-area.top,w:s.width,h:s.height};
}
function fixedObstacles(){
 const items=[stampObstacle()],coach=$('practice-coach');
 if(isPractice&&coach&&!coach.hidden){const f=field.getBoundingClientRect(),r=coach.getBoundingClientRect();items.push({x:r.left-f.left,y:r.top-f.top,w:r.width,h:r.height});}
 return items;
}
function neighbors(extra=[]){
  const area=field.getBoundingClientRect(),p=pen.querySelector('.pen-body').getBoundingClientRect(),stamp=$('share').getBoundingClientRect();
  return [...words,...extra,{x:p.left-area.left,y:p.top-area.top,w:p.width,h:p.height},{x:stamp.left-area.left,y:stamp.top-area.top,w:stamp.width,h:stamp.height}];
}
function reveal(stroke) {
  if(!sharing.requestEdit())return;
  if (words.length >= catalogLimit()) return;
  const feat = toFeatures(stroke);
  if (!languageRound) {
    languageRound = createLanguageRound(feat, Math.random, languageHistory, currentCatalog.words);
  }
  const entry=nextFragment(currentCatalog.words,[...new Set(words.flatMap(w=>w.characters.map(c=>c.origin.wordId)))],strokes.length);
  const word=entry?{text:entry.text,order:strokes.length,catalogEntry:entry}:null;
  if (!word) return;
  if(words.reduce((n,s)=>n+[...s.text].length,0)+[...word.text].length>256){$('status').textContent='先讓畫面留一點空，再拾新的字。';return;}
  strokes.push(feat);
  const s = makeWord(word.text, word.order, catalogCharacters(word.catalogEntry,currentCatalog.sources));
  const el = s.el, ink = el.querySelector('.ink');
  el.classList.add('loose');
  clearMotion(s);
  const point = locateThought({ box: { w: field.clientWidth, h: field.clientHeight }, size: s, others: neighbors(), avoid:fixedObstacles(), inset:Math.min(24,field.clientWidth*.08) });
  place(s, point.x, point.y);
  el.style.zIndex = ++zTop;
  words.push(s);
  $('share').disabled=isPractice;
  $('rest').hidden = false;
  // 只沿景深靠近：沒有拋物線、下落或上下平移。
  const motion = emergence();
  const animation = ink.animate(reduced.matches ? [
    { opacity: 0 }, { opacity: 1 },
  ] : [
    { opacity: 0, filter: `blur(${motion.blur}px)`, transform: `perspective(650px) translateZ(-${motion.depth}px) scale(.45)` },
    { opacity: .4, filter: `blur(${motion.blur * .4}px)`, transform: `perspective(650px) translateZ(-${motion.depth * .33}px) scale(.75)`, offset: .45 },
    { opacity: 1, filter: 'blur(0)', transform: 'perspective(650px) translateZ(0) scale(1)' },
  ], { duration: reduced.matches ? 180 : motion.duration, delay: reduced.matches ? 0 : motion.delay, fill: 'backwards', easing: 'cubic-bezier(.22,.55,.3,1)' });
  const stopForReducedMotion = () => { if (reduced.matches) animation.finish(); };
  reduced.addEventListener('change', stopForReducedMotion);
  animation.finished.catch(() => {}).finally(() => {reduced.removeEventListener('change', stopForReducedMotion);el.classList.remove('loose');});
  $('hint').classList.add('hidden');
  $('hint').setAttribute('aria-hidden', 'true');
  $('reveal').disabled = words.length >= catalogLimit();
  $('status').textContent = `浮現「${word.text}」。${words.length >= catalogLimit() ? '先剔除一點字，就能繼續搖。' : ''}`;
  if (words.length >= catalogLimit()) window.dispatchEvent(new CustomEvent('wordpen:round', {
    detail: { words: words.map(s => s.text), profile: summarize(strokes), strokes: [...strokes] },
  }));
  practiced('reveal');
}

function layoutSentence(held = null) {
  const slots = sentenceLayout(words, { w: field.clientWidth, h: field.clientHeight },{x:field.clientWidth/2,y:field.clientHeight/2});
  words.forEach((s, i) => {
    s.slot = slots[i];
    if (s !== held) place(s, slots[i].x, slots[i].y);
  });
}
function announceSentence() {
  field.append(...words.map(s => s.el));
  $('status').textContent = `目前詞序：${words.map(s => s.text).join('，')}。可雙擊拆字、拖疊串接，或拖到下緣刪除。`;
  window.dispatchEvent(new CustomEvent('wordpen:composition', { detail: { words: words.map(s => s.text) } }));
}
function dock() {
  if(!sharing.requestEdit())return;
  if (!words.length) return;
  release(true);
  sharing.edited();
  if (arranged) {
    endDrag();
    freeComposition = false;
    field.classList.remove('free-composition');
    suggestionVersion++;
    words = suggestedOrder(words, languageRound, suggestionVersion);
    layoutSentence();
    announceSentence();
    return;
  }
  endDrag();
  settleWords();
  for (const animation of field.getAnimations({ subtree: true })) animation.finish();
  for (const s of words) s.free = { x: s.x, y: s.y };
  if (!compositionEdited) words = suggestedOrder(words, languageRound, suggestionVersion);
  arranged = true; freeComposition = false;
  field.classList.remove('free-composition');
  $('rest').setAttribute('aria-label',mobileLayout.matches?'筆槽：點一下換一種詞序':'筆座：換一種詞序');
  $('rest').title = '換一種詞序';
  field.classList.add('arranged');
  position.classList.add('docked');
  $('rest').classList.remove('ready');
  $('reveal').textContent = '再拾';
  $('reveal').disabled = words.length>=catalogLimit();
  pen.setAttribute('aria-label', '木頭筆已收好：拖動拿起，或按空白鍵繼續拾字');
  layoutSentence();
  announceSentence();
  practiced('dock');
}
function undock() {
  if(!sharing.requestEdit())return;
  if (!arranged) return;
  endDrag();
  arranged = false;
  $('rest').setAttribute('aria-label',mobileLayout.matches?'筆槽：點一下收筆並排列字句':'收筆：把詞排成直式句子');
  $('rest').title = '收筆，排成一句';
  position.classList.remove('docked');
  for (const s of words) place(s, s.free.x, s.free.y);
  field.classList.remove('arranged');
  $('reveal').textContent = '浮現';
  $('reveal').disabled = words.length >= catalogLimit();
  pen.setAttribute('aria-label', '木頭筆：按住來回搖動，空白鍵浮字，Enter 收筆排列');
  $('status').textContent = '已拿起筆，可繼續拾字或自由排列。';
}
$('rest').addEventListener('click', dock);
pen.addEventListener('keydown', event => {
  if (event.key !== 'Enter') return;
  event.preventDefault();
  if (arranged) undock(); else dock();
});

pen.addEventListener('pointerdown', (event) => {
  if (pointer !== null || !event.isPrimary || event.button !== 0) return;
  if(!sharing.requestEdit())return;
  const start = position.getBoundingClientRect();
  const wasArranged=arranged;
  if (arranged) undock();
  const home = position.getBoundingClientRect();
  penOffset = wasArranged?{x:start.left-home.left,y:start.top-home.top}:{...penFree};
  pointer = event.pointerId;
  origin = { x: event.clientX, y: event.clientY };
  lastPen = { x: 0, y: 0, time:event.timeStamp };
  const p = start, r = stage.getBoundingClientRect();
  bounds = { left: mobileLayout.matches?r.left-p.right+24:Math.min(r.left+14,p.left-8)-p.left, right: mobileLayout.matches?r.right-p.left-24:Math.max(r.right,$('rest').getBoundingClientRect().right+12,p.right+8) - p.right, top: r.top - p.top, bottom: Math.max(r.bottom,$('bring').getBoundingClientRect().bottom+32,$('rest').getBoundingClientRect().bottom+30,p.bottom+24) - p.bottom };
  pen.setPointerCapture(pointer);
  pen.classList.add('lifted');
  penReturnArmed=false;
  if(mobileLayout.matches){mobilePenRaised=true;pen.style.transform='rotate(-72deg)';}
  detector.start(event.clientX, event.clientY, event.timeStamp);
});
pen.addEventListener('pointermove', (event) => {
  if (pointer !== event.pointerId) return;
  if(sharing.isLocked()){release();sharing.requestEdit();return;}
  const dx = clamp(event.clientX - origin.x, bounds.left, bounds.right);
  const dy = clamp(event.clientY - origin.y, bounds.top, bounds.bottom);
  position.style.transform = `translate(${penOffset.x + dx}px, calc(-50% + ${penOffset.y + dy}px))`;
  const overSlot=penOverRest();
  if(!mobileLayout.matches)penReturnArmed=armPenReturn(penReturnArmed,position.getBoundingClientRect(),grooveBounds(),penTip());
  pen.style.transform = `rotate(${penSwayAngle({dx:dx-lastPen.x,dy:dy-lastPen.y,dt:event.timeStamp-lastPen.time})-(mobileLayout.matches?90:0)}deg)`;
  if(!mobileLayout.matches&&penReturnArmed&&words.length&&tipOverRest()){dock();return;}
  const tip=$('pen-tip').getBoundingClientRect();
  inputContact.track(pointer,penIntent({manualDock:mobileLayout.matches,overRest:overSlot,hasWords:words.length>0,atInput:nearInput({x:tip.left+tip.width/2,y:tip.top+tip.height/2},$('bring').getBoundingClientRect())})==='compose');
  stirWords(dx - lastPen.x, dy - lastPen.y, origin.x + dx, origin.y + dy);
  lastPen = { x: dx, y: dy, time:event.timeStamp };
  $('rest').classList.toggle('ready', words.length > 0 && penOverRest());
  const stroke = detector.move(event.clientX, event.clientY, event.timeStamp);
  if (stroke) reveal(stroke);
});
function showPenPose(){position.style.transform=penFree.x||penFree.y?`translate(${penFree.x}px, calc(-50% + ${penFree.y}px))`:"";}
function penTip(){const t=$('pen-tip').getBoundingClientRect();return{x:t.left+t.width/2,y:t.top+t.height/2};}
function grooveBounds(){return $('rest').querySelector(mobileLayout.matches?'.groove-rest path':'.standing-rest ellipse').getBoundingClientRect();}
function tipOverRest(){return !$('rest').hidden&&tipInGroove(penTip(),grooveBounds());}
function penOverRest(){
 if($('rest').hidden)return false;
 if(mobileLayout.matches)return inPenGroove(position.getBoundingClientRect(),grooveBounds(),penTip());
 return tipOverRest()||nearRest(position.getBoundingClientRect(),stage.getBoundingClientRect(),$('rest').getBoundingClientRect());
}
function release(resetPose=false) {
  inputContact.clear();
  $('bring').classList.remove('contact');pen.classList.remove('contact-held');
  const previous = pointer;
  if(previous!==null)penFree=resolvePenDrop({offset:penOffset,delta:lastPen,overRest:false,hasWords:words.length>0}).offset;
  if(resetPose){penFree={x:0,y:0};mobilePenRaised=false;}
  pointer = null;
  detector.stop();
  if (previous !== null && pen.hasPointerCapture(previous)) pen.releasePointerCapture(previous);
  showPenPose();
  pen.style.transform = mobileLayout.matches&&mobilePenRaised?'rotate(-72deg)':'';
  pen.classList.remove('lifted');
  $('rest').classList.remove('ready');
}
pen.addEventListener('pointerup', () => {
  if(pointer===null)return;
  const overRest=penOverRest(),atInput=nearInput(penTip(),$('bring').getBoundingClientRect());
  const action=penIntent({overRest,hasWords:words.length>0,atInput,manualDock:mobileLayout.matches});
  const drop=resolvePenDrop({offset:penOffset,delta:lastPen,overRest,hasWords:words.length>0,manualDock:mobileLayout.matches});
  release();penFree=drop.offset;showPenPose();
  if(drop.dock)dock();
  else if(action==='compose')experience.openComposer(null,{fromPointer:true});
});
for (const type of ['pointercancel', 'lostpointercapture']) pen.addEventListener(type,event=>{if(pointer===event.pointerId)release();});
function simulate() {
  reveal({ speed: .15 + Math.random() * .7, amplitude: 40 + Math.random() * 130, angle: Math.random() * Math.PI * 2 });
}
pen.addEventListener('click', (event) => { if (event.detail === 0) simulate(); });
$('reveal').addEventListener('click', simulate);
$('reset').addEventListener('click', reset);

// 直接操作字：雙擊拆散、拖疊串接、拖到下緣或向外快滑刪除。
function clearMergeTarget() {
  mergeTarget?.el.classList.remove('merge-target');
  mergeTarget = null;
}
function findMergeTarget(source) {
  const r = source.el.getBoundingClientRect();
  let best = null, nearest = Infinity;
  for (const s of words) {
    if (s === source) continue;
    const t = s.el.getBoundingClientRect();
    const overlapX = Math.min(r.right,t.right)-Math.max(r.left,t.left);
    const overlapY = Math.min(r.bottom,t.bottom)-Math.max(r.top,t.top);
    const distance = Math.hypot(r.left+r.width/2-t.left-t.width/2,r.top+r.height/2-t.top-t.height/2);
    if (overlapX>Math.min(r.width,t.width)*.3 && overlapY>18 && distance<nearest) { best=s; nearest=distance; }
  }
  return best;
}
function markFree() {
  if(!sharing.edited())return;
  $('reveal').disabled=words.length>=catalogLimit();
  freeComposition = true;
  compositionEdited = true;
  field.classList.add('free-composition');
}
function discardWord(s, velocity = { x: 0, y: 0 }) {
  if(!sharing.requestEdit())return;
  clearMotion(s);
  for (const a of s.el.getAnimations({subtree:true})) a.cancel();
  words = words.filter(w=>w!==s);
  $('share').disabled=(isPractice)||!words.length;
  s.el.setAttribute('aria-hidden','true');
  s.el.tabIndex=-1;
  if (!reduced.matches) {
    const x=s.x+velocity.x*85, y=s.y+velocity.y*85+14;
    s.el.style.pointerEvents='none';
    s.el.animate([{opacity:1,transform:`translate(${s.x}px,${s.y}px)`},{opacity:0,transform:`translate(${x}px,${y}px)`}],{duration:520,easing:airEase}).finished.catch(()=>{}).finally(()=>s.el.remove());
  } else s.el.remove();
  markFree();
  $('rest').hidden=!words.length;
  $('status').textContent=`已移除「${s.text}」。`;
  practiced('discard');
}
function mergeWords(target, incoming) {
  if(!sharing.requestEdit())return;
  for(const a of target.el.getAnimations({subtree:true})) a.cancel();
  clearMotion(target); clearMotion(incoming);
  words=words.filter(w=>w!==incoming);
  incoming.el.remove();
  renderWord(target,[...target.characters,...incoming.characters]);
  if(!reduced.matches)target.el.querySelector('.ink').animate([{opacity:.65,filter:'blur(1.2px)'},{opacity:1,filter:'blur(0)'}],{duration:700,easing:airEase}).finished.catch(()=>{});
  place(target,target.x,target.y);
  markFree();
  words=spatialOrder(words);
  field.append(...words.map(w=>w.el));
  target.el.focus({preventScroll:true});
  $('status').textContent=`已串成「${target.text}」。`;
  practiced('merge');
}
function scatterWord(s) {
  if(!sharing.requestEdit())return;
  const chars=splitCharacters(s.text);
  if(chars.length<2) return;
  endDrag(true); settleWords();
  const index=words.indexOf(s);
  for(const a of s.el.getAnimations({subtree:true})) a.cancel();
  const area=field.getBoundingClientRect();
  const starts=[...s.el.querySelectorAll('.glyph')].map(el=>{const r=el.getBoundingClientRect();return{x:r.left-area.left,y:r.top-area.top};});
  words.splice(index,1); s.el.remove();
  const pieces=[];
  chars.forEach((char,i)=>{
    const child=makeWord(char,s.order,[s.characters[i]]);
    const glyph=child.el.querySelector('.glyph').getBoundingClientRect(), frame=child.el.getBoundingClientRect();
    const origin={x:starts[i].x-(glyph.left-frame.left),y:starts[i].y-(glyph.top-frame.top)};
    const {x,y}=locateThought({box:{w:field.clientWidth,h:field.clientHeight},size:child,others:[...words,...pieces],avoid:fixedObstacles(),inset:24,near:{...origin,rx:75+Math.random()*45,ry:65+Math.random()*55}});
    child.free={x,y}; child.el.style.zIndex=++zTop;
    child.el.classList.add('loose'); place(child,x,y); pieces.push(child);
    if(!reduced.matches) child.el.animate([
      {opacity:.4,transform:`translate(${origin.x}px,${origin.y}px)`},
      {opacity:1,transform:`translate(${x}px,${y}px)`},
    ],{duration:1400+Math.random()*1000,delay:Math.random()*180,easing:airEase,fill:'backwards'}).finished.catch(()=>{}).finally(()=>child.el.classList.remove('loose'));
    else child.el.classList.remove('loose');
  });
  words.splice(index,0,...pieces); markFree();
  field.append(...words.map(w=>w.el));
  $('status').textContent=`已散成${chars.length}個字，可拖疊重組或移除。`;
  practiced('split');
}
function endDrag(cancel = false, event = null) {
  clearTimeout(sourceHold);
  if(!drag) return;
  const previous=drag, s=previous.s;
  const target=mergeTarget;
  drag=null; clearMergeTarget();
  s.el.classList.remove('held');
  stage.classList.remove('dragging','discard-ready');
  if(s.el.hasPointerCapture(previous.id)) s.el.releasePointerCapture(previous.id);
  field.classList.remove('editing');
  if(previous.locked)return;
  if(cancel) { place(s,previous.x0,previous.y0); return; }
  if(!previous.moved || !event) { place(s,s.x,s.y); return; }
  const end={x:event.clientX,y:event.clientY}, r=stage.getBoundingClientRect();
  const samples=previous.samples.filter(p=>event.timeStamp-p.t<110);
  const first=samples[0], last=samples.at(-1);
  const dt=first&&last?Math.max(1,event.timeStamp-first.t):1;
  const velocity=first&&last&&event.timeStamp-last.t<90?{x:(end.x-first.x)/dt,y:(end.y-first.y)/dt}:{x:0,y:0};
  const action=dropAction({end,stage:r,hasTarget:target&&words.includes(target),start:{x:previous.px,y:previous.py},velocity});
  if(action==='discard') {discardWord(s,velocity);return;}
  if(action==='merge') {mergeWords(target,s);return;}
  place(s,s.x,s.y); markFree();
  practiced('move',{el:s.el});
  if(arranged) {words=spatialOrder(words);announceSentence();}
}
field.addEventListener('pointerdown',event=>{
  const el=event.target.closest('.word');
  if(!el||!event.isPrimary||event.button!==0||drag) return;
  const s=words.find(w=>w.el===el); if(!s) return;
  if(sharing.isLocked()){
    drag={s,id:event.pointerId,px:event.clientX,py:event.clientY,x0:s.x,y0:s.y,moved:false,locked:true};
    el.setPointerCapture(event.pointerId);
    sourceHold=setTimeout(()=>{if(drag?.s===s&&!drag.moved){const id=drag.id;endDrag(true);experience.showOrigins(s,{pointerId:id,fromPointer:true});}},600);
    return;
  }
  const shown=el.getBoundingClientRect(), area=field.getBoundingClientRect();
  for(const animation of el.getAnimations({subtree:true})) animation.cancel();
  clearMotion(s); el.classList.add('held');
  place(s,shown.left-area.left,shown.top-area.top);
  drag={s,id:event.pointerId,px:event.clientX,py:event.clientY,x0:s.x,y0:s.y,moved:false,samples:[{x:event.clientX,y:event.clientY,t:event.timeStamp}]};
  el.setPointerCapture(event.pointerId); el.style.zIndex=++zTop;
  stage.classList.add('dragging');
  sourceHold=setTimeout(()=>{if(drag?.s===s&&!drag.moved){const id=drag.id;endDrag(true);experience.showOrigins(s,{pointerId:id,fromPointer:true});}},600);
});
field.addEventListener('pointermove',event=>{
  if(!drag||event.pointerId!==drag.id) return;
  const dx=event.clientX-drag.px,dy=event.clientY-drag.py;
  if(drag.locked){if(Math.hypot(dx,dy)>6){clearTimeout(sourceHold);sharing.requestEdit();endDrag(true);}return;}
  if(sharing.isLocked()){sharing.requestEdit();endDrag(true);return;}
  if(!drag.moved&&Math.hypot(dx,dy)<=6)return;
  if(Math.hypot(dx,dy)>6) {
    if(!sharing.requestEdit()){endDrag(true);return;}
    if(!drag.moved)sharing.edited();drag.moved=true;clearTimeout(sourceHold);
  }
  drag.s.x=drag.x0+dx;drag.s.y=drag.y0+dy;
  drag.s.el.style.transform=`translate(${drag.s.x}px,${drag.s.y}px)`;
  drag.samples.push({x:event.clientX,y:event.clientY,t:event.timeStamp});
  drag.samples=drag.samples.filter(p=>event.timeStamp-p.t<120);
  const removing=inDiscardZone({x:event.clientX,y:event.clientY},stage.getBoundingClientRect());
  stage.classList.toggle('discard-ready',removing);
  clearMergeTarget();
  if(!removing&&drag.moved) {mergeTarget=findMergeTarget(drag.s);mergeTarget?.el.classList.add('merge-target');}
});
field.addEventListener('pointerup',event=>{
  if(!drag||event.pointerId!==drag.id) return;
  const s=drag.s,tap=!drag.moved,wasLocked=drag.locked;
  endDrag(false,event);
  if(wasLocked){
    if(event.pointerType==='touch'&&tap){
      if(lastTap?.locked&&lastTap.s===s&&event.timeStamp-lastTap.time<350){sharing.requestEdit();lastTap=null;}
      else lastTap={s,time:event.timeStamp,locked:true};
    }return;
  }
  if(event.pointerType==='touch'&&tap) {
    if(lastTap?.s===s&&!lastTap.locked&&event.timeStamp-lastTap.time<350) {lastTap=null;scatterWord(s);}
    else lastTap={s,time:event.timeStamp};
  }
});
for(const type of ['pointercancel','lostpointercapture']) field.addEventListener(type,event=>{
  if(drag&&event.pointerId===drag.id) endDrag(true);
});
field.addEventListener('dblclick',event=>{
  const s=words.find(w=>w.el===event.target.closest('.word'));
  if(s) scatterWord(s);
});
field.addEventListener('keydown',event=>{
  const s=words.find(w=>w.el===event.target);if(!s)return;
  if(event.key===' ') {event.preventDefault();experience.showOrigins(s);return;}
  if(event.key==='Enter') {event.preventDefault();scatterWord(s);return;}
  if(event.key==='Delete'||event.key==='Backspace') {event.preventDefault();discardWord(s);return;}
  const step={ArrowLeft:[-12,0],ArrowRight:[12,0],ArrowUp:[0,-12],ArrowDown:[0,12]}[event.key];
  if(!step)return;
  event.preventDefault();if(!sharing.requestEdit())return;place(s,s.x+step[0],s.y+step[1]);markFree();
  practiced('move',{el:s.el});
  if(arranged){words=spatialOrder(words);announceSentence();s.el.focus({preventScroll:true});}
});
window.addEventListener('blur', () => { release(); endDrag(); settleWords(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { release(); endDrag(); settleWords(); } });
window.addEventListener('resize', () => {
 release();endDrag();settleWords();reflowing=true;
 try{
  for(const s of words)renderWord(s,s.characters);
  if(arranged&&!freeComposition)layoutSentence();else for(const s of words)place(s,s.x,s.y);
 }finally{reflowing=false;}
 $('rest').setAttribute('aria-label',arranged?(mobileLayout.matches?'筆槽：點一下換一種詞序':'筆座：換一種詞序'):(mobileLayout.matches?'筆槽：點一下收筆並排列字句':'收筆：把詞排成直式句子'));
});
const experience=attachExperience({stage,field,signatureValue:()=>signature,showPolicy:isPractice?undefined:()=>policyController?.open(),canEdit:()=>sharing.requestEdit(),
  onOrigins:()=>practiced('source'),
  prepareOpen:()=>{release();endDrag(true);settleWords();},
  addPersonal:(text,point)=>{
    if(!sharing.requestEdit())return false;
    sharing.edited();signature=text;if(signatureNode)signatureNode.textContent=text?'—— '+text:'';
    $('status').textContent=text?'已署名「'+text+'」。':'已移除署名。';
    practiced('personal');
  }
});
const sharing=isPractice?{close(){},edited(){return true;},requestEdit(){return true;},isLocked(){return false;}}:attachSharing({
  beforeOpen:()=>{if(policyController&&!policyController.isConfirmed()){policyController.open();return false;}return true;},
  prepareOpen:()=>{release();endDrag(true);settleWords();for(const a of field.getAnimations({subtree:true}))a.finish();},
  getSnapshot:()=>{
    const paper=document.querySelector('.page'),area=paper.getBoundingClientRect(),stamp=$('share');
    const stampBox={x:0,y:0,width:stamp.offsetWidth};
    for(let node=stamp;node&&node!==paper;node=node.offsetParent){stampBox.x+=node.offsetLeft;stampBox.y+=node.offsetTop;}
    const sig=signatureNode?.getBoundingClientRect(),signatureFrame=sig?{x:(sig.right-area.left)/area.width,y:(sig.top+sig.height/2-area.top)/area.height,fontSize:parseFloat(getComputedStyle(signatureNode).fontSize)}:undefined;
    return {format:paper.dataset.format,signature,signatureFrame,policy:policyController?.snapshot(),policyVisual:policyController?.visual(),width:area.width,height:area.height,fontSize:parseFloat(getComputedStyle(words[0].el.querySelector('.ink')).fontSize),stamp:stampBox,tokens:words.map(s=>({
      characters:s.characters.map(c=>({char:c.char,index:c.index,wordId:c.origin.wordId||null,originKey:c.origin.id,original:c.origin.wordText})),
      glyphs:[...s.el.querySelectorAll('.glyph')].map(el=>{const r=el.getBoundingClientRect();return{x:clamp((r.left+r.width/2-area.left)/area.width,0,1),y:clamp((r.top+r.height/2-area.top)/area.height,0,1)};})
    }))};
  }
});
if(!isPractice)attachActivity({onPracticeEnd:()=>reset(),canPractice:()=>sharing.requestEdit()});
if(!isPractice)attachPostcard();
await reset();
if(!isPractice){
 signatureNode=document.createElement('p');signatureNode.className='player-signature';document.querySelector('.page').append(signatureNode);
 policyController=attachPolicyPanel({getCatalog:()=>currentCatalog,getWordIds:()=>completeFragmentIds(words),canEdit:()=>sharing.requestEdit(),onChange:()=>sharing.edited()});
 attachSocialFormats({canEdit:()=>sharing.requestEdit()});
 field.addEventListener('click',event=>{if(!event.target.closest('.word')||performance.now()-lastWordDrag<400)return;clearTimeout(wordClickTimer);wordClickTimer=setTimeout(()=>policyController.open(),360);});
 field.addEventListener('dblclick',()=>clearTimeout(wordClickTimer));
 field.addEventListener('pointerdown',()=>clearTimeout(wordClickTimer));
 field.addEventListener('pointermove',()=>{if(drag?.moved)lastWordDrag=performance.now();});
}
function practicePoint(s){
 const w=field.clientWidth,h=field.clientHeight;
 return locateThought({box:{w,h},size:s,others:words.filter(o=>o!==s),avoid:fixedObstacles(),inset:24,near:{x:(w-s.w)/2,y:(h-s.h)*.58,rx:w*.24,ry:h*.16}});
}
if(isPractice)practiceController=attachPractice({prepare:async step=>{
  sharing.close();
  if(arranged&&!step.informational)undock();
  if(step.action==='move'&&words.length>1){for(const s of words.slice(1)){for(const a of s.el.getAnimations({subtree:true}))a.cancel();s.el.remove();}words=words.slice(0,1);}
  const seed=()=>{
    const pool=currentCatalog.words.filter(w=>[...w.text].length>1),entry=pool[words.length%pool.length];
    const s=entry?makeWord(entry.text,0,catalogCharacters(entry,currentCatalog.sources)):makeWord('練習',0);
    const point=practicePoint(s);place(s,point.x,point.y);s.free={x:s.x,y:s.y};words.push(s);
    $('rest').hidden=false;$('hint').classList.add('hidden');$('hint').setAttribute('aria-hidden','true');
  };
  while(words.length<step.count)seed();
  if(step.action==='split'&&!words.some(s=>s.characters.length>1))seed();
  if(step.action==='source'&&!words.some(s=>s.characters.some(c=>c.origin.links.length)))seed();
  for(const a of field.getAnimations({subtree:true}))a.finish();
  if(!arranged){const obstacles=fixedObstacles();for(const s of words){
    if(obstacles.some(o=>s.x+s.w+8>o.x&&s.x-8<o.x+o.w&&s.y+s.h+8>o.y&&s.y-8<o.y+o.h)){const p=practicePoint(s);place(s,p.x,p.y);s.free={x:s.x,y:s.y};}
  }}
  if(step.action==='move'){const a=field.getBoundingClientRect(),t=$('practice-target').getBoundingClientRect();words.forEach(s=>{const p=practiceMoveStart({field:{w:a.width,h:a.height},size:s,target:{x:t.left-a.left,y:t.top-a.top,w:t.width,h:t.height}});place(s,p.x,p.y);});}
  $('share').disabled=true;
}});
