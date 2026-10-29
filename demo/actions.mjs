export const splitCharacters=text=>[...text];
export const joinTokens=(target,incoming)=>target+incoming;
export function inDiscardZone(point,stage) {
 return point.x>=stage.left-16 && point.x<=stage.right+16 && point.y>=stage.bottom-42;
}
export function flickIntent({start,end,velocity,stage}) {
 if(Math.hypot(end.x-start.x,end.y-start.y)<70 || Math.hypot(velocity.x,velocity.y)<1.05) return false;
 return (end.x>stage.right-45&&velocity.x>.75) || (end.x<stage.left+45&&velocity.x<-.75)
   || (end.y<stage.top+45&&velocity.y<-.75) || (end.y>stage.bottom-45&&velocity.y>.75);
}
export function spatialOrder(items) {
 const columns=[];
 for(const item of [...items].sort((a,b)=>b.x-a.x)) {
  let col=columns.find(c=>Math.abs(c.x-item.x)<Math.min(item.w,48)*.6);
  if(!col) {col={x:item.x,items:[]};columns.push(col);}
  col.items.push(item);
 }
 return columns.sort((a,b)=>b.x-a.x).flatMap(c=>c.items.sort((a,b)=>a.y-b.y));
}
export function dropAction({end,stage,hasTarget,start,velocity}) {
 if(inDiscardZone(end,stage)) return 'discard';
 if(hasTarget) return 'merge';
 return flickIntent({start,end,velocity,stage})?'discard':'place';
}
