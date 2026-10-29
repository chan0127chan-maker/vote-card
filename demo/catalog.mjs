export async function loadCatalog() {
 const preview=null;
 if(preview&&!/^[a-zA-Z0-9_-]{1,80}$/.test(preview)) throw new Error('預覽詞條編號不正確。');
 const response=await fetch(preview?`/api/admin/preview/${encodeURIComponent(preview)}`:'/api/catalog',{cache:'no-store'});
 const body=await response.json();
 if(!response.ok) throw new Error(body.error?.message||'詞庫暫時無法載入。');
 const data=body.data;
 if(!data||!Array.isArray(data.words)||!data.sources||typeof data.sources!=='object') throw new Error('詞庫格式不正確。');
 const kinds=new Set(['moment','image','voice','turn','action']);
 for(const word of data.words) {
  if(typeof word.id!=='string'||typeof word.text!=='string'||![...word.text].length||[...word.text].length>12||!kinds.has(word.kind)||!Array.isArray(word.tags)||!Array.isArray(word.sourceLinks)) throw new Error('詞條格式不正確。');
 }
 return {...data,preview:Boolean(preview)};
}
