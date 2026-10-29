import { test } from 'node:test';
import assert from 'node:assert/strict';
import { localImpulse, stepMotion, penSwayAngle } from './motion.mjs';
test('the shaft sways in opposite directions with each stroke while retaining a right-hand tilt',()=>{
  assert.ok(penSwayAngle({dx:20,dy:0,dt:16})>18);
  assert.ok(penSwayAngle({dx:-20,dy:0,dt:16})<18);
  assert.equal(penSwayAngle({dx:0,dy:0,dt:16}),18);
  for(const dx of [-10000,10000]) assert.ok(penSwayAngle({dx,dy:0,dt:0})>=4&&penSwayAngle({dx,dy:0,dt:0})<=32);
});
test('shaft sway depends on movement speed rather than distance from the pickup point',()=>{
  assert.equal(penSwayAngle({dx:10,dy:4,dt:16}),penSwayAngle({dx:20,dy:8,dt:32}));
  assert.ok(penSwayAngle({dx:10,dy:0,dt:16})>penSwayAngle({dx:10,dy:0,dt:100}));
});
const sweep = { from: { x: 0, y: 0 }, to: { x: 40, y: 0 } };
test('only words close to the pen path receive an impulse', () => {
  const near = localImpulse({ ...sweep, center: { x: 20, y: 20 } });
  const far = localImpulse({ ...sweep, center: { x: 20, y: 200 } });
  assert.ok(Math.hypot(near.vx, near.vy) > 10);
  assert.deepEqual(far, { vx: 0, vy: 0, delay: 0 });
});
test('words on opposite sides move in different directions and have different delays', () => {
  const above = localImpulse({ ...sweep, center: { x: 20, y: -25 } });
  const below = localImpulse({ ...sweep, center: { x: 20, y: 60 } });
  assert.ok(above.vy < 0 && below.vy > 0);
  assert.ok(below.delay > above.delay);
});
test('a stationary pen does not move the words', () => {
  assert.deepEqual(localImpulse({ ...sweep, to: sweep.from, center: { x: 0, y: 20 } }), { vx: 0, vy: 0, delay: 0 });
});
test('strong repeated input stays bounded', () => {
  let state = { x: 0, y: 0, vx: 0, vy: 0 };
  for (let i = 0; i < 600; i++) {
    state = stepMotion({ ...state, vx: state.vx + 100, vy: state.vy - 100 }, 1 / 60);
    assert.ok(Math.hypot(state.x, state.y) <= 14.0001);
  }
});
test('airborne words settle slowly without crossing their resting position', () => {
  let state = { x: 0, y: 0, vx: 35, vy: 0 };
  for (let i = 0; i < 60; i++) state = stepMotion(state, 1 / 60);
  assert.ok(state.x > 2, 'the drift should still be visible after one second');
  let previous = state.x;
  for (let i = 0; i < 600; i++) {
    state = stepMotion(state, 1 / 60);
    assert.ok(state.x >= 0, 'no rebound past the resting position');
    assert.ok(state.x <= previous + .0001, 'the settling phase must be monotonic');
    previous = state.x;
  }
  assert.ok(Math.hypot(state.x, state.y, state.vx, state.vy) < .1);
});
