let auUIReady=false,auUIBusy=false,auPreview=null,auPreviewIdentity='',auUIEpoch=0;
const auCards=new Map();
function auIdentity(){return JSON.stringify([projectMeta.id,projectSelected,editingRevision()]);}
function auTrack(role){const audio=projectState.audio;return role==='slide'?audio?.slides?.[projectSelected]:audio?.[role];}
function auStatus(message){const settings=$('we-settings')?.open;for(const [id,active]of [['au-status',settings],['au-slide-status',!settings]])if($(id))$(id).textContent=active?message:'';}
function auTime(seconds){const value=Math.max(0,Math.floor(seconds||0));return Math.floor(value/60)+':'+String(value%60).padStart(2,'0');}
function auPreviewPosition(card,node){card.seek.disabled=false;card.seek.max=Number.isFinite(node.duration)?node.duration:auTrack(card.role).durationMs/1000;card.seek.value=node.currentTime;card.time.textContent=auTime(node.currentTime)+' / '+auTime(Number(card.seek.max));}
function auStopPreview(){if(auPreview){auPreview.pause();auPreview.removeAttribute('src');auPreview.load();auPreview=null;}auPreviewIdentity='';for(const card of auCards.values()){card.preview.textContent='Preview with sound';card.seek.value=0;card.seek.disabled=true;card.stop.disabled=true;card.time.textContent='0:00 / '+auTime((auTrack(card.role)?.durationMs||0)/1000);}}
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
 auStopPreview();if(!mediaSafePath(track.src)){auStatus('Audio asset path is invalid. Reopen the complete editable ZIP.');return;}
 const node=document.createElement('audio');node.src=mediaAssetURL(track.src);node.volume=track.volume;node.loop=false;auPreview=node;auPreviewIdentity=key;
 node.ontimeupdate=()=>{if(node===auPreview)auPreviewPosition(auCards.get(role),node);};node.onloadedmetadata=node.ontimeupdate;
 node.onended=()=>{if(node===auPreview)auStopPreview();};node.onerror=()=>{if(node===auPreview){auStopPreview();auStatus('This browser cannot play the audio. Replace it with MP3 or WAV.');}};
 node.play().then(()=>{if(node!==auPreview){node.pause();return;}const card=auCards.get(role);card.preview.textContent='Pause preview';card.stop.disabled=false;auPreviewPosition(card,node);auStatus('Local editor preview only; slides do not advance.');}).catch(()=>{if(node===auPreview)auStatus('Audio preview was blocked. Activate Preview with sound again.');});
}
function auPaint(){
 if(!auUIReady||!projectReady)return;const audio=projectState.audio||audioCore.empty();$('au-mode').value=audio.mode;$('au-mode').disabled=auUIBusy||auLocked('mode');
 if(auPreview){let matching=false;for(const role of auCards.keys()){const track=auTrack(role);if(track&&!auLocked(role)&&JSON.stringify([projectMeta.id,projectSelected,role,track])===auPreviewIdentity)matching=true;}if(!matching)auStopPreview();}
 for(const [role,card]of auCards){const track=auTrack(role),locked=auUIBusy||auLocked(role);card.info.textContent=track?track.name+' · '+(track.durationMs/1000).toFixed(1)+' seconds · original retained'+(!mediaBlobs.has(track.src)?' · ZIP asset; import complete ZIP before editing/exporting':''):'No audio attached';
  const previewing=!!auPreview&&auPreviewIdentity===JSON.stringify([projectMeta.id,projectSelected,role,track]);
  card.file.disabled=locked;card.preview.disabled=locked||!track;card.remove.disabled=locked||!track;card.stop.disabled=locked||!previewing;card.seek.disabled=locked||!previewing;
  if(!previewing){card.seek.value=0;card.time.textContent='0:00 / '+auTime((track?.durationMs||0)/1000);}
  card.volume.value=track?Math.round(track.volume*100):100;card.volume.disabled=locked||!track;card.slider.value=card.volume.value;card.slider.disabled=card.volume.disabled;
  card.modeHint.textContent=role==='slide'?(audio.mode==='slide'?'Active · stops when leaving this slide':'Inactive · choose Per-slide narration in Project settings → Audio'):role==='overall'?(audio.mode==='overall'?'Active · continues across slide changes':'Inactive · choose Presentation-wide narration above'):'Starts with presentation · stops when presentation ends';
  if(card.loop){card.loop.checked=track?.loop??true;card.loop.disabled=locked||!track;}
  if(card.advance){card.advance.checked=track?.advanceOnEnd??false;card.advance.disabled=locked||!track;card.padding.value=track?.paddingMs??500;card.padding.disabled=locked||!track;}
 }
}
function auMountUI(){
 const presentation=document.createElement('fieldset');presentation.id='au-presentation';presentation.className='au-panel';presentation.innerHTML='<legend>Audio</legend><p>Sound across your presentation. Choose narration and add a separate soundtrack.</p><label>Narration mode<select id="au-mode"><option value="none">None · retain attachments</option><option value="slide">Per-slide narration</option><option value="overall">One presentation-wide narration track</option></select></label><p>Overall narration continues across navigation and does not synchronize slides. Music and existing video audio mix independently; mute video where needed.</p><p id="au-status" role="status" aria-live="polite"></p>';
 const audioPanel=document.createElement('section');audioPanel.id='fe-audio-panel';audioPanel.className='fe-panel';audioPanel.hidden=true;audioPanel.setAttribute('role','tabpanel');audioPanel.setAttribute('aria-labelledby','we-tab-audio');audioPanel.append(presentation);$('we-project-panels').append(audioPanel);
 weProjectTabs.add('audio');const tab=document.createElement('button');tab.id='we-tab-audio';tab.type='button';tab.dataset.feTab='audio';tab.setAttribute('role','tab');tab.setAttribute('aria-controls',audioPanel.id);tab.setAttribute('aria-selected','false');tab.tabIndex=-1;tab.textContent='Audio';tab.onclick=()=>projectSelectTab('audio');$('we-project-tabs').append(tab);
 const section=document.createElement('details');section.id='au-slide';section.innerHTML='<summary>Sound <small class="au-scope">This slide</small></summary><p id="au-slide-status" role="status" aria-live="polite"></p>';section.className='ids-section';section.open=true;$('cb-inspector-background').before(section);idsRegister(section);
 for(const [role,title,parent]of [['slide','Slide narration',section],['music','Presentation soundtrack',presentation],['overall','Presentation-wide narration',presentation]]){
  const card=document.createElement('fieldset');card.className='au-card';const legend=document.createElement('legend');legend.textContent=title;card.append(legend);
  const scope=document.createElement('span');scope.className='au-scope';scope.textContent=role==='slide'?'This slide':'Across all slides';card.append(scope);const modeHint=document.createElement('p');modeHint.className='au-mode-hint';card.append(modeHint);
  const info=document.createElement('p');info.id='au-'+role+'-info';card.append(info);
  const label=document.createElement('label');label.textContent='Attach or replace '+title.toLowerCase();const file=document.createElement('input');file.id='au-'+role+'-file';file.type='file';file.accept='.mp3,.wav,.m4a,.aac,.ogg,audio/mpeg,audio/wav,audio/mp4,audio/aac,audio/ogg';label.append(file);card.append(label);file.onchange=()=>{const chosen=file.files[0];file.value='';auAttach(role,chosen);};
  const buttons=document.createElement('div');buttons.className='au-actions';const preview=componentButton('Preview with sound',()=>auPreviewTrack(role)),stop=componentButton('Stop preview',()=>{auStopPreview();auPaint();}),remove=componentButton('Remove attachment',()=>{try{if(auLocked(role))return;projectFlush();auStopPreview();auApply(role,null);auStatus('Attachment removed. Shared sources and Undo history are retained.');}catch(error){auStatus(error.message);}});
  preview.id='au-'+role+'-preview';stop.id='au-'+role+'-stop';remove.id='au-'+role+'-remove';buttons.append(preview,stop,remove);card.append(buttons);
  const volumeLabel=document.createElement('label');volumeLabel.textContent=title+' volume (%)';const volume=document.createElement('input');volume.id='au-'+role+'-volume';volumeLabel.htmlFor=volume.id;volume.type='number';volume.min=0;volume.max=100;volume.step=1;volumeLabel.append(volume);card.append(volumeLabel);volume.onchange=()=>auChange(role,{volume:Number(volume.value)/100});
  const transport=document.createElement('div');transport.className='au-transport';const seek=document.createElement('input');seek.type='range';seek.id='au-'+role+'-seek';seek.min=0;seek.max=0;seek.step=.1;seek.value=0;seek.disabled=true;seek.setAttribute('aria-label',title+' preview position in seconds');const time=document.createElement('output');time.setAttribute('aria-label','Preview time');transport.append(seek,time);buttons.before(transport);seek.oninput=()=>{if(auPreview&&auPreviewIdentity===JSON.stringify([projectMeta.id,projectSelected,role,auTrack(role)])){auPreview.currentTime=Number(seek.value);auPreviewPosition(auCards.get(role),auPreview);}};
  const volumeRow=document.createElement('div');volumeRow.className='au-volume';const slider=document.createElement('input');slider.id='au-'+role+'-volume-slider';slider.type='range';slider.min=0;slider.max=100;slider.step=1;slider.setAttribute('aria-label',title+' volume');const unit=document.createElement('span');unit.textContent='%';volumeLabel.append(volumeRow);volumeRow.append(slider,volume,unit);slider.oninput=()=>{volume.value=slider.value;};slider.onchange=()=>auChange(role,{volume:Number(slider.value)/100});
  const fields={role,card,info,file,preview,stop,remove,volume,slider,seek,time,modeHint};
  if(role==='music'){const row=document.createElement('label'),loop=document.createElement('input');loop.type='checkbox';loop.id='au-music-loop';row.append(loop,document.createTextNode('Loop background music'));card.append(row);loop.onchange=()=>auChange(role,{loop:loop.checked});fields.loop=loop;}
  if(role==='slide'){const row=document.createElement('label'),advance=document.createElement('input');advance.type='checkbox';advance.id='au-slide-advance';row.append(advance,document.createTextNode('Advance when narration ends'));const padLabel=document.createElement('label');padLabel.textContent='End padding (milliseconds)';const padding=document.createElement('input');padding.id='au-slide-padding';padding.type='number';padding.min=0;padding.max=600000;padding.step=1;padLabel.append(padding);card.append(row,padLabel);advance.onchange=()=>auChange(role,{advanceOnEnd:advance.checked});padding.onchange=()=>auChange(role,{paddingMs:Number(padding.value)});fields.advance=advance;fields.padding=padding;}
  parent.append(card);auCards.set(role,fields);
 }
 $('au-mode').onchange=()=>{try{if(auLocked('mode'))return;projectFlush();auStopPreview();auApply('mode',null,$('au-mode').value);auStatus('Narration mode updated; inactive attachments retained.');}catch(error){auStatus(error.message);auPaint();}};
 const footer=document.createElement('p');footer.className='au-help';footer.textContent='Slide narration is edited in Inspector → Sound. Video sound stays with the selected video. Previews are local; presentation playback starts after a viewer gesture.';presentation.append(footer);
 $('full-editor').addEventListener('close',auStopPreview);$('we-settings').addEventListener('close',auStopPreview);addEventListener('beforeunload',auStopPreview);
 auUIReady=true;auPaint();
}
const auUIInit=projectInit;projectInit=function(...args){const result=auUIInit(...args);auMountUI();return result;};
const auUIForm=projectForm;projectForm=function(...args){const result=auUIForm(...args);auPaint();return result;};
const auUIAccept=projectAcceptPack;projectAcceptPack=function(...args){auUIEpoch++;auStopPreview();return auUIAccept(...args);};
const auUITab=projectSelectTab;projectSelectTab=function(tab,...args){const result=auUITab(tab,...args);if($('fe-audio-panel'))$('fe-audio-panel').hidden=tab!=='audio';auStopPreview();return result;};
