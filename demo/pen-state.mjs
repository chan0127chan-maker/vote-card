export function resolvePenDrop({offset,delta,overRest,hasWords,manualDock=false}){
 const acceptsRest=overRest&&!manualDock;
 const dock=acceptsRest&&hasWords;
 return {dock,offset:acceptsRest?{x:0,y:0}:{x:offset.x+delta.x,y:offset.y+delta.y}};
}
export function tipInGroove(tip,groove){
 return tip.x>=groove.left-8&&tip.x<=groove.left+groove.width+8&&tip.y>=groove.top-8&&tip.y<=groove.top+groove.height+8;
}
export function inPenGroove(pen,groove,tip=null){
 if(tip&&tipInGroove(tip,groove))return true;
 return Math.abs(pen.left+pen.width/2-groove.left-groove.width/2)<Math.min(50,groove.width*.16)
  &&Math.abs(pen.top+pen.height/2-groove.top-groove.height/2)<24;
}
export function penIntent({overRest,hasWords,atInput,manualDock=false}){
 return overRest&&hasWords&&!manualDock?'dock':atInput?'compose':'place';
}
export function armPenReturn(armed,anchor,groove,tip){
 if(armed)return true;
 const dx=anchor.left+anchor.width/2-groove.left-groove.width/2,dy=anchor.top+anchor.height/2-groove.top-groove.height/2;
 return Math.hypot(dx,dy)>72&&!tipInGroove(tip,groove);
}
