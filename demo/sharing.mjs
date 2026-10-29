import {sheetMotion} from './sheet-motion.mjs';
import {drawLetter,imageBlob,letterUrl,invitation} from './letter-art.mjs';
import {SealVersion} from './seal-version.mjs';
import {postmarkMotion,positionPostmark} from './postmark-motion.mjs';
import {drawCover} from './postcard.mjs';
import {drawPolicyCard} from './policy-art.mjs';
const $=id=>document.getElementById(id);
export function attachSharing({prepareOpen,getSnapshot,beforeOpen=()=>true,practice=false,onAction=()=>{}}){
 const dialog=$('share-sheet'),reduced=matchMedia('(prefers-reduced-motion: reduce)'),motion=sheetMotion(dialog,reduced),version=new SealVersion();
 const marks=[['draft-postmark',postmarkMotion($('draft-postmark'),reduced)],['preview-postmark',postmarkMotion($('preview-postmark'),reduced)],['message-postmark',postmarkMotion($('message-postmark'),reduced)]];
 const detailAnimations=new Map();let scene=null,cache=null,key='',busy=false,mode=null,pendingUnlock=false,hintAnimation=null,hintRevision=0,hintClosing=false;
 let exportCover=false;
 const sides=document.createElement('div');sides.className='export-sides';sides.setAttribute('role','group');sides.setAttribute('aria-label','選擇圖片面');
 const writing=document.createElement('button'),cover=document.createElement('button');writing.textContent='完整分享圖';cover.textContent='封面';
 writing.setAttribute('aria-pressed','true');cover.setAttribute('aria-pressed','false');sides.append(writing,cover);$('image-details').prepend(sides);
 async function previewSide(value){if(busy)return;busy=true;exportCover=value;writing.setAttribute('aria-pressed',String(!value));cover.setAttribute('aria-pressed',String(value));try{if(value){$('preview-postmark').setAttribute('hidden','');await drawCover($('image-preview'),scene.format);}else{await renderPreview();if(version.lock)showSeal({...scene,...version.lock},false);}}catch(error){message(error.message,true);}finally{busy=false;}}
 const renderPreview=()=>scene.policy?drawPolicyCard($('image-preview'),scene):drawLetter($('image-preview'),scene,{postmark:false});
 writing.addEventListener('click',()=>previewSide(false));cover.addEventListener('click',()=>previewSide(true));
 const paper=$('unlock-version').closest?.('.page'),unlockButton=$('unlock-version'),hint=$('version-hint');
 const message=(value,error=false)=>{$('share-message').textContent=value;$('share-message').classList.toggle('error',error);};
 function reveal(el){detailAnimations.get(el)?.cancel();el.hidden=false;if(!reduced.matches){const a=el.animate([{opacity:0,transform:'translateY(4px)'},{opacity:1,transform:'translateY(0)'}],{duration:1000,easing:'cubic-bezier(.16,1,.3,1)'});detailAnimations.set(el,a);a.finished.catch(()=>{});}}
 function setHint(text){
  hintRevision++;hintClosing=false;hintAnimation?.cancel();hint.textContent=text;hint.hidden=false;
  if(!reduced.matches){hintAnimation=hint.animate([{opacity:.35},{opacity:1}],{duration:700,easing:'cubic-bezier(.16,1,.3,1)'});hintAnimation.finished.catch(()=>{});}
 }
 function dismissHint(){
  if(hint.hidden||hintClosing)return;
  const ticket=++hintRevision,opacity=getComputedStyle(hint).opacity;hintClosing=true;hintAnimation?.cancel();
  if(reduced.matches){hint.hidden=true;hintClosing=false;return;}
  hintAnimation=hint.animate([{opacity},{opacity:0}],{duration:900,easing:'cubic-bezier(.16,1,.3,1)',fill:'forwards'});
  hintAnimation.finished.then(()=>{if(ticket===hintRevision&&!version.lock){hint.hidden=true;hintClosing=false;}}).catch(()=>{});
 }
 function requestEdit(){
  if(!version.lock)return true;
  setHint('這一版已鎖定。請點郵戳解除鎖定，再繼續編輯。');unlockButton.classList.add('needs-unlock');
  $('status').textContent='操作尚未執行。請先點郵戳解除鎖定。';return false;
 }
 function edited(){
  if(!requestEdit())return false;
  version.edit();cache=null;key='';dismissHint();return true;
 }
 function unlock(){
  if(!version.unlock())return;
  cache=null;key='';paper?.classList.remove('version-locked');unlockButton.disabled=true;unlockButton.setAttribute('aria-hidden','true');unlockButton.classList.remove('needs-unlock');
  for(const [id,mark]of marks){const hiding=mark.hide();if(id==='draft-postmark')hiding.then(hidden=>{if(hidden&&!version.lock)unlockButton.hidden=true;});}
  $('share-confirmation').hidden=true;setHint('已解除鎖定，可以繼續編輯。先前分享仍保留原版本。');$('status').textContent=hint.textContent;
 }
 unlockButton.addEventListener('click',unlock);
 $('unlock-shared-version').addEventListener('click',()=>{pendingUnlock=true;motion.close();});
 function showSeal(snapshot,animate){
  unlockButton.hidden=false;unlockButton.disabled=false;unlockButton.removeAttribute('aria-hidden');
  for(const [id,mark]of marks){if(id==='preview-postmark'&&(exportCover||scene?.policy)){$(id).setAttribute('hidden','');continue;}if(id!=='message-postmark')positionPostmark(id==='draft-postmark'?unlockButton:$(id),snapshot);mark.show(snapshot,animate);}
  if(dialog.open)$('share-confirmation').hidden=false;
 }
 function commit(ticket,metadata,snapshot){
  if(!version.commit(ticket,metadata))return false;
  showSeal({...snapshot,...metadata},true);paper?.classList.add('version-locked');setHint('這一版已鎖定。要修改，請點郵戳解除鎖定。');$('status').textContent=hint.textContent;return true;
 }
 function select(next){
  mode=next;message('');$('choose-image').setAttribute('aria-pressed',String(next==='image'));$('choose-message').setAttribute('aria-pressed',String(next==='message'));
  $('image-details').hidden=true;$('share-result').hidden=true;$('share-confirmation').hidden=true;$('local-share-note').hidden=true;$('share-consent').hidden=next==='image';
 }
 function showMessage(){
  if(!dialog.open)return;
  $('share-text').value=invitation(letterUrl(location.href,cache.id));$('share-text').readOnly=true;
  $('share-expiry').textContent=`可閱讀至 ${new Date(cache.expiresAt).toLocaleDateString('zh-TW')}。`;
  $('local-share-note').hidden=!['127.0.0.1','localhost'].includes(location.hostname);$('share-consent').hidden=true;
  reveal($('share-result'));if(version.lock)showSeal({...scene,...version.lock},false);$('copy-share').focus({preventScroll:true});message('');
 }
 function open(){
  if(busy||!beforeOpen())return;
  prepareOpen();const current=version.lock?scene:getSnapshot();if(!current.tokens.length)return;
  const next=JSON.stringify(current);if(next!==key){edited();key=next;}
  scene=current;select(null);motion.open();
 }
 async function action(fn){
  if(busy)return;busy=true;for(const id of ['choose-image','choose-message','save-image','copy-share'])$(id).disabled=true;
  try{await fn();}catch(error){message(error.message||'暫時無法留下這封信，請再試一次。',true);}
  finally{busy=false;for(const id of ['choose-image','choose-message','save-image','copy-share'])$(id).disabled=false;}
 }
 $('share').addEventListener('click',open);$('close-share').addEventListener('click',()=>motion.close());
 dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)motion.outside();});
 $('choose-image').addEventListener('click',()=>action(async()=>{
  select('image');exportCover=false;writing.setAttribute('aria-pressed','true');cover.setAttribute('aria-pressed','false');const ticket=version.ticket();await renderPreview();
  if(ticket!==version.ticket()||!dialog.open)return;
  reveal($('image-details'));if(version.lock)showSeal({...scene,...version.lock},false);onAction('save-preview');
 }));
 $('choose-message').addEventListener('click',()=>action(async()=>{
  select('message');if(practice){
   $('share-text').value='我寫了一封信，留給你。\n（教學預覽：正式分享時，這裡會附上信件連結。）';$('share-text').readOnly=true;
   $('share-expiry').textContent='正式連結可閱讀半年。教學不建立或保存信件。';$('share-consent').hidden=true;$('copy-share').hidden=true;
   reveal($('share-result'));onAction('share-preview');return;
  }
  if(cache){showMessage();return;}
  const ticket=version.ticket(),snapshot=scene;message('正在把這些字留下來……');
  const response=await fetch('/api/letters',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...snapshot,policyVisual:undefined})}),body=await response.json();
  if(!response.ok)throw new Error(body.error?.message||'暫時無法留下連結。');
  if(ticket===version.ticket()){cache=body.data;if(mode==='message')showMessage();}
 }));
 $('save-image').addEventListener('click',()=>action(async()=>{
  const ticket=version.ticket(),snapshot=scene,metadata=cache||version.lock||{savedAt:new Date().toISOString()};
  const canvas=document.createElement('canvas');if(exportCover)await drawCover(canvas,snapshot.format);else if(snapshot.policy)await drawPolicyCard(canvas,{...snapshot,...metadata});else await drawLetter(canvas,{...snapshot,...metadata});const blob=await imageBlob(canvas),url=URL.createObjectURL(blob),a=document.createElement('a');
  try{a.href=url;a.download='1128-'+(snapshot.format==='facebook'?'facebook-1200x630':'story-1080x1920')+(exportCover?'-封面.png':'-字句.png');a.click();}finally{setTimeout(()=>URL.revokeObjectURL(url),30000);}
  const locked=commit(ticket,metadata,snapshot);message(locked?'圖片已送出下載，已保存這一版。':'已送出先前版本的圖片下載。');
 }));
 $('copy-share').addEventListener('click',()=>action(async()=>{
  if(!cache)return;
  const ticket=version.ticket(),snapshot=scene,metadata={...cache},value=$('share-text').value;
  try{await navigator.clipboard.writeText(value);}catch{if(dialog.open){$('share-text').focus();$('share-text').select();}message('尚未複製。可以選取訊息後手動複製。',true);return;}
  const locked=commit(ticket,metadata,snapshot);message(locked?'已複製訊息，已保存這一版。':'已複製先前版本的訊息。');
 }));
 reduced.addEventListener?.('change',()=>{if(!reduced.matches)return;hintAnimation?.cancel();if(hintClosing){hint.hidden=true;hintClosing=false;}for(const a of detailAnimations.values())a.cancel();});
 dialog.addEventListener('close',()=>{if(pendingUnlock){pendingUnlock=false;unlock();}else $('share').focus({preventScroll:true});});
 return {close:()=>motion.close(true),edited,requestEdit,isLocked:()=>version.lock!==null};
}
