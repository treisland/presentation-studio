import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium} from 'playwright';
import {click} from './ui.mjs';
import vm from 'node:vm';
import {createServer} from 'node:http';

const browser = await chromium.launch({headless:true, executablePath:process.env.CHROMIUM_EXECUTABLE_PATH, args:['--no-sandbox']});
test.after(() => browser.close());
const example = JSON.parse(await readFile('docs/ai/example.json', 'utf8'));
const blank = JSON.parse(await readFile('templates/blank/presentation.json', 'utf8'));
const zipContext = {setImmediate,clearImmediate,setTimeout,clearTimeout,Uint8Array,ArrayBuffer,TextEncoder,TextDecoder};
vm.runInNewContext(await readFile('vendor/jszip-3.10.1.min.js','utf8'),zipContext);
await mkdir('test-results', {recursive:true});
const html = (await readFile('dist/presentation-studio.html','utf8')).replace('  projectInit();', `
window.__lwTest = {load:lwLoad, stage:lwStage, save:lwSave, check:lwCheckDisk, write:lwWrite, schema:paSchema, validate:paValidate,
  pack:()=>projectPack(), link:()=>lwLinked, dirty:()=>lwNativeDirty(), setBackups:h=>{lwBackupFolder=h;},
  edit:title=>projectChange(()=>{projectState.projectName=title;}), persisted:()=>hubAllRecords()};
  projectInit();`);
await writeFile('test-results/workspace-fixture.html',html);

async function open({filesystem = false, blockedPreferences = false} = {}) {
  const page = await browser.newPage({acceptDownloads:true, viewport:{width:1280,height:800}});
  page.setDefaultTimeout(15000); const errors=[]; page.on('pageerror', e=>errors.push(e.message));
  if(blockedPreferences)await page.addInitScript(()=>{
    const original=indexedDB.open.bind(indexedDB);
    indexedDB.open=(name,...args)=>name==='presentation-studio-workspaces'?{}:original(name,...args);
  });
  if (!filesystem) await page.addInitScript(()=>{window.showDirectoryPicker=undefined;window.showSaveFilePicker=undefined;});
  if (filesystem) await page.addInitScript(({blank,example})=>{
    class Handle {
      kind='file'; permission='granted'; writes=0; fail=false; aborts=0;
      constructor(name,content){this.name=name;this.content=content;}
      async queryPermission(){return this.permission;}
      async requestPermission(){return this.permission;}
      async getFile(){if(this.missing)throw Error('Share disconnected');return new File([this.content],this.name,{lastModified:123456});}
      async isSameEntry(other){return other===this;}
      async createWritable(){if(this.permission!=='granted')throw Error('Permission denied');let value;
        return {write:async blob=>{if(this.fail)throw Error('Write failed');value=await blob.arrayBuffer();},
          close:async()=>{this.content=value;this.writes++;},abort:async()=>{this.aborts++;}};}
    }
    class Folder {
      kind='directory'; name='Presentations'; permission='granted'; files=new Map();
      async queryPermission(){return this.permission;} async requestPermission(){return this.permission;}
      async *entries(){yield* this.files;}
      async getFileHandle(name,options){if(!this.files.has(name)){if(!options?.create)throw Error('Missing file');this.files.set(name,new Handle(name,''));}return this.files.get(name);}
      async removeEntry(name){this.files.delete(name);}
    }
    const folder=new Folder(), native=new Handle('project.json',JSON.stringify(blank)), ai=new Handle('ai.json',JSON.stringify(example));
    folder.files.set(native.name,native);folder.files.set(ai.name,ai);
    const backup=new Folder();backup.name='Backups';
    window.__fs={folder,native,ai,backup,Handle,Folder,saveHandle:new Handle('copy.zip','')};
    window.showDirectoryPicker=async()=>folder;
    window.showSaveFilePicker=async()=>window.__fs.saveHandle;
  },{blank,example});
  await page.goto('file://'+resolve('test-results/workspace-fixture.html'));
  await page.locator('#open-full-editor').click(); await click(page,'#lw-open');
  return {page,errors};
}
async function accept(page,copy=false) {
  await page.locator(copy?'#lw-review-copy':'#lw-review-open').click();
  if(await page.locator('#hub-switch').evaluate(el=>el.open))await page.locator('#hub-save-switch').click();
  await page.locator('#lw-panel').waitFor({state:'hidden'});
}
async function linked(page) {
  await page.locator('#lw-tab-folder').click();
  await page.locator('#lw-connect').click();
  await page.locator('#lw-files button').filter({hasText:'project.json'}).click();
  await page.locator('#lw-review h3').waitFor(); await accept(page);
  await click(page,'#lw-open');
  await page.locator('#lw-tab-save').click();
}

