// 翻動偵測：把一段來回的拖曳切成「一翻」，並量出這一翻的速度、幅度與方向。
// 回傳的 stroke：{ speed: px/ms, amplitude: px, angle: 弧度（方向，0 為向右）, time }
const MIN_STEP = 6;      // 小於這個位移視為手抖，不計入
const MIN_LEG = 24;      // 一翻至少要移動的距離
const MAX_LEG_MS = 900;  // 一翻最長耗時；更慢的移動不算翻動
const PAUSE_MS = 500;    // 停頓超過此時間，重新起算
const COOLDOWN_MS = 420; // 兩次翻出之間的最短間隔

export class ShakeDetector {
  start(x, y, time) {
    this.active = true;
    this.lastReveal = -Infinity;
    this.begin(x, y, time);
  }
  begin(x, y, time) {
    this.legStart = { x, y, time };
    this.last = { x, y, time };
    this.dir = null;
  }
  move(x, y, time) {
    if (!this.active) return null;
    if (time - this.last.time > PAUSE_MS) { this.begin(x, y, time); return null; }
    const dx = x - this.last.x, dy = y - this.last.y, len = Math.hypot(dx, dy);
    if (len < MIN_STEP) return null;
    const ux = dx / len, uy = dy / len;
    if (!this.dir) {
      this.dir = { x: ux, y: uy };
      this.last = { x, y, time };
      return null;
    }
    const turning = ux * this.dir.x + uy * this.dir.y < -0.2;
    if (!turning) {
      const bx = this.dir.x * 0.5 + ux * 0.5, by = this.dir.y * 0.5 + uy * 0.5, n = Math.hypot(bx, by) || 1;
      this.dir = { x: bx / n, y: by / n };
      this.last = { x, y, time };
      return null;
    }
    // 在 this.last 轉向：前一段移動（legStart → last）就是剛結束的一翻
    const amplitude = Math.hypot(this.last.x - this.legStart.x, this.last.y - this.legStart.y);
    const ms = Math.max(1, this.last.time - this.legStart.time);
    const ok = amplitude >= MIN_LEG && ms <= MAX_LEG_MS && time - this.lastReveal >= COOLDOWN_MS;
    const stroke = ok ? { speed: amplitude / ms, amplitude, angle: Math.atan2(this.dir.y, this.dir.x), time } : null;
    if (stroke) this.lastReveal = time;
    this.legStart = this.last;
    this.dir = { x: ux, y: uy };
    this.last = { x, y, time };
    return stroke;
  }
  stop() { this.active = false; this.dir = null; }
}
