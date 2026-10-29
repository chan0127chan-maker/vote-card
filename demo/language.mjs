// 開放的編輯語料：允許錯位與投射，不預寫整輪句子，也不綁定成對出現。
// tags 是內容關聯，不代表對使用者情緒或人格的判斷。
export const LEXICON = [
  ['after-work','moment',['daily','rest'],'下班以後',['一起走走','去吃點甜','先別趕路']],
  ['weekend','moment',['daily','play'],'這個週末',['不設鬧鐘','去吃早餐','去找朋友']],
  ['after-rain','moment',['weather','journey'],'雨停以後',['再走一段','去看河流','記得抬頭']],
  ['later','moment',['time','journey'],'晚一點',['再回家','再出發','再告訴你']],
  ['before-goodbye','moment',['time','relation'],'再見之前',['留點時間','再抱一下','把話說完']],
  ['then','moment',['memory','relation'],'那一次',['忘了道謝','沒能赴約','笑到流淚']],
  ['rain','image',['weather','memory'],'那天的雨',['還沒停','淋濕了信','落在窗邊']],
  ['light','image',['daily','time'],'窗邊的光',['慢慢亮','剛好落下','照著空位']],
  ['letter','image',['memory','relation'],'那封信',['還沒寄出','寫了又停','藏在抽屜']],
  ['tea','image',['daily','rest'],'桌上的茶',['已經涼了','還冒著煙','等你回來']],
  ['shop','image',['daily','memory'],'巷口的店',['還亮著燈','換了招牌','今天沒開']],
  ['soup','image',['daily','relation'],'一碗熱湯',['留給你','暖了手心','剛剛端來']],
  ['road','image',['journey','play'],'陌生的路',['也有花開','走著就熟','通向哪裡']],
  ['pocket','image',['journey','memory'],'口袋裡',['還有車票','剩點零錢','藏著小事']],
  ['with-you','voice',['relation','journey'],'我想和你',['繞點遠路','等一場雨','去看海','吃一碗麵']],
  ['today-me','voice',['daily','rest'],'今天的我',['不想趕路','睡過頭了','需要擁抱','還在練習']],
  ['thank-you','voice',['relation','memory'],'謝謝你',['還在這裡','替我留燈','沒有催我']],
  ['miss-you','voice',['relation','memory'],'有點想你',['但先不說','寫在這裡','明天見吧']],
  ['decide','voice',['play','journey'],'我決定',['今天偷懶','慢慢來','不再等了','先寫一句']],
  ['not-required','voice',['rest','relation'],'你不必',['立刻回答','一直勇敢','什麼都懂']],
  ['if','turn',['relation','rest'],'如果可以',['先別說話','明天再說','再坐一下','一起散步']],
  ['suddenly','turn',['play','daily'],'突然覺得',['今天不錯','不必著急','可以偷懶','有點想家']],
  ['occasionally','turn',['rest','play'],'偶爾',['也想亂來','想躲一下','需要安靜']],
  ['actually','turn',['rest','play'],'其實',['今天不錯','並不孤單','很想大笑','還在學呢']],
  ['not-always','turn',['rest','time'],'不必每次',['都有答案','說得漂亮','走得很快']],
  ['not-ready','turn',['rest','time'],'還沒準備',['也沒關係','就先等等','先寫一點']],
  ['unspoken','action',['relation','time'],'沒說完的',['下次再說','留給明天','寫在背面']],
  ['some-words','action',['relation','memory'],'有些話',['不急著說','寫了又改','留在紙上']],
  ['fold-today','action',['daily','memory'],'我把今天',['折進信裡','留在這裡','寫得很慢']],
  ['this-line','action',['rest','time'],'把這句話',['送給自己','先藏起來','留給明天']],
  ['shall-we','action',['play','relation'],'要不要',['先吃再說','一起偷懶','先去走走']],
  ['wind','action',['weather','relation'],'風很大',['靠近一點','握緊一點','一起走吧']],
].map(([id,kind,tags,opening,endings])=>({id,kind,tags,opening,endings}));

