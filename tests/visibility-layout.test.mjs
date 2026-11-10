import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {resolve,dirname} from 'node:path';
import {mkdir,writeFile} from 'node:fs/promises';
import {openExample,snapshot,operations,exportZip} from './collection-ui.mjs';
import {reveal,addSlide,selectTab} from './ui.mjs';
import {archivePath} from './archive-path.mjs';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']});
test.after(()=>browser.close());
const active=page=>page.locator('#fe-preview .slide').getAttribute('data-media-id');
async function bounds(page,scope='#fe-preview .slide') {
  return page.locator(scope).evaluate(slide=>{
    const base=slide.getBoundingClientRect();
    return Object.fromEntries([...slide.querySelectorAll('[data-sp-key]')].map(el=>{const b=el.getBoundingClientRect();return[el.dataset.spKey,{x:(b.x-base.x)/base.width,y:(b.y-base.y)/base.height,width:b.width/base.width,height:b.height/base.height}];}));
  });
}
function unchanged(before,after,except=[]){for(const [key,box]of Object.entries(before)){if(except.includes(key))continue;assert(after[key],'Missing neighbor '+key);for(const axis of box.width||box.height?['x','y','width','height']:['width','height'])assert(Math.abs(box[axis]-after[key][axis])<.0015,key+' '+axis+' moved: '+JSON.stringify({before:box,after:after[key]}));}}
async function hide(page,slideId,key,visible=false){const result=await operations(page,[{type:'visibility.element',slideId,keys:[key],visible}]);assert.equal(result.ok,true,JSON.stringify(result));}

