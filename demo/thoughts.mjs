// 隨機落在留白裡；有鄰字時保留閱讀間距，不吸附到列或欄。
export function locateThought({ box, size, others = [], rng = Math.random, near = null, inset = 10, avoid = [] }) {
  const margin = inset, gap = 18;
  const left = Math.min(margin, Math.max(0, box.w - size.w));
  const top = Math.min(margin, Math.max(0, box.h - size.h));
  const right = left + Math.max(0, box.w - size.w - margin * 2);
  const bottom = top + Math.max(0, box.h - size.h - margin * 2);
  const minX = near ? Math.max(left, Math.min(right, near.x - near.rx)) : left;
  const minY = near ? Math.max(top, Math.min(bottom, near.y - near.ry)) : top;
  const maxX = near ? Math.max(minX, Math.min(right, near.x + near.rx)) : right;
  const maxY = near ? Math.max(minY, Math.min(bottom, near.y + near.ry)) : bottom;
  let best;
  for (let i = 0; i < 240; i++) {
    const x = minX + rng() * (maxX - minX);
    const y = minY + rng() * (maxY - minY);
    let score = 0;
    for(const o of avoid){
      const ox=Math.min(x+size.w+8,o.x+o.w)-Math.max(x-8,o.x),oy=Math.min(y+size.h+8,o.y+o.h)-Math.max(y-8,o.y);
      if(ox>0&&oy>0)score+=1e6+ox*oy;
    }
    for (const o of others) {
      const overlapX = Math.min(x + size.w + gap, o.x + o.w) - Math.max(x - gap, o.x);
      const overlapY = Math.min(y + size.h + gap, o.y + o.h) - Math.max(y - gap, o.y);
      if (overlapX > 0 && overlapY > 0) score += overlapX * overlapY;
    }
    if (!best || score < best.score) best = { x, y, score };
    if (score === 0) break;
  }
  return { x: best.x, y: best.y };
}

export function emergence(rng = Math.random) {
  return { depth: 650 + rng() * 850, duration: 1900 + rng() * 1200, blur: 8 + rng() * 6, delay: rng() * 180 };
}
