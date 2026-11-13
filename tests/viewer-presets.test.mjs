import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import vm from 'node:vm';
import {chromium} from 'playwright';
import {openExample,snapshot,operations,exportZip,importZip} from './collection-ui.mjs';
import {selectTab} from './ui.mjs';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']});test.after(()=>browser.close());
const defaults={footerStyle:'modern',version:1,preset:'presentation',autoHide:false,showNotes:true,showProgress:false,showCount:false,showTimer:true,showTimeBar:true};
const zipContext={setImmediate,clearImmediate,setTimeout,clearTimeout,Uint8Array,ArrayBuffer,TextEncoder,TextDecoder};vm.runInNewContext(await readFile('vendor/jszip-3.10.1.min.js','utf8'),zipContext);
async function viewer(){const page=await browser.newPage({viewport:{width:1366,height:768}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('file://'+resolve('dist/presentation-studio.html'));return{page,errors};}
test('Presentation preset changes controls without changing automatic playback or project data',async()=>{
 const {page,errors}=await viewer();try{
  const before=await snapshot(page),paused=await page.locator('body').evaluate(n=>n.classList.contains('paused'));
  await page.locator('#hub-player-more > summary').click();await page.locator('#vc-preset').selectOption('presentation');
  assert.equal(await page.locator('#play').isVisible(),false);assert.equal(await page.locator('body').evaluate(n=>n.classList.contains('paused')),paused);assert.equal(await page.locator('.vf-left #notes').count(),1);
  assert.deepEqual((await snapshot(page)).state,before.state);
  await page.locator('#hub-player-more > summary').click();await page.keyboard.press('Space');assert.equal(await page.locator('#vc-announcement').textContent(),'Playback paused.');
  await page.reload();assert.equal(await page.locator('#play').isVisible(),true);assert.deepEqual(errors,[]);
 }finally{await page.close();}
});
test('auto-hide is independent of Kiosk and pinned by open menus or keyboard focus',async()=>{
 const {page,errors}=await viewer();try{
  await page.locator('#hub-player-more > summary').click();await page.locator('#vc-autoHide').check();
  await page.waitForTimeout(3200);assert.equal(await page.locator('body').evaluate(n=>n.classList.contains('idle')),false);
  await page.locator('#hub-player-more > summary').click();await page.locator('#hub-player-more > summary').blur();await page.mouse.move(5,5);assert.equal(await page.locator('#controls').evaluate(n=>n.contains(document.activeElement)),false);
  await page.waitForFunction(()=>document.body.classList.contains('idle'),{},{timeout:6000});
  assert.equal(await page.locator('#kiosk').textContent(),'Kiosk');
  await page.locator('#next').focus();assert.equal(await page.locator('body').evaluate(n=>n.classList.contains('idle')),false);
  await page.waitForTimeout(3200);assert.equal(await page.locator('body').evaluate(n=>n.classList.contains('idle')),false);assert.deepEqual(errors,[]);
 }finally{await page.close();}
});
test('authored defaults validate, restore with editable ZIP and undo without a content-format bump',async()=>{
 const {page,errors}=await openExample(browser,'template');try{
  const before=await snapshot(page),id=before.state.slides[0].id;
  const result=await operations(page,[{type:'viewer.defaults',slideId:id,config:defaults}]);assert.equal(result.ok,true,result.message);
  const expected=await snapshot(page),bytes=await exportZip(page),zip=await zipContext.JSZip.loadAsync(new Uint8Array(bytes));const pack=JSON.parse(await zip.file('presentation.json').async('string'));assert.equal(pack.schemaVersion,2);assert.deepEqual(pack.state.viewerDefaults,defaults);
  const restored=await importZip(browser,bytes,expected.projectId);try{assert.deepEqual((await snapshot(restored)).state.viewerDefaults,defaults);}finally{await restored.close();}
  const invalid=await operations(page,[{type:'viewer.defaults',slideId:id,config:{...defaults,autoHide:'yes'}}]);assert.equal(invalid.ok,false);assert.deepEqual((await snapshot(page)).state,expected.state);
  await page.locator('#fe-undo').click();assert.deepEqual((await snapshot(page)).state,before.state);assert.deepEqual(errors,[]);
 }finally{await page.close();}
});
test('viewer defaults survive playback and booth exports without exposing private authoring state',async()=>{
 const {page,errors}=await openExample(browser,'portfolio-demo');try{
  const id=(await snapshot(page)).state.slides[0].id;assert.equal((await operations(page,[{type:'viewer.defaults',slideId:id,config:defaults}])).ok,true);
  const playback=await exportZip(page,'#fe-playback'),playZip=await zipContext.JSZip.loadAsync(new Uint8Array(playback));const pack=JSON.parse(await playZip.file('presentation.json').async('string'));assert.deepEqual(pack.state.viewerDefaults,defaults);assert(pack.state.slides.every(s=>!s.notes));
  await selectTab(page,'Presentation settings');await page.locator('#booth-open').click();await page.locator('#booth-password').fill('viewer-test-pass');await page.locator('#booth-confirm').fill('viewer-test-pass');await page.locator('#booth-loop').selectOption(Object.keys((await snapshot(page)).state.loops)[0]);const booth=await exportZip(page,'#booth-export'),boothZip=await zipContext.JSZip.loadAsync(new Uint8Array(booth));const html=await boothZip.file('index.html').async('string'),data=JSON.parse(html.match(/<script id="booth-data" type="application\/json">([^<]+)<\/script>/)[1]);assert.deepEqual(data.viewerDefaults,defaults);assert(data.slides.every(s=>!s.notes));
  await mkdir('test-results/viewer-booth',{recursive:true});await writeFile('test-results/viewer-booth/index.html',html);
  const audience=await browser.newPage();audience.on('pageerror',e=>errors.push(e.message));try{await audience.context().setOffline(true);await audience.goto('file://'+resolve('test-results/viewer-booth/index.html'));assert.equal(await audience.locator('#booth-play').isVisible(),false);assert.equal(await audience.locator('#booth-play').textContent(),'Pause');assert.equal(await audience.locator('#booth-vc-count').isVisible(),false);assert.equal(await audience.locator('#booth-vc-progress').isVisible(),false);}finally{await audience.close();}
  assert.deepEqual(errors,[]);
 }finally{await page.close();}
});

test('narrow controls move secondary utilities into More before primary navigation overlaps',async()=>{
 const {page,errors}=await viewer();try{
  for(const width of [390,640,480,800,360]){await page.setViewportSize({width,height:720});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}
  const boxes=await page.locator('.vf-left,.vf-center,.vf-right').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return{x:r.x,right:r.right};}));assert(boxes[0].right<=boxes[1].x+1);assert(boxes[1].right<=boxes[2].x+1);
  await page.locator('#hub-player-more > summary').click();assert.equal(await page.locator('#vc-presentation #open-full-editor').isVisible(),true);assert.equal(await page.locator('#vc-presentation #vf-count').isVisible(),true);assert.deepEqual(errors,[]);
 }finally{await page.close();}
});

