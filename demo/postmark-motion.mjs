import {airEase} from './sheet-motion.mjs';
import {letterLayout,postmarkText} from './letter-art.mjs';
const ns='http://www.w3.org/2000/svg';
export function paintPostmark(svg,scene){
 const mark=postmarkText(scene);svg.replaceChildren();if(!mark)return;
 svg.setAttribute('viewBox','0 0 540 300');
 const make=(tag,attrs,text)=>{const el=document.createElementNS(ns,tag);for(const [key,value]of Object.entries(attrs))el.setAttribute(key,value);if(text)el.textContent=text;svg.append(el);};
 for(const [r,width] of [[145,8],[128,4]])make('circle',{cx:150,cy:150,r,'stroke-width':width});
 make('path',{d:'M280 70C350 45 400 95 540 70M280 110C350 85 400 135 540 110M280 150C350 125 400 175 540 150M280 190C350 165 400 215 540 190M280 230C350 205 400 255 540 230'});
 make('text',{x:150,y:95,'font-size':28,'font-weight':800,'font-family':'var(--serif)'},mark.label);
 mark.lines.forEach((line,i)=>make('text',{x:150,y:mark.lines.length===1?165:144+i*46,'font-size':32,'font-weight':800,'font-family':'var(--serif)'},line));
}
export function positionPostmark(svg,scene){
 const layout=letterLayout(scene),r=layout.postmark;
 for(const [name,value,base]of [['left',r.left,layout.width],['top',r.top,layout.height],['width',r.width,layout.width],['height',r.height,layout.height]])svg.style[name]=`${value/base*100}%`;
}
export function postmarkMotion(svg,reduced){
 let animation=null,revision=0;
 function show(scene,animate=true){
  revision++;animation?.cancel();paintPostmark(svg,scene);svg.removeAttribute('hidden');svg.dataset.sealed='true';
  if(!animate||reduced.matches)return;
  animation=svg.animate([{opacity:0,transform:'translateY(-9px) scale(1.16) rotate(-5deg)'},{opacity:.9,offset:.25},{opacity:1,transform:'translateY(0) scale(1) rotate(0deg)'}],{duration:1150,easing:airEase});animation.finished.catch(()=>{});
 }
 function hide(){
  const ticket=++revision,opacity=getComputedStyle(svg).opacity;animation?.cancel();delete svg.dataset.sealed;
  if(svg.hasAttribute('hidden'))return Promise.resolve(true);
  if(reduced.matches){svg.setAttribute('hidden','');return Promise.resolve(true);}
  animation=svg.animate([{opacity},{opacity:0}],{duration:950,easing:airEase,fill:'forwards'});
  return animation.finished.then(()=>{if(ticket===revision){svg.setAttribute('hidden','');return true;}return false;}).catch(()=>false);
 }
 reduced.addEventListener?.('change',()=>{if(!reduced.matches)return;animation?.cancel();if(svg.dataset.sealed==='true')svg.removeAttribute('hidden');else svg.setAttribute('hidden','');});
 return{show,hide};
}
