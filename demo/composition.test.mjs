import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sentenceLayout, moveWord, nearRest, nearInput } from './composition.mjs';
test('the pen tip can open the input line from either touch or mouse movement without hitting the rest',()=>{
 const line={left:170,right:214,top:770,bottom:814};
 assert.equal(nearInput({x:192,y:788},line),true);
 assert.equal(nearInput({x:328,y:788},line),false);
 assert.equal(nearInput({x:192,y:700},line),false);
});
test('words read top to bottom and columns read right to left', () => {
  const items = Array.from({ length: 8 }, () => ({ w: 50, h: 124 }));
  const slots = sentenceLayout(items, { w: 242, h: 550 });
  assert.equal(slots.length, 8);
  for (let i = 1; i < slots.length; i++) {
    assert.ok(slots[i].x === slots[i - 1].x ? slots[i].y > slots[i - 1].y : slots[i].x < slots[i - 1].x);
  }
});
test('long words fit narrow and short screens without overlapping', () => {
  for (const items of [Array.from({ length: 8 }, (_, i) => ({ w: 50, h: i % 2 ? 124 : 96 })), Array.from({ length: 8 }, () => ({ w: 50, h: 124 }))])
  for (const box of [{ w: 242, h: 410 }, { w: 252, h: 624 }]) {
    const slots = sentenceLayout(items, box);
    for (let i = 0; i < slots.length; i++) {
      const a = { ...slots[i], ...items[i] };
      assert.ok(a.x >= 0 && a.y >= 0 && a.x + a.w <= box.w && a.y + a.h <= box.h);
      for (let j = 0; j < i; j++) {
        const b = { ...slots[j], ...items[j] };
        assert.ok(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
      }
    }
  }
});
test('empty and single-word compositions are valid', () => {
  assert.deepEqual(sentenceLayout([], { w: 242, h: 550 }), []);
  assert.equal(sentenceLayout([{ w: 50, h: 100 }], { w: 242, h: 550 }).length, 1);
});
test('the arranged group uses the paper center even when the writing field begins below the header',()=>{
 const items=[{w:46,h:110},{w:70,h:150},{w:46,h:90}];
 const center={x:250,y:210},slots=sentenceLayout(items,{w:500,h:580},center);
 const left=Math.min(...slots.map(p=>p.x)),right=Math.max(...slots.map((p,i)=>p.x+items[i].w));
 const top=Math.min(...slots.map(p=>p.y)),bottom=Math.max(...slots.map((p,i)=>p.y+items[i].h));
 assert.equal((left+right)/2,center.x);assert.equal((top+bottom)/2,center.y);
});
test('reordering preserves every word and does not mutate the original', () => {
  const source = ['雨', '那一天', '你'];
  assert.deepEqual(moveWord(source, 2, 0), ['你', '雨', '那一天']);
  assert.deepEqual(source, ['雨', '那一天', '你']);
});
test('the pen must be both low and near the rest to dock', () => {
  const stage = { right: 350, bottom: 700 };
  assert.ok(nearRest({ left: 280, width: 68, bottom: 685 }, stage));
  assert.equal(nearRest({ left: 280, width: 68, bottom: 500 }, stage), false);
  assert.equal(nearRest({ left: 100, width: 68, bottom: 685 }, stage), false);
});
test('docking can target a pen rest placed outside the paper',()=>{
 const stage={right:300,bottom:700},rest={left:306,width:56,top:662,bottom:706};
 assert.equal(nearRest({left:300,width:68,bottom:700},stage,rest),true);
 assert.equal(nearRest({left:210,width:68,bottom:700},stage,rest),false);
 assert.equal(nearRest({left:300,width:68,bottom:500},stage,rest),false);
});
