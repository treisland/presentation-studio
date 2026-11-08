import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {resolve,dirname} from 'node:path';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {addSlide,click} from './ui.mjs';
import {archivePath} from './archive-path.mjs';
import {legacyHTML} from './legacy-fixture.mjs';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']});
test.after(()=>browser.close());
const svg='<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="320" height="180" fill="orange"/></svg>';
const read=p=>p.evaluate(()=>window.presentationStudioEditing.read());
const model=s=>s.slides.find(slide=>slide.tree.some(n=>n.attrs?.class?.startsWith('mg-grid ')));
const root=s=>model(s).tree.find(n=>n.attrs?.class?.startsWith('mg-grid '));
const cellID=c=>c.attrs.class.match(/\bcell-[\w-]+/)[0];
const objectID=c=>c.attrs.class.match(/\bmg-media-(object-[\w-]+)/)?.[1];
async function setup(legacy=false){const p=await browser.newPage({viewport:{width:1366,height:768},acceptDownloads:true});const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.emulateMedia({reducedMotion:'reduce'});await p.goto('file://'+(legacy?await legacyHTML(resolve('.')):resolve('dist/presentation-studio.html')));await p.locator('#open-full-editor').click();const original=await read(p);await addSlide(p,'media-grid');return{p,errors,original};}
async function drop(p,index,name='cell.svg'){await p.locator('#fe-preview .mg-cell-action').nth(index).evaluate((el,{svg,name})=>{const dataTransfer=new DataTransfer();dataTransfer.items.add(new File([svg],name,{type:'image/svg+xml'}));el.dispatchEvent(new DragEvent('drop',{bubbles:true,dataTransfer}));},{svg,name});}
async function choose(p,index){await p.locator('#mg-cell').selectOption({index});}
async function upload(p,name='new.svg',buffer=Buffer.from(svg),mimeType='image/svg+xml'){const event=p.waitForEvent('filechooser');await p.locator('#mg-upload').click();await(await event).setFiles({name,mimeType,buffer});}
async function pack(p){const d=p.waitForEvent('download');await click(p,'#fe-export-json');return JSON.parse(await readFile(await(await d).path(),'utf8'));}
async function apply(p,op){return p.evaluate(op=>{const s=window.presentationStudioEditing.read();return window.presentationStudioEditing.apply({apiVersion:1,projectId:s.projectId,expectedRevision:s.revision,operations:[{slideId:s.state.slides.find(s=>s.tree.some(n=>n.attrs?.class?.startsWith('mg-grid '))).id,...op}]});},op);}

test('grid uploads, replacement, presets, overflow, swaps and locks preserve media identities and undo',async()=>{const{p,errors,original}=await setup();try{
 assert.equal(await p.locator('#fe-preview .mg-cell-action').count(),4);
 for(let i=0;i<4;i++)await drop(p,i,'cell-'+i+'.svg');
 let s=await read(p),grid=root(s.state),ids=grid.children.map(objectID),cellIDs=grid.children.map(cellID),slideID=s.state.slides.find(s=>s.tree.some(n=>n.attrs?.class?.startsWith('mg-grid '))).id;
 assert.deepEqual(s.state.slides.filter(s=>!s.tree.some(n=>n.attrs?.class?.startsWith('mg-grid '))),original.state.slides);
 assert.equal(s.state.mediaObjects[slideID].length,4);
 await choose(p,1);await upload(p,'replacement.svg');assert.match(await p.locator('#fe-confirm-message').textContent(),/cell-1.svg/);
 await p.locator('#fe-confirm-cancel').click();assert.deepEqual(root((await read(p)).state),grid);
 await upload(p,'replacement.svg');await p.locator('#fe-confirm-accept').click();s=await read(p);assert.deepEqual(root(s.state).children.map(objectID),ids);assert.equal(s.state.mediaObjects[slideID][1].media.name,'replacement.svg');
 await p.locator('#fe-undo').click();assert.equal((await read(p)).state.mediaObjects[slideID][1].media.name,'cell-1.svg');
 await p.locator('#mg-preset').selectOption('3x3');s=await read(p);assert.deepEqual(root(s.state).children.slice(0,4).map(cellID),cellIDs);assert.deepEqual(root(s.state).children.slice(0,4).map(objectID),ids);
 await p.locator('#mg-preset').selectOption('1x3');assert.equal(await p.locator('#fe-confirm').evaluate(el=>el.open),true);await p.locator('#fe-confirm-cancel').click();assert.equal(root((await read(p)).state).children.length,9);
 await p.locator('#mg-preset').selectOption('custom');await p.locator('#mg-preset').selectOption('1x3');await p.locator('#fe-confirm-accept').click();s=await read(p);assert.equal(root(s.state).children.length,3);assert.equal(s.state.mediaObjects[slideID].length,4);assert.deepEqual(s.state.mediaObjects[slideID].map(o=>o.id),ids);
 await p.locator('#fe-undo').click();await choose(p,0);await p.locator('#mg-destination').selectOption({index:1});await p.locator('#mg-swap').click();assert.deepEqual(root((await read(p)).state).children.slice(0,2).map(objectID),[ids[1],ids[0]]);
 await p.locator('#fe-undo').click();await choose(p,0);await p.locator('#mg-fit').selectOption('cover');await p.locator('#mg-crop-x').fill('20');await p.locator('#mg-crop-x').press('Tab');s=await read(p);assert.equal(s.state.mediaObjects[slideID][0].media.canvas.crop.x,20);
 await click(p,'#ce-slide-lock');const locked=await pack(p);const response=await apply(p,{type:'grid.configure',rows:[10000],cols:[10000],gap:2,overflow:'detach'});assert.equal(response.code,'LOCKED');assert.deepEqual(await pack(p),locked);
 assert.deepEqual(errors,[]);
 }finally{await p.close();}});

