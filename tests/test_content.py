import copy,json,tempfile,unittest
from pathlib import Path
from server.store import Store,CatalogError
from server.letters import Letters

ROOT=Path(__file__).resolve().parents[1]
class ContentTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.seed=json.loads((ROOT/'content/site.json').read_text());self.store=Store(Path(self.tmp.name)/'test.sqlite',self.seed);self.letters=Letters(self.store)
 def tearDown(self):self.tmp.cleanup()
 def scene(self):
  return {'width':300,'height':450,'signature':'小明','policy':{'id':'dentures','candidateIds':['chen','chung'],'title':'偽造議題','records':[]},'tokens':[{'characters':[{'char':'好','index':0,'wordId':'eat','originKey':'qa:one','original':'好好吃飯'}],'glyphs':[{'x':.5,'y':.5}]}]}
 def test_draft_isolation_publish_and_old_letter_snapshot(self):
  old=self.letters.get(self.letters.create(self.scene())['id']);d=self.store.editorial();d['draft']['topics'][0]['records'][0]['summary']='修訂後的摘要'
  saved=self.store.update(d['draft'],d['revision']);self.assertNotEqual(self.store.public()['topics'][0]['records'][0]['summary'],'修訂後的摘要')
  self.store.update(saved['draft'],saved['revision'],True);self.assertEqual(self.store.public()['topics'][0]['records'][0]['summary'],'修訂後的摘要')
  self.assertEqual(self.letters.get(old['id'])['policy'],old['policy'])
 def test_server_uses_its_own_policy_and_retains_uncollected_candidate(self):
  s=self.scene();s['policy']['candidateIds']=['chung'];result=self.letters.get(self.letters.create(s)['id']);self.assertNotEqual(result['policy']['title'],'偽造議題');self.assertEqual(result['policy']['records'][0]['status'],'uncollected');self.assertTrue(result['policy']['partial'])
 def test_custom_letter_words_invalid_signature_and_candidate_ids_rejected(self):
  s=self.scene();s['tokens'][0]['characters'][0]['wordId']=None
  with self.assertRaises(CatalogError):self.letters.create(s)
  for ids in [[],['missing'],[{}],['chen','chen']]:
   s=self.scene();s['policy']['candidateIds']=ids
   with self.assertRaises(CatalogError):self.letters.create(s)
  s=self.scene();s['signature']='名\n字'
  with self.assertRaises(CatalogError):self.letters.create(s)
 def test_content_revision_conflict_and_invalid_mapping_rejected(self):
  d=self.store.editorial();self.store.update(d['draft'],d['revision'])
  with self.assertRaises(CatalogError) as e:self.store.update(d['draft'],d['revision'])
  self.assertEqual(e.exception.status,409)
  d=self.store.editorial();d['draft']['topics'][0]['wishes']=['unknown']
  with self.assertRaises(CatalogError):self.store.update(d['draft'],d['revision'])
 def test_restore_changes_only_draft_and_keeps_published_content(self):
  d=self.store.editorial();original=d['draft']['topics'][0]['title'];d['draft']['topics'][0]['title']='新版'
  new=self.store.update(d['draft'],d['revision'],True);restored=self.store.restore(1,new['revision']);self.assertEqual(restored['draft']['topics'][0]['title'],original);self.assertEqual(self.store.public()['topics'][0]['title'],'新版')
 def test_social_format_and_signature_geometry_are_preserved(self):
  for format,ratio in [('facebook',1200/630),('story',9/16)]:
   s=self.scene();s.update(format=format,width=300,height=300/ratio,signatureFrame={'x':.45,'y':.5,'fontSize':10})
   result=self.letters.get(self.letters.create(s)['id']);self.assertEqual(result['format'],format);self.assertEqual(result['signatureFrame'],s['signatureFrame'])
  s=self.scene();s.update(format='facebook',width=300,height=600)
  with self.assertRaises(CatalogError):self.letters.create(s)
