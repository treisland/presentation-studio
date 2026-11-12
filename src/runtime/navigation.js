// Optional actions live with existing per-object design metadata, never executable HTML.
function navAction(raw) {
  if (!raw || typeof raw !== 'object' || !['slide','next','previous','url'].includes(raw.type)) editingFail('INVALID','Choose a supported link action.');
  if (raw.type === 'slide') {
    if (typeof raw.slideId !== 'string' || !/^[\w-]{1,200}$/.test(raw.slideId)) editingFail('INVALID','Choose a destination slide.');
    return {type:'slide',slideId:raw.slideId};
  }
  if (raw.type === 'url') {
    let url; try { url = new URL(raw.url); } catch { editingFail('INVALID','Enter a complete http:// or https:// URL.'); }
    if (!['http:','https:'].includes(url.protocol) || url.username || url.password || url.href.length > 4000) editingFail('INVALID','Use an HTTP(S) URL without embedded credentials.');
    return {type:'url',url:url.href};
  }
  return {type:raw.type};
}
editingRegisterOperation('navigation.set',(state,operation)=>{
  const slide=editingSlide(state,operation.slideId),targets=componentTargets(state,slide,operation.keys,false),action=operation.action?navAction(operation.action):null;
  if (action?.type==='slide' && !state.slides.some(item=>item.id===action.slideId)) editingFail('NOT_FOUND','The destination slide no longer exists.');
  for (const entry of targets) {
    const meta=spData(state,slide.id,true).objects[entry.key]??={};
    if(action)meta.action=action;else delete meta.action;
  }
});
for (const [type,name,label] of [['button','Button','Continue'],['outline-button','Outline button','Learn more'],['text-link','Text link','Open resource'],['navigation-arrow','Navigation arrow','Next →']]) componentRegister(type,{name,category:'Shapes',description:'Editable label with optional slide or external link',buttonLabel:label});
const navCreate=editingOperations.get('block.create');
editingOperations.set('block.create',(state,operation,created)=>{
  const definition=componentTypes.get(operation.kind);
  if(!definition?.buttonLabel)return navCreate(state,operation,created);
  navCreate(state,{...operation,kind:'text',placement:operation.placement||{x:.55,y:.35,w:.26,h:.12}},created);
  const node=editingSlide(state,operation.slideId).tree.find(item=>dbID(item)===created.at(-1));
  node.attrs.class+=' nav-button nav-'+operation.kind;
  node.children=[projectNode('p','',[operation.label||definition.buttonLabel])];
});

