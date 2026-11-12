// Non-destructive frames: original media bytes and existing canvas placement stay intact.
function maskSettings(raw) {
  if(!raw||typeof raw!=='object'||!['rectangle','rounded','circle','oval'].includes(raw.shape)||!['cover','contain'].includes(raw.fit))editingFail('INVALID','Choose a supported mask and Fill or Fit.');
  const clean={shape:raw.shape,fit:raw.fit};
  if(raw.shadow!=null){if(!['none','soft','strong'].includes(raw.shadow))editingFail('INVALID','Choose a supported frame shadow.');clean.shadow=raw.shadow;}
  for(const [key,min,max,fallback]of [['zoom',100,400,100],['x',0,100,50],['y',0,100,50],['radius',0,50,12]]){
    const value=raw[key]??fallback;if(!Number.isFinite(value)||value<min||value>max)editingFail('INVALID','Invalid mask '+key+'.');clean[key]=value;
  }
  return clean;
}
// Self-contained to share the exact renderer with the offline booth player.
function mediaMaskPaint(figure,frame) {
  const view=figure?.querySelector('.media-viewport'),asset=view?.querySelector('.media-asset');if(!asset)return;
  view.style.overflow='hidden';
  view.style.clipPath=frame.shape==='circle'?'circle(closest-side at 50% 50%)':frame.shape==='oval'?'ellipse(50% 50% at 50% 50%)':frame.shape==='rounded'?'inset(0 round '+frame.radius+'%)':'inset(0)';
  view.style.borderRadius=frame.shape==='rounded'?frame.radius+'%':frame.shape==='oval'?'50%':'0';
  asset.style.objectFit=frame.fit;asset.style.objectPosition=frame.x+'% '+frame.y+'%';
  asset.style.transform='scale('+(frame.zoom/100)+')';asset.style.transformOrigin=frame.x+'% '+frame.y+'%';
  figure.classList.add('mask-frame');
  figure.style.boxShadow=({none:'none',soft:'0 8px 24px #0003',strong:'0 16px 48px #0006'})[frame.shadow]||'';
}
const maskFocusOpen=mfOpen;
mfOpen=function(...args){const result=maskFocusOpen(...args);if(mfState?.figure?.classList.contains('mask-frame')){mfState.asset.style.transformOrigin='center center';if(mfState.asset.tagName==='VIDEO')mfState.asset.style.transform='none';}return result;};
editingRegisterOperation('media.mask',(state,operation)=>{
  const slide=editingSlide(state,operation.slideId),entries=maskEntries(state,slide).filter(entry=>operation.keys?.includes(entry.key));
  if(!Array.isArray(operation.keys)||!operation.keys.length||operation.keys.length!==new Set(operation.keys).size||entries.length!==operation.keys.length)editingFail('INVALID','Select existing media objects.');
  const grid=mgRoot(slide);
  if(entries.some(entry=>spProtected(entry)||(grid&&mgMember(entry.object,slide)&&spMeta(spNodeID(grid),state,slide.id).locked)))editingFail('LOCKED','Unlock the selected media first.');
  if(entries.some(entry=>entry.kind!=='media'))editingFail('INVALID','Select an image or video.');
  const frame=operation.frame?maskSettings(operation.frame):null;
  for(const entry of entries){const meta=spData(state,slide.id,true).objects[entry.key]??={};if(frame)meta.frame=frame;else delete meta.frame;}
});
function maskEntries(state,slide){
  return [{id:'primary',media:state.media[slide.id]},...(state.mediaObjects?.[slide.id]||[])].filter(item=>item.media).map(item=>({key:'media-'+item.id,kind:'media',object:item.id,media:item.media,meta:spData(state,slide.id).objects['media-'+item.id]||{}}));
}
const maskApply=spApply;
spApply=function(slide,...args){const result=maskApply(slide,...args),model=projectReady&&projectModel(slide.dataset.mediaId);if(model)for(const entry of maskEntries(projectState,model))if(entry.meta.frame)mediaMaskPaint(spElement(slide,entry),entry.meta.frame);return result;};
let maskReady=false,maskIdentity='',maskTarget='',maskSnapshot=null;
const maskDefault=()=>({shape:'rectangle',fit:'cover',zoom:100,x:50,y:50,radius:12,shadow:'none'});
function maskRead(){return maskSettings({shape:$('mask-shape').value,fit:$('mask-fit').value,shadow:$('mask-shadow').value,...Object.fromEntries(['zoom','x','y','radius'].map(key=>[key,Number($('mask-'+key).value)]))});}
function maskStamp(){return JSON.stringify([projectMeta.id,projectSelected,editingRevision(),maskTarget,boothActive]);}
function maskPreview(){try{mediaMaskPaint(ceFigure(),maskRead());}catch{}}
function maskPaint(){
  if(!maskReady||!projectReady)return;
  if(boothActive||projectPlayback||projectDraftPending){$('mask-panel').hidden=true;maskTarget='';return;}
  const context=icSelection(),entry=context.selected.length===1&&context.selected[0]?.kind==='media'?context.selected[0]:['media','grid'].includes(context.kind)?maskEntries(projectState,projectModel()).find(entry=>entry.object===ceSelected):null,panel=$('mask-panel');
  for(const id of ['ce-fit','ce-crop'])$(id).closest('label').hidden=!!entry?.meta.frame;
  panel.hidden=!entry||entry.kind!=='media';panel.dataset.icVisible=String(!panel.hidden);if(panel.hidden){maskTarget='';return;}
  const identity=JSON.stringify([context.identity,entry.key,entry.meta.frame,studioEditing.read().revision]);
  if(identity!==maskIdentity){maskIdentity=identity;maskTarget=entry.key;const frame={...maskDefault(),...entry.meta.frame};for(const key of ['shape','fit','zoom','x','y','radius','shadow'])$('mask-'+key).value=String(frame[key]);maskSnapshot=studioEditing.read();$('mask-crop-mode').checked=false;}
  for(const control of panel.querySelectorAll('input,select,button'))control.disabled=context.locked;
  $('mask-radius').disabled=context.locked||$('mask-shape').value!=='rounded';
  numericRefreshScope(panel);
}
function maskCommit(frame){
  if(!maskSnapshot||!maskTarget)return;
  const result=studioEditing.apply({apiVersion:1,projectId:maskSnapshot.projectId,expectedRevision:maskSnapshot.revision,operations:[{type:'media.mask',slideId:projectSelected,keys:[maskTarget],frame}]});
  if(!result.ok)projectMessage(result.message);maskIdentity='';maskPaint();
}
const maskInspector=icPaint;
icPaint=function(...args){const result=maskInspector(...args);maskPaint();return result;};
const maskInit=projectInit;
projectInit=function(...args){
  const result=maskInit(...args);if(maskReady)return result;
  const panel=document.createElement('section');panel.id='mask-panel';panel.dataset.wpPart='content';
  panel.innerHTML='<h3>Media frame</h3><label>Mask shape<select id="mask-shape"><option value="rectangle">Rectangle</option><option value="rounded">Rounded rectangle</option><option value="circle">Circle</option><option value="oval">Oval</option></select></label><label>Sizing<select id="mask-fit"><option value="cover">Fill</option><option value="contain">Fit</option></select></label><label>Shadow<select id="mask-shadow"><option value="none">None</option><option value="soft">Soft</option><option value="strong">Strong</option></select></label><p>Adjustments preview here. Apply frame saves one Undo step.</p>';
  for(const [key,label,min,max,value]of [['zoom','Zoom',100,400,100],['x','Crop X',0,100,50],['y','Crop Y',0,100,50],['radius','Corner radius',0,50,12]]){
    const field=document.createElement('label');field.textContent=label;const input=document.createElement('input');input.id='mask-'+key;input.type='number';input.min=min;input.max=max;input.step=1;input.value=value;field.append(input);panel.append(field);
  }
  const crop=document.createElement('label');crop.innerHTML='<input type="checkbox" id="mask-crop-mode"> Drag media inside frame';
  panel.append(crop,componentButton('Apply frame',()=>maskCommit(maskRead())),componentButton('Reset crop',()=>{for(const [key,value]of [['zoom',100],['x',50],['y',50]])$('mask-'+key).value=value;numericRefreshScope(panel);maskPreview();}),componentButton('Remove frame',()=>maskCommit(null)));
  $('ci-notes').before(panel);
  for(const [key,label,value]of [['zoom','Media zoom',100],['x','Crop X',50],['y','Crop Y',50],['radius','Corner radius',12]])numericAttach($('mask-'+key),{label,unit:'%',default:value,staged:true,commit:maskPreview,preview:()=>numericPaint([ceFigure()?.querySelector('.media-viewport'),ceFigure()?.querySelector('.media-asset')],maskPreview)});
  for(const key of ['shape','fit','shadow'])$('mask-'+key).onchange=()=>{maskPreview();$('mask-radius').disabled=$('mask-shape').value!=='rounded';numericRefreshScope(panel);};
  // Capture before canvas placement handlers. Crop gestures are draft-only until Apply.
  document.addEventListener('pointerdown',event=>{
    const figure=event.target.closest('.media-box');
    if(!$('mask-crop-mode').checked||!figure||!projectPreviewNode?.contains(figure)||vbMode!=='edit'||event.button!==0||icSelection().locked||'media-'+(figure.dataset.objectId||'primary')!==maskTarget)return;
    event.preventDefault();event.stopImmediatePropagation();
    const rect=figure.getBoundingClientRect(),start={x:Number($('mask-x').value),y:Number($('mask-y').value),clientX:event.clientX,clientY:event.clientY},stamp=maskStamp();
    const move=next=>{if(maskStamp()!==stamp){end();return;}for(const [key,client,size]of [['x','clientX',rect.width],['y','clientY',rect.height]])$('mask-'+key).value=Math.round(Math.max(0,Math.min(100,start[key]-(next[client]-start[client])/size*100)));numericRefreshScope(panel);maskPreview();};
    const end=()=>{document.removeEventListener('pointermove',move,true);document.removeEventListener('pointerup',end,true);document.removeEventListener('pointercancel',cancel,true);window.removeEventListener('blur',cancel);};
    const cancel=()=>{end();if(maskStamp()!==stamp)return;$('mask-x').value=start.x;$('mask-y').value=start.y;numericRefreshScope(panel);maskPreview();};
    document.addEventListener('pointermove',move,true);document.addEventListener('pointerup',end,true);document.addEventListener('pointercancel',cancel,true);window.addEventListener('blur',cancel);
  },true);
  document.addEventListener('dblclick',event=>{const figure=event.target.closest('.media-box');if(!figure||!projectPreviewNode?.contains(figure)||vbMode!=='edit'||icSelection().locked)return;event.preventDefault();event.stopImmediatePropagation();ceSelect(figure.dataset.objectId||'primary');maskPaint();$('mask-crop-mode').checked=true;$('mask-zoom').focus();},true);
  maskReady=true;maskPaint();return result;
};
const maskLibraryList=componentList;
componentList=function(...args){
  const result=maskLibraryList(...args),category=$('component-category').value,search=$('component-search').value.toLowerCase();
  if(!['All','Media'].includes(category))return result;
  for(const [shape,name]of [['rectangle','Rectangle frame'],['rounded','Rounded frame'],['circle','Circle frame'],['oval','Oval frame']]){
    if(!(name+' image video mask placeholder').toLowerCase().includes(search))continue;
    const card=document.createElement('article'),preview=document.createElement('div'),title=document.createElement('h3'),hint=document.createElement('p');
    preview.className='component-card-preview mask-library-preview mask-library-'+shape;preview.setAttribute('aria-hidden','true');preview.textContent='Image / Video';title.textContent=name;hint.textContent='Replace placeholder media, adjust crop, or save your own styled frame.';
    card.append(preview,title,hint,componentButton('Insert '+name,()=>{
      const path='assets/media-frame-placeholder.svg',svg='<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480"><rect width="640" height="480" fill="#e4ebf0"/><path d="M100 360 240 180 350 300 420 230 560 360Z" fill="#7595a4"/><circle cx="450" cy="125" r="40" fill="#7595a4"/><text x="320" y="430" text-anchor="middle" font-family="Arial" font-size="24" fill="#18304b">Replace with your image or video</text></svg>';
      return componentInsert({name,entries:[{media:{kind:'image',src:path,name:'Media frame placeholder',alt:'Replace with your image or video',layout:'inset',frame:'none',canvas:{placement:{x:.35,y:.25,w:.4,h:.5}}},meta:{frame:{...maskDefault(),shape}}}],assets:{[path]:'data:image/svg+xml;base64,'+btoa(svg)}});
    }));$('component-items').append(card);
  }
  return result;
};