test('divider drag uses scaled coordinates, cancellation is read-only, keyboard resize is atomic and media locks hold',async()=>{const{p,errors}=await setup();try{
 await drop(p,0);await p.locator('#we-zoom').selectOption('0.5');await p.waitForTimeout(150);
 const before=await pack(p),handle=p.locator('#fe-preview .mg-divider[data-mg-axis=cols]');
 const bounds=await p.locator('#fe-preview .slide').boundingBox();
 async function drag(cancel){const r=await handle.boundingBox();await p.mouse.move(r.x+r.width/2,r.y+r.height/2);await p.mouse.down();await p.mouse.move(r.x+r.width/2+bounds.width*.08,r.y+r.height/2,{steps:5});if(cancel)await p.keyboard.press('Escape');await p.mouse.up();}
 await drag(true);assert.deepEqual(await pack(p),before);
 await drag(false);const after=await pack(p);assert.notEqual(root(after.state).attrs.class,root(before.state).attrs.class);assert.equal(after.history.past.length,before.history.past.length+1);
 await p.locator('#fe-undo').click();assert.deepEqual((await read(p)).state,before.state);
 await handle.press('ArrowRight');await handle.press('ArrowRight');assert.match(root((await read(p)).state).attrs.class,/mg-c-5200-4800/);
 await choose(p,0);await p.locator('#we-context-media').click();await click(p,'#ce-object-lock');const locked=await pack(p);const response=await apply(p,{type:'grid.configure',rows:[5000,5000],cols:[6000,4000],gap:2});assert.equal(response.code,'LOCKED');assert.deepEqual(await pack(p),locked);
 assert.deepEqual(errors,[]);
 }finally{await p.close();}});

test('stale image-crop mode cannot move grid video outside its saved cell',async()=>{const{p,errors}=await setup();try{
 await drop(p,0);await choose(p,1);await upload(p,'pattern.webm',await readFile('tests/fixtures/media/pattern.webm'),'video/webm');
 await choose(p,0);await p.locator('#we-context-media').click();await click(p,'#ce-crop');
 await p.locator('#we-context-slide').click();await choose(p,1);const before=await pack(p);
 const video=p.locator('#fe-preview video.media-asset'),r=await video.boundingBox();
 await p.mouse.move(r.x+r.width/2,r.y+r.height/2);await p.mouse.down();await p.mouse.move(r.x+r.width/2+25,r.y+r.height/2+10,{steps:5});await p.mouse.up();
 assert.deepEqual(await pack(p),before,'Video drag in crop mode must not mutate placement or history');assert.deepEqual(errors,[]);
 }finally{await p.close();}});

test('legacy projects, mixed media grid focus and recovery survive offline editable/playback ZIP reopening',async()=>{const{p,errors,original}=await setup(true);try{
 await drop(p,0,'diagram.svg');await choose(p,1);await upload(p,'pattern.webm',await readFile('tests/fixtures/media/pattern.webm'),'video/webm');
 const added=await read(p),slide=model(added.state),ids=root(added.state).children.map(cellID);
 assert.deepEqual(added.state.slides.filter(s=>s.id!==slide.id).map(s=>s.id),original.state.slides.map(s=>s.id));
 await choose(p,0);await p.locator('#mg-remove').click();await p.locator('#fe-confirm-accept').click();await p.locator('#fe-undo').click();assert.deepEqual((await read(p)).state,added.state);
 await p.locator('#vb-preview-mode').click();await p.locator('#fe-preview .mf-expand').nth(1).press('Enter');await p.waitForSelector('#media-focus video');await p.keyboard.press('Escape');await p.waitForSelector('#media-focus',{state:'detached'});await p.locator('#vb-edit-mode').click();
 for(const selector of ['#fe-export','#fe-playback']){
  const d=p.waitForEvent('download');await click(p,selector);const bytes=await readFile(await(await d).path());
  const entries=await p.evaluate(async data=>{const zip=await JSZip.loadAsync(new Uint8Array(data));return Promise.all(Object.values(zip.files).filter(f=>!f.dir).map(async f=>({name:f.name,bytes:await f.async('base64')})));},[...bytes]);
  const folder=resolve('test-results/grid-'+(selector==='#fe-export'?'editable':'playback'));for(const e of entries){const file=archivePath(folder,e.name);await mkdir(dirname(file),{recursive:true});await writeFile(file,Buffer.from(e.bytes,'base64'));}
  const q=await browser.newPage();try{await q.context().setOffline(true);await q.goto('file://'+resolve(folder,'index.html'));
   assert.equal(await q.locator('#stage .mg-guides').count(),0);assert.equal(await q.locator('#stage [data-media-id="'+slide.id+'"] .media-box').count(),2);
   if(selector==='#fe-export'){await q.locator('#open-full-editor').click();await q.locator('.fe-slide-button[data-slide-id="'+slide.id+'"]').click();const restored=await read(q);assert.deepEqual(root(restored.state).children.map(cellID),ids);assert.deepEqual(restored.state.mediaObjects[slide.id],added.state.mediaObjects[slide.id]);}
  }finally{await q.close();}
 }
 assert.deepEqual(errors,[]);
 }finally{await p.close();}});