test('slide timer stays independent of presets and narrow screens without changing playback',async()=>{
 const {page,errors}=await viewer();try{
  await page.locator('#hub-player-more > summary').click();const paused=await page.locator('body').evaluate(n=>n.classList.contains('paused'));await page.locator('#vc-preset').selectOption('presentation');assert.equal(await page.locator('#vc-showTimer').isChecked(),true);assert.equal(await page.locator('#vf-countdown').isVisible(),true);
  await page.locator('#vc-showTimer').uncheck();assert.equal(await page.locator('#vf-countdown').isVisible(),false);await page.locator('#vc-preset').selectOption('playback');assert.equal(await page.locator('#vf-countdown').isVisible(),false);await page.locator('#vc-showTimer').check();assert.equal(await page.locator('#vf-countdown').isVisible(),true);assert.equal(await page.locator('body').evaluate(n=>n.classList.contains('paused')),paused);
  await page.locator('#hub-player-more > summary').click();await page.setViewportSize({width:320,height:740});assert.equal(await page.locator('#vf-countdown').isVisible(),true);await page.locator('#hub-player-more > summary').click();await page.locator('#vc-preset').selectOption('presentation');await page.locator('#hub-player-more > summary').click();const boxes=await page.locator('.vf-left,.vf-center,.vf-right').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return{x:r.x,right:r.right};}));assert(boxes[0].right<=boxes[1].x+1);assert(boxes[1].right<=boxes[2].x+1);assert.equal(await page.locator('.vf-left #notes').count(),0);assert.deepEqual(errors,[]);
 }finally{await page.close();}
});

