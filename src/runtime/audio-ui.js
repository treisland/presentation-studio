let auUIReady=false,auUIBusy=false,auPreview=null,auPreviewIdentity='',auUIEpoch=0;
const auCards=new Map();
function auIdentity(){return JSON.stringify([projectMeta.id,projectSelected,editingRevision()]);}
function auTrack(role){const audio=projectState.audio;return role==='slide'?audio?.slides?.[projectSelected]:audio?.[role];}
function auStatus(message){const settings=$('we-settings')?.open;for(const [id,active]of [['au-status',settings],['au-slide-status',!settings]])if($(id))$(id).textContent=active?message:'';}
function auStopPreview(){if(auPreview){auPreview.pause();auPreview.removeAttribute('src');auPreview.load();auPreview=null;}auPreviewIdentity='';for(const card of auCards.values())card.preview.textContent='Play preview';}
function auLocked(role){const slide=projectModel();return !weEditing()||vbMode!=='edit'||projectDraftPending||boothActive||projectState.editLocked||!slide||slide.editLocked||role!=='slide'&&projectState.slides.some(s=>s.editLocked);}
function auApply(role,track,mode){
 const snapshot=studioEditing.read(),result=studioEditing.apply({apiVersion:1,projectId:snapshot.projectId,expectedRevision:snapshot.revision,operations:[{type:'audio.settings',role,slideId:projectSelected,...role==='mode'?{mode}:{track}}]});
 if(!result.ok)throw Error(result.message);return result;
}
function auChange(role,changes){try{if(auLocked(role))return;projectFlush();const old=auTrack(role);if(!old)return;auStopPreview();auApply(role,{...old,...changes});auStatus('Audio settings updated. Export an editable ZIP for a portable backup.');}catch(error){auStatus(error.message);auPaint();}}
async function auAttach(role,file){
 if(!file||auLocked(role)||auUIBusy)return;projectFlush();const identity=auIdentity(),epoch=++auUIEpoch;let remembered='';auUIBusy=true;auPaint();auStatus('Checking local audio…');
 try{
  const info=await audioCore.probe(file,file.name,file.type);
  if(epoch!==auUIEpoch||identity!==auIdentity()||auLocked(role))throw Error('The project or selection changed. Choose the audio file again.');
  // Keep the resulting portable backup below the existing 100 MiB import cap,
  // with headroom for ZIP headers and JSON. Shared/history sources count once.
  const pack=projectPack(),refs=projectReferenced(pack);let bytes=new TextEncoder().encode(JSON.stringify(pack)).length+file.size;
  for(const path of refs){const blob=mediaBlobs.get(path);if(!blob)throw Error('Restore missing project assets before attaching audio.');bytes+=blob.size;}
  if(bytes>95*1024*1024)throw Error('Audio would exceed the portable backup budget (95 MiB including retained history). Use a smaller file or a clean project copy.');
  const old=auTrack(role),path='assets/audio-'+projectID('track')+'-'+mediaFilename(file.name);
  const track=audioCore.track({src:path,name:file.name,mime:info.mime,bytes:file.size,durationMs:info.durationMs,volume:old?.volume??1,...role==='music'?{loop:old?.loop??true}:role==='slide'?{advanceOnEnd:old?.advanceOnEnd??false,paddingMs:old?.paddingMs??500}:{}},role);
  auStopPreview();mediaRemember(path,file);remembered=path;auApply(role,track);remembered='';auStatus('Attached '+file.name+'. Original audio retained; choose its narration mode to use it.');
 }catch(error){if(remembered){URL.revokeObjectURL(mediaURLs.get(remembered));mediaURLs.delete(remembered);mediaBlobs.delete(remembered);}auStatus(error.message);}
 finally{auUIBusy=false;auPaint();}
}
function auPreviewTrack(role){
 const track=auTrack(role);if(!track||auLocked(role))return;const key=JSON.stringify([projectMeta.id,projectSelected,role,track]);
 if(auPreviewIdentity===key&&auPreview){if(!auPreview.paused){auPreview.pause();auCards.get(role).preview.textContent='Resume preview';return;}const node=auPreview;node.play().then(()=>{if(node===auPreview)auCards.get(role).preview.textContent='Pause preview';}).catch(()=>auStatus('Preview was blocked. Activate Play preview again.'));return;}
 auStopPreview();if(!mediaBlobs.has(track.src)){auStatus('Audio asset is missing. Reopen the complete editable ZIP.');return;}
 const node=document.createElement('audio');node.src=mediaAssetURL(track.src);node.volume=track.volume;node.loop=false;auPreview=node;auPreviewIdentity=key;
 node.onended=()=>{if(node===auPreview)auStopPreview();};node.onerror=()=>{if(node===auPreview){auStopPreview();auStatus('This browser cannot play the audio. Replace it with MP3 or WAV.');}};
 node.play().then(()=>{if(node!==auPreview){node.pause();return;}auCards.get(role).preview.textContent='Pause preview';auStatus('Local editor preview only; slides do not advance.');}).catch(()=>{if(node===auPreview)auStatus('Audio preview was blocked. Activate Play preview again.');});
}
function auPaint(){
 if(!auUIReady||!projectReady)return;const audio=projectState.audio||audioCore.empty();$('au-mode').value=audio.mode;$('au-mode').disabled=auUIBusy||auLocked('mode');
 if(auPreview){let matching=false;for(const role of auCards.keys()){const track=auTrack(role);if(track&&JSON.stringify([projectMeta.id,projectSelected,role,track])===auPreviewIdentity)matching=true;}if(!matching)auStopPreview();}
 for(const [role,card]of auCards){const track=auTrack(role),locked=auUIBusy||auLocked(role);card.info.textContent=track?track.name+' · '+(track.durationMs/1000).toFixed(1)+' seconds · original retained'+(!mediaBlobs.has(track.src)?' · missing audio asset':''):'No audio attached';
  card.file.disabled=locked;card.preview.disabled=locked||!track;card.remove.disabled=locked||!track;card.stop.disabled=!auPreview;
  card.volume.value=track?Math.round(track.volume*100):100;card.volume.disabled=locked||!track;
  if(card.loop){card.loop.checked=track?.loop??true;card.loop.disabled=locked||!track;}
  if(card.advance){card.advance.checked=track?.advanceOnEnd??false;card.advance.disabled=locked||!track;card.padding.value=track?.paddingMs??500;card.padding.disabled=locked||!track;}
 }
}
function auMountUI(){
 const presentation=document.createElement('fieldset');presentation.id='au-presentation';presentation.className='au-panel';presentation.innerHTML='<legend>Presentation audio</legend><p>Use local prerecorded narration and separate background music. Audio-free projects keep their existing format. Audio projects require an audio-capable Studio.</p><label>Narration mode<select id="au-mode"><option value="none">None · retain attachments</option><option value="slide">Per-slide narration</option><option value="overall">One presentation-wide narration track</option></select></label><p>Overall narration continues across navigation and does not synchronize slides. Music and existing video audio mix independently; mute video where needed.</p><p id="au-status" role="status" aria-live="polite"></p>';
 $('fe-brand-panel').append(presentation);
 const section=document.createElement('details');section.id='au-slide';section.innerHTML='<summary>Slide audio</summary><p id="au-slide-status" role="status" aria-live="polite"></p>';section.className='ids-section';$('ic-slide-fields').append(section);idsRegister(section);
 for(const [role,title,parent]of [['slide','Slide narration',section],['overall','Presentation-wide narration',presentation],['music','Background music',presentation]]){
  const card=document.createElement('fieldset');card.className='au-card';const legend=document.createElement('legend');legend.textContent=title;card.append(legend);
  const info=document.createElement('p');info.id='au-'+role+'-info';card.append(info);
  const label=document.createElement('label');label.textContent='Attach or replace '+title.toLowerCase();const file=document.createElement('input');file.id='au-'+role+'-file';file.type='file';file.accept='.mp3,.wav,.m4a,.aac,.ogg,audio/mpeg,audio/wav,audio/mp4,audio/aac,audio/ogg';label.append(file);card.append(label);file.onchange=()=>{const chosen=file.files[0];file.value='';auAttach(role,chosen);};
  const buttons=document.createElement('div');buttons.className='au-actions';const preview=componentButton('Play preview',()=>auPreviewTrack(role)),stop=componentButton('Stop preview',()=>{auStopPreview();auPaint();}),remove=componentButton('Remove attachment',()=>{try{if(auLocked(role))return;projectFlush();auStopPreview();auApply(role,null);auStatus('Attachment removed. Shared sources and Undo history are retained.');}catch(error){auStatus(error.message);}});
  preview.id='au-'+role+'-preview';stop.id='au-'+role+'-stop';remove.id='au-'+role+'-remove';buttons.append(preview,stop,remove);card.append(buttons);
  const volumeLabel=document.createElement('label');volumeLabel.textContent=title+' volume (%)';const volume=document.createElement('input');volume.id='au-'+role+'-volume';volume.type='number';volume.min=0;volume.max=100;volume.step=1;volumeLabel.append(volume);card.append(volumeLabel);volume.onchange=()=>auChange(role,{volume:Number(volume.value)/100});
  const fields={card,info,file,preview,stop,remove,volume};
  if(role==='music'){const row=document.createElement('label'),loop=document.createElement('input');loop.type='checkbox';loop.id='au-music-loop';row.append(loop,document.createTextNode('Loop background music'));card.append(row);loop.onchange=()=>auChange(role,{loop:loop.checked});fields.loop=loop;}
  if(role==='slide'){const row=document.createElement('label'),advance=document.createElement('input');advance.type='checkbox';advance.id='au-slide-advance';row.append(advance,document.createTextNode('Advance when narration ends'));const padLabel=document.createElement('label');padLabel.textContent='End padding (milliseconds)';const padding=document.createElement('input');padding.id='au-slide-padding';padding.type='number';padding.min=0;padding.max=600000;padding.step=1;padLabel.append(padding);card.append(row,padLabel);advance.onchange=()=>auChange(role,{advanceOnEnd:advance.checked});padding.onchange=()=>auChange(role,{paddingMs:Number(padding.value)});fields.advance=advance;fields.padding=padding;}
  parent.append(card);auCards.set(role,fields);
 }
 $('au-mode').onchange=()=>{try{if(auLocked('mode'))return;projectFlush();auStopPreview();auApply('mode',null,$('au-mode').value);auStatus('Narration mode updated; inactive attachments retained.');}catch(error){auStatus(error.message);auPaint();}};
 $('full-editor').addEventListener('close',auStopPreview);$('we-settings').addEventListener('close',auStopPreview);addEventListener('beforeunload',auStopPreview);
 auUIReady=true;auPaint();
}
const auUIInit=projectInit;projectInit=function(...args){const result=auUIInit(...args);auMountUI();return result;};
const auUIForm=projectForm;projectForm=function(...args){const result=auUIForm(...args);auPaint();return result;};
const auUIAccept=projectAcceptPack;projectAcceptPack=function(...args){auUIEpoch++;auStopPreview();return auUIAccept(...args);};
