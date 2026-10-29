"""Add the reviewed prototype material without publishing an editor's draft."""
import copy,json,sqlite3,time
from pathlib import Path
from .store import Store,encoded
from .content import validate_content

def main():
 root=Path(__file__).resolve().parents[1];seed=json.loads((root/'content/site.json').read_text());store=Store(root/'.data/letters.sqlite',seed)
 backup=root/'.data'/('before-social-formats-'+time.strftime('%Y%m%d-%H%M%S')+'.sqlite')
 with store.connect() as source:
  with sqlite3.connect(backup) as target:source.backup(target)
 def merge(original):
  data=copy.deepcopy(original);ids={w['id'] for w in data['words']};texts={w['text']:w['id'] for w in data['words']};mapping={}
  for w in seed['words']:
   if w['id'] in ids:
    existing=next(x for x in data['words'] if x['id']==w['id']);mapping[w['id']]=existing['id']
    if existing['text']==w['text'] and (not existing.get('codes') or w['id']=='walk' or w['id'].startswith('walk-variation-')):existing['codes']=w['codes']
   elif w['text'] in texts:mapping[w['id']]=texts[w['text']]
   else:data['words'].append(copy.deepcopy(w));mapping[w['id']]=w['id'];ids.add(w['id']);texts[w['text']]=w['id']
  for t in seed['topics']:
   existing=next((x for x in data['topics'] if x['id']==t['id']),None)
   if existing:
    if not existing.get('codes') or t['id']=='walking':existing['codes']=t['codes']
    for r in existing['records']:
     source=next((x for x in t['records'] if x['candidateId']==r['candidateId']),None)
     if not r.get('brief') and source and source['summary']==r['summary']:r['brief']=source['brief']
   else:
    added=copy.deepcopy(t);added['wishes']=[mapping[x] for x in t['wishes']];added['audiences']=[mapping[x] for x in t['audiences']]
    added['records']=[next((copy.deepcopy(r) for r in t['records'] if r['candidateId']==c['id']),{'candidateId':c['id'],'status':'uncollected','summary':'此來源尚未收錄這個具體項目。','brief':'此來源尚未收錄這個具體項目。','sourceTitle':'留白投票所苗栗資料頁','sourceUrl':data['sourceUrl']}) for c in data['candidates']];data['topics'].append(added)
  return validate_content(data)
 with store.connect() as db:
  db.execute('BEGIN IMMEDIATE');row=db.execute('SELECT * FROM content WHERE id=1').fetchone();draft=merge(json.loads(row['draft']));published=merge(json.loads(row['published']))
  db.execute('INSERT INTO history(revision,snapshot,action) VALUES(?,?,?)',(row['revision'],row['draft'],'social-format-upgrade'))
  db.execute('UPDATE content SET draft=?,published=?,revision=? WHERE id=1',(encoded(draft),encoded(published),row['revision']+1))
 print('Updated:',len(published['words']),'fragments;',len(published['topics']),'topics. Local backup created; draft isolation retained.')

if __name__=='__main__':main()
