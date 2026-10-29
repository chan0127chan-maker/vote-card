export const coverUrl='/assets/vote-cover-v1.png';
export function attachPostcard({initialCover=false}={}){
 const paper=document.querySelector('.page,.letter-page');
 if(!paper||document.body.classList.contains('practice'))return;
 const tabs=paper.querySelector('.memo-tabs');
 const button=document.createElement('button');button.className='memo-tab flip-tab';button.textContent='翻面';button.setAttribute('aria-pressed','false');
 const face=document.createElement('div');face.className='postcard-cover';face.hidden=true;
 const image=document.createElement('img');const updateCover=()=>{image.src=paper.dataset.format==='facebook'?'/assets/vote-share-v1.png':coverUrl;};updateCover();new MutationObserver(updateCover).observe(paper,{attributes:true,attributeFilter:['data-format']});image.alt='1128我會去投票。石虎拿印章、水牛拿身分證、臺灣藍鵲拿粉紅投票通知單，並排行走。';face.append(image);paper.append(face);tabs.prepend(button);
 let flipped=false;
 function show(next,animate=true){
  flipped=next;button.setAttribute('aria-pressed',String(flipped));button.setAttribute('aria-label',flipped?'翻面：回到寫字面':'翻面：看看封面');
  paper.classList.toggle('cover-visible',flipped);face.hidden=!flipped;
  for(const el of paper.querySelectorAll('.stage,.masthead,.letter-frame,.unlock-version,.policy-strip,.candidate-switches'))el.inert=flipped;
  if(animate&&flipped&&!matchMedia('(prefers-reduced-motion: reduce)').matches)face.animate([{opacity:0,transform:'perspective(1200px) rotateY(-12deg)'},{opacity:1,transform:'perspective(1200px) rotateY(0)'}],{duration:850,easing:'cubic-bezier(.16,1,.3,1)'});
 }
 button.addEventListener('click',()=>show(!flipped));show(initialCover,false);
}
export async function drawCover(canvas,format){
 const image=new Image();image.src=format==='facebook'?'/assets/vote-share-v1.png':coverUrl;await image.decode();
 canvas.width=format==='facebook'?1200:format==='story'?1080:image.naturalWidth;canvas.height=format==='facebook'?630:format==='story'?1920:image.naturalHeight;
 const ctx=canvas.getContext('2d'),scale=Math.min(canvas.width/image.naturalWidth,canvas.height/image.naturalHeight);ctx.fillStyle='#00a6e5';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,(canvas.width-image.naturalWidth*scale)/2,(canvas.height-image.naturalHeight*scale)/2,image.naturalWidth*scale,image.naturalHeight*scale);return canvas;
}
