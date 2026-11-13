import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import vm from 'node:vm';
import {chromium} from 'playwright';
import {chooseExample,snapshot,operations,exportZip,importZip} from './collection-ui.mjs';
import {click,selectTab} from './ui.mjs';
import {archivePath} from './archive-path.mjs';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']});
test.after(()=>browser.close());
await mkdir('test-results',{recursive:true});
await writeFile('test-results/custom-backgrounds-fixture.html',(await readFile('dist/presentation-studio.html','utf8')).replace('  projectInit();','window.__cbTest={pack:projectPack,validate:projectValidatePack,build:paBuild,clean:cbEngine.clean,load:lwLoad,backgroundMedia:()=>{const cfg=[...Object.values(projectState.media),...Object.values(projectState.mediaObjects||{}).flatMap(items=>items.map(n=>n.media))][0];projectState.media[projectState.slides[0].id]={...projectCopy(cfg),layout:"background"};projectRender(true);}};\n  projectInit();'));
const zipContext={setImmediate,clearImmediate,setTimeout,clearTimeout,Uint8Array,ArrayBuffer,TextEncoder,TextDecoder};vm.runInNewContext(await readFile('vendor/jszip-3.10.1.min.js','utf8'),zipContext);
const svg='<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="320" height="180" fill="#234567"/><circle cx="260" cy="80" r="40" fill="#bedcff"/></svg>';
async function setup(){const page=await browser.newPage({acceptDownloads:true,viewport:{width:1366,height:900}}),errors=[];page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));await page.goto('file://'+resolve('test-results/custom-backgrounds-fixture.html'));await page.locator('#open-full-editor').click();await chooseExample(page,'portfolio-demo');return{page,errors};}
async function set(page,config,scope='presentation',slideId){const id=slideId||(await snapshot(page)).state.slides[0].id;const r=await operations(page,[{type:'background.custom',slideId:id,scope,...config?{config}:{reset:true}}]);assert.equal(r.ok,true,r.message);}
async function settings(page){await page.locator('#we-settings-open').click();await page.locator('#we-tab-background').click();}
async function unpack(bytes,name){const zip=await zipContext.JSZip.loadAsync(new Uint8Array(bytes)),folder=resolve('test-results/cb-'+name);for(const f of Object.values(zip.files)){if(f.dir)continue;const p=archivePath(folder,f.name);await mkdir(dirname(p),{recursive:true});await writeFile(p,await f.async('uint8array'));}return folder;}

