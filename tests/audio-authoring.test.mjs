import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chooseExample,snapshot,operations,exportZip,importZip} from './collection-ui.mjs';
import {reveal} from './ui.mjs';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']});test.after(()=>browser.close());
await mkdir('test-results',{recursive:true});
await writeFile('test-results/audio-authoring.html',(await readFile('dist/presentation-studio.html','utf8')).replace('  projectInit();','window.__auTest={pack:projectPack,validate:projectValidatePack,legacy:auValidatePack,refs:()=>[...projectReferenced()],bytes:path=>mediaBlobs.get(path)?.size,byteData:async path=>Array.from(new Uint8Array(await mediaBlobs.get(path).arrayBuffer())),delayProbe:()=>{const probe=audioCore.probe;audioCore.probe=async(...args)=>{const info=await probe(...args);await new Promise(resolve=>window.__auRelease=resolve);return info;};}};\n  projectInit();'));
function wave(){const rate=8000,count=rate,buffer=Buffer.alloc(44+count*2);buffer.write('RIFF');buffer.writeUInt32LE(buffer.length-8,4);buffer.write('WAVEfmt ',8);buffer.writeUInt32LE(16,16);buffer.writeUInt16LE(1,20);buffer.writeUInt16LE(1,22);buffer.writeUInt32LE(rate,24);buffer.writeUInt32LE(rate*2,28);buffer.writeUInt16LE(2,32);buffer.writeUInt16LE(16,34);buffer.write('data',36);buffer.writeUInt32LE(count*2,40);for(let i=0;i<count;i++)buffer.writeInt16LE(Math.round(Math.sin(i/rate*2*Math.PI*440)*1000),44+i*2);return buffer;}
const fixture=wave();
async function setup(){const page=await browser.newPage({acceptDownloads:true,viewport:{width:1366,height:900}}),errors=[];page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));await page.goto('file://'+resolve('test-results/audio-authoring.html'));await page.locator('#open-full-editor').click();await chooseExample(page,'portfolio-demo');return {page,errors};}
async function attach(page){await reveal(page,'#au-slide-file');await page.locator('#au-slide-file').setInputFiles({name:'original-tone.wav',mimeType:'audio/wav',buffer:fixture});await page.waitForFunction(()=>window.presentationStudioEditing.read().state.audio?.slides&&Object.keys(window.presentationStudioEditing.read().state.audio.slides).length===1);}
test('attach, replace, remove and Undo preserve guarded audio and original shared assets',async()=>{
 const {page,errors}=await setup();try{const before=await snapshot(page);assert.equal(await page.evaluate(()=>window.__auTest.pack().schemaVersion),2);await attach(page);const after=await snapshot(page),id=before.state.slides[0].id,track=after.state.audio.slides[id];assert.equal(track.bytes,fixture.length);assert.equal(track.durationMs,1000);assert.deepEqual(after.state.slides.map(s=>s.id),before.state.slides.map(s=>s.id));
 assert.equal(await page.evaluate(()=>window.__auTest.pack().schemaVersion),5);
 assert.match(await page.evaluate(()=>{try{window.__auTest.legacy(window.__auTest.pack());return '';}catch(e){return e.message;}}),/Unsupported/);
 assert.match(await page.evaluate(()=>{const p=window.__auTest.pack();p.schemaVersion=4;try{window.__auTest.validate(p);return '';}catch(e){return e.message;}}),/Audio requires.*v5/);
 await page.locator('#fe-undo').click();assert.equal((await snapshot(page)).state.audio,undefined);await page.locator('#fe-redo').click();assert.equal((await snapshot(page)).state.audio.slides[id].src,track.src);
 const shared=await operations(page,[{type:'audio.settings',role:'music',slideId:id,track:{src:track.src,name:track.name,mime:track.mime,bytes:track.bytes,durationMs:track.durationMs,volume:.5,loop:true}}]);assert(shared.ok,shared.message);
 await reveal(page,'#au-slide-remove');await page.locator('#au-slide-remove').click();assert.equal((await snapshot(page)).state.audio.music.src,track.src);assert.equal(await page.evaluate(path=>window.__auTest.bytes(path),track.src),fixture.length);assert.equal((await page.evaluate(()=>window.__auTest.refs())).filter(p=>p===track.src).length,1);assert.deepEqual(errors,[]);
 }finally{await page.close();}
});
test('invalid audio, stale paths and locks cannot mutate authored state',async()=>{
 const {page,errors}=await setup();try{await reveal(page,'#au-slide-file');const before=await snapshot(page);await page.locator('#au-slide-file').setInputFiles({name:'broken.wav',mimeType:'audio/wav',buffer:Buffer.from('not wave')});await page.waitForFunction(()=>document.querySelector('#au-status').textContent.includes('cannot decode'));assert.deepEqual((await snapshot(page)).state,before.state);
 const id=before.state.slides[0].id,result=await operations(page,[{type:'audio.settings',role:'slide',slideId:id,track:{src:'assets/../secret.wav',name:'x.wav',mime:'audio/wav',bytes:1,durationMs:1000,volume:1,advanceOnEnd:false,paddingMs:500}}]);assert.equal(result.ok,false);assert.deepEqual((await snapshot(page)).state,before.state);assert.deepEqual(errors,[]);
 }finally{await page.close();}
});
test('editable ZIP restores audio original bytes and guarded metadata in a clean profile',async()=>{
 const {page,errors}=await setup();try{await attach(page);const before=await snapshot(page),id=before.state.slides[0].id,path=before.state.audio.slides[id].src;const zip=await exportZip(page);const fresh=await browser.newPage({acceptDownloads:true,viewport:{width:1366,height:900}});try{await fresh.goto('file://'+resolve('test-results/audio-authoring.html'));await fresh.locator('#open-full-editor').click();await fresh.context().setOffline(true);await fresh.locator('#fe-import-file').setInputFiles({name:'audio-editable.zip',mimeType:'application/zip',buffer:zip});await fresh.waitForFunction(id=>window.presentationStudioEditing.read().projectId===id,before.projectId);const after=await snapshot(fresh);assert.deepEqual(after.state.audio,before.state.audio);assert.deepEqual(after.state.slides.map(s=>s.id),before.state.slides.map(s=>s.id));assert.equal(await fresh.evaluate(p=>window.__auTest.bytes(p),path),fixture.length);assert.deepEqual(Buffer.from(await fresh.evaluate(p=>window.__auTest.byteData(p),path)),fixture);assert.equal(await fresh.evaluate(()=>window.__auTest.pack().schemaVersion),5);}finally{await fresh.close();}assert.deepEqual(errors,[]);
 }finally{await page.close();}
});

test('asynchronous attachment rejects a changed slide and locked authoring',async()=>{
 const {page,errors}=await setup();try{
  const before=await snapshot(page),[a,b]=before.state.slides;await page.evaluate(()=>window.__auTest.delayProbe());await reveal(page,'#au-slide-file');await page.locator('#au-slide-file').setInputFiles({name:'original.wav',mimeType:'audio/wav',buffer:fixture});await page.waitForFunction(()=>typeof window.__auRelease==='function');
  await page.locator('.fe-slide-button[data-slide-id="'+b.id+'"]').click();await page.evaluate(()=>window.__auRelease());await page.waitForFunction(()=>document.querySelector('#au-status').textContent.includes('selection changed'));assert.equal((await snapshot(page)).state.audio,undefined);
  await page.locator('#wp-tab-arrange').click();await page.locator('#ce-slide-lock').click();const locked=await snapshot(page);const result=await operations(page,[{type:'audio.settings',role:'mode',slideId:b.id,mode:'slide'}]);assert.equal(result.ok,false);assert.deepEqual((await snapshot(page)).state,locked.state);assert.deepEqual(errors,[]);
 }finally{await page.close();}
});
