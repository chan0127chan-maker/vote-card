import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VOCAB, toFeatures, pickWord, summarize } from './words.mjs';

function seeded(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function sample(feat, n = 300) {
  const rng = seeded(7), picked = [];
  for (let i = 0; i < n; i++) picked.push(VOCAB[pickWord(feat, VOCAB, rng)]);
  const avg = (k) => picked.reduce((s, w) => s + w[k], 0) / n;
  return { tempo: avg('tempo'), reach: avg('reach'), axis: avg('axis') };
}

test('every word is a two-to-four character fragment, no duplicates', () => {
  for (const w of VOCAB) assert.ok([...w.text].length >= 2 && [...w.text].length <= 4, w.text);
  assert.equal(new Set(VOCAB.map((w) => w.text)).size, VOCAB.length);
});

test('features are normalised from raw strokes', () => {
  const f = toFeatures({ speed: 1.0, amplitude: 174, angle: Math.PI / 2 });
  assert.ok(f.tempo > 0.99 && f.reach > 0.99 && f.axis > 0.99);
  const g = toFeatures({ speed: 0.05, amplitude: 10, angle: 0 });
  assert.equal(g.tempo, 0); assert.equal(g.reach, 0); assert.equal(g.axis, 0);
});

test('fast, wide strokes draw faster and farther words than slow, small ones', () => {
  const wild = sample({ tempo: 0.9, reach: 0.9, axis: 0.1 });
  const calm = sample({ tempo: 0.1, reach: 0.1, axis: 0.1 });
  assert.ok(wild.tempo > calm.tempo + 0.35, `${wild.tempo} vs ${calm.tempo}`);
  assert.ok(wild.reach > calm.reach + 0.35, `${wild.reach} vs ${calm.reach}`);
});

test('vertical strokes draw more vertical-leaning words than horizontal ones', () => {
  const up = sample({ tempo: 0.5, reach: 0.5, axis: 0.95 });
  const side = sample({ tempo: 0.5, reach: 0.5, axis: 0.05 });
  assert.ok(up.axis > side.axis + 0.25, `${up.axis} vs ${side.axis}`);
});

test('the same motion does not always give the same word', () => {
  const rng = seeded(3), f = { tempo: 0.5, reach: 0.5, axis: 0.5 };
  const seen = new Set(Array.from({ length: 40 }, () => pickWord(f, VOCAB, rng)));
  assert.ok(seen.size >= 5);
});

test('summary labels the round by average tempo, reach and axis', () => {
  const s = summarize([{ tempo: 0.1, reach: 0.9, axis: 0.1 }, { tempo: 0.2, reach: 0.8, axis: 0.2 }]);
  assert.equal(s.label, '緩速・大幅・橫向');
  assert.equal(s.count, 2);
});
