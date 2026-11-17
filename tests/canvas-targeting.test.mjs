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
  const choice=page.locator('#cm-menu [role=menuitem]').filter({hasText:'Shape'});await choice.focus();
  assert.equal(await page.locator('#fe-preview .'+key).evaluate(el=>el.classList.contains('canvas-hover')),true);
  await choice.press('Enter');assert.equal(await page.locator('#fe-preview .'+key).getAttribute('data-sp-selected'),'true');
  assert.deepEqual((await snapshot(page)).state,before.state);assert.deepEqual(errors,[]);
 }finally{await page.close();}
});