test('portable authoring review, repair, safe text and editable ZIP roundtrip',async()=>{
  const {page,errors}=await open();try{
    const initial=await page.evaluate(()=>__lwTest.pack().meta.id);
    await page.locator('#lw-json').fill(JSON.stringify({...example,unexpected:true}));await page.locator('#lw-validate').click();
    await page.waitForFunction(()=>document.querySelector('#lw-message').textContent.includes('unsupported field'));
    assert.match(await page.locator('#lw-repair').inputValue(),/unsupported field unexpected/);
    assert.equal(await page.evaluate(()=>__lwTest.pack().meta.id),initial);
    const safe=structuredClone(example);safe.slides[0].blocks[0].text='<img src=x onerror="window.compromised=true">';
    safe.slides[0].sources=[{label:'Research source',url:'https://example.com/research'}];
    await page.locator('#lw-json').fill(JSON.stringify(safe));await page.locator('#lw-validate').click();
    await page.locator('#lw-review h3').waitFor();assert.equal(await page.locator('#lw-review img').count(),0);
    await page.screenshot({path:'test-results/local-workspace-review.png',fullPage:true});
    await accept(page);assert.notEqual(await page.evaluate(()=>__lwTest.pack().meta.id),initial);
    assert.equal(await page.evaluate(()=>!!window.compromised),false);
    assert.equal(await page.locator('#fe-preview img[src="x"]').count(),0);
    // Exercise the public download path and reimport through the same bounded loader.
    await click(page,'#lw-open');
    await page.locator('#lw-tab-save').click();
    const download=page.waitForEvent('download');await page.locator('#lw-save-copy').click();
    const bytes=await readFile(await(await download).path());
    const restored=await page.evaluate(async bytes=>{
      const loaded=await __lwTest.load(new File([new Uint8Array(bytes)],'roundtrip.zip'));
      return {state:loaded.pack.state,current:__lwTest.pack().state};
    },[...bytes]);
    assert.deepEqual(restored.state,restored.current);assert.deepEqual(errors,[]);
  }finally{await page.close();}
});

test('schema and runtime share limits; malformed documents and dangerous paths fail without mutation',async()=>{
  const {page,errors}=await open();try{
    const checks=await page.evaluate(async example=>{
      const cases=[];const run=async(raw,name='bad.json')=>{try{await __lwTest.load(new File([JSON.stringify(raw)],name));cases.push('accepted');}catch(e){cases.push(e.message);}};
      await run({...example,version:2});await run({...example,slides:Array(101).fill(example.slides[0])});
      const bad=structuredClone(example);bad.slides[0].blocks=[{type:'table',headers:['One'],rows:[['A','B']]}];await run(bad);
      const native=__lwTest.pack();native.state.brand.logo='assets/../secret.png';await run(native);
      const xss=structuredClone(example);xss.slides[0].sources=[{label:'bad',url:'javascript:alert(1)'}];await run(xss);
      return {cases,schema:__lwTest.schema()};
    },example);
    assert(checks.cases.every(message=>message!=='accepted'),JSON.stringify(checks.cases));
    assert.match(checks.cases[0],/version/);assert.match(checks.cases[2],/header width/);assert.match(checks.cases[3],/Unsafe asset/);
    assert.equal(checks.schema.properties.slides.maxItems,100);assert.deepEqual(errors,[]);
  }finally{await page.close();}
});

