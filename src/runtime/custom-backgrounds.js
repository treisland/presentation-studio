const cbControllers=new WeakMap();
function cbImagePaths(pack){
  const paths=new Set(),pending=bgStates(pack),seen=new Set();
  while(pending.length){const state=pending.pop();if(!state||seen.has(state))continue;seen.add(state);for(const config of [state.backgrounds?.defaults,...Object.values(state.backgrounds?.slides||{})])if(config?.kind==='image')paths.add(config.asset);if(state.startingState)pending.push(state.startingState);}
  return paths;
}
async function cbValidateImage(blob){
  if(blob.size>50*1024*1024)throw Error('Background images must be no larger than 50 MB.');
  const url=URL.createObjectURL(blob),image=new Image();
  try{image.src=url;await image.decode();if(!image.naturalWidth||image.naturalWidth>16000||image.naturalHeight>16000)throw Error('Background images must be no larger than 16000 pixels per side.');}
  catch(error){throw Error('Invalid background image: '+error.message);}finally{URL.revokeObjectURL(url);}
}
const cbLoad=lwLoad;
lwLoad=async function(file,options={}){
  const result=await cbLoad(file,options);if(!result.pack)return result;
  for(const path of cbImagePaths(result.pack)){if(options.cancelled?.())throw Error('Import cancelled.');const blob=result.assets.get(path);if(!blob)throw Error('Missing background image: '+path+'. Open the complete editable ZIP.');await cbValidateImage(blob);}
  return result;
};
function cbHasSettings(pack){if(!pack||typeof pack!=='object')return false;const pending=bgStates(pack),seen=new Set();while(pending.length){const state=pending.pop();if(!state||seen.has(state))continue;seen.add(state);if(Object.hasOwn(state,'backgrounds'))return true;if(state.startingState)pending.push(state.startingState);}return false;}
const cbValidateState=projectValidateState;
projectValidateState=function(raw,...args){
  const state=cbValidateState(raw,...args);
  if(Object.hasOwn(raw,'backgrounds')){
    const ids=new Set([...state.slides,...state.trash,...(state.sectionTrash||[]).flatMap(s=>s.slides)].map(s=>s.id));
    state.backgrounds=cbEngine.settings(raw.backgrounds,ids);
  }
  return state;
};
const cbValidatePack=projectValidatePack;
projectValidatePack=function(raw){
  if(cbHasSettings(raw)&&raw?.schemaVersion!==4)throw Error('Custom backgrounds require native project format v4. Open with Studio v0.16 or newer; do not downgrade the format.');
  if(raw?.schemaVersion===4){const pack=cbValidatePack({...raw,schemaVersion:3});pack.schemaVersion=4;return pack;}
  return cbValidatePack(raw);
};
const cbPack=projectPack;
projectPack=function(playback=false){
  const pack=cbPack(playback);
  if(playback&&pack.state.backgrounds)pack.state.backgrounds=cbEngine.settings(pack.state.backgrounds,new Set(pack.state.slides.map(s=>s.id)));
  if(cbHasSettings(pack))pack.schemaVersion=4;
  return pack;
};
editingRegisterOperation('background.custom',(state,operation)=>{
  const slide=editingSlide(state,operation.slideId);
  if(!['presentation','slide'].includes(operation.scope))editingFail('INVALID','Choose Presentation or This slide.');
  if(operation.scope==='presentation'&&(state.editLocked||state.slides.some(s=>s.editLocked)))editingFail('LOCKED','Unlock the presentation and its slides before changing defaults.');
  const current=state.backgrounds?cbEngine.settings(state.backgrounds):{version:1,defaults:null,slides:Object.create(null)};
  if(operation.reset){if(operation.scope==='presentation')current.defaults=null;else delete current.slides[slide.id];}
  else {const config=cbEngine.clean(operation.config);if(operation.scope==='presentation')current.defaults=config;else current.slides[slide.id]=config;}
  if(current.defaults||Object.keys(current.slides).length)state.backgrounds=current;else delete state.backgrounds;
});
function cbPaint(root,state,id,resolver=mediaAssetURL){
  if(!root)return;
  let controller=cbControllers.get(root);if(!controller){controller=cbEngine.mount(root,resolver);cbControllers.set(root,controller);}
  controller.update(cbEngine.resolve(state,id),studioPalette(state.brand));
}
function cbSync(){
  if(!projectReady)return;
  cbPaint($('stage'),projectState,slides[index]?.dataset.mediaId);
  if(projectPreviewNode)cbPaint(projectPreviewNode,projectState,projectSelected);
}
const cbRender=render;
render=function(...args){const result=cbRender(...args);cbSync();return result;};
const cbPreview=projectPreview;
projectPreview=function(...args){const result=cbPreview(...args);cbSync();return result;};
const cbStudioPreview=studioPreviewModel;
studioPreviewModel=function(model,parent,palette,...args){const root=cbStudioPreview(model,parent,palette,...args);if(projectReady)cbPaint(root,model.previewLibrary||(parent.closest('#nx-wizard')?{...projectState,backgrounds:undefined}:projectState),model.id);return root;};
const cbThumbnail=weThumb;
weThumb=function(button,model,...args){const result=cbThumbnail(button,model,...args);const root=button.querySelector('.we-thumb-canvas');if(root)cbPaint(root,projectState,model.id);return result;};
const cbBoothData=boothExportData;
boothExportData=function(...args){const data=cbBoothData(...args);if(projectState.backgrounds){data.backgrounds=cbEngine.settings(projectState.backgrounds,new Set(data.slides.map(s=>s.id)));data.backgroundPalette=studioPalette(projectState.brand);}return data;};
const cbReviewSources=new WeakMap(),cbPreviewStage=paPreviewStage;
paPreviewStage=function(model,state=projectState){
  const root=cbPreviewStage(model,state),source=cbReviewSources.get(state);let config=cbEngine.resolve(state,model.id);
  const resolver=path=>{if(!source?.assets.has(path))return '';if(!source.urls.has(path))source.urls.set(path,URL.createObjectURL(source.assets.get(path)));return source.urls.get(path);};
  if(config?.kind==='image'&&!source?.assets.has(config.asset))config={kind:'solid',color:config.fallback};
  cbEngine.mount(root,resolver).update(config,studioPalette(state.brand||projectState.brand));return root;
};
const cbRenderReview=paRenderReview;
paRenderReview=function(candidate,summary){
  const source={assets:candidate.assets||new Map(),urls:new Map()},state=candidate.pack.state;cbReviewSources.set(state,source);
  let result;try{result=cbRenderReview(candidate,summary);}catch(error){for(const url of source.urls.values())URL.revokeObjectURL(url);cbReviewSources.delete(state);throw error;}
  const previous=lwPreviewCleanup;
  lwPreviewCleanup=()=>{previous();for(const url of source.urls.values())URL.revokeObjectURL(url);source.urls.clear();if(cbReviewSources.get(state)===source)cbReviewSources.delete(state);};return result;
};