test('new backgrounds are strictly guarded; unchanged v2/v3 and authoring v1 remain supported',async()=>{
 const {page,errors}=await setup();try{
  assert.equal(await page.evaluate(()=>window.__cbTest.pack().schemaVersion),2);
  await set(page,{kind:'solid',color:'#123456'});const pack=await page.evaluate(()=>window.__cbTest.pack()),before=await snapshot(page);assert.equal(pack.schemaVersion,4);
  for(const version of [2,3])assert.match(await page.evaluate(p=>{try{window.__cbTest.validate(p);return '';}catch(e){return e.message;}},{...pack,schemaVersion:version}),/require.*v4/);
  for(const config of [{kind:'image',asset:'https://example.test/a.png'},{kind:'solid',color:'url(x)'},{kind:'gradient',colors:['accent','background'],angle:Infinity},{kind:'solid',color:'#123456',script:'x'}]){
   const result=await operations(page,[{type:'background.custom',scope:'presentation',slideId:before.state.slides[0].id,config}]);assert.equal(result.ok,false);assert.deepEqual((await snapshot(page)).state,before.state);
  }
  const v1=JSON.parse(await readFile('docs/ai/example.json','utf8')),v2=JSON.parse(await readFile('docs/ai/custom-backgrounds-v2.json','utf8'));
  const versions=await page.evaluate(([a,b])=>[window.__cbTest.build(a).pack.schemaVersion,window.__cbTest.build(b).pack.schemaVersion],[v1,v2]);assert.deepEqual(versions,[2,4]);
  assert.deepEqual(errors,[]);
 }finally{await page.close();}
});
test('UI previews and Cancel are read-only; Apply and reset preserve one-step Undo',async()=>{
 const {page,errors}=await setup();try{
  const before=await snapshot(page);await settings(page);await page.locator('#cb-source').selectOption('custom');await page.locator('#cb-kind').selectOption('solid');await page.locator('#cb-color').fill('#123456');
  assert.deepEqual((await snapshot(page)).state,before.state);assert.equal(await page.locator('#cb-preview .cb-layer').evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(18, 52, 86)');
  await page.locator('#cb-cancel').click();assert.deepEqual((await snapshot(page)).state,before.state);
  await page.locator('#cb-source').selectOption('custom');await page.locator('#cb-kind').selectOption('solid');await page.locator('#cb-color').fill('#123456');await page.locator('#cb-apply').click();
  assert.equal((await snapshot(page)).state.backgrounds.defaults.color,'#123456');await page.locator('#we-settings-close').click();await page.locator('#fe-undo').click();assert.deepEqual((await snapshot(page)).state,before.state);await page.locator('#fe-redo').click();assert.equal((await snapshot(page)).state.backgrounds.defaults.color,'#123456');assert.deepEqual(errors,[]);
 }finally{await page.close();}
});
test('complete slide overrides, duplication, reset and locks retain independent settings',async()=>{
 const {page,errors}=await setup();try{
  await set(page,{kind:'solid',color:'#123456'});await set(page,{kind:'gradient',colors:['background','accent'],angle:90},'slide');const before=await snapshot(page),id=before.state.slides[0].id;
  await page.locator('#fe-duplicate').click();const copy=(await snapshot(page)).state.slides[1];assert.deepEqual((await snapshot(page)).state.backgrounds.slides[copy.id],before.state.backgrounds.slides[id]);
  await set(page,{kind:'solid',color:'#abcdef'},'slide',copy.id);assert.deepEqual((await snapshot(page)).state.backgrounds.slides[id],before.state.backgrounds.slides[id]);
  await set(page,null,'slide',copy.id);assert.equal((await snapshot(page)).state.backgrounds.slides[copy.id],undefined);
  if(await page.locator('#ic-slide-settings').isVisible())await page.locator('#ic-slide-settings').click();await page.locator('#wp-tab-arrange').click();await page.locator('#ce-slide-lock').click();const locked=await snapshot(page);
  const result=await operations(page,[{type:'background.custom',scope:'presentation',slideId:copy.id,config:{kind:'theme'}}]);assert.equal(result.ok,false);assert.deepEqual((await snapshot(page)).state,locked.state);await settings(page);await page.locator('#cb-scope').selectOption('selected');assert.match(await page.locator('#cb-target-summary').textContent(),/BLOCKED: 1 locked/);assert.equal(await page.locator('#cb-apply').isDisabled(),true);assert.deepEqual(errors,[]);
 }finally{await page.close();}
});
test('uploaded originals survive editable restore and Undo-only asset references',async()=>{
 const {page,errors}=await setup();try{
  await settings(page);const before=await snapshot(page);await page.locator('#cb-file').setInputFiles({name:'original-background.svg',mimeType:'image/svg+xml',buffer:Buffer.from(svg)});await page.waitForFunction(()=>document.querySelector('#cb-kind').value==='image');await page.waitForFunction(()=>document.querySelector('#cb-image-info').textContent.includes('320 × 180'));assert.deepEqual((await snapshot(page)).state,before.state);
  await page.locator('#cb-fit').selectOption('fit');await page.locator('#cb-x').fill('75');await page.locator('#cb-apply').click();const expected=await snapshot(page),path=expected.state.backgrounds.defaults.asset;
  await page.locator('#we-settings-close').click();const bytes=await exportZip(page),zip=await zipContext.JSZip.loadAsync(new Uint8Array(bytes));assert.equal(await zip.file(path).async('string'),svg);assert.equal(JSON.parse(await zip.file('presentation.json').async('string')).schemaVersion,4);
  const restored=await importZip(browser,bytes,expected.projectId);try{assert.deepEqual((await snapshot(restored)).state,expected.state);await restored.waitForFunction(()=>document.querySelector('#fe-preview .cb-layer img')?.naturalWidth>0);}finally{await restored.close();}
  await set(page,null);const removed=await exportZip(page),historyZip=await zipContext.JSZip.loadAsync(new Uint8Array(removed));assert.equal(await historyZip.file(path).async('string'),svg);assert.deepEqual(errors,[]);
 }finally{await page.close();}
});
test('playback and independent booth reopen offline with matching background and no private notes',async()=>{
 const {page,errors}=await setup();try{
  await set(page,{kind:'gradient',colors:['#123456','#abcdef'],angle:135});assert.equal((await operations(page,[{type:'background.set',scope:'presentation',slideId:(await snapshot(page)).state.slides[0].id,config:{effect:'orbit'}}])).ok,true);const playback=await exportZip(page,'#fe-playback');await selectTab(page,'Presentation settings');await page.locator('#booth-open').click();await page.locator('#booth-password').fill('background-test');await page.locator('#booth-confirm').fill('background-test');await page.locator('#booth-loop').selectOption(Object.keys((await snapshot(page)).state.loops)[0]);const booth=await exportZip(page,'#booth-export');
  for(const [kind,bytes]of [['playback',playback],['booth',booth]]){
   const folder=await unpack(bytes,kind),context=await browser.newContext();await context.setOffline(true);const restored=await context.newPage();restored.on('pageerror',e=>errors.push(e.message));try{await restored.goto('file://'+resolve(folder,'index.html'));const layer=restored.locator('#stage > .cb-layer');await layer.waitFor();assert.match(await layer.evaluate(n=>n.style.background),/135deg/);assert.equal(await layer.evaluate(n=>n.inert),true);const stacking=await restored.evaluate(()=>{const root=document.getElementById('stage');return {base:+getComputedStyle(root.querySelector(':scope > .cb-layer')).zIndex,effect:+getComputedStyle(root.querySelector(':scope > .bg-effect')).zIndex,content:+getComputedStyle(root.querySelector('.slide.active')).zIndex};});assert(stacking.effect>stacking.base&&stacking.content>stacking.effect,JSON.stringify(stacking));const data=kind==='booth'?JSON.parse(await restored.locator('#booth-data').textContent()):JSON.parse(await restored.locator('#project-config').textContent());assert.equal(JSON.stringify(data).includes('speaker notes'),false);}finally{await context.close();}
  }
  assert.deepEqual(errors,[]);
 }finally{await page.close();}
});

test('stale staged changes and missing background assets cannot replace current work',async()=>{
 const {page,errors}=await setup();try{
  await settings(page);await page.locator('#cb-source').selectOption('custom');await page.locator('#cb-kind').selectOption('solid');await page.locator('#cb-color').fill('#123456');
  const id=(await snapshot(page)).state.slides[0].id;await set(page,{kind:'solid',color:'#abcdef'});const before=await snapshot(page);
  await page.locator('#cb-apply').click();assert.match(await page.locator('#cb-status').textContent(),/changed/);assert.deepEqual((await snapshot(page)).state,before.state);
  await page.locator('#we-settings-close').click();const pack=await page.evaluate(()=>window.__cbTest.pack());pack.state.backgrounds.defaults={kind:'image',asset:'assets/missing-image.png',fit:'fill',focal:{x:.5,y:.5},fallback:'background',overlay:{color:'ink',opacity:0},protectText:'off'};
  await click(page,'#lw-open');await page.locator('#lw-tab-create').click();await page.locator('#lw-json').fill(JSON.stringify(pack));await page.locator('#lw-validate').click();await page.waitForFunction(()=>document.querySelector('#lw-panel').getAttribute('aria-busy')==='false');
  assert.equal(await page.locator('#lw-review-open').isDisabled(),true);assert.deepEqual((await snapshot(page)).state,before.state);assert.match(await page.locator('#lw-message').textContent(),/ZIP|missing|media/i);assert.deepEqual(errors,[]);
 }finally{await page.close();}
});

test('portable authoring v2 previews its backdrop privately before explicit import',async()=>{
 const {page,errors}=await setup();try{
  const before=await snapshot(page),document=JSON.parse(await readFile('docs/ai/custom-backgrounds-v2.json','utf8'));
  await click(page,'#lw-open');await page.locator('#lw-tab-create').click();await page.locator('#lw-json').fill(JSON.stringify(document));await page.locator('#lw-validate').click();await page.locator('#pa-preview-select').waitFor();
  assert.deepEqual((await snapshot(page)).state,before.state);assert.match(await page.locator('.pa-review-stage > .cb-layer').evaluate(n=>n.style.background),/135deg/);
  await page.locator('#lw-review-open').click();if(await page.locator('#hub-switch').evaluate(n=>n.open))await page.locator('#hub-save-switch').click();await page.locator('#lw-panel').waitFor({state:'hidden'});
  assert.equal((await snapshot(page)).state.backgrounds.defaults.kind,'gradient');assert.equal(await page.evaluate(()=>window.__cbTest.pack().schemaVersion),4);assert.deepEqual(errors,[]);
 }finally{await page.close();}
});

test('Cancel invalidates an image still decoding rather than restoring a cancelled draft',async()=>{
 const {page,errors}=await setup();try{
  await settings(page);const before=await snapshot(page);
  await page.evaluate(()=>{const decode=HTMLImageElement.prototype.decode;HTMLImageElement.prototype.decode=function(){const image=this;return new Promise((resolve,reject)=>{window.__finishBackgroundDecode=()=>decode.call(image).then(resolve,reject);});};});
  await page.locator('#cb-file').setInputFiles({name:'slow-original.svg',mimeType:'image/svg+xml',buffer:Buffer.from(svg)});await page.waitForFunction(()=>!!window.__finishBackgroundDecode);
  await page.locator('#cb-cancel').click();await page.evaluate(()=>window.__finishBackgroundDecode());await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  assert.equal(await page.locator('#cb-source').inputValue(),'inherit');assert.equal(await page.locator('#cb-kind').inputValue(),'theme');assert.deepEqual((await snapshot(page)).state,before.state);assert.deepEqual(errors,[]);
 }finally{await page.close();}
});

test('effects stay between custom base and content in either initialization order',async()=>{
 const {page,errors}=await setup();try{const id=(await snapshot(page)).state.slides[0].id;
  for(const reverse of [false,true]){await page.reload();await page.locator('#open-full-editor').click();await chooseExample(page,'portfolio-demo');const id=(await snapshot(page)).state.slides[0].id;const ops=[{type:'background.set',scope:'presentation',slideId:id,config:{effect:'aurora'}},{type:'background.custom',scope:'presentation',slideId:id,config:{kind:'solid',color:'#112233'}}];assert.equal((await operations(page,reverse?ops.reverse():ops)).ok,true);for(const selector of ['#fe-preview > .me-preview-stage','#stage']){const stack=await page.locator(selector).evaluate(root=>({base:+getComputedStyle(root.querySelector(':scope > .cb-layer')).zIndex,effect:+getComputedStyle(root.querySelector(':scope > .bg-effect')).zIndex,content:+getComputedStyle(root.querySelector('.slide')).zIndex}));assert(stack.effect>stack.base&&stack.content>stack.effect,JSON.stringify(stack));}}
  assert.deepEqual(errors,[]);
 }finally{await page.close();}
});

test('authoring ZIP image bytes do not consume the JSON budget but oversized JSON still rejects',async()=>{
 const {page,errors}=await setup();try{const document=JSON.parse(await readFile('docs/ai/custom-backgrounds-v2.json','utf8')),before=await snapshot(page);document.backdrop={kind:'image',asset:'assets/original-large.svg',fit:'fill',focal:{x:.5,y:.5},fallback:'background',overlay:{color:'ink',opacity:0},protectText:'off'};
  const image=svg.replace('</svg>','<!--'+'a'.repeat(3*1024*1024)+'--></svg>'),zip=new zipContext.JSZip();zip.file('presentation.json',JSON.stringify(document));zip.file('assets/original-large.svg',image);const bytes=await zip.generateAsync({type:'uint8array',compression:'STORE'});assert(bytes.length>2*1024*1024);
  const result=await page.evaluate(async encoded=>{const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));const candidate=await window.__cbTest.load(new File([bytes],'image-authoring.zip',{type:'application/zip'}));return {version:candidate.pack.schemaVersion,size:candidate.assets.get('assets/original-large.svg').size};},Buffer.from(bytes).toString('base64'));assert.equal(result.version,4);assert.equal(result.size,Buffer.byteLength(image));assert.deepEqual((await snapshot(page)).state,before.state);
  const oversized=' '.repeat(2*1024*1024)+JSON.stringify(document),bad=new zipContext.JSZip();bad.file('presentation.json',oversized);bad.file('assets/original-large.svg',image);const badBytes=await bad.generateAsync({type:'uint8array',compression:'STORE'});
  for(const [name,data]of [['oversized.zip',badBytes],['oversized.json',Buffer.from(oversized)]]){const message=await page.evaluate(async({name,encoded})=>{try{await window.__cbTest.load(new File([Uint8Array.from(atob(encoded),c=>c.charCodeAt(0))],name));return '';}catch(e){return e.message;}},{name,encoded:Buffer.from(data).toString('base64')});assert.match(message,/Authoring JSON exceeds the 2 MB/);assert.deepEqual((await snapshot(page)).state,before.state);}assert.deepEqual(errors,[]);
 }finally{await page.close();}
});

