"""Player-only store. No administration, passwords, or imported private data."""
import json, sqlite3
from contextlib import contextmanager
from pathlib import Path

class CatalogError(Exception):
 def __init__(self,message,status=422,code='VALIDATION_ERROR'):
  super().__init__(message);self.status=status;self.code=code

def encoded(value):return json.dumps(value,ensure_ascii=False,separators=(',',':'))
def text(value,name,maximum=1000,required=False):
 if not isinstance(value,str) or len(value)>maximum or any(ord(c)<32 and c not in '\n\t' for c in value):raise CatalogError(f'{name}格式不正確')
 value=value.strip()
 if required and not value:raise CatalogError(f'請填寫{name}')
 return value

class Store:
 def __init__(self,path,catalog):
  self.path=Path(path);self.path.parent.mkdir(parents=True,exist_ok=True)
  from .content import validate_content
  seed=encoded(validate_content(catalog))
  with self.connect() as db:
   db.executescript('''CREATE TABLE IF NOT EXISTS admin(id INTEGER PRIMARY KEY CHECK(id=1),salt TEXT,hash TEXT);
   CREATE TABLE IF NOT EXISTS sessions(hash TEXT PRIMARY KEY,csrf TEXT,expires REAL);
   CREATE TABLE IF NOT EXISTS content(id INTEGER PRIMARY KEY CHECK(id=1),draft TEXT,published TEXT,revision INTEGER);
   CREATE TABLE IF NOT EXISTS history(revision INTEGER PRIMARY KEY,snapshot TEXT,action TEXT,created TEXT DEFAULT CURRENT_TIMESTAMP);''')
   db.execute('INSERT OR IGNORE INTO content VALUES(1,?,?,1)',(seed,seed))
  try:self.path.chmod(0o600)
  except OSError:pass
 @contextmanager
 def connect(self):
  db=sqlite3.connect(self.path,timeout=10);db.row_factory=sqlite3.Row
  try:
   with db:yield db
  finally:db.close()
 def public(self):
  with self.connect() as db:row=db.execute('SELECT published,revision FROM content WHERE id=1').fetchone()
  return {**json.loads(row['published']),'contentVersion':str(row['revision'])}
 def editorial(self):
  with self.connect() as db:row=db.execute('SELECT * FROM content WHERE id=1').fetchone()
  return {'draft':json.loads(row['draft']),'published':json.loads(row['published']),'revision':row['revision']}
 def update(self,data,expected,publish=False):
  from .content import validate_content
  clean=encoded(validate_content(data))
  with self.connect() as db:
   db.execute('BEGIN IMMEDIATE');row=db.execute('SELECT * FROM content WHERE id=1').fetchone()
   if expected!=row['revision']:raise CatalogError('已有其他修訂，請重新載入再編輯',409,'REVISION_CONFLICT')
   revision=row['revision']+1
   db.execute('INSERT INTO history(revision,snapshot,action) VALUES(?,?,?)',(row['revision'],row['draft'],'publish' if publish else 'save'))
   db.execute('UPDATE content SET draft=?,published=?,revision=? WHERE id=1',(clean,clean if publish else row['published'],revision))
  return self.editorial()
 def history(self):
  with self.connect() as db:return [dict(r) for r in db.execute('SELECT revision,action,created FROM history ORDER BY revision DESC LIMIT 50')]
 def restore(self,revision,expected):
  with self.connect() as db:row=db.execute('SELECT snapshot FROM history WHERE revision=?',(revision,)).fetchone()
  if not row:raise CatalogError('找不到這個版本',404)
  return self.update(json.loads(row['snapshot']),expected)
