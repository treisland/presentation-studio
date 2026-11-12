import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {openExample,snapshot,exportZip,importZip,operations} from './collection-ui.mjs';
import {selectElement,reveal,addSlide} from './ui.mjs';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']});
test.after(()=>browser.close());
const svg=name=>({name,mimeType:'image/svg+xml',buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80"><rect width="120" height="80" fill="blue"/></svg>')});

test('Media uses selected-object Inspector and Layers owns ambiguous selection',async()=>{
 const {page,errors}=await openExample(browser,'template');try{
  await page.locator('.fe-slide-button[data-slide-id="studio-media"]').click();await selectElement(page,'media-primary');
  await page.locator('#fe-media').click();assert.equal(await page.locator('#media-editor').isVisible(),false);assert.equal(await page.locator('#mi-content').isVisible(),true);
  const before=await snapshot(page);await page.locator('#ce-file').setInputFiles(svg('second.svg'));
  const cfg=(await snapshot(page)).state.mediaObjects['studio-media'].at(-1);await selectElement(page,'media-'+cfg.id);await page.locator('#fe-media').click();
  assert.match(await page.locator('#mi-target').textContent(),/second.svg.*Additional/);
  await page.locator('#ce-caption').fill('Only the second object');await page.locator('#ce-caption').press('Tab');
  assert.equal((await snapshot(page)).state.media['studio-media'].caption,before.state.media['studio-media'].caption);
  await page.locator('#ce-replace-file').setInputFiles('tests/fixtures/media/pattern.webm');await page.locator('#fe-confirm-accept').click();
  await reveal(page,'#mi-muted');assert.equal(await page.locator('#mi-advance').isDisabled(),true);assert.equal(await page.locator('#mi-advance-note').isVisible(),true);
  await page.locator('#mi-muted').uncheck();assert.equal((await snapshot(page)).state.mediaObjects['studio-media'].find(item=>item.id===cfg.id).media.muted,false);
  await page.locator('#ic-slide-settings').click();await page.locator('#fe-media').click();
  assert.match(await page.locator('#mi-target').textContent(),/No media selected/);assert.equal(await page.locator('#sp-layer-panel').isVisible(),true);
  assert.equal(await page.locator('#ce-objects').isVisible(),false);assert.deepEqual(errors,[]);
 }finally{await page.close();}
});

test('layout parity and unified crop retain IDs and unrelated media through Undo and offline restore',async()=>{
 const {page,errors}=await openExample(browser,'template');try{
  await page.locator('.fe-slide-button[data-slide-id="studio-media"]').click();await selectElement(page,'media-primary');await page.locator('#wp-tab-content').click();
  for(const layout of ['left','right','below','full','background','inset','floating']){
    const before=await snapshot(page);await reveal(page,'#mi-layout');await page.locator('#mi-layout').selectOption(layout);
    const after=await snapshot(page),cfg=after.state.media['studio-media'];assert.equal(cfg.layout,layout==='floating'?'inset':layout);assert.equal(!!cfg.canvas.placement,layout==='floating');assert.deepEqual(after.state.slides,before.state.slides);
    assert.equal(await page.locator('#mi-ratio').isVisible(),['left','right'].includes(layout));assert.equal(await page.locator('#mi-corner').isVisible(),layout==='inset');assert.equal(await page.locator('#mi-overlay').isVisible(),layout==='background');
    await page.locator('#fe-undo').click();assert.deepEqual((await snapshot(page)).state,before.state);
  }
  await reveal(page,'#mi-fit');await page.locator('#mi-fit').selectOption('cover');await page.locator('#mi-x').fill('22');await page.locator('#mi-x').press('Enter');
  await page.locator('#mask-shape').selectOption('circle');assert.equal(await page.locator('#mi-x').isVisible(),false);assert.equal(await page.locator('#mask-x').isVisible(),true);assert.equal(await page.locator('#mi-fit').isVisible(),true);assert.equal(await page.locator('#mask-fit').isVisible(),false);
  assert.equal((await snapshot(page)).state.design.slides['studio-media'].objects['media-primary'].frame.x,22);
  const expected=await snapshot(page),restored=await importZip(browser,await exportZip(page),expected.projectId);try{assert.deepEqual((await snapshot(restored)).state,expected.state);}finally{await restored.close();}
  assert.deepEqual(errors,[]);
 }finally{await page.close();}
});

test('selected video settings, posters, lock guards and explicit restore preserve the file target',async()=>{
 const {page,errors}=await openExample(browser,'template');try{
  await page.locator('.fe-slide-button[data-slide-id="studio-media"]').click();await selectElement(page,'media-primary');await page.locator('#fe-media').click();
  await page.locator('#ce-replace-file').setInputFiles('tests/fixtures/media/pattern.webm');await page.locator('#fe-confirm-accept').click();
  await reveal(page,'#mi-advance');await page.locator('#mi-advance').selectOption('ended');assert.equal(await page.locator('#mi-loop').isDisabled(),true);
  await page.locator('#mi-poster-file').setInputFiles(svg('poster.svg'));assert.match(await page.locator('#mi-poster-info').textContent(),/poster.svg/);
  const saved=await snapshot(page);await exportZip(page);await page.locator('#mi-muted').uncheck();
  await reveal(page,'#mi-restore');await page.locator('#mi-restore').click();await page.locator('#fe-confirm-accept').click();assert.deepEqual((await snapshot(page)).state,saved.state);
  await operations(page,[{type:'design.meta',slideId:'studio-media',keys:['media-primary'],changes:{locked:true}}]);
  assert.equal(await page.locator('#mi-muted').isDisabled(),true);assert.equal(await page.locator('#mi-poster-choose').isDisabled(),true);assert.equal(await page.locator('#mi-restore').isDisabled(),true);
  assert.deepEqual(errors,[]);
 }finally{await page.close();}
});
