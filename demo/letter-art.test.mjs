import {test} from 'node:test';
import assert from 'node:assert/strict';
import {letterLayout,letterUrl,invitation} from './letter-art.mjs';
test('export keeps glyphs in their original relative positions and fits a portrait image',()=>{
 const scene={width:224,height:600,tokens:[{characters:[{char:'桂'},{char:'花'}],glyphs:[{x:.25,y:.2},{x:.25,y:.25}]}]};
 const result=letterLayout(scene);
 assert.equal(result.glyphs[0].x,result.glyphs[1].x);assert.ok(result.glyphs[1].y>result.glyphs[0].y);
 for(const g of result.glyphs)assert.ok(g.x>0&&g.x<1080&&g.y>0&&g.y<result.height);
 assert.equal(result.glyphs.map(g=>g.char).join(''),'桂花');
});
test('share text points to a read-only letter and never includes preview or management parameters',()=>{
 const id='a'.repeat(32),url=letterUrl('http://127.0.0.1:4173/?previewWord=private',id);
 assert.equal(url,`http://127.0.0.1:4173/letter/${id}`);
 assert.equal(invitation(url),`1128，我會去投票。\n寫了一張明信片，想邀你一起。\n${url}`);
 assert.throws(()=>letterUrl('https://example.org/','../admin'));
});
test('source highlighting only marks catalog characters, including in mixed words',()=>{
 const scene={width:224,height:600,tokens:[{characters:[{char:'花',origin:{type:'catalog'}},{char:'我',origin:{type:'personal'}}],glyphs:[{x:.3,y:.3},{x:.3,y:.35}]}]};
 assert.deepEqual(letterLayout(scene,{highlight:true}).glyphs.map(g=>g.highlighted),[true,false]);
 assert.deepEqual(letterLayout(scene).glyphs.map(g=>g.highlighted),[false,false]);
});
test('the postmark shows the reading period in Taiwan calendar dates',async()=>{
 const {readingPeriod}=await import('./letter-art.mjs');
 assert.deepEqual(readingPeriod({createdAt:'2026-10-28T18:00:00Z',expiresAt:'2027-04-28T18:00:00Z'}),{start:'26/10/29',end:'27/04/29'});
 assert.equal(readingPeriod({}),null);
});

test('export retains the full paper aspect ratio and absolute glyph placement without added margins',()=>{
 const scene={width:390,height:800,fontSize:22,tokens:[{characters:[{char:'我'}],glyphs:[{x:.25,y:.4}]}]};
 const l=letterLayout(scene);assert.equal(l.height,Math.round(1080*800/390));
 assert.equal(l.glyphs[0].x,1080*.25);assert.equal(l.glyphs[0].y,800*.4*1080/390);
 assert.equal(l.fontSize,22*1080/390);
});
test('postmark drawing uses uniform scaling so circles stay circular',()=>{
 const l=letterLayout({width:270,height:399.6,tokens:[]});
 assert.ok(Math.abs(l.postmark.width/l.postmark.height-540/300)<1e-10);
});

test('a local saved image has a saved-date mark and never invents an expiry period',async()=>{
 const {postmarkText}=await import('./letter-art.mjs');
 assert.equal(postmarkText({}),null);
 assert.deepEqual(postmarkText({savedAt:'2026-10-29T00:00:00Z'}),{label:'存檔',lines:['26/10/29']});
});
test('Facebook and story canvases export exact platform dimensions at different screen sizes',()=>{
 for(const width of [300,600,900])for(const [format,w,h]of [['facebook',1200,630],['story',1080,1920]]){
  const scene={format,width,height:width*h/w,tokens:[{characters:[{char:'家'}],glyphs:[{x:.25,y:.3}]}]};
  const out=letterLayout(scene);assert.equal(out.width,w);assert.equal(out.height,h);assert.equal(out.glyphs[0].x,w*.25);assert.ok(Math.abs(out.glyphs[0].y-h*.3)<1e-8);
 }
});
