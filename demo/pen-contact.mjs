// Entering only starts feedback. The drag keeps its pointer capture until an intentional dwell completes.
export function penInputContact({onReady,onFeedback,delay=650,schedule=setTimeout,cancel=clearTimeout}){
 let active=null,timer=null,revision=0;
 function clear(){revision++;if(timer!==null)cancel(timer);timer=null;if(active!==null)onFeedback(false);active=null;}
 return {clear,track(id,inside){
  if(id===null||!inside){clear();return;}
  if(active===id)return;
  clear();active=id;onFeedback(true);const ticket=revision;
  timer=schedule(()=>{if(ticket!==revision||active!==id)return;timer=null;active=null;onFeedback(false);onReady(id);},delay);
 }};
}