// One pure plan supplies both staged previews and the atomic mutation.
function cbBulkPlan(state,op){
  if(!['presentation','slides'].includes(op.scope)||typeof op.replaceOverrides!=='boolean'||!Array.isArray(op.ids)||!op.ids.length||op.ids.length>1000||new Set(op.ids).size!==op.ids.length)editingFail('INVALID','Choose a distinct, nonempty background target set.');
  const requested=op.ids.map(id=>{const slide=state.slides.find(s=>s.id===id);if(!slide)editingFail('NOT_FOUND','Background target changed. Refresh the review.');return slide;});
  if(op.scope==='presentation'&&(op.ids.length!==state.slides.length||state.slides.some(s=>!op.ids.includes(s.id))))editingFail('STALE','The presentation changed. Refresh the background review.');
  const settings=state.backgrounds?cbEngine.settings(state.backgrounds):{version:1,defaults:null,slides:Object.create(null)},config=op.config==null?null:cbEngine.clean(op.config);
  const affected=requested.filter(s=>op.replaceOverrides||!settings.slides[s.id]).map(s=>s.id);
  if(op.scope==='presentation'){settings.defaults=config;if(op.replaceOverrides)for(const id of op.ids)delete settings.slides[id];}
  else for(const id of affected){if(config)settings.slides[id]=projectCopy(config);else delete settings.slides[id];}
  return {settings,requested:op.ids,affected,locked:requested.filter(s=>s.editLocked||state.editLocked).map(s=>s.id)};
}
editingRegisterOperation('background.bulk',(state,op)=>{
  const plan=cbBulkPlan(state,op);if(plan.locked.length)editingFail('LOCKED','Unlock every requested target before applying backgrounds. No slides were changed.');
  if(plan.settings.defaults||Object.keys(plan.settings.slides).length)state.backgrounds=plan.settings;else delete state.backgrounds;
});
editingRegisterOperation('background.resetAll',(state,op)=>{
  if(!Array.isArray(op.ids)||op.ids.length!==state.slides.length||new Set(op.ids).size!==state.slides.length||state.slides.some(s=>!op.ids.includes(s.id)))editingFail('STALE','The presentation changed. Review Reset all backgrounds again.');
  if(state.editLocked||state.slides.some(s=>s.editLocked))editingFail('LOCKED','Unlock every slide before resetting backgrounds.');
  delete state.backgrounds;
});
