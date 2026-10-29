export const characterText=characters=>characters.map(c=>c.char).join('');
export function normalizePersonalText(value) {
 const text=value.normalize('NFC').replace(/[\u0000-\u001f\u007f]/g,'').trim();
 if(!text) throw new Error('先寫下一點字。');
 if([...text].length>32) throw new Error('一次先帶入 32 個字以內，可以分次補上。');
 return text;
}
export function catalogCharacters(entry,sources={}) {
 const origin={id:`catalog:${entry.id}:${crypto.randomUUID()}`,type:entry.provenance==='demo'?'demo':'catalog',wordId:entry.id,wordText:entry.text,provenance:entry.provenance,
  links:(entry.sourceLinks||[]).map(link=>({...structuredClone(link),source:sources[link.sourceId]?structuredClone(sources[link.sourceId]):null}))};
 return [...entry.text].map((char,index)=>({char,index,origin}));
}
export function personalCharacters(text,id=crypto.randomUUID()) {
 const value=normalizePersonalText(text),origin={id:`personal:${id}`,type:'personal',wordText:value,provenance:'personal',links:[]};
 return [...value].map((char,index)=>({char,index,origin}));
}
export function originGroups(characters) {
 const groups=[];
 for(const item of characters) {
  const previous=groups.at(-1);
  if(previous&&previous.originId===item.origin.id&&previous.lastIndex+1===item.index) {previous.text+=item.char;previous.lastIndex=item.index;}
  else groups.push({originId:item.origin.id,type:item.origin.type,provenance:item.origin.provenance,originalWord:item.origin.wordText,text:item.char,firstIndex:item.index,lastIndex:item.index,links:item.origin.links});
 }
 return groups.map(g=>({...g,sliced:g.text!==g.originalWord||g.firstIndex!==0}));
}
