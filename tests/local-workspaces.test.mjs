import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium} from 'playwright';
import {click} from './ui.mjs';
import vm from 'node:vm';

const browser = await chromium.launch({headless:true, executablePath:process.env.CHROMIUM_EXECUTABLE_PATH, args:['--no-sandbox']});
test.after(() => browser.close());
const example = JSON.parse(await readFile('docs/ai/example.json', 'utf8'));
const blank = JSON.parse(await readFile('templates/blank/presentation.json', 'utf8'));
const zipContext = {setImmediate,clearImmediate,setTimeout,clearTimeout,Uint8Array,ArrayBuffer,TextEncoder,TextDecoder};
vm.runInNewContext(await readFile('vendor/jszip-3.10.1.min.js','utf8'),zipContext);
await mkdir('test-results', {recursive:true});
const html = (await readFile('dist/presentation-studio.html','utf8')).replace('  projectInit();', `
window.__lwTest = {load:lwLoad, stage:lwStage, schema:paSchema, validate:paValidate,
  pack:()=>projectPack(), saveDraft:()=>projectSaveDraft(),
  edit:title=>projectChange(()=>{projectState.projectName=title;}), persisted:()=>hubAllRecords()};
  projectInit();`);
await writeFile('test-results/workspace-fixture.html',html);

async function open({nativeAvailable=false} = {}) {
  const page = await browser.newPage({acceptDownloads:true,viewport:{width:1280,height:800}});
  page.setDefaultTimeout(15000); const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(nativeAvailable=>{
    window.__forbiddenCalls=[];
    for(const name of ['showDirectoryPicker','showSaveFilePicker','showOpenFilePicker'])
      window[name]=nativeAvailable?()=>{__forbiddenCalls.push(name);throw Error('Unexpected native picker');}:undefined;
    const original=indexedDB.open.bind(indexedDB);
    indexedDB.open=(name,...args)=>{
      if(name==='presentation-studio-workspaces'){__forbiddenCalls.push(name);throw Error('Old workspace preferences must remain untouched');}
      return original(name,...args);
    };
  },nativeAvailable);
  await page.goto('file://'+resolve('test-results/workspace-fixture.html'));
  await page.locator('#open-full-editor').click();await click(page,'#lw-open');
  return {page,errors};
}
async function accept(page,copy=false) {
  await page.locator(copy?'#lw-review-copy':'#lw-review-open').click();
  if(await page.locator('#hub-switch').evaluate(el=>el.open))await page.locator('#hub-save-switch').click();
  await page.locator('#lw-panel').waitFor({state:'hidden'});
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
      await run({...example,version:99});await run({...example,slides:Array(101).fill(example.slides[0])});
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

test('download retains actual demo media, IDs and history without native picker or preference access',async()=>{
  const {page,errors}=await open({nativeAvailable:true});try{
    await page.locator('#lw-tab-save').click();
    const download=page.waitForEvent('download');await page.locator('#lw-save-copy').click();
    const bytes=[...await readFile(await(await download).path())];
    const roundtrip=await page.evaluate(async bytes=>{
      const loaded=await __lwTest.load(new File([new Uint8Array(bytes)],'demo.zip'));
      return {state:loaded.pack.state,history:loaded.pack.history,current:__lwTest.pack(),assets:loaded.assets.size};
    },bytes);
    assert(roundtrip.assets>0);assert.deepEqual(roundtrip.state,roundtrip.current.state);assert.deepEqual(roundtrip.history,roundtrip.current.history);
    const archiveErrors=await page.evaluate(async bytes=>{
      // JSZip is intentionally not exposed by production; construct fixtures using the downloaded editable archive.
      const loaded=await __lwTest.load(new File([new Uint8Array(bytes)],'demo.zip'));
      const unsafe=structuredClone(loaded.pack);unsafe.state.media={x:{src:'https://tracker.example/pixel.png'}};
      try{await __lwTest.load(new File([JSON.stringify(unsafe)],'unsafe.json'));return 'accepted';}catch(e){return e.message;}
    },bytes);
    assert.match(archiveErrors,/Unsafe asset/);
    assert.deepEqual(await page.evaluate(()=>__forbiddenCalls),[]);
    assert.equal(await page.locator('#lw-connect, #lw-save, #lw-reload, #lw-backups, #lw-tab-folder').count(),0);
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
    assert.equal(await page.locator('#lw-tab-save').getAttribute('aria-selected'),'true');
    assert.equal(await page.locator('#lw-save-copy').isEnabled(),true);
    await page.keyboard.press('Home');
    assert.equal(await page.locator('#lw-tab-create').getAttribute('aria-selected'),'true');
    assert.equal(await page.locator('#lw-panel').evaluate(el=>el.scrollWidth<=el.clientWidth+2),true);
    await page.screenshot({path:'test-results/local-workspace-small.png',fullPage:true});
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
});

test('imported browser project survives reopening while downloads remain independent',async()=>{
  const {page,errors}=await open({nativeAvailable:true});try{
    const instructionDownload=page.waitForEvent('download');await page.locator('#lw-pack').click();
    const instructionZip=await zipContext.JSZip.loadAsync(new Uint8Array(await readFile(await(await instructionDownload).path())));
    assert(instructionZip.file('presentation.schema.json'));assert(instructionZip.file('capabilities.json'));
    assert.match(await instructionZip.file('AUTHORING.md').async('string'),/AI presentations/);
    assert.equal(instructionZip.file('presentation.json'),null);
    await page.locator('#lw-json').fill(JSON.stringify(example));await page.locator('#lw-validate').click();
    await page.locator('#lw-review h3').waitFor();await accept(page);
    await page.evaluate(async()=>{__lwTest.edit('Portable recovery test');await __lwTest.saveDraft();});
    const before=await page.evaluate(()=>__lwTest.pack());
    await click(page,'#lw-open');await page.locator('#lw-tab-save').click();
    const download=page.waitForEvent('download');await page.locator('#lw-save-copy').click();await download;
    assert.equal(await page.evaluate(()=>__lwTest.pack().meta.id),before.meta.id);
    const records=await page.evaluate(()=>__lwTest.persisted());
    assert.deepEqual(records.find(record=>record.pack.meta.id===before.meta.id).pack.state,before.state);
    await page.reload();await page.locator('#open-full-editor').click();
    // Recovery may be offered rather than silently replacing the demo.
    const recordsAfter=await page.evaluate(()=>__lwTest.persisted());
    assert.deepEqual(recordsAfter.find(record=>record.pack.meta.id===before.meta.id).pack.state,before.state);
    assert.deepEqual(await page.evaluate(()=>__forbiddenCalls),[]);assert.deepEqual(errors,[]);
  }finally{await page.close();}
});
