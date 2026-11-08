import { selectTab } from './ui.mjs';
import { waitForVideo } from './media-diagnostics.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {readFile} from 'node:fs/promises';
import {click,reveal} from './ui.mjs';
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']});
test.after(()=>browser.close());
test('Media Focus action is named, hidden until keyboard focus and returns focus after Escape',async()=>{const {p,errors}=await setup();try{
 await p.locator('#vb-preview-mode').click();
 const action=p.locator('#fe-preview .mf-expand');
 assert.match(await action.getAttribute('aria-label'),/^Open media focus: .+/);
 assert.equal(await action.evaluate(el=>getComputedStyle(el).clipPath),'inset(50%)');
 await p.keyboard.press('Tab');await action.focus(); assert.equal(await action.evaluate(el=>getComputedStyle(el).clipPath),'none');
 await action.press('Space');await opened(p);await p.keyboard.press('Escape');await p.waitForSelector('#media-focus',{state:'detached'});
 assert.equal(await action.evaluate(el=>el===document.activeElement),true);
 await p.locator('#fe-preview .media-viewport').click();await opened(p);await p.keyboard.press('Escape');await p.waitForSelector('#media-focus',{state:'detached'});
 await p.locator('#vb-edit-mode').click();await p.locator('#fe-preview img.media-asset').click({force:true});assert.equal(await p.locator('#media-focus').count(),0);
 assert.deepEqual(errors,[]);
 }finally{await p.close();}});
async function setup(){const p=await browser.newPage({viewport:{width:1366,height:768}});const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('file://'+resolve('dist/presentation-studio.html'));await p.locator('#play').click();await p.locator('#open-full-editor').click();await p.locator('.fe-slide-button').filter({hasText:'Bring your content to life'}).click();return {p,errors};}
async function opened(p){await p.waitForFunction(()=>document.querySelector('#media-focus')?.querySelector('#mf-zoom-in')?.disabled===false,{timeout:5000});}
test('Focus pauses advancement, preserves image identity, zooms, and returns in Preview',async()=>{const {p,errors}=await setup();try{
 await p.locator('#vb-preview-mode').click();await p.locator('#fe-preview img.media-asset').evaluate(el=>window.savedMedia=el);
 await p.locator('#fe-preview .mf-expand').press('Enter');await opened(p);
 assert.equal(await p.locator('#media-focus img').evaluate(el=>el===window.savedMedia),true);
 await p.locator('#mf-zoom-in').click();assert.equal(await p.locator('#mf-zoom-readout').textContent(),'125%');
 await p.locator('#mf-fit').click();assert.equal(await p.locator('#mf-zoom-readout').textContent(),'100%');
 await p.keyboard.press('Escape');await p.waitForSelector('#media-focus',{state:'detached'});
 assert.equal(await p.locator('#fe-preview img.media-asset').evaluate(el=>el===window.savedMedia),true);
 assert.equal(await p.locator('#full-editor').isVisible(),true);
 await p.locator('#vb-edit-mode').click();await p.locator('#fe-preview img.media-asset').click({force:true});assert.equal(await p.locator('#media-focus').count(),0);
 assert.deepEqual(errors,[]);
 }finally{await p.close();}});
test('Live focus fills canvas, restores pause, respects settings and reduced motion',async()=>{const {p,errors}=await setup();try{
 await p.locator('#fe-close').click();
 // Selecting a slide in the editor does not navigate the live deck.
 await p.locator('#stage .dot').nth(4).click();
 await p.locator('#stage .slide.active .mf-expand').press('Enter');await opened(p);
 const size=await p.locator('#media-focus .mf-focused').evaluate(el=>{const a=el.getBoundingClientRect(),b=document.querySelector('#stage').getBoundingClientRect();return a.width/b.width;});assert(size>.9);
 await p.keyboard.press('ArrowRight');assert.equal(await p.locator('#media-focus').count(),1);
 await p.keyboard.press('Escape');await p.waitForSelector('#media-focus',{state:'detached'});
 assert.equal(await p.locator('#play').textContent(),'Play');
 await p.locator('#open-full-editor').click();await selectTab(p, 'Presentation settings');await click(p,'#mf-setting-enabled');await p.locator('#mf-setting-animation').selectOption('fade');const downloaded=p.waitForEvent('download');await click(p,'#fe-export-json');const file=await downloaded;assert.equal(JSON.parse(await readFile(await file.path(),'utf8')).state.presentation.mediaFocus.animation,'fade');await p.locator('#fe-close').click();assert.equal(await p.locator('#stage .mf-expand').count(),0);
 assert.deepEqual(errors,[]);
 }finally{await p.close();}});
