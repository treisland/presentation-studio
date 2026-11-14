function auStates(pack){const pending=pack?.state?bgStates(pack):[pack],states=[],seen=new Set();while(pending.length){const state=pending.pop();if(!state||seen.has(state))continue;seen.add(state);states.push(state);if(state.startingState)pending.push(state.startingState);}return states;}
function auHas(pack){return auStates(pack).some(state=>Object.hasOwn(state,'audio'));}
const auValidateState=projectValidateState;
projectValidateState=function(raw,...args){const state=auValidateState(raw,...args);if(Object.hasOwn(raw,'audio'))state.audio=audioCore.settings(raw.audio,new Set([...state.slides,...state.trash,...(state.sectionTrash||[]).flatMap(s=>s.slides)].map(s=>s.id)));return state;};
const auValidatePack=projectValidatePack;
projectValidatePack=function(raw){
  if(auHas(raw)&&raw?.schemaVersion!==5)throw Error('Audio requires native project format v5. Use an audio-capable Studio; do not downgrade the format.');
  if(raw?.schemaVersion===5){const pack=auValidatePack({...raw,schemaVersion:cbHasSettings(raw)?4:bgHasSettings(raw)?3:2});pack.schemaVersion=5;return pack;}
  return auValidatePack(raw);
};
const auPack=projectPack;
projectPack=function(playback=false){const pack=auPack(playback);if(playback&&pack.state.audio){const keep=new Set(pack.state.slides.map(s=>s.id));pack.state.audio.slides=Object.fromEntries(Object.entries(pack.state.audio.slides).filter(([id])=>keep.has(id)));}if(auHas(pack))pack.schemaVersion=5;return pack;};
const auLoad=lwLoad;
lwLoad=async function(file,options={}){
 const result=await auLoad(file,options);if(!result.pack)return result;const checked=new Map();
 for(const state of auStates(result.pack))for(const track of audioCore.tracks(state)){
  if(options.cancelled?.())throw Error('Import cancelled.');const blob=result.assets.get(track.src);
  if(!blob)throw Error('Missing audio asset: '+track.name+'. Open the complete editable ZIP.');
  if(blob.size!==track.bytes)throw Error('Audio asset size does not match: '+track.name);
  const key=JSON.stringify([track.src,track.name,track.mime]);let info=checked.get(key);
  if(!info){info=await audioCore.probe(blob,track.name,track.mime);checked.set(key,info);}
  if(Math.abs(info.durationMs-track.durationMs)>100)throw Error('Audio duration does not match: '+track.name);
 }
 return result;
};
editingRegisterOperation('audio.settings',(state,op)=>{
 editingSlide(state,op.slideId);
 if(!['slide','overall','music','mode'].includes(op.role))editingFail('INVALID','Choose an audio role.');
 if(op.role!=='slide'&&state.slides.some(s=>s.editLocked))editingFail('LOCKED','Unlock every slide before changing presentation audio.');
 const audio=state.audio?audioCore.settings(state.audio):audioCore.empty();
 if(op.role==='mode'){if(!['none','slide','overall'].includes(op.mode))editingFail('INVALID','Choose a narration mode.');audio.mode=op.mode;}
 else if(op.role==='slide'){if(op.track===null)delete audio.slides[op.slideId];else audio.slides[op.slideId]=audioCore.track(op.track,'slide');}
 else audio[op.role]=audioCore.track(op.track,op.role);
 if(audio.mode==='none'&&!Object.keys(audio.slides).length&&!audio.overall&&!audio.music)delete state.audio;else state.audio=audio;
});
const auBooth=boothExportData;
boothExportData=function(...args){const data=auBooth(...args);if(projectState.audio){data.audio=audioCore.settings(projectState.audio);const ids=new Set(data.slides.map(s=>s.id));data.audio.slides=Object.fromEntries(Object.entries(data.audio.slides).filter(([id])=>ids.has(id)));}return data;};
const auComponentSave=componentSave;
componentSave=function(...args){if(projectState.audio?.slides?.[projectSelected]){projectMessage('Slide narration is not supported by the current component format. Save the complete editable ZIP to retain audio.');return;}return auComponentSave(...args);};
