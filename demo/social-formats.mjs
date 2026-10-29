export const SOCIAL_FORMATS={facebook:{label:'Facebook 橫式',width:1200,height:630},story:{label:'限時動態',width:1080,height:1920}};
export function attachSocialFormats({canEdit}){
 const paper=document.querySelector('.page'),toolbar=document.createElement('nav');toolbar.className='format-toolbar';toolbar.setAttribute('aria-label','創作與下載比例');
 let current=matchMedia('(max-width:679px)').matches?'story':'facebook';
 const buttons=[];
 function measure(){const box=paper.getBoundingClientRect(),stage=paper.querySelector('.stage'),s=stage.getBoundingClientRect();for(const [key,value]of Object.entries({'paper-width':box.width,'paper-height':box.height,'stage-offset-top':s.top-box.top,'stage-offset-left':s.left-box.left,'stage-offset-right':box.right-s.right}))paper.style.setProperty('--'+key,value+'px');}
 function set(value,initial=false){if(!initial&&!canEdit())return;current=value;paper.dataset.format=value;for(const [key,b]of buttons)b.setAttribute('aria-pressed',String(key===value));measure();window.dispatchEvent(new Event('resize'));}
 for(const [key,format]of Object.entries(SOCIAL_FORMATS)){const b=document.createElement('button');b.textContent=format.label+' '+(key==='facebook'?'1200×630':'9:16');b.addEventListener('click',()=>set(key));toolbar.append(b);buttons.push([key,b]);}
 paper.before(toolbar);new ResizeObserver(measure).observe(paper);set(current,true);
 return {get:()=>current};
}
