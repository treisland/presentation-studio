// One selected-media editor. Legacy modal DOM remains inert for old import plumbing.
let miReady=false, miPainting=false, miSaved=null, miProject='', miPreview=null, miPreviewMuted=true, miPreviewKey='';
const miFields=new Map();
function miContext(){
  const context=icSelection(),grid=context.kind==='grid',cell=grid&&mgRoot(projectModel())?.children.find(node=>mgCellID(node)===mgSelected);
  const object=grid?mgObjectID(cell):ceSelected,cfg=object&&ceConfig(object);
  return {context,grid,object,cfg,frame:object&&spMeta('media-'+object).frame};
}
function miLocked(){
  const {context,grid,object}=miContext();
  return !weEditing()||vbMode!=='edit'||projectDraftPending||boothActive||context.locked||ceLocked(projectSelected,object)||
    !!(grid&&spEntries().filter(entry=>entry.kind==='grid').some(spProtected));
}
function miChange(change){
  const {cfg,object}=miContext();if(!cfg||miLocked())return;
  vbEnd(false);projectFlush();ceChange(()=>change(ceConfig(object),object));miPaint();
}
function miSection(id,title){
  const panel=document.createElement('details');panel.id=id;panel.dataset.wpPart='content';panel.open=true;
  const summary=document.createElement('summary');summary.textContent=title;panel.append(summary);$('wp-fields').append(panel);idsRegister(panel);return panel;
}
function miField(panel,key,label,source){
  const field=document.createElement('label');field.textContent=label;
  const old=$(source||'me-'+key),input=old.cloneNode(true);input.id='mi-'+key;input.removeAttribute('hidden');input.removeAttribute('aria-describedby');
  if(input.tagName==='INPUT'&&input.type!=='checkbox')input.removeAttribute('class');
  if(input.type==='checkbox')field.prepend(input);else field.append(input);
  panel.append(field);miFields.set(key,{input,field});return input;
}
function miLayout(zone){
  const {cfg,object,grid}=miContext();if(!cfg||grid||miLocked())return;
  if(zone!=='floating'&&object!=='primary'&&cePrimaryProtected())return projectMessage('Unlock primary media before exchanging structured placement.');
  const rect=ceFigure()?ceDefaultRect(ceFigure()):ceObject().placement||{x:.6,y:.5,w:.35,h:.4};
  const primary=projectPreviewNode?.querySelector('[data-object-id="primary"]'),oldRect=primary?ceDefaultRect(primary):rect;
  ceChange(()=>ceApplyPlacement({slideID:projectSelected,objectID:object,rect},zone,cfg,oldRect));
  weInspect('media');miPaint();
}
function miFit(){
  const {frame,grid}=miContext(),fit=$('mi-fit').value;
  if(miLocked())return;
  if(frame){$('mask-fit').value=fit;maskCommit(maskRead());}
  else if(grid)mgRun({type:'grid.appearance',cellId:mgSelected,fit,x:Number($('mi-x').value),y:Number($('mi-y').value)});
  else miChange(cfg=>cfg.fit=fit);
}
function miCrop(){
  const {grid}=miContext(),x=Number($('mi-x').value),y=Number($('mi-y').value);
  if(miLocked()||![x,y].every(value=>Number.isFinite(value)&&value>=0&&value<=100))return;
  if(grid)mgRun({type:'grid.appearance',cellId:mgSelected,fit:$('mi-fit').value,x,y});
  else miChange(cfg=>cfg.canvas={...ceObject(cfg.canvas),crop:{x,y}});
}
function miPreviewIdentity(){const {context,grid,object}=miContext();return [projectMeta.id,projectSelected,context.kind,object,grid?mgSelected:''].join(':');}
function miPreviewStop(){if(miPreview){miPreview.pause();miPreview.muted=miPreviewMuted;miPreview=null;}miPreviewKey='';if($('mi-preview'))$('mi-preview').textContent='Preview clip (muted)';}
function miRestoreSelected(){
  const {object}=miContext(),slide=projectSelected,revision=editingRevision();
  const cfg=object==='primary'?miSaved?.media?.[slide]:miSaved?.mediaObjects?.[slide]?.find(item=>item.id===object)?.media;
  if(!cfg||miLocked())return;
  const savedMeta=spMeta('media-'+object,miSaved,slide);
  projectConfirm('Restore selected media?', 'Restore only this media file, frame and appearance to the opened or last editable-export state. Other objects stay unchanged. Undo restores your changes.',()=>{
    if(slide!==projectSelected||object!==miContext().object||revision!==editingRevision()||miLocked())return projectMessage('Selection changed. Choose restore again.');
    miChange(()=>{
      ceSetConfig(projectCopy(cfg),object,slide);
      const key='media-'+object,existing=spData().objects[key];
      if(savedMeta.frame||savedMeta.style||existing?.frame||existing?.style){
        const data=spData(projectState,slide,true),current=data.objects[key]??={};
        for(const field of ['frame','style']){if(savedMeta[field])current[field]=projectCopy(savedMeta[field]);else delete current[field];}
        if(!Object.keys(current).length)delete data.objects[key];
      }
    });
  });
}
function miPaint(){
  if(!miReady||miPainting||!projectReady)return;miPainting=true;
  try{
    if(miProject!==projectMeta.id){miProject=projectMeta.id;miSaved=projectCopy(projectBaseline||projectState);}
    const {context,cfg,object,grid,frame}=miContext(),active=['media','grid'].includes(context.kind),locked=miLocked();
    for(const id of ['mi-placement','mi-video']){$(id).hidden=!active||!cfg||id==='mi-video'&&cfg.kind!=='video';$(id).dataset.icVisible=String(!$(id).hidden);}
    $('mi-content').hidden=!active;$('mi-content').dataset.icVisible=String(active);
    $('ce-panel').hidden=!active;$('ce-panel').dataset.icVisible=String(active);
    if(miPreview&&(miPreviewKey!==miPreviewIdentity()||!projectPreviewNode?.contains(miPreview)))miPreviewStop();
    if(!active){miPreviewStop();return;}
    $('mi-target').textContent=cfg?(cfg.name||'Selected media')+(grid?' · Grid cell':object==='primary'?' · Primary media':' · Additional media'):'No media selected. Choose media in Layers or add a file.';
    $('mi-thumb').hidden=!cfg; if(cfg){const src=cfg.kind==='image'?cfg.src:cfg.poster;$('mi-thumb').hidden=!src;if(src)$('mi-thumb').src=mediaAssetURL(src);}
    $('ce-upload').hidden=grid;$('ce-replace').hidden=grid;
    $('mi-add-cell').hidden=!grid;$('mi-add-cell').textContent=cfg?'Replace selected cell media…':'Add media to selected cell…';$('mi-add-cell').disabled=locked;
    for(const id of ['ce-caption','ce-alt'])$(id).disabled=!cfg||locked;
    for(const {input}of miFields.values())input.disabled=!cfg||locked;
    for(const axis of ['x','y'])$('mi-'+axis).disabled=!cfg||locked;
    if(!cfg)return;
    for(const [key,{input}]of miFields){
      if(document.activeElement===input)continue;
      const value=key==='layout'?(cfg.canvas?.placement?'floating':cfg.layout):key==='fit'?(frame?.fit||cfg.fit):cfg[key]??mediaDefaults[key];
      if(input.type==='checkbox')input.checked=!!value;else if(value!=null)input.value=String(value);
    }
    const crop=cfg.canvas?.crop||{x:cfg.position?.includes('left')?0:cfg.position?.includes('right')?100:50,y:cfg.position?.includes('top')?0:cfg.position?.includes('bottom')?100:50};
    for(const axis of ['x','y'])if(document.activeElement!==$('mi-'+axis))$('mi-'+axis).value=String(crop[axis]);
    if(!frame){$('mask-fit').value=cfg.fit;for(const axis of ['x','y'])$('mask-'+axis).value=String(crop[axis]);}
    $('mi-position').value=[...$('mi-position').options].find(option=>option.value!=='custom'&&
      (option.value.includes('left')?0:option.value.includes('right')?100:50)===crop.x&&
      (option.value.includes('top')?0:option.value.includes('bottom')?100:50)===crop.y)?.value||'custom';
    const layout=cfg.canvas?.placement?'floating':cfg.layout;
    miFields.get('layout').field.hidden=grid;$('ce-grid').hidden=grid;
    miFields.get('ratio').field.hidden=!['left','right'].includes(layout);
    miFields.get('corner').field.hidden=layout!=='inset';
    miFields.get('overlay').field.hidden=layout!=='background';
    miFields.get('position').field.hidden=!!frame;
    $('mi-legacy-crop').hidden=!!frame;
    $('mask-fit').closest('label').hidden=true;
    $('ce-fit').closest('label').hidden=true;$('mg-fit').closest('label').hidden=true;
    $('ce-crop').closest('label').hidden=!!frame;
    for(const axis of ['x','y'])$('mg-crop-'+axis).closest('label').hidden=true;
    $('mask-shape').value=frame?.shape||'original';
    for(const key of ['zoom','x','y','radius','padding','shadow'])$('mask-'+key).closest('label').hidden=!frame;
    $('mask-crop-mode').closest('label').hidden=!frame;
    for(const button of $('mask-panel').querySelectorAll(':scope > details > button'))button.hidden=!frame;
    $('mi-advance').disabled=locked||object!=='primary'||grid;
    $('mi-advance-note').hidden=object==='primary'&&!grid;
    $('mi-loop').disabled=locked||cfg.advance==='ended';
    $('mi-poster-remove').disabled=locked||!cfg.poster;
    $('mi-poster-choose').disabled=locked;
    $('mi-poster-info').textContent=cfg.poster?'Poster: '+(cfg.posterName||cfg.poster):'No poster image';
    $('mi-preview').disabled=false;
    if(miPreview&&!projectPreviewNode?.contains(miPreview))miPreviewStop();
    $('mi-restore').disabled=locked||!(object==='primary'?miSaved?.media?.[projectSelected]:miSaved?.mediaObjects?.[projectSelected]?.find(item=>item.id===object));
    numericRefreshScope($('mi-placement'));numericRefreshScope($('mi-legacy-crop'));
  }finally{miPainting=false;}
}
function miOpen(){
  if(boothBlocked()||projectPlayback||document.body.classList.contains('obs'))return;
  if(mfState)mfAbort();if(projectDraftPending){projectOpen();return;}
  const already=$('full-editor').open,previous=miContext(),cell=mgSelected,selected=already&&['media','grid'].includes(previous.context.kind);
  miPreviewStop();if(!already)projectOpen();vbEnd(false);projectFlush();if(vbMode!=='edit')$('vb-edit-mode').click();
  if(selected){if(previous.grid){mgChoose(cell);wpKind='grid';}else spSelect('media-'+previous.object);}
  else{
    const media=spEntries().filter(entry=>entry.kind==='media');
    if(media.length===1)spSelect(media[0].key);
    else{spSelected=[];dbSelected='';vbSelected=null;ceSelected='none';icDestination='media';wpKind='media';if(media.length)ldOpen(true);}
  }
  wePanels.inspector.open=true;wePanelView();wpChooseTab('content');icPaint();idsReveal('ce-replace');$('mi-target').focus({preventScroll:true});
}
const miPreviousPaint=icPaint;
icPaint=function(...args){const result=miPreviousPaint(...args);miPaint();return result;};
const miPreviousMaskPaint=maskPaint;
maskPaint=function(...args){const result=miPreviousMaskPaint(...args);miPaint();return result;};
const miPreviousExport=projectExport;
projectExport=async function(playback=false){projectFlush();const saved=projectCopy(projectState);await miPreviousExport(playback);if(!playback&&!mediaDirty){miSaved=saved;miProject=projectMeta.id;miPaint();}};
const miPreviousAccept=projectAcceptPack;
projectAcceptPack=function(...args){const result=miPreviousAccept(...args);miProject='';miPaint();return result;};
const miPreviousState=mediaState;
mediaState=function(...args){const result=miPreviousState(...args);$('edit-media').textContent='Media';return result;};
mediaOpen=miOpen;
const miPreviousInit=projectInit;
projectInit=function(...args){
  const result=miPreviousInit(...args);if(miReady)return result;
  const content=miSection('mi-content','Media content');
  const target=document.createElement('p');target.id='mi-target';target.tabIndex=-1;target.setAttribute('aria-live','polite');
  const thumb=document.createElement('img');thumb.id='mi-thumb';thumb.alt='';
  content.append(target,thumb,componentButton('Choose media in Layers',()=>{ldOpen(true);$('en-search').focus();}));
  for(const id of ['ce-upload','ce-replace'])content.append($(id));
  const addCell=componentButton('Add media to selected cell…',mgPick);addCell.id='mi-add-cell';content.append(addCell);
  for(const id of ['ce-caption','ce-alt'])content.append($(id).closest('label'));
  miField(content,'captionPlace','Caption placement','me-caption-place').onchange=e=>{const value=e.target.value;miChange(cfg=>cfg.captionPlace=value);};
  const placement=miSection('mi-placement','Placement');
  const layout=miField(placement,'layout','Layout');layout.prepend(new Option('Free placement','floating'));layout.onchange=()=>miLayout(layout.value);
  $('ce-grid').textContent='Placement…';$('ce-grid').setAttribute('aria-label','Change media placement');$('ce-grid').dataset.wpPart='content';placement.append($('ce-grid'));
  for(const key of ['ratio','corner','frame','overlay']){
    const labels={ratio:'Side-by-side proportions',corner:'Inset corner',frame:'Border treatment',overlay:'Background overlay'};
    const field=miField(placement,key,labels[key]);field.onchange=()=>{const value=key==='overlay'?Number(field.value):field.value;miChange(cfg=>cfg[key]=value);};
  }
  numericAttach($('mi-overlay'),{label:'Background overlay',unit:'%',default:55,commit:()=>{const value=Number($('mi-overlay').value);miChange(cfg=>cfg.overlay=value);},preview:()=>numericPaint([...projectPreviewNode.querySelectorAll('.media-shade')],(element,value)=>{element.style.opacity=String(value/100);})});
  const crop=$('ids-mask-panel');crop.querySelector('h3').textContent='Crop & shape';
  miField(crop,'fit','Sizing','me-fit').onchange=miFit;
  const legacy=document.createElement('div');legacy.id='mi-legacy-crop';crop.append(legacy);
  for(const axis of ['x','y']){const label=document.createElement('label');label.textContent='Crop '+axis.toUpperCase();const input=document.createElement('input');input.id='mi-'+axis;input.type='number';input.min=0;input.max=100;label.append(input);legacy.append(label);numericAttach(input,{label:'Crop '+axis.toUpperCase(),unit:'%',default:50,commit:miCrop,preview:()=>numericPaint([ceFigure()],element=>element.style.setProperty('--media-pos',$('mi-x').value+'% '+$('mi-y').value+'%'))});}
  miField(crop,'position','Crop focus').onchange=e=>{const value=e.target.value;if(value==='custom')return;$('mi-x').value=value.includes('left')?0:value.includes('right')?100:50;$('mi-y').value=value.includes('top')?0:value.includes('bottom')?100:50;miCrop();};
  $('mi-position').add(new Option('Custom crop','custom'));
  $('ce-crop').closest('label').dataset.wpPart='content';crop.append($('ce-crop').closest('label'));
  $('mask-shape').prepend(new Option('Original (no mask)','original'));
  const originalShape=$('mask-shape').onchange;$('mask-shape').onchange=()=>{$('mask-shape').value==='original'?maskCommit(null):originalShape();};
  const video=miSection('mi-video','Video playback');
  for(const [key,label]of [['autoplay','Autoplay during presentation'],['muted','Mute'],['loop','Loop clip'],['advance','Slide advancement']]){
    const field=miField(video,key,label);field.onchange=()=>{const value=field.type==='checkbox'?field.checked:field.value;miChange(cfg=>{cfg[key]=value;if(cfg.advance==='ended')cfg.loop=false;});};
  }
  const note=document.createElement('p');note.id='mi-advance-note';note.textContent='Slide advancement is controlled by the primary media. Additional and grid videos use normal slide timing.';video.append(note);
  const preview=componentButton('Preview clip (muted)',()=>{const asset=ceFigure()?.querySelector('video');if(!asset)return;if(miPreview===asset&&!asset.paused){miPreviewStop();return;}miPreviewStop();miPreviewMuted=asset.muted;asset.muted=true;miPreview=asset;miPreviewKey=miPreviewIdentity();asset.play().then(()=>{if(miPreview===asset)preview.textContent='Pause preview';}).catch(()=>{if(miPreview===asset){miPreviewStop();projectMessage('Preview unavailable. Check this video format.');}});});preview.id='mi-preview';video.append(preview);
  const poster=document.createElement('input');poster.id='mi-poster-file';poster.type='file';poster.accept='image/*';poster.hidden=true;
  poster.onchange=()=>{const file=poster.files[0];poster.value='';if(!file||miLocked()||!file.type.startsWith('image/'))return;const path='assets/'+projectID('poster')+'-'+mediaFilename(file.name);miChange(cfg=>{mediaRemember(path,file);cfg.poster=path;cfg.posterName=file.name;});};
  const choose=componentButton('Choose poster image…',()=>poster.click());choose.id='mi-poster-choose';
  const remove=componentButton('Remove poster',()=>miChange(cfg=>{delete cfg.poster;delete cfg.posterName;}));remove.id='mi-poster-remove';
  const info=document.createElement('p');info.id='mi-poster-info';video.append(choose,remove,poster,info);
  const restore=componentButton('Restore selected media…',miRestoreSelected);restore.id='mi-restore';content.append(restore);
  for(const id of ['ce-objects','ce-selected','ce-fit','mg-fit','mg-crop-x','mg-crop-y'])($(id).closest('label')||$(id)).dataset.wpPart='never';
  $('ce-panel').querySelector('summary').textContent='Media arrangement and locks';
  $('ce-panel').dataset.wpPart='arrange';$('ce-hidden').closest('label').dataset.wpPart='arrange';
  content.append($('ce-zone').closest('label'));
  $('mg-upload').dataset.wpPart='never';
  $('wp-fields').prepend(content,placement,$('mask-panel'),video);
  $('ce-zone').closest('label').firstChild.textContent='New media placement';
  const menu=$('hub-project-menu').querySelector('.hub-menu-items'),advanced=document.createElement('details');advanced.id='mi-advanced';advanced.innerHTML='<summary>Advanced media settings</summary><p>Legacy primary-media settings only. JSON excludes additional objects and media files. Use Export → Editable ZIP for a complete backup. Open file also accepts legacy settings.</p>';
  advanced.append($('me-json'));menu.append(advanced);$('me-json').textContent='Export media settings JSON (no files)';
  $('media-editor').hidden=true;$('media-editor').inert=true;
  $('edit-media').onclick=miOpen;$('fe-media').onclick=miOpen;
  $('full-editor').addEventListener('close',miPreviewStop);
  miReady=true;idsPaint();miPaint();return result;
};
