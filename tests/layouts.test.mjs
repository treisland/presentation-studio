import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {resolve,dirname} from 'node:path';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {archivePath} from './archive-path.mjs';
import {addSlide,click,selectTab} from './ui.mjs';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']});
test.after(()=>browser.close());
async function setup(){const p=await browser.newPage({viewport:{width:1366,height:768},acceptDownloads:true}),errors=[];p.setDefaultTimeout(10000);p.on('pageerror',e=>errors.push(e.message));await p.goto('file://'+resolve('dist/presentation-studio.html'));await p.locator('#open-full-editor').click();return{p,errors};}
const read=p=>p.evaluate(()=>window.presentationStudioEditing.read());
const apply=(p,operations)=>p.evaluate(operations=>{const api=window.presentationStudioEditing,s=api.read();return api.apply({apiVersion:1,projectId:s.projectId,expectedRevision:s.revision,operations});},operations);
async function pack(p){const download=p.waitForEvent('download');await click(p,'#fe-export-json');return JSON.parse(await readFile(await(await download).path(),'utf8'));}
async function example(p,choice){await click(p,'#studio-new-open');if(await p.locator('#hub-switch').evaluate(d=>d.open))await p.locator('#hub-save-switch').click();await p.locator('[name=nx-start][value='+choice+']').check();await p.locator('#nx-wizard-defaults').click();await p.locator('#nx-wizard').waitFor({state:'hidden'});}

test('Portfolio composition exposes editable slots and an empty image target without replacing the theme',async()=>{const{p,errors}=await setup();try{
 const before=await read(p);await addSlide(p,'portfolio-case');const after=await read(p),model=after.state.slides.find(s=>s.template==='portfolio-case');assert(model);assert.deepEqual(after.state.brand,before.state.brand);
 assert.equal(await p.locator('#fe-preview .lc-copy p').count(),3);assert.equal(await p.locator('#fe-preview .mg-cell-action').count(),1);
 assert.match(await p.locator('#fe-preview .lc-slot-context').textContent(),/What problem/);
 const exported=await pack(p);assert.equal(exported.state.slides.find(s=>s.id===model.id).template,'portfolio-case');assert.deepEqual(errors,[]);
}finally{await p.close();}});

test('previewed mapping preserves text, tables, commands and identity; Apply is one Undo and locked content is atomic',async()=>{const{p,errors}=await setup();try{
 const before=await read(p),slide=before.state.slides[0],beforePack=await pack(p);
 await click(p,'#fe-slide-template');await p.locator('#fe-slide-template').selectOption('portfolio-case');
 await p.locator('#studio-gallery').waitFor();assert.match(await p.locator('#lc-mapping').textContent(),/Project title/);assert.deepEqual((await read(p)).state,before.state);
 await p.locator('#studio-gallery-apply').click();const after=await read(p),next=after.state.slides.find(s=>s.id===slide.id);assert.equal(next.template,'portfolio-case');assert.equal(next.group,slide.group);assert.equal(next.notes,slide.notes);
 const allText=tree=>tree.map(n=>n.text||allText(n.children||[])).join('');
 function leaves(nodes){return nodes.flatMap(n=>n.text?[n.text]:leaves(n.children||[]));}
 const text=allText(next.tree);for(const leaf of leaves(slide.tree))if(leaf.trim())assert(text.includes(leaf),leaf);
 const afterPack=await pack(p);assert.equal(afterPack.history.past.length,beforePack.history.past.length+1);assert.equal(afterPack.checkpoints.length,beforePack.checkpoints.length+1);
 await p.locator('#fe-undo').click();assert.deepEqual((await read(p)).state,before.state);
 assert.equal((await apply(p,[{type:'design.meta',slideId:slide.id,keys:['node-0'],changes:{locked:true}}])).ok,true);const locked=await read(p);
 assert.equal((await apply(p,[{type:'layout.apply',slideId:slide.id,template:'portfolio-case',keep:true}])).code,'LOCKED');assert.deepEqual((await read(p)).state,locked.state);assert.deepEqual(errors,[]);
}finally{await p.close();}});

test('finished example keeps an offline described image; repeated starts have fresh identity and reset is confirmed and undoable',async()=>{const{p,errors}=await setup();try{
 await example(p,'portfolio-demo');const first=await read(p),slide=first.state.slides[0];assert.equal(slide.template,'portfolio-case');assert.match(first.state.media[slide.id].alt,/visitor journey/);
 assert.equal(await p.locator('#fe-preview .media-box img').evaluate(img=>img.complete&&img.naturalWidth>0),true);
 await p.locator('#fe-slide-title').fill('My revision');await p.locator('#fe-slide-title').press('Tab');const changed=await read(p);
 await selectTab(p,'Recovery & reset');await p.locator('details').filter({has:p.locator('#fe-reset-project')}).locator('summary').click();await p.locator('#fe-reset-project').click();await p.locator('#fe-confirm-cancel').click();assert.deepEqual((await read(p)).state,changed.state);
 await p.locator('#fe-reset-project').click();await p.locator('#fe-confirm-accept').click();assert.equal((await read(p)).state.slides[0].title,slide.title);await p.locator('#we-settings-close').click();await p.locator('#fe-undo').click();assert.equal((await read(p)).state.slides[0].title,'My revision');
 await example(p,'portfolio-starter');const second=await read(p);assert.notEqual(first.projectId,second.projectId);assert.notEqual(slide.id,second.state.slides[0].id);assert.equal(Object.keys(second.state.media).length,0);assert.match(JSON.stringify(second.state.slides[0].tree),/What problem/);assert.deepEqual(errors,[]);
}finally{await p.close();}});

