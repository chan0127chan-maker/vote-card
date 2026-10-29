import {drawLetter,letterLayout,letterUrl} from '../letter-art.mjs';
import {characterText} from '../origins.mjs';
import {renderSources} from '../source-content.mjs';
import {sheetMotion} from '../sheet-motion.mjs';
import {attachActivity} from '../activity.mjs';
import {attachPostcard} from '../postcard.mjs';
import {attachReaderPolicy} from '../reader-policy.mjs';
const $=id=>document.getElementById(id),dialog=$('source-sheet'),reduced=matchMedia('(prefers-reduced-motion: reduce)'),motion=sheetMotion(dialog,reduced);
const help=$('source-help'),helpMotion=sheetMotion(help,reduced);let explained=false;
$('close-help').addEventListener('click',()=>helpMotion.close());
help.addEventListener('close',()=>$('toggle-sources').focus({preventScroll:true}));
help.addEventListener('click',event=>{if(event.target!==help)return;const r=help.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)helpMotion.outside();});
const details=$('letter-details'),detailsMotion=sheetMotion(details,reduced);
$('close-letter-details').addEventListener('click',()=>detailsMotion.close());
let detailsFocus=$('expiry-tab');
details.addEventListener('close',()=>detailsFocus.focus({preventScroll:true}));
$('expiry-tab').addEventListener('click',()=>{detailsFocus=$('expiry-tab');detailsMotion.open();});
details.addEventListener('click',event=>{if(event.target!==details)return;const r=details.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)detailsMotion.outside();});
attachActivity({allowPractice:false});
let returnFocus;
$('close-source').addEventListener('click',()=>motion.close());
dialog.addEventListener('close',()=>returnFocus?.focus({preventScroll:true}));
dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)motion.outside();});
try{
 const id=location.pathname.split('/').at(-1);
 if(!/^[A-Za-z0-9_-]{32}$/.test(id))throw new Error('找不到這封信。');
 const response=await fetch('/api/letters/'+id,{cache:'no-store'}),body=await response.json();
 if(!response.ok)throw new Error(body.error?.message||'這封信，暫時還沒抵達。');
 const scene=body.data,canvas=$('letter-art');if(scene.format)document.querySelector('.letter-page').dataset.format=scene.format;await drawLetter(canvas,scene);
 attachPostcard({initialCover:true});
 canvas.setAttribute('aria-label',scene.tokens.map(t=>characterText(t.characters)).join('，'));canvas.hidden=false;
 if(!reduced.matches)canvas.animate([{opacity:0},{opacity:1}],{duration:1600,easing:'cubic-bezier(.16,1,.3,1)'}).finished.catch(()=>{});
 $('letter-message').textContent='';$('letter-message').className='sr-only';
 document.querySelector('.letter-page').style.setProperty('--letter-ratio',scene.width/scene.height);
 const layout=letterLayout(scene),postmark=$('postmark-info');
 const bounds=layout.postmark;postmark.style.left=`${bounds.left/layout.width*100}%`;postmark.style.top=`${bounds.top/layout.height*100}%`;postmark.style.width=`${bounds.width/layout.width*100}%`;postmark.style.height=`${bounds.height/layout.height*100}%`;postmark.hidden=false;
 const fullDate=value=>new Date(value).toLocaleString('zh-TW',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false});
 $('saved-at').textContent=fullDate(scene.createdAt);$('read-period').textContent=fullDate(scene.createdAt)+' 至 '+fullDate(scene.expiresAt);
 const url=letterUrl(location.href,id);$('saved-link').textContent=url;$('saved-link').href=url;
 postmark.addEventListener('click',()=>{detailsFocus=postmark;detailsMotion.open();});$('copy-letter-link').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(url);$('letter-details-message').textContent='已複製連結。';}catch{$('letter-details-message').textContent='可選取上方網址後複製。';}});
 const host=$('letter-hotspots'),toggle=$('toggle-sources');
 if(scene.policy)attachReaderPolicy(scene);
 if(!scene.policy){
 scene.tokens.forEach((token,index)=>{
  const glyphs=layout.glyphs.filter(g=>g.tokenIndex===index&&g.hasSource);
  if(!glyphs.length)return;
  const text=characterText(token.characters),button=document.createElement('button');button.className='letter-hit';button.setAttribute('aria-label',`看看「${text}」的來處`);
  const left=Math.min(...glyphs.map(g=>g.x))-layout.fontSize*.65,top=Math.min(...glyphs.map(g=>g.y))-layout.fontSize*.65;
  button.style.left=`${left/layout.width*100}%`;button.style.top=`${top/layout.height*100}%`;
  button.style.width=`${(Math.max(...glyphs.map(g=>g.x))-left+layout.fontSize*.65)/layout.width*100}%`;button.style.height=`${(Math.max(...glyphs.map(g=>g.y))-top+layout.fontSize*.65)/layout.height*100}%`;
  button.addEventListener('click',()=>{returnFocus=button;$('source-word').textContent=text;$('source-caption').textContent='從這幾個字，想起一段回家的路。';renderSources($('source-body'),token.characters,'這幾個字，來自寫信的人。');motion.open();dialog.scrollTop=0;});host.append(button);
 });
 if(host.childElementCount)toggle.hidden=false;
 toggle.addEventListener('click',async()=>{const active=toggle.getAttribute('aria-pressed')!=='true';toggle.setAttribute('aria-pressed',String(active));host.hidden=!active;await drawLetter(canvas,scene,{highlight:active});$('letter-message').textContent=active?'有來處的字已加粗，點字看看地方記憶。':'';if(active&&!explained){explained=true;helpMotion.open();}});
 }
 $('letter-expiry').textContent=`這封信，可讀到 ${new Date(scene.expiresAt).toLocaleDateString('zh-TW')}。`;
}catch(error){$('letter-message').textContent=error.message;$('letter-message').className='letter-error';}
