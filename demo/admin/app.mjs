const $=id=>document.getElementById(id),node=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
let csrf='',setup=false,documentState=null,draft=null,view='words',editing=null,dirty=false,busy=false;
const message=s=>$('status').textContent=s;
async function api(path,method='GET',body){const r=await fetch('/api/admin/'+path,{method,headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:body?JSON.stringify(body):undefined}),data=await r.json();if(!r.ok)throw Error(data.error?.message||'操作失敗');return data.data;}
async function run(fn){if(busy)return;busy=true;for(const b of document.querySelectorAll('#save,#publish,#logout'))b.disabled=true;try{await fn();}catch(e){message(e.message);}finally{busy=false;for(const b of document.querySelectorAll('#save,#publish,#logout'))b.disabled=false;}}
async function session(){const s=await api('session');setup=s.setupRequired;csrf=s.csrfToken||'';$('login').hidden=s.authenticated;$('workspace').hidden=!s.authenticated;$('logout').hidden=!s.authenticated;$('login-title').textContent=setup?'設定這個專案的管理密碼':'登入內容工作台';$('login-note').textContent=setup?'首次設定，請使用 12–200 個字元。這個密碼只用於 Vote Card。':'';$('password').autocomplete=setup?'new-password':'current-password';if(s.authenticated)await load();}
async function load(){documentState=await api('content');draft=structuredClone(documentState.draft);dirty=false;$('asof').value=draft.asOf;await render();}
$('login-form').addEventListener('submit',e=>{e.preventDefault();run(async()=>{const s=await api(setup?'setup':'login','POST',{password:$('password').value});$('password').value='';csrf=s.csrfToken;await session();message('已登入。');});});
$('logout').addEventListener('click',()=>run(async()=>{await api('logout','POST',{});await session();message('已登出。');}));
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{view=b.dataset.view;render();}));
$('search').addEventListener('input',render);$('asof').addEventListener('change',()=>{draft.asOf=$('asof').value;changed();});
function changed(){dirty=true;$('revision').textContent=`修訂 ${documentState.revision} · 工作表有未儲存修改`;}
function title(role){return {wish:'生活願望',audience:'關心對象',feeling:'情感片段'}[role]||role;}
async function render(){
 if(!draft)return;$('revision').textContent=`修訂 ${documentState.revision}${dirty?' · 工作表有未儲存修改':''}`;document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(view===b.dataset.view)));
 $('new').hidden=view==='history';$('rows').replaceChildren();$('columns').replaceChildren();
 const headings={words:['編號','字詞','角色／編碼','操作'],topics:['議題','政策編碼','候選人狀態','操作'],candidates:['編號','姓名','操作'],history:['修訂','動作','時間','操作']}[view];const tr=node('tr');for(const x of headings)tr.append(node('th',x));$('columns').append(tr);
 const list=view==='history'?await api('history'):draft[view];const q=$('search').value.trim().toLowerCase();
 for(const item of list.filter(x=>!q||JSON.stringify(x).toLowerCase().includes(q))){
  const row=node('tr');let cells;
  if(view==='words')cells=[item.id,item.text,title(item.role)+' · '+(item.codes||[]).join('、')];
  else if(view==='topics')cells=[item.title,(item.codes||[]).join('、'),item.records.map(r=>(draft.candidates.find(c=>c.id===r.candidateId)?.name||r.candidateId)+'：'+({pledge:'主張',plan:'政府計畫',uncollected:'尚未收錄'}[r.status])).join('／')];
  else if(view==='candidates')cells=[item.id,item.name];else cells=[item.revision,item.action==='publish'?'發布前快照':'草稿快照',item.created];
  for(const text of cells)row.append(node('td',text));const actions=node('td'),edit=node('button',view==='history'?'還原為草稿':'編輯');edit.addEventListener('click',()=>{if(view==='history')run(async()=>{if(dirty&&!confirm('工作表有未儲存修改。要載入此舊版草稿嗎？'))return;const result=await api('restore','POST',{revision:item.revision,expectedRevision:documentState.revision});documentState=result;draft=structuredClone(result.draft);dirty=false;$('asof').value=draft.asOf;await render();message('已還原為草稿，玩家頁尚未變更。');});else openEditor(item);});actions.append(edit);
  if(view!=='history'){const remove=node('button','移除');remove.addEventListener('click',()=>{if(!confirm('從工作表移除此筆？儲存與發布前不影響玩家。'))return;draft[view]=draft[view].filter(x=>x.id!==item.id);if(view==='candidates')for(const t of draft.topics)t.records=t.records.filter(r=>r.candidateId!==item.id);changed();render();});actions.append(remove);}row.append(actions);$('rows').append(row);
 }
}
function field(label,value='',type='text',choices){const l=node('label',label),input=node(choices?'select':type==='textarea'?'textarea':'input');if(!choices&&type!=='textarea')input.type=type;if(choices)for(const [v,t]of choices){const option=node('option',t);option.value=v;input.append(option);}input.value=value;l.append(input);$('fields').append(l);return input;}
function checks(title,items,selected){const f=node('fieldset');f.append(node('legend',title));const result=[];for(const w of items){const label=node('label'),input=node('input');input.type='checkbox';input.checked=selected.includes(w.id);label.append(input,node('span',w.text));f.append(label);result.push([w.id,input]);}$('fields').append(f);return()=>result.filter(([,n])=>n.checked).map(([id])=>id);}
let collect;
function openEditor(item){
 editing=item;const kind=view;$('edit-title').textContent={words:'編修生活片段',topics:'編修議題與政見',candidates:'編修候選人'}[kind];$('fields').replaceChildren();$('edit-error').textContent='';const id=field('編號（英數字、短橫線）',item?.id||'');id.required=true;id.disabled=Boolean(item);
 if(kind==='words'){const text=field('字詞（最多 12 字）',item?.text||''),role=field('片段角色',item?.role||'wish','text',[['wish','生活願望'],['audience','關心對象'],['feeling','情感片段']]);const codes=field('政策編碼（逗號分隔：need:eating、age:senior 等）',(item?.codes||[]).join(', '));collect=()=>({id:id.value,text:text.value,role:role.value,codes:codes.value.split(/[,，、]/).map(x=>x.trim()).filter(Boolean)});}
 else if(kind==='candidates'){const name=field('候選人姓名',item?.name||'');collect=()=>({id:id.value,name:name.value});}
 else{const name=field('議題名稱',item?.title||''),wishes=checks('代表生活願望（編輯備註）',draft.words.filter(w=>w.role==='wish'),item?.wishes||[]),audiences=checks('代表關心對象（編輯備註）',draft.words.filter(w=>w.role==='audience'),item?.audiences||[]);const readers=[];
  for(const c of draft.candidates){const r=item?.records.find(x=>x.candidateId===c.id);$('fields').append(node('h3',c.name));const status=field('資料狀態',r?.status||'uncollected','text',[['pledge','已收錄主張'],['plan','政府進行中計畫'],['uncollected','此來源尚未收錄']]),summary=field('完整摘要（最多 95 字）',r?.summary||'截至本次資料日期，此來源尚未收錄。','textarea'),brief=field('圖面短句（最多 26 字，Facebook／限時動態使用）',r?.brief||''),sourceTitle=field('來源名稱',r?.sourceTitle||'留白投票所苗栗資料頁'),sourceUrl=field('出處網址（HTTPS）',r?.sourceUrl||draft.sourceUrl,'url');readers.push(()=>({candidateId:c.id,status:status.value,summary:summary.value,brief:brief.value,sourceTitle:sourceTitle.value,sourceUrl:sourceUrl.value}));}
  const codes=field('聚焦條件編碼（同一維度可擇一，不同維度會收攏）',(item?.codes||[]).join(', '));collect=()=>({id:id.value,title:name.value,codes:codes.value.split(/[,，、]/).map(x=>x.trim()).filter(Boolean),wishes:wishes(),audiences:audiences(),records:readers.map(fn=>fn())});}
 $('editor').showModal();
}
$('new').addEventListener('click',()=>openEditor(null));$('cancel').addEventListener('click',()=>$('editor').close());
$('edit-form').addEventListener('submit',e=>{e.preventDefault();const value=collect();if(!/^[A-Za-z0-9_-]{1,60}$/.test(value.id)){ $('edit-error').textContent='請填寫正確編號。';return;}if(!editing&&draft[view].some(x=>x.id===value.id)){$('edit-error').textContent='這個編號已存在。';return;}
 if(editing)draft[view]=draft[view].map(x=>x.id===editing.id?value:x);else{draft[view].push(value);if(view==='candidates')for(const t of draft.topics)t.records.push({candidateId:value.id,status:'uncollected',summary:'截至本次資料日期，此來源尚未收錄。',sourceTitle:'留白投票所苗栗資料頁',sourceUrl:draft.sourceUrl});}changed();$('editor').close();render();message('已套用工作表；請儲存草稿或發布。');});
async function save(publish){if(publish&&!confirm('將工作表發布到玩家頁？已寄出的信不會改動。'))return;documentState=await api('content','PUT',{content:draft,expectedRevision:documentState.revision,publish});draft=structuredClone(documentState.draft);dirty=false;await render();message(publish?'已發布。重新開啟玩家頁會載入新版。':'草稿已儲存，玩家頁不受影響。');}
$('save').addEventListener('click',()=>run(()=>save(false)));$('publish').addEventListener('click',()=>run(()=>save(true)));
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});run(session);