test('folder browsing, linked save, external conflict and invalid reload preserve working state',async()=>{
  const {page,errors}=await open({filesystem:true});try{
    await linked(page);
    assert.equal(await page.locator('#lw-files button').count(),2);
    await page.evaluate(()=>__lwTest.edit('Studio edits'));
    await page.locator('#lw-save').click();
    await page.waitForFunction(()=>window.__fs.native.writes===1);
    assert.equal(await page.evaluate(()=>__lwTest.dirty()),false);
    assert.match(await page.locator('#fe-status').textContent(),/Matches last disk load\/save/);
    await page.evaluate(()=>{__lwTest.edit('Keep my edits');__fs.native.content='{"external":true}';});
    await page.locator('#lw-save').click();await page.waitForFunction(()=>document.querySelector('#lw-message').textContent.includes('Disk changed'));
    assert.equal(await page.evaluate(()=>__fs.native.writes),1);
    await page.locator('#lw-reload').click();await page.waitForFunction(()=>document.querySelector('#lw-message').textContent.includes('Unsupported project format'));
    assert.equal(await page.evaluate(()=>__lwTest.pack().meta.name),'Keep my edits');
    await page.evaluate(()=>{__fs.native.missing=true;});await page.evaluate(()=>__lwTest.check());
    assert.match(await page.locator('#lw-message').textContent(),/unavailable/);assert.equal(await page.evaluate(()=>__lwTest.pack().meta.name),'Keep my edits');
    await page.evaluate(()=>{__fs.native.missing=false;__fs.native.content=JSON.stringify(__lwTest.pack());});
    await page.locator('#lw-reload').click();await page.locator('#lw-review h3').waitFor();await accept(page);
    await click(page,'#lw-open');
    await page.locator('#lw-tab-save').click();
    await page.evaluate(()=>{__fs.native.permission='denied';__lwTest.edit('Denied edit');});
    await page.locator('#lw-save').click();await page.waitForFunction(()=>document.querySelector('#lw-message').textContent.includes('permission'));
    assert.equal(await page.evaluate(()=>__fs.native.writes),1);assert.equal(await page.evaluate(()=>__lwTest.dirty()),true);
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
});

test('failed writes abort and snapshot retention is bounded; saved copies reopen',async()=>{
  const {page,errors}=await open({filesystem:true});try{
    await linked(page);
    await page.evaluate(()=>__lwTest.setBackups(__fs.backup));
    for(let i=0;i<6;i++){
      await page.evaluate(i=>__lwTest.edit('Revision '+i),i);await page.locator('#lw-save').click();
      await page.waitForFunction(n=>__fs.native.writes===n,i+1);
    }
    assert.equal(await page.evaluate(()=>__fs.backup.files.size),5);
    await page.evaluate(()=>{__fs.native.fail=true;__lwTest.edit('Write failure retained');});
    await page.locator('#lw-save').click();await page.waitForFunction(()=>document.querySelector('#lw-message').textContent.includes('Write failed'));
    assert.equal(await page.evaluate(()=>__fs.native.aborts),1);assert.equal(await page.evaluate(()=>__lwTest.dirty()),true);
    await page.locator('#lw-save-copy').click();await page.waitForFunction(()=>__fs.saveHandle.writes===1);
    const restored=await page.evaluate(async()=>{
      const file=await __fs.saveHandle.getFile(),loaded=await __lwTest.load(file);return {title:loaded.pack.meta.name,id:loaded.pack.meta.id,current:__lwTest.pack().meta.id};
    });
    assert.equal(restored.title,'Write failure retained');assert.equal(restored.id,restored.current);assert.deepEqual(errors,[]);
  }finally{await page.close();}
});

test('save-copy ZIP retains actual demo media and history; unsafe assets and folder limits are rejected',async()=>{
  const {page,errors}=await open({filesystem:true});try{
    await page.locator('#lw-tab-save').click();
    await page.locator('#lw-save-copy').click();await page.waitForFunction(()=>__fs.saveHandle.writes===1);
    const roundtrip=await page.evaluate(async()=>{
      const loaded=await __lwTest.load(await __fs.saveHandle.getFile());
      return {state:loaded.pack.state,history:loaded.pack.history,current:__lwTest.pack(),assets:loaded.assets.size};
    });
    assert(roundtrip.assets>0);assert.deepEqual(roundtrip.state,roundtrip.current.state);assert.deepEqual(roundtrip.history,roundtrip.current.history);
    const archiveErrors=await page.evaluate(async()=>{
      // JSZip is intentionally not exposed by production; construct fixtures using the downloaded editable archive.
      const valid=await __fs.saveHandle.getFile(),loaded=await __lwTest.load(valid);
      const unsafe=structuredClone(loaded.pack);unsafe.state.media={x:{src:'https://tracker.example/pixel.png'}};
      try{await __lwTest.load(new File([JSON.stringify(unsafe)],'unsafe.json'));return 'accepted';}catch(e){return e.message;}
    });
    assert.match(archiveErrors,/Unsafe asset/);
    await page.evaluate(()=>{for(let i=0;i<501;i++)__fs.folder.files.set('unrelated-'+i,{kind:'directory'});});
    await page.locator('#lw-tab-folder').click();
    await page.locator('#lw-connect').click();await page.waitForFunction(()=>document.querySelector('#lw-message').textContent.includes('500 top-level'));
    assert.equal(await page.evaluate(()=>__lwTest.pack().meta.id),roundtrip.current.meta.id);assert.deepEqual(errors,[]);
  }finally{await page.close();}
});

test('traversal archives, decompression limits, future project versions and unsupported browser fallback',async()=>{
  const {page,errors}=await open();try{
    const traversal=new zipContext.JSZip();traversal.file('presentation.json',JSON.stringify(blank));traversal.file('assets/../secret.txt','untrusted');
    const expansion=new zipContext.JSZip();expansion.file('presentation.json',' '.repeat(21*1024*1024));
    for(const [archive,expected] of [[traversal,/Unsafe ZIP entry/],[expansion,/expansion limit/]]) {
      const bytes=await archive.generateAsync({type:'uint8array',compression:'DEFLATE'});
      const error=await page.evaluate(async bytes=>{
        try{await __lwTest.load(new File([new Uint8Array(bytes)],'bad.zip'));return 'accepted';}catch(e){return e.message;}
      },[...bytes]);assert.match(error,expected);
    }
    const future={...blank,schemaVersion:999};
    await page.locator('#lw-file').setInputFiles({name:'future.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(future))});
    await page.waitForFunction(()=>document.querySelector('#lw-message').textContent.includes('Unsupported project format'));
    await page.setViewportSize({width:540,height:800});
    await page.locator('#lw-tab-create').focus();await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('#lw-tab-folder').getAttribute('aria-selected'),'true');
    assert.equal(await page.locator('#lw-connect').isDisabled(),true);
    assert.match(await page.locator('#lw-support').textContent(),/unavailable/);
    assert.equal(await page.locator('#lw-panel').evaluate(el=>el.scrollWidth<=el.clientWidth+2),true);
    await page.screenshot({path:'test-results/local-workspace-small.png',fullPage:true});
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
});

test('folder names appear despite blocked remembered storage and unavailable file metadata',async()=>{
  const {page,errors}=await open({filesystem:true,blockedPreferences:true});try{
    await page.evaluate(()=>{
      __fs.native.getFile=()=>new Promise(()=>{});
      const unavailable=new __fs.Handle('unavailable.zip','');unavailable.getFile=async()=>{throw new DOMException('File offline','NotReadableError');};
      __fs.folder.files.set(unavailable.name,unavailable);
    });
    await page.locator('#lw-tab-folder').click();await page.locator('#lw-search').fill('stale search');
    await page.locator('#lw-connect').click();
    await page.locator('#lw-files button').filter({hasText:'project.json'}).waitFor();
    assert.equal(await page.locator('#lw-files button:visible').count(),3);
    assert.equal(await page.locator('#lw-search').inputValue(),'');
    await page.waitForFunction(()=>document.querySelector('#lw-panel').getAttribute('aria-busy')==='false');
    assert.match(await page.locator('#lw-folder-summary').textContent(),/Connected read-only/);
    await page.waitForFunction(()=>document.querySelector('#lw-folder-summary').textContent.includes('could not be remembered'));
    assert.match(await page.locator('#lw-files').innerText(),/file information unavailable/);
    // A healthy file still opens even though another file never returns metadata.
    await page.locator('#lw-files button').filter({hasText:'ai.json'}).click();await page.locator('#lw-review h3').waitFor();
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
});

test('cancelled folder selection, empty nested folders and filtered results explain what happened',async()=>{
  const {page,errors}=await open({filesystem:true});try{
    await page.locator('#lw-tab-folder').click();
    await page.evaluate(()=>{window.showDirectoryPicker=async()=>{throw new DOMException('Cancelled','AbortError');};});
    await page.locator('#lw-connect').click();await page.waitForFunction(()=>document.querySelector('#lw-message').textContent.includes('cancelled'));
    assert.match(await page.locator('#lw-message').textContent(),/Select Folder/);
    await page.evaluate(()=>{window.showDirectoryPicker=async()=>__fs.folder;});await page.locator('#lw-connect').click();
    await page.locator('#lw-files button').first().waitFor();
    await page.locator('#lw-search').fill('not-a-filename');assert.equal(await page.locator('#lw-search-empty').isVisible(),true);
    await page.locator('#lw-clear-search').click();assert.equal(await page.locator('#lw-files button:visible').count(),2);
    await page.evaluate(()=>{__fs.folder.files.clear();__fs.folder.files.set('nested',{kind:'directory'});});
    await page.locator('#lw-refresh').click();await page.waitForFunction(()=>document.querySelector('#lw-folder-summary').textContent.includes('No top-level'));
    assert.match(await page.locator('#lw-folder-summary').textContent(),/1 subfolder/);assert.equal(await page.locator('#lw-files button').count(),0);
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
});

test('a real browser directory handle lists JSON/ZIP files and survives preference serialization',async()=>{
  const server=createServer((request,response)=>{
    if(request.url!=='/'){response.writeHead(404);response.end();return;}
    response.setHeader('Content-Type','text/html; charset=utf-8');response.end(html);
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
    await page.addInitScript(({blank})=>{
      window.showDirectoryPicker=async()=>{
        const root=await navigator.storage.getDirectory(),folder=await root.getDirectoryHandle('presentation-tests',{create:true});
        for(const [name,content]of [['project.json',JSON.stringify(blank)],['another.ZIP','List without reading archive content']]){
          const writer=await(await folder.getFileHandle(name,{create:true})).createWritable();await writer.write(content);await writer.close();
        }
        return folder;
      };
    },{blank});
    await page.goto('http://127.0.0.1:'+server.address().port+'/');await page.locator('#open-full-editor').click();await click(page,'#lw-open');
    await page.locator('#lw-tab-folder').click();await page.locator('#lw-connect').click();
    await page.locator('#lw-files button').filter({hasText:'project.json'}).waitFor();assert.equal(await page.locator('#lw-files button').count(),2);
    await page.waitForFunction(()=>document.querySelector('#lw-files').textContent.includes('KB'));
    await page.waitForFunction(async()=>new Promise(resolve=>{
      const request=indexedDB.open('presentation-studio-workspaces',1);request.onerror=()=>resolve(false);
      request.onsuccess=()=>{const db=request.result,tx=db.transaction('handles','readonly'),saved=tx.objectStore('handles').get('folder');
        saved.onsuccess=()=>resolve(saved.result instanceof FileSystemDirectoryHandle);saved.onerror=()=>resolve(false);tx.oncomplete=()=>db.close();};
    }));
    await page.reload();await page.locator('#open-full-editor').click();await click(page,'#lw-open');await page.locator('#lw-tab-folder').click();await page.locator('#lw-reconnect').click();
    await page.waitForFunction(()=>document.querySelector('#lw-message').textContent.includes('Connected read-only'));
    await page.locator('#lw-files button').filter({hasText:'project.json'}).click();await page.locator('#lw-review h3').waitFor();
    assert.deepEqual(errors,[]);
  }finally{await page.close();await new Promise(resolve=>server.close(resolve));}
});
