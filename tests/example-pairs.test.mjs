import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {resolve,dirname} from 'node:path';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {snapshot,operations,openExample,chooseExample,exportZip} from './collection-ui.mjs';
import {selectTab,click} from './ui.mjs';
import {archivePath} from './archive-path.mjs';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']});test.after(()=>browser.close());
const pairs=['portfolio','comic','editorial'];
const text=nodes=>nodes.map(n=>n.text||text(n.children||[])).join('');
test('imported artwork with a library filename cannot replace an immutable example or lose the prior draft asset',async()=>{
 const p=await browser.newPage({acceptDownloads:true});p.setDefaultTimeout(10000);try{
  await p.goto('file://'+resolve('dist/presentation-studio.html'));await p.locator('#open-full-editor').click();
  const raw=JSON.parse(await readFile('templates/blank/presentation.json','utf8')),path='assets/portfolio-library.svg',marker='<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><title>SYNTHETIC_USER_ART</title><rect width="80" height="80" fill="magenta"/></svg>';
  raw.meta.id='example-collision-fixture';raw.state.projectName='Synthetic artwork collision';raw.state.media[raw.state.slides[0].id]={kind:'image',src:path,name:'Synthetic user artwork',alt:'A synthetic magenta square.'};delete raw.state.startingState;raw.state.startingState=structuredClone(raw.state);
  const bytes=await p.evaluate(async({raw,path,marker})=>{const z=new JSZip();z.file('presentation.json',JSON.stringify(raw));z.file(path,marker);return [...await z.generateAsync({type:'uint8array'})];},{raw,path,marker});await p.locator('#fe-import-file').setInputFiles({name:'collision.zip',mimeType:'application/zip',buffer:Buffer.from(bytes)});await p.waitForFunction(id=>window.presentationStudioEditing.read().projectId===id,raw.meta.id);
  const active=await snapshot(p);await click(p,'#lc-examples-open');await p.waitForFunction(()=>document.querySelector('#lc-example-preview img')?.naturalWidth===1000);await p.locator('#lc-examples-close').click();assert.deepEqual(await snapshot(p),active);
  await chooseExample(p,'portfolio-demo');const example=await snapshot(p),src=example.state.media[example.state.slides[0].id].src;assert.notEqual(src,path);
  const exported=await exportZip(p),asset=await p.evaluate(async({bytes,src})=>{const z=await JSZip.loadAsync(new Uint8Array(bytes));return z.file(src).async('string');},{bytes:[...exported],src});assert.equal(asset,await readFile('examples/portfolio-library.svg','utf8'));
  await click(p,'#hub-editor-projects');await p.locator('.hub-project-card[data-project-id="'+raw.meta.id+'"]').getByRole('button',{name:'Open',exact:true}).click();if(await p.locator('#hub-switch').evaluate(d=>d.open))await p.locator('#hub-save-switch').click();await p.waitForFunction(id=>window.presentationStudioEditing.read().projectId===id,raw.meta.id);
  const restored=await exportZip(p),old=await p.evaluate(async({bytes,path})=>{const z=await JSZip.loadAsync(new Uint8Array(bytes));return z.file(path).async('string');},{bytes:[...restored],path});assert.equal(old,marker);
 }finally{await p.close();}
});
test('core example pairs reset only their copy and repeated use creates fresh projects without mutating library content',async()=>{
 const identities=new Set();
 for(const id of pairs)for(const mode of ['starter','demo']){const choice=id+'-'+mode,{page:p,errors}=await openExample(browser,choice);try{
  const original=await snapshot(p),slide=original.state.slides[0];assert(!identities.has(original.projectId));identities.add(original.projectId);const originalText=original.state.slides.map(s=>text(s.tree));
  assert.equal((await operations(p,[{type:'slide.update',slideId:slide.id,changes:{title:'Edited example copy'}}])).ok,true);const edited=await snapshot(p);
  await selectTab(p,'Recovery & reset');await p.locator('details').filter({has:p.locator('#fe-reset-project')}).locator('summary').click();await p.locator('#fe-reset-project').click();await p.locator('#fe-confirm-cancel').click();assert.deepEqual((await snapshot(p)).state,edited.state);
  await p.locator('#fe-reset-project').click();await p.locator('#fe-confirm-accept').click();assert.deepEqual((await snapshot(p)).state.slides.map(s=>text(s.tree)),originalText);await p.locator('#we-settings-close').click();await p.locator('#fe-undo').click();assert.equal((await snapshot(p)).state.slides[0].title,'Edited example copy');
  await selectTab(p,'Recovery & reset');
  for(let n=0;n<2;n++){await p.locator('#fe-reset-project').click();await p.locator('#fe-confirm-accept').click();assert.deepEqual((await snapshot(p)).state.slides.map(s=>text(s.tree)),originalText,'repeated reset '+(n+1)+' of '+choice);}
  await p.locator('#we-settings-close').click();
  await chooseExample(p,choice);const next=await snapshot(p);assert.notEqual(next.projectId,original.projectId);assert(!next.state.slides.some(s=>original.state.slides.some(o=>o.id===s.id)));assert.deepEqual(next.state.slides.map(s=>text(s.tree)),originalText);assert.deepEqual(errors,[]);
 }finally{await p.close();}}
});
test('every core starter/demo and lightweight starter exports complete assets and reopens editable/playback offline',async()=>{
 const choices=[...pairs.flatMap(id=>[id+'-starter',id+'-demo']),'newsletter-starter','flyer-starter'];
 for(const choice of choices){const{page:p,errors}=await openExample(browser,choice);try{
  const expected=await snapshot(p),media=[...Object.values(expected.state.media),...Object.values(expected.state.mediaObjects||{}).flatMap(items=>items.map(o=>o.media))];for(const cfg of media){assert(cfg.src.startsWith('assets/'));assert(cfg.alt.length>10);}
  for(const selector of ['#fe-export','#fe-playback']){const bytes=await exportZip(p,selector),files=await p.evaluate(async data=>{const z=await JSZip.loadAsync(new Uint8Array(data),{checkCRC32:true});return Promise.all(Object.values(z.files).filter(f=>!f.dir).map(async f=>({name:f.name,data:await f.async('base64')})));},[...bytes]);const names=new Set(files.map(f=>f.name));for(const cfg of media)assert(names.has(cfg.src),choice+' includes '+cfg.src);
   const folder=resolve('test-results/pair-'+choice+(selector==='#fe-export'?'-editable':'-playback'));for(const f of files){const path=archivePath(folder,f.name);await mkdir(dirname(path),{recursive:true});await writeFile(path,Buffer.from(f.data,'base64'));}
   const q=await browser.newPage();try{q.on('pageerror',e=>errors.push(e.message));q.setDefaultTimeout(10000);await q.context().setOffline(true);await q.goto('file://'+resolve(folder,'index.html'));assert.equal(await q.locator('#stage .lc-case').count(),expected.state.slides.length);assert.equal(await q.locator('#stage .media-box img').count(),media.length);assert.equal(await q.locator('#stage .media-box img').evaluateAll(nodes=>nodes.every(n=>n.complete&&n.naturalWidth>0)),true);assert.equal(await q.locator('#stage .mg-guides').count(),0);
    if(selector==='#fe-export'){await q.locator('#open-full-editor').click();const restored=await snapshot(q);assert.equal(restored.projectId,expected.projectId);assert.deepEqual(restored.state.slides,expected.state.slides);assert.deepEqual(restored.state.mediaObjects,expected.state.mediaObjects);}
   }finally{await q.close();}
  }
  assert.deepEqual(errors,[]);
 }finally{await p.close();}}
});
