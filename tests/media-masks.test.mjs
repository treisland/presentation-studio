import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {openExample,snapshot,operations,exportZip,importZip} from './collection-ui.mjs';
import {click,selectTab} from './ui.mjs';
import vm from 'node:vm';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {archivePath} from './archive-path.mjs';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']});
test.after(()=>browser.close());
const zipContext={setImmediate,clearImmediate,setTimeout,clearTimeout,Uint8Array,ArrayBuffer,TextEncoder,TextDecoder};
vm.runInNewContext(await readFile('vendor/jszip-3.10.1.min.js','utf8'),zipContext);

test('Grid media masks preserve cell identity and reject locked parent edits',async()=>{
  const {page,errors}=await openExample(browser,'portfolio-demo');
  try{
    const initial=await snapshot(page),slideId=initial.state.slides[0].id;
    await page.locator('#fe-preview .media-box[data-object-id="primary"]').click();
    await page.locator('#mask-shape').selectOption('circle');await page.getByRole('button',{name:'Apply frame',exact:true}).click();
    assert.equal((await snapshot(page)).state.design.slides[slideId].objects['media-primary'].frame.shape,'circle');
    assert.match(await page.locator('#fe-preview .media-box[data-object-id="primary"] .media-viewport').evaluate(element=>element.style.clipPath),/^circle/);
    const grid=(await snapshot(page)).state.slides[0].tree.find(node=>node.attrs?.class?.includes('mg-grid')),key=grid.attrs.class.match(/layer-[\w-]+/)?.[0]||'node-'+initial.state.slides[0].tree.findIndex(node=>node.attrs?.class?.includes('mg-grid'));
    assert.equal((await operations(page,[{type:'design.meta',slideId,keys:[key],changes:{locked:true}}])).ok,true);
    assert.equal((await operations(page,[{type:'media.mask',slideId,keys:['media-primary'],frame:{shape:'oval',fit:'cover'}}])).code,'LOCKED');
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
});

test('Library frame controls stage one Undo step, respect locks and retain component settings',async()=>{
  const {page,errors}=await openExample(browser,'portfolio-demo');
  try{
    await page.locator('#component-open').click();await page.getByRole('button',{name:'Insert Rounded frame',exact:true}).click();
    const before=await snapshot(page),slideId=before.state.slides[0].id,key=Object.keys(before.state.design.slides[slideId].objects).find(key=>before.state.design.slides[slideId].objects[key].frame);
    assert.equal(await page.locator('#mask-panel').isVisible(),true);
    await page.locator('#mask-zoom').fill('175');await page.locator('#mask-zoom').press('Enter');
    assert.equal((await snapshot(page)).revision,before.revision);
    assert.equal(await page.locator('#fe-preview .mask-frame .media-asset').evaluate(element=>element.style.transform),'scale(1.75)');
    await page.locator('#mask-crop-mode').check();const bounds=await page.locator('#fe-preview .mask-frame').boundingBox();
    await page.mouse.move(bounds.x+bounds.width*.5,bounds.y+bounds.height*.5);await page.mouse.down();await page.mouse.move(bounds.x+bounds.width*.6,bounds.y+bounds.height*.5);await page.mouse.up();
    assert(Number(await page.locator('#mask-x').inputValue())<50);assert.equal((await snapshot(page)).revision,before.revision);
    const stagedX=await page.locator('#mask-x').inputValue();await page.mouse.move(bounds.x+bounds.width*.5,bounds.y+bounds.height*.5);await page.mouse.down();await page.mouse.move(bounds.x+bounds.width*.4,bounds.y+bounds.height*.5);await page.keyboard.press('Escape');await page.mouse.up();assert.equal(await page.locator('#mask-x').inputValue(),stagedX);
    await page.getByRole('button',{name:'Apply frame',exact:true}).click();
    assert.equal((await snapshot(page)).state.design.slides[slideId].objects[key].frame.zoom,175);
    await page.locator('#fe-undo').click();assert.equal((await snapshot(page)).state.design.slides[slideId].objects[key].frame.zoom,100);
    await page.locator('#component-open').click();await page.locator('#component-save-panel > summary').click();await page.locator('#component-name').fill('Reusable mask');await page.locator('#component-save').click();
    await page.getByRole('tab',{name:'My components',exact:true}).click();await page.getByRole('button',{name:'Insert Reusable mask',exact:true}).click();
    const copies=Object.entries((await snapshot(page)).state.design.slides[slideId].objects).filter(([,meta])=>meta.frame);assert.equal(copies.length,2);assert.notEqual(copies[0][0],copies[1][0]);assert.equal(copies[1][1].frame.shape,'rounded');
    assert.equal((await operations(page,[{type:'design.meta',slideId,keys:[key],changes:{locked:true}}])).ok,true);
    const locked=await snapshot(page);assert.equal((await operations(page,[{type:'media.mask',slideId,keys:[key],frame:{shape:'circle',fit:'cover'}}])).ok,false);
    assert.equal((await snapshot(page)).revision,locked.revision);
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
});

test('video replacement preserves mask, original assets and focus playback geometry',async()=>{
  const {page,errors}=await openExample(browser,'portfolio-demo');
  try{
    await page.locator('#component-open').click();await page.getByRole('button',{name:'Insert Oval frame',exact:true}).click();
    const initial=await snapshot(page),slideId=initial.state.slides[0].id,key=Object.keys(initial.state.design.slides[slideId].objects).find(key=>initial.state.design.slides[slideId].objects[key].frame),frame={shape:'oval',fit:'cover',zoom:160,x:35,y:65,radius:12,shadow:'soft'};
    await operations(page,[{type:'media.mask',slideId,keys:[key],frame}]);
    await page.locator('#ce-replace-file').setInputFiles(resolve('tests/fixtures/media/pattern.webm'));await page.locator('#fe-confirm-accept').click();
    assert.deepEqual((await snapshot(page)).state.design.slides[slideId].objects[key].frame,frame);
    await page.locator('#vb-preview-mode').click();const video=page.locator('#fe-preview .mask-frame video');
    await video.evaluate(async element=>{element.muted=true;await element.play();element.pause();});
    assert.equal(await video.evaluate(element=>element.style.transform),'scale(1.6)');
    await page.locator('#fe-preview .mask-frame .mf-expand').press('Enter');await page.locator('#media-focus video').waitFor();
    assert.equal(await page.locator('#media-focus video').evaluate(element=>element.style.transform),'none');
    await page.keyboard.press('Escape');await page.locator('#media-focus').waitFor({state:'detached'});
    assert.equal(await video.evaluate(element=>element.style.transform),'scale(1.6)');
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
});

test('standalone booth keeps masks and keyboard slide links offline and honors navigation permissions',async()=>{
  const {page,errors}=await openExample(browser,'portfolio-demo');
  try{
    const start=await snapshot(page),slideId=start.state.slides[0].id,target=start.state.slides[1].id;
    const result=await operations(page,[{type:'block.create',slideId,kind:'outline-button'}]),key=result.created[0];
    await operations(page,[{type:'navigation.set',slideId,keys:[key],action:{type:'slide',slideId:target}}]);
    await page.locator('#component-open').click();await page.getByRole('button',{name:'Insert Circle frame',exact:true}).click();
    await selectTab(page,'Presentation settings');await click(page,'#booth-open');await page.locator('#booth-password').fill('navigation-test-passphrase');await page.locator('#booth-confirm').fill('navigation-test-passphrase');await page.locator('#booth-navigation').check();
    const bytes=await exportZip(page,'#booth-export'),zip=await zipContext.JSZip.loadAsync(new Uint8Array(bytes)),folder=resolve('test-results/navigation-masks-booth');
    for(const [name,item]of Object.entries(zip.files)){if(item.dir)continue;const path=archivePath(folder,name);await mkdir(dirname(path),{recursive:true});await writeFile(path,Buffer.from(await item.async('uint8array')));}
    const restored=await browser.newPage();restored.on('pageerror',error=>errors.push(error.message));await restored.context().setOffline(true);
    try{
      await restored.goto('file://'+resolve(folder,'index.html'));
      assert.match(await restored.locator('.mask-frame .media-viewport').first().evaluate(element=>element.style.clipPath),/^circle\(/);
      const button=restored.locator('.slide.active .nav-button');await button.focus();await button.press('Enter');assert.equal(await restored.locator('.slide.active').getAttribute('id'),target);
      const html=(await readFile(resolve(folder,'index.html'),'utf8')).replace('"navigation":true','"navigation":false');await writeFile(resolve(folder,'restricted.html'),html);
      await restored.goto('file://'+resolve(folder,'restricted.html'));await restored.locator('.slide.active .nav-button').press('Enter');assert.equal(await restored.locator('.slide.active').getAttribute('id'),slideId);
    }finally{await restored.close();}
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
});

test('image masks share numeric controls and persist non-destructive crop settings',async()=>{
  const {page,errors}=await openExample(browser,'portfolio-demo');
  try{
    const state=(await snapshot(page)).state,slideId=state.slides[0].id;
    await page.locator('#db-add-media').evaluate(button=>button.click());
    await page.locator('#ce-file').setInputFiles({name:'original.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="320" height="180" fill="#286875"/></svg>')});
    await page.locator('#fe-preview .media-box').last().waitFor();
    const current=await snapshot(page),key=current.state.mediaObjects[slideId]?.length?'media-'+current.state.mediaObjects[slideId].at(-1).id:'media-primary';
    const frame={shape:'rounded',fit:'cover',zoom:160,x:25,y:70,radius:18};
    assert.equal((await operations(page,[{type:'media.mask',slideId,keys:[key],frame}])).ok,true);
    assert.equal((await operations(page,[{type:'media.mask',slideId,keys:[key],frame:{...frame,zoom:Infinity}}])).ok,false);
    assert.match(await page.locator('#fe-preview .mask-frame .media-asset').evaluate(element=>element.style.transform),/1.6/);
    assert.equal(await page.locator('#mask-zoom-range').count(),1);
    const bytes=await exportZip(page),restored=await importZip(browser,bytes,current.projectId);
    try{assert.deepEqual((await snapshot(restored)).state.design.slides[slideId].objects[key].frame,frame);}finally{await restored.close();}
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
});
