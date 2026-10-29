// 依每一小段手勢的速度擺動，不因拖遠後角度封頂而失去來回感。
export function penSwayAngle({dx,dy,dt}) {
  const speed=(dx-dy*.35)/Math.max(8,dt);
  return 18+14*Math.tanh(speed*.8);
}

// 只擾動筆剛經過的一小片範圍；兩側的字向各自的方向散開。
export function localImpulse({ from, to, center, spin = 1 }) {
  const dx = to.x - from.x, dy = to.y - from.y, length = Math.hypot(dx, dy);
  const still = { vx: 0, vy: 0, delay: 0 };
  if (length < .2) return still;
  const t = Math.max(0, Math.min(1, ((center.x - from.x) * dx + (center.y - from.y) * dy) / length ** 2));
  const rx = center.x - from.x - dx * t, ry = center.y - from.y - dy * t;
  const distance = Math.hypot(rx, ry), radius = 140;
  if (distance >= radius) return still;
  const ux = distance > 1 ? rx / distance : -dy / length * spin;
  const uy = distance > 1 ? ry / distance : dx / length * spin;
  const strength = Math.min(35, length * 2.8) * (1 - distance / radius) ** 2;
  return {
    vx: (ux * .85 - uy * .32 * spin + dx / length * .18) * strength,
    vy: (uy * .85 + ux * .32 * spin + dy / length * .18) * strength,
    delay: distance * 1.4,
  };
}

// 降低回復力並充分阻尼：像懸在空氣裡慢慢收斂，不越過原位擺回來。
export function stepMotion(state, dt, stiffness = 5.5, damping = 5.8) {
  const h = Math.min(.032, Math.max(0, dt));
  let vx = (state.vx - state.x * stiffness * h) * Math.exp(-damping * h);
  let vy = (state.vy - state.y * stiffness * h) * Math.exp(-damping * h);
  const speedLimit = Math.min(1, 65 / (Math.hypot(vx, vy) || 1));
  vx *= speedLimit; vy *= speedLimit;
  let x = state.x + vx * h, y = state.y + vy * h;
  const limit = Math.min(1, 14 / (Math.hypot(x, y) || 1));
  x *= limit; y *= limit;
  if (Math.hypot(x, y) < .025 && Math.hypot(vx, vy) < .08) return { x: 0, y: 0, vx: 0, vy: 0 };
  return { x, y, vx, vy };
}
