import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {openExample,snapshot,operations} from './collection-ui.mjs';
import {blockKinds,libraryBlock} from './canvas-library-fixture.mjs';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});test.after(()=>browser.close());
test('all block families select their own padding without entering text editing',async()=>{
 const {page,errors}=await openExample(browser,'portfolio-demo');try{
  for(const kind of blockKinds){const {key}=await libraryBlock(page,kind);const before=await snapshot(page);
   const box=await page.locator('#fe-preview .'+key).boundingBox();await page.locator('#fe-preview .'+key).click({position:{x:kind==='circle'?box.width/2:8,y:8}});
   assert.equal(await page.locator('#fe-preview .'+key).getAttribute('data-sp-selected'),'true',kind);
   assert.equal(await page.locator('#fe-preview [contenteditable=true]').count(),0,kind);
   assert.deepEqual((await snapshot(page)).state,before.state);
  }assert.deepEqual(errors,[]);
 }finally{await page.close();}
});
test('overlap chooser previews and selects an underlying object without changing geometry',async()=>{
 const {page,errors}=await openExample(browser,'portfolio-demo');try{
  const {slideId,key}=await libraryBlock(page,'rectangle');const made=await operations(page,[{type:'block.create',slideId,kind:'text',placement:{x:.2,y:.3,w:.3,h:.3}}]);
  const top=made.created[0],before=await snapshot(page);await page.locator('#fe-preview .'+top).click({button:'right',position:{x:10,y:10}});
  await page.getByRole('menuitem',{name:'Select underneath',exact:false}).click();
  const choice=page.locator('#cm-menu [role=menuitem]').filter({hasText:/Rectangle/});await choice.focus();
  assert.equal(await page.locator('#fe-preview .'+key).evaluate(el=>el.classList.contains('canvas-hover')),true);
  await choice.press('Enter');assert.equal(await page.locator('#fe-preview .'+key).getAttribute('data-sp-selected'),'true');
  assert.deepEqual((await snapshot(page)).state,before.state);assert.deepEqual(errors,[]);
 }finally{await page.close();}
});


test('selection alignment uses shared bounds, preserves group spacing, and rejects a single unit',async()=>{
 const {page,errors}=await openExample(browser,'portfolio-demo');try{
  const {slideId,key}=await libraryBlock(page,'rectangle');
  const made=await operations(page,[{type:'block.create',slideId,kind:'text',placement:{x:.6,y:.5,w:.2,h:.2}},{type:'block.create',slideId,kind:'text',placement:{x:.3,y:.4,w:.1,h:.1}}]);const [other,member]=made.created;
  assert.equal((await operations(page,[{type:'component.group',slideId,keys:[key,member]}])).ok,true);
  const before=await snapshot(page);
  const rejected=await operations(page,[{type:'component.arrange',slideId,keys:[key],action:'left',alignTo:'selection'}]);assert.equal(rejected.ok,false);assert.deepEqual((await snapshot(page)).state,before.state);
  const result=await operations(page,[{type:'component.arrange',slideId,keys:[key,other],action:'left',alignTo:'selection'}]);assert.equal(result.ok,true,result.message);
  const left=await page.locator('#fe-preview .'+other).evaluate(el=>parseFloat(el.style.left));assert.equal(left,20);
  assert.equal(await page.locator('#fe-preview .'+member).evaluate(el=>parseFloat(el.style.left)),30);
  await page.locator('#fe-undo').click();assert.deepEqual((await snapshot(page)).state,before.state);
  assert.deepEqual(errors,[]);
 }finally{await page.close();}
});


test('template text remains a real pointer target above floating media',async()=>{
 const {page,errors}=await openExample(browser,'template');try{
  await page.locator('#ce-zone').selectOption('floating',{force:true});await page.locator('#ce-file').setInputFiles({name:'neutral.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="320" height="180" fill="#286875"/></svg>')});
  const text=page.locator('#fe-preview .media-original [data-vb-kind=text]').first();await text.click();assert.equal(await text.getAttribute('contenteditable'),'true');assert.deepEqual(errors,[]);
 }finally{await page.close();}
});


test('Layers checkboxes retarget Inspector even when starting from slide settings',async()=>{
 const {page,errors}=await openExample(browser,'portfolio-demo');try{
  const {slideId,key}=await libraryBlock(page,'rectangle');const result=await operations(page,[{type:'block.create',slideId,kind:'text'}]);
  await page.locator('#ld-reveal-layers').click();for(const id of [key,result.created[0]])await page.locator('.sp-layer-row[data-key="'+id+'"] input[type=checkbox]').check();
  assert.match(await page.locator('#wp-selection-title').textContent(),/Multiple objects/);assert.deepEqual(errors,[]);
 }finally{await page.close();}
});
