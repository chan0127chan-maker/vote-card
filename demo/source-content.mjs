import {originGroups} from './origins.mjs';
const node=(tag,text,className)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;};
function safeLink(value){try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password?url.href:null;}catch{return null;}}
export function renderSources(body,characters,personalNote='這幾個字，來自你。'){
 const groups=originGroups(characters);body.replaceChildren();
  for(const group of groups) {
   const section=node('section',undefined,'origin-group');
   if(groups.length>1)section.append(node('h3',group.text));
   if(group.type==='personal') section.append(node('p',personalNote));
   else if(!group.links.length)section.append(node('p','這是邀請你自由重組的創作片段，把自己的記憶寫進來。'));
   for(const link of group.links) {
    const source=link.source;
    if(!source){section.append(node('p','這段地方記憶，還在整理途中。'));continue;}
    const card=node('article',undefined,'source-card');
    card.append(node('h4',source.title),node('p',source.summary));
    const href=safeLink(source.url);
    if(href){const a=node('a','看看這個地方 ↗');a.href=href;a.target='_blank';a.rel='noopener noreferrer';card.append(a);}
    section.append(card);
   }
   body.append(section);
  }
}