test('older authored viewer defaults gain the visible timer and reject malformed timer values',async()=>{
 const {page,errors}=await openExample(browser,'template');try{const before=await snapshot(page),slideId=before.state.slides[0].id;const legacy={...defaults};delete legacy.footerStyle;delete legacy.showTimer;delete legacy.showTimeBar;assert.equal((await operations(page,[{type:'viewer.defaults',slideId,config:legacy}])).ok,true);assert.equal((await snapshot(page)).state.viewerDefaults.showTimer,true);assert.equal((await snapshot(page)).state.viewerDefaults.showTimeBar,true);assert.equal((await snapshot(page)).state.viewerDefaults.footerStyle,'modern');const saved=await snapshot(page);assert.equal((await operations(page,[{type:'viewer.defaults',slideId,config:{...defaults,showTimer:'yes'}}])).ok,false);assert.deepEqual((await snapshot(page)).state,saved.state);assert.deepEqual(errors,[]);}finally{await page.close();}
});

test('original animated slide-time line advances, pauses and resets independently of other indicators',async()=>{
 const {page,errors}=await viewer();try{await page.waitForFunction(()=>parseFloat(document.getElementById('vf-time-fill').style.width)>1);assert.equal(await page.locator('#vf-time-bar').isVisible(),true);await page.locator('#play').click();const width=await page.locator('#vf-time-fill').evaluate(n=>n.style.width);await page.waitForTimeout(250);assert.equal(await page.locator('#vf-time-fill').evaluate(n=>n.style.width),width);assert.equal(await page.locator('#vf-time-fill').evaluate(n=>n.style.width),await page.locator('#fill').evaluate(n=>n.style.width));await page.locator('#next').click();assert.equal(await page.locator('#vf-time-fill').evaluate(n=>parseFloat(n.style.width)),0);
  await page.locator('#hub-player-more > summary').click();await page.locator('#vc-showTimer').uncheck();assert.equal(await page.locator('#vf-time-bar').isVisible(),true);await page.locator('#vc-showTimeBar').uncheck();assert.equal(await page.locator('#vf-time-bar').isVisible(),false);assert.equal(await page.locator('#vf-position').isVisible(),true);await page.locator('#vc-preset').selectOption('presentation');assert.equal(await page.locator('#vf-time-bar').isVisible(),false);await page.locator('#vc-showTimeBar').check();assert.equal(await page.locator('#vf-time-bar').isVisible(),true);assert.equal(await page.locator('body').evaluate(n=>n.classList.contains('paused')),true);assert.deepEqual(errors,[]);
 }finally{await page.close();}
});

test('pointer and touch activity obey Always visible even with Kiosk enabled',async()=>{const {page,errors}=await viewer();try{await page.locator('#hub-player-more > summary').click();await page.locator('#vc-autoHide').check();await page.locator('#vc-pin').check();await page.locator('#kiosk').click();if(await page.locator('#hub-player-more').evaluate(n=>n.open))await page.locator('#hub-player-more > summary').click();await page.locator('#hub-player-more > summary').blur();await page.mouse.move(5,5);await page.evaluate(()=>document.dispatchEvent(new Event('touchstart',{bubbles:true})));await page.waitForTimeout(3200);assert.equal(await page.locator('body').evaluate(n=>n.classList.contains('idle')),false);assert.deepEqual(errors,[]);}finally{await page.close();}});


