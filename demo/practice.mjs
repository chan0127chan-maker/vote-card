export function practiceMoveStart({field,size,target}){
 const x=Math.max(24,Math.min(field.w-size.w-24,target.x-size.w-20));
 const y=Math.max(24,Math.min(field.h-size.h-24,target.y+target.h/2-size.h/2));
 return{x,y};
}
export const PRACTICE_STEPS=[
 {action:'reveal',title:'讓第一個詞浮現',text:'按住筆來回搖動。也可以點「浮現」。',count:0},
 {action:'move',title:'移動一個詞',text:'把詞拖進虛線框。鍵盤可用方向鍵移動。',count:1},
 {action:'split',title:'把詞拆成字',text:'雙點一個詞，讓字散開。鍵盤可按 Enter。',count:1},
 {action:'merge',title:'重新串起來',text:'把一個字或詞拖到另一個上面。加入的會接在下方。',count:2},
 {action:'personal',title:'留下署名',text:'把筆尖移到下方橫線，或點橫線，署名後按「確認署名」。',count:1},
 {action:'source',title:'看看字詞如何連到議題',text:'正式畫面點字就會看到聚焦的議題。這裡先長按練習詞，或聚焦後按 Space，讀完按「收起」。',count:1},
 {action:'discard',title:'移除一段文字',text:'拖到畫面下緣放手，或快速往外滑。鍵盤可按 Delete。',count:2},
 {action:'dock',title:'把筆放回筆座',text:'把筆放到右下筆座，或點筆座，讓字在紙面中央排列。',count:1},
 {action:'sharing-info',title:'留下這封信',text:'正式畫面依保留的字詞聚焦議題。點左上郵票，選「存成圖片」下載字句與政策附箋，或選「傳送訊息」複製連結。收信人可閱讀半年。這裡只作說明，按「完成練習」即可開始自己的信。',count:1,informational:true}
];
export class PracticeProgress{
 index=0;ready=false;finished=false;
 record(action){if(!this.finished&&action===PRACTICE_STEPS[this.index].action)this.ready=true;return this.ready;}
 next(skip=false){if(this.finished||(!this.ready&&!skip&&!PRACTICE_STEPS[this.index].informational))return false;this.index++;this.ready=false;this.finished=this.index===PRACTICE_STEPS.length;return true;}
}
export function attachPractice(api){
 const progress=new PracticeProgress(),$=id=>document.getElementById(id),coach=$('practice-coach'),target=$('practice-target');let preparing=false,ended=false;
 document.body.classList.add('practice');$('paper-info')?.remove();$('share').disabled=true;coach.hidden=false;
 function finish(type){if(ended)return;ended=true;if(window.parent!==window)window.parent.postMessage({type},location.origin);else location.assign('/');}
 async function render(){
  if(progress.finished){finish('muzi:practice-finish');return;}
  const step=PRACTICE_STEPS[progress.index];preparing=true;
  coach.dataset.action=step.action;
  $('practice-count').textContent=`練習 ${progress.index+1} / ${PRACTICE_STEPS.length}`;$('practice-title').textContent=step.action==='dock'&&matchMedia('(max-width:679px)').matches?'點筆槽，排成信':step.title;$('practice-instruction').textContent=step.action==='dock'&&matchMedia('(max-width:679px)').matches?'點一下下方筆槽，收好木筆，讓字在紙面中央排列。手機不會自動吸回筆槽。':step.action==='personal'&&matchMedia('(max-width:679px)').matches?'把筆尖停在下方橫線，或直接點橫線，寫字後按「確認署名」。':step.text;
  $('practice-next').disabled=true;$('practice-next').textContent=progress.index===PRACTICE_STEPS.length-1?'完成練習':'下一步';
  target.hidden=step.action!=='move';
  await api.prepare(step);preparing=false;
  if(step.informational)$('practice-next').disabled=false;
 }
 $('practice-next').addEventListener('click',()=>{if(progress.next())render();});
 $('practice-skip').addEventListener('click',()=>{if(progress.next(true))render();});
 $('practice-exit').addEventListener('click',()=>finish('muzi:practice-exit'));
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!document.querySelector('dialog[open]')){event.preventDefault();finish('muzi:practice-exit');}});
 render();
 return {record(action,detail={}){
  if(preparing||ended)return;
  if(action==='move'){
   const r=target.getBoundingClientRect(),word=detail.el?.getBoundingClientRect();
   if(!word||word.left+word.width/2<r.left||word.left+word.width/2>r.right||word.top+word.height/2<r.top||word.top+word.height/2>r.bottom)return;
  }
  if(progress.record(action)){$('practice-next').disabled=false;$('practice-count').textContent=`練習 ${progress.index+1} / ${PRACTICE_STEPS.length} · 完成`;} 
 }};
}
