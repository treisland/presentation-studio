import test from 'node:test';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {chromium} from 'playwright';
import {click} from './ui.mjs';
import {snapshot,exportZip,importZip} from './collection-ui.mjs';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']});test.after(()=>browser.close());
async function setup(blank=false){const p=await browser.newPage({viewport:{width:1366,height:768},acceptDownloads:true}),errors=[];p.setDefaultTimeout(10000);p.on('pageerror',e=>errors.push(e.message));await p.goto('file://'+resolve('dist/presentation-studio'+(blank?'-blank':'')+'.html'));await p.locator('#open-full-editor').click();return{p,errors};}

test('New presentation offers one example entry and continues the selected example through naming/theme setup',async()=>{
 const{p,errors}=await setup();try{const before=await snapshot(p);await click(p,'#studio-new-open');assert.deepEqual(await p.locator('[name=nx-start]').evaluateAll(nodes=>nodes.map(n=>n.value)),['blank','import']);assert.equal(await p.locator('#lc-examples-wizard').count(),1);await p.screenshot({path:'test-results/new-presentation-simple.png'});
  await p.locator('#lc-examples-wizard').click();assert.equal(await p.locator('.lc-example-card').count(),6);await p.locator('[data-example=comic] button').click();await p.locator('#lc-use-demo').click();await p.locator('#nx-wizard-name').waitFor({state:'visible'});assert.deepEqual((await snapshot(p)).state,before.state);assert.match(await p.locator('#nx-wizard-progress').textContent(),/Step 2/);await p.locator('#nx-wizard-name').fill('My chosen comic');await p.locator('#nx-wizard-header').fill('MY STORY');await p.locator('#nx-wizard-next').click();assert.equal(await p.locator('#nx-wizard-layout').isDisabled(),true);await p.locator('#nx-wizard-next').click();await p.locator('#nx-wizard-theme').selectOption('dark');await p.locator('#nx-wizard-next').click();await p.locator('#nx-wizard').waitFor({state:'hidden'});const after=await snapshot(p);assert.notEqual(after.projectId,before.projectId);assert.equal(after.state.projectName,'My chosen comic');assert.equal(after.state.brand.headerTitle,'MY STORY');assert.equal(after.state.brand.presentationTheme,'dark');assert.equal(after.state.slides.length,4);assert(after.state.slides.every(s=>s.template.startsWith('comic-')));assert.equal(after.state.startingState.brand.presentationTheme,'dark');assert.deepEqual(errors,[]);
 }finally{await p.close();}
});

test('Studio demo remains available from a blank build with complete immutable previews and portable creation',async()=>{
 const{p,errors}=await setup(true);try{const before=await snapshot(p);assert.equal(before.state.slides.length,1);await click(p,'#lc-examples-open');await p.locator('[data-example=studio] button').click();assert.match(await p.locator('#lc-preview-title').textContent(),/1 of 8/);assert.equal(await p.locator('#lc-use-starter').isVisible(),false);for(let i=0;i<4;i++)await p.locator('#lc-preview-next').click();await p.waitForFunction(()=>document.querySelector('#lc-example-preview img')?.naturalWidth>0);assert.match(await p.locator('#lc-example-preview figcaption').textContent(),/Prepare your story/);assert.match(await p.locator('#lc-preview-readable').textContent(),/Three steps/);assert.deepEqual((await snapshot(p)).state,before.state);await p.screenshot({path:'test-results/studio-demo-gallery.png'});
  await p.locator('#lc-use-demo').click();await p.locator('#nx-wizard-name').waitFor({state:'visible'});await p.locator('#nx-wizard-defaults').click();await p.locator('#nx-wizard').waitFor({state:'hidden'});const after=await snapshot(p);assert.equal(after.state.slides.length,8);assert.notEqual(after.projectId,before.projectId);assert.match(JSON.stringify(after.state.media),/example-.*studio-demo-workflow/);const q=await importZip(browser,await exportZip(p),after.projectId);try{assert.deepEqual((await snapshot(q)).state,after.state);}finally{await q.close();}assert.deepEqual(errors,[]);
 }finally{await p.close();}
});

test('cancelled example setup and Import preserve the active presentation',async()=>{
 const{p,errors}=await setup();try{const before=await snapshot(p);await click(p,'#studio-new-open');await p.locator('#lc-examples-wizard').click();await p.locator('[data-example=newsletter] button').click();await p.locator('#lc-use-starter').click();await p.locator('#nx-wizard-name').waitFor({state:'visible'});await p.locator('#nx-wizard-close').click();assert.deepEqual((await snapshot(p)).state,before.state);
  await click(p,'#studio-new-open');assert.equal(await p.locator('#nx-selected-example').isVisible(),false);await p.locator('[name=nx-start][value=import]').check();const event=p.waitForEvent('filechooser');await p.locator('#nx-wizard-next').click();await event;assert.deepEqual((await snapshot(p)).state,before.state);assert.deepEqual(errors,[]);
 }finally{await p.close();}
});
