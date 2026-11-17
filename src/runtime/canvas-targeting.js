// Editor-only ownership feedback and overlap choices. Never serialized.
let ctHover=null;
function canvasHoverClear(){ctHover?.classList.remove('canvas-hover');ctHover=null;}
function canvasCandidates(x,y){
 const slide=projectPreviewNode?.querySelector('.slide');if(!slide)return [];
 const entries=[];
 for(const element of document.elementsFromPoint(x,y)){
  if(!slide.contains(element)||element.closest('.db-handle,.ce-handle,.gs-handle,.an-endpoint'))continue;
  const entry=gsEntryAt(element);
  if(entry&&!entries.some(item=>item.key===entry.key)&&!visibilityEntryHidden(projectState,projectSelected,entry))entries.push(entry);
 }
 return entries;
}
function canvasChoose(entry){
 canvasHoverClear();
 if(entry.meta.group&&!gsEditing){gsSelect(spEntries().filter(item=>item.meta.group===entry.meta.group).map(item=>item.key));}
 else{vbEnd(false);projectFlush();spSelect(entry.key);}
}
const canvasTargetInit=projectInit;
projectInit=function(...args){
 const result=canvasTargetInit(...args),preview=$('fe-preview');
 preview.addEventListener('pointermove',event=>{
  canvasHoverClear();if(vbMode!=='edit'||editingGestureBusy()||vbSession||event.buttons)return;
  const entry=canvasCandidates(event.clientX,event.clientY)[0];
  if(entry){ctHover=spElement(preview.querySelector('.slide'),entry);ctHover?.classList.add('canvas-hover');}
 });
 preview.addEventListener('pointerleave',canvasHoverClear);
 // Padding belongs to the enclosing free object, rather than starting a text edit.
 preview.addEventListener('click',event=>{
  if(vbMode!=='edit'||event.button||event.shiftKey||vbSession||gsSuppressClick)return;
  if(event.target.closest('button,input,select,textarea,a,.db-handle,.ce-handle,.gs-handle,[contenteditable=true]'))return;
  const owner=event.target.closest('.db-block');if(!owner)return;
  const path=event.target.closest('[data-vb-path]');
  if(path&&path!==owner)return; // Preserve existing field/cell editing.
  const entry=gsEntryAt(owner);if(!entry)return;
  event.preventDefault();event.stopImmediatePropagation();canvasChoose(entry);
 },true);
 return result;
};
const canvasTargetOpen=cmOpen;
cmOpen=function(options={}){
 canvasTargetOpen(options);
 if(options.card||!cmState)return;
 const selected=spEntries().find(entry=>spActiveKeys().includes(entry.key)),element=selected&&spElement(projectPreviewNode.querySelector('.slide'),selected),box=element?.getBoundingClientRect();
 const x=options.x??(box&&box.left+box.width/2),y=options.y??(box&&box.top+box.height/2);if(x==null)return;
 const candidates=canvasCandidates(x,y);if(candidates.length<2)return;
 const rows=cmPlaced(!!options.node?.closest('td,th'));
 rows.unshift({label:'Select underneath',children:candidates.map(entry=>({label:entry.meta.name||entry.name||entry.key,action:()=>canvasChoose(entry),preview:()=>{canvasHoverClear();ctHover=spElement(projectPreviewNode.querySelector('.slide'),entry);ctHover?.classList.add('canvas-hover');}}))});
 cmRender(rows,icSelection().title);cmPosition(cmState.x,cmState.y);
};
const canvasTargetClose=cmClose;
cmClose=function(...args){canvasHoverClear();return canvasTargetClose(...args);};
