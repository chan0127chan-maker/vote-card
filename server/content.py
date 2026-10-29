"""Validate editorial content, not client-supplied political conclusions."""
import re
from datetime import date
from urllib.parse import urlsplit
from .store import CatalogError,text

def link(value):
 value=text(value,'來源連結',1500,True);p=urlsplit(value)
 if p.scheme!='https' or not p.netloc or p.username or p.password:raise CatalogError('來源需為完整 HTTPS 網址')
 return value
def key(value):
 if not isinstance(value,str) or not re.fullmatch(r'[a-zA-Z0-9_-]{1,60}',value):raise CatalogError('編號僅限英數字、底線與短橫線')
 return value
def unique(items,label):
 if len(items)!=len(set(items)):raise CatalogError(label+'編號重複')
def codes(value):
 if not isinstance(value,list) or len(value)>16 or any(not isinstance(c,str) or not re.fullmatch(r'(need|age|identity|context|emotion):[a-z0-9_-]{1,50}',c) for c in value):raise CatalogError('政策編碼需為 need/age/identity/context/emotion:英數代碼')
 return list(dict.fromkeys(value))
def validate_content(data):
 if not isinstance(data,dict):raise CatalogError('內容格式不正確')
 try:asof=date.fromisoformat(data['asOf']).isoformat()
 except (KeyError,TypeError,ValueError):raise CatalogError('請填寫正確的資料日期')
 candidates=data.get('candidates');words=data.get('words');topics=data.get('topics')
 if not isinstance(candidates,list) or not 1<=len(candidates)<=8:raise CatalogError('請保留 1–8 位候選人')
 if not isinstance(words,list) or not 2<=len(words)<=500:raise CatalogError('詞庫需有 2–500 個片段')
 if not isinstance(topics,list) or not 1<=len(topics)<=60:raise CatalogError('議題需有 1–60 筆')
 try:
  cs=[{'id':key(c['id']),'name':text(c['name'],'候選人姓名',20,True)} for c in candidates]
  ws=[]
  for w in words:
   if w.get('role') not in ['wish','audience','feeling']:raise CatalogError('請選擇片段角色')
   ws.append({'id':key(w['id']),'text':text(w['text'],'字詞',12,True),'role':w['role'],'codes':codes(w.get('codes',[])),'kind':{'wish':'image','audience':'voice','feeling':'turn'}[w['role']],'tags':[w['role']],'weight':1,'provenance':'editorial_association','sourceLinks':[]})
  if not all(any(w['role']==r for w in ws) for r in ['wish','audience']):raise CatalogError('至少需要一個願望和一個對象片段')
  unique([c['id'] for c in cs],'候選人');unique([w['id'] for w in ws],'詞條');unique([w['text'] for w in ws],'詞條文字')
  ids={c['id'] for c in cs};word_ids={w['id']:w['role'] for w in ws};ts=[]
  for t in topics:
   wishes=t['wishes'];audiences=t['audiences'];records=t['records']
   if not isinstance(wishes,list) or not wishes or any(word_ids.get(x)!='wish' for x in wishes):raise CatalogError('議題需連到有效的願望片段')
   if not isinstance(audiences,list) or not audiences or any(word_ids.get(x)!='audience' for x in audiences):raise CatalogError('議題需連到有效的對象片段')
   if not isinstance(records,list) or len(records)!=len(ids) or {r['candidateId'] for r in records}!=ids:raise CatalogError('每個議題需包含每一位候選人的狀態')
   rs=[]
   for r in records:
    if r['status'] not in ['pledge','plan','uncollected']:raise CatalogError('政見狀態不正確')
    summary=text(r['summary'],'摘要',95,True)
    rs.append({'candidateId':r['candidateId'],'status':r['status'],'summary':summary,'brief':text(r.get('brief',summary[:26]),'圖面短句',26,True),'sourceTitle':text(r['sourceTitle'],'來源名稱',60,True),'sourceUrl':link(r['sourceUrl'])})
   ts.append({'id':key(t['id']),'title':text(t['title'],'議題',30,True),'codes':codes(t.get('codes',[])),'wishes':wishes,'audiences':audiences,'records':rs})
  unique([t['id'] for t in ts],'議題')
 except (KeyError,TypeError):raise CatalogError('內容欄位不完整')
 return {'asOf':asof,'sourceUrl':link(data.get('sourceUrl')),'candidates':cs,'words':ws,'sources':{},'topics':ts}
