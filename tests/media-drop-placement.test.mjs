import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {openExample,snapshot,operations} from './collection-ui.mjs';
import {addSlide,reveal} from './ui.mjs';
const browser=await chromium.launch({headless:true,args:['--no-sandbox'],executablePath:process.env.CHROMIUM_EXECUTABLE_PATH});test.after(()=>browser.close());
const svg='<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="#286875"/></svg>';
async function drop(page,zone){const transfer=await page.evaluateHandle(svg=>{const d=new DataTransfer();d.items.add(new File([svg],'new-placement.svg',{type:'image/svg+xml'}));return d;},svg);try{await page.locator('#fe-preview').dispatchEvent('dragover',{dataTransfer:transfer});await page.locator('[data-drop-zone="'+zone+'"]').dispatchEvent('drop',{dataTransfer:transfer});}finally{await transfer.dispose();}}
for(const zone of ['left','right','background','floating'])test('first file drop honors '+zone+' and is one Undo action',async()=>{
 const {page,errors}=await openExample(browser,'portfolio-demo');try{
  await addSlide(page,'blank');const id=await page.locator('#fe-preview .slide').getAttribute('data-media-id'),before=await snapshot(page);assert.equal(before.state.media[id],undefined);
  await drop(page,zone);const after=await snapshot(page),cfg=after.state.media[id];assert.equal(cfg.name,'new-placement.svg');assert.equal(cfg.layout,zone==='floating'?'inset':zone);assert.equal(!!cfg.canvas.placement,zone==='floating');assert.equal(await page.locator('#fe-preview [data-object-id=primary]').evaluate(el=>el.classList.contains('ce-floating')),zone==='floating');assert.deepEqual(after.state.slides,before.state.slides);
  await page.locator('#fe-undo').click();assert.deepEqual((await snapshot(page)).state,before.state);assert.deepEqual(errors,[]);
 }finally{await page.close();}
});
for(const zone of ['left','right','background'])test('new '+zone+' drop preserves existing primary media and metadata in one transaction',async()=>{
 const {page,errors}=await openExample(browser,'portfolio-demo');try{
  await addSlide(page,'blank');const id=await page.locator('#fe-preview .slide').getAttribute('data-media-id');await drop(page,'floating');const prepared=await operations(page,[{type:'design.meta',slideId:id,keys:['media-primary'],changes:{name:'Original photo',rotation:20}},{type:'media.mask',slideId:id,keys:['media-primary'],frame:{shape:'circle',fit:'cover',zoom:150}}]);assert.equal(prepared.ok,true,JSON.stringify(prepared));const before=await snapshot(page),old=before.state.media[id];assert.ok(old);
  await drop(page,zone);const after=(await snapshot(page)).state,demoted=after.mediaObjects[id].find(o=>o.media.src===old.src);assert.equal(after.media[id].layout,zone);assert.equal(after.media[id].canvas.placement,null);assert.ok(demoted);assert.deepEqual(demoted.media,old);assert.deepEqual(after.design.slides[id].objects['media-'+demoted.id],before.state.design.slides[id].objects['media-primary']);assert.deepEqual(after.slides,before.state.slides);
  await page.locator('#fe-undo').click();assert.deepEqual((await snapshot(page)).state,before.state);assert.deepEqual(errors,[]);
 }finally{await page.close();}
});

test('Add media upload honors each placement for video and keeps one-step Undo',async()=>{
 const {page,errors}=await openExample(browser,'portfolio-demo');try{
  await addSlide(page,'blank');const id=await page.locator('#fe-preview .slide').getAttribute('data-media-id');await drop(page,'floating');
  for(const zone of ['left','right','background','floating']){
   await reveal(page,'#ce-zone');await page.locator('#ce-zone').selectOption(zone);const before=await snapshot(page);await page.locator('#ce-file').setInputFiles('tests/fixtures/media/pattern.mp4');const after=(await snapshot(page)).state,cfg=zone==='floating'?after.mediaObjects[id].at(-1).media:after.media[id];assert.equal(cfg.kind,'video');assert.equal(cfg.layout,zone==='floating'?'inset':zone);assert.equal(!!cfg.canvas.placement,zone==='floating');await page.locator('#fe-undo').click();assert.deepEqual((await snapshot(page)).state,before.state);
  }assert.deepEqual(errors,[]);
 }finally{await page.close();}
});
for(const lock of ['metadata','canvas'])test('initial structured drop respects the primary '+lock+' lock',async()=>{
 const {page,errors}=await openExample(browser,'portfolio-demo');try{
  await addSlide(page,'blank');const id=await page.locator('#fe-preview .slide').getAttribute('data-media-id');await drop(page,'floating');
  if(lock==='metadata')assert.equal((await operations(page,[{type:'design.meta',slideId:id,keys:['media-primary'],changes:{locked:true}}])).ok,true);
  else {await reveal(page,'#ce-object-lock');await page.locator('#ce-object-lock').click();}
  const before=await snapshot(page);await drop(page,'left');assert.deepEqual(await snapshot(page),before);assert.match(await page.locator('#fe-message').textContent(),/Unlock the primary media/);assert.deepEqual(errors,[]);
 }finally{await page.close();}
});