test('Video keeps its element, position, and user pause decision through focus',async()=>{const {p,errors}=await setup();try{
 await p.locator('#fe-preview .media-box').click();await reveal(p,'#vb-panel');await p.locator('#vb-panel').click();
 const bytes=await p.evaluate(async()=>{const c=document.createElement('canvas');c.width=320;c.height=180;const g=c.getContext('2d'),stream=c.captureStream(10),r=new MediaRecorder(stream,{mimeType:'video/webm'}),chunks=[];r.ondataavailable=e=>chunks.push(e.data);const stopped=new Promise(resolve=>r.onstop=resolve);r.start();let n=0;const draw=setInterval(()=>{g.fillStyle=n++%2?'blue':'cyan';g.fillRect(0,0,320,180);},50);await new Promise(r=>setTimeout(r,1200));clearInterval(draw);r.stop();await stopped;stream.getTracks().forEach(t=>t.stop());return [...new Uint8Array(await new Blob(chunks,{type:'video/webm'}).arrayBuffer())];});
 await p.locator('#me-file').setInputFiles({name:'focus.webm',mimeType:'video/webm',buffer:Buffer.from(bytes)});await p.waitForTimeout(350);await p.locator('#me-close').click();await p.locator('#open-full-editor').click();await p.locator('.fe-slide-button').filter({hasText:'Bring your content to life'}).click();await p.locator('#vb-preview-mode').click();
 await waitForVideo(p, '#fe-preview video');
 await p.locator('#fe-preview video').evaluate(async v=>{window.savedVideo=v;v.loop=true;await v.play();v.currentTime=.4;});
 await p.locator('#fe-preview .mf-expand').press('Enter');await p.waitForSelector('#media-focus video');await p.waitForTimeout(450);
 assert.equal(await p.locator('#media-focus video').evaluate(v=>v===window.savedVideo&&!v.paused),true);
 await p.locator('#media-focus video').evaluate(v=>{v.pause();v.currentTime=.5;});
 await p.keyboard.press('Escape');await p.waitForSelector('#media-focus',{state:'detached'});
 assert.equal(await p.locator('#fe-preview video').evaluate(v=>v===window.savedVideo&&v.paused&&Math.abs(v.currentTime-.5)<.1),true);
 assert.deepEqual(errors,[]);
 }finally{await p.close();}});
test('Active playback resumes after focus, reduced motion and repeated close are safe',async()=>{const {p,errors}=await setup();try{
 await p.emulateMedia({reducedMotion:'reduce'});await p.locator('#fe-close').click();await p.locator('#stage .dot').nth(4).click();await p.locator('#play').click();
 await p.locator('#stage .slide.active .mf-expand').press('Enter');await opened(p);assert.equal(await p.locator('#play').textContent(),'Play');
 const before=await p.locator('#stage .slide.active').getAttribute('data-media-id');await p.waitForTimeout(300);assert.equal(await p.locator('#stage .slide.active').getAttribute('data-media-id'),before);
 await p.keyboard.press('Escape');await p.waitForSelector('#media-focus',{state:'detached'});assert.equal(await p.locator('#play').textContent(),'Pause');
 await p.locator('#stage .slide.active .mf-expand').press('Enter');await p.keyboard.press('Escape');await p.keyboard.press('Escape');await p.waitForSelector('#media-focus',{state:'detached'});
 assert.equal(await p.locator('#stage').getAttribute('inert'),null);assert.deepEqual(errors,[]);
 }finally{await p.close();}});
