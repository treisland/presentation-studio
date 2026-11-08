// Grid membership is safe AST markup; files/placement remain existing media objects.
let mgSelected = '', mgDrag = null, mgUploading = false, mgUploadTarget = null;
const mgHas = (node, name) => (node?.attrs?.class || '').split(/\s+/).includes(name);
const mgRoot = model => model?.tree.find(n => mgHas(n, 'mg-grid'));
const mgCellID = node => node?.attrs?.class?.match(/\bcell-[\w-]+\b/)?.[0] || '';
const mgObjectID = node => node?.attrs?.class?.match(/\bmg-media-(primary|object-[\w-]+)\b/)?.[1] || '';
const mgConfig = (state, slide, id) => id === 'primary' ? state.media[slide] : state.mediaObjects?.[slide]?.find(o => o.id === id)?.media;
function mgWeights(values) {
  if (!Array.isArray(values) || !values.length || values.length > 3 || values.some(n => !Number.isInteger(n) || n < 1000) || values.reduce((a,b)=>a+b,0) !== 10000)
    editingFail('INVALID', 'Grid proportions must total 10000, with each row/column at least 10%.');
  return [...values];
}
function mgSettings(root) {
  const cls = root.attrs.class, rows = cls.match(/\bmg-r-([\d-]+)\b/), cols = cls.match(/\bmg-c-([\d-]+)\b/), gap = cls.match(/\bmg-g-(\d+)\b/);
  if (!rows || !cols || !gap || Number(gap[1]) > 8) editingFail('INVALID', 'Invalid grid configuration.');
  return { rows: mgWeights(rows[1].split('-').map(Number)), cols: mgWeights(cols[1].split('-').map(Number)), gap: Number(gap[1]) };
}
function mgWrite(root, settings) {
  const layer=root.attrs.class.match(/\blayer-[\w-]+\b/)?.[0];
  root.attrs.class = `mg-grid mg-r-${settings.rows.join('-')} mg-c-${settings.cols.join('-')} mg-g-${settings.gap}`+(layer?' '+layer:'');
}
function mgEqual(n) { return n === 3 ? [3333,3333,3334] : n === 2 ? [5000,5000] : [10000]; }
function mgNewCell() { return projectNode('div', 'mg-cell ' + projectID('cell')); }
function mgMark(cell, id) { cell.attrs.class = 'mg-cell ' + mgCellID(cell) + (id ? ' mg-media-' + id : ''); }
function mgRects(settings) {
  const {rows, cols, gap} = settings, g = gap/100, w = .9-g*(cols.length-1), h = .72-g*(rows.length-1), result=[];
  let y=.23;
  for (const row of rows) { let x=.05; for (const col of cols) { result.push({x,y,w:w*col/10000,h:h*row/10000}); x+=w*col/10000+g; } y+=h*row/10000+g; }
  return result;
}
function mgArrange(state, model) {
  const root=mgRoot(model), rects=mgRects(mgSettings(root));
  root.children.forEach((cell,i)=>{const cfg=mgConfig(state,model.id,mgObjectID(cell));if(cfg) { cfg.layout='inset';cfg.canvas={...ceObject(cfg.canvas),placement:rects[i]}; }});
}
const mgTemplate = projectCreateTemplate;
projectCreateTemplate = function(type,title) {
  if(type !== 'media-grid') return mgTemplate(type,title);
  const root=projectNode('div','mg-grid',Array.from({length:4},mgNewCell));mgWrite(root,{rows:mgEqual(2),cols:mgEqual(2),gap:2});
  return {classes:'wide mg-slide',tree:[projectNode('h2','mg-heading',[title || 'Media grid']),root]};
};
// Validate reserved markup at import, including template baselines and recovery trees.
const mgValidateTree=projectValidateTree;
projectValidateTree=function(tree,depth=0,budget={count:0}) {
  const result=mgValidateTree(tree,depth,budget);
  if(depth===0) {
    const roots=result.filter(n=>mgHas(n,'mg-grid'));
    if(roots.length>1) throw new Error('Only one media grid per slide.');
    for(const root of roots) {
      const settings=mgSettings(root), ids=new Set(), objects=new Set();
      if(root.tag!=='div'||root.children.length!==settings.rows.length*settings.cols.length) throw new Error('Invalid grid cell count.');
      for(const cell of root.children) {
        const id=mgCellID(cell), object=mgObjectID(cell);
        if(cell.tag!=='div'||!mgHas(cell,'mg-cell')||!id||ids.has(id)||cell.children.length || (object&&objects.has(object))) throw new Error('Invalid or duplicate grid cell.');
        ids.add(id);if(object)objects.add(object);
      }
    }
  }
  return result;
};
function mgOperation(state,op) {
  if(!op?.type?.startsWith('grid.')) return false;
  const model=editingSlide(state,op.slideId),root=mgRoot(model);
  if(!root) editingFail('NOT_FOUND','This slide has no media grid.');
  if(op.type==='grid.configure') {
    const settings={rows:mgWeights(op.rows),cols:mgWeights(op.cols),gap:op.gap};
    if(!Number.isInteger(settings.gap)||settings.gap<0||settings.gap>8) editingFail('INVALID','Spacing must be 0–8%.');
    const count=settings.rows.length*settings.cols.length;
    const overflow=root.children.slice(count).filter(cell=>mgConfig(state,model.id,mgObjectID(cell)));
    if(overflow.length && op.overflow!=='detach') editingFail('OVERFLOW',`${overflow.length} populated cells would leave the grid. Confirm keeping their media as free objects.`);
    if(overflow.some(cell=>mgConfig(state,model.id,mgObjectID(cell)).canvas?.locked)) editingFail('LOCKED','Unlock overflow media first.');
    root.children=root.children.slice(0,count);while(root.children.length<count)root.children.push(mgNewCell());
    mgWrite(root,settings);
  } else {
    const cell=root.children.find(n=>mgCellID(n)===op.cellId);
    if(!cell) editingFail('NOT_FOUND','Grid cell not found.');
    const id=mgObjectID(cell),cfg=mgConfig(state,model.id,id);
    if(cfg?.canvas?.locked) editingFail('LOCKED','Unlock cell media first.');
    if(op.type==='grid.assign') {
      if(!op.media || typeof op.media.src!=='string' || !/^assets\/[\w.-]+$/.test(op.media.src)) editingFail('INVALID','Use an imported local media asset.');
      const normalized=mediaValidate({schemaVersion:1,slides:{object:op.media}}).slides.object;
      const next={...normalized,layout:'inset',advance:'fixed',canvas:ceObject(cfg?.canvas)};
      if(cfg) {if(id==='primary')state.media[model.id]=next;else state.mediaObjects[model.id].find(o=>o.id===id).media=next;}
      else {
        if((state.mediaObjects?.[model.id]?.length||0)>=30) editingFail('INVALID','A slide supports at most 30 additional media objects.');
        const object=projectID('object');state.mediaObjects??={};(state.mediaObjects[model.id]??=[]).push({id:object,media:next});mgMark(cell,object);
      }
    } else if(op.type==='grid.remove'||op.type==='grid.detach') {
      if(op.type==='grid.remove') {if(id==='primary')delete state.media[model.id];else if(state.mediaObjects?.[model.id])state.mediaObjects[model.id]=state.mediaObjects[model.id].filter(o=>o.id!==id);}
      mgMark(cell,'');
    } else if(op.type==='grid.swap') {
      const target=root.children.find(n=>mgCellID(n)===op.targetCellId);
      if(!target)editingFail('NOT_FOUND','Destination cell not found.');
      const targetID=mgObjectID(target);if(mgConfig(state,model.id,targetID)?.canvas?.locked)editingFail('LOCKED','Unlock destination media first.');
      mgMark(cell,targetID);mgMark(target,id);
    } else if(op.type==='grid.appearance') {
      if(!cfg) editingFail('NOT_FOUND','Add media to this cell first.');
      if(!['contain','cover'].includes(op.fit)||![op.x,op.y].every(n=>Number.isFinite(n)&&n>=0&&n<=100))editingFail('INVALID','Choose Fit/Fill and crop values 0–100.');
      cfg.fit=op.fit;cfg.canvas={...ceObject(cfg.canvas),crop:{x:op.x,y:op.y}};
    } else editingFail('INVALID','Unknown grid operation.');
  }
  mgArrange(state,model);return true;
}
const mgBlockOperation=dbOperation;
dbOperation=function(state,op,created){return mgOperation(state,op)||mgBlockOperation(state,op,created);};
function mgMember(id,model=projectModel()) {return mgRoot(model)?.children.find(cell=>mgObjectID(cell)===id);}
// Grid members move through cells/dividers; detach before free placement.
const mgPlace=editingPlace;
editingPlace=function(state,id,object,p){if(mgMember(object,state.slides.find(s=>s.id===id)))editingFail('INVALID','Detach grid media before free placement.');return mgPlace(state,id,object,p);};
const mgCanvasPanel=cePanel;
cePanel=function(...args){mgCanvasPanel(...args);if(!$('ce-x')||!projectReady)return;const member=!!mgMember(ceSelected);for(const id of ['ce-x','ce-y','ce-w','ce-h','ce-float','ce-reset','ce-grid'])$(id).disabled=member||ceLocked(projectSelected,ceSelected);};
const mgCanvasDecorate=ceDecorate;
ceDecorate=function(root){mgCanvasDecorate(root);for(const f of root?.querySelectorAll('.media-box')||[])if(mgMember(f.dataset.objectId))f.querySelectorAll('.ce-handle,.ce-placement-handle').forEach(n=>n.remove());};
function mgRun(operation,snapshot=null) {
  if(!snapshot){vbEnd(false);projectFlush();snapshot=studioEditing.read();}
  const result=studioEditing.apply({apiVersion:1,projectId:snapshot.projectId,expectedRevision:snapshot.revision,operations:[{slideId:projectSelected,...operation}]});
  if(!result.ok)projectMessage(result.message);mgAttach();return result;
}
function mgChoose(id) {
  mgSelected=id;const cell=mgRoot(projectModel())?.children.find(c=>mgCellID(c)===id);
  if(cell&&mgObjectID(cell)){ceSelected=mgObjectID(cell);cePanel();}
  wePanels.inspector.open=true;wePanelView();
  mgPanel();
}
function mgPanel() {
  if(!$('mg-panel'))return;const root=mgRoot(projectModel());$('mg-panel').hidden=!root;if(!root)return;
  const settings=mgSettings(root);if(!root.children.some(c=>mgCellID(c)===mgSelected))mgSelected=mgCellID(root.children[0]);
  const select=$('mg-cell');select.replaceChildren();root.children.forEach((c,i)=>select.add(new Option(`Cell ${i+1}: ${mgConfig(projectState,projectSelected,mgObjectID(c))?.name||'empty drop zone'}`,mgCellID(c))));select.value=mgSelected;
  $('mg-rows').value=settings.rows.length;$('mg-cols').value=settings.cols.length;$('mg-gap').value=settings.gap;
  const preset=settings.rows.length+'x'+settings.cols.length;
  $('mg-preset').value=['2x2','1x3','3x3'].includes(preset)&&JSON.stringify(settings.rows)===JSON.stringify(mgEqual(settings.rows.length))&&JSON.stringify(settings.cols)===JSON.stringify(mgEqual(settings.cols.length))?preset:'custom';
  const cell=root.children.find(c=>mgCellID(c)===mgSelected),cfg=mgConfig(projectState,projectSelected,mgObjectID(cell));
  $('mg-fit').value=cfg?.fit||'contain';$('mg-crop-x').value=cfg?.canvas?.crop?.x??50;$('mg-crop-y').value=cfg?.canvas?.crop?.y??50;
  $('mg-upload').textContent=cfg?'Replace '+cfg.name+'…':'Add media to selected cell';
  const destination=$('mg-destination');destination.replaceChildren();root.children.forEach((c,i)=>destination.add(new Option('Cell '+(i+1),mgCellID(c))));destination.value=mgSelected;
  const locked=ceLocked()||vbMode!=='edit'||mgUploading;
  for(const el of $('mg-panel').querySelectorAll('button,input,select'))el.disabled=locked;
  for(const id of ['mg-fit','mg-crop-x','mg-crop-y','mg-remove','mg-detach','mg-swap'])$(id).disabled=locked||!cfg||!!cfg.canvas?.locked;
  $('mg-upload').disabled=locked||!!cfg?.canvas?.locked;
  for(const button of projectPreviewNode?.querySelectorAll('.mg-cell-action')||[])button.setAttribute('aria-pressed',String(button.dataset.mgCell===mgSelected));
  for(const figure of projectPreviewNode?.querySelectorAll('.media-box[data-mg-cell]')||[])figure.classList.toggle('mg-selected',vbMode==='edit'&&figure.dataset.mgCell===mgSelected);
}
function mgPaint(slide,settings,editing=false) {
  const model=projectModel(slide.dataset.mediaId),root=mgRoot(model);if(!root)return;
  slide.querySelectorAll('.mg-guides').forEach(n=>n.remove());
  const rects=mgRects(settings);
  root.children.forEach((cell,i)=>{
    const object=mgObjectID(cell),cfg=mgConfig(projectState,model.id,object),r=rects[i];
    const figure=object&&slide.querySelector(`:scope > .media-box[data-object-id="${object}"]`);
    if(figure){figure.dataset.mgCell=mgCellID(cell);if(settings!==null)Object.assign(figure.style,{left:r.x*100+'%',top:r.y*100+'%',width:r.w*100+'%',height:r.h*100+'%'});}
    if(!editing)return;
    const button=document.createElement('button');button.className='mg-cell-action mg-guides'+(cfg?' mg-populated':'');button.type='button';button.dataset.mgCell=mgCellID(cell);
    button.textContent=`Cell ${i+1}${cfg?' · '+cfg.name:' · Add media'}`;button.setAttribute('aria-label',`Grid cell ${i+1}: ${cfg?.name||'empty media drop zone'}`);button.setAttribute('aria-pressed',String(mgSelected===mgCellID(cell)));
    Object.assign(button.style,{left:r.x*100+'%',top:r.y*100+'%',width:r.w*100+'%',height:(cfg?Math.min(.055,r.h):r.h)*100+'%'});
    button.onclick=()=>mgChoose(mgCellID(cell));button.ondblclick=()=>{mgChoose(mgCellID(cell));mgPick();};slide.append(button);
  });
  if(editing)for(const axis of ['rows','cols']) {
    const weights=settings[axis],horizontal=axis==='cols';let sum=0;
    for(let i=0;i<weights.length-1;i++) {
      sum+=weights[i];const gap=settings.gap/100,size=(horizontal?.9:.72)-gap*(weights.length-1),position=(horizontal?.05:.23)+size*sum/10000+gap*i+gap/2;
      const handle=document.createElement('button');handle.type='button';handle.className='mg-divider mg-guides';handle.dataset.mgAxis=axis;handle.dataset.mgIndex=i;handle.textContent=horizontal?'↔':'↕';
      handle.setAttribute('aria-label',`Resize ${horizontal?'column':'row'} divider ${i+1}`);handle.setAttribute('aria-description','Arrow keys adjust proportions. Shift adjusts faster. Escape cancels a drag.');
      Object.assign(handle.style,horizontal?{left:position*100+'%',top:'23%',height:'72%'}:{top:position*100+'%',left:'5%',width:'90%'});slide.append(handle);
    }
  }
}
const mgMediaApply=mediaApply;
mediaApply=function(slide){mgMediaApply(slide);if(!projectReady)return;for(const n of slide.querySelectorAll(':scope > .media-original > .mg-grid'))slide.append(n);const root=mgRoot(projectModel(slide.dataset.mediaId));if(root)mgPaint(slide,mgSettings(root));};
function mgAttach() {
  if(!projectPreviewNode)return;const slide=projectPreviewNode.querySelector('.slide'),root=mgRoot(projectModel());
  if(slide&&root){mgPaint(slide,mgSettings(root),vbMode==='edit');for(const f of slide.querySelectorAll('.media-box[data-mg-cell]')) f.querySelectorAll('.ce-handle,.ce-placement-handle').forEach(n=>n.remove());}
  mgPanel();
}
const mgPreview=projectPreview;
projectPreview=function(...args){if(mgDrag)mgEnd(true);mgPreview(...args);mgAttach();};
function mgConfigure(rows,cols,gap) {
  vbEnd(false);projectFlush();const snapshot=studioEditing.read(),op={type:'grid.configure',rows,cols,gap},root=mgRoot(projectModel()),overflow=root.children.slice(rows.length*cols.length).filter(c=>mgConfig(projectState,projectSelected,mgObjectID(c)));
  if(overflow.length){projectConfirm('Keep overflow media as free objects?',`${overflow.length} populated cells no longer fit. Their media files, IDs and current positions will be preserved as free objects. Cancel keeps the current grid.`,()=>mgRun({...op,overflow:'detach'},snapshot));$('fe-confirm').addEventListener('close',mgPanel,{once:true});}
  else mgRun(op,snapshot);
}
function mgPick() {
  if(ceLocked()||vbMode!=='edit'||mgUploading)return;vbEnd(false);projectFlush();const cell=mgRoot(projectModel())?.children.find(c=>mgCellID(c)===mgSelected);if(!cell)return;
  mgUploadTarget={slideId:projectSelected,cellId:mgSelected,snapshot:studioEditing.read()};$('mg-file').click();
}
async function mgUpload(files,target=mgUploadTarget) {
  if(!target||mgUploading||files.length!==1)return;const file=files[0];
  if(!/^(image|video)\//.test(file.type)||file.size>250*1024*1024){projectMessage('Choose one image or video up to 250 MB.');return;}
  const {slideId,cellId,snapshot}=target,model=projectModel(slideId),cell=mgRoot(model)?.children.find(c=>mgCellID(c)===cellId),old=cell&&mgConfig(projectState,slideId,mgObjectID(cell));if(!cell||old?.canvas?.locked||ceLocked(slideId))return;
  const path='assets/'+projectID('media')+'-'+mediaFilename(file.name),cfg={...mediaDefaults,...old,kind:file.type.startsWith('video/')?'video':'image',src:path,name:file.name,alt:old?.alt||file.name};
  if(cfg.kind==='image'){delete cfg.poster;delete cfg.posterName;}
  const commit=()=>{
    if(projectSelected!==slideId||!$('full-editor').open||vbMode!=='edit'||ceLocked(slideId)||studioEditing.read().revision!==snapshot.revision){projectMessage('The project changed. Choose the cell again.');return;}
    mediaRemember(path,file);const result=mgRun({type:'grid.assign',cellId,media:cfg},snapshot);
    if(!result.ok){URL.revokeObjectURL(mediaURLs.get(path));mediaURLs.delete(path);mediaBlobs.delete(path);}
  };
  if(old) {
    projectConfirm('Replace '+old.name+' in selected grid cell?',`Replace only ${old.name} with ${file.name}. Other cells stay unchanged. Undo restores the old media.`,commit);
    const preview=document.createElement(cfg.kind==='video'?'video':'img'),url=URL.createObjectURL(file);preview.id='ce-replacement-preview';preview.src=url;if(cfg.kind==='video'){preview.controls=true;preview.muted=true;}else preview.alt='Replacement preview: '+file.name;
    $('fe-confirm-message').after(preview);$('fe-confirm').addEventListener('close',()=>{preview.remove();URL.revokeObjectURL(url);},{once:true});
  } else commit();
}
function mgAdjusted(settings,axis,i,delta) {const next=projectCopy(settings),v=next[axis],change=Math.max(1000-v[i],Math.min(v[i+1]-1000,Math.round(delta)));v[i]+=change;v[i+1]-=change;return next;}
function mgEnd(cancel=false) {
  const drag=mgDrag;if(!drag)return;mgDrag=null;try{drag.handle.releasePointerCapture(drag.pointer);}catch{}
  if(!cancel)mgRun({type:'grid.configure',...drag.next},drag.snapshot);else mgAttach();
}
const mgInit=projectInit;
projectInit=function(){
  mgInit();const panel=document.createElement('section');panel.id='mg-panel';panel.hidden=true;
  panel.innerHTML='<h3>Media Grid</h3><p>Choose a cell, then add media or drop a file on it. Populated cells swap without replacing files. Detach before free placement.</p><label>Preset<select id="mg-preset"><option value="2x2">2 × 2</option><option value="1x3">3 × 1</option><option value="3x3">3 × 3</option></select></label><div class="mg-fields"><label>Rows<input id="mg-rows" type="number" min="1" max="3"></label><label>Columns<input id="mg-cols" type="number" min="1" max="3"></label><label>Spacing (%)<input id="mg-gap" type="number" min="0" max="8"></label></div><button id="mg-configure">Apply rows, columns and spacing</button><label>Selected cell<select id="mg-cell"></select></label><button id="mg-upload">Add media to selected cell</button><input id="mg-file" type="file" accept="image/*,video/*" hidden><label>Fit / crop<select id="mg-fit"><option value="contain">Fit</option><option value="cover">Fill / crop</option></select></label><div class="mg-fields"><label>Crop X (%)<input id="mg-crop-x" type="number" min="0" max="100"></label><label>Crop Y (%)<input id="mg-crop-y" type="number" min="0" max="100"></label></div><label>Move / swap with<select id="mg-destination"></select></label><button id="mg-swap">Move / swap media</button><button id="mg-detach">Keep media as free object</button><button id="mg-remove">Remove media from cell</button><p>Drag dividers or focus one and use arrows (Shift: faster). Escape cancels. Captions and alternative text use the Media inspector.</p>';
  $('we-common').prepend(panel);
  $('mg-preset').add(new Option('Custom proportions','custom'));
  $('mg-cell').onchange=e=>mgChoose(e.target.value);$('mg-upload').onclick=mgPick;
  $('mg-file').onchange=e=>{mgUpload(e.target.files);e.target.value='';};
  $('mg-preset').onchange=e=>{if(e.target.value==='custom')return;const [r,c]=e.target.value.split('x').map(Number);mgConfigure(mgEqual(r),mgEqual(c),Number($('mg-gap').value));};
  $('mg-configure').onclick=()=>{const r=Number($('mg-rows').value),c=Number($('mg-cols').value),gap=Number($('mg-gap').value);if(![r,c].every(n=>Number.isInteger(n)&&n>=1&&n<=3))return projectMessage('Choose 1–3 rows and columns.');mgConfigure(mgEqual(r),mgEqual(c),gap);};
  for(const id of ['mg-fit','mg-crop-x','mg-crop-y'])$(id).onchange=()=>mgRun({type:'grid.appearance',cellId:mgSelected,fit:$('mg-fit').value,x:Number($('mg-crop-x').value),y:Number($('mg-crop-y').value)});
  $('mg-swap').onclick=()=>mgRun({type:'grid.swap',cellId:mgSelected,targetCellId:$('mg-destination').value});
  $('mg-detach').onclick=()=>mgRun({type:'grid.detach',cellId:mgSelected});
  $('mg-remove').onclick=()=>{const cell=mgRoot(projectModel())?.children.find(c=>mgCellID(c)===mgSelected),cfg=cell&&mgConfig(projectState,projectSelected,mgObjectID(cell));if(!cfg)return;const snapshot=studioEditing.read(),cellId=mgSelected;projectConfirm('Remove '+cfg.name+' from this cell?','Other cells stay unchanged. Undo and recovery retain the removed asset.',()=>mgRun({type:'grid.remove',cellId},snapshot));};
  // Window capture precedes preview's generic media-drag handler.
  window.addEventListener('pointerdown',e=>{
    if(vbMode!=='edit'||!e.target.closest?.('#fe-preview')||e.button!==0)return;
    const handle=e.target.closest('.mg-divider');
    if(handle){e.preventDefault();e.stopImmediatePropagation();if(ceLocked())return;vbEnd(false);projectFlush();const settings=mgSettings(mgRoot(projectModel())),axis=handle.dataset.mgAxis;mgDrag={handle,pointer:e.pointerId,axis,i:Number(handle.dataset.mgIndex),start:axis==='cols'?e.clientX:e.clientY,bounds:projectPreviewNode.querySelector('.slide').getBoundingClientRect(),settings,next:settings,snapshot:studioEditing.read()};try{handle.setPointerCapture(e.pointerId);}catch{}return;}
    const button=e.target.closest('.mg-cell-action'),figure=e.target.closest('.media-box[data-mg-cell]');
    if(button||figure){if(figure&&$('ce-crop').checked&&ceFigureConfig(figure)?.kind==='image')return;e.preventDefault();e.stopImmediatePropagation();const cell=(button||figure).dataset.mgCell;mgChoose(cell);(button||figure).focus();}
  },true);
  window.addEventListener('pointermove',e=>{const d=mgDrag;if(!d||d.pointer!==e.pointerId)return;const horizontal=d.axis==='cols',length=(horizontal?.9:.72)-d.settings.gap/100*(d.settings[d.axis].length-1),delta=((horizontal?e.clientX:e.clientY)-d.start)/(horizontal?d.bounds.width:d.bounds.height)/length*10000;d.next=mgAdjusted(d.settings,d.axis,d.i,delta);const slide=projectPreviewNode?.querySelector('.slide');if(slide){const rects=mgRects(d.next),root=mgRoot(projectModel());root.children.forEach((c,i)=>{const r=rects[i];for(const el of slide.querySelectorAll(`[data-mg-cell="${mgCellID(c)}"]`))Object.assign(el.style,{left:r.x*100+'%',top:r.y*100+'%',width:r.w*100+'%',height:(el.matches('.mg-populated')?Math.min(.055,r.h):r.h)*100+'%'});});}},true);
  window.addEventListener('pointerup',e=>{if(mgDrag?.pointer===e.pointerId)mgEnd();},true);
  window.addEventListener('pointercancel',()=>mgEnd(true),true);window.addEventListener('lostpointercapture',()=>mgEnd(true),true);window.addEventListener('blur',()=>mgEnd(true));
  $('full-editor').addEventListener('close',()=>mgEnd(true));
  window.addEventListener('keydown',e=>{
    if(mgDrag&&e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();mgEnd(true);return;}
    if(vbMode!=='edit'||!e.target.closest?.('#fe-preview'))return;
    const handle=e.target.closest('.mg-divider');
    if(handle&&e.key.startsWith('Arrow')){e.preventDefault();e.stopImmediatePropagation();const axis=handle.dataset.mgAxis,i=Number(handle.dataset.mgIndex),settings=mgSettings(mgRoot(projectModel())),delta=(e.key==='ArrowLeft'||e.key==='ArrowUp'?-1:1)*(e.shiftKey?500:100);mgRun({type:'grid.configure',...mgAdjusted(settings,axis,i,delta)});projectPreviewNode.querySelector(`.mg-divider[data-mg-axis="${axis}"][data-mg-index="${i}"]`)?.focus();return;}
    const cell=e.target.closest('[data-mg-cell]');if(cell&&e.key.startsWith('Arrow')){e.preventDefault();e.stopImmediatePropagation();const root=mgRoot(projectModel()),i=root.children.findIndex(c=>mgCellID(c)===cell.dataset.mgCell),cols=mgSettings(root).cols.length,delta=e.key==='ArrowLeft'?-1:e.key==='ArrowRight'?1:e.key==='ArrowUp'?-cols:cols,next=root.children[Math.max(0,Math.min(root.children.length-1,i+delta))];mgChoose(mgCellID(next));projectPreviewNode.querySelector(`.mg-cell-action[data-mg-cell="${mgCellID(next)}"]`)?.focus();}
  },true);
};
function mgHandleDrop(e,type) {
  if(!mgRoot(projectModel()))return false;
  e.preventDefault();e.stopImmediatePropagation();
  if(type==='drop') {
    const cell=e.target.closest('[data-mg-cell]');if(!cell){projectMessage('Drop on a named grid cell.');return true;}
    vbEnd(false);projectFlush();mgUpload(e.dataTransfer.files,{slideId:projectSelected,cellId:cell.dataset.mgCell,snapshot:studioEditing.read()});
  }
  return true;
}
