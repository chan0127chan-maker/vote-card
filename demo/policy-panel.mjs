import {focusTopics,selectionFor,statusLabel} from './policy.mjs';
import {capturePolicyVisual} from './print-layout.mjs';
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
const print=(tag,text,cls)=>{const n=el(tag,text,cls);n.dataset.print='';if(cls?.startsWith('policy-status'))n.dataset.printBox='';return n;};
export function policyStrip(policy,{onCandidates}={}){
 const panel=el('section',null,'policy-strip');panel.setAttribute('aria-label','字詞聚焦的議題');
 if(!policy){panel.append(print('p','再搖一個願望，留下你在意的人。','policy-wait'));return panel;}
 panel.append(print('p',policy.complete===false?'這些字，正在靠近……':'這些字，說的是……','policy-eyebrow'),print('h2',policy.title));
 const list=el('div',null,'policy-grid');
 for(const r of policy.records){const card=el('article',null,'policy-record');card.dataset.printBox='';card.append(print('h3',r.candidate.name),print('span',statusLabel[r.status],'policy-status '+r.status),print('p',r.brief||r.summary));
  const link=print('a','原始出處 ↗');link.href=r.sourceUrl;link.target='_blank';link.rel='noopener noreferrer';card.append(link);list.append(card);}
 panel.append(list,print('p',(policy.partial?'部分候選人摘錄。':'本來源收錄候選人。')+'截至 '+policy.asOf,'policy-small'),print('p','尚未收錄 ≠ 沒有主張','policy-small'),print('p','blindvote.app/sources/miaoli','policy-source-address'));
 return panel;
}
export function attachPolicyPanel({getCatalog,getWordIds,canEdit,onChange}){
 const paper=document.querySelector('.page'),tabs=paper.querySelector('.memo-tabs');
 const tab=el('button','議題','memo-tab');tabs.append(tab);
 let topic=null,candidateIds=[],initialized=false,panel=null,lastKey='';
 const chooser=el('div',null,'candidate-switches');chooser.setAttribute('role','group');chooser.setAttribute('aria-label','分享圖呈現的候選人');paper.append(chooser);
 const size=new ResizeObserver(()=>{if(panel){const h=panel.getBoundingClientRect().height;paper.style.setProperty('--policy-height',h+'px');chooser.style.top='calc(100% + '+(h+36)+'px)';}});
 function refresh(){
  const data=getCatalog();if(!data.candidates)return;
  if(!initialized){candidateIds=data.candidates.map(c=>c.id);initialized=true;}
  const focused=focusTopics(data.topics,data.words,getWordIds());topic=focused[0]||null;
  const selection=topic?{...selectionFor(data,topic.id,candidateIds),complete:topic.complete,asOf:data.asOf}:null;
  const key=JSON.stringify(selection);if(key===lastKey)return;lastKey=key;
  const next=policyStrip(selection);if(panel){size.unobserve(panel);panel.replaceWith(next);}else paper.append(next);panel=next;size.observe(panel);
  chooser.replaceChildren();for(const c of data.candidates){const label=el('label'),input=el('input');input.type='checkbox';input.checked=candidateIds.includes(c.id);input.setAttribute('aria-label',c.name);
   input.addEventListener('change',()=>{if(!canEdit()||(!input.checked&&candidateIds.length===1)){input.checked=!input.checked;return;}candidateIds=input.checked?[...candidateIds,c.id]:candidateIds.filter(id=>id!==c.id);onChange();refresh();});label.append(input,el('span',c.name));chooser.append(label);}
 }
 function open(){refresh();panel?.scrollIntoView({block:'nearest',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
 tab.addEventListener('click',open);new MutationObserver(()=>refresh()).observe(document.getElementById('words'),{childList:true,subtree:true,characterData:true});refresh();
 return {open,refresh,reset(){topic=null;lastKey='';},isConfirmed:()=>Boolean(topic),snapshot(){refresh();if(!topic)throw Error('再留下幾個有關聯的詞，讓議題慢慢聚焦。');return {...selectionFor(getCatalog(),topic.id,candidateIds),candidateIds,asOf:getCatalog().asOf,sourceUrl:getCatalog().sourceUrl};},visual:()=>capturePolicyVisual(panel)};
}