test('readability controls stage deterministic image overlays without rewriting content',async()=>{
 const {page,errors}=await setup();try{
  await settings(page);await page.locator('#cb-look').selectOption('horizon');await page.locator('#cb-composition').selectOption('text-right');const before=await snapshot(page);
  await page.locator('#cb-use-look').click();assert.deepEqual((await snapshot(page)).state,before.state);await page.locator('#cb-overlay-color').fill('#112233');await page.locator('#cb-overlay-opacity').fill('65');
  assert.equal(await page.locator('#cb-protect').inputValue(),'right');assert.equal(await page.locator('#cb-preview .cb-overlay').evaluate(n=>n.style.opacity),'0.65');assert.match(await page.locator('#cb-preview .cb-protect').evaluate(n=>n.style.background),/270deg/);
  await page.locator('#cb-apply').click();const after=await snapshot(page);assert.deepEqual(after.state.slides,before.state.slides);assert.equal(after.state.backgrounds.defaults.overlay.opacity,.65);assert.equal(after.state.backgrounds.defaults.overlay.color,'#112233');assert.equal(after.state.backgrounds.defaults.protectText,'right');
  await page.locator('#cb-look').selectOption('theme');await page.locator('#cb-composition').selectOption('divider');await page.locator('#cb-use-look').click();assert.equal(await page.locator('#cb-first').inputValue(),'background');assert.equal(await page.locator('#cb-second').inputValue(),'muted');await page.locator('#cb-cancel').click();assert.deepEqual((await snapshot(page)).state,after.state);assert.deepEqual(errors,[]);
 }finally{await page.close();}
});

