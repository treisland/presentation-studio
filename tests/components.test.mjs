import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {readFile} from 'node:fs/promises';
import {openExample,snapshot,operations,exportZip,importZip} from './collection-ui.mjs';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']});
test.after(()=>browser.close());
const blockID=node=>node.attrs.class.match(/\bblock-[\w-]+\b/)?.[0];

test('free block text exposes the text formatting popover and retains editable content',async()=>{
  const {page,errors}=await openExample(browser,'portfolio-demo');
  try{
    await page.locator('#component-open').click();await page.getByRole('button',{name:'Insert Text',exact:true}).click();
    await page.locator('#fe-preview .db-text p').dblclick();
    await page.locator('#component-text-trigger').click();await page.locator('#tt-type').selectOption('h3');
    assert.equal(await page.locator('#fe-preview .db-text h3').textContent(),'Edit this text');
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
});

test('Library has compact fixed navigation, responsive cards and an accessible empty state',async()=>{
  const {page,errors}=await openExample(browser,'portfolio-demo');
  try{
    await page.locator('#component-open').click();
    assert.equal(await page.locator('#component-library-title').textContent(),'Add to slide');
    assert(await page.locator('#component-library-title').evaluate(element=>parseFloat(getComputedStyle(element).fontSize)<=28));
    assert.equal(await page.getByRole('button',{name:'Insert image or video…',exact:true}).count(),1);
    await page.getByRole('tab',{name:'My components',exact:true}).click();assert.match(await page.locator('.component-empty').textContent(),/Your reusable designs/);
    await page.getByRole('tab',{name:'Blocks',exact:true}).click();await page.locator('#component-search').fill('circle');assert.equal(await page.locator('#component-items article').count(),2);await page.getByRole('button',{name:'Clear search',exact:true}).click();
    for(const width of [1024,600,390]){await page.setViewportSize({width,height:768});assert.equal(await page.locator('#component-add').evaluate(element=>element.scrollWidth<=element.clientWidth+1),true);assert.equal(await page.locator('#component-add > footer').evaluate(element=>getComputedStyle(element).position),'static');}
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
});

test('context toolbar fits narrow panels, popovers stay on screen and Escape restores focus',async()=>{
  const {page,errors}=await openExample(browser,'portfolio-demo');
  try{
    await page.setViewportSize({width:1024,height:768});
    await page.locator('#component-open').click();await page.getByRole('tab',{name:'Widgets',exact:true}).click();await page.getByRole('button',{name:'Insert Metric card',exact:true}).click();
    assert.equal(await page.locator('#component-toolbar').evaluate(element=>element.scrollWidth<=element.clientWidth+1),true);
    await page.locator('#component-colors-trigger').click();
    const popup=page.locator('#component-colors-popover');assert.equal(await popup.evaluate(element=>element.matches(':popover-open')),true);
    const bounds=await popup.boundingBox();assert(bounds.x>=0&&bounds.x+bounds.width<=1024);
    await page.locator('#component-fill').focus();await page.locator('#component-fill').press('Escape');
    assert.equal(await popup.evaluate(element=>element.matches(':popover-open')),false);assert.equal(await page.locator('#component-colors-trigger').evaluate(element=>element===document.activeElement),true);
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
});

test('grouped image library transfer remaps media and preserves offline editable restoration',async()=>{
  const {page,errors}=await openExample(browser,'template');
  try {
    const initial=await snapshot(page),slideID=Object.keys(initial.state.media)[0];assert(slideID);
    await page.locator('.fe-slide-button[data-slide-id="'+slideID+'"]').click();
    assert.equal((await operations(page,[{type:'media.place',slideId:slideID,placement:{x:.5,y:.2,w:.3,h:.3}}])).ok,true);
    const created=await operations(page,[{type:'block.create',slideId:slideID,kind:'callout',placement:{x:.1,y:.2,w:.3,h:.3}}]);assert.equal(created.ok,true);
    assert.equal((await operations(page,[{type:'component.group',slideId:slideID,keys:[created.created[0],'media-primary']}])).ok,true);
    await page.locator('#wp-tab-layers').click();await page.locator('.sp-layer-row[data-key="'+created.created[0]+'"] button').first().click();
    await page.locator('#component-open').click();await page.locator('#component-name').fill('Card and image');await page.locator('#component-save').click();
    const downloadEvent=page.waitForEvent('download');await page.locator('#component-export').click();const bytes=await readFile(await(await downloadEvent).path());
    const library=JSON.parse(bytes);assert.equal(Object.keys(library.items[0].assets).length,1);
    const {page:clean,errors:cleanErrors}=await openExample(browser,'portfolio-demo');
    try {
      await clean.context().setOffline(true);await clean.locator('#component-open').click();await clean.locator('#component-import').setInputFiles({name:'library.json',mimeType:'application/json',buffer:bytes});await clean.getByRole('tab',{name:'My components',exact:true}).click();await clean.getByRole('button',{name:'Insert Card and image',exact:true}).click();
      const expected=await snapshot(clean),slide=expected.state.slides[0],media=expected.state.mediaObjects[slide.id].at(-1).media;assert.match(media.src,/assets\/component-/);assert.notEqual(media.src,initial.state.media[slideID].src);
      const restored=await importZip(browser,await exportZip(clean),expected.projectId);try{assert.deepEqual((await snapshot(restored)).state,expected.state);await restored.waitForFunction(()=>[...document.querySelectorAll('#fe-preview img')].every(image=>image.complete&&image.naturalWidth>0));}finally{await restored.close();}assert.deepEqual(cleanErrors,[]);
    }finally{await clean.close();}assert.deepEqual(errors,[]);
  }finally{await page.close();}
});

test('Add searches widgets, exposes editable fields and preserves portable content and Undo',async()=>{
  const {page,errors}=await openExample(browser,'portfolio-demo');
  try {
    await page.locator('#component-open').click();await page.getByRole('tab',{name:'Widgets',exact:true}).click();await page.locator('#component-search').fill('metric');
    assert.equal(await page.locator('#component-items article').count(),1);
    await page.getByRole('button',{name:'Insert Metric card',exact:true}).click();
    assert.equal(await page.locator('#fe-preview .component-metric').count(),1);
    const before=await snapshot(page),id=before.state.slides[0].id,block=before.state.slides[0].tree.find(node=>node.attrs?.class?.includes('component-metric'));
    assert.equal((await operations(page,[{type:'component.field',slideId:id,blockId:blockID(block),index:0,text:'87%'}])).ok,true);
    assert.equal(await page.locator('#fe-preview .component-metric h3').textContent(),'87%');
    const expected=await snapshot(page),restored=await importZip(browser,await exportZip(page),expected.projectId);
    try {assert.deepEqual((await snapshot(restored)).state,expected.state);} finally {await restored.close();}
    await page.locator('#fe-undo').click();assert.deepEqual((await snapshot(page)).state,before.state);
    assert.deepEqual(errors,[]);
  } finally {await page.close();}
});

test('groups move and resize atomically, reject nesting and locked members, and restore with Undo',async()=>{
  const {page,errors}=await openExample(browser,'portfolio-demo');
  try {
    const id=(await snapshot(page)).state.slides[0].id;
    const created=await operations(page,[{type:'block.create',slideId:id,kind:'text',placement:{x:.1,y:.1,w:.2,h:.2}},{type:'block.create',slideId:id,kind:'quote',placement:{x:.4,y:.1,w:.2,h:.2}}]);assert.equal(created.ok,true);
    const keys=created.created;assert.equal((await operations(page,[{type:'component.group',slideId:id,keys}])).ok,true);
    const before=await snapshot(page);
    assert.equal((await operations(page,[{type:'component.group',slideId:id,keys}])).ok,false);assert.deepEqual((await snapshot(page)).state,before.state);
    assert.equal((await operations(page,[{type:'block.place',slideId:id,blockId:keys[0],placement:{x:.2,y:.2,w:.2,h:.2}}])).ok,true);
    const moved=await snapshot(page);assert.match(moved.state.slides[0].tree.find(node=>blockID(node)===keys[1]).attrs.style,/left:50/);
    await page.locator('#fe-undo').click();assert.deepEqual((await snapshot(page)).state,before.state);
    assert.equal((await operations(page,[{type:'component.arrange',slideId:id,keys:[keys[0]],action:'center'}])).ok,true);
    const centered=await snapshot(page),position=key=>Number(centered.state.slides[0].tree.find(node=>blockID(node)===key).attrs.style.match(/left:([\d.]+)%/)[1]);assert(Math.abs(position(keys[1])-position(keys[0])-30)<.001);
    await page.locator('#fe-undo').click();assert.deepEqual((await snapshot(page)).state,before.state);
    assert.equal((await operations(page,[{type:'design.meta',slideId:id,keys:[keys[1]],changes:{locked:true}}])).ok,true);
    const locked=await snapshot(page);assert.equal((await operations(page,[{type:'component.arrange',slideId:id,keys:[keys[0]],action:'resize',scale:.8}])).code,'LOCKED');assert.deepEqual((await snapshot(page)).state,locked.state);
    assert.deepEqual(errors,[]);
  } finally {await page.close();}
});

test('library exports independent copies, imports in a clean profile, and recovers deleted presets',async()=>{
  const {page,errors}=await openExample(browser,'portfolio-demo');
  try {
    await page.locator('#component-open').click();await page.getByRole('tab',{name:'Widgets',exact:true}).click();await page.getByRole('button',{name:'Insert Quote',exact:true}).click();
    await page.locator('#component-open').click();await page.locator('#component-name').fill('Reusable quote');await page.locator('#component-save').click();
    await page.getByRole('tab',{name:'My components',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Insert Reusable quote',exact:true}).count(),1);
    const downloadEvent=page.waitForEvent('download');await page.locator('#component-export').click();const bytes=await readFile(await(await downloadEvent).path());
    await page.getByRole('button',{name:'Actions for Reusable quote',exact:true}).click();await page.getByRole('menuitem',{name:'Delete saved component',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Insert Reusable quote',exact:true}).count(),0);
    await page.locator('#component-restore').click();await page.getByRole('button',{name:'Insert Reusable quote',exact:true}).click();
    const copies=(await snapshot(page)).state.slides[0].tree.filter(node=>node.attrs?.class?.includes('component-quote'));assert.equal(copies.length,2);assert.notEqual(blockID(copies[0]),blockID(copies[1]));
    const {page:clean,errors:cleanErrors}=await openExample(browser,'portfolio-demo');
    try {await clean.locator('#component-open').click();await clean.locator('#component-import').setInputFiles({name:'library.json',mimeType:'application/json',buffer:bytes});await clean.getByRole('tab',{name:'My components',exact:true}).click();await clean.getByRole('button',{name:'Insert Reusable quote',exact:true}).click();assert.equal(await clean.locator('#fe-preview .component-quote').count(),1);assert.deepEqual(cleanErrors,[]);}finally{await clean.close();}
    assert.deepEqual(errors,[]);
  } finally {await page.close();}
});
