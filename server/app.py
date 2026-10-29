"""Local-only catalog service. Run: python3 -m server.app"""
import argparse, hashlib, hmac, http.cookies, json, mimetypes, secrets, threading, time
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlparse, parse_qs, unquote
from .store import Store, CatalogError, encoded
from .letters import Letters

ROOT=Path(__file__).resolve().parent.parent

def password_hash(password,salt): return hashlib.pbkdf2_hmac('sha256',password.encode(),bytes.fromhex(salt),600000).hex()

class Service:
    def __init__(self,store): self.store=store; self.letters=Letters(store); self.attempts={}; self.share_attempts={}; self.lock=threading.Lock()
    def create_letter(self,data,ip):
        with self.lock:
            recent=[t for t in self.share_attempts.get(ip,[]) if t>time.time()-900]
            if len(recent)>=20: raise CatalogError('先讓這些字慢慢寄出，稍後再試；仍可存成圖片。',429,'RATE_LIMITED')
            recent.append(time.time()); self.share_attempts[ip]=recent
        return self.letters.create(data)
    def configured(self):
        with self.store.connect() as db: return bool(db.execute('SELECT 1 FROM admin').fetchone())
    def setup(self,password):
        if not isinstance(password,str) or not 12<=len(password)<=200: raise CatalogError('管理密碼需為 12–200 個字元')
        salt=secrets.token_hex(24); digest=password_hash(password,salt)
        with self.store.connect() as db:
            db.execute('BEGIN IMMEDIATE')
            if db.execute('SELECT 1 FROM admin').fetchone(): raise CatalogError('管理員已設定',409,'ALREADY_CONFIGURED')
            db.execute('INSERT INTO admin VALUES(1,?,?)',(salt,digest))
    def login(self,password,ip):
        with self.lock:
            attempts=[t for t in self.attempts.get(ip,[]) if t>time.time()-300]
            if len(attempts)>=5: raise CatalogError('嘗試次數過多，請五分鐘後再試',429,'RATE_LIMITED')
            attempts.append(time.time()); self.attempts[ip]=attempts
        with self.store.connect() as db: row=db.execute('SELECT * FROM admin WHERE id=1').fetchone()
        if not isinstance(password,str) or len(password)>200 or not row or not hmac.compare_digest(password_hash(password,row['salt']),row['hash']):
            raise CatalogError('密碼不正確',401,'INVALID_CREDENTIALS')
        with self.lock: self.attempts.pop(ip,None)
    def issue_session(self):
        token=secrets.token_urlsafe(40); csrf=secrets.token_urlsafe(32); expires=time.time()+8*3600
        with self.store.connect() as db:
            db.execute('DELETE FROM sessions WHERE expires<?',(time.time(),))
            db.execute('INSERT INTO sessions VALUES(?,?,?)',(hashlib.sha256(token.encode()).hexdigest(),csrf,expires))
        return token,csrf
    def session(self,token):
        with self.store.connect() as db:
            row=db.execute('SELECT * FROM sessions WHERE hash=? AND expires>?',(hashlib.sha256(token.encode()).hexdigest(),time.time())).fetchone()
        return dict(row) if row else None