test('coordinated variants map only to the explicitly selected composition and remain keyboard reachable',async()=>{
 const {page,errors}=await setup();try{
  await settings(page);await page.locator('#cb-look').selectOption('horizon');
  for(const [composition,side]of [['title','left'],['text-left','left'],['text-right','right'],['divider','off']]){await page.locator('#cb-composition').selectOption(composition);await page.locator('#cb-use-look').focus();await page.locator('#cb-use-look').press('Enter');assert.equal(await page.locator('#cb-protect').inputValue(),side);}
  await page.setViewportSize({width:390,height:740});await page.locator('#cb-use-look').scrollIntoViewIfNeeded();assert.equal(await page.locator('#cb-use-look').isVisible(),true);assert.equal(await page.locator('#cb-panel').evaluate(n=>n.scrollWidth<=n.clientWidth),true);assert.deepEqual(errors,[]);
 }finally{await page.close();}
});

test('bulk backgrounds preserve overrides by default and commit or reject targets atomically',async()=>{
 const {page,errors}=await setup();try{const slides=(await snapshot(page)).state.slides;await set(page,{kind:'solid',color:'#123456'},'slide',slides[0].id);const before=await snapshot(page),ids=slides.slice(0,2).map(s=>s.id);let result=await operations(page,[{type:'background.bulk',slideId:ids[0],scope:'slides',ids,config:{kind:'solid',color:'#abcdef'},replaceOverrides:false}]);assert.equal(result.ok,true,result.message);let after=await snapshot(page);assert.equal(after.state.backgrounds.slides[ids[0]].color,'#123456');assert.equal(after.state.backgrounds.slides[ids[1]].color,'#abcdef');assert.equal(after.state.backgrounds.defaults,null);await page.locator('#fe-undo').click();assert.deepEqual((await snapshot(page)).state,before.state);
  if(await page.locator('#ic-slide-settings').isVisible())await page.locator('#ic-slide-settings').click();await page.locator('#wp-tab-arrange').click();await page.locator('#ce-slide-lock').click();const locked=await snapshot(page);result=await operations(page,[{type:'background.bulk',slideId:ids[0],scope:'slides',ids,config:{kind:'solid',color:'#fedcba'},replaceOverrides:true}]);assert.equal(result.ok,false);assert.deepEqual((await snapshot(page)).state,locked.state);assert.deepEqual(errors,[]);
 }finally{await page.close();}
});

