import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {resolve} from 'node:path';
import {snapshot,operations} from './collection-ui.mjs';
import {click} from './ui.mjs';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']});test.after(()=>browser.close());
async function setup(){const p=await browser.newPage({viewport:{width:1366,height:768}}),errors=[];p.setDefaultTimeout(10000);p.on('pageerror',e=>errors.push(e.message));await p.goto('file://'+resolve('dist/presentation-studio.html'));await p.locator('#open-full-editor').click();return{p,errors};}
test('every core/collection sampler layout imports with stable IDs and fits both review viewports without changing state',async()=>{const{p,errors}=await setup();try{
 await p.locator('#fe-import-file').setInputFiles(resolve('examples/layout-sampler.json'));await p.waitForFunction(()=>window.presentationStudioEditing.read().state.projectName==='Layout sampler');const before=await snapshot(p);assert.equal(before.state.slides.length,30);assert.equal(new Set(before.state.slides.map(s=>s.id)).size,30);assert(before.state.slides.some(s=>s.template==='blank'));
 for(const size of [{width:1366,height:768},{width:1920,height:1080}]){await p.setViewportSize(size);for(const slide of before.state.slides){await p.locator('.fe-slide-button[data-slide-id="'+slide.id+'"]').click();assert.equal(await p.locator('#fe-layout-warning').isVisible(),false,slide.template+' default at '+size.width);if(size.width===1366&&['newsletter-updates','flyer-event'].includes(slide.template))await p.screenshot({path:'test-results/acceptance-'+slide.template+'.png'});}}
 assert.deepEqual((await snapshot(p)).state,before.state);const source=before.state.slides[0];assert.equal((await operations(p,[{type:'layout.apply',slideId:source.id,template:'portfolio-unregistered',keep:true}])).ok,false);assert.deepEqual((await snapshot(p)).state,before.state);assert.deepEqual(errors,[]);
}finally{await p.close();}});
test('New presentation and Recent presentations open the same view-only example browser and restore parent focus',async()=>{const{p,errors}=await setup();try{
 const before=await snapshot(p);await click(p,'#studio-new-open');await p.locator('#nx-wizard').waitFor({state:'visible'});await p.locator('#lc-examples-wizard').click();assert.equal(await p.locator('.lc-example-card').count(),5);await p.locator('#lc-examples-close').click();await p.waitForFunction(()=>document.activeElement.id==='lc-examples-wizard');assert.equal(await p.locator('#nx-wizard').isVisible(),true);await p.keyboard.press('Escape');
 await click(p,'#hub-editor-projects');await p.locator('#lc-examples-hub').click();assert.equal(await p.locator('.lc-example-card').count(),5);await p.locator('#lc-examples-close').click();await p.waitForFunction(()=>document.activeElement.id==='lc-examples-hub');assert.equal(await p.locator('#hub-picker').isVisible(),true);await p.keyboard.press('Escape');assert.deepEqual((await snapshot(p)).state,before.state);assert.deepEqual(errors,[]);
}finally{await p.close();}});
