// 只依目前詞序整理版面，不代寫或改動詞語。
export function sentenceLayout(items, box, center={x:box.w/2,y:box.h/2}) {
  if (!items.length) return [];
  const width = Math.max(...items.map(s => s.w)), gap = 8, gutter = Math.min(22,Math.max(8,box.w*.05));
  const maxColumns = Math.max(1, Math.floor((box.w - 20 + gutter) / (width + gutter)));
  const maxHeight = box.h - 20;
  let capacity = Math.min(320, maxHeight), columns;
  do {
    columns = [[]];
    let height = 0;
    for (let i = 0; i < items.length; i++) {
      if (height && height + gap + items[i].h > capacity) { columns.push([]); height = 0; }
      columns.at(-1).push(i);
      height += (height ? gap : 0) + items[i].h;
    }
    if (columns.length <= maxColumns || capacity >= maxHeight) break;
    capacity = Math.min(maxHeight, capacity + 12);
  } while (true);
  const columnHeights = columns.map(col => col.reduce((n, i) => n + items[i].h, 0) + gap * (col.length - 1));
  const columnWidths=columns.map(col=>Math.max(...col.map(i=>items[i].w)));
  const groupWidth = columnWidths.reduce((n,w)=>n+w,0) + (columns.length - 1) * gutter;
  const groupHeight=Math.max(...columnHeights);
  const top = Math.max(10,Math.min(box.h-10-groupHeight,center.y-groupHeight/2));
  const left = Math.max(0,Math.min(box.w-groupWidth,center.x-groupWidth/2));
  const slots = [];
  let right=left+groupWidth;
  columns.forEach((column, c) => {
    right-=columnWidths[c];
    let y = top;
    for (const i of column) {
      slots[i] = { x: right+(columnWidths[c]-items[i].w)/2, y };
      y += items[i].h + gap;
    }
    right-=gutter;
  });
  return slots;
}
export function moveWord(items, from, to) {
  const result = [...items];
  const [item] = result.splice(from, 1);
  result.splice(Math.max(0, Math.min(result.length, to)), 0, item);
  return result;
}
export function nearRest(pen, stage, rest=null) {
  if(rest)return Math.abs(pen.left+pen.width/2-(rest.left+rest.width/2))<44&&Math.abs(pen.bottom-(rest.bottom-6))<48;
  return Math.abs(pen.left + pen.width / 2 - (stage.right - 30)) < 55 && Math.abs(pen.bottom - stage.bottom) < 48;
}
export function nearInput(tip,line){
 return tip.x>=line.left-10&&tip.x<=line.right+10&&tip.y>=line.top-10&&tip.y<=line.bottom+10;
}
