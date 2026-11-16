// A take is session-only until accepted. No microphone state enters a project pack.
let recSession=null,recTake=null,recURL='',recGeneration=0,recOrigin=null,recSurface='dialog',recPaint=()=>{};
const recMaxMs=600000;
function recActive(){return recSurface==='canvas'?$('full-editor').open&&!projectPlayback:$('rec-dialog').open;}
function recStatus(message){if($('rec-status').textContent!==message)$('rec-status').textContent=message;if(recSurface==='canvas'&&$('rc-status')&&$('rc-status').textContent!==message)$('rc-status').textContent=message;recPaint();}
function recRelease(session){
 clearInterval(session?.timer);cancelAnimationFrame(session?.frame);
 session?.stream?.getTracks().forEach(track=>{track.onended=null;track.stop();});
 session?.context?.close().catch(()=>{});
 if($('rc-level'))$('rc-level').value=0;
}
function recStop(message='Recording stopped. Review the take before accepting.'){
 const session=recSession;if(!session)return;
 session.reason=message;
 if(session.recorder?.state!=='inactive')try{session.recorder.stop();}catch{}
 recRelease(session);recSession=null;
 if($('rec-status'))recStatus(message);
}
function recDiscard(){if(recURL)URL.revokeObjectURL(recURL);recURL='';recTake=null;const preview=$('rec-preview');preview.pause();preview.removeAttribute('src');preview.load();$('rec-accept').disabled=true;$('rec-download').disabled=true;recPaint();}
function recMime(){return ['audio/webm;codecs=opus','audio/ogg;codecs=opus','audio/mp4'].find(type=>MediaRecorder.isTypeSupported(type));}
function recOpen(){
 try{pmGuard();if(auLocked('slide'))throw Error('Unlock this slide before recording.');if(recSession||$('rec-start').disabled)throw Error('Stop the current recording before opening microphone settings.');recSurface='dialog';projectFlush();auStopPreview();pmStopPreview();recOrigin=document.activeElement;$('rec-dialog').classList.toggle('editor-dark',document.body.classList.contains('editor-dark'));$('rec-dialog').showModal();$('rec-target').textContent='For slide '+(projectState.slides.indexOf(projectModel())+1)+' · '+projectModel().title;recStatus('Recording stays on this device. Preview and choose Use take to replace narration.');$('rec-start').focus();}
 catch(error){pmMessage(error.message);projectMessage(error.message);}
}
async function recDevices(){
 if(!navigator.mediaDevices?.enumerateDevices)return;
 const select=$('rec-device'),value=select.value;select.replaceChildren();const option=pmText('option','System default microphone',select);option.value='';
 let n=0;for(const device of await navigator.mediaDevices.enumerateDevices())if(device.kind==='audioinput'){const row=pmText('option',device.label||'Microphone '+ ++n,select);row.value=device.deviceId;}select.value=[...select.options].some(o=>o.value===value)?value:'';
}
async function recStart(){
 if(recSession)return;pmGuard();if(auLocked('slide'))throw Error('Unlock the slide first.');
 if(!isSecureContext||!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined')throw Error('Microphone recording is unavailable here. Use a current browser on HTTPS, localhost, or a supported local-file launch; you can still attach an audio file.');
 const mime=recMime();if(!mime)throw Error('This browser has no supported recording codec. Attach MP3 or WAV instead.');
 projectFlush();pmCheckBudget(65536);recDiscard();const generation=++recGeneration,identity=auIdentity(),slide=projectSelected,available=pmBudget-pmSize()-65536,device=$('rec-device').value;
 $('rec-start').disabled=true;recStatus('Waiting for microphone permission…');let session;
 try{
  const stream=await navigator.mediaDevices.getUserMedia({audio:device?{deviceId:{exact:device}}:true,video:false});
  session={stream,identity,slide,number:projectState.slides.findIndex(s=>s.id===slide)+1,generation,chunks:[],bytes:0,started:performance.now(),reason:'Recording stopped. Review the take.'};
  if(generation!==recGeneration||identity!==auIdentity()||document.hidden||!recActive()||auLocked('slide')){recRelease(session);throw Error('The target changed while requesting permission. Start again.');}
  const recorder=new MediaRecorder(stream,{mimeType:mime,audioBitsPerSecond:96000});session.recorder=recorder;recSession=session;
  session.byteLimit=available;
  recorder.ondataavailable=event=>{if(event.data.size){session.chunks.push(event.data);session.bytes+=event.data.size;if(session.bytes>=session.byteLimit)recStop('Portable byte limit reached. Review or download the take.');}};
  recorder.onerror=()=>recStop('Microphone recording was interrupted. Review the captured take.');
  recorder.onstop=()=>{
   recRelease(session);if(recSession===session)recSession=null;
   if(generation!==recGeneration)return;
   const type=recorder.mimeType||mime,ext=type.startsWith('audio/ogg')?'ogg':type.startsWith('audio/mp4')?'m4a':'webm',blob=new Blob(session.chunks,{type:type.split(';')[0]});
   $('rec-start').disabled=false;$('rec-stop').disabled=true;$('rec-device').disabled=false;
   if(!blob.size){recStatus('No audio was captured. Check the microphone and try again.');return;}
   recTake={blob,name:'Slide-'+session.number+'-narration-'+Date.now()+'.'+ext,identity,slide,generation};
   recURL=URL.createObjectURL(blob);$('rec-preview').src=recURL;$('rec-accept').disabled=false;$('rec-download').disabled=false;
   recStatus(session.reason+' · '+mediaBytes(blob.size)+(identity!==auIdentity()?' · Target changed: download or discard this take.':''));
  };
  for(const track of stream.getTracks())track.onended=()=>recStop('Microphone disconnected. Review the captured take.');
  const Context=window.AudioContext||window.webkitAudioContext;
  if(Context){const context=new Context(),analyser=context.createAnalyser();session.context=context;analyser.fftSize=256;context.createMediaStreamSource(stream).connect(analyser);const samples=new Uint8Array(analyser.fftSize);const meter=()=>{if(recSession!==session)return;analyser.getByteTimeDomainData(samples);$('rec-level').value=Math.min(1,Math.sqrt(samples.reduce((sum,n)=>sum+((n-128)/128)**2,0)/samples.length)*4);if($('rc-level'))$('rc-level').value=$('rec-level').value;session.frame=requestAnimationFrame(meter);};meter();}
  recorder.start(250);$('rec-stop').disabled=false;$('rec-device').disabled=true;recStatus('Recording locally. Stop to preview; nothing is attached yet.');
  session.timer=setInterval(()=>{
   const elapsed=performance.now()-session.started;$('rec-timer').textContent=auTime(elapsed/1000)+' / 10:00';
   recPaint();
   if(identity!==auIdentity()||auLocked('slide'))recStop('Target or editing state changed. Download or discard this take.');
   else if(elapsed>=recMaxMs)recStop('Ten-minute limit reached. Review the take.');
   else if(elapsed>=recMaxMs-30000||session.bytes>=available*.85)recStatus('Approaching the recording limit. Recording will stop automatically and keep a reviewable take.');
  },200);
  recDevices().catch(()=>{});
 }catch(error){recRelease(session);if(recSession===session)recSession=null;$('rec-start').disabled=false;throw Error(error.name==='NotAllowedError'?'Microphone permission denied. Allow microphone access in browser settings and retry, or attach an audio file.':error.name==='NotFoundError'?'No microphone found. Connect a device and retry.':error.message);}
}
async function recAccept(){
 const take=recTake;if(!take)return;pmGuard();if(take.identity!==auIdentity()||take.slide!==projectSelected||auLocked('slide'))throw Error('The project, slide or edit revision changed. Download or discard this take and record again.');
 $('rec-accept').disabled=true;const info=await audioCore.probe(take.blob,take.name,take.blob.type),sha256=await pmHash(take.blob),entries=await pmEntries();
 if(take!==recTake||take.identity!==auIdentity()||!recActive())throw Error('The target changed. Download or discard this take.');
 if(info.durationMs>recMaxMs+2000)throw Error('The take exceeds ten minutes. Download it and record a shorter take.');
 pmCheckBudget(take.blob.size+new TextEncoder().encode(JSON.stringify(entries)).length+8192);
 const path='assets/recording-'+projectID('take')+'-'+mediaFilename(take.name),old=auTrack('slide');
 entries[path]={name:take.name,kind:'recording',origin:'recorded',bytes:take.blob.size,durationMs:info.durationMs,...sha256?{sha256}:{}};
 const track={src:path,name:take.name,mime:info.mime,bytes:take.blob.size,durationMs:info.durationMs,volume:old?.volume??1,advanceOnEnd:old?.advanceOnEnd??false,paddingMs:old?.paddingMs??500};
 const snapshot=studioEditing.read();mediaRemember(path,take.blob);
 const result=studioEditing.apply({apiVersion:1,projectId:snapshot.projectId,expectedRevision:snapshot.revision,operations:[{type:'media.library',entries},{type:'audio.settings',role:'slide',slideId:take.slide,track}]});
 if(!result.ok){URL.revokeObjectURL(mediaURLs.get(path));mediaURLs.delete(path);mediaBlobs.delete(path);throw Error(result.message);}
 recDiscard();$('rec-dialog').close();auStatus('Recording accepted. Choose Per-slide narration to play it.');if($('pm-dialog').open){pmSelected=path;pmPaint();pmMessage('Recording accepted. Original take retained in this project.');}
}
function recMount(){
 const dialog=document.createElement('dialog');dialog.id='rec-dialog';dialog.className='pm-dialog rec-dialog';dialog.setAttribute('aria-labelledby','rec-title');dialog.innerHTML='<header><h2 id="rec-title">Record slide narration</h2><button id="rec-close" aria-label="Close recording">×</button></header><p id="rec-target"></p><label>Microphone<select id="rec-device"><option value="">System default microphone</option></select></label><button id="rec-refresh">Refresh devices</button><label>Microphone level<meter id="rec-level" min="0" max="1" value="0"></meter></label><output id="rec-timer" aria-label="Recording elapsed time">0:00 / 10:00</output><div class="pm-actions"><button id="rec-start">Record / retake</button><button id="rec-stop" disabled>Stop recording</button></div><audio id="rec-preview" controls preload="metadata" aria-label="Preview recorded take"></audio><div class="pm-actions"><button id="rec-accept" disabled>Use take · replace slide narration</button><button id="rec-download" disabled>Download take</button><button id="rec-discard">Discard take</button></div><p id="rec-status" role="status" aria-live="polite"></p><p>Up to ten minutes, within the remaining portable budget. Microphone access ends when recording stops. Accepting preserves prior narration in Undo.</p>';
 document.body.append(dialog);$('rec-close').onclick=()=>dialog.close();dialog.onclose=()=>{recGeneration++;recStop('Recording closed.');recDiscard();$('rec-start').disabled=false;$('rec-stop').disabled=true;$('rec-device').disabled=false;recOrigin?.focus();};
 $('rec-start').onclick=()=>pmRun(recStart);$('rec-stop').onclick=()=>recStop();$('rec-refresh').onclick=()=>pmRun(recDevices);$('rec-discard').onclick=()=>{recGeneration++;recStop();recDiscard();recStatus('Take discarded. Existing narration is unchanged.');$('rec-start').disabled=false;};
 $('rec-accept').onclick=()=>pmRun(async()=>{try{await recAccept();}finally{if(recTake)$('rec-accept').disabled=false;}});$('rec-download').onclick=()=>{if(recTake)mediaDownload(recTake.blob,recTake.name);};
 const record=componentButton('Record narration…',recOpen);record.id='rec-open';$('au-slide').append(record);
 addEventListener('beforeunload',()=>recStop());document.addEventListener('visibilitychange',()=>{if(document.hidden)recStop('Page hidden. Review the captured take.');});$('full-editor').addEventListener('close',()=>{if(!recSession||recSurface==='dialog')recGeneration++;recStop('Editor closed. Review or download the take when you reopen it.');$('rec-preview').pause();if(dialog.open)dialog.close();recPaint();});
 recDevices().catch(()=>{});
}
