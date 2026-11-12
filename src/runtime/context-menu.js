// Contextual shortcuts invoke existing controls and transactions, never a second editor.
let cmReady=false, cmMenu=null, cmState=null;
function cmStamp(){return JSON.stringify([projectMeta.id,projectSelected,editingRevision(),spActiveKeys(),ceSelected,mgSelected,icSelection().identity]);}
function cmNative(node){
  if(node.closest('input,textarea,select'))return true;
  const editable=node.closest('[contenteditable="true"]');
  return !!editable&&(!projectPreviewNode?.contains(editable)||!!vbSession?.el?.contains(node));
}
function cmClose(restore=true){
  if(!cmState)return;const state=cmState;cmState=null;
  state.card?.classList.remove('cm-target');state.trigger?.setAttribute('aria-expanded','false');
  if(cmMenu.matches(':popover-open'))cmMenu.hidePopover();
  if(restore){const target=state.origin?.isConnected&&state.origin.checkVisibility()?state.origin:state.card?$('component-search'):$('cm-selection');target?.focus({preventScroll:true});}
}
function cmReveal(tab,target){wePanels.inspector.open=true;wePanelView();wpChooseTab(tab);idsReveal(typeof target==='function'?target():target,true);}
function cmButton(label,id,extra=false){const button=$(id);return {label,disabled:!button||button.disabled||extra,action:()=>$(id)?.click()};}
function cmCatalog(card){
  const actions=[...card.querySelectorAll('button')].filter(button=>!button.classList.contains('cm-trigger'));
  const rows=actions.filter(button=>button.textContent.trim().startsWith('Insert ')).map(button=>({label:button.textContent.trim(),disabled:button.disabled||!weEditing()||ceLocked(),action:()=>button.click()}));
  const options=card.querySelector('details');
  if(options){
    const rename=actions.find(button=>button.textContent==='Rename'),copy=actions.find(button=>button.textContent==='Duplicate preset'),remove=actions.find(button=>button.textContent==='Delete preset');
    if(rename)rows.push({label:'Rename saved component…',action:()=>{options.hidden=false;options.open=true;options.querySelector('input').focus();}});
    if(copy)rows.push({label:'Duplicate saved component',action:()=>copy.click()});
    rows.push(cmButton('Export library…','component-export'));
    if(remove)rows.push({label:'Delete saved component',danger:true,action:()=>remove.click()});
  }
  return rows;
}
function cmPlaced(cellTarget=false){
  const context=icSelection(),keys=spActiveKeys(),entries=spEntries().filter(entry=>keys.includes(entry.key));
  const multiple=context.kind==='multiple',grid=context.kind==='grid',media=context.kind==='media'||grid,locked=context.locked;
  const rows=[],entry=entries.length===1?entries[0]:null,single=!multiple&&entries.length<=1;
  const edit={text:['Edit text…',()=>icExpandTextEditor()],table:['Edit table cells…',()=>{cmReveal('content','fe-table-grid');$('fe-table-grid').querySelector('input')?.focus();}],code:['Edit code…',()=>cmReveal('content','code-text')],widget:['Configure widget…',()=>cmReveal('content',()=>$('component-widget-fields').querySelector('textarea'))],slide:['Slide settings…',()=>icNavigate('slide')] }[context.kind];
  if(edit&&(context.kind!=='text'||context.path))rows.push({label:edit[0],disabled:locked&&context.kind!=='slide',action:edit[1]});
  else if(context.kind==='text')rows.push({label:'Appearance…',action:()=>cmReveal('style','is-color-fill')});
  if(media){
    const {cfg}=miContext();rows.push(cmButton(cfg?'Replace media…':'Add media to cell…',grid?'mi-add-cell':'ce-replace',locked));
    if(cfg)rows.push({label:'Crop / adjust frame…',action:()=>cmReveal('content','mi-fit')});
    if(!grid&&cfg)rows.push({label:'Placement',children:[...$('mi-layout').options].map(option=>({label:option.textContent,disabled:locked||option.value!=='floating'&&ceSelected!=='primary'&&cePrimaryProtected(),action:()=>miLayout(option.value)}))});
    if(grid){rows.push({label:'Move / swap cell media…',disabled:locked,action:()=>cmReveal('arrange','mg-destination')});rows.push(cmButton('Detach media from grid','mg-detach',locked));}
  }
  if(single&&entry)rows.push({label:'Edit action…',disabled:locked,action:()=>cmReveal('content','nav-type')});
  if(cellTarget&&context.kind==='table'&&tblCurrent()){
    const current=tblCurrent();
    rows.push({label:'Rows and columns',children:[...$('tbl-action-row').options,...$('tbl-action-column').options].filter(option=>option.value).map(option=>({label:option.textContent,disabled:locked,action:()=>{tblCell={slide:projectSelected,path:current.path,row:current.row,column:current.column};tblRun('table.structure',{action:option.value});}}))});
  }
  const duplicate=multiple?'component-duplicate':media?'wp-duplicate':entry?.kind==='block'?'db-duplicate':context.kind==='slide'?'wp-duplicate':'vb-duplicate';
  if(!grid)rows.push(cmButton(context.kind==='slide'?'Duplicate slide':'Duplicate',duplicate,locked));
  if(context.kind!=='slide')rows.push({label:'Arrange',children:[
    cmButton('Bring forward','component-forward',locked),cmButton('Send backward','component-backward',locked),
    {label:'Arrange controls…',action:()=>{wePanels.inspector.open=true;wePanelView();wpChooseTab('arrange');const field=$('wp-fields').querySelector('[data-wp-part="arrange"] :is(input,select,summary)');if(field)idsReveal(field,true);}}
  ]});
  if(multiple||gsGroup()){
    if(gsGroup()){rows.push(cmButton('Ungroup','gs-ungroup',locked));if(!gsEditing)rows.push(cmButton('Edit group members','gs-edit',locked));}
    else rows.push(cmButton('Group selected','gs-group',locked));
  }
  if(gsEditing)rows.push(cmButton('Finish editing group','gs-exit'));
  if(grid&&miContext().cfg){rows.push({label:miContext().cfg.canvas?.hidden?'Show':'Hide',disabled:locked,action:()=>$('ce-hidden').click()});rows.push(cmButton(ceConfig()?.canvas?.locked?'Unlock':'Lock','ce-object-lock',ceLocked()));}
  else if(entries.length){
    const hidden=entries.every(item=>visibilityEntryHidden(projectState,projectSelected,item));
    rows.push(cmButton(hidden?'Show':'Hide',hidden?'visibility-reveal':'visibility-hide',locked));
    const layer=entry?[...$('sp-layers').querySelectorAll('.sp-layer-row')].find(row=>row.dataset.key===entry.key):null,lock=layer?.querySelectorAll('button')[2];
    if(lock)rows.push({label:entry.meta.locked||entry.media?.canvas?.locked?'Unlock':'Lock',disabled:lock.disabled,action:()=>lock.click()});
    else rows.push(cmButton('Lock selected','component-lock',locked));
    if(entry)rows.push({label:'Rename in Layers…',disabled:locked,action:()=>{ldOpen();ldRename(entry.key);}});
  }
  if(componentCanSave())rows.push(cmButton('Save as component…','component-save-action'));
  const remove=multiple?'component-delete':media?'wp-delete':entry?.kind==='block'?'db-remove':context.kind==='slide'?'wp-delete':'vb-delete';
  rows.push({...cmButton(context.kind==='slide'?'Delete slide':grid?'Remove media from cell':'Delete from slide',remove,locked),danger:true});
  return rows;
}
function cmTarget(node){
  const figure=node.closest('.media-box'),cell=figure?.dataset.mgCell||node.closest('.mg-cell-action')?.dataset.mgCell;
  if(cell)return {cell};
  const entry=gsEntryAt(node);return entry?{key:entry.key}:null;
}
function cmSelect(target,node){
  const cell=node.closest('td,th');
  if(target?.cell){if(wpKind!=='grid'||mgSelected!==target.cell){vbEnd(false);projectFlush();spSelected=[];vbSelected=null;dbSelected='';icDestination='';mgChoose(target.cell);wpKind='grid';icPaint();}}
  else if(target?.key&&!spActiveKeys().includes(target.key)){vbEnd(false);projectFlush();spSelect(target.key);}
  else{vbEnd(false);projectFlush();}
  if(cell){tblSelectCell(cell);tblPaint();}
  return !!cell;
}
function cmPosition(x,y){
  const bounds=cmMenu.getBoundingClientRect();cmMenu.style.left=Math.max(8,Math.min(x,innerWidth-bounds.width-8))+'px';cmMenu.style.top=Math.max(8,Math.min(y,innerHeight-bounds.height-8))+'px';
}
function cmRender(rows,title,back=null){
  cmMenu.replaceChildren();cmMenu.setAttribute('aria-label',title+' actions');
  const heading=document.createElement('p');heading.className='cm-heading';heading.textContent=title;heading.setAttribute('role','presentation');cmMenu.append(heading);
  if(back)rows=[{label:'Back',action:back,back:true},...rows];
  for(const row of rows){
    const button=document.createElement('button');button.type='button';button.setAttribute('role','menuitem');button.tabIndex=-1;button.textContent=row.label;button.disabled=!!row.disabled;
    if(row.danger)button.classList.add('cm-danger');
    if(row.children){button.textContent+=' ›';button.setAttribute('aria-haspopup','menu');button.setAttribute('aria-expanded','false');}
    button.onclick=event=>{
      event.stopPropagation();const state=cmState;if(!state)return;
      if(cmStamp()!==state.stamp||state.card&&!state.card.isConnected){cmClose();const message='The selection or project changed. Open the actions again.';if(state.card)$('component-status').textContent=message;else projectMessage(message);return;}
      if(row.children){state.back=()=>{state.back=null;cmRender(rows,title,back);[...cmMenu.querySelectorAll('button')].find(button=>button.textContent===row.label+' ›')?.focus();};cmRender(row.children,row.label,state.back);cmPosition(state.x,state.y);return;}
      if(row.back){row.action();return;}
      cmClose(false);
      try{Promise.resolve(row.action?.()).catch(error=>projectMessage(error.message));}catch(error){projectMessage(error.message);}
      queueMicrotask(()=>{if(document.activeElement===document.body||document.activeElement===cmMenu){const focus=state.origin?.isConnected&&state.origin.checkVisibility()?state.origin:state.card?$('component-search'):$('cm-selection');focus?.focus({preventScroll:true});}});
    };
    cmMenu.append(button);
  }
  if(!cmState.card&&icSelection().locked){const note=document.createElement('p');note.className='cm-note';note.textContent='Locked or read-only. Unlock permitted items in Layers before editing.';cmMenu.append(note);}
  (cmMenu.querySelector('button:not(:disabled)')||cmMenu).focus({preventScroll:true});
}
function cmOpen({card=null,node=null,origin=null,x=null,y=null}={}){
  if(!cmReady||!weEditing()||projectPlayback||boothActive||editingGestureBusy()||!$('full-editor').open)return;
  cmClose(false);const target=node?cmTarget(node):null;
  // Commit the old field against its old target before changing selection.
  const active=document.activeElement;
  if(!card&&active?.matches('input,textarea,select,[contenteditable="true"]'))active.blur();
  const cellTarget=card?false:cmSelect(target,node||$('cm-selection'));
  const host=card?$('component-add'):$('full-editor');host.append(cmMenu);
  const entry=target?.key&&spEntries().find(item=>item.key===target.key),live=entry&&spElement(projectPreviewNode.querySelector('.slide'),entry);
  const anchor=origin?.isConnected?origin:card?.querySelector('.cm-trigger')||live||$('cm-selection'),rect=anchor.getBoundingClientRect();
  cmState={card,origin:anchor,trigger:card?.querySelector('.cm-trigger')||$('cm-selection'),stamp:cmStamp(),x:x??rect.left,y:y??rect.bottom+4,back:null};
  cmState.trigger.setAttribute('aria-expanded','true');card?.classList.add('cm-target');
  const title=card?card.querySelector('h3')?.textContent||'Library item':icSelection().title;
  cmRender(card?cmCatalog(card):cmPlaced(cellTarget),title);
  cmMenu.showPopover();cmPosition(cmState.x,cmState.y);(cmMenu.querySelector('button:not(:disabled)')||cmMenu).focus({preventScroll:true});
}
function cmCards(){
  if(!cmReady)return;
  for(const card of $('component-items').querySelectorAll('article')){
    if(card.querySelector(':scope > .cm-trigger'))continue;
    const title=card.querySelector('h3')?.textContent||'Library item';card.tabIndex=0;card.setAttribute('aria-label',title+' Library item');card.setAttribute('aria-keyshortcuts','Shift+F10');
    const trigger=componentButton('⋯',()=>cmOpen({card,origin:trigger}));trigger.className='cm-trigger';trigger.setAttribute('aria-label','Actions for '+title);trigger.setAttribute('aria-haspopup','menu');trigger.setAttribute('aria-expanded','false');card.prepend(trigger);
    const options=card.querySelector('details');if(options){options.hidden=true;const summary=options.querySelector('summary');summary.textContent='Rename saved component';summary.setAttribute('aria-label','Rename '+title);for(const button of options.querySelectorAll('button'))if(button.textContent!=='Rename')button.hidden=true;}
  }
}
const cmPreviousList=componentList;
componentList=function(...args){cmClose(false);const result=cmPreviousList(...args);cmCards();return result;};
const cmPreviousInit=projectInit;
projectInit=function(...args){
  const result=cmPreviousInit(...args);if(cmReady)return result;
  cmMenu=document.createElement('div');cmMenu.id='cm-menu';cmMenu.tabIndex=-1;cmMenu.setAttribute('popover','manual');cmMenu.setAttribute('role','menu');$('full-editor').append(cmMenu);
  const trigger=componentButton('⋯',()=>cmOpen({origin:trigger}));trigger.id='cm-selection';trigger.setAttribute('aria-label','Actions for selected item');trigger.setAttribute('aria-haspopup','menu');trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-keyshortcuts','Shift+F10');$('wp-selection-header').querySelector('.wp-selection-actions').append(trigger);
  // Existing pointer selection handlers must not collapse a multiselection
  // before the later contextmenu event can resolve its intended target.
  window.addEventListener('pointerdown',event=>{
    if(event.button===2&&!cmNative(event.target)&&projectPreviewNode?.contains(event.target)){event.preventDefault();event.stopImmediatePropagation();}
  },true);
  document.addEventListener('contextmenu',event=>{
    if(cmState&&(cmMenu.contains(event.target)||event.target===cmState.origin)){event.preventDefault();event.stopPropagation();return;}
    if(cmNative(event.target))return;const card=event.target.closest('#component-items article');
    if(!card&&!projectPreviewNode?.contains(event.target))return;
    event.preventDefault();event.stopPropagation();cmOpen({card,node:event.target,x:event.clientX,y:event.clientY});
  },true);
  document.addEventListener('keydown',event=>{
    if(cmState&&cmMenu.contains(event.target)){
      if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();cmClose();return;}
      if(event.key==='Tab'){cmClose();return;}
      if(event.key==='ArrowLeft'&&cmState.back){event.preventDefault();cmState.back();return;}
      if(event.key==='ArrowRight'&&event.target.getAttribute('aria-haspopup')==='menu'){event.preventDefault();event.target.click();return;}
      if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){
        event.preventDefault();event.stopPropagation();const buttons=[...cmMenu.querySelectorAll('button:not(:disabled)')],index=buttons.indexOf(document.activeElement);
        const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length;buttons[next]?.focus();return;
      }
    }
    if((event.key==='ContextMenu'||event.key==='F10'&&event.shiftKey)&&!cmNative(event.target)){
      const card=event.target.closest('#component-items article');if(!card&&!event.target.closest('#we-inspector')&&!projectPreviewNode?.contains(event.target))return;
      event.preventDefault();event.stopImmediatePropagation();cmOpen({card,node:card?null:event.target,origin:event.target});
    }
  },true);
  document.addEventListener('pointerdown',event=>{if(cmState&&!cmMenu.contains(event.target))cmClose(false);},true);
  window.addEventListener('resize',()=>{if(cmState)cmPosition(cmState.x,cmState.y);});
  for(const id of ['full-editor','component-add'])$(id).addEventListener('close',()=>cmClose(false));
  cmReady=true;cmCards();return result;
};
