// Session transport beside the canvas; never part of slide content or saved state.
let rcReady=false,rcBusy=false,rcWaveBlob=null,rcPeaks=[],rcFrame=0,rcDuration=0;
function rcMessage(message){recStatus(message);if($('rc-status').textContent!==message)$('rc-status').textContent=message;}
async function rcRun(action){if(rcBusy)return;rcBusy=true;recPaint();try{await action();}catch(error){rcMessage(error.message);}finally{rcBusy=false;recPaint();}}
function rcCancel(){recGeneration++;recStop('Recording cancelled. Existing narration is unchanged.');recDiscard();$('rec-start').disabled=false;$('rec-stop').disabled=true;$('rec-device').disabled=false;rcMessage('Take discarded. Existing narration is unchanged.');recPaint();}
function rcRecord(){return rcRun(async()=>{recSurface='canvas';$('rc-settings').open=false;auStopPreview();pmStopPreview();$('rc-status').textContent='';await recStart();});}
function rcNode(){return recTake?$('rec-preview'):auPreviewIdentity===JSON.stringify([projectMeta.id,projectSelected,'slide',auTrack('slide')])?auPreview:null;}
function rcPreview(){
 return rcRun(async()=>{
  if(recTake){auStopPreview();pmStopPreview();const node=$('rec-preview');if(node.paused)await node.play();else node.pause();}
  else {auPreviewTrack('slide');const node=auPreview;if(node)for(const event of ['play','pause','ended','error'])node.addEventListener(event,()=>{recPaint();if(event==='play')rcTick();},{once:true});}
  recPaint();rcTick();
 });
}
function rcTick(){cancelAnimationFrame(rcFrame);const node=rcNode();if(!node||node.paused)return;rcPosition();rcFrame=requestAnimationFrame(rcTick);}
function rcPosition(){const node=rcNode(),duration=Number.isFinite(node?.duration)?node.duration:(recTake?rcDuration:(auTrack('slide')?.durationMs||0)/1000);$('rc-seek').disabled=!node||!duration;$('rc-seek').max=duration||0;$('rc-seek').value=node?.currentTime||0;$('rc-time').textContent=auTime(node?.currentTime||0)+' / '+(duration?auTime(Math.ceil(duration)):'—');}
async function rcWave(blob){
 if(rcWaveBlob===blob)return;rcWaveBlob=blob;rcPeaks=[];rcDuration=0;rcDraw();if(!blob||blob.size>20*1024*1024)return;
 const Context=window.AudioContext||window.webkitAudioContext;if(!Context)return;
 const context=new Context();try{const decoded=await context.decodeAudioData(await blob.arrayBuffer());if(rcWaveBlob!==blob)return;rcDuration=decoded.duration;const samples=decoded.getChannelData(0),step=Math.max(1,Math.floor(samples.length/64));rcPeaks=Array.from({length:64},(_,i)=>{let peak=0;for(let j=i*step;j<Math.min(samples.length,(i+1)*step);j+=Math.max(1,Math.floor(step/100)))peak=Math.max(peak,Math.abs(samples[j]));return peak;});rcDraw();rcPosition();}catch{/* A seek control remains available when waveform decoding is unsupported. */}finally{await context.close();}
}
function rcDraw(){const canvas=$('rc-wave'),context=canvas?.getContext('2d');if(!context)return;context.clearRect(0,0,256,32);context.fillStyle='#2688ff';rcPeaks.forEach((peak,i)=>{const h=Math.max(2,peak*30);context.fillRect(i*4,(32-h)/2,2,h);});canvas.hidden=!rcPeaks.length;}
recPaint=function(){
 if(!rcReady)return;const strip=$('rc-strip'),track=auTrack('slide'),capturing=!!recSession,pending=$('rec-start').disabled&&!capturing&&!recTake,review=!!recTake,locked=auLocked('slide'),stale=review&&(recTake.identity!==auIdentity()||recTake.slide!==projectSelected),node=rcNode();
 strip.hidden=projectPlayback||boothActive||!$('full-editor').open;strip.dataset.state=capturing?'recording':pending?'pending':review?'review':track?'attached':'ready';
 $('rc-title').textContent='Slide '+(projectState.slides.findIndex(s=>s.id===projectSelected)+1)+' narration';
 $('rc-hint').textContent=capturing?'● Recording locally':pending?'Waiting for microphone permission…':review?(stale?'Take belongs to its original slide · return there or download/discard':'New take · Ready to review'):track?'Existing narration · '+auTime(track.durationMs/1000):'Ready to record';
 $('rc-record').textContent=review?'Retake':track?'Record replacement':'Record narration';$('rc-record').hidden=capturing||pending;$('rc-record').disabled=locked||rcBusy;
 $('rc-stop').hidden=!capturing;$('rc-cancel').hidden=!capturing&&!pending;$('rc-use').hidden=!review;$('rc-discard').hidden=!review;$('rc-download').hidden=!review;
 $('rc-use').disabled=locked||stale||rcBusy;$('rc-preview-button').hidden=capturing||pending||!review&&!track;$('rc-preview-button').disabled=rcBusy||!review&&locked;$('rc-preview-button').textContent=node&&!node.paused?'Pause':'Play';
 $('rc-level-label').hidden=!capturing;$('rc-elapsed').hidden=!capturing;$('rc-elapsed').textContent=$('rec-timer').textContent;
 $('rc-transport').hidden=capturing||pending||!review&&!node;rcPosition();
 $('rc-assurance').hidden=!review;$('rc-assurance').textContent=stale?'This take cannot replace narration on a different slide or after edits.':'Existing narration stays unchanged until you use this take.';
 $('rc-settings').inert=capturing||pending||rcBusy;$('rc-device').disabled=capturing||pending;
 const options=$('rec-device').innerHTML;if($('rc-device').innerHTML!==options)$('rc-device').innerHTML=options;$('rc-device').value=$('rec-device').value;
 if(review)rcWave(recTake.blob);else rcWave(node&&track?.durationMs<=recMaxMs?mediaBlobs.get(track.src):null);
};
function rcMount(){
 const strip=document.createElement('section');strip.id='rc-strip';strip.setAttribute('aria-label','Slide narration controls');strip.innerHTML='<div class="rc-main"><span class="rc-mic" aria-hidden="true"><svg width="18" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8"/></svg></span><div class="rc-description"><strong id="rc-title">Slide narration</strong><small id="rc-hint"></small></div><button id="rc-preview-button">Play</button><div id="rc-transport"><canvas id="rc-wave" width="256" height="32" aria-hidden="true"></canvas><input id="rc-seek" type="range" min="0" max="0" step="0.1" value="0" aria-label="Narration preview position in seconds"><output id="rc-time" aria-label="Narration preview time"></output></div><label id="rc-level-label">Input level<meter id="rc-level" min="0" max="1" value="0"></meter></label><output id="rc-elapsed" aria-label="Recording elapsed time"></output><div class="rc-actions"><button id="rc-record">Record narration</button><button id="rc-stop">Stop</button><button id="rc-cancel">Cancel</button><button id="rc-discard">Discard</button><button id="rc-use">Use take</button></div><details id="rc-settings"><summary aria-label="Microphone and narration settings">⚙</summary><div><label>Microphone<select id="rc-device"></select></label><button id="rc-refresh">Refresh devices</button><button id="rc-download">Download take</button><button id="rc-audio-settings">Narration settings…</button></div></details></div><p id="rc-assurance"></p><p id="rc-status" role="status" aria-live="polite"></p>';
 $('we-viewport').after(strip);$('rc-record').onclick=rcRecord;$('rc-stop').onclick=()=>recStop();$('rc-cancel').onclick=rcCancel;$('rc-discard').onclick=rcCancel;$('rc-use').onclick=()=>rcRun(async()=>{recSurface='canvas';await recAccept();rcMessage('Recording accepted. Select Per-slide narration in Audio settings to use it.');});$('rc-download').onclick=()=>{if(recTake)mediaDownload(recTake.blob,recTake.name);};$('rc-preview-button').onclick=rcPreview;
 $('rc-seek').oninput=()=>{const node=rcNode();if(node&&Number($('rc-seek').max)>0){node.currentTime=Number($('rc-seek').value);rcPosition();}};
 $('rc-device').onchange=()=>{$('rec-device').value=$('rc-device').value;};$('rc-refresh').onclick=()=>rcRun(async()=>{await recDevices();recPaint();});$('rc-audio-settings').onclick=()=>{$('rc-settings').open=false;weOpenSettings('audio');};
 for(const event of ['play','pause','ended','loadedmetadata','error'])$('rec-preview').addEventListener(event,()=>{recPaint();if(event==='play')rcTick();if(event==='error'&&recTake)rcMessage('This browser cannot preview the take. Download it or record again.');});
 strip.addEventListener('keydown',event=>{if(event.key==='Escape'&&(recSession||$('rec-start').disabled)){event.preventDefault();event.stopPropagation();rcCancel();}});
 // Moving through this adjacent transport commits text without dropping the
 // selected object's Inspector context or interrupting the keyboard tab path.
 $('fe-preview').addEventListener('focusout',event=>{if(event.relatedTarget?.closest('#rc-strip'))vbEnd(false);},true);
 rcReady=true;recPaint();
}
const rcForm=projectForm;projectForm=function(...args){const result=rcForm(...args);if(recSession&&recSession.identity!==auIdentity())recStop('Slide or project changed. Your take remains available for review or download.');recPaint();return result;};
const rcPreviewForm=projectPreview;projectPreview=function(...args){const result=rcPreviewForm(...args);if(recSession&&auLocked('slide'))recStop('Editing mode changed. Review or download the take.');recPaint();return result;};
const rcAccept=projectAcceptPack;projectAcceptPack=function(...args){const result=rcAccept(...args);recPaint();return result;};
const rcInit=projectInit;projectInit=function(...args){const result=rcInit(...args);rcMount();return result;};
