import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {resolve} from 'node:path';
import {readFile} from 'node:fs/promises';
import {click} from './ui.mjs';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']});test.after(()=>browser.close());
const read=p=>p.evaluate(()=>window.presentationStudioEditing.read());
async function setup(choice='editorial-demo',dark=false){const p=await browser.newPage({acceptDownloads:true,viewport:{width:1366,height:768}}),errors=[];p.setDefaultTimeout(10000);p.on('pageerror',e=>errors.push(e.message));await p.goto('file://'+resolve('dist/presentation-studio.html'));await p.locator('#open-full-editor').click();await click(p,'#studio-new-open');await p.locator('[name=nx-start][value='+choice+']').check();if(dark){for(let i=0;i<3;i++)await p.locator('#nx-wizard-next').click();await p.locator('#nx-wizard-theme').selectOption('dark');await p.locator('#nx-wizard-next').click();}else await p.locator('#nx-wizard-defaults').click();await p.locator('#nx-wizard').waitFor({state:'hidden'});return{p,errors};}
test('Editorial examples preserve masthead, column reading order and fit in both themes and review sizes',async()=>{
 for(const dark of [false,true]){const{p,errors}=await setup('editorial-demo',dark);try{const snapshot=await read(p);assert.equal(snapshot.state.slides.length,5);assert.equal(snapshot.state.brand.presentationTheme,dark?'dark':'light');
  for(const size of [{width:1366,height:768},{width:1920,height:1080}]){await p.setViewportSize(size);for(const slide of snapshot.state.slides){await p.locator('.fe-slide-button[data-slide-id="'+slide.id+'"]').click();assert.equal(await p.locator('#fe-layout-warning').isVisible(),false,slide.template);await p.screenshot({path:'test-results/'+slide.template+'-'+size.width+(dark?'-dark':'')+'.png'});}}
  const columns=snapshot.state.slides.find(s=>s.template==='editorial-columns');await p.locator('.fe-slide-button[data-slide-id="'+columns.id+'"]').click();const texts=await p.locator('#fe-preview .lc-column').allTextContents();assert.equal(texts.length,2);assert.match(texts[0],/newcomer/);assert.match(texts[1],/volunteer/);assert.deepEqual(errors,[]);
 }finally{await p.close();}}
});
test('long editorial articles are flagged without shrinking and remain recoverable in a validated ZIP',async()=>{const{p,errors}=await setup();try{
 const original=await read(p),columns=original.state.slides.find(s=>s.template==='editorial-columns');await p.locator('.fe-slide-button[data-slide-id="'+columns.id+'"]').click();const paragraph=p.locator('#fe-preview .lc-column p').first(),size=await paragraph.evaluate(n=>getComputedStyle(n).fontSize);await paragraph.dblclick();await paragraph.fill('A longer observation for this article. '.repeat(35));await paragraph.press('Escape');assert.equal(await p.locator('#fe-layout-warning').isVisible(),true);assert.equal(await p.locator('#fe-preview .lc-column p').first().evaluate(n=>getComputedStyle(n).fontSize),size);
 const expected=await read(p),d=p.waitForEvent('download');await click(p,'#fe-export');const bytes=await readFile(await(await d).path());const q=await browser.newPage();try{await q.context().setOffline(true);await q.goto('file://'+resolve('dist/presentation-studio.html'));await q.locator('#open-full-editor').click();await q.locator('#fe-import-file').setInputFiles({name:'editorial.zip',mimeType:'application/zip',buffer:bytes});await q.waitForFunction(id=>window.presentationStudioEditing.read().projectId===id,expected.projectId);const restored=await read(q);assert.deepEqual(restored.state.slides,expected.state.slides);assert.deepEqual(restored.state.media,expected.state.media);}finally{await q.close();}
 await p.locator('#fe-undo').click();assert.deepEqual((await read(p)).state,original.state);assert.deepEqual(errors,[]);
}finally{await p.close();}});
