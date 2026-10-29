"""Opt-in, read-only letter snapshots with six calendar months of access."""
import calendar,math,re,secrets
from datetime import datetime,timezone
from .store import CatalogError,encoded,text

def six_months_later(value):
 month=value.month+6;year=value.year+(month-1)//12;month=(month-1)%12+1
 return value.replace(year=year,month=month,day=min(value.day,calendar.monthrange(year,month)[1]))
def stamp(value):return value.isoformat(timespec='seconds').replace('+00:00','Z')
def number(value,minimum,maximum):
 if isinstance(value,bool) or not isinstance(value,(int,float)) or not math.isfinite(value) or not minimum<=value<=maximum:
  raise CatalogError('文字位置不正確')
 return value

class Letters:
 def __init__(self,store):
  self.store=store
  with store.connect() as db:
   db.execute('CREATE TABLE IF NOT EXISTS letters(id TEXT PRIMARY KEY,payload TEXT,created TEXT NOT NULL,expires TEXT NOT NULL)')
   db.execute('CREATE INDEX IF NOT EXISTS letters_expiry ON letters(expires)')
 def create(self,data):
  if not isinstance(data,dict):raise CatalogError('請先留下一些字')
  width=number(data.get('width'),64,2400);height=number(data.get('height'),64,4000)
  social_format=data.get('format')
  if social_format not in [None,'facebook','story']:raise CatalogError('分享比例不正確')
  if social_format and abs(width/height-({'facebook':1200/630,'story':9/16}[social_format]))>.02:raise CatalogError('畫布尺寸與分享比例不一致')
  font_size=number(data.get('fontSize',24),12,48)
  stamp_data=data.get('stamp',{'x':24,'y':28,'width':96})
  if not isinstance(stamp_data,dict):raise CatalogError('郵票位置不正確')
  stamp_data={'x':number(stamp_data.get('x'),0,width),'y':number(stamp_data.get('y'),0,height),'width':number(stamp_data.get('width'),32,200)}
  tokens=data.get('tokens')
  if not isinstance(tokens,list) or not 1<=len(tokens)<=256:raise CatalogError('一次可留下 256 字以內')
  public=self.store.public();words={w['id']:w for w in public['words']};origins={};clean=[];total=0
  selection=data.get('policy')
  if not isinstance(selection,dict):raise CatalogError('先確認這張信關心的議題')
  topic=next((t for t in public['topics'] if t['id']==selection.get('id')),None)
  ids=selection.get('candidateIds')
  if not topic or not isinstance(ids,list) or not ids or any(not isinstance(x,str) or x not in [c['id'] for c in public['candidates']] for x in ids) or len(set(ids))!=len(ids):raise CatalogError('議題或候選人選擇不正確')
  candidates=[c for c in public['candidates'] if c['id'] in ids]
  policy={**topic,'candidates':candidates,'records':[{**r,'candidate':next(c for c in candidates if c['id']==r['candidateId'])} for r in topic['records'] if r['candidateId'] in ids],'partial':len(ids)!=len(public['candidates']),'asOf':public['asOf'],'sourceUrl':public['sourceUrl']}
  signature=text(data.get('signature',''),'署名',12)
  if any(ord(c)<32 for c in signature):raise CatalogError('署名請使用單行文字')
  signature_frame=data.get('signatureFrame')
  if signature_frame is not None:
   if not isinstance(signature_frame,dict):raise CatalogError('署名位置不正確')
   signature_frame={'x':number(signature_frame.get('x'),0,1),'y':number(signature_frame.get('y'),0,1),'fontSize':number(signature_frame.get('fontSize'),4,48)}
  for token in tokens:
   if not isinstance(token,dict):raise CatalogError('文字格式不正確')
   chars=token.get('characters');glyphs=token.get('glyphs')
   if not isinstance(chars,list) or not isinstance(glyphs,list) or not 1<=len(chars)<=256 or len(chars)!=len(glyphs):raise CatalogError('文字位置不完整')
   total+=len(chars)
   if total>256:raise CatalogError('一次可留下 256 字以內')
   result=[];positions=[]
   for item,point in zip(chars,glyphs):
    if not isinstance(item,dict) or not isinstance(point,dict):raise CatalogError('文字格式不正確')
    char=item.get('char');index=item.get('index');key=item.get('originKey');word_id=item.get('wordId')
    original=text(item.get('original',''),'原詞',32,True)
    if not isinstance(char,str) or len(char)!=1 or ord(char)<32 or ord(char)==127 or isinstance(index,bool) or not isinstance(index,int) or not 0<=index<len(original) or original[index]!=char:raise CatalogError('字與原詞不一致')
    if not isinstance(key,str) or not re.fullmatch(r'[A-Za-z0-9:_-]{1,160}',key):raise CatalogError('文字識別不正確')
    signature=(word_id,original)
    if key in origins and origins[key][0]!=signature:raise CatalogError('原詞識別不一致')
    if key not in origins:
     if word_id is None:
      raise CatalogError('這個版本只使用詞庫片段，署名請填在署名欄')
     else:
      if not isinstance(word_id,str) or word_id not in words or words[word_id]['text']!=original:raise CatalogError('詞庫已更新，請重新拾字後再留下連結',409,'CATALOG_CHANGED')
      word=words[word_id];links=[]
      for link in word['sourceLinks']:
       source=public['sources'].get(link['sourceId'])
       if not source:raise CatalogError('這段來處暫時無法分享')
       links.append({'sourceId':source['id'],'source':{'id':source['id'],'title':source['title'],'summary':source['summary'],'url':source.get('url','')}})
      origin={'id':'catalog:'+key,'type':'catalog','wordId':word_id,'wordText':original,'provenance':'editorial_association','links':links}
     origins[key]=(signature,origin)
    result.append({'char':char,'index':index,'origin':origins[key][1]})
    positions.append({'x':number(point.get('x'),0,1),'y':number(point.get('y'),0,1)})
   clean.append({'characters':result,'glyphs':positions})
  created=datetime.now(timezone.utc);expires=stamp(six_months_later(created));created=stamp(created);identifier=secrets.token_urlsafe(24)
  with self.store.connect() as db:
   db.execute('BEGIN IMMEDIATE')
   db.execute('UPDATE letters SET payload=NULL WHERE expires<=?',(created,))
   if db.execute('SELECT count(*) FROM letters WHERE payload IS NOT NULL').fetchone()[0]>=5000:raise CatalogError('信箱暫時滿了，仍可存成圖片',503,'LETTER_CAPACITY')
   db.execute('INSERT INTO letters VALUES(?,?,?,?)',(identifier,encoded({'format':social_format,'width':width,'height':height,'fontSize':font_size,'stamp':stamp_data,'tokens':clean,'signature':signature,'signatureFrame':signature_frame,'policy':policy}),created,expires))
  return {'id':identifier,'createdAt':created,'expiresAt':expires}
 def get(self,identifier):
  if not re.fullmatch(r'[A-Za-z0-9_-]{32}',identifier):raise CatalogError('找不到這封信',404,'LETTER_NOT_FOUND')
  with self.store.connect() as db:row=db.execute('SELECT * FROM letters WHERE id=?',(identifier,)).fetchone()
  if not row:raise CatalogError('找不到這封信',404,'LETTER_NOT_FOUND')
  if row['expires']<=stamp(datetime.now(timezone.utc)) or row['payload'] is None:
   with self.store.connect() as db:db.execute('UPDATE letters SET payload=NULL WHERE id=?',(identifier,))
   raise CatalogError('這封信的半年閱讀時間已經結束。',410,'LETTER_EXPIRED')
  import json
  return {'id':identifier,'createdAt':row['created'],'expiresAt':row['expires'],**json.loads(row['payload'])}
