const visibilityParts={header:'Header',footer:'Footer',logo:'Logo',number:'Slide number',decoration:'Decorations'};
let visibilityShowHidden=false;
function visibilityClean(raw,state){
  if(!raw)return{defaults:{},slides:{},groups:{}};
  if(typeof raw!=='object'||Array.isArray(raw))editingFail('INVALID','Invalid visibility settings.');
  const cleanParts=value=>{if(!value||typeof value!=='object'||Array.isArray(value))editingFail('INVALID','Invalid visibility overrides.');const result={};for(const [key,visible]of Object.entries(value)){if(!Object.hasOwn(visibilityParts,key)||typeof visible!=='boolean')editingFail('INVALID','Invalid visibility option.');result[key]=visible;}return result;};
  const result={defaults:cleanParts(raw.defaults||{}),slides:Object.create(null),groups:Object.create(null)};
  const ids=new Set([...state.slides,...(state.trash||[]),...(state.sectionTrash||[]).flatMap(section=>section.slides)].map(slide=>slide.id));
  for(const [id,parts]of Object.entries(raw.slides||{}))if(ids.has(id))result.slides[id]=cleanParts(parts);
  for(const [id,groups]of Object.entries(raw.groups||{}))if(ids.has(id)){result.groups[id]={};for(const [group,hidden]of Object.entries(groups)){if(!/^group-[\w-]+$/.test(group)||typeof hidden!=='boolean')editingFail('INVALID','Invalid group visibility.');result.groups[id][group]=hidden;}}
  return result;
}
const visibilityValidate=projectValidateState;
projectValidateState=function(raw,...args){const state=visibilityValidate(raw,...args);if(raw.visibility)state.visibility=visibilityClean(raw.visibility,state);return state;};
function visibilitySettings(state,id){return{header:true,footer:true,logo:true,number:true,decoration:true,...state.visibility?.defaults,...state.visibility?.slides?.[id]};}
function visibilityEntryHidden(state,id,entry){return!!entry.meta.hidden||!!entry.media?.canvas?.hidden||!!state.visibility?.groups?.[id]?.[entry.meta.group]||!!(entry.node&&projectFind({tree:[entry.node]},node=>mgHas(node,'terminal')).length&&state.slides.find(slide=>slide.id===id)?.commands?.hidden);}
editingRegisterOperation('visibility.chrome',(state,operation)=>{
  const slide=editingSlide(state,operation.slideId);state.visibility=visibilityClean(state.visibility,state);
  if(!['slide','presentation'].includes(operation.scope))editingFail('INVALID','Choose slide or presentation visibility.');
  if(operation.scope==='presentation'&&(state.editLocked||state.slides.some(item=>item.editLocked)))editingFail('LOCKED','Unlock the presentation and slides before changing defaults.');
  if(operation.reset){if(operation.scope!=='slide')editingFail('INVALID','Reset the selected slide to presentation defaults.');delete state.visibility.slides[slide.id];return;}
  if(!Object.hasOwn(visibilityParts,operation.part)||typeof operation.visible!=='boolean')editingFail('INVALID','Choose a visibility option.');
  const target=operation.scope==='presentation'?state.visibility.defaults:(state.visibility.slides[slide.id]??={});
  target[operation.part]=operation.visible;
});
function visibilitySet(state,operation,created){
  const slide=editingSlide(state,operation.slideId),entries=componentTargets(state,slide,operation.keys,false);state.visibility=visibilityClean(state.visibility,state);
  for(const entry of entries){
    if(entry.meta.group){const peers=spEntries(slide,state).filter(item=>item.meta.group===entry.meta.group);if(peers.some(spProtected))editingFail('LOCKED','Unlock every group member first.');(state.visibility.groups[slide.id]??={})[entry.meta.group]=!operation.visible;}
    else dbOperation(state,{type:'design.meta',slideId:slide.id,keys:[entry.key],changes:{hidden:!operation.visible}},created);
    if(!entry.meta.group){
      if(entry.media?.canvas?.hidden&&operation.visible)entry.media.canvas.hidden=false;
      if(entry.node&&projectFind({tree:[entry.node]},node=>mgHas(node,'terminal')).length&&slide.commands)slide.commands=commandNormalize({...commandEditable(slide.commands),hidden:!operation.visible});
    }
  }
}
editingRegisterOperation('visibility.element',(state,operation,created)=>{if(typeof operation.visible!=='boolean')editingFail('INVALID','Choose show or hide.');visibilitySet(state,operation,created);});
editingRegisterOperation('design.meta',(state,operation,created)=>{
  if(operation.changes&&Object.keys(operation.changes).length===1&&typeof operation.changes.hidden==='boolean')visibilitySet(state,{...operation,visible:!operation.changes.hidden},created);
  else dbOperation(state,operation,created);
});
const visibilityCodeUpdate=editingOperations.get('code.update');
editingOperations.set('code.update',(state,operation,created)=>{
  const slide=editingSlide(state,operation.slideId),wasHidden=!!slide.commands?.hidden;visibilityCodeUpdate(state,operation,created);
  if(wasHidden&&!slide.commands?.hidden)for(const entry of spEntries(slide,state))if(entry.node&&projectFind({tree:[entry.node]},node=>mgHas(node,'terminal')).length){const meta=spData(state,slide.id,true).objects[entry.key];if(meta)meta.hidden=false;if(entry.meta.group&&state.visibility?.groups?.[slide.id])state.visibility.groups[slide.id][entry.meta.group]=false;}
});
function visibilityChrome(root,state,id){
  const settings=visibilitySettings(state,id),selectors={header:':scope > header',footer:':scope > footer',logo:'.project-logo,header .brand img',number:'footer #counter,footer .meta > :last-child',decoration:':scope > .grid,:scope > .orb'};
  for(const [part,selector]of Object.entries(selectors))for(const element of root.querySelectorAll(selector))element.classList.toggle('visibility-concealed',!settings[part]);
}
function visibilityPaintSlide(slide){
  const id=slide.dataset.mediaId,model=projectModel(id);if(!model)return;
  for(const entry of spEntries(model)){const element=spElement(slide,entry);if(element){const hidden=visibilityEntryHidden(projectState,id,entry);element.classList.toggle('sp-hidden',hidden);if(entry.kind==='grid')for(const figure of slide.querySelectorAll('.media-box[data-mg-cell]'))figure.classList.toggle('sp-hidden',hidden||!!mgConfig(projectState,id,figure.dataset.objectId)?.canvas?.hidden);}}
}
// Native hidden/display:none would collapse template content before the shared
// visibility pass. Keep each renderer's model flag, but conceal its existing box.
const visibilityCommandPaint=commandPaint;
commandPaint=function(node,raw){const result=visibilityCommandPaint(node,raw),terminal=node.querySelector('.terminal');if(terminal&&raw){terminal.hidden=false;const block=terminal.closest('.data-block');if(block)block.hidden=false;terminal.classList.toggle('visibility-code-hidden',!!raw.hidden);}return result;};
const visibilityCanvasStyle=ceStyle;
ceStyle=function(figure,cfg,slide){const result=visibilityCanvasStyle(figure,cfg,slide);if(cfg.canvas){figure.hidden=false;figure.classList.remove('ce-hidden');figure.classList.toggle('sp-hidden',!!cfg.canvas.hidden);}return result;};
const visibilityApply=spApply;
spApply=function(slide,...args){const result=visibilityApply(slide,...args);if(projectReady)visibilityPaintSlide(slide);return result;};
const visibilityRender=render;
render=function(...args){const result=visibilityRender(...args);if(projectReady&&slides[index])visibilityChrome($('stage'),projectState,slides[index].dataset.mediaId);return result;};
const visibilityPreview=projectPreview;
projectPreview=function(...args){const result=visibilityPreview(...args);$('fe-preview')?.classList.toggle('visibility-show-hidden',visibilityShowHidden);if(projectPreviewNode){visibilityChrome(projectPreviewNode,projectState,projectSelected);const slide=projectPreviewNode.querySelector('.slide');if(slide)visibilityPaintSlide(slide);}visibilityPanel();return result;};
const visibilityPack=projectPack;
// Playback retains only finite layout enums after excluding a hidden primary
// assignment. Recreate the usual DOM pane, keeping model roots/IDs unchanged.
function visibilityMediaLayout(slide){
  const layout=['right','left','below','full','background','inset'].find(value=>slide.classList.contains('visibility-layout-'+value));
  if(!layout)return false;
  if(slide.querySelector(':scope > .media-original'))return true;
  const pane=document.createElement('div');pane.className='media-original';
  for(const node of [...slide.childNodes])if(!node.matches?.('.db-block,.media-box,.mg-grid'))pane.append(node);
  slide.prepend(pane);slide.classList.add('media-on','media-'+layout);
  const corner=['right-bottom','left-bottom','right-top','left-top'].find(value=>slide.classList.contains('visibility-corner-'+value));
  if(corner)slide.classList.add('corner-'+corner);
  slide.style.setProperty('--media-share',slide.classList.contains('visibility-ratio-media')?'62%':slide.classList.contains('visibility-ratio-text')?'38%':'50%');
  if(slide.classList.contains('visibility-layout-free'))slide.classList.add('ce-free');
  if(layout==='below')pane.style.height='auto';
  return true;
}
const visibilityMediaApply=mediaApply;
mediaApply=function(slide){
  const result=visibilityMediaApply(slide);
  if(!mediaGetAssignment(slide.dataset.mediaId)&&visibilityMediaLayout(slide))spApply(slide);
  return result;
};
function visibilitySpacer(node,element){
  // Playback omits content and stable identities, retaining only the measured
  // empty layout box. Reuse the existing portable template-placeholder format.
  // Grid roots are validated configuration, not layout boxes. Their rendered
  // media frames are omitted separately; an empty grid would fail reimport.
  if(!element||mgHas(node,'mg-grid')||['absolute','fixed'].includes(getComputedStyle(element).position))return null;
  const tokens=(node.attrs?.class||'').split(/\s+/).filter(token=>token&&!/^(?:block|layer)-/.test(token));
  const attrs={class:[...tokens,'tp-placeholder','tp-w-'+element.offsetWidth,'tp-h-'+element.offsetHeight].join(' ')};
  if(node.attrs?.style)attrs.style=node.attrs.style;
  return{tag:node.tag==='img'?'div':node.tag,attrs,children:[]};
}
projectPack=function(playback=false){
  const pack=visibilityPack(playback);if(!playback)return pack;
  for(const slide of pack.state.slides){
    const entries=spEntries(slide,pack.state),hidden=entries.filter(entry=>visibilityEntryHidden(pack.state,slide.id,entry));
    const hiddenMedia=new Set(hidden.flatMap(entry=>entry.kind==='grid'?entry.node.children.map(mgObjectID).filter(Boolean):entry.object?[entry.object]:[]));
    const source=allSlides.find(element=>element.dataset.mediaId===slide.id),model=projectModel(slide.id),sourceEntries=model?spEntries(model):[];
    slide.tree=slide.tree.flatMap(node=>{
      const entry=hidden.find(entry=>entry.node===node);if(!entry)return[node];
      const original=sourceEntries.find(item=>item.key===entry.key),element=source&&original&&spElement(source,original),spacer=visibilitySpacer(node,element);
      return spacer?[spacer]:[];
    });
    if(hiddenMedia.has('primary')){
      const cfg=pack.state.media[slide.id];
      if(cfg&&source?.querySelector(':scope > .media-original')&&['right','left','below','full','background','inset'].includes(cfg.layout)){
        const ratio=['media','text'].includes(cfg.ratio)?cfg.ratio:'equal',corner=String(cfg.corner).replace(' ','-');
        const markers=['visibility-layout-'+cfg.layout,'visibility-ratio-'+ratio];
        if(['right-bottom','left-bottom','right-top','left-top'].includes(corner))markers.push('visibility-corner-'+corner);
        if(cfg.canvas?.placement)markers.push('visibility-layout-free');
        slide.classes+=' '+markers.join(' ');
      }
      delete pack.state.media[slide.id];
    }
    if(pack.state.mediaObjects?.[slide.id])pack.state.mediaObjects[slide.id]=pack.state.mediaObjects[slide.id].filter(item=>!hiddenMedia.has(item.id));
    if(slide.commands?.hidden||!projectFind(slide,node=>mgHas(node,'terminal')).length)slide.commands=null;
  }return pack;
};
function visibilityPanel(){
  if(!$('visibility-scope')||!projectReady)return;
  const scope=$('visibility-scope').value,settings=scope==='presentation'?{header:true,footer:true,logo:true,number:true,decoration:true,...projectState.visibility?.defaults}:visibilitySettings(projectState,projectSelected);
  for(const part of Object.keys(visibilityParts)){$('visibility-'+part).checked=settings[part];$('visibility-'+part).disabled=ceLocked()||(scope==='presentation'&&projectState.slides.some(slide=>slide.editLocked));$('visibility-'+part+'-source').textContent=scope==='presentation'?'Presentation default':Object.hasOwn(projectState.visibility?.slides?.[projectSelected]||{},part)?'Slide override':'Inherited';}
  const keys=spActiveKeys(),entries=spEntries().filter(entry=>keys.includes(entry.key));$('visibility-hide').disabled=!entries.length||entries.some(spProtected)||ceLocked();$('visibility-reveal').disabled=$('visibility-hide').disabled;
}
const visibilitySelectionPaint=spPaint;
spPaint=function(...args){const result=visibilitySelectionPaint(...args);visibilityPanel();return result;};
const visibilityInit=projectInit;
projectInit=function(){
  visibilityInit();const panel=document.createElement('section');panel.id='visibility-panel';panel.dataset.wpPart='style';panel.innerHTML='<h3>Visibility</h3><div><button id="visibility-hide">Hide selected</button><button id="visibility-reveal">Show selected</button></div><label><input id="visibility-show-hidden" type="checkbox"> Show hidden elements in editor</label><label>Apply chrome settings to<select id="visibility-scope"><option value="slide">This slide</option><option value="presentation">Presentation defaults</option></select></label>';
  for(const [part,name]of Object.entries(visibilityParts)){const label=document.createElement('label'),input=document.createElement('input'),source=document.createElement('small');input.type='checkbox';input.id='visibility-'+part;source.id=input.id+'-source';label.append(input,document.createTextNode(' '+name+' '),source);panel.append(label);input.onchange=()=>componentRun({type:'visibility.chrome',scope:$('visibility-scope').value,part,visible:input.checked});}
  panel.append(componentButton('Reset slide visibility to defaults',()=>componentRun({type:'visibility.chrome',scope:'slide',reset:true})));$('wp-fields').prepend(panel);
  $('visibility-scope').onchange=visibilityPanel;$('visibility-show-hidden').onchange=()=>{visibilityShowHidden=$('visibility-show-hidden').checked;projectPreview();};
  $('visibility-hide').onclick=()=>componentRun({type:'visibility.element',keys:spActiveKeys(),visible:false});$('visibility-reveal').onclick=()=>componentRun({type:'visibility.element',keys:spActiveKeys(),visible:true});visibilityPanel();
};
