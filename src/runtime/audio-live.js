const auDocumentKind=window.__studioAudienceBootstrap?.kind||'normal';
let auAudienceAlive=true,auLiveReady=false,auLeaseChannel=null,auRemoteOwner=false;
const auOwnerId=projectID('audio-owner');
const auLive=studioAudioPlayer({resolve:path=>mediaBlobs.has(path)?mediaAssetURL(path):mediaSafePath(path)?path:'',advance:id=>{if(slides[index]?.dataset.mediaId!==id||!playing)return;if(index===slides.length-1&&!projectIsLoop(deck)){setPlaying(false);auLive.end();return;}show(index+1);}});
function auCanOwn(){return auAudienceAlive&&(auDocumentKind==='audience'||auDocumentKind==='normal'&&!pvSession)&&!['live','preview','catalog','holding'].includes(auDocumentKind);}
function auLiveOwner(){return auCanOwn()&&!auRemoteOwner;}
function auLiveSync(){if(!projectReady)return;const masked=document.body.classList.contains('pv-blackout')||document.body.classList.contains('pv-holding'),editing=$('full-editor')?.open;
 auLive.sync({project:projectMeta.id,id:slides[index]?.dataset.mediaId,audio:projectState.audio,playing:playing&&!masked&&!editing,owner:auLiveOwner(),visible:true});
}
function auClaimAudio(){auRemoteOwner=false;auLeaseChannel?.postMessage({owner:auOwnerId,project:projectMeta.id});auLiveSync();}
const auPlaying=setPlaying;setPlaying=function(...args){const result=auPlaying(...args);auLiveSync();return result;};
const auLiveRender=render;render=function(...args){const result=auLiveRender(...args);auLiveSync();return result;};
const auLiveTick=tick;tick=function(...args){auLiveSync();return auLiveTick(...args);};
const auMediaHold=mediaHoldSlide;mediaHoldSlide=function(){return auLive.hold()||auMediaHold();};
const auLiveAccept=projectAcceptPack;projectAcceptPack=function(...args){auLive.dispose();auRemoteOwner=false;return auLiveAccept(...args);};
const auLiveEnd=pvEnd;pvEnd=function(...args){const result=auLiveEnd(...args);setPlaying(false);auLive.dispose();return result;};
const auLaunch=pvLaunch;pvLaunch=function(...args){auStopPreview();auLive.dispose();return auLaunch(...args);};
const auLiveInit=projectInit;projectInit=function(...args){const result=auLiveInit(...args);if(auLiveReady)return result;auLiveReady=true;
 if(auDocumentKind==='audience'||auDocumentKind==='normal'){
  const parent=auDocumentKind==='audience'?document.body:$('hub-player-more').querySelector('.hub-menu-items');auLive.mount(parent,'au-live',()=>{auClaimAudio();setPlaying(true);});
  // A separate audience window needs its own explicit activation; control-channel messages do not grant it.
  const enable=document.createElement('button');enable.id='au-enable-audio';enable.textContent='Enable audio and play';enable.className='au-enable-audio';enable.onclick=()=>{auClaimAudio();setPlaying(true);auLive.enable();};document.body.append(enable);
  const tickButton=()=>{const state=auLive.snapshot();enable.hidden=!projectState.audio||!auCanOwn()||state.enabled&&!state.failed||$('full-editor').open||document.body.classList.contains('pv-blackout')||document.body.classList.contains('pv-holding');};
  const previousSync=auLiveSync;auLiveSync=function(...values){const value=previousSync(...values);tickButton();return value;};
  $('play').addEventListener('click',()=>{if(playing&&auCanOwn()){auClaimAudio();auLive.enable();}});
  document.addEventListener('keydown',event=>{if(event.key===' '&&!event.target.closest('input,textarea,select,button,summary,[contenteditable]')&&playing&&auLiveOwner()&&!$('full-editor').open){auClaimAudio();auLive.enable();}});
  try{auLeaseChannel=new BroadcastChannel('presentation-studio-audio-owner');auLeaseChannel.onmessage=event=>{const value=event.data;if(!value||typeof value!=='object'||value.project!==projectMeta.id||value.owner===auOwnerId||typeof value.owner!=='string')return;auRemoteOwner=true;setPlaying(false);auLive.dispose();};}catch{/* Separate file origins may not share a channel; Presenter session ownership remains authoritative. */}
 }
 auLiveSync();return result;
};
addEventListener('beforeunload',()=>{auLive.dispose();auLeaseChannel?.close();if(pvSession)pvEnd();});

const auLiveShow=show;show=function(i){if(projectState?.audio&&i>=slides.length&&projectIsLoop(deck))auLive.restart();return auLiveShow(i);};
