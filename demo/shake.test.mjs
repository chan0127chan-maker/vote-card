import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ShakeDetector } from './shake.mjs';

test('a deliberate back-and-forth yields a stroke, a straight drag does not', () => {
  const d = new ShakeDetector();
  d.start(100, 100, 0);
  assert.equal(d.move(150, 100, 100), null);
  assert.equal(d.move(200, 100, 200), null);
  assert.ok(d.move(130, 100, 300));
});

test('stroke reports amplitude, speed and direction of the leg that just ended', () => {
  const d = new ShakeDetector();
  d.start(100, 100, 0);
  d.move(200, 100, 100);
  const s = d.move(150, 100, 200);
  assert.equal(Math.round(s.amplitude), 100);
  assert.ok(Math.abs(s.speed - 1) < 0.01);
  assert.ok(Math.abs(s.angle) < 0.01); // 向右
  const down = new ShakeDetector();
  down.start(100, 100, 0);
  down.move(100, 200, 100);
  const t = down.move(100, 150, 200);
  assert.ok(Math.abs(t.angle - Math.PI / 2) < 0.01); // 向下
});

test('the same distance covered more slowly gives a lower speed', () => {
  const fast = new ShakeDetector(), slow = new ShakeDetector();
  fast.start(0, 0, 0); fast.move(80, 0, 100);
  slow.start(0, 0, 0);
  for (let i = 1; i <= 8; i++) slow.move(i * 10, 0, i * 60);
  const a = fast.move(20, 0, 200), b = slow.move(20, 0, 540);
  assert.ok(a && b);
  assert.ok(a.speed > b.speed * 3);
});

test('jitter and slow reversals do not trigger a stroke', () => {
  const d = new ShakeDetector();
  d.start(100, 100, 0);
  assert.equal(d.move(103, 102, 20), null);
  assert.equal(d.move(99, 100, 40), null);
  d.move(160, 100, 100);
  assert.equal(d.move(100, 100, 2000), null);
});

test('cooldown limits rapid shaking and stopping resets the gesture', () => {
  const d = new ShakeDetector();
  d.start(100, 100, 0);
  d.move(160, 100, 100);
  assert.ok(d.move(100, 100, 200));
  assert.equal(d.move(160, 100, 300), null);
  d.stop();
  assert.equal(d.move(100, 100, 1000), null);
});