test('default and newly generated template roots hide without reflow, and Show/Undo restore visibility',async()=>{
  const {page,errors}=await openExample(browser,'template');try{
    for(const template of [null,'comparison','workflow']){
      if(template){await page.locator('#ld-tab-slides').click();await addSlide(page,template);}
      const slideId=await active(page),before=await snapshot(page),boxes=await bounds(page),keys=Object.keys(boxes);
      assert(keys.length>1,'Template needs visible neighbors');
      const key=keys[0];await hide(page,slideId,key);
      unchanged(boxes,await bounds(page),[key]);
      const concealed=page.locator('#fe-preview .sp-hidden').first();
      assert.equal(await concealed.isVisible(),false);
      assert((await concealed.boundingBox()).width>0,'Hidden root keeps its layout box');
      const stableKey=await concealed.getAttribute('data-sp-key');
      const stageTarget=page.locator('#stage .slide[data-media-id="'+slideId+'"] [data-sp-key="'+stableKey+'"]');
      assert.equal(await stageTarget.count(),1,'Player resolves the same stable root outside editor');
      assert.equal(await stageTarget.evaluate(el=>getComputedStyle(el).visibility),'hidden');
      await reveal(page,'#visibility-show-hidden');await page.locator('#visibility-show-hidden').check();
      assert.equal(await concealed.isVisible(),true);unchanged(boxes,await bounds(page),[key]);
      await page.locator('#visibility-show-hidden').uncheck();
      await hide(page,slideId,stableKey,true);assert.equal(await page.locator('#fe-preview [data-sp-key="'+stableKey+'"]').isVisible(),true);
      await page.locator('#fe-undo').click();assert.equal(await page.locator('#fe-preview .sp-hidden').first().isVisible(),false);
      await page.locator('#fe-undo').click();assert.deepEqual((await snapshot(page)).state,before.state);unchanged(boxes,await bounds(page));
    }
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
});

test('hidden primary media retains layout enums, root IDs and offline text geometry without retaining its filename or bytes',async()=>{
  const {page,errors}=await openExample(browser,'template');try{
    const slideId=await active(page),filename='private-primary-visibility.svg';
    await reveal(page,'#ce-zone');await page.locator('#ce-zone').selectOption('right');
    await page.locator('#ce-file').setInputFiles({name:filename,mimeType:'image/svg+xml',buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="320" height="180" fill="#264875"/></svg>')});
    const sourceBytes=await exportZip(page);
    const original=await page.evaluate(async bytes=>{const zip=await JSZip.loadAsync(new Uint8Array(bytes));return JSON.parse(await zip.file('presentation.json').async('string'));},[...sourceBytes]);
    const hiddenPath=original.state.media[slideId].src;
    for(const [layout,ratio,free]of [['right','equal',false],['right','media',false],['left','text',false],['below','text',false],['full','equal',false],['background','media',false],['inset','equal',false],['right','text',true]]){
      const pack=structuredClone(original),cfg=pack.state.media[slideId];cfg.layout=layout;cfg.ratio=ratio;cfg.corner='left top';
      pack.state.projectName='Visibility '+layout+' '+ratio+' '+free;
      if(free)cfg.canvas.placement={x:.6,y:.1,w:.3,h:.4};
      await page.locator('#fe-import-file').setInputFiles({name:'layout.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(pack))});
      await page.waitForFunction(name=>document.querySelector('#fe-confirm').open||window.presentationStudioEditing.read().state.projectName===name,pack.state.projectName);
      if(await page.locator('#fe-confirm').evaluate(node=>node.open))await page.locator('#fe-confirm-accept').click();
      await page.waitForFunction(name=>window.presentationStudioEditing.read().state.projectName===name,pack.state.projectName);
      const before=await bounds(page);await hide(page,slideId,'media-primary');
      unchanged(before,await bounds(page));
      const expected=await bounds(page),bytes=await exportZip(page,'#fe-playback');
      const files=await page.evaluate(async bytes=>{const zip=await JSZip.loadAsync(new Uint8Array(bytes)),files=[];for(const file of Object.values(zip.files))if(!file.dir)files.push([file.name,[...await file.async('uint8array')]]);return files;},[...bytes]);
      const json=Buffer.from(files.find(([name])=>name==='presentation.json')[1]).toString(),playbackPack=JSON.parse(json);
      assert.equal(playbackPack.state.media[slideId],undefined);
      assert(!json.includes(filename));assert(!json.includes(hiddenPath));assert(!files.some(([name])=>name===hiddenPath));
      const model=playbackPack.state.slides.find(slide=>slide.id===slideId);
      assert(model.classes.includes('visibility-layout-'+layout));assert(model.classes.includes('visibility-ratio-'+ratio));
      assert.deepEqual(model.tree,pack.state.slides.find(slide=>slide.id===slideId).tree,'Surviving root model and IDs remain unchanged');
      const folder=resolve('test-results/visibility-layout/primary-'+layout+'-'+ratio+(free?'-free':''));await mkdir(folder,{recursive:true});
      for(const [name,data]of files){
        const target=archivePath(folder,name);await mkdir(dirname(target),{recursive:true});
        await writeFile(target,Buffer.from(data));
      }
      const playback=await browser.newPage();try{
        await playback.context().setOffline(true);await playback.goto('file://'+resolve(folder,'index.html'));
        await playback.waitForFunction(id=>document.querySelector('#stage .slide.active')?.dataset.mediaId===id,slideId);
        unchanged(expected,await bounds(playback,'#stage .slide.active'),['media-primary']);
        const stage=playback.locator('#stage .slide.active');
        assert.equal(await stage.locator('.media-original').count(),1);assert.equal(await stage.locator('.media-box').count(),0);
        // Public navigation repeats rendering; reload repeats theme application.
        for(let i=0;i<2;i++){
          await playback.keyboard.press('ArrowRight');await playback.keyboard.press('ArrowLeft');
          assert.equal(await stage.locator('.media-original').count(),1);
          unchanged(expected,await bounds(playback,'#stage .slide.active'),['media-primary']);
          await playback.reload();
          await playback.waitForFunction(id=>document.querySelector('#stage .slide.active')?.dataset.mediaId===id,slideId);
          assert.equal(await stage.locator('.media-original').count(),1);
        }
      }finally{await playback.close();}
      if(layout==='right'&&ratio==='media'){
        const textBounds=(p,selector)=>p.locator(selector).evaluate(slide=>{const base=slide.getBoundingClientRect();return Object.fromEntries(['h1','.lead'].map(selector=>{const box=slide.querySelector(selector).getBoundingClientRect();return[selector,{x:(box.x-base.x)/base.width,y:(box.y-base.y)/base.height,width:box.width/base.width,height:box.height/base.height}];}));});
        const text=await textBounds(page,'#fe-preview .slide');
        await selectTab(page,'Presentation settings');await page.locator('#booth-open').click();
        await page.locator('#booth-password').fill('visibility-review-password');await page.locator('#booth-confirm').fill('visibility-review-password');await page.locator('#booth-loop').selectOption('studio-main');
        const boothBytes=await exportZip(page,'#booth-export');
        const html=await page.evaluate(async bytes=>{const zip=await JSZip.loadAsync(new Uint8Array(bytes));return zip.file('index.html').async('string');},[...boothBytes]);
        assert(!html.includes(filename));assert(!html.includes(hiddenPath));
        const boothFile=resolve(folder,'booth.html');await writeFile(boothFile,html);
        const booth=await browser.newPage();booth.on('pageerror',error=>errors.push(error.message));try{
          await booth.context().setOffline(true);await booth.goto('file://'+boothFile);
          unchanged(text,await textBounds(booth,'#stage .slide.active'));
          assert.equal(await booth.locator('.slide.active .media-original').count(),1);assert.equal(await booth.locator('.slide.active .media-box').count(),0);
        }finally{await booth.close();}
        await page.locator('#booth-close').click();await page.locator('#we-settings-close').click();
      }
    }
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
});

test('customized nested text/cards and Library copies hide despite template display rules',async()=>{
  const {page,errors}=await openExample(browser,'template');try{
    const slideId=await active(page);
    for(const selector of ['h1','.card']){
      await page.locator('#fe-preview '+selector).first().click();await reveal(page,'#tp-customize');await page.locator('#tp-customize').click();
      const custom=page.locator('#fe-preview .db-template').last(),key=await custom.getAttribute('data-sp-key'),boxes=await bounds(page);
      await hide(page,slideId,key);assert.equal(await page.locator('#fe-preview [data-sp-key="'+key+'"]').isVisible(),false);
      unchanged(boxes,await bounds(page));
      await hide(page,slideId,key,true);
      // Save and reinsert the actual template-derived object through the public Library UI.
      await page.locator('#wp-tab-layers').click();await page.locator('#sp-layers [data-key="'+key+'"] button').first().click();
      await page.locator('#component-open').click();
      if(!await page.locator('#component-save-panel').evaluate(el=>el.open))await page.locator('#component-save-panel > summary').click();
      const name=selector==='h1'?'Template title':'Template card';
      await page.locator('#component-name').fill(name);await page.locator('#component-save').click();
      await page.getByRole('tab',{name:'My components',exact:true}).click();await page.getByRole('button',{name:'Insert '+name,exact:true}).click();
      const copies=(await snapshot(page)).state.slides.find(slide=>slide.id===slideId).tree.filter(node=>node.attrs?.class?.includes('db-template'));
      const copyKey=copies.at(-1).attrs.class.match(/\bblock-[\w-]+/)[0];assert.notEqual(copyKey,key);
      await hide(page,slideId,copyKey);assert.equal(await page.locator('#fe-preview .'+copyKey).isVisible(),false);
      await hide(page,slideId,copyKey,true);assert.equal(await page.locator('#fe-preview .'+copyKey).isVisible(),true);
    }
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
});

test('playback omits hidden text/identities while empty spacers preserve surviving geometry offline',async()=>{
  const {page,errors}=await openExample(browser,'template');try{
    const slideId=await active(page),before=await bounds(page),key=Object.keys(before)[0];
    const secret=await page.locator('#fe-preview [data-sp-key="'+key+'"]').textContent();await hide(page,slideId,key);
    const hiddenKey=await page.locator('#fe-preview .sp-hidden').first().getAttribute('data-sp-key');
    const inactive=(await snapshot(page)).state.slides.find(slide=>slide.id!==slideId&&slide.tree.some(node=>node.tag));
    const inactiveIndex=inactive.tree.findIndex(node=>node.tag);
    await hide(page,inactive.id,'node-'+inactiveIndex);
    const expected=await bounds(page),bytes=await exportZip(page,'#fe-playback');
    const files=await page.evaluate(async bytes=>{const zip=await JSZip.loadAsync(new Uint8Array(bytes)),result=[];for(const file of Object.values(zip.files))if(!file.dir)result.push([file.name,[...await file.async('uint8array')]]);return result;},[...bytes]);
    const pack=JSON.parse(Buffer.from(files.find(([name])=>name==='presentation.json')[1]).toString());
    const tree=pack.state.slides.find(slide=>slide.id===slideId).tree;
    assert(!JSON.stringify(tree).includes(hiddenKey));assert(!JSON.stringify(tree).includes(secret));
    assert(tree.some(node=>node.attrs?.class?.includes('tp-placeholder')),'Empty layout spacer retained');
    const inactiveTree=pack.state.slides.find(slide=>slide.id===inactive.id).tree;
    const inactiveSpacer=inactiveTree.find(node=>node.attrs?.class?.includes('tp-placeholder'));
    assert(inactiveSpacer,'Inactive slide keeps a spacer');
    assert(Number(inactiveSpacer.attrs.class.match(/\btp-w-(\d+)/)[1])>0,'Inactive width measured');
    assert(Number(inactiveSpacer.attrs.class.match(/\btp-h-(\d+)/)[1])>0,'Inactive height measured');
    const folder=resolve('test-results/visibility-layout/playback');await mkdir(folder,{recursive:true});
    for(const [name,data]of files){const target=archivePath(folder,name);await mkdir(dirname(target),{recursive:true});await writeFile(target,Buffer.from(data));}
    const playback=await browser.newPage();try{
      await playback.context().setOffline(true);await playback.goto('file://'+resolve(folder,'index.html'));
      await playback.waitForFunction(id=>document.querySelector('#stage .slide.active')?.dataset.mediaId===id,slideId);
      unchanged(expected,await bounds(playback,'#stage .slide.active'),[hiddenKey]);
      assert.equal(await playback.locator('#stage .tp-placeholder').first().isVisible(),false);
    }finally{await playback.close();}
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
});
