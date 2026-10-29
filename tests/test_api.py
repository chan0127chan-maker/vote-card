import http.client,json,tempfile,threading,unittest
from pathlib import Path
from server.app import create_server

ROOT=Path(__file__).resolve().parents[1]
class APITests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();seed=json.loads((ROOT/'content/site.json').read_text());self.server=create_server(0,Path(self.tmp.name)/'qa.sqlite',seed);self.thread=threading.Thread(target=self.server.serve_forever,daemon=True);self.thread.start();self.cookie='';self.csrf=''
 def tearDown(self):self.server.shutdown();self.server.server_close();self.thread.join();self.tmp.cleanup()
 def request(self,path,method='GET',data=None,csrf=True):
  c=http.client.HTTPConnection('127.0.0.1',self.server.server_port);h={'Origin':f'http://127.0.0.1:{self.server.server_port}','Content-Type':'application/json','Cookie':self.cookie}
  if csrf:h['X-CSRF-Token']=self.csrf
  c.request(method,path,json.dumps(data) if data is not None else None,h);r=c.getresponse();raw=r.read();cookie=r.getheader('Set-Cookie');status=r.status;mime=r.getheader('Content-Type');c.close()
  if cookie:self.cookie=cookie.split(';',1)[0]
  return status,json.loads(raw) if 'json' in mime else raw
 def test_admin_requires_session_csrf_and_publishes_only_explicitly(self):
  self.assertEqual(self.request('/api/admin/content')[0],401)
  status,result=self.request('/api/admin/setup','POST',{'password':'test-only-vote-card-12345'});self.assertEqual(status,200);self.csrf=result['data']['csrfToken']
  draft=self.request('/api/admin/content')[1]['data'];draft['draft']['words'][0]['text']='測試願望'
  body={'content':draft['draft'],'expectedRevision':draft['revision']}
  self.assertEqual(self.request('/api/admin/content','PUT',body,False)[0],403)
  status,saved=self.request('/api/admin/content','PUT',body);self.assertEqual(status,200)
  self.assertNotEqual(self.request('/api/catalog')[1]['data']['words'][0]['text'],'測試願望')
  self.assertEqual(self.request('/api/admin/content','PUT',{'content':saved['data']['draft'],'expectedRevision':saved['data']['revision'],'publish':True})[0],200)
  self.assertEqual(self.request('/api/catalog')[1]['data']['words'][0]['text'],'測試願望')
 def test_html_routes_and_assets_keep_correct_types_and_thumbnail_metadata(self):
  status,body=self.request('/');self.assertEqual(status,200);self.assertIn(b'og:image',body);self.assertNotIn(b'__COVER_URL__',body)
  status,body=self.request('/admin/');self.assertEqual(status,200);self.assertIn(b'edit-form',body)
  status,body=self.request('/letter/view.mjs');self.assertEqual(status,200);self.assertIn(b'attachReaderPolicy',body)
  self.assertEqual(self.request('/../server/store.py')[0],404)