test('Classic and Hidden keep navigation accessible while independent classic indicators follow the clock',async()=>{
 const {page,errors}=await viewer();try{await page.locator('#play').click();const before=await snapshot(page);await page.locator('#hub-player-more > summary').click();await page.locator('#vc-footer-style').selectOption('classic');assert.equal(await page.locator('#stage > footer').isVisible(),true);assert.equal(await page.locator('#vf-time-bar').isVisible(),false);assert.equal(await page.locator('#vf-position').isVisible(),false);assert.equal(await page.locator('#counter').isVisible(),true);await page.locator('#vc-showTimeBar').uncheck();assert.equal(await page.locator('#stage > footer > .track').isVisible(),false);assert.equal(await page.locator('#dots').isVisible(),true);await page.locator('#vc-showProgress').uncheck();assert.equal(await page.locator('#dots').isVisible(),false);await page.locator('#vc-showCount').uncheck();assert.equal(await page.locator('#counter').isVisible(),false);await page.locator('#vc-showTimeBar').check();await page.locator('#vc-footer-style').selectOption('hidden');assert.equal(await page.locator('#stage > footer').isVisible(),false);await page.locator('#hub-player-more > summary').click();assert.equal(await page.locator('#next').isVisible(),true);await page.locator('#hub-player-more > summary').click();await page.locator('#vc-footer-style').selectOption('classic');await page.locator('#hub-player-more > summary').click();await page.locator('#play').click();await page.waitForFunction(()=>parseFloat(document.getElementById('fill').style.width)>1);await page.locator('#play').click();const time=await page.locator('#fill').getAttribute('style');await page.waitForTimeout(200);assert.equal(await page.locator('#fill').getAttribute('style'),time);assert.deepEqual((await snapshot(page)).state,before.state);await page.screenshot({path:'test-results/classic-footer-viewer.png'});assert.deepEqual(errors,[]);}finally{await page.close();}
});

test('Classic footer defaults survive editable and offline playback export and reject invalid styles',async()=>{
 const {page,errors}=await openExample(browser,'template');try{const before=await snapshot(page),slideId=before.state.slides[0].id,config={...defaults,footerStyle:'classic',showProgress:true,showCount:true};assert.equal((await operations(page,[{type:'viewer.defaults',slideId,config}])).ok,true);const saved=await snapshot(page);for(const footerStyle of ['unknown',null,1]){assert.equal((await operations(page,[{type:'viewer.defaults',slideId,config:{...config,footerStyle}}])).ok,false);assert.deepEqual((await snapshot(page)).state,saved.state);}const editable=await exportZip(page,'#fe-export');const fresh=await importZip(browser,editable,before.projectId);try{assert.equal((await snapshot(fresh)).state.viewerDefaults.footerStyle,'classic');}finally{await fresh.close();}const bytes=await exportZip(page,'#fe-playback'),zip=await zipContext.JSZip.loadAsync(new Uint8Array(bytes));await mkdir('test-results/classic-playback',{recursive:true});await writeFile('test-results/classic-playback/index.html',await zip.file('index.html').async('string'));const output=await browser.newPage();try{await output.context().setOffline(true);await output.goto('file://'+resolve('test-results/classic-playback/index.html'));assert.equal(await output.locator('#stage > footer').isVisible(),true);assert.equal(await output.locator('#dots').isVisible(),true);}finally{await output.close();}assert.deepEqual(errors,[]);}finally{await page.close();}
});


test('Classic floating bar and Modern full-width bar switch without overlap on desktop and narrow screens',async()=>{const {page,errors}=await viewer();try{await page.locator('#hub-player-more > summary').click();await page.locator('#vc-footer-style').selectOption('classic');await page.locator('#hub-player-more > summary').click();for(const width of [1366,640,390,320]){await page.setViewportSize({width,height:768});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));const bar=await page.locator('#controls').boundingBox(),boxes=await page.locator('.vf-left,.vf-center,.vf-right').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return{x:r.x,right:r.right};}));assert(bar.x>=0&&bar.x+bar.width<=width+1);assert(boxes[0].right<=boxes[1].x+1);assert(boxes[1].right<=boxes[2].x+1);assert(boxes[2].right<=width);assert.equal(await page.locator('#hub-player-more > summary').isVisible(),true);}await page.setViewportSize({width:1366,height:768});const classicBar=await page.locator('#controls').boundingBox(),segments=await page.locator('#dots').boundingBox();assert(classicBar.y>=segments.y+segments.height);await page.screenshot({path:'test-results/classic-floating-bar.png'});await page.locator('#hub-player-more > summary').click();await page.locator('#vc-footer-style').selectOption('modern');await page.locator('#hub-player-more > summary').click();const modern=await page.locator('#controls').boundingBox();assert.equal(modern.x,0);assert.equal(modern.width,1366);await page.screenshot({path:'test-results/modern-full-width-bar.png'});assert.deepEqual(errors,[]);}finally{await page.close();}});