export function createLanguageHistory() { return { recentWords: [], recentUnits: [] }; }
function choose(items, weights, rng) {
  let r = rng() * weights.reduce((a,b)=>a+b,0);
  for (let i=0;i<items.length;i++) { r-=weights[i]; if(r<=0) return items[i]; }
  return items.at(-1);
}
function permutationAt(rank) {
  const remaining=[0,1,2,3,4,5,6,7], result=[];
  for(let size=8;size>0;size--) {
    let block=1; for(let j=2;j<size;j++) block*=j;
    const index=Math.floor(rank/block); rank%=block;
    result.push(remaining.splice(index,1)[0]);
  }
  return result;
}
export function createLanguageRound(features, rng = Math.random, history = createLanguageHistory(), catalog = null) {
  const blocked=new Set(history.recentWords.slice(-8)), chosen=[], seen=new Set(), kinds=new Set();
  const fallback=LEXICON.flatMap(unit=>[unit.opening,...unit.endings].map((text,part)=>({
    text,unit:unit.id,kind:unit.kind,tags:unit.tags,part,
  })));
  const pool=catalog ? catalog.map(entry=>({text:entry.text,unit:entry.id,kind:entry.kind,tags:entry.tags,part:0,weight:entry.weight,catalogEntry:entry})) : fallback;
  const count=Math.min(8,new Set(pool.map(w=>w.text)).size);
  const tone={moment:[.3,.6,.2],image:[.4,.5,.7],voice:[.5,.4,.35],turn:[.25,.4,.75],action:[.8,.7,.3]};
  for(let i=0;i<count;i++) {
    const available=pool.filter(w=>!seen.has(w.text));
    let candidates=available.filter(w=>!blocked.has(w.text));
    if(!candidates.length) candidates=available;
    if(kinds.size<3) { const diverse=candidates.filter(w=>!kinds.has(w.kind)); if(diverse.length)candidates=diverse; }
    const fragment=choose(candidates,candidates.map(w=>{
      const related=chosen.length?w.tags.filter(t=>chosen[0].tags.includes(t)).length:0;
      const recent=history.recentWords.includes(w.text)?.15:1;
      const [t,r,a]=tone[w.kind];
      const d=(t-features.tempo)**2+(r-features.reach)**2+(a-features.axis)**2;
      return (w.weight ?? 1)*(1+related*.3)*recent*(.7+.3*Math.exp(-d*2));
    }),rng);
    chosen.push({...fragment,order:i}); seen.add(fragment.text); kinds.add(fragment.kind);
  }
  // 同一批詞提供多種鬆散讀法，不把相鄰片段鎖成不可拆的句子。
  const ranks=new Set(), orders=[];
  for(let i=0;i<24;i++) {
    let rank=(Math.floor(rng()*40320)+i*1733)%40320;
    while(ranks.has(rank)) rank=(rank+1)%40320;
    ranks.add(rank); orders.push(permutationAt(rank));
  }
  const unitIds=[...new Set(chosen.map(w=>w.unit))];
  history.recentWords=[...history.recentWords,...seen].slice(-96);
  history.recentUnits=[...history.recentUnits,...unitIds].slice(-24);
  return {sceneId:unitIds.join('/'),units:catalog?chosen.map(w=>({id:w.unit,kind:w.kind})):LEXICON.filter(u=>unitIds.includes(u.id)),remaining:chosen,orders};
}
export function drawFragment(round, features, rng = Math.random) {
  if(!round.remaining.length) return null;
  const index=Math.min(round.remaining.length-1,Math.floor(rng()*round.remaining.length));
  return round.remaining.splice(index,1)[0];
}
export function suggestedOrder(words, round, version = 0) {
  if(!round || !words.length) return [...words];
  const seen=new Set(), candidates=[];
  for(const order of round.orders) {
    const rank=value=>{const i=order.indexOf(value);return i<0?order.length+value:i;};
    const candidate=[...words].sort((a,b)=>rank(a.order)-rank(b.order));
    const key=candidate.map(w=>w.text).join('\u0000');
    if(!seen.has(key)) {seen.add(key);candidates.push(candidate);}
  }
  return candidates[version%candidates.length];
}
