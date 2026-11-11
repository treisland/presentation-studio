// Optional, guarded native-v3 metadata. Legacy v2 projects are not migrated
// merely by opening them; history/checkpoints also participate in the guard.
let bgReady=false,bgViewerMotion=true;
const bgControllers=new WeakMap();
function bgStates(pack){return [pack.state,...(pack.history?.past||[]),...(pack.history?.future||[]),...(pack.checkpoints||[]).map(item=>item.state)];}
function bgHasSettings(pack){const pending=bgStates(pack),seen=new Set();while(pending.length){const state=pending.pop();if(!state||seen.has(state))continue;seen.add(state);if(Object.hasOwn(state,'backgroundEffects'))return true;if(state.startingState)pending.push(state.startingState);}return false;}
const bgValidateState=projectValidateState;
projectValidateState=function(raw,...args){
  const state=bgValidateState(raw,...args);
  if(Object.hasOwn(raw,'backgroundEffects')){
    const ids=new Set([...state.slides,...state.trash,...(state.sectionTrash||[]).flatMap(section=>section.slides)].map(slide=>slide.id));
    state.backgroundEffects=bgEngine.settings(raw.backgroundEffects,ids);
  }return state;
};
const bgValidatePack=projectValidatePack;
projectValidatePack=function(raw){
  if(raw?.schemaVersion===2&&bgHasSettings(raw))throw Error('Background effects require native project format v3. Use Studio 0.12.0 or newer; do not downgrade the format.');
  if(raw?.schemaVersion===3){const pack=bgValidatePack({...raw,schemaVersion:2});pack.schemaVersion=3;return pack;}
  return bgValidatePack(raw);
};
const bgPack=projectPack;
projectPack=function(playback=false){
  const pack=bgPack(playback);
  if(playback&&pack.state.backgroundEffects){
    const settings=bgEngine.settings(pack.state.backgroundEffects,new Set(pack.state.slides.map(slide=>slide.id)));
    if(settings.defaults||Object.keys(settings.slides).length)pack.state.backgroundEffects=settings;else delete pack.state.backgroundEffects;
  }
  if(bgHasSettings(pack))pack.schemaVersion=3;return pack;
};
editingRegisterOperation('background.set',(state,operation)=>{
  const slide=editingSlide(state,operation.slideId);
  if(!['presentation','slide'].includes(operation.scope))editingFail('INVALID','Choose presentation or slide background.');
  if(operation.scope==='presentation'&&(state.editLocked||state.slides.some(item=>item.editLocked)))editingFail('LOCKED','Unlock the presentation and its slides before changing background defaults.');
  const current=state.backgroundEffects?bgEngine.settings(state.backgroundEffects):{version:1,defaults:null,slides:{}};
  if(operation.reset){if(operation.scope==='presentation')current.defaults=null;else delete current.slides[slide.id];}
  else{const config=bgEngine.clean(operation.config);if(operation.scope==='presentation')current.defaults=config;else current.slides[slide.id]=config;}
  if(current.defaults||Object.keys(current.slides).length)state.backgroundEffects=current;else delete state.backgroundEffects;
});
function bgPaint(root,state,id,motion=false,palette=studioPalette(state.brand)){
  if(!root)return;
  let controller=bgControllers.get(root);if(!controller){controller=bgEngine.mount(root);bgControllers.set(root,controller);}
  controller.update(bgEngine.resolve(state,id),palette,{motion:motion&&bgViewerMotion&&!nxMotionDisabled()&&!document.hidden,hidden:!visibilitySettings(state,id).decoration});
}
function bgSync(){
  if(!projectReady)return;
  document.body.classList.toggle('bg-motion-off',!bgViewerMotion||document.hidden||$('full-editor').open);
  bgPaint($('stage'),projectState,slides[index]?.dataset.mediaId,!$('full-editor').open);
  if(projectPreviewNode)bgPaint(projectPreviewNode,projectState,projectSelected,false);
  if(bgReady)bgRefreshPanels();
  const toggle=$('bg-viewer-motion');if(toggle){toggle.textContent=bgViewerMotion?'Pause background motion':'Allow background motion';toggle.setAttribute('aria-pressed',String(!bgViewerMotion));}
}
const bgRender=render;
render=function(...args){const result=bgRender(...args);if(bgReady)bgSync();return result;};
const bgRenderProject=projectRender;
projectRender=function(...args){const result=bgRenderProject(...args);if(bgReady)bgSync();return result;};
const bgPreview=projectPreview;
projectPreview=function(...args){const result=bgPreview(...args);if(bgReady)bgSync();return result;};
const bgStudioPreview=studioPreviewModel;
studioPreviewModel=function(model,parent,palette,...args){
  const root=bgStudioPreview(model,parent,palette,...args);
  if(projectReady){const state=model.previewLibrary||(parent.closest('#nx-wizard')?{...projectState,backgroundEffects:undefined}:projectState);bgPaint(root,state,model.id,false,palette||studioPalette(state.brand));}
  return root;
};
const bgThumbnail=weThumb;
weThumb=function(button,model,...args){const result=bgThumbnail(button,model,...args);const root=button.querySelector('.we-thumb-canvas');if(root)bgPaint(root,projectState,model.id,false);return result;};
const bgBoothData=boothExportData;
boothExportData=function(...args){const data=bgBoothData(...args);if(projectState.backgroundEffects){const ids=new Set(data.slides.map(slide=>slide.id)),settings=bgEngine.settings(projectState.backgroundEffects,ids);if(settings.defaults||Object.keys(settings.slides).length){data.backgroundEffects=settings;data.backgroundPalette=studioPalette(projectState.brand);}}return data;};
