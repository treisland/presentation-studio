// Multi-selection and group editing are session state, not project mutations.
let gsReady=false, gsPainting=false, gsEditing='', gsScene='', gsGesture=null, gsSuppressClick=false;
const gsPreviousBusy=editingGestureBusy;
editingGestureBusy=()=>gsPreviousBusy()||!!gsGesture;
const gsOriginalKeys=spActiveKeys;
spActiveKeys=function(){
  if(gsEditing)return componentPreviousKeys();
  return gsOriginalKeys();
};
function gsEntries(){return spEntries().filter(entry=>!visibilityEntryHidden(projectState,projectSelected,entry)&&!spProtected(entry));}
function gsFree(entry){return entry.kind==='block'||entry.kind==='media'&&!!entry.media.canvas?.placement;}
function gsGroup(){const entries=spEntries().filter(entry=>spActiveKeys().includes(entry.key)),group=entries[0]?.meta.group;return group&&entries.every(entry=>entry.meta.group===group)?group:'';}
function gsSelect(keys){
  vbEnd(false);projectFlush();vbSelected=null;icMember='';icDestination='';
  const first=keys[0];
  if(first)spSelect(first);else {dbSelected='';wpKind='slide';}
  spSelected=[...keys];vbSelected=null;spPaint();componentPaint();icPaint();gsPaint();
}
function gsToggle(key){
  const entry=gsEntries().find(item=>item.key===key);if(!entry)return;
  const unit=entry.meta.group&&!gsEditing?spEntries().filter(item=>item.meta.group===entry.meta.group).map(item=>item.key):[key];
  const current=spActiveKeys(),remove=unit.every(id=>current.includes(id));
  gsSelect(remove?current.filter(id=>!unit.includes(id)):[...new Set([...current,...unit])]);
}
function gsAction(action){
  let keys=spActiveKeys();if(!keys.length)return;
  if(action==='ungroup'){
    const groups=spEntries().filter(entry=>keys.includes(entry.key)).map(entry=>entry.meta.group).filter(Boolean);
    keys=spEntries().filter(entry=>keys.includes(entry.key)||groups.includes(entry.meta.group)).map(entry=>entry.key);
  }
  const result=componentRun({type:'component.'+action,keys});
  if(result.ok){gsEditing='';gsSelect(keys);$('gs-'+(action==='group'?'ungroup':'group'))?.focus({preventScroll:true});}
  return result;
}
const gsUngroup=editingOperations.get('component.ungroup');
editingOperations.set('component.ungroup',(state,operation)=>{
  const slide=editingSlide(state,operation.slideId),members=componentTargets(state,slide,operation.keys),data=spData(state,slide.id,true);
  // A hidden parent ceases to exist after ungrouping; keep its members hidden.
  for(const entry of members)if(state.visibility?.groups?.[slide.id]?.[entry.meta.group])
    (data.objects[entry.key]??={}).hidden=true;
  gsUngroup(state,operation);
});
function gsEnter(group=gsGroup()){
  const members=spEntries().filter(entry=>entry.meta.group===group);if(!group||members.some(spProtected))return;
  gsEditing=group;gsSelect([members[0].key]);
}
function gsExit(){const members=spEntries().filter(entry=>entry.meta.group===gsEditing);gsEditing='';gsSelect(members.map(entry=>entry.key));}
// Explicit single-member placement preserves normal whole-group operations.
editingRegisterOperation('component.member.place',(state,operation)=>{
  const slide=editingSlide(state,operation.slideId),entry=componentTargets(state,slide,[operation.key],false)[0];
  if(!entry.meta.group)editingFail('INVALID','Choose a group member.');
  componentTargets(state,slide,[entry.key]); // Every member must be unlocked.
  componentPlace(entry,operation.placement);
});
const gsBlockRun=dbRun;
dbRun=function(operation,...args){
  if(gsEditing&&operation.type==='block.place'&&spMeta(operation.blockId).group===gsEditing){
    return componentRun({type:'component.member.place',key:operation.blockId,placement:operation.placement});
  }
  return gsBlockRun(operation,...args);
};
function gsBounds(entries){
  const rectangles=entries.map(componentRect),x=Math.min(...rectangles.map(p=>p.x)),y=Math.min(...rectangles.map(p=>p.y));
  return{x,y,w:Math.max(...rectangles.map(p=>p.x+p.w))-x,h:Math.max(...rectangles.map(p=>p.y+p.h))-y};
}
function gsPaint(){
  if(!gsReady||gsPainting||!projectReady)return;gsPainting=true;
  try{
    const scene=projectMeta.id+':'+projectSelected;if(gsScene!==scene){gsScene=scene;gsEditing='';}
    const entries=spEntries(),keys=spActiveKeys(),selected=entries.filter(entry=>keys.includes(entry.key)),group=gsGroup();
    if(gsEditing&&!entries.some(entry=>entry.meta.group===gsEditing))gsEditing='';
    const editable=weEditing()&&vbMode==='edit'&&!ceLocked(),locked=!editable||selected.some(spProtected);
    const reason=selected.length<2?'Select at least two items.':selected.some(entry=>!gsFree(entry))?'Customize template positions or float media before grouping.':selected.some(entry=>entry.meta.group)?'Ungroup existing groups before creating a new group.':locked?'Unlock selected items before grouping.':'';
    $('gs-actions').hidden=(!group&&!gsEditing&&selected.length<2)||!editable;
    $('gs-status').textContent=gsEditing?'Editing '+enGroupLabel(projectState,projectSelected,gsEditing):group?enGroupLabel(projectState,projectSelected,group)+' · '+selected.length+' items':selected.length+' items selected';
    $('gs-group').hidden=!!group||!!gsEditing;$('gs-group').disabled=!!reason;$('gs-group').title=reason||'Group selected items (Ctrl/Cmd+G)';
    $('gs-ungroup').hidden=!group;$('gs-ungroup').disabled=locked;
    $('gs-edit').hidden=!group||!!gsEditing;$('gs-edit').disabled=locked;
    $('gs-exit').hidden=!gsEditing;$('gs-reason').textContent=!group&&selected.length>1?reason:'';
    for(const el of projectPreviewNode?.querySelectorAll('.gs-bounds')||[])el.remove();
    const slide=projectPreviewNode?.querySelector('.slide');
    if(slide){
      slide.classList.toggle('gs-multiple',selected.length>1&&!gsEditing);
      for(const entry of entries){const el=spElement(slide,entry);if(el)el.classList.toggle('gs-selected',editable&&keys.includes(entry.key));}
    }
    if(slide&&editable&&selected.length>1&&selected.every(gsFree)&&!selected.some(entry=>visibilityEntryHidden(projectState,projectSelected,entry))){
      const rect=gsBounds(selected),box=document.createElement('div');box.className='gs-bounds';box.setAttribute('role','group');box.setAttribute('aria-label',group?'Selected group':'Selected objects');
      Object.assign(box.style,{left:rect.x*100+'%',top:rect.y*100+'%',width:rect.w*100+'%',height:rect.h*100+'%'});
      const move=spButton(group?enGroupLabel(projectState,projectSelected,group):selected.length+' items',()=>{});move.className='gs-handle gs-move';move.dataset.gsGesture='move';move.setAttribute('aria-label','Move selected objects');move.disabled=locked;box.append(move);
      const resize=spButton('',()=>{},'Resize selected objects');resize.className='gs-handle gs-resize';resize.dataset.gsGesture='resize';resize.disabled=locked;box.append(resize);slide.append(box);
    }
    // The selected group has one obvious row and its actual members stay visible.
    const list=$('sp-layers');list?.querySelectorAll('.gs-layer-group').forEach(node=>node.remove());
    for(const groupID of new Set(entries.map(entry=>entry.meta.group).filter(Boolean))){
      const members=entries.filter(entry=>entry.meta.group===groupID),rows=[...list.querySelectorAll('.sp-layer-row')].filter(row=>members.some(entry=>entry.key===row.dataset.key));
      const row=document.createElement('div');row.className='gs-layer-group';
      const choose=spButton('▾ '+enGroupLabel(projectState,projectSelected,groupID),()=>{gsEditing='';gsSelect(members.map(entry=>entry.key));},'Select '+enGroupLabel(projectState,projectSelected,groupID));choose.setAttribute('aria-pressed',String(groupID===group&&!gsEditing));row.append(choose);
      if(rows[0])rows[0].parentElement.before(row);
      for(const item of rows){item.dataset.gsGroup=groupID;item.classList.add('gs-layer-member');}
    }
  }finally{gsPainting=false;}
}
function gsEntryAt(target){
  const slide=projectPreviewNode?.querySelector('.slide');if(!slide?.contains(target))return null;
  return spEntries().find(entry=>{const element=spElement(slide,entry);return element===target||element?.contains(target);});
}
function gsFinish(cancel=false){
  const gesture=gsGesture;if(!gesture)return;gsGesture=null;
  projectPreviewNode?.querySelectorAll('.gs-candidate').forEach(element=>element.classList.remove('gs-candidate'));
  gesture.marquee?.remove();try{gesture.capture.releasePointerCapture(gesture.pointer);}catch{}
  const valid=projectSelected===gesture.slide&&studioEditing.read().projectId===gesture.snapshot.projectId&&studioEditing.read().revision===gesture.snapshot.revision&&weEditing()&&vbMode==='edit'&&!ceLocked();
  if(gesture.type==='marquee'){
    if(!cancel&&valid&&gesture.moved)gsSelect(gesture.keys||[]);
    if(gesture.moved)gsSuppressClick=true;
    return;
  }
  for(const [element,style]of gesture.styles)if(element.isConnected)element.style.cssText=style;
  if(!cancel&&valid&&gesture.moved){
    const {next,rect,mode}=gesture;
    const operation={type:'component.arrange',slideId:gesture.slide,keys:gesture.keys,action:mode==='resize'?'resize':'move',dx:next.x-rect.x,dy:next.y-rect.y,...(mode==='resize'?{scale:next.w/rect.w}:{})};
    const result=studioEditing.apply({apiVersion:1,projectId:gesture.snapshot.projectId,expectedRevision:gesture.snapshot.revision,operations:[operation]});if(!result.ok)projectMessage(result.message);else gsSelect(gesture.keys);
  }
  gsPaint();gsSuppressClick=!!gesture.moved;
}
const gsPaintPrevious=spPaint;
spPaint=function(...args){const result=gsPaintPrevious(...args);gsPaint();return result;};
const gsComponentPaint=componentPaint;
componentPaint=function(...args){const result=gsComponentPaint(...args);gsPaint();return result;};
const gsPreview=projectPreview;
projectPreview=function(...args){const result=gsPreview(...args);if(gsReady)gsPaint();return result;};
const gsInit=projectInit;
projectInit=function(...args){
  const result=gsInit(...args);if(gsReady)return result;
  const actions=document.createElement('section');actions.id='gs-actions';actions.hidden=true;actions.setAttribute('aria-label','Selection actions');
  const status=document.createElement('strong');status.id='gs-status';status.setAttribute('role','status');actions.append(status);
  for(const [id,label,action]of [['group','Group',()=>gsAction('group')],['ungroup','Ungroup',()=>gsAction('ungroup')],['edit','Edit group',()=>gsEnter()],['exit','Finish group editing',gsExit]]){const button=spButton(label,action);button.id='gs-'+id;actions.append(button);}
  const reason=document.createElement('small');reason.id='gs-reason';actions.append(reason);$('selection-action-dock').append(actions);
  // Existing toolbar affordances delegate to the same guarded actions.
  $('component-group').onclick=()=>gsAction('group');$('component-ungroup').onclick=()=>gsAction('ungroup');
  const preview=$('fe-preview');
  window.addEventListener('pointerdown',event=>{
    if(event.button===0&&preview.contains(event.target))gsSuppressClick=false;
    if(!weEditing()||vbMode!=='edit'||ceLocked()||event.button!==0||weSpace||ceDrag||ceRelocate||dbDrag||!preview.contains(event.target))return;
    const handle=event.target.closest('[data-gs-gesture]'),entry=gsEntryAt(event.target);
    if(event.target.closest('[contenteditable=true]')&&vbSession)return;
    if(entry && !gsEntries().some(item=>item.key===entry.key) && event.shiftKey){event.preventDefault();event.stopImmediatePropagation();gsSuppressClick=true;return;}
    if(event.shiftKey&&entry){event.preventDefault();event.stopImmediatePropagation();gsToggle(entry.key);gsSuppressClick=true;return;}
    if(entry?.meta.group&&!gsEditing&&!handle&&!event.target.closest('.db-handle,.ce-handle')){
      event.preventDefault();event.stopImmediatePropagation();gsSuppressClick=true;const peers=spEntries().filter(item=>item.meta.group===entry.meta.group);if(peers.some(spProtected)||peers.some(item=>visibilityEntryHidden(projectState,projectSelected,item)))return;gsSelect(peers.map(item=>item.key));return;
    }
    const slide=preview.querySelector('.slide');if(!slide)return;
    if(!handle&&(entry||event.target.closest('button,input,select,textarea,a,[data-vb-path],header,footer')))return;
    event.preventDefault();event.stopImmediatePropagation();vbEnd(false);projectFlush();
    const snapshot=studioEditing.read(),bounds=slide.getBoundingClientRect();
    const gesture={pointer:event.pointerId,slide:projectSelected,x:event.clientX,y:event.clientY,bounds,snapshot,capture:preview,moved:false};
    if(handle){
      const selected=spEntries().filter(item=>spActiveKeys().includes(item.key));if(selected.some(spProtected)||!selected.every(gsFree))return;
      gesture.type='transform';gesture.mode=handle.dataset.gsGesture;gesture.keys=selected.map(item=>item.key);gesture.rect=gsBounds(selected);gesture.next={...gesture.rect};gesture.entries=selected;
      gesture.overlay=handle.closest('.gs-bounds');
      gesture.styles=selected.map(item=>{const element=spElement(slide,item);return[element,element.style.cssText];});
    }else{
      gesture.type='marquee';gesture.initial=event.shiftKey?spActiveKeys():[];gesture.marquee=document.createElement('div');gesture.marquee.className='gs-marquee';slide.append(gesture.marquee);gsEditing='';
    }
    gsGesture=gesture;preview.setPointerCapture(event.pointerId);
  },true);
  window.addEventListener('pointermove',event=>{
    const d=gsGesture;if(!d||event.pointerId!==d.pointer)return;event.preventDefault();
    const dx=(event.clientX-d.x)/d.bounds.width,dy=(event.clientY-d.y)/d.bounds.height;d.moved ||= Math.hypot(event.clientX-d.x,event.clientY-d.y)>4;
    if(d.type==='marquee'){
      const x=Math.min(d.x,event.clientX),y=Math.min(d.y,event.clientY),right=Math.max(d.x,event.clientX),bottom=Math.max(d.y,event.clientY);
      Object.assign(d.marquee.style,{left:(x-d.bounds.left)/d.bounds.width*100+'%',top:(y-d.bounds.top)/d.bounds.height*100+'%',width:(right-x)/d.bounds.width*100+'%',height:(bottom-y)/d.bounds.height*100+'%'});
      const slide=preview.querySelector('.slide'),available=gsEntries(),enclosed=available.filter(entry=>{const box=spElement(slide,entry)?.getBoundingClientRect();return box&&box.width>0&&box.height>0&&box.left>=x&&box.top>=y&&box.right<=right&&box.bottom<=bottom;});
      d.keys=[...new Set([...d.initial,...enclosed.filter(entry=>!entry.meta.group||spEntries().filter(item=>item.meta.group===entry.meta.group).every(item=>enclosed.some(candidate=>candidate.key===item.key))).map(entry=>entry.key)])];
      for(const entry of spEntries()){const element=spElement(slide,entry);element?.classList.toggle('gs-candidate',d.keys.includes(entry.key));}
    }else{
      const p=d.rect,minScale=Math.max(...d.entries.map(entry=>{const rect=componentRect(entry),min=mgHas(entry.node,'db-template')?.005:.05;return Math.max(min/rect.w,min/rect.h);}));
      const scale=d.mode==='resize'?Math.min((1-p.x)/p.w,(1-p.y)/p.h,Math.max(minScale,Math.min((p.w+dx)/p.w,(p.h+dy)/p.h))):1;
      d.next={x:d.mode==='move'?Math.max(0,Math.min(1-p.w,p.x+dx)):p.x,y:d.mode==='move'?Math.max(0,Math.min(1-p.h,p.y+dy)):p.y,w:p.w*scale,h:p.h*scale};
      Object.assign(d.overlay.style,{left:d.next.x*100+'%',top:d.next.y*100+'%',width:d.next.w*100+'%',height:d.next.h*100+'%'});
      for(const entry of d.entries){const rect=componentRect(entry),element=spElement(preview.querySelector('.slide'),entry);if(element)Object.assign(element.style,{left:(d.next.x+(rect.x-p.x)*scale)*100+'%',top:(d.next.y+(rect.y-p.y)*scale)*100+'%',width:rect.w*scale*100+'%',height:rect.h*scale*100+'%'});}
    }
  },true);
  window.addEventListener('pointerup',event=>{if(gsGesture?.pointer===event.pointerId)gsFinish();},true);
  window.addEventListener('pointercancel',()=>gsFinish(true),true);
  preview.addEventListener('lostpointercapture',event=>{if(gsGesture?.pointer===event.pointerId)gsFinish(true);});window.addEventListener('blur',()=>gsFinish(true));
  window.addEventListener('click',event=>{if(gsSuppressClick&&preview.contains(event.target)){gsSuppressClick=false;event.preventDefault();event.stopImmediatePropagation();}},true);
  preview.addEventListener('dblclick',event=>{
    const entry=gsEntryAt(event.target);if(!entry?.meta.group||spProtected(entry)||vbMode!=='edit')return;
    event.preventDefault();event.stopImmediatePropagation();gsEnter(entry.meta.group);spSelect(entry.key);
    const text=event.target.closest('[data-vb-path]');if(text?.dataset.vbKind==='text')vbStart({el:text,path:text.dataset.vbPath,kind:'text',slideID:projectSelected});
  },true);
  window.addEventListener('keydown',event=>{
    if(!weEditing()||vbMode!=='edit'||event.isComposing||event.target.closest('input,textarea,select,[contenteditable=true]'))return;
    if(event.key==='Escape'&&gsGesture){event.preventDefault();event.stopImmediatePropagation();gsFinish(true);return;}
    if(event.key==='Escape'&&gsEditing){event.preventDefault();event.stopImmediatePropagation();gsExit();return;}
    if((event.ctrlKey||event.metaKey)&&!event.altKey&&event.key.toLowerCase()==='g'){
      event.preventDefault();event.stopImmediatePropagation();gsAction(event.shiftKey?'ungroup':'group');
    }
    const handle=event.target.closest('[data-gs-gesture]');
    if(handle&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){
      event.preventDefault();event.stopImmediatePropagation();const delta=event.shiftKey?.01:.002;
      componentRun({type:'component.arrange',keys:spActiveKeys(),action:handle.dataset.gsGesture==='resize'?'resize':'move',dx:handle.dataset.gsGesture==='move'?(event.key==='ArrowLeft'?-delta:event.key==='ArrowRight'?delta:0):0,dy:handle.dataset.gsGesture==='move'?(event.key==='ArrowUp'?-delta:event.key==='ArrowDown'?delta:0):0,...(handle.dataset.gsGesture==='resize'?{scale:['ArrowLeft','ArrowUp'].includes(event.key)?.98:1.02}:{})});gsPaint();preview.querySelector('[data-gs-gesture="'+handle.dataset.gsGesture+'"]')?.focus();
    }
  },true);
  $('full-editor').addEventListener('close',()=>gsFinish(true));
  gsReady=true;gsPaint();return result;
};
