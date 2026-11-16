import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chooseExample,snapshot,operations,exportZip} from './collection-ui.mjs';
import {reveal} from './ui.mjs';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
test.after(()=>browser.close());
await mkdir('test-results',{recursive:true});
await writeFile('test-results/project-media.html',(await readFile('dist/presentation-studio.html','utf8')).replace('  projectInit();',`window.__pm={open:pmOpen,load:lwLoad,rows:pmCollect,pack:projectPack,validate:projectValidatePack,old:pmValidatePack,entries:pmEntries,apply:pmApply,select:pmSelect,blob:path=>mediaBlobs.get(path),hash:pmHash,replace:pmReplace,stop:recStop,take:()=>recTake,session:()=>!!recSession,tracks:()=>recSession?.stream.getTracks()||[],limit:()=>{recSession.started=performance.now()-600001;},byteLimit:()=>{recSession.byteLimit=1;recSession.recorder.requestData();},budget:pmCheckBudget,forget:path=>{URL.revokeObjectURL(mediaURLs.get(path));mediaURLs.delete(path);mediaBlobs.delete(path);},paint:pmPaint};\n  projectInit();`));
function wave(){const b=Buffer.alloc(16044);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(8000,24);b.writeUInt32LE(16000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(16000,40);return b;}
async function setup(){const page=await browser.newPage({acceptDownloads:true,viewport:{width:1366,height:900}});page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('file://'+resolve('test-results/project-media.html')+'?start=present');await page.locator('#open-full-editor').click();await chooseExample(page,'portfolio-demo');await reveal(page,'#au-slide-file');await page.locator('#au-slide-file').setInputFiles({name:'same.wav',mimeType:'audio/wav',buffer:wave()});await page.waitForFunction(()=>!!Object.keys(window.presentationStudioEditing.read().state.audio?.slides||{}).length);return {page,errors};}
test('library rename, filtered usage, guarded format, original-byte editable restore and playback isolation',async()=>{
 const {page,errors}=await setup();try{
  const before=await snapshot(page),id=before.state.slides[0].id,path=before.state.audio.slides[id].src;
  await page.evaluate(path=>{window.__pm.open();window.__pm.select(path);},path);await page.locator('#pm-name').fill('Opening narration');await page.locator('#pm-rename').click();await page.waitForFunction(()=>!!window.presentationStudioEditing.read().state.assetLibrary);
  assert.equal(await page.evaluate(()=>window.__pm.pack().schemaVersion),6);
  assert.match(await page.evaluate(()=>{try{window.__pm.old(window.__pm.pack());return '';}catch(e){return e.message;}}),/Unsupported|requires native/);
  assert.equal(await page.evaluate(()=>Object.hasOwn(window.__pm.pack(true).state,'assetLibrary')),false);
  await page.locator('#pm-search').fill('Opening narration');assert.equal(await page.locator('#pm-body tr').count(),1);
  assert.equal((await snapshot(page)).state.assetLibrary.entries[path].name,'Opening narration');
  const download=page.waitForEvent('download');await page.locator('#pm-download').click();const d=await download;assert.equal(d.suggestedFilename(),'Opening_narration.wav');
  await page.locator('#pm-close').click();const zip=await exportZip(page);const fresh=await browser.newPage({viewport:{width:1366,height:900}});try{
   await fresh.goto('file://'+resolve('test-results/project-media.html')+'?start=present');await fresh.locator('#open-full-editor').click();await fresh.context().setOffline(true);await fresh.locator('#fe-import-file').setInputFiles({name:'library.zip',mimeType:'application/zip',buffer:zip});await fresh.waitForFunction(id=>window.presentationStudioEditing.read().projectId===id,before.projectId);
   assert.equal((await snapshot(fresh)).state.assetLibrary.entries[path].name,'Opening narration');
   assert.deepEqual(Buffer.from(await fresh.evaluate(async path=>Array.from(new Uint8Array(await window.__pm.blob(path).arrayBuffer())),path)),wave());
  }finally{await fresh.close();}
  assert.deepEqual(errors,[]);
 }finally{await page.close();}
});
test('shared replacement retains original, settings and IDs with atomic Undo, and rejects locked changes',async()=>{
 const {page,errors}=await setup();try{
  const before=await snapshot(page),[first,second]=before.state.slides,old=before.state.audio.slides[first.id];
  assert((await operations(page,[{type:'audio.settings',role:'slide',slideId:second.id,track:{...old,volume:.25,paddingMs:900}}])).ok);
  await page.evaluate(path=>{window.__pm.open();window.__pm.select(path);},old.src);
  page.on('dialog',d=>d.accept());await page.locator('#pm-repair > summary').click();await page.locator('#pm-file').setInputFiles({name:'replacement.wav',mimeType:'audio/wav',buffer:wave()});await page.locator('#pm-all').check();await page.locator('#pm-replace').click();await page.waitForFunction(path=>window.presentationStudioEditing.read().state.audio.slides[window.presentationStudioEditing.read().state.slides[0].id].src!==path,old.src);
  const after=await snapshot(page),next=after.state.audio.slides[first.id].src;assert.equal(after.state.audio.slides[second.id].src,next);assert.equal(after.state.audio.slides[second.id].volume,.25);assert.equal(after.state.audio.slides[second.id].paddingMs,900);assert(after.state.assetLibrary.entries[old.src]);assert.deepEqual(after.state.slides.map(s=>s.id),before.state.slides.map(s=>s.id));
  await page.locator('#pm-close').click();await page.locator('#fe-undo').click();assert.equal((await snapshot(page)).state.audio.slides[first.id].src,old.src);assert.equal(await page.evaluate(path=>window.__pm.blob(path).size,old.src),wave().length);
  const budget=await page.evaluate(()=>{try{window.__pm.budget(95*1024*1024);return '';}catch(e){return e.message;}});assert.match(budget,/budget/);assert.deepEqual(errors,[]);
 }finally{await page.close();}
});
test('real browser recorder creates a reviewable take, releases microphone, and acceptance is undoable',async()=>{
 const {page,errors}=await setup();try{
  await page.locator('#ad-canvas-mode').selectOption('manual');await reveal(page,'#rec-open');await page.locator('#rec-open').click();await page.locator('#rec-start').click();await page.waitForFunction(()=>window.__pm.session());await page.waitForTimeout(1200);await page.locator('#rec-stop').click();await page.waitForFunction(()=>!!window.__pm.take());assert.equal(await page.evaluate(()=>window.__pm.session()),false);
  const original=(await snapshot(page)).state.audio;await page.locator('#rec-accept').click();await page.waitForFunction(()=>!document.querySelector('#rec-dialog').open);const after=await snapshot(page),track=after.state.audio.slides[after.state.slides[0].id];assert.match(track.name,/\.webm$/);assert.equal(after.state.assetLibrary.entries[track.src].origin,'recorded');assert(track.durationMs>500);assert.deepEqual(after.state.audio.advancement,original.advancement);await page.locator('#fe-undo').click();assert.deepEqual((await snapshot(page)).state.audio,original);assert.deepEqual(errors,[]);
 }finally{await page.close();}
});

test('recorded originals show measured duration before playback and preview controls preserve authored state',async()=>{const {page,errors}=await setup();try{
 await page.locator('#rc-record').click();await page.waitForFunction(()=>window.__pm.session());await page.waitForTimeout(1200);await page.locator('#rc-stop').click();await page.waitForFunction(()=>!!window.__pm.take());await page.locator('#rc-use').click();await page.waitForFunction(()=>!window.__pm.take());const before=await snapshot(page),id=before.state.slides[0].id,path=before.state.audio.slides[id].src,hash=await page.evaluate(path=>window.__pm.hash(window.__pm.blob(path)),path);
 await page.evaluate(path=>{Object.defineProperty(HTMLMediaElement.prototype,'duration',{configurable:true,get:()=>Infinity});window.__pm.open();window.__pm.select(path);},path);const output=page.locator('#pm-preview output');assert.match(await output.textContent(),/^0:00 \/ 0:0[12]$/);assert.equal(await page.locator('#pm-preview audio').evaluate(el=>el.paused),true);assert.equal(await page.getByRole('slider',{name:'Audio preview position in seconds',exact:true}).isEnabled(),true);await page.screenshot({path:'test-results/project-media-measured-duration.png'});await page.getByRole('slider',{name:'Audio preview position in seconds',exact:true}).fill('0.4');await page.waitForFunction(()=>document.querySelector('#pm-preview audio').currentTime>=.3);
 await page.getByRole('button',{name:'Play audio preview',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('#pm-preview audio').paused);await page.getByRole('button',{name:'Pause audio preview',exact:true}).click();await page.getByRole('button',{name:'Mute',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Unmute',exact:true}).getAttribute('aria-pressed'),'true');await page.getByRole('slider',{name:'Audio preview volume',exact:true}).fill('40');assert.equal(await page.locator('#pm-preview audio').evaluate(el=>el.volume),.4);assert.deepEqual((await snapshot(page)).state,before.state);assert.equal(await page.evaluate(path=>window.__pm.hash(window.__pm.blob(path)),path),hash);await page.locator('#pm-close').click();assert.deepEqual(errors,[]);
 }finally{await page.close();}});
test('changing target stops capture and prevents a stale take from changing narration',async()=>{
 const {page,errors}=await setup();try{
  await reveal(page,'#rec-open');await page.locator('#rec-open').click();await page.locator('#rec-start').click();await page.waitForFunction(()=>window.__pm.session());await page.waitForTimeout(600);
  await page.evaluate(()=>{window.presentationStudioEditing.apply({apiVersion:1,projectId:window.presentationStudioEditing.read().projectId,expectedRevision:window.presentationStudioEditing.read().revision,operations:[{type:'slide.update',slideId:window.presentationStudioEditing.read().state.slides[0].id,changes:{notes:'changed while recording'}}]});});
  await page.waitForFunction(()=>!window.__pm.session()&&!!window.__pm.take());const before=await snapshot(page);await page.locator('#rec-accept').click();await page.waitForFunction(()=>document.querySelector('#rec-status').textContent.includes('changed'));assert.deepEqual((await snapshot(page)).state,before.state);assert.deepEqual(errors,[]);
 }finally{await page.close();}
});
test('bulk ZIP resolves duplicate display names and requires acknowledgement for missing originals',async()=>{
 const {page,errors}=await setup();try{
  const before=await snapshot(page),id=before.state.slides[0].id;
  await page.locator('#au-slide-file').setInputFiles({name:'same.wav',mimeType:'audio/wav',buffer:wave()});await page.waitForFunction(old=>window.presentationStudioEditing.read().state.audio.slides[window.presentationStudioEditing.read().state.slides[0].id].src!==old,before.state.audio.slides[id].src);
  await page.evaluate(async()=>{const entries=await window.__pm.entries();window.__pm.apply({type:'media.library',entries});window.__pm.open();});await page.locator('#pm-export-scope').selectOption('all');
  const event=page.waitForEvent('download');await page.locator('#pm-bulk').click();const download=await event,bytes=await readFile(await download.path());const result=await page.evaluate(async bytes=>{const zip=await JSZip.loadAsync(new Uint8Array(bytes));return {names:Object.keys(zip.files),manifest:JSON.parse(await zip.file('manifest.json').async('string'))};},[...bytes]);
  assert(result.names.includes('same.wav'));assert(result.names.includes('same-2.wav'));assert.equal(result.manifest.incomplete,false);
  await page.evaluate(path=>{window.__pm.forget(path);window.__pm.paint();},before.state.audio.slides[id].src);await page.locator('#pm-bulk').click();await page.waitForFunction(()=>document.querySelector('#pm-status').textContent.includes('Acknowledge'));
  await page.locator('#pm-incomplete').check();const incomplete=page.waitForEvent('download');await page.locator('#pm-bulk').click();await incomplete;assert.deepEqual(errors,[]);
 }finally{await page.close();}
});
test('denied microphone permission leaves project untouched and interruption releases tracks',async()=>{
 const {page,errors}=await setup();try{
  await reveal(page,'#rec-open');await page.locator('#rec-open').click();const before=await snapshot(page);
  await page.evaluate(()=>{window.__originalGetUserMedia=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);navigator.mediaDevices.getUserMedia=()=>Promise.reject(new DOMException('Denied','NotAllowedError'));});
  await page.locator('#rec-start').click();await page.waitForFunction(()=>document.querySelector('#rec-status').textContent.includes('permission denied'));assert.deepEqual((await snapshot(page)).state,before.state);
  await page.evaluate(()=>navigator.mediaDevices.getUserMedia=window.__originalGetUserMedia);await page.locator('#rec-start').click();await page.waitForFunction(()=>window.__pm.session());await page.waitForTimeout(600);await page.evaluate(()=>{window.__capturedTracks=window.__pm.tracks();window.__pm.stop('Device interruption.');});await page.waitForFunction(()=>!!window.__pm.take());assert.equal(await page.evaluate(()=>window.__capturedTracks.every(t=>t.readyState==='ended')),true);
  await page.locator('#rec-discard').click();assert.deepEqual((await snapshot(page)).state,before.state);assert.deepEqual(errors,[]);
 }finally{await page.close();}
});
test('locked shared replacement rolls back catalog and assignment removal keeps recoverable bytes',async()=>{
 const {page,errors}=await setup();try{
  const before=await snapshot(page),id=before.state.slides[0].id,path=before.state.audio.slides[id].src;
  await page.evaluate(async path=>{const entries=await window.__pm.entries();window.__pm.apply({type:'media.library',action:'remove',entries,path,index:0});},path);
  assert.equal((await snapshot(page)).state.audio.slides[id],undefined);assert.equal(await page.evaluate(path=>window.__pm.blob(path).size,path),wave().length);assert.equal(await page.evaluate(path=>window.__pm.rows().find(r=>r.path===path).status,path),'Retained for recovery');
  await page.locator('#fe-undo').click();assert.equal((await snapshot(page)).state.audio.slides[id].src,path);
  const entries=await page.evaluate(()=>window.__pm.entries());await page.locator('#wp-tab-arrange').click();await page.locator('#ce-slide-lock').click();const locked=await snapshot(page);
  const result=await operations(page,[{type:'media.library',action:'remove',entries,path,index:0}]);assert.equal(result.ok,false);assert.deepEqual((await snapshot(page)).state,locked.state);assert.deepEqual(errors,[]);
 }finally{await page.close();}
});
test('repair-mode JSON retains missing metadata while strict import refuses missing originals',async()=>{
 const {page,errors}=await setup();try{
  const result=await page.evaluate(async()=>{const pack=window.__pm.pack();pack.meta.id='missing-original-test';pack.schemaVersion=6;const entries=await window.__pm.entries();pack.state.assetLibrary={version:1,entries};const file=new File([JSON.stringify(pack)],'repair.json',{type:'application/json'});const repaired=await window.__pm.load(file,{browserAssets:true,allowMissingAssets:true});let strict='';try{await window.__pm.load(file,{browserAssets:true});}catch(error){strict=error.message;}return {count:repaired.assets.size,entries:Object.keys(repaired.pack.state.assetLibrary.entries).length,strict};});
  assert.equal(result.count,0);assert(result.entries>0);assert.match(result.strict,/missing/i);assert.deepEqual(errors,[]);
 }finally{await page.close();}
});
test('recording duration limit auto-stops with a downloadable review take',async()=>{
 const {page,errors}=await setup();try{
  await reveal(page,'#rec-open');await page.locator('#rec-open').click();await page.locator('#rec-start').click();await page.waitForFunction(()=>window.__pm.session());await page.waitForTimeout(500);await page.evaluate(()=>window.__pm.limit());await page.waitForFunction(()=>!!window.__pm.take());assert.equal(await page.evaluate(()=>window.__pm.session()),false);assert.match(await page.locator('#rec-status').textContent(),/Ten-minute limit/);assert.equal(await page.locator('#rec-download').isEnabled(),true);assert.deepEqual(errors,[]);
 }finally{await page.close();}
});
test('Project media light, dark and narrow layouts retain accessible controls without horizontal overflow',async()=>{
 const {page,errors}=await setup();try{
  await page.evaluate(()=>window.__pm.open());await page.screenshot({path:'test-results/project-media-light.png'});
  await page.locator('#pm-dialog').evaluate(d=>d.classList.add('editor-dark'));await page.screenshot({path:'test-results/project-media-dark.png'});
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-results/project-media-narrow.png'});assert.equal(await page.locator('#pm-dialog').evaluate(d=>d.scrollWidth<=d.clientWidth+1),true);
  await page.locator('#pm-search').fill('not-present');assert.equal(await page.locator('#pm-empty').isVisible(),true);await page.keyboard.press('Escape');await page.keyboard.press('Escape');assert.equal(await page.locator('#pm-dialog').evaluate(d=>d.open),false);assert.deepEqual(errors,[]);
 }finally{await page.close();}
});
test('import collisions remap retained catalog identities together with their assignments',async()=>{
 const {page,errors}=await setup();try{
  await page.evaluate(async()=>window.__pm.apply({type:'media.library',entries:await window.__pm.entries()}));const before=await snapshot(page),id=before.state.slides[0].id,oldPath=before.state.audio.slides[id].src,zip=await exportZip(page);
  await operations(page,[{type:'slide.update',slideId:id,changes:{notes:'local work retained before import'}}]);
  await page.locator('#fe-import-file').setInputFiles({name:'collision.zip',mimeType:'application/zip',buffer:zip});await page.locator('#fe-confirm-accept').click();await page.waitForFunction(()=>window.__pm.pack().history.past.some(s=>s.slides[0].notes==='local work retained before import'));
  const retained=await page.evaluate(()=>window.__pm.pack().history.past.find(s=>s.slides[0].notes==='local work retained before import'));const path=retained.audio.slides[id].src;assert.notEqual(path,oldPath);assert(retained.assetLibrary.entries[path]);assert.equal(retained.assetLibrary.entries[oldPath],undefined);assert.equal(await page.evaluate(path=>window.__pm.blob(path).size,path),wave().length);assert.deepEqual(errors,[]);
 }finally{await page.close();}
});

test('recording byte limit stops capture without dropping its reviewable original',async()=>{const {page,errors}=await setup();try{await reveal(page,'#rec-open');await page.locator('#rec-open').click();await page.locator('#rec-start').click();await page.waitForFunction(()=>window.__pm.session());await page.waitForTimeout(500);await page.evaluate(()=>window.__pm.byteLimit());await page.waitForFunction(()=>!!window.__pm.take());assert.match(await page.locator('#rec-status').textContent(),/byte limit/);assert.equal(await page.locator('#rec-download').isEnabled(),true);assert.equal(await page.evaluate(()=>window.__pm.session()),false);assert.deepEqual(errors,[]);}finally{await page.close();}});

test('multi-chunk recording retains the final signal and full decoded duration through offline reopen',async()=>{
 const {page,errors}=await setup();try{
  await page.evaluate(()=>{const Native=MediaRecorder;window.__chunks=[];window.MediaRecorder=class extends Native{constructor(stream,options){super(stream,options);this.addEventListener('dataavailable',e=>window.__chunks.push(e.data));this.addEventListener('stop',()=>window.__liveAtStop=stream.getTracks().every(t=>t.readyState==='live'));}};const ctx=new AudioContext(),osc=ctx.createOscillator(),dest=ctx.createMediaStreamDestination();osc.frequency.value=440;osc.connect(dest);osc.start();window.__tone={ctx,osc};navigator.mediaDevices.getUserMedia=async()=>dest.stream;});
  await page.locator('#rc-record').click();await page.waitForFunction(()=>window.__pm.session());await page.waitForTimeout(9000);await page.evaluate(()=>window.__tone.osc.frequency.value=880);await page.waitForTimeout(3000);await page.locator('#rc-stop').click();await page.waitForFunction(()=>!!window.__pm.take());
  const result=await page.evaluate(async()=>{const take=window.__pm.take(),ctx=new AudioContext(),audio=await ctx.decodeAudioData(await take.blob.arrayBuffer()),data=audio.getChannelData(0);function crossings(start){let n=0;for(let i=Math.floor(start*audio.sampleRate);i<(start+.4)*audio.sampleRate;i++)if(data[i]<=0&&data[i+1]>0)n++;return n;}const result={duration:audio.duration,ratio:crossings(audio.duration-.6)/crossings(1),chunks:window.__chunks.length,bytes:window.__chunks.reduce((n,b)=>n+b.size,0),size:take.blob.size,live:window.__liveAtStop};await ctx.close();return result;});
  assert(result.duration>11.5);assert(result.chunks>30);assert.equal(result.bytes,result.size);assert.equal(result.live,true);assert(result.ratio>1.8&&result.ratio<2.2);
  await page.locator('#rc-use').click();await page.waitForFunction(()=>!window.__pm.take());const pack=await snapshot(page),track=pack.state.audio.slides[pack.state.slides[0].id],hash=await page.evaluate(path=>window.__pm.hash(window.__pm.blob(path)),track.src);assert(track.durationMs>11500);await page.locator('#full-editor').evaluate(d=>d.close());await page.locator('#open-full-editor').click();const zip=await exportZip(page),fresh=await browser.newPage({viewport:{width:1366,height:900}});try{await fresh.goto('file://'+resolve('test-results/project-media.html')+'?start=present');await fresh.locator('#open-full-editor').click();await fresh.context().setOffline(true);await fresh.locator('#fe-import-file').setInputFiles({name:'recording.zip',mimeType:'application/zip',buffer:zip});await fresh.waitForFunction(id=>window.presentationStudioEditing.read().projectId===id,pack.projectId);assert.equal(await fresh.evaluate(path=>window.__pm.hash(window.__pm.blob(path)),track.src),hash);assert.equal((await snapshot(fresh)).state.audio.slides[pack.state.slides[0].id].durationMs,track.durationMs);}finally{await fresh.close();}assert.deepEqual(errors,[]);
 }finally{await page.close();}
});

test('incomplete recording is retained for download and cannot replace existing narration',async()=>{const {page,errors}=await setup();try{const before=await snapshot(page);await reveal(page,'#rec-open');await page.locator('#rec-open').click();await page.locator('#rec-start').click();await page.waitForFunction(()=>window.__pm.session());await page.waitForTimeout(700);await page.locator('#rec-stop').click();await page.waitForFunction(()=>!!window.__pm.take());await page.evaluate(()=>window.__pm.take().elapsedMs=10000);await page.locator('#rec-accept').click();await page.waitForFunction(()=>document.querySelector('#rec-status').textContent.includes('incomplete'));assert.deepEqual((await snapshot(page)).state,before.state);assert.equal(await page.locator('#rec-download').isEnabled(),true);assert.deepEqual(errors,[]);}finally{await page.close();}});

test('canvas transport records and reviews without a modal, preserves previous narration until acceptance and supports Undo',async()=>{
 const {page,errors}=await setup();try{
  const before=await snapshot(page);assert.equal(await page.locator('#rc-strip').isVisible(),true);await page.locator('#rc-record').click();await page.waitForFunction(()=>window.__pm.session());assert.equal(await page.locator('#rec-dialog').evaluate(d=>d.open),false);
  await page.waitForTimeout(700);await page.screenshot({path:'test-results/canvas-recording-active.png'});await page.locator('#rc-stop').click();await page.waitForFunction(()=>!!window.__pm.take());assert.deepEqual((await snapshot(page)).state,before.state);
  await page.locator('#rc-preview-button').click();await page.waitForFunction(()=>document.querySelector('#rc-preview-button').textContent==='Pause');await page.locator('#rc-preview-button').click();await page.locator('#rc-seek').focus();await page.keyboard.press('Home');assert.equal(await page.locator('#rc-seek').inputValue(),'0');
  await page.waitForFunction(()=>!document.querySelector('#rc-wave').hidden);await page.screenshot({path:'test-results/canvas-recording-review.png'});await page.locator('#rc-use').click();await page.waitForFunction(()=>!window.__pm.take());const after=await snapshot(page);assert.notEqual(after.state.audio.slides[after.state.slides[0].id].src,before.state.audio.slides[before.state.slides[0].id].src);
  await page.locator('#fe-undo').click();assert.deepEqual((await snapshot(page)).state.audio,before.state.audio);assert.deepEqual(errors,[]);
 }finally{await page.close();}
});
test('canvas slide navigation stops capture, retains the original-target take and prevents wrong-slide acceptance',async()=>{
 const {page,errors}=await setup();try{
  const before=await snapshot(page),second=before.state.slides[1];await page.locator('#rc-record').click();await page.waitForFunction(()=>window.__pm.session());await page.waitForTimeout(500);await page.locator('.fe-slide-button[data-slide-id="'+second.id+'"]').click();await page.waitForFunction(()=>!window.__pm.session()&&!!window.__pm.take());assert.equal(await page.locator('#rc-use').isDisabled(),true);assert.equal(await page.locator('#rc-download').isEnabled(),true);assert.match(await page.locator('#rc-hint').textContent(),/original slide/);assert.deepEqual((await snapshot(page)).state,before.state);
  await page.locator('#rc-discard').click();assert.equal(await page.evaluate(()=>!!window.__pm.take()),false);assert.deepEqual((await snapshot(page)).state,before.state);assert.deepEqual(errors,[]);
 }finally{await page.close();}
});
test('canvas cancel releases a permission-delayed microphone and never changes existing narration',async()=>{
 const {page,errors}=await setup();try{
  const before=await snapshot(page);await page.evaluate(()=>{const original=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);navigator.mediaDevices.getUserMedia=async(...args)=>{const stream=await original(...args);window.__lateTracks=stream.getTracks();await new Promise(resolve=>window.__grant=resolve);return stream;};});
  await page.locator('#rc-record').click();await page.waitForFunction(()=>!!window.__grant);await page.locator('#rc-cancel').click();await page.evaluate(()=>window.__grant());await page.waitForFunction(()=>window.__lateTracks.every(track=>track.readyState==='ended'));assert.equal(await page.evaluate(()=>window.__pm.session()),false);assert.deepEqual((await snapshot(page)).state,before.state);assert.deepEqual(errors,[]);
 }finally{await page.close();}
});
test('canvas controls stay outside the slide, fit laptop/dark/narrow layouts and disable recording for locks',async()=>{
 const {page,errors}=await setup();try{
  await page.setViewportSize({width:1366,height:768});await page.screenshot({path:'test-results/canvas-recording-ready.png'});
  assert.equal(await page.locator('#rc-strip').evaluate(el=>!el.closest('#we-viewport')&&el.getBoundingClientRect().top>=document.querySelector('#we-viewport').getBoundingClientRect().bottom),true);
  await page.evaluate(()=>document.body.classList.add('editor-dark'));await page.screenshot({path:'test-results/canvas-recording-dark.png'});await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-results/canvas-recording-narrow.png'});assert.equal(await page.locator('#rc-strip').evaluate(el=>el.scrollWidth<=el.clientWidth+1),true);
  await page.setViewportSize({width:1366,height:900});await page.locator('#wp-tab-arrange').click();await page.locator('#ce-slide-lock').click();assert.equal(await page.locator('#rc-record').isDisabled(),true);assert.deepEqual(errors,[]);
 }finally{await page.close();}
});

test('leaving canvas editing stops microphone access and reopening retains the reviewable take',async()=>{const {page,errors}=await setup();try{await page.locator('#rc-record').click();await page.waitForFunction(()=>window.__pm.session());await page.waitForTimeout(500);await page.locator('#full-editor').evaluate(d=>d.close());await page.waitForFunction(()=>!window.__pm.session()&&!!window.__pm.take());await page.locator('#open-full-editor').click();assert.equal(await page.locator('#rc-use').isVisible(),true);await page.locator('#rc-discard').click();await page.locator('#vb-preview-mode').click();assert.equal(await page.locator('#rc-record').isDisabled(),true);assert.deepEqual(errors,[]);}finally{await page.close();}});
