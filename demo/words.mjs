// 詞庫與選字邏輯（示範詞彙）。
// 每個詞帶三個質地座標，與翻動的三項特徵一一對應：
//   tempo 0 慢 ─ 1 快　　reach 0 近、小 ─ 1 遠、大　　axis 0 橫向（經過、同行）─ 1 縱向（落下、升起）
// 動作越接近某個詞的座標，越容易翻到它；仍保留少量偶然，讓每次翻找不同。
export const VOCAB = [
  ['一碗湯', .10, .10, .40], ['午後', .15, .15, .20], ['窗邊', .12, .22, .30], ['慢慢來', .10, .30, .25],
  ['手心', .20, .08, .60], ['剛煮好', .25, .12, .50], ['摺好的信', .20, .20, .35], ['桌角', .15, .10, .55],
  ['留一盞燈', .15, .25, .60], ['陪伴', .30, .25, .30],
  ['落雨', .30, .40, .92], ['沉下去', .20, .50, .96], ['慢慢亮', .22, .35, .85], ['日出', .30, .60, .90],
  ['抬頭', .40, .30, .95], ['一層一層', .20, .45, .90],
  ['很久以前', .20, .90, .40], ['那一年', .25, .80, .30], ['好久不見', .20, .85, .20], ['想念', .20, .70, .60],
  ['舊地方', .25, .75, .35],
  ['順手', .70, .12, .30], ['來不及', .85, .20, .40], ['突然', .80, .15, .70], ['一瞬間', .90, .10, .80],
  ['心跳', .80, .10, .80], ['差一點', .75, .20, .50], ['喊一聲', .85, .25, .20],
  ['遠方', .70, .90, .20], ['出發', .80, .80, .10], ['趕路', .90, .70, .10], ['風很大', .85, .80, .50],
  ['越過山', .70, .90, .60], ['追過去', .90, .80, .15], ['轉角', .60, .50, .15],
  ['路上', .50, .60, .10], ['經過', .50, .50, .05], ['一起走', .40, .50, .05], ['回家', .40, .60, .20],
  ['謝謝你', .40, .30, .50], ['晚風', .45, .50, .15], ['下次見', .50, .70, .20], ['還記得', .40, .60, .40],
  ['隔壁', .50, .20, .10], ['剛剛好', .40, .30, .50], ['那一天', .40, .70, .30], ['帶把傘', .50, .30, .20],
  ['對面', .55, .35, .10], ['說不出口', .45, .40, .55],
].map(([text, tempo, reach, axis]) => ({ text, tempo, reach, axis }));

const clamp01 = (v) => Math.max(0, Math.min(1, v));

// 一翻的原始量測 → 0–1 的三項特徵
export function toFeatures(stroke) {
  return {
    tempo: clamp01((stroke.speed - 0.1) / 0.9),
    reach: clamp01((stroke.amplitude - 24) / 150),
    axis: Math.abs(Math.sin(stroke.angle)),
  };
}

// 依特徵從 pool 抽一個詞，回傳它在 pool 中的位置
export function pickWord(f, pool, rng = Math.random) {
  const weights = pool.map((w) => {
    const d = (w.tempo - f.tempo) ** 2 + (w.reach - f.reach) ** 2 + 0.6 * (w.axis - f.axis) ** 2;
    return Math.exp(-d / (2 * 0.28 ** 2)) + 0.015;
  });
  let r = rng() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < weights.length; i++) { r -= weights[i]; if (r <= 0) return i; }
  return weights.length - 1;
}

// 一輪結束後，把所有翻動歸納成手勢摘要，供之後的紙筆推薦使用
export function summarize(features) {
  const n = features.length || 1;
  const avg = (k) => features.reduce((s, f) => s + f[k], 0) / n;
  const tempo = avg('tempo'), reach = avg('reach'), axis = avg('axis');
  const tempoLabel = tempo < 0.33 ? '緩速' : tempo < 0.66 ? '中速' : '急速';
  const reachLabel = reach < 0.33 ? '小幅' : reach < 0.66 ? '中幅' : '大幅';
  const axisLabel = axis < 0.33 ? '橫向' : axis < 0.66 ? '斜向' : '縱向';
  return { tempo, reach, axis, count: features.length, label: `${tempoLabel}・${reachLabel}・${axisLabel}` };
}
