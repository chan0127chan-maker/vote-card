export function letterLayout(scene,{highlight=false}={}){
 const outputWidth=scene.format==='facebook'?1200:1080,scale=outputWidth/scene.width,stamp=scene.stamp||{x:24,y:28,width:96};
 const postmark={left:(stamp.x+stamp.width*.68)*scale,top:(stamp.y+stamp.width*.17)*scale,width:stamp.width*1.45*scale,height:stamp.width*1.45*300/540*scale};
 return {width:outputWidth,height:scene.format==='facebook'?630:scene.format==='story'?1920:Math.round(scene.height*scale),fontSize:(scene.fontSize||24)*scale,stamp,scale,postmark,glyphs:scene.tokens.flatMap((token,tokenIndex)=>token.characters.map((c,i)=>({char:c.char,tokenIndex,hasSource:c.origin?.type==='catalog',highlighted:highlight&&c.origin?.type==='catalog',x:token.glyphs[i].x*scene.width*scale,y:token.glyphs[i].y*scene.height*scale})))};
}
export function letterUrl(base,id){if(!/^[A-Za-z0-9_-]{32}$/.test(id))throw new Error('信件網址不正確');return new URL('/letter/'+id,base).href;}
export const invitation=url=>`1128，我會去投票。\n寫了一張明信片，想邀你一起。\n${url}`;
export async function drawLetter(canvas,scene,options={}){
 await document.fonts.ready;
 const layout=letterLayout(scene,options);canvas.width=layout.width;canvas.height=layout.height;
 const ctx=canvas.getContext('2d');if(!ctx)throw new Error('目前無法繪製圖片，請稍後再試。');
 ctx.fillStyle='#fffce9';ctx.fillRect(0,0,layout.width,layout.height);ctx.strokeStyle='#172222';ctx.lineWidth=3*layout.scale;ctx.strokeRect(1.5*layout.scale,1.5*layout.scale,layout.width-3*layout.scale,layout.height-3*layout.scale);
 ctx.save();ctx.translate(layout.stamp.x*layout.scale,layout.stamp.y*layout.scale);ctx.scale(layout.stamp.width/70*layout.scale,layout.stamp.width/70*layout.scale);ctx.strokeStyle='#aaa58e';ctx.lineWidth=.7;
 const stamp=new Path2D('M4 4 H8 Q10 8 12 4 H16 Q18 8 20 4 H24 Q26 8 28 4 H32 Q34 8 36 4 H40 Q42 8 44 4 H48 Q50 8 52 4 H56 Q58 8 60 4 H66 V10 Q62 12 66 14 V18 Q62 20 66 22 V26 Q62 28 66 30 V34 Q62 36 66 38 V42 Q62 44 66 46 V50 Q62 52 66 54 V58 Q62 60 66 62 V66 Q62 68 66 70 V74 Q62 76 66 78 V82 Q62 84 66 86 V88 H62 Q60 84 58 88 H54 Q52 84 50 88 H46 Q44 84 42 88 H38 Q36 84 34 88 H30 Q28 84 26 88 H22 Q20 84 18 88 H14 Q12 84 10 88 H4 V86 Q8 84 4 82 V78 Q8 76 4 74 V70 Q8 68 4 66 V62 Q8 60 4 58 V54 Q8 52 4 50 V46 Q8 44 4 42 V38 Q8 36 4 34 V30 Q8 28 4 26 V22 Q8 20 4 18 V14 Q8 12 4 10 Z');
 ctx.fillStyle='#fff000';ctx.fill(stamp);ctx.strokeStyle='#172222';ctx.lineWidth=1.6;ctx.stroke(stamp);ctx.strokeRect(11,11,48,70);ctx.fillStyle='#172222';ctx.font='900 13px "PingFang TC",sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('1128',35,39);ctx.fillText('投票',35,55);ctx.restore();
 const mark=postmarkText(scene);
 if(mark&&options.postmark!==false){
  ctx.save();ctx.translate(layout.postmark.left,layout.postmark.top);ctx.scale(layout.postmark.width/540,layout.postmark.height/300);ctx.translate(-270,-55);ctx.strokeStyle='#172222';ctx.fillStyle='#172222';ctx.lineWidth=8;ctx.lineCap='round';
  for(const radius of [145,128]){ctx.beginPath();ctx.arc(420,205,radius,0,Math.PI*2);ctx.stroke();ctx.lineWidth=4;}
  ctx.strokeStyle='#df4147';ctx.lineWidth=8;
  for(const y of [125,165,205,245,285]){ctx.beginPath();ctx.moveTo(550,y);ctx.bezierCurveTo(650,y-25,700,y+25,810,y);ctx.stroke();}
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='800 28px "PingFang TC",sans-serif';ctx.fillText(mark.label,420,150);ctx.font='800 32px "PingFang TC",sans-serif';ctx.fillText(mark.lines[0],420,mark.lines.length===1?220:199);if(mark.lines[1])ctx.fillText(mark.lines[1],420,245);ctx.restore();
 }
 ctx.fillStyle='#4d5448';ctx.textAlign='center';ctx.textBaseline='middle';
 for(const glyph of layout.glyphs){ctx.fillStyle=glyph.tokenIndex%3===2?'#006548':'#172222';ctx.font=`${glyph.highlighted?'900':'750'} ${layout.fontSize}px "PingFang TC","Noto Sans TC","Microsoft JhengHei",sans-serif`;ctx.fillText(glyph.char,glyph.x,glyph.y);}
 if(scene.signature){const f=scene.signatureFrame;ctx.textAlign='right';ctx.fillStyle='#172222';ctx.font=`700 ${(f?.fontSize||14)*layout.scale}px "PingFang TC",sans-serif`;ctx.fillText('—— '+scene.signature,f?f.x*layout.width:layout.width-24*layout.scale,f?f.y*layout.height:layout.height-82*layout.scale);}
 return canvas;
}
export function imageBlob(canvas){return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('目前無法存成圖片。')),'image/png'));}

export function readingPeriod(scene){
 if(!scene.createdAt||!scene.expiresAt)return null;
 const date=value=>{const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(value));const get=type=>parts.find(p=>p.type===type).value;return `${get('year').slice(-2)}/${get('month')}/${get('day')}`;};
 return {start:date(scene.createdAt),end:date(scene.expiresAt)};
}

export function postmarkText(scene){
 const period=readingPeriod(scene);if(period)return{label:'閱信期間',lines:[period.start,period.end]};
 if(!scene.savedAt)return null;
 return{label:'存檔',lines:[readingPeriod({createdAt:scene.savedAt,expiresAt:scene.savedAt}).start]};
}
