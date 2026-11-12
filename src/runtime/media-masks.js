// Non-destructive frames: original media bytes and existing canvas placement stay intact.
function maskSettings(raw) {
  if(!raw||typeof raw!=='object'||!['rectangle','rounded','circle','oval'].includes(raw.shape)||!['cover','contain'].includes(raw.fit))editingFail('INVALID','Choose a supported mask and Fill or Fit.');
  const clean={shape:raw.shape,fit:raw.fit};
  if(raw.padding!=null){if(!Number.isFinite(raw.padding)||raw.padding<0||raw.padding>25)editingFail('INVALID','Border padding must be 0–25%.');clean.padding=raw.padding;}
  if(raw.shadow!=null){if(!['none','soft','strong'].includes(raw.shadow))editingFail('INVALID','Choose a supported frame shadow.');clean.shadow=raw.shadow;}
  for(const [key,min,max,fallback]of [['zoom',100,400,100],['x',0,100,50],['y',0,100,50],['radius',0,50,12]]){
    const value=raw[key]??fallback;if(!Number.isFinite(value)||value<min||value>max)editingFail('INVALID','Invalid mask '+key+'.');clean[key]=value;
  }
  return clean;
}
// Self-contained to share the exact renderer with the offline booth player.
function mediaMaskPaint(figure,frame,appearance={}) {
  const view=figure?.querySelector('.media-viewport'),asset=view?.querySelector('.media-asset');if(!asset)return;
  if(!figure.maskBaseAppearance){const style=getComputedStyle(figure);figure.maskBaseAppearance=figure.dataset.maskBase?JSON.parse(figure.dataset.maskBase):{fill:style.backgroundColor,border:style.borderColor,width:parseFloat(style.borderTopWidth)||0};figure.dataset.maskBase=JSON.stringify(figure.maskBaseAppearance);}
  const base=figure.maskBaseAppearance;
  figure.maskAppearance={...appearance};figure.maskFrame={...frame};
  let surface=view.parentElement;
  if(!surface.classList.contains('mask-surface')){surface=document.createElement('div');surface.className='mask-surface';view.before(surface);surface.append(view);}
  const palette=getComputedStyle(figure),fill=appearance.fill??figure.style.backgroundColor??base.fill;
  view.style.backgroundColor=fill||palette.getPropertyValue('--project-surface-alt').trim()||base.fill;
  view.style.overflow='hidden';
  view.style.clipPath=frame.shape==='circle'?'circle(closest-side at 50% 50%)':frame.shape==='oval'?'ellipse(50% 50% at 50% 50%)':frame.shape==='rounded'?'inset(0 round '+frame.radius+'%)':'inset(0)';
  view.style.borderRadius=frame.shape==='rounded'?frame.radius+'%':frame.shape==='oval'?'50%':'0';
  let content=view.querySelector(':scope > .mask-content');
  if(!content){content=document.createElement('div');content.className='mask-content';content.append(...view.childNodes);view.append(content);}
  const padding=frame.padding||0,innerRadius=Math.max(0,(frame.radius-padding)/(1-2*padding/100));
  content.style.inset=padding+'%';
  content.style.clipPath=frame.shape==='circle'?'circle(closest-side at 50% 50%)':frame.shape==='oval'?'ellipse(50% 50% at 50% 50%)':frame.shape==='rounded'?'inset(0 round '+innerRadius+'%)':'inset(0)';
  asset.style.objectFit=frame.fit;asset.style.objectPosition=frame.x+'% '+frame.y+'%';
  asset.style.transform='scale('+(frame.zoom/100)+')';asset.style.transformOrigin=frame.x+'% '+frame.y+'%';
  figure.classList.add('mask-frame');
  surface.style.filter=({none:'none',soft:'drop-shadow(0 8px 12px #0003)',strong:'drop-shadow(0 16px 24px #0006)'})[frame.shadow]||'none';
  let outline=surface.querySelector(':scope > .mask-outline');
  if(!outline){outline=document.createElementNS('http://www.w3.org/2000/svg','svg');outline.classList.add('mask-outline');outline.setAttribute('viewBox','0 0 100 100');outline.setAttribute('aria-hidden','true');surface.append(outline);}
  outline.setAttribute('preserveAspectRatio',frame.shape==='circle'?'xMidYMid meet':'none');
  const shape=document.createElementNS('http://www.w3.org/2000/svg',frame.shape==='circle'?'circle':frame.shape==='oval'?'ellipse':'rect');
  const geometry=frame.shape==='circle'?{cx:50,cy:50,r:50}:frame.shape==='oval'?{cx:50,cy:50,rx:50,ry:50}:{x:0,y:0,width:100,height:100,rx:frame.shape==='rounded'?frame.radius:0,ry:frame.shape==='rounded'?frame.radius:0};
  for(const [name,value]of Object.entries({...geometry,fill:'none',stroke:appearance.border||figure.style.borderColor||palette.getPropertyValue('--project-border').trim()||base.border,'stroke-width':appearance.width??(parseFloat(figure.style.borderWidth)||base.width),'vector-effect':'non-scaling-stroke'}))shape.setAttribute(name,String(value));
  outline.replaceChildren(shape);
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
function maskAppearance(style={},palette){return {...(style.fill!=null?{fill:spCSS(style.fill,palette)}:{}),...(style.border!=null?{border:spCSS(style.border,palette)}:{}),...(style.borderWidth!=null?{width:style.borderWidth}:{})};}
const maskApply=spApply;
spApply=function(slide,...args){const result=maskApply(slide,...args),model=projectReady&&projectModel(slide.dataset.mediaId);if(model)for(const entry of maskEntries(projectState,model))if(entry.meta.frame)mediaMaskPaint(spElement(slide,entry),entry.meta.frame,maskAppearance(entry.meta.style,args[0]));return result;};
let maskReady=false,maskIdentity='',maskTarget='',maskSnapshot=null,maskDraft=null,maskContext='';
const maskDefault=()=>({shape:'rectangle',fit:'cover',zoom:100,x:50,y:50,radius:12,padding:0,shadow:'none'});
function maskRead(){return maskSettings({shape:$('mask-shape').value,fit:$('mask-fit').value,shadow:$('mask-shadow').value,...Object.fromEntries(['zoom','x','y','radius','padding'].map(key=>[key,Number($('mask-'+key).value)]))});}
function maskStamp(){return JSON.stringify([projectMeta.id,projectSelected,editingRevision(),maskTarget,boothActive]);}
function maskRestorePreview(){
  if(!maskDraft)return;const draft=maskDraft;maskDraft=null;
  if(!draft.figure.isConnected)return;
  for(const [element,values]of draft.styles)for(const [key,value]of Object.entries(values))element.style[key]=value;
  draft.figure.classList.toggle('mask-frame',draft.masked);
  if(draft.frame)mediaMaskPaint(draft.figure,draft.frame,draft.appearance);
  else {const surface=draft.figure.querySelector('.mask-surface'),view=surface?.querySelector('.media-viewport');if(view){const content=view.querySelector('.mask-content');if(content)content.replaceWith(...content.childNodes);surface.before(view);surface.remove();}delete draft.figure.maskFrame;delete draft.figure.maskAppearance;}
}
function maskPreview(){try{
  const frame=maskRead(),figure=ceFigure();if(!figure)return;
  if(maskDraft?.figure!==figure){maskRestorePreview();maskDraft={figure,masked:figure.classList.contains('mask-frame'),frame:figure.maskFrame&&{...figure.maskFrame},appearance:figure.maskAppearance&&{...figure.maskAppearance},styles:[[figure,['boxShadow']],[figure.querySelector('.media-viewport'),['overflow','clipPath','borderRadius','backgroundColor']],[figure.querySelector('.media-asset'),['objectFit','objectPosition','transform','transformOrigin']]].filter(([element])=>element).map(([element,keys])=>[element,Object.fromEntries(keys.map(key=>[key,element.style[key]]))])};}
  mediaMaskPaint(figure,frame,figure.maskAppearance);
}catch{}}
function maskPaint(){
  if(!maskReady||!projectReady)return;
  if(boothActive||projectPlayback||projectDraftPending){maskRestorePreview();$('mask-panel').hidden=true;maskTarget='';return;}
  const context=icSelection(),entry=context.selected.length===1&&context.selected[0]?.kind==='media'?context.selected[0]:['media','grid'].includes(context.kind)?maskEntries(projectState,projectModel()).find(entry=>entry.object===ceSelected):null,panel=$('mask-panel');
  for(const id of ['ce-fit','ce-crop'])$(id).closest('label').hidden=!!entry?.meta.frame;
  panel.hidden=!entry||entry.kind!=='media';panel.dataset.icVisible=String(!panel.hidden);if(panel.hidden){maskRestorePreview();maskTarget='';return;}
  const identity=JSON.stringify([context.identity,entry.key,entry.meta.frame,studioEditing.read().revision]);
  if(identity!==maskIdentity){const nextContext=projectMeta.id+':'+projectSelected+':'+entry.key,keepCrop=maskTarget===entry.key&&maskContext===nextContext&&$('mask-crop-mode').checked;maskRestorePreview();maskContext=nextContext;maskIdentity=identity;maskTarget=entry.key;const frame={...maskDefault(),...entry.meta.frame};for(const key of ['shape','fit','zoom','x','y','radius','padding','shadow'])$('mask-'+key).value=String(frame[key]);maskSnapshot=studioEditing.read();$('mask-crop-mode').checked=keepCrop;}
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
  panel.innerHTML='<h3>Media frame</h3><label>Mask shape<select id="mask-shape"><option value="rectangle">Rectangle</option><option value="rounded">Rounded rectangle</option><option value="circle">Circle</option><option value="oval">Oval</option></select></label><label>Sizing<select id="mask-fit"><option value="cover">Fill</option><option value="contain">Fit</option></select></label><label>Shadow<select id="mask-shadow"><option value="none">None</option><option value="soft">Soft</option><option value="strong">Strong</option></select></label><p>Changes save immediately. Each adjustment can be undone.</p>';
  for(const [key,label,min,max,value]of [['zoom','Zoom',100,400,100],['x','Crop X',0,100,50],['y','Crop Y',0,100,50],['radius','Corner radius',0,50,12],['padding','Border padding',0,25,0]]){
    const field=document.createElement('label');field.textContent=label;const input=document.createElement('input');input.id='mask-'+key;input.type='number';input.min=min;input.max=max;input.step=1;input.value=value;field.append(input);panel.append(field);
  }
  const crop=document.createElement('label');crop.innerHTML='<input type="checkbox" id="mask-crop-mode"> Drag media inside frame';
  panel.append(crop,componentButton('Reset crop',()=>{for(const [key,value]of [['zoom',100],['x',50],['y',50]])$('mask-'+key).value=value;maskCommit(maskRead());}),componentButton('Remove frame',()=>maskCommit(null)));
  $('wp-fields').append(panel);
  for(const [key,label,value]of [['zoom','Media zoom',100],['x','Crop X',50],['y','Crop Y',50],['radius','Corner radius',12],['padding','Border padding',0]])numericAttach($('mask-'+key),{label,unit:'%',default:value,commit:()=>maskCommit(maskRead()),preview:()=>{const figure=ceFigure(),before=figure?.maskFrame&&{...figure.maskFrame},appearance=figure?.maskAppearance,styles=numericPaint([figure?.querySelector('.media-viewport'),figure?.querySelector('.media-asset')],maskPreview);return{paint:maskPreview,restore(){styles.restore();if(before)mediaMaskPaint(figure,before,appearance);else maskRestorePreview();}};}});
  for(const key of ['shape','fit','shadow'])$('mask-'+key).onchange=()=>maskCommit(maskRead());
  // Capture before canvas placement handlers; release saves a whole crop gesture.
  document.addEventListener('pointerdown',event=>{
    const figure=event.target.closest('.media-box');
    if(!$('mask-crop-mode').checked||!figure||!projectPreviewNode?.contains(figure)||vbMode!=='edit'||event.button!==0||icSelection().locked||'media-'+(figure.dataset.objectId||'primary')!==maskTarget)return;
    event.preventDefault();event.stopImmediatePropagation();
    const rect=figure.getBoundingClientRect(),start={x:Number($('mask-x').value),y:Number($('mask-y').value),clientX:event.clientX,clientY:event.clientY},stamp=maskStamp();
    const move=next=>{if(maskStamp()!==stamp){end();return;}for(const [key,client,size]of [['x','clientX',rect.width],['y','clientY',rect.height]])$('mask-'+key).value=Math.round(Math.max(0,Math.min(100,start[key]-(next[client]-start[client])/size*100)));numericRefreshScope(panel);maskPreview();};
    const key=event=>{if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();cancel();}};
    const end=event=>{document.removeEventListener('pointermove',move,true);document.removeEventListener('pointerup',end,true);document.removeEventListener('pointercancel',cancel,true);document.removeEventListener('keydown',key,true);window.removeEventListener('blur',cancel);if(event?.type==='pointerup'&&maskStamp()===stamp&&(Number($('mask-x').value)!==start.x||Number($('mask-y').value)!==start.y))maskCommit(maskRead());};
    const cancel=()=>{end();if(maskStamp()!==stamp)return;$('mask-x').value=start.x;$('mask-y').value=start.y;numericRefreshScope(panel);maskPreview();};
    document.addEventListener('pointermove',move,true);document.addEventListener('pointerup',end,true);document.addEventListener('pointercancel',cancel,true);document.addEventListener('keydown',key,true);window.addEventListener('blur',cancel);
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
