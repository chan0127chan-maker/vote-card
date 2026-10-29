import {drawLetter} from './letter-art.mjs';
export async function drawPolicyCard(canvas,scene,visual=scene.policyVisual){
 if(!scene.policy||!visual)throw Error('先讓字詞聚焦到一個議題，再存下這張信。');
 const letter=document.createElement('canvas');await drawLetter(letter,scene);
 const scale=visual.inside?letter.width/scene.width:letter.width/visual.width,offset=visual.inside?visual.y*scale:letter.height+visual.gap*scale;
 canvas.width=letter.width;canvas.height=visual.inside?letter.height:Math.ceil(offset+visual.height*scale);
 const c=canvas.getContext('2d');c.fillStyle='#00a6e5';c.fillRect(0,0,canvas.width,canvas.height);c.drawImage(letter,0,0);c.save();c.translate(visual.inside?visual.x*scale:0,offset);c.scale(scale,scale);
 for(const b of visual.boxes){c.beginPath();c.roundRect(b.x,b.y,b.w,b.h,b.radius);c.fillStyle=b.fill;c.fill();if(b.line){c.lineWidth=b.line;c.strokeStyle=b.stroke;c.stroke();}}
 c.textAlign='left';c.textBaseline='alphabetic';
 for(const g of visual.glyphs){c.font=g.font;c.fillStyle=g.color;const metric=c.measureText(g.char),ascent=metric.fontBoundingBoxAscent||g.h*.8;c.fillText(g.char,g.x,g.y+ascent);}
 c.restore();return canvas;
}
