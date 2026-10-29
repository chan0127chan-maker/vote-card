export function nextFragment(pool,usedIds,step,rng=Math.random){
 const used=new Set(usedIds),available=pool.filter(w=>!used.has(w.id));
 const role=['wish','audience','feeling'][step%3];
 const matching=available.filter(w=>w.role===role),choices=matching.length?matching:available;
 return choices.length?choices[Math.min(choices.length-1,Math.floor(rng()*choices.length))]:null;
}
export function relatedTopics(topics,ids){
 const chosen=new Set(ids);
 return topics.filter(t=>t.wishes.some(id=>chosen.has(id))&&t.audiences.some(id=>chosen.has(id)));
}
export function selectionFor(data,topicId,candidateIds){
 const topic=data.topics.find(t=>t.id===topicId);if(!topic)throw Error('請先選一個議題。');
 const candidates=data.candidates.filter(c=>candidateIds.includes(c.id));if(!candidates.length)throw Error('至少保留一位候選人。');
 return {...topic,candidates,records:candidates.map(c=>({...topic.records.find(r=>r.candidateId===c.id),candidate:c})),partial:candidates.length!==data.candidates.length};
}
export function normalizeSignature(value){
 if(typeof value!=='string'||/[\u0000-\u001f\u007f]/u.test(value))throw Error('署名請使用單行文字。');
 value=value.normalize('NFC').trim();if([...value].length>12)throw Error('署名最多 12 個字。');return value;
}
export const statusLabel={pledge:'已收錄主張',plan:'政府進行中計畫',uncollected:'此來源尚未收錄'};
export function completeFragmentIds(tokens){
 const groups=new Map();
 for(const t of tokens)for(const c of t.characters){const o=c.origin;if(!o?.wordId)continue;const key=o.id||o.wordId;if(!groups.has(key))groups.set(key,{id:o.wordId,text:o.wordText,indexes:new Set()});groups.get(key).indexes.add(c.index);}
 return [...new Set([...groups.values()].filter(g=>[...g.text].every((_,i)=>g.indexes.has(i))).map(g=>g.id))];
}
export function focusTopics(topics,pool,ids){
 const codes=new Set(pool.filter(w=>ids.includes(w.id)).flatMap(w=>w.codes||[]));
 return topics.map(t=>{
  const groups=new Map();for(const code of t.codes||[]){const dim=code.split(':')[0];if(!groups.has(dim))groups.set(dim,[]);groups.get(dim).push(code);}
  let hits=0;
  for(const [dim,values]of groups){const active=[...codes].filter(c=>c.startsWith(dim+':'));if(active.length&&!values.some(v=>codes.has(v)))return null;if(values.some(v=>codes.has(v)))hits++;}
  if(!hits||![...codes].some(c=>(c.startsWith('need:')||c.startsWith('context:'))&&(t.codes||[]).includes(c)))return null;
  return {...t,focusScore:hits*10+hits/Math.max(1,groups.size)*20,complete:hits===groups.size};
 }).filter(Boolean).sort((a,b)=>b.focusScore-a.focusScore||a.id.localeCompare(b.id));
}
