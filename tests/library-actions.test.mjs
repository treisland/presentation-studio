import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {openExample,snapshot,operations} from './collection-ui.mjs';
import {selectElement} from './ui.mjs';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']});
test.after(()=>browser.close());
async function saved(page){
 const id=(await snapshot(page)).state.slides[0].id;
 const result=await operations(page,[{type:'block.create',slideId:id,kind:'rectangle'}]);await selectElement(page,result.created[0]);
 await page.locator('#component-open').click();await page.locator('#component-name').fill('Reusable original');await page.locator('#component-save').click();await page.getByRole('tab',{name:'My components',exact:true}).click();
 return page.locator('#component-items article').first();
}
test('management is permanent, inline rename cancels and commits without changing placed objects',async()=>{
 const {page,errors}=await openExample(browser,'template');try{
  const card=await saved(page),before=await snapshot(page);
  for(const action of ['rename','duplicate','delete'])assert.equal(await card.locator(`[data-cl-action="${action}"]`).isVisible(),true);
  await card.locator('[data-cl-action=rename]').click();await card.getByRole('textbox',{name:'Component name',exact:true}).fill('Cancelled name');await card.getByRole('button',{name:'Cancel',exact:true}).click();
  assert.equal(await card.getByRole('heading').textContent(),'Reusable original');
  await card.locator('[data-cl-action=rename]').click();await card.getByRole('textbox',{name:'Component name',exact:true}).fill('A'.repeat(80));await card.getByRole('button',{name:'Save component name',exact:true}).click();
  assert.equal(await page.locator('#component-items h3').first().textContent(),'A'.repeat(80));
  assert.equal(await page.evaluate(()=>document.activeElement.dataset.clAction),'rename');
  assert.deepEqual((await snapshot(page)).state,before.state);assert.deepEqual(errors,[]);
 }finally{await page.close();}
});
test('duplicate, delete and restore preserve original saved and placed copies',async()=>{
 const {page,errors}=await openExample(browser,'template');try{
  const card=await saved(page),before=await snapshot(page);
  await card.locator('[data-cl-action=duplicate]').click();assert.equal(await page.locator('#component-items article').count(),2);
  const copy=page.locator('#component-items article').filter({has:page.getByRole('heading',{name:'Reusable original copy',exact:true})});
  await copy.locator('[data-cl-action=delete]').click();assert.equal(await page.locator('#component-items article').count(),1);
  await page.locator('#component-restore').click();assert.equal(await page.locator('#component-items article').count(),2);
  assert.equal(await page.locator('#component-export').isVisible(),true);assert.equal(await page.locator('#component-import').isVisible(),true);
  assert.deepEqual((await snapshot(page)).state,before.state);assert.deepEqual(errors,[]);
 }finally{await page.close();}
});
test('save explains unavailable selection and compact insertion retains the shared Undo action',async()=>{
 const {page,errors}=await openExample(browser,'template');try{
  await page.locator('#component-open').click();assert.equal(await page.locator('#component-save').isVisible(),true);assert.equal(await page.locator('#component-save').isDisabled(),true);assert.match(await page.locator('#cl-save-reason').textContent(),/Select unlocked/);
  const before=await snapshot(page);await page.getByRole('button',{name:'Insert Rectangle',exact:true}).click();
  assert.equal((await snapshot(page)).state.slides[0].tree.length,before.state.slides[0].tree.length+1);
  await page.locator('#fe-undo').click();assert.deepEqual((await snapshot(page)).state,before.state);assert.deepEqual(errors,[]);
 }finally{await page.close();}
});

test('card management fits a laptop and remains scrollable in a narrow dark Library',async()=>{
 const {page,errors}=await openExample(browser,'template');try{
  const card=await saved(page);
  const fits=await card.locator('.cl-card-actions').evaluate(node=>{const a=node.getBoundingClientRect(),b=document.getElementById('component-items').getBoundingClientRect();return a.bottom<=b.bottom&&a.top>=b.top;});assert.equal(fits,true);
  await page.setViewportSize({width:640,height:760});await page.evaluate(()=>document.body.classList.add('editor-dark'));
  for(const action of ['rename','duplicate','delete']){const button=card.locator('[data-cl-action="'+action+'"]');await button.scrollIntoViewIfNeeded();const box=await button.boundingBox();assert(box.y>=0&&box.y+box.height<=761);}
  assert.deepEqual(errors,[]);
 }finally{await page.close();}
});