test('section and selected-slide review shows exact targets, staged sample state and one-step Undo',async()=>{
 const {page,errors}=await setup();try{const before=await snapshot(page);await settings(page);await page.locator('#cb-scope').selectOption('selected');await page.locator('#cb-source').selectOption('custom');await page.locator('#cb-kind').selectOption('solid');await page.locator('#cb-color').fill('#234567');await page.locator('#cb-target-list input').nth(1).check();assert.match(await page.locator('#cb-target-summary').textContent(),/2 affected of 2 targets/);for(const input of await page.locator('#cb-target-list input').all())await input.uncheck();assert.match(await page.locator('#cb-target-summary').textContent(),/0 targets/);assert.equal(await page.locator('#cb-apply').isDisabled(),true);await page.locator('#cb-target-list input').nth(0).check();await page.locator('#cb-target-list input').nth(1).check();await page.locator('.cb-bulk details > summary').click();assert.equal(await page.locator('#cb-samples .me-preview-stage').count(),3);assert.equal(await page.locator('#cb-samples .me-preview-stage:not([inert])').count(),0);assert.equal(await page.locator('#cb-samples video,#cb-samples audio,#cb-samples [id]').count(),0);assert.deepEqual((await snapshot(page)).state,before.state);await page.locator('#cb-apply').click();assert.equal(Object.keys((await snapshot(page)).state.backgrounds.slides).length,2);await page.locator('#we-settings-close').click();await page.locator('#fe-undo').click();assert.deepEqual((await snapshot(page)).state,before.state);
  await settings(page);await page.locator('#cb-scope').selectOption('section');assert.equal(await page.locator('#cb-section').isVisible(),true);const names=before.state.slides.filter(s=>s.group===before.state.slides[0].group).map(s=>s.title);for(const name of names.slice(0,8))assert((await page.locator('#cb-target-summary').textContent()).includes(name));await page.locator('#cb-cancel').click();assert.deepEqual((await snapshot(page)).state,before.state);assert.deepEqual(errors,[]);
 }finally{await page.close();}
});