// Also serialized into standalone booth exports. Callbacks own navigation context.
function navigationWire(element,action,activate,enabled=true) {
  if(!element)return;
  element.classList.add('nav-linked');
  let target=element;
  if(element.classList.contains('media-box')) {
    target=element.querySelector(':scope > .nav-media-link');
    if(!target){target=document.createElement('button');target.type='button';target.className='nav-media-link';target.textContent='Open link ↗';element.append(target);}
  }
  if(enabled)target.tabIndex=0;
  if(target.classList.contains('nav-media-link')){target.hidden=!enabled;target.tabIndex=enabled?0:-1;}
  element.dataset.navAction=action.type;
  if(!['A','BUTTON'].includes(target.tagName)){if(enabled)target.setAttribute('role','link');else if(target.getAttribute('role')==='link')target.removeAttribute('role');}
  if(!target.getAttribute('aria-label'))target.setAttribute('aria-label',(target.textContent.trim()||element.querySelector('img')?.alt||'Media')+' — '+(action.type==='url'?'opens in new tab':'slide navigation'));
  if(target.navigationClick)target.removeEventListener('click',target.navigationClick,true);
  target.navigationClick=event=>{
    if(!enabled){if(event.target.closest('a'))event.preventDefault();return;}
    if(event.target.closest('.mf-expand,video,input,select,.db-handle,.ce-placement-handle'))return;
    event.preventDefault();event.stopImmediatePropagation();if(enabled)run();
  };
  target.addEventListener('click',target.navigationClick,true);
  target.onkeydown=event=>{if(enabled&&event.target===target&&['Enter',' '].includes(event.key)){event.preventDefault();event.stopPropagation();run();}};
  function run(){const message=activate(action);if(typeof message!=='string')return;let status=element.querySelector(':scope > .nav-status');if(!status){status=document.createElement('span');status.className='nav-status';status.setAttribute('role','status');element.append(status);}status.textContent=message;}
}
function navActivate(action,slideId) {
  if(boothActive&&!(action.type==='url'?boothOptions().links:boothOptions().navigation))return;
  if(action.type==='url'){window.open(navAction(action).url,'_blank','noopener,noreferrer');return;}
  const target=action.type==='slide'?action.slideId:projectState.slides[projectState.slides.findIndex(item=>item.id===slideId)+(action.type==='next'?1:-1)]?.id;
  if(!target||!projectState.slides.some(item=>item.id===target))return 'Link destination unavailable.';
  if(weEditing()) {projectSelected=target;projectBlockPath='';projectTablePath='';projectList();projectForm();projectPreview();return;}
  const destination=slides.findIndex(item=>item.dataset.mediaId===target);
  if(destination<0)return 'Link destination is outside the current playback loop.';
  show(destination);
}
const navApply=spApply;
spApply=function(slide,...args){
  const result=navApply(slide,...args),model=projectReady&&projectModel(slide.dataset.mediaId);
  if(model)for(const entry of spEntries(model))if(entry.meta.action)navigationWire(spElement(slide,entry),entry.meta.action,action=>navActivate(action,model.id),!weEditing()||vbMode!=='edit');
  return result;
};
// Preview assembly copies markup from an inert miniature; bind the final DOM.
const navigationPreview=projectPreview;
projectPreview=function(...args){const result=navigationPreview(...args);const slide=projectPreviewNode?.querySelector('.slide');if(slide)spApply(slide);return result;};
let navigationReady=false,navIdentity='';
function navPaint(){
  if(!navigationReady||!projectReady)return;
  if(boothActive||projectPlayback||projectDraftPending){$('nav-panel').hidden=true;return;}
  const context=icSelection(),panel=$('nav-panel'),entries=context.selected;
  panel.hidden=entries.length!==1;panel.dataset.icVisible=String(!panel.hidden);
  if(panel.hidden)return;
  const entry=entries[0],action=entry.meta.action;
  const signature=JSON.stringify([context.identity,action,projectState.slides.map(item=>[item.id,item.title])]);
  if(signature!==navIdentity){navIdentity=signature;
    panel.open=!!action||!!entry.node?.attrs?.class?.includes('nav-button');
    $('nav-type').value=action?.type||'';$('nav-url').value=action?.url||'';
    $('nav-slide').replaceChildren(new Option('Choose slide…',''),...projectState.slides.map((item,index)=>new Option((index+1)+'. '+item.title,item.id)));
    if(action?.type==='slide'&&!projectState.slides.some(item=>item.id===action.slideId))$('nav-slide').add(new Option('Missing destination',action.slideId));
    $('nav-slide').value=action?.slideId||'';
  }
  for(const input of panel.querySelectorAll('input,select,button'))input.disabled=context.locked;
  $('nav-url-field').hidden=$('nav-type').value!=='url';$('nav-slide-field').hidden=$('nav-type').value!=='slide';
  const destination=projectModel($('nav-slide').value),preview=$('nav-destination-preview');preview.hidden=$('nav-type').value!=='slide'||!destination;
  if(!preview.hidden&&preview.dataset.signature!==destination.id+editingRevision()){preview.dataset.signature=destination.id+editingRevision();studioPreviewModel(destination,preview);}
  $('nav-warning').textContent=action?.type==='slide'&&!projectState.slides.some(item=>item.id===action.slideId)?'Destination deleted. Choose another slide.':'';
}
const navPaintInspector=icPaint;
icPaint=function(...args){const result=navPaintInspector(...args);navPaint();return result;};
const navigationInit=projectInit;
projectInit=function(...args){
  const result=navigationInit(...args);if(navigationReady)return result;
  const panel=document.createElement('details');panel.id='nav-panel';panel.dataset.wpPart='content';
  panel.innerHTML='<summary>On click</summary><label>Action<select id="nav-type"><option value="">None</option><option value="slide">Go to slide</option><option value="next">Next slide</option><option value="previous">Previous slide</option><option value="url">Open URL in new tab</option></select></label><label id="nav-slide-field">Destination<select id="nav-slide"></select></label><label id="nav-url-field">External URL<input id="nav-url" type="url" placeholder="https://example.com"></label><p id="nav-warning" role="status"></p><button id="nav-apply" type="button">Apply action</button>';
  const preview=document.createElement('div');preview.id='nav-destination-preview';preview.className='nav-destination-preview';preview.setAttribute('aria-label','Destination slide preview');panel.append(preview);
  $('ci-notes').before(panel);
  $('nav-type').onchange=navPaint;$('nav-slide').onchange=navPaint;
  $('nav-apply').onclick=()=>{const type=$('nav-type').value;spRun({type:'navigation.set',keys:spActiveKeys(),action:type?{type,slideId:$('nav-slide').value,url:$('nav-url').value}:null});navIdentity='';navPaint();};
  navigationReady=true;navPaint();return result;
};

