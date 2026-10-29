import {sheetMotion} from './sheet-motion.mjs';
const node=(tag,text,className)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;};
export function attachActivity({onPracticeEnd=()=>{},allowPractice=true,canPractice=()=>true}){
 const paper=document.querySelector('.page,.letter-page'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const tabs=paper.querySelector('.memo-tabs')||node('nav',undefined,'memo-tabs');tabs.setAttribute('aria-label','紙邊備忘');
 const teach=node('button','教學','memo-tab'),about=node('button','關於','memo-tab');teach.id='paper-teach';about.id='paper-about';if(allowPractice)tabs.append(teach);tabs.append(about);if(!tabs.parentNode)paper.append(tabs);
 let returnFocus=about;
 const info=node('dialog',undefined,'sheet activity-sheet');info.setAttribute('aria-labelledby','activity-title');
 const heading=node('header',undefined,'sheet-heading');heading.dataset.sheetLayer='';const title=node('h2','1128 我會去投票');title.id='activity-title';const close=node('button','收起');heading.append(title,close);
 const lead=node('p','搖出生活裡的願望，想起一個人。把關心排成信，也看看相關議題有哪些公開回應。','activity-lead');lead.dataset.sheetLayer='';
 const start=node('button','使用教學：試試第一封信','practice-start');start.setAttribute('aria-label','使用教學：試試第一封信');start.dataset.sheetLayer='';
 const note=node('p','在獨立練習紙逐步操作，完成或離開後回到空白畫面。','sheet-caption');note.dataset.sheetLayer='';
 const versions=node('details',undefined,'version-info');versions.dataset.sheetLayer='';versions.append(node('summary','版本資訊'));
 versions.append(node('p','玩家介面預覽 · 2026/10/29'),node('p','石虎、臺灣藍鵲、水牛，陪你寫一封回家的邀請。'),node('p','Vote Card 開發預覽。插畫以 AI 協作生成；詞語是可自由重組的創作片段。'));
 versions.addEventListener('toggle',()=>{if(!versions.open||reduced.matches)return;for(const el of versions.querySelectorAll('p'))el.animate([{opacity:0,transform:'translateY(2px)'},{opacity:1,transform:'translateY(0)'}],{duration:900,easing:'cubic-bezier(.16,1,.3,1)'}).finished.catch(()=>{});});
 info.append(heading,lead);if(allowPractice)info.append(start,note);info.append(versions);document.body.append(info);
 if(!allowPractice){
  const motion=sheetMotion(info,reduced);about.addEventListener('click',()=>motion.open());close.addEventListener('click',()=>motion.close());
  info.addEventListener('close',()=>about.focus({preventScroll:true}));
  info.addEventListener('click',event=>{if(event.target!==info)return;const r=info.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)motion.outside();});
  return{open:()=>motion.open()};
 }
 const shell=node('dialog',undefined,'tutorial-shell');shell.setAttribute('aria-label','使用教學：試試第一封信：獨立練習紙');
 const frame=node('iframe');frame.title='第一封信操作教學';frame.className='tutorial-frame';shell.append(frame);document.body.append(shell);
 const infoMotion=sheetMotion(info,reduced),shellMotion=sheetMotion(shell,reduced);let launched=false;
 about.addEventListener('click',()=>{returnFocus=about;infoMotion.open();});close.addEventListener('click',()=>infoMotion.close());
 info.addEventListener('close',()=>{if(!shell.open)returnFocus.focus({preventScroll:true});});
 for(const [dialog,motion] of [[info,infoMotion],[shell,shellMotion]])dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)motion.outside();});
 function begin(){if(!canPractice()){infoMotion.close();return;}infoMotion.close(true);launched=true;frame.src='/?practice=1';shellMotion.open();frame.focus();}
 start.addEventListener('click',begin);teach.addEventListener('click',()=>{returnFocus=teach;begin();});
 window.addEventListener('message',event=>{
  if(event.origin!==location.origin||event.source!==frame.contentWindow||!['muzi:practice-finish','muzi:practice-exit'].includes(event.data?.type))return;
  shellMotion.close();
 });
 shell.addEventListener('close',()=>{frame.removeAttribute('src');if(launched){launched=false;onPracticeEnd();}returnFocus.focus({preventScroll:true});});
 return {open:()=>infoMotion.open()};
}