class Handler(BaseHTTPRequestHandler):
    def log_message(self,*args): pass  # Avoid logging user text, credentials or query values.
    @property
    def service(self): return self.server.service
    def headers_common(self):
        self.send_header('Cache-Control','no-store')
        self.send_header('X-Content-Type-Options','nosniff')
        self.send_header('Referrer-Policy','no-referrer')
        self.send_header('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; connect-src 'self'; frame-src 'self'; frame-ancestors 'self'; object-src 'none'; base-uri 'none'; form-action 'self'")
        self.send_header('Permissions-Policy','camera=(), microphone=(), geolocation=()')
    def send_json(self,value,status=200,cookie=None):
        raw=encoded(value).encode(); self.send_response(status); self.headers_common()
        self.send_header('Content-Type','application/json; charset=utf-8'); self.send_header('Content-Length',str(len(raw)))
        if cookie: self.send_header('Set-Cookie',cookie)
        self.end_headers(); self.wfile.write(raw)
    def token(self):
        try:
            cookie=http.cookies.SimpleCookie(self.headers.get('Cookie','')); return cookie['votecard_session'].value if 'votecard_session' in cookie else ''
        except http.cookies.CookieError: return ''
    def guard_host(self):
        valid={f'127.0.0.1:{self.server.server_port}',f'localhost:{self.server.server_port}'}
        if self.headers.get('Host') not in valid: raise CatalogError('此服務只接受本機請求',403,'INVALID_HOST')
    def guard_origin(self):
        if self.headers.get('Origin')!=f'http://{self.headers.get("Host")}': raise CatalogError('請從Vote Card 網站操作',403,'INVALID_ORIGIN')
    def authenticated(self,mutating=False):
        session=self.service.session(self.token())
        if not session: raise CatalogError('請先登入',401,'UNAUTHENTICATED')
        if mutating and not hmac.compare_digest(self.headers.get('X-CSRF-Token',''),session['csrf']): raise CatalogError('操作驗證失效，請重新登入',403,'INVALID_CSRF')
        return session
    def body(self,maximum=65536):
        if self.headers.get_content_type()!='application/json': raise CatalogError('請使用 JSON 請求',415,'INVALID_CONTENT_TYPE')
        try: size=int(self.headers.get('Content-Length','0'))
        except ValueError: raise CatalogError('請求長度不正確',400)
        if not 0<size<=maximum: raise CatalogError('請求太大或為空',413,'INVALID_SIZE')
        try: data=json.loads(self.rfile.read(size))
        except (ValueError,UnicodeError): raise CatalogError('JSON 格式不正確',400)
        if not isinstance(data,dict): raise CatalogError('請求需為物件')
        return data
    def route(self):
        self.guard_host(); path=unquote(urlparse(self.path).path); query=parse_qs(urlparse(self.path).query)
        store=self.service.store
        if path=='/api/catalog' and self.command=='GET': return self.send_json({'data':store.public()})
        if path.startswith('/api/letters/') and self.command=='GET': return self.send_json({'data':self.service.letters.get(path.removeprefix('/api/letters/'))})
        if path=='/api/admin/session' and self.command=='GET':
            session=self.service.session(self.token())
            return self.send_json({'data':{'setupRequired':not self.service.configured(),'authenticated':bool(session),'csrfToken':session['csrf'] if session else None}})
        if self.command in ['POST','PUT']:
            self.guard_origin(); data=self.body(131072 if path=='/api/letters' else 65536)
            if path=='/api/letters' and self.command=='POST': return self.send_json({'data':self.service.create_letter(data,self.client_address[0])},201)
            if path in ['/api/admin/setup','/api/admin/login']:
                if path.endswith('setup'): self.service.setup(data.get('password'))
                else: self.service.login(data.get('password'),self.client_address[0])
                token,csrf=self.service.issue_session()
                return self.send_json({'data':{'authenticated':True,'csrfToken':csrf}},cookie=f'votecard_session={token}; HttpOnly; SameSite=Strict; Path=/api/admin; Max-Age=28800')
            self.authenticated(True)
            if path=='/api/admin/logout':
                with store.connect() as db: db.execute('DELETE FROM sessions WHERE hash=?',(hashlib.sha256(self.token().encode()).hexdigest(),))
                return self.send_json({'data':{'authenticated':False}},cookie='votecard_session=; HttpOnly; SameSite=Strict; Path=/api/admin; Max-Age=0')
            if path=='/api/admin/content': return self.send_json({'data':store.update(data.get('content'),data.get('expectedRevision'),data.get('publish') is True)})
            if path=='/api/admin/restore': return self.send_json({'data':store.restore(data.get('revision'),data.get('expectedRevision'))})
            raise CatalogError('找不到此操作',404,'NOT_FOUND')
        if path.startswith('/api/admin/') and self.command=='GET':
            self.authenticated()
            if path=='/api/admin/content': return self.send_json({'data':store.editorial()})
            if path=='/api/admin/history': return self.send_json({'data':store.history()})
            raise CatalogError('找不到此資料',404,'NOT_FOUND')
        if path.startswith('/api/'): raise CatalogError('找不到此 API',404,'NOT_FOUND')
        if self.command!='GET': raise CatalogError('不支援此方法',405,'METHOD_NOT_ALLOWED')
        relative='admin/index.html' if path in ['/admin','/admin/'] else ('index.html' if path=='/' else path.lstrip('/'))
        if path.startswith('/letter/'):
            import re
            if re.fullmatch(r'/letter/[A-Za-z0-9_-]{32}',path):
                self.service.letters.get(path.rsplit('/',1)[-1]); relative='letter/index.html'
        file=(ROOT/'demo'/relative).resolve()
        if not file.is_relative_to((ROOT/'demo').resolve()) or not file.is_file(): raise CatalogError('找不到頁面',404,'NOT_FOUND')
        raw=file.read_bytes(); mime='text/javascript' if file.suffix=='.mjs' else mimetypes.guess_type(str(file))[0] or 'application/octet-stream'
        if file.suffix=='.html':
            import html
            base='http://'+self.headers.get('Host')
            raw=raw.decode().replace('__COVER_URL__',html.escape(base+'/assets/vote-share-v1.png',quote=True)).replace('__PAGE_URL__',html.escape(base+path,quote=True)).encode()
        self.send_response(200); self.headers_common(); self.send_header('Content-Type',mime+'; charset=utf-8' if mime.startswith('text/') else mime); self.send_header('Content-Length',str(len(raw))); self.end_headers(); self.wfile.write(raw)
    def handle_request(self):
        try: self.route()
        except CatalogError as error: self.send_json({'error':{'code':error.code,'message':str(error)}},error.status)
        except (BrokenPipeError,ConnectionResetError): pass
        except Exception: self.send_json({'error':{'code':'SERVER_ERROR','message':'服務暫時無法完成操作'}},500)
    do_GET=handle_request
    do_POST=handle_request
    do_PUT=handle_request

class LocalServer(ThreadingHTTPServer):
    daemon_threads=True
    allow_reuse_address=True

def create_server(port=4174,db_path=None,seed=None):
    server=LocalServer(('127.0.0.1',port),Handler)
    server.service=Service(Store(db_path or ROOT/'.data/letters.sqlite',seed))
    return server

def main():
    parser=argparse.ArgumentParser(); parser.add_argument('--port',type=int,default=4174); parser.add_argument('--db',type=Path)
    args=parser.parse_args(); seed=json.loads((ROOT/'content/site.json').read_text())
    server=create_server(args.port,args.db,seed)
    print(f'Web: http://127.0.0.1:{server.server_port}/\nAdmin: http://127.0.0.1:{server.server_port}/admin/',flush=True)
    try: server.serve_forever()
    except KeyboardInterrupt: pass
    finally: server.server_close()
if __name__=='__main__': main()
