import { test } from 'node:test';
import assert from 'node:assert/strict';
import { locateThought, emergence } from './thoughts.mjs';
const seeded = (seed) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
test('vertical thoughts stay inside a narrow field and leave reading space', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const rng = seeded(seed), others = [];
    for (let i = 0; i < 8; i++) {
      const size = { w: 48, h: i % 2 ? 124 : 72 };
      const p = locateThought({ box: { w: 242, h: 600 }, size, others, rng });
      assert.ok(p.x >= 0 && p.y >= 0 && p.x + size.w <= 242 && p.y + size.h <= 600);
      for (const o of others) assert.ok(p.x + size.w <= o.x || o.x + o.w <= p.x || p.y + size.h <= o.y || o.y + o.h <= p.y);
      others.push({ ...p, ...size });
    }
  }
});
test('new rounds do not reuse fixed positions', () => {
  const input = { box: { w: 242, h: 600 }, size: { w: 48, h: 100 } };
  assert.notDeepEqual(locateThought({ ...input, rng: seeded(1) }), locateThought({ ...input, rng: seeded(2) }));
});
test('split letters scatter near their own starting point without a ring or shared row', () => {
  const rng=seeded(42),others=[];
  for(let i=0;i<4;i++) {
    const size={w:34,h:44};
    const p=locateThought({box:{w:280,h:620},size,others,rng,near:{x:130,y:280,rx:90,ry:120}});
    assert.ok(p.x>=40&&p.x<=220&&p.y>=160&&p.y<=400,'split letters should remain in the local air around the word');
    for(const o of others) assert.ok(p.x+size.w<=o.x||o.x+o.w<=p.x||p.y+size.h<=o.y||o.y+o.h<=p.y);
    others.push({...p,...size});
  }
  assert.equal(new Set(others.map(p=>Math.round(p.x))).size,4);
  assert.equal(new Set(others.map(p=>Math.round(p.y))).size,4);
  const radii=others.map(p=>Math.round(Math.hypot(p.x-130,p.y-280)));
  assert.ok(Math.max(...radii)-Math.min(...radii)>20);
});
test('each emergence can start at a different depth and pace', () => {
  const a = emergence(seeded(1)), b = emergence(seeded(900));
  assert.notEqual(a.depth, b.depth);
  assert.notEqual(a.duration, b.duration);
  assert.ok(a.depth >= 650 && a.depth <= 1500 && a.duration >= 1900 && a.duration <= 3100);
});
test('emergence leaves a clear inner margin and never covers the stamp when room exists',()=>{
 const avoid=[{x:0,y:0,w:72,h:96}];
 for(let seed=1;seed<=80;seed++){
  const p=locateThought({box:{w:280,h:390},size:{w:40,h:100},avoid,inset:24,rng:seeded(seed)});
  assert.ok(p.x>=24&&p.y>=24&&p.x+40<=256&&p.y+100<=366);
  assert.ok(p.x>=80||p.y>=104,'stamp needs an additional breathing gap');
 }
});
test('split characters keep clear of a tutorial coach even when scattering upward',()=>{
 for(let seed=1;seed<=40;seed++){
  const p=locateThought({box:{w:264,h:360},size:{w:30,h:28},others:[],avoid:[{x:-20,y:-40,w:320,h:180}],inset:24,rng:seeded(seed),near:{x:130,y:190,rx:90,ry:100}});
  assert.ok(p.y>=148);
 }
});
