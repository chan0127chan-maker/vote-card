export const airEase='cubic-bezier(.16,1,.3,1)';
const sheetEase='cubic-bezier(.2,.65,.25,1)';
export function sheetMotion(sheet,reduced){
 let animation=null,parts=[],revision=0,closing=false,openingPointer=null,backdropAfter=0;
 const cancel=()=>{animation?.cancel();animation=null;for(const part of parts)part.cancel();parts=[];};
 const layers=()=>[...sheet.querySelectorAll('[data-sheet-layer]')].filter(el=>!el.hidden);
 const style=el=>sheet.ownerDocument.defaultView.getComputedStyle(el);
 function part(el,frames,options){const a=el.animate(frames,options);a.finished.catch(()=>{});parts.push(a);}
 function open({pointerId=null,fromPointer=false}={}){
  openingPointer=pointerId;backdropAfter=fromPointer?performance.now()+500:0;
  revision++;closing=false;cancel();sheet.inert=false;sheet.classList.remove('sheet-closing');
  if(!sheet.open)sheet.showModal();
  if(reduced.matches)return;
  animation=sheet.animate([{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],{duration:1100,easing:sheetEase});
  animation.finished.catch(()=>{});
  layers().forEach((el,i)=>part(el,[{opacity:0,transform:'translateY(3px)'},{opacity:1,transform:'translateY(0)'}],{duration:950,delay:100+Math.min(i,5)*60,easing:airEase,fill:'backwards'}));
 }
 function close(immediate=false){
  if(!sheet.open||(closing&&!immediate))return;
  const ticket=++revision,shown=style(sheet),from={opacity:shown.opacity,transform:shown.transform};
  const content=layers().map(el=>{const s=style(el);return{el,from:{opacity:s.opacity,transform:s.transform}};});
  sheet.style.setProperty('--veil-exit',sheet.ownerDocument.defaultView.getComputedStyle(sheet,'::backdrop').opacity);
  cancel();
  if(immediate||reduced.matches){sheet.close();return;}
  closing=true;sheet.inert=true;sheet.classList.add('sheet-closing');
  content.reverse().forEach(({el,from},i)=>part(el,[from,{opacity:0,transform:'translateY(2px)'}],{duration:500,delay:Math.min(i,5)*35,easing:'cubic-bezier(.35,0,.25,1)',fill:'forwards'}));
  animation=sheet.animate([from,{opacity:0,transform:'translateY(5px)'}],{duration:1000,delay:200,easing:'cubic-bezier(.35,0,.25,1)',fill:'forwards'});
  animation.finished.then(()=>{if(ticket===revision)sheet.close();}).catch(()=>{});
 }
 sheet.addEventListener('cancel',event=>{event.preventDefault();close();});
 for(const name of ['pointerup','pointercancel'])sheet.ownerDocument.addEventListener(name,event=>{
  if(openingPointer===event.pointerId){openingPointer=null;backdropAfter=performance.now()+500;}
 },true);
 sheet.addEventListener('close',()=>{if(sheet.open)return;revision++;closing=false;cancel();sheet.inert=false;sheet.classList.remove('sheet-closing');});
 reduced.addEventListener?.('change',()=>{if(!reduced.matches)return;if(closing)close(true);else cancel();});
 return {open,close,outside:()=>{if(openingPointer===null&&performance.now()>=backdropAfter)close();}};
}
