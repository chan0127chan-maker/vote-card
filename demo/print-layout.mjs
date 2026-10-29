// Capture the displayed policy attachment, including real line breaks and font positions.
export function capturePolicyVisual(panel){
 const bounds=panel.getBoundingClientRect(),boxes=[],glyphs=[];
 for(const node of [panel,...panel.querySelectorAll('[data-print-box]')]){
  const r=node.getBoundingClientRect(),style=getComputedStyle(node);boxes.push({x:r.left-bounds.left,y:r.top-bounds.top,w:r.width,h:r.height,fill:style.backgroundColor,stroke:style.borderTopColor,line:parseFloat(style.borderTopWidth)||0,radius:parseFloat(style.borderTopLeftRadius)||0});
 }
 for(const node of panel.querySelectorAll('[data-print]')){
  const style=getComputedStyle(node),walker=document.createTreeWalker(node,NodeFilter.SHOW_TEXT);let text;
  while((text=walker.nextNode()))for(let i=0;i<text.length;){const char=String.fromCodePoint(text.textContent.codePointAt(i)),range=document.createRange();range.setStart(text,i);range.setEnd(text,i+char.length);const r=range.getBoundingClientRect();if(r.width&&r.height)glyphs.push({char,x:r.left-bounds.left,y:r.top-bounds.top,h:r.height,font:`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`,color:style.color});i+=char.length;}
 }
 const paper=panel.closest('.page,.letter-page').getBoundingClientRect();
 return {width:bounds.width,height:bounds.height,boxes,glyphs,gap:24,inside:Boolean(panel.closest('.page,.letter-page').dataset.format),x:bounds.left-paper.left,y:bounds.top-paper.top};
}