test('Reset all requires confirmation, is undoable, and stale target reviews cannot commit',async()=>{
 const {page,errors}=await setup();try{await set(page,{kind:'solid',color:'#123456'});const configured=await snapshot(page);await settings(page);page.once('dialog',dialog=>dialog.dismiss());await page.locator('#cb-reset-all').click();assert.deepEqual((await snapshot(page)).state,configured.state);page.once('dialog',dialog=>dialog.accept());await page.locator('#cb-reset-all').click();assert.equal((await snapshot(page)).state.backgrounds,undefined);await page.locator('#we-settings-close').click();await page.locator('#fe-undo').click();assert.deepEqual((await snapshot(page)).state,configured.state);await settings(page);await page.locator('#cb-scope').selectOption('selected');await page.locator('#cb-source').selectOption('custom');await page.locator('#cb-kind').selectOption('solid');await page.locator('#cb-color').fill('#abcdef');await set(page,{kind:'solid',color:'#fedcba'});const newer=await snapshot(page);await page.locator('#cb-apply').click();assert.match(await page.locator('#cb-status').textContent(),/changed/);assert.deepEqual((await snapshot(page)).state,newer.state);assert.deepEqual(errors,[]);
 }finally{await page.close();}
});

test('presentation bulk replacement is explicit and missing targets cannot partially apply',async()=>{
 const {page,errors}=await setup();try{const ids=(await snapshot(page)).state.slides.map(s=>s.id);await set(page,{kind:'solid',color:'#123456'},'slide',ids[0]);const before=await snapshot(page);assert.equal((await operations(page,[{type:'background.bulk',slideId:ids[0],scope:'presentation',ids,config:{kind:'solid',color:'#abcdef'},replaceOverrides:false}])).ok,true);let state=(await snapshot(page)).state;assert.equal(state.backgrounds.defaults.color,'#abcdef');assert.equal(state.backgrounds.slides[ids[0]].color,'#123456');assert.equal((await operations(page,[{type:'background.bulk',slideId:ids[0],scope:'presentation',ids,config:{kind:'solid',color:'#fedcba'},replaceOverrides:true}])).ok,true);state=(await snapshot(page)).state;assert.equal(state.backgrounds.defaults.color,'#fedcba');assert.equal(Object.keys(state.backgrounds.slides).length,0);await page.locator('#fe-undo').click();assert.equal((await snapshot(page)).state.backgrounds.slides[ids[0]].color,'#123456');const current=await snapshot(page);assert.equal((await operations(page,[{type:'background.bulk',slideId:ids[0],scope:'slides',ids:[ids[0],'deleted-target'],config:{kind:'solid',color:'#000000'},replaceOverrides:true}])).ok,false);assert.deepEqual((await snapshot(page)).state,current.state);assert.equal(before.projectId,current.projectId);assert.deepEqual(errors,[]);}finally{await page.close();}
});
test('both coordinated looks invalidate an image decode already in flight',async()=>{const {page,errors}=await setup();try{await settings(page);await page.evaluate(()=>{const decode=HTMLImageElement.prototype.decode;HTMLImageElement.prototype.decode=function(){const image=this;return new Promise((resolve,reject)=>{window.__finishBackgroundDecode=()=>decode.call(image).then(resolve,reject);});};});for(const look of ['theme','horizon']){await page.locator('#cb-file').setInputFiles({name:'delayed.svg',mimeType:'image/svg+xml',buffer:Buffer.from(svg)});await page.waitForFunction(()=>!!window.__finishBackgroundDecode);await page.locator('#cb-look').selectOption(look);await page.locator('#cb-use-look').click();const kind=await page.locator('#cb-kind').inputValue(),before=await page.locator('#cb-preview').innerHTML();await page.evaluate(async()=>{await window.__finishBackgroundDecode();delete window.__finishBackgroundDecode;});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));assert.equal(await page.locator('#cb-kind').inputValue(),kind);assert.equal(await page.locator('#cb-preview').innerHTML(),before);}assert.deepEqual(errors,[]);}finally{await page.close();}});

test('background media coexistence warning survives every bulk scope',async()=>{const {page,errors}=await setup();try{await page.evaluate(()=>window.__cbTest.backgroundMedia());const before=await snapshot(page);await settings(page);for(const scope of ['slide','presentation','section','selected']){await page.locator('#cb-scope').selectOption(scope);assert.match(await page.locator('#cb-inheritance').textContent(),/background media.*may cover/);}assert.deepEqual((await snapshot(page)).state,before.state);assert.deepEqual(errors,[]);}finally{await page.close();}});
