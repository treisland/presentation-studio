const componentTypes = new Map();
const componentStorageKey = 'presentation-studio-components-v1';
let componentLibrary = [], componentTrash = [], componentReady = false;
const componentPreviousKeys=spActiveKeys;
spActiveKeys=function(){
  const keys=componentPreviousKeys(),entries=spEntries(),groups=entries.filter(entry=>keys.includes(entry.key)).map(entry=>entry.meta.group).filter(Boolean);
  return [...new Set([...keys,...entries.filter(entry=>groups.includes(entry.meta.group)).map(entry=>entry.key)])];
};
function componentRegister(type, definition) {
  if (componentTypes.has(type)) throw Error('Duplicate block type: ' + type);
  componentTypes.set(type, Object.freeze(definition));
}
for (const type of dbKinds.filter(kind=>kind!=='callout')) componentRegister(type, {name:type[0].toUpperCase()+type.slice(1), category:type==='text'?'Text':'Shapes', description:'Editable '+type+' block'});
for (const type of ['quote','metric','callout']) componentRegister(type, paWidgetCatalog[type]);
editingRegisterOperation('block.create', (state, operation, created) => {
  const definition = componentTypes.get(operation.kind);
  if (!definition) editingFail('INVALID','Choose a supported block.');
  dbOperation(state, {...operation,kind:definition.fields?'callout':operation.kind}, created);
  if (definition.fields) {
    const node = editingSlide(state,operation.slideId).tree.find(item=>dbID(item)===created.at(-1));
    node.attrs.class += ' component-widget component-'+operation.kind;
    node.children = definition.fields.map(([label,value],index)=>projectNode(index===0&&operation.kind!=='callout'?'h3':'p','component-field', [value]));
  }
});
function componentTargets(state, slide, keys, expand = true) {
  if (!Array.isArray(keys)||!keys.length||keys.length>100||new Set(keys).size!==keys.length) editingFail('INVALID','Select distinct objects.');
  let targets = spResolve(state,slide,keys);
  if (expand) {
    const groups = targets.map(entry=>entry.meta.group).filter(Boolean);
    targets = spEntries(slide,state).filter(entry=>targets.some(target=>target.key===entry.key)||groups.includes(entry.meta.group));
  }
  if (targets.some(spProtected)) editingFail('LOCKED','Unlock every selected object first.');
  return targets;
}
function componentRect(entry) {
  if (entry.kind==='block') return dbRect(entry.node);
  if (entry.kind==='media'&&entry.media.canvas?.placement) return entry.media.canvas.placement;
  editingFail('INVALID','Arrange free blocks or floating media. Move other content into a free block first.');
}
function componentPlace(entry, rectangle) {
  if (entry.kind==='block') dbPlace(entry.node,rectangle);
  else {
    if (![rectangle.x,rectangle.y,rectangle.w,rectangle.h].every(Number.isFinite)||rectangle.x<0||rectangle.y<0||rectangle.w<.05||rectangle.h<.05||rectangle.x+rectangle.w>1.000001||rectangle.y+rectangle.h>1.000001) editingFail('INVALID','The group must fit inside the slide.');
    entry.media.canvas = {...ceObject(entry.media.canvas),placement:{x:rectangle.x,y:rectangle.y,w:rectangle.w,h:rectangle.h}};
  }
}
function componentMoveMember(state, slide, entry, placement) {
  const targets=componentTargets(state,slide,[entry.key]),before=componentRect(entry),scaleX=placement.w/before.w,scaleY=placement.h/before.h;
  for(const target of targets){const rect=componentRect(target);componentPlace(target,{x:placement.x+(rect.x-before.x)*scaleX,y:placement.y+(rect.y-before.y)*scaleY,w:rect.w*scaleX,h:rect.h*scaleY});}
}
editingRegisterOperation('block.place',(state,operation,created)=>{
  const slide=editingSlide(state,operation.slideId),entry=spEntries(slide,state).find(item=>item.key===operation.blockId);
  if(entry?.meta.group){componentMoveMember(state,slide,entry,operation.placement);if(operation.layer!=null)dbPlace(entry.node,dbRect(entry.node),operation.layer);}
  else dbOperation(state,operation,created);
});
editingRegisterOperation('media.place',(state,operation)=>{
  const slide=editingSlide(state,operation.slideId),entry=spEntries(slide,state).find(item=>item.object===(operation.objectId||'primary'));
  if(entry?.meta.group)componentMoveMember(state,slide,entry,operation.placement);
  else editingPlace(state,slide.id,operation.objectId||'primary',operation.placement);
});
editingRegisterOperation('component.group', (state, operation) => {
  const slide = editingSlide(state,operation.slideId), targets = componentTargets(state,slide,operation.keys,false);
  if (targets.length<2||targets.some(entry=>entry.meta.group)) editingFail('INVALID','Select at least two ungrouped free blocks or floating media. Nested groups are not supported.');
  targets.forEach(componentRect);
  const group = projectID('group'), data = spData(state,slide.id,true);
  for (const entry of targets) (data.objects[entry.key]??={}).group = group;
});
editingRegisterOperation('component.ungroup', (state, operation) => {
  const slide = editingSlide(state,operation.slideId), targets = componentTargets(state,slide,operation.keys), data = spData(state,slide.id,true);
  for (const entry of targets) if (data.objects[entry.key]) delete data.objects[entry.key].group;
});
editingRegisterOperation('component.arrange', (state, operation) => {
  const slide = editingSlide(state,operation.slideId), targets = componentTargets(state,slide,operation.keys), rectangles = targets.map(componentRect);
  if (operation.action==='move'||operation.action==='resize') {
    const left=Math.min(...rectangles.map(rect=>rect.x)),top=Math.min(...rectangles.map(rect=>rect.y));
    const scale=operation.action==='resize'?Number(operation.scale):1,dx=Number(operation.dx||0),dy=Number(operation.dy||0);
    if (!Number.isFinite(scale)||scale<=0||!Number.isFinite(dx)||!Number.isFinite(dy)) editingFail('INVALID','Invalid group transform.');
    targets.forEach((entry,index)=>{const rect=rectangles[index];componentPlace(entry,{x:left+(rect.x-left)*scale+dx,y:top+(rect.y-top)*scale+dy,w:rect.w*scale,h:rect.h*scale});});
    return;
  }
  if (operation.action==='distribute-x'||operation.action==='distribute-y') {
    const units=componentUnits(targets),axis=operation.action==='distribute-x'?'x':'y',size=axis==='x'?'w':'h',ordered=units.sort((first,second)=>first.rect[axis]-second.rect[axis]);
    if (units.length<3) editingFail('INVALID','Select at least three independent objects or groups to distribute.');
    const start=ordered[0].rect[axis],end=ordered.at(-1).rect[axis]+ordered.at(-1).rect[size],gap=(end-start-ordered.reduce((total,item)=>total+item.rect[size],0))/(ordered.length-1);
    let cursor=start;for (const unit of ordered) {for(const entry of unit.entries){const rect=componentRect(entry);componentPlace(entry,{...rect,[axis]:rect[axis]+cursor-unit.rect[axis]});}cursor+=unit.rect[size]+gap;}
    return;
  }
  if (!['left','center','right','top','middle','bottom'].includes(operation.action)) editingFail('INVALID','Choose object alignment.');
  for(const unit of componentUnits(targets)){
    const rect={...unit.rect};if(operation.action==='left')rect.x=0;if(operation.action==='center')rect.x=(1-rect.w)/2;if(operation.action==='right')rect.x=1-rect.w;if(operation.action==='top')rect.y=0;if(operation.action==='middle')rect.y=(1-rect.h)/2;if(operation.action==='bottom')rect.y=1-rect.h;
    for(const entry of unit.entries){const original=componentRect(entry);componentPlace(entry,{...original,x:original.x+rect.x-unit.rect.x,y:original.y+rect.y-unit.rect.y});}
  }
});
function componentUnits(targets){
  const units=new Map();for(const entry of targets){const key=entry.meta.group||entry.key;if(!units.has(key))units.set(key,[]);units.get(key).push(entry);}
  return [...units.values()].map(entries=>{const rectangles=entries.map(componentRect),x=Math.min(...rectangles.map(rect=>rect.x)),y=Math.min(...rectangles.map(rect=>rect.y));return{entries,rect:{x,y,w:Math.max(...rectangles.map(rect=>rect.x+rect.w))-x,h:Math.max(...rectangles.map(rect=>rect.y+rect.h))-y}};});
}
editingRegisterOperation('component.remove', (state, operation, created) => {
  const slide=editingSlide(state,operation.slideId),targets=componentTargets(state,slide,operation.keys);
  dbOperation(state,{type:'design.remove',slideId:slide.id,keys:targets.map(entry=>entry.key)},created);
});
editingRegisterOperation('component.reorder',(state,operation)=>{
  const slide=editingSlide(state,operation.slideId),targets=componentTargets(state,slide,operation.keys),all=spEntries(slide,state).sort(spStackOrder),keys=targets.map(entry=>entry.key);
  if(!['forward','backward'].includes(operation.direction))editingFail('INVALID','Choose a stacking direction.');
  if(all.some(spProtected))editingFail('LOCKED','Unlock layers before changing stacking order.');
  const selected=all.filter(entry=>keys.includes(entry.key)),rest=all.filter(entry=>!keys.includes(entry.key)),first=all.findIndex(entry=>keys.includes(entry.key)),last=all.findLastIndex(entry=>keys.includes(entry.key));
  let index=operation.direction==='forward'?rest.filter(entry=>all.indexOf(entry)<=last+1).length:Math.max(0,rest.filter(entry=>all.indexOf(entry)<first).length-1);
  if(rest[index]?.media?.layout==='background'&&!rest[index].media.canvas?.placement)index++;
  rest.splice(index,0,...selected);const data=spData(state,slide.id,true);
  for(const [order,entry]of rest.entries()){if(entry.media?.layout==='background'&&!entry.media.canvas?.placement)continue;const target=spResolve(state,slide,[entry.key])[0];(data.objects[target.key]??={}).z=order+1;if(entry.kind==='block')dbPlace(entry.node,dbRect(entry.node),order+1);if(entry.media)entry.media.canvas={...ceObject(entry.media.canvas),z:order+1};}
});
editingRegisterOperation('component.duplicate', (state, operation, created) => {
  const slide=editingSlide(state,operation.slideId),targets=componentTargets(state,slide,operation.keys),groups=new Map(),data=spData(state,slide.id,true);
  for (const entry of targets) {
    let key;
    if(entry.kind==='block') {dbOperation(state,{type:'block.duplicate',slideId:slide.id,blockId:entry.key},created);key=created.at(-1);}
    else if(entry.kind==='media'){
      state.mediaObjects??={};state.mediaObjects[slide.id]??=[];if(state.mediaObjects[slide.id].length>=30)editingFail('INVALID','At most 30 media objects per slide.');
      const object=projectID('object'),media=projectCopy(entry.media);if(media.canvas?.placement)media.canvas.placement=cePlacement({...media.canvas.placement,x:media.canvas.placement.x+.02,y:media.canvas.placement.y+.02});state.mediaObjects[slide.id].push({id:object,media});key='media-'+object;
    }else editingFail('INVALID','Select free blocks or floating media to duplicate.');
    const meta=projectCopy(entry.meta);if(meta.group){if(!groups.has(meta.group))groups.set(meta.group,projectID('group'));meta.group=groups.get(meta.group);}data.objects[key]=meta;
  }
});
for(const action of ['remove','duplicate'])editingRegisterOperation('block.'+action,(state,operation,created)=>{
  const slide=editingSlide(state,operation.slideId),entry=spEntries(slide,state).find(item=>item.key===operation.blockId);
  if(entry?.meta.group)editingOperations.get('component.'+action)(state,{...operation,keys:[operation.blockId]},created);
  else dbOperation(state,operation,created);
});
function componentRun(operation) {
  vbEnd(false);projectFlush();
  const snapshot=studioEditing.read(),result=studioEditing.apply({apiVersion:1,projectId:snapshot.projectId,expectedRevision:snapshot.revision,operations:[{slideId:projectSelected,...operation}]});
  if(!result.ok)projectMessage(result.message);
  if(result.ok&&result.created.length){dbSelected=result.created.at(-1);spSelected=result.created;dbPanel();}
  spPaint();componentPaint();return result;
}
function componentReadLibrary() {
  try {const value=JSON.parse(localStorage.getItem(componentStorageKey)||'{"items":[],"trash":[]}');componentLibrary=componentValidateLibrary(value.items);componentTrash=componentValidateLibrary(value.trash);}
  catch {componentLibrary=[];componentTrash=[];projectMessage('The component library could not be read. Import an exported library backup.');}
}
function componentValidateLibrary(items) {
  if(!Array.isArray(items)||items.length>40)throw Error('A library can contain at most 40 components.');
  return items.map(item=>{
    if(!item||typeof item.name!=='string'||!item.name.trim()||item.name.length>80||!Array.isArray(item.entries)||!item.entries.length||item.entries.length>60||!item.assets||typeof item.assets!=='object')throw Error('Invalid component library.');
    const copy={id:projectID('preset'),name:item.name,entries:projectCopy(item.entries),assets:{}};
    for(const [path,asset]of Object.entries(item.assets)){
      if(!mediaSafePath(path)||typeof asset!=='string'||asset.length>12000000||!/^data:(?:image\/(?:png|jpeg|webp|gif|svg\+xml)|video\/(?:mp4|webm));base64,[A-Za-z0-9+/=]+$/.test(asset))throw Error('Invalid component media.');
      copy.assets[path]=asset;
    }
    for(const entry of copy.entries){if(entry.node)entry.node=projectValidateTree([entry.node])[0];else if(!entry.media)throw Error('Invalid component object.');entry.meta={...entry.meta,style:spStyle(entry.meta?.style||{})};if(entry.meta.action)entry.meta.action=navAction(entry.meta.action);if(entry.meta.frame)entry.meta.frame=maskSettings(entry.meta.frame);}
    for(const entry of copy.entries)if(entry.media)entry.media=mediaValidate({schemaVersion:1,slides:{component:entry.media}}).slides.component;
    return copy;
  });
}
function componentStore(items, trash=componentTrash) {
  try {localStorage.setItem(componentStorageKey,JSON.stringify({items,trash}));componentLibrary=items;componentTrash=trash;return true;}
  catch {projectMessage('Component storage is full or unavailable. Export a library backup and free space.');return false;}
}
async function componentSave() {
  try {
    vbEnd(false);projectFlush();const snapshot=studioEditing.read(),slide=projectModel(),keys=spActiveKeys(),targets=componentTargets(projectState,slide,keys),name=$('component-name').value.trim();
    if(!name)throw Error('Give the component a name.');
    targets.forEach(componentRect);
    const item={id:projectID('preset'),name,entries:targets.map(entry=>({node:entry.node&&projectCopy(entry.node),media:entry.media&&projectCopy(entry.media),commands:entry.node&&projectFind({tree:[entry.node]},node=>mgHas(node,'terminal')).length?projectCopy(slide.commands):undefined,groupName:entry.meta.group?spData().groups?.[entry.meta.group]?.name:undefined,meta:projectCopy(entry.meta)})),assets:{}};
    for(const entry of targets)if(entry.media)for(const path of [entry.media.src,entry.media.poster].filter(Boolean)){
      const blob=mediaBlobs.get(path);if(!blob)throw Error('Missing component media: '+path);
      item.assets[path]=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);});
    }
    if(studioEditing.read().revision!==snapshot.revision)throw Error('The project changed. Select and save the component again.');
    const validated=componentValidateLibrary([...componentLibrary,item]);if(componentStore(validated)){$('component-status').textContent='Saved locally. Export your library for backup.';componentList();}
  }catch(error){projectMessage(error.message);}
}
function componentCanSave(){const keys=spActiveKeys(),entries=spEntries().filter(entry=>keys.includes(entry.key));return weEditing()&&!ceLocked()&&entries.length>0&&entries.every(entry=>!spProtected(entry)&&(entry.kind==='block'||entry.kind==='media'&&entry.media.canvas?.placement));}
editingRegisterOperation('component.insert', (state, operation, created) => {
  const slide=editingSlide(state,operation.slideId),item=componentValidateLibrary([operation.component])[0],data=spData(state,slide.id,true),groups=new Map();
  if(slide.tree.filter(dbID).length+item.entries.filter(entry=>entry.node).length>60)editingFail('INVALID','At most 60 free blocks per slide.');
  for(const entry of item.entries){
    let key;
    if(entry.node){
      if(entry.commands){if(slide.commands)editingFail('INVALID','This slide already has a code block. Insert the component on another slide.');slide.commands=commandNormalize(entry.commands);}
      const node=entry.node;key=projectID('block');node.attrs??={};node.attrs.class=(node.attrs.class||'').replace(/\b(?:block|layer)-[\w-]+\b/g,'').trim()+' '+key;
      if(!dbID(node)){node.attrs.class+=' db-block db-text';dbPlace(node,{x:.2,y:.2,w:.5,h:.3});}
      slide.tree.push(node);created.push(key);
    }else{
      const object=projectID('object');state.mediaObjects??={};state.mediaObjects[slide.id]??=[];
      if(state.mediaObjects[slide.id].length>=30)editingFail('INVALID','At most 30 media objects per slide.');
      state.mediaObjects[slide.id].push({id:object,media:entry.media});key='media-'+object;created.push(key);
    }
    if(entry.meta.group){if(!groups.has(entry.meta.group))groups.set(entry.meta.group,projectID('group'));entry.meta.group=groups.get(entry.meta.group);if(entry.groupName){if(typeof entry.groupName!=='string'||entry.groupName.length>80)editingFail('INVALID','Invalid preset group name.');data.groups??={};data.groups[entry.meta.group]??={autoName:enCounter(state,slide,'Group'),name:entry.groupName};}}
    data.objects[key]=entry.meta;
  }
});
async function componentInsert(item) {
  try {
    vbEnd(false);projectFlush();const snapshot=studioEditing.read(),copy=componentValidateLibrary([item])[0],resources=[];
    for(const [path,url]of Object.entries(copy.assets)){
      const split=url.indexOf(','),bytes=Uint8Array.from(atob(url.slice(split+1)),character=>character.charCodeAt(0)),blob=new Blob([bytes],{type:url.slice(5,url.indexOf(';'))}),fresh='assets/'+projectID('component')+'-'+mediaFilename(path.split('/').at(-1));
      resources.push({path:fresh,blob});for(const entry of copy.entries)if(entry.media){if(entry.media.src===path)entry.media.src=fresh;if(entry.media.poster===path)entry.media.poster=fresh;}
    }
    for(const entry of copy.entries)if(entry.media)for(const path of [entry.media.src,entry.media.poster].filter(Boolean))if(!resources.some(resource=>resource.path===path))throw Error('Missing component media.');
    const result=studioEditing.apply({apiVersion:1,projectId:snapshot.projectId,expectedRevision:snapshot.revision,operations:[{type:'component.insert',slideId:projectSelected,component:copy}]});
    if(!result.ok)throw Error(result.message);
    for(const resource of resources)mediaRemember(resource.path,resource.blob);
    projectRender(true);if(result.created.length){const key=result.created[0];if(key.startsWith('media-'))ceSelect(key.slice(6));else{dbSelected=key;dbPanel();}spSelected=result.created;spPaint();}componentPaint();$('component-add').close();
  }catch(error){projectMessage(error.message);}
}
function componentButton(label, action) {const button=document.createElement('button');button.type='button';button.textContent=label;button.onclick=()=>{try{Promise.resolve(action()).catch(error=>projectMessage(error.message));}catch(error){projectMessage(error.message);}};return button;}
function componentList() {
  const list=$('component-items');if(!list)return;list.replaceChildren();list.classList.remove('data-library-results');
  const search=$('component-search').value.toLowerCase(),category=$('component-category').value;
  if(category!=='Library')for(const [type,definition]of componentTypes){
    if(category==='All'&&definition.category==='Widgets')continue;
    if(category!=='All'&&category!==definition.category||!(definition.name+' '+definition.description).toLowerCase().includes(search))continue;
    const card=document.createElement('article'),title=document.createElement('h3'),description=document.createElement('p'),preview=document.createElement('div');title.textContent=definition.name;description.textContent=definition.description;preview.className='component-card-preview component-preview-'+type;preview.setAttribute('aria-hidden','true');
    if(definition.fields)for(const [label,value]of definition.fields){const line=document.createElement('span');line.textContent=value;preview.append(line);}else{const shape=document.createElement('span');shape.textContent=type==='text'?'Aa':'';preview.append(shape);}
    card.append(preview,title,description,componentButton('Insert '+definition.name,()=>{const result=componentRun({type:'block.create',kind:type});if(result.ok){$('component-add').close();weInspect('text');}}));list.append(card);
  }
  if((category==='All'||category==='Media')&&'image video media upload'.includes(search)){const card=document.createElement('article'),preview=document.createElement('div'),title=document.createElement('h3'),description=document.createElement('p');preview.className='component-card-preview component-preview-media';preview.textContent='▧';preview.setAttribute('aria-hidden','true');title.textContent='Image / Video';description.textContent='Upload media from your device';card.append(preview,title,description,componentButton('Insert image or video…',()=>{$('component-add').close();$('db-add-media').click();}));list.append(card);}
  if(category==='Library')for(const item of componentLibrary){
    if(!item.name.toLowerCase().includes(search))continue;
    const card=document.createElement('article'),name=document.createElement('input'),preview=document.createElement('p');name.value=item.name;name.maxLength=80;name.setAttribute('aria-label','Component name');preview.textContent=item.entries.map(entry=>entry.node?projectText(entry.node):entry.media.name||'Media').join(' · ').slice(0,180);
    const heading=document.createElement('h3'),menu=document.createElement('details'),summary=document.createElement('summary');heading.textContent=item.name;summary.textContent='Options';summary.setAttribute('aria-label','Manage '+item.name);menu.append(summary,name,componentButton('Rename',()=>{const value=name.value.trim();if(!value)return;componentStore(componentLibrary.map(entry=>entry.id===item.id?{...entry,name:value}:entry));componentList();}),componentButton('Duplicate preset',()=>{componentStore(componentValidateLibrary([...componentLibrary,{...item,name:(item.name.slice(0,75)+' copy')}]));componentList();}),componentButton('Delete preset',()=>{componentStore(componentLibrary.filter(entry=>entry.id!==item.id),[...componentTrash.slice(-9),item]);componentList();}));preview.className='component-card-preview';card.append(preview,heading,componentButton('Insert '+item.name,()=>componentInsert(item)),menu);list.append(card);
  }
  if(!list.childNodes.length){const empty=document.createElement('p');empty.className='component-empty';empty.textContent=category==='Library'&&!search?'Your reusable designs live here. Select a free block or group on a slide, then choose Save as component from More.':'No results. Try another search or tab.';list.append(empty);}
  const active=category==='Library'?'Library':category==='Widgets'?'Widgets':'All';for(const tab of document.querySelectorAll('#component-tabs [role=tab]')){const selected=tab.dataset.category===active;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;}
}
function componentPaint() {
  if(!componentReady||!projectReady)return;
  const entries=spEntries(),keys=spActiveKeys(),selected=entries.filter(entry=>keys.includes(entry.key)),locked=!weEditing()||vbMode!=='edit'||ceLocked()||selected.some(spProtected),toolbar=$('component-toolbar');
  toolbar.querySelectorAll('[data-selection-action]').forEach(control=>control.disabled=locked||!selected.length);
  $('component-open').disabled=!weEditing()||ceLocked();
  if($('component-save-action'))$('component-save-action').hidden=!componentCanSave();
  $('component-group').disabled=locked||selected.length<2||selected.some(entry=>entry.meta.group);
  $('component-ungroup').disabled=locked||!selected.some(entry=>entry.meta.group);
  $('component-selection').textContent=selected.length?selected.length+' selected'+(selected.some(entry=>entry.meta.group)?' · grouped':''):'Select a block to format or arrange';
  if($('component-more-trigger')){
    const text=vbSelected?.kind==='text'&&!!vbNode(),media=wpKind==='media',multiple=selected.length>1;
    $('component-text-trigger').hidden=!text;
    $('component-media-trigger').hidden=!media;
    $('component-arrange-trigger').hidden=!selected.length;
    $('component-colors-trigger').hidden=!selected.length;
    $('component-colors-trigger').textContent=text?'Text color':'Appearance';
    $('component-group').hidden=!multiple;
    $('component-ungroup').hidden=!selected.some(entry=>entry.meta.group);
  }
  for(const slot of ['text','fill','border']){
    const values=selected.map(entry=>JSON.stringify(entry.meta.style?.[slot]??null)),mixed=new Set(values).size>1,label=$('component-'+slot+'-value'),color=selected[0]?.meta.style?.[slot];label.textContent=mixed?'Mixed':selected.length?(color?.role?'Theme: '+color.role:color?.hex||'Inherited'):'No selection';
    const input=$('component-'+slot);if(!mixed&&document.activeElement!==input)input.value=color?.hex||studioPalette(projectState.brand)[color?.role||({text:'ink',fill:'surface',border:'border'}[slot])]||'#000000';
  }
  const widths=selected.map(entry=>entry.meta.style?.borderWidth??0),widthInput=$('component-border-width');if(document.activeElement!==widthInput)widthInput.value=new Set(widths).size>1?'':widths[0]??0;
  const widget=dbNode(),definition=widget&&[...componentTypes].find(([type])=>mgHas(widget,'component-'+type))?.[1],fields=$('component-widget-fields');
  if(definition?.fields&&wpKind==='block')$('wp-selection-title').textContent=definition.name;
  const identity=projectMeta.id+':'+projectSelected+':'+dbSelected;if(fields.dataset.identity!==identity||!fields.contains(document.activeElement)){
    fields.replaceChildren();fields.dataset.identity=identity;
    if(definition?.fields){const blockId=dbSelected,slideId=projectSelected;definition.fields.forEach(([label],index)=>{const field=document.createElement('label'),input=document.createElement('textarea');field.textContent=label;input.value=projectText(widget.children[index]);input.disabled=locked;input.onchange=()=>componentRun({type:'component.field',slideId,blockId,index,text:input.value});field.append(input);fields.append(field);});}
  }
  const canvas=projectPreviewNode?.querySelector('.slide');if(canvas){const overflow=[...canvas.querySelectorAll('.db-block')].some(element=>{
    if(!element.querySelector('.db-handle,.an-endpoint'))return element.scrollHeight>element.clientHeight+2||element.scrollWidth>element.clientWidth+2;
    const measured=element.cloneNode(true);measured.querySelectorAll('.db-handle,.an-endpoint').forEach(handle=>handle.remove());measured.style.visibility='hidden';measured.style.pointerEvents='none';element.after(measured);
    const exceeds=measured.scrollHeight>measured.clientHeight+2||measured.scrollWidth>measured.clientWidth+2;measured.remove();return exceeds;
  });$('component-overflow').textContent=overflow?'Some block content does not fit. Resize the block or shorten its text.':'';}
}
editingRegisterOperation('component.field',(state,operation)=>{
  const slide=editingSlide(state,operation.slideId),entry=componentTargets(state,slide,[operation.blockId],false)[0];
  if(!Number.isInteger(operation.index)||typeof operation.text!=='string'||operation.text.length>10000||!mgHas(entry.node,'component-widget')||!entry.node.children[operation.index])editingFail('INVALID','Choose an editable widget field.');
  entry.node.children[operation.index].children=[{text:operation.text}];
});
const componentPreviousPaint=spPaint;
spPaint=function(...args){const result=componentPreviousPaint(...args);componentPaint();return result;};
const componentPreviousInit=projectInit;
projectInit=function(){
  componentPreviousInit();
  const toolbar=document.createElement('section');toolbar.id='component-toolbar';toolbar.setAttribute('aria-label','Block formatting and arrangement');
  toolbar.innerHTML='<div id="component-selection" role="status"></div><div class="component-tools"><button id="component-open">Add / Library</button><button id="component-group" data-selection-action>Group</button><button id="component-ungroup" data-selection-action>Ungroup</button><button id="component-duplicate" data-selection-action>Duplicate</button><button id="component-delete" data-selection-action>Delete</button><button id="component-lock" data-selection-action>Lock</button><button id="component-forward" data-selection-action>Bring forward</button><button id="component-backward" data-selection-action>Send backward</button><label>Object alignment<select id="component-align" data-selection-action><option value="">Choose alignment</option><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option><option value="top">Top</option><option value="middle">Middle</option><option value="bottom">Bottom</option><option value="distribute-x">Distribute horizontally</option><option value="distribute-y">Distribute vertically</option></select></label><button id="component-smaller" data-selection-action>Scale group down</button><button id="component-larger" data-selection-action>Scale group up</button></div><div class="component-tools" id="component-colors"></div><p id="component-overflow" role="status"></p>';
  $('we-center').prepend(toolbar);
  for(const id of ['we-panel-tools','we-view-tools']){$(id).style.flexWrap='nowrap';$(id).style.flex='none';toolbar.prepend($(id));}
  for(const id of ['we-panel-sizes','db-palette'])$(id).addEventListener('toggle',()=>{
    const details=$(id);if(!details.open)return;const rect=details.querySelector('summary').getBoundingClientRect(),panel=details.querySelector(':scope > div');
    Object.assign(panel.style,{position:'fixed',top:rect.bottom+'px',left:Math.max(10,Math.min(rect.left,innerWidth-290))+'px',right:'auto',width:'260px',zIndex:'100',background:'var(--editor-surface,white)',padding:'12px',border:'1px solid #999'});
  });
  for(const slot of ['text','fill','border']){
    const label=document.createElement('label'),input=document.createElement('input'),value=document.createElement('span'),inherit=componentButton('Theme '+slot,()=>componentRun({type:'design.appearance',keys:spActiveKeys(),style:{[slot]:null}}));label.textContent=slot[0].toUpperCase()+slot.slice(1)+' color';input.type='color';input.id='component-'+slot;input.dataset.selectionAction='';input.onchange=()=>componentRun({type:'design.appearance',keys:spActiveKeys(),style:{[slot]:{hex:input.value}}});value.id=input.id+'-value';label.append(input,value);inherit.dataset.selectionAction='';$('component-colors').append(label,inherit);
  }
  const width=document.createElement('label');width.textContent='Border width';const widthInput=document.createElement('input');widthInput.type='number';widthInput.min=0;widthInput.max=24;widthInput.id='component-border-width';widthInput.dataset.selectionAction='';widthInput.onchange=()=>componentRun({type:'design.appearance',keys:spActiveKeys(),style:{borderWidth:Number(widthInput.value)}});width.append(widthInput);$('component-colors').append(width);
  const opacityLabel=document.createElement('label');opacityLabel.textContent='Color opacity %';const opacity=document.createElement('input');opacity.type='number';opacity.min=0;opacity.max=100;opacity.value=100;opacity.id='component-opacity';opacityLabel.append(opacity);$('component-colors').append(opacityLabel);
  for(const slot of ['text','fill','border'])$('component-'+slot).onchange=()=>componentRun({type:'design.appearance',keys:spActiveKeys(),style:{[slot]:{hex:$('component-'+slot).value,opacity:Number(opacity.value)/100}}});
  const textTools=document.createElement('div');textTools.id='component-text-tools';textTools.className='component-tools';toolbar.append(textTools);
  for(const id of ['tt-control','we-font-controls'])if($(id)){delete $(id).dataset.wpPart;textTools.append($(id));}
  for(const id of ['vb-bold','vb-italic','vb-align','vb-done']){const control=$(id);if(control){const label=control.closest('label');textTools.append(label&&label.parentElement?.id==='vb-toolbar'?label:control);}}
  const mediaTools=document.createElement('div');mediaTools.className='component-tools';mediaTools.append(componentButton('Replace media…',()=>$('ce-replace').click()),componentButton('Media fit / crop',()=>{wePanels.inspector.open=true;wePanelView();weInspect('media');$('ce-fit').focus();}));toolbar.append(mediaTools);
  const fields=document.createElement('section');fields.id='component-widget-fields';fields.dataset.wpPart='content';$('wp-fields').prepend(fields);
  const dialog=document.createElement('dialog');dialog.id='component-add';dialog.innerHTML='<h2>Add blocks and components</h2><p>My components are saved in this browser profile. Export your library for backup or transfer. Inserted copies are independent.</p><label>Search<input id="component-search" type="search"></label><label>Category<select id="component-category"><option>All</option><option>Text</option><option>Shapes</option><option>Media</option><option>Widgets</option><option>Library</option></select></label><div id="component-items"></div><label>Save selected objects as<input id="component-name" maxlength="80" placeholder="Component name"></label><button id="component-save">Save selection to library</button><button id="component-export">Export library</button><label>Import library<input id="component-import" type="file" accept=".json,application/json"></label><button id="component-restore">Restore last deleted preset</button><button id="component-tour">Quick walkthrough</button><p id="component-status" role="status"></p><button id="component-close">Close</button>';
  document.body.append(dialog);$('component-open').onclick=()=>{componentList();dialog.showModal();$('component-search').focus();};$('component-close').onclick=()=>{dialog.close();$('component-open').focus();};dialog.addEventListener('close',()=>$('component-open').focus());
  componentLibraryLayout(dialog);
  $('component-search').oninput=componentList;$('component-category').onchange=componentList;$('component-save').onclick=componentSave;
  $('component-tour').onclick=()=>{$('component-status').textContent='1. Insert a block or widget. 2. Select objects in Layers (checkboxes select several). 3. Format above the canvas; Enter edits text and Escape finishes. 4. Group free blocks and floating images, name the selection and Save. 5. Export your library, then insert independent copies from Library.';};
  $('component-export').onclick=()=>{const link=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify({kind:'presentation-studio-components',version:1,items:componentLibrary},null,2)],{type:'application/json'}));link.href=url;link.download='presentation-studio-components.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  $('component-import').onchange=async event=>{try{const file=event.target.files[0];if(!file)return;if(file.size>16000000)throw Error('Library exceeds 16 MB.');const value=JSON.parse(await file.text());if(value.kind!=='presentation-studio-components'||value.version!==1)throw Error('Unsupported component library.');const items=componentValidateLibrary(value.items);if(componentStore(componentValidateLibrary([...componentLibrary,...items])))componentList();}catch(error){projectMessage(error.message);}finally{event.target.value='';}};
  $('component-restore').onclick=()=>{const item=componentTrash.at(-1);if(item&&componentStore(componentValidateLibrary([...componentLibrary,item]),componentTrash.slice(0,-1)))componentList();};
  for(const [id,action]of [['group','component.group'],['ungroup','component.ungroup'],['duplicate','component.duplicate'],['delete','component.remove']])$('component-'+id).onclick=()=>componentRun({type:action,keys:spActiveKeys()});
  $('component-lock').onclick=()=>componentRun({type:'design.meta',keys:spActiveKeys(),changes:{locked:true}});
  for(const direction of ['forward','backward'])$('component-'+direction).onclick=()=>componentRun({type:'component.reorder',keys:spActiveKeys(),direction});
  $('component-align').onchange=event=>{if(event.target.value)componentRun({type:'component.arrange',keys:spActiveKeys(),action:event.target.value});event.target.value='';};
  $('component-smaller').onclick=()=>componentRun({type:'component.arrange',keys:spActiveKeys(),action:'resize',scale:.9});$('component-larger').onclick=()=>componentRun({type:'component.arrange',keys:spActiveKeys(),action:'resize',scale:1.1});
  toolbar.addEventListener('mousedown',event=>{if(event.target.closest('button'))event.preventDefault();});
  toolbar.addEventListener('keydown',event=>{if(event.key==='Escape'&&!event.defaultPrevented){vbEnd(true);$('we-viewport').focus();}});
  componentOrganizeToolbar(toolbar,textTools,mediaTools);
  $('fe-preview').addEventListener('keydown',event=>{
    if(event.key!=='Enter'||!event.target.matches('.db-block')||!weEditing()||ceLocked())return;
    const text=event.target.querySelector('[data-vb-kind="text"]');if(!text)return;
    event.preventDefault();vbStart({el:text,path:text.dataset.vbPath,kind:'text',slideID:projectSelected});
  });
  componentReady=true;componentReadLibrary();componentPaint();
};
function componentLibraryLayout(dialog){
  const heading=dialog.querySelector('h2'),intro=dialog.querySelector('p'),header=document.createElement('header'),tabs=document.createElement('div'),search=document.createElement('div'),footer=document.createElement('footer'),manage=document.createElement('details'),summary=document.createElement('summary');
  dialog.setAttribute('aria-labelledby','component-library-title');heading.id='component-library-title';heading.textContent='Add to slide';intro.textContent='Choose a block, widget or reusable component.';header.className='component-library-header';header.append(heading,$('component-close'),intro);dialog.prepend(header);
  tabs.id='component-tabs';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Library category');
  const category=$('component-category');category.hidden=true;category.querySelector('[value="All"]')?.setAttribute('label','Blocks');
  for(const [name,value]of [['Blocks','All'],['Widgets','Widgets'],['My components','Library']]){const tab=componentButton(name,()=>{category.value=value;componentList();});tab.dataset.category=value;tab.setAttribute('role','tab');tab.setAttribute('aria-controls','component-items');tabs.append(tab);}
  tabs.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const buttons=[...tabs.children],index=buttons.indexOf(document.activeElement),next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(event.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;buttons[next].click();buttons[next].focus();});
  search.className='component-library-search';const input=$('component-search');input.placeholder='Search blocks and components';input.setAttribute('aria-label','Search blocks and components');search.append(input,componentButton('Clear search',()=>{input.value='';componentList();input.focus();}));header.after(tabs,search);
  $('component-items').setAttribute('role','tabpanel');
  const save=document.createElement('details'),saveSummary=document.createElement('summary');save.id='component-save-panel';saveSummary.textContent='Save selection as component';save.append(saveSummary,$('component-name').closest('label'),$('component-save'));dialog.append(save);
  summary.textContent='Manage library';manage.id='component-manage';manage.append(summary,$('component-export'),$('component-import').closest('label'),$('component-restore'),$('component-tour'));footer.append(manage);const notice=document.createElement('p');notice.textContent='Saved in this browser profile. Export a library backup for transfer or recovery.';footer.append(notice,$('component-status'));dialog.append(footer);
  const open=$('component-open').onclick;$('component-open').onclick=()=>{save.hidden=!componentCanSave();open();};
  const name=$('component-name');name.addEventListener('focus',()=>{save.open=true;});
}
function componentOrganizeToolbar(toolbar,textTools,mediaTools){
  const actions=$('component-open').parentElement,colors=$('component-colors');
  const makePanel=(name,label,nodes)=>{
    const trigger=componentButton(label,()=>{}),panel=document.createElement('div');trigger.id='component-'+name+'-trigger';panel.id='component-'+name+'-popover';panel.className='component-popover';panel.setAttribute('popover','auto');panel.setAttribute('role','group');panel.setAttribute('aria-label',label);trigger.setAttribute('popovertarget',panel.id);trigger.setAttribute('aria-expanded','false');
    panel.append(...nodes);toolbar.append(trigger,panel);
    trigger.removeAttribute('popovertarget');trigger.dataset.componentTarget=panel.id;
    trigger.onclick=()=>{
      if(panel.matches(':popover-open'))panel.hidePopover();else{
        const rect=trigger.getBoundingClientRect();panel.style.left=Math.max(8,Math.min(rect.left,innerWidth-340))+'px';panel.style.top=Math.min(rect.bottom+6,innerHeight-200)+'px';panel.showPopover();
      }
    };
    panel.addEventListener('toggle',event=>{trigger.setAttribute('aria-expanded',String(event.newState==='open'));});
    panel.addEventListener('keydown',event=>{if(event.key==='Escape'&&!event.defaultPrevented){event.preventDefault();event.stopPropagation();panel.hidePopover();if(trigger.checkVisibility())trigger.focus();else $('component-more-trigger').focus();}});
    return panel;
  };
  const add=$('component-open');toolbar.prepend(add);
  const arrange=makePanel('arrange','Arrange',[$('component-align').closest('label'),...['group','ungroup','forward','backward','smaller','larger'].map(name=>$('component-'+name))]);
  makePanel('text','Text format',[textTools]);
  makePanel('colors','Appearance',[colors]);
  for(const slot of ['text','fill','border']){
    const hexLabel=document.createElement('label'),hex=document.createElement('input'),theme=document.createElement('select');hexLabel.textContent=slot+' hex';hex.type='text';hex.maxLength=7;hex.placeholder='#0066ff';hex.setAttribute('aria-label',slot+' hex color');
    hex.onchange=()=>componentRun({type:'design.appearance',keys:spActiveKeys(),style:{[slot]:{hex:hex.value,opacity:Number($('component-opacity').value)/100}}});
    theme.setAttribute('aria-label',slot+' theme color');theme.add(new Option('Theme color…',''));for(const role of spRoles)theme.add(new Option(role,role));theme.onchange=()=>{if(theme.value)componentRun({type:'design.appearance',keys:spActiveKeys(),style:{[slot]:{role:theme.value,opacity:Number($('component-opacity').value)/100}}});};hexLabel.append(hex,theme);$('component-'+slot).closest('label').after(hexLabel);
  }
  makePanel('media','Image',[mediaTools]);
  const more=makePanel('more','More ⋯',[...['duplicate','lock','delete'].map(name=>$('component-'+name)),$('we-panel-tools')]);
  const save=componentButton('Save to library…',()=>{more.hidePopover();add.click();$('component-save-panel').open=true;$('component-name').focus();});save.id='component-save-action';more.prepend(save);
  const view=$('we-view-tools');toolbar.append(view);view.classList.add('component-view-controls');
  const arrangeTrigger=$('component-arrange-trigger');
  const arrangeHome=document.createComment('arrange control');arrangeTrigger.before(arrangeHome);
  const compactTriggers=['text','colors','media'].map(name=>{const trigger=$('component-'+name+'-trigger'),home=document.createComment(name+' control');trigger.before(home);return{trigger,home};});
  const resize=new ResizeObserver(()=>{
    if(typeof wbToolbarLayout==='function'){wbToolbarLayout();return;}
    const narrow=toolbar.clientWidth<520;
    if(narrow&&arrangeTrigger.parentElement!==more)more.prepend(arrangeTrigger);
    else if(!narrow&&arrangeTrigger.parentElement===more)arrangeHome.after(arrangeTrigger);
    view.classList.toggle('component-view-compact',toolbar.clientWidth<350);
    for(const {trigger,home} of compactTriggers){if(toolbar.clientWidth<350)more.append(trigger);else home.after(trigger);}
  });resize.observe(toolbar);
  actions.remove();
  $('fe-preview').addEventListener('pointerdown',()=>{for(const panel of toolbar.querySelectorAll('.component-popover'))if(panel.matches(':popover-open'))panel.hidePopover();},true);
  toolbar.append($('component-overflow'));
  for(const panel of [arrange,more])panel.querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>{if(!button.closest('details'))panel.hidePopover();}));
}