test('Portfolio preview and finished slide fit laptop canvas; long title is flagged without text shrinking',async()=>{const{p,errors}=await setup();try{
 await example(p,'portfolio-demo');await mkdir('test-results',{recursive:true});await p.screenshot({path:'test-results/portfolio-case.png'});
 assert.equal(await p.locator('#fe-layout-warning').isVisible(),false);
 const size=await p.locator('#fe-preview .lc-slot-title').evaluate(el=>getComputedStyle(el).fontSize);
 const before=await read(p),slide=before.state.slides[0];assert.equal((await apply(p,[{type:'slide.update',slideId:slide.id,changes:{title:'Very long project title '.repeat(15)}}])).ok,true);
 assert.equal(await p.locator('#fe-preview .lc-slot-title').evaluate(el=>getComputedStyle(el).fontSize),size);
 assert.equal(await p.locator('#fe-layout-warning').isVisible(),true);
 await p.locator('#fe-slide-template').selectOption('portfolio-case');await p.locator('#studio-gallery').waitFor();assert.deepEqual(errors,[]);assert.match(await p.locator('#lc-mapping-status').textContent(),/Long content/);
}finally{await p.close();}});

test('Portfolio media, reading order and editable identity survive offline editable/playback ZIP reopening',async()=>{const{p,errors}=await setup();try{
 await example(p,'portfolio-demo');const original=await read(p),slide=original.state.slides[0];
 const order=await p.locator('#fe-preview .slide').evaluate(el=>Array.from(el.children).map(n=>n.className));assert(order.findIndex(c=>c.includes('media-box'))<order.findIndex(c=>c.includes('lc-slot-credits')));
 for(const selector of ['#fe-export','#fe-playback']){
  const d=p.waitForEvent('download');await click(p,selector);const bytes=await readFile(await(await d).path());
  const entries=await p.evaluate(async data=>{const zip=await JSZip.loadAsync(new Uint8Array(data));return Promise.all(Object.values(zip.files).filter(f=>!f.dir).map(async f=>({name:f.name,bytes:await f.async('base64')})));},[...bytes]);
  const folder=resolve('test-results/portfolio-'+(selector==='#fe-export'?'editable':'playback'));for(const e of entries){const file=archivePath(folder,e.name);await mkdir(dirname(file),{recursive:true});await writeFile(file,Buffer.from(e.bytes,'base64'));}
  const q=await browser.newPage();try{q.on('pageerror',e=>errors.push(e.message));await q.context().setOffline(true);await q.goto('file://'+resolve(folder,'index.html'));
   const image=q.locator('#stage [data-media-id="'+slide.id+'"] .media-box img');await image.waitFor({state:'attached'});assert.equal(await image.evaluate(img=>img.complete&&img.naturalWidth>0),true);
   assert.equal(await q.locator('#stage .mg-guides,#stage .lc-example-image').count(),0);
   if(selector==='#fe-export'){await q.locator('#open-full-editor').click();const restored=await read(q);assert.equal(restored.projectId,original.projectId);assert.deepEqual(restored.state.slides,original.state.slides);assert.deepEqual(restored.state.media,original.state.media);}
  }finally{await q.close();}
 }
 assert.deepEqual(errors,[]);
}finally{await p.close();}});

test('table, command and Grid slides retain original structures through collection changes and back',async()=>{const{p,errors}=await setup();try{
 const leaves=nodes=>nodes.flatMap(n=>n.text?[n.text]:leaves(n.children||[]));
 for(const type of ['table','code','media-grid']){
  await addSlide(p,type);const before=await read(p),slide=before.state.slides.find(s=>s.template===type);
  assert.equal((await apply(p,[{type:'layout.apply',slideId:slide.id,template:'portfolio-case',keep:true}])).ok,true);
  let mapped=(await read(p)).state.slides.find(s=>s.id===slide.id),text=leaves(mapped.tree).join('');for(const leaf of leaves(slide.tree))if(leaf.trim())assert(text.includes(leaf),leaf);
  if(type==='table')assert(JSON.stringify(mapped.tree).includes('"tag":"table"'));
  if(type==='code'){assert.deepEqual(mapped.commands,slide.commands);assert(JSON.stringify(mapped.tree).includes('terminal'));}
  if(type==='media-grid')assert.deepEqual(mapped.tree.find(n=>n.attrs?.class?.startsWith('mg-grid')).children,slide.tree.find(n=>n.attrs?.class?.startsWith('mg-grid')).children);
  assert.equal((await apply(p,[{type:'layout.apply',slideId:slide.id,template:type,keep:true}])).ok,true);
  mapped=(await read(p)).state.slides.find(s=>s.id===slide.id);text=leaves(mapped.tree).join('');for(const leaf of leaves(slide.tree))if(leaf.trim())assert(text.includes(leaf),leaf);
 }
 assert.deepEqual(errors,[]);
}finally{await p.close();}});
