import {readFileSync} from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {resolve} from 'node:path';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']});
test.after(()=>browser.close());
async function open(file='presentation-studio.html',width=1366){const page=await browser.newPage({viewport:{width,height:768}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('file://'+resolve('dist/'+file));return{page,errors};}
test('one footer, explicit deck position and navigator close/jump playback semantics',async()=>{
 const {page,errors}=await open();try{
  assert.equal(await page.locator('#controls.vf-footer').count(),1);
  assert.equal(await page.locator('#stage > footer').isVisible(),false);
  await page.locator('#menu').click();
  assert.equal(await page.locator('#play').textContent(),'Play');
  assert.equal(await page.locator('#vf-search').evaluate(n=>document.activeElement===n),true);
  assert(await page.locator('#vf-results .vf-slide').count()>1);
  assert.equal(await page.locator('#vf-results [aria-current=true]').count(),1);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#play').textContent(),'Pause');
  assert.equal(await page.locator('#menu').evaluate(n=>document.activeElement===n),true);
  await page.locator('#vf-count').click();
  const title=await page.locator('#vf-results .vf-slide').nth(2).locator('strong').textContent();
  await page.locator('#vf-results .vf-slide').nth(2).click();
  assert.equal(await page.locator('#play').textContent(),'Play');
  assert((await page.locator('#vf-title').textContent()).includes(title.replace(/^\d+\. /,'')));
  assert.equal(await page.locator('#vf-count').evaluate(n=>document.activeElement===n),true);
  assert.equal(await page.locator('#vf-position').getAttribute('aria-valuenow'),'3');
  assert.equal(await page.locator('#vf-countdown').isVisible(),false);
  assert.deepEqual(errors,[]);
 }finally{await page.close();}
});
test('search has an empty state, preserves native typing and static inert thumbnails',async()=>{
 const {page,errors}=await open();try{
  await page.locator('#menu').click();await page.locator('#vf-search').fill('no-such-slide-1984');
  assert.equal(await page.locator('#vf-results button').count(),0);assert.match(await page.locator('#vf-results').textContent(),/No matching/);
  await page.locator('#vf-search').fill('');
  assert.equal(await page.locator('#vf-results video').count(),0);
  assert.equal(await page.locator('#vf-results .we-thumb-canvas:not([inert])').count(),0);
  assert.equal(await page.locator('#vf-results [id]').count(),0);
  assert.deepEqual(errors,[]);
 }finally{await page.close();}
});
test('one-slide and narrow viewers retain accessible essential actions',async()=>{
 const {page,errors}=await open('presentation-studio-blank.html',480);try{
  for(const id of ['menu','prev','next','vf-count'])assert.equal(await page.locator('#'+id).isVisible(),false);
  assert.equal(await page.locator('#play').isVisible(),true);
  await page.locator('#hub-player-more > summary').click();assert.equal(await page.locator('#full').isVisible(),true);
  const box=await page.locator('#controls').boundingBox();assert(box.x>=0&&box.x+box.width<=481);
  assert.deepEqual(errors,[]);
 }finally{await page.close();}
});

test('large decks page bounded thumbnails and omit hidden or empty sections',async()=>{
 const {page,errors}=await open('presentation-studio-blank.html');try{
  const pack=JSON.parse(readFileSync('templates/studio/presentation.json','utf8'));
  pack.meta.id='viewer-large-original-fixture';
  const first=pack.state.slides[0],group=first.group;
  pack.state.slides=Array.from({length:62},(_,i)=>({...structuredClone(first),id:'viewer-slide-'+i,title:'Review slide '+i,hidden:i===1}));
  pack.state.sections=pack.state.sections.map(s=>({...s,hidden:s.id!==group}));
  const hiddenGroup=pack.state.sections.find(s=>s.id!==group).id;
  pack.state.slides.push({...structuredClone(first),id:'viewer-hidden-group',title:'Hidden section content',group:hiddenGroup});
  pack.state.loops={};pack.state.media={};
  pack.history={past:[],future:[]};pack.checkpoints=[];
  await page.locator('#open-full-editor').click();
  await page.locator('#fe-import-file').setInputFiles({name:'original-large-deck.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(pack))});
  await page.waitForFunction(()=>window.presentationStudioEditing.read().projectId==='viewer-large-original-fixture');
  await page.locator('#fe-close').click();assert.equal(await page.locator('#menu').textContent(),'Slides');
  await page.locator('#menu').click();assert.equal(await page.locator('#vf-results .vf-slide').count(),24);
  assert.match(await page.locator('#vf-result-count').textContent(),/61 matching slides/);
  await page.locator('#vf-page-next').click();assert.equal(await page.locator('#vf-results .vf-slide').count(),24);
  await page.locator('#vf-search').fill('Hidden section');assert.equal(await page.locator('#vf-results .vf-slide').count(),0);
  await page.locator('#vf-search').fill('Review slide 61');await page.locator('#vf-results .vf-slide').click();
  assert.equal(await page.locator('#vf-title').textContent(),'Review slide 61');assert.equal(await page.locator('#play').textContent(),'Play');
  assert.deepEqual(errors,[]);
 }finally{await page.close();}
});

test('multi-slide phone viewers retain non-overlapping controls and visible timer',async()=>{
 const {page,errors}=await open();try{
  for(const width of [320,360,375,640,320]){await page.setViewportSize({width,height:740});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));const boxes=await page.locator('.vf-left,.vf-center,.vf-right').evaluateAll(nodes=>nodes.map(n=>{const b=n.getBoundingClientRect();return{x:b.x,right:b.right};}));assert(boxes[0].right<=boxes[1].x+1,JSON.stringify(boxes));assert(boxes[1].right<=boxes[2].x+1,JSON.stringify(boxes));assert.equal(await page.locator('#vf-countdown').isVisible(),true);}
  assert.deepEqual(errors,[]);
 }finally{await page.close();}
});

test('More menu labels have contrast before hovering in both themes',async()=>{
 const {page,errors}=await open();try{
  await page.locator('#hub-player-more > summary').click();await page.mouse.move(0,0);
  for(const dark of [false,true]){await page.evaluate(d=>document.body.classList.toggle('editor-dark',d),dark);const pairs=await page.locator('#hub-player-more .hub-menu-items button:visible').evaluateAll(nodes=>nodes.map(n=>({ink:getComputedStyle(n).color,paper:getComputedStyle(n.closest('.hub-menu-items')).backgroundColor,label:n.textContent})));
   const luminance=color=>{const rgb=color.match(/[\d.]+/g).slice(0,3).map(Number).map(n=>{const c=n/255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;});return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;};assert(pairs.length>2);for(const pair of pairs){const a=luminance(pair.ink),b=luminance(pair.paper);assert((Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5,JSON.stringify(pair));}}
  assert.deepEqual(errors,[]);
 }finally{await page.close();}
});

test('completion-driven video countdown uses video duration while manual holds stay hidden',async()=>{
 const {mkdirSync,writeFileSync}=await import('node:fs');mkdirSync('test-results',{recursive:true});const fixture=readFileSync('dist/presentation-studio.html','utf8').replace('  projectInit();',`window.__vfVideo=(advance,duration,time,active=true)=>{const slide=slides[index];slide.querySelectorAll('video.media-asset,.vf-test-video').forEach(n=>n.remove());const box=document.createElement('figure');box.className='media-box vf-test-video';const video=document.createElement('video');video.className='media-asset';Object.defineProperty(video,'duration',{value:duration});Object.defineProperty(video,'currentTime',{value:time});box.append(video);slide.append(box);mediaConfig.slides[slide.dataset.mediaId]={...mediaDefaults,kind:'video',advance,autoplay:false};playing=active;vfTiming();return {hidden:$('vf-countdown').hidden,text:$('vf-countdown').textContent};};\n  projectInit();`);writeFileSync('test-results/viewer-video-timer.html',fixture);
 const {page,errors}=await open();try{await page.goto('file://'+resolve('test-results/viewer-video-timer.html'));assert.deepEqual(await page.evaluate(()=>window.__vfVideo('ended',30,12)),{hidden:false,text:'18s'});assert.equal((await page.evaluate(()=>window.__vfVideo('manual',30,12))).hidden,true);assert.equal((await page.evaluate(()=>window.__vfVideo('ended',30,12,false))).hidden,true);assert.deepEqual(errors,[]);}finally{await page.close();}
});
