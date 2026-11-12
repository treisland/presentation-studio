import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {openExample,snapshot,operations} from './collection-ui.mjs';
import {selectElement} from './ui.mjs';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']});
test.after(()=>browser.close());
const isOpen=(page,id)=>page.locator('#'+id).evaluate(node=>node.open);

test('disclosures retain independent type preferences without project or Undo mutations',async()=>{
 const {page,errors}=await openExample(browser,'template');try{
  const slideId=(await snapshot(page)).state.slides[0].id;
  const result=await operations(page,[{type:'block.create',slideId,kind:'text'},{type:'block.create',slideId,kind:'text'},{type:'block.create',slideId,kind:'quote'}]);
  const [a,b,widget]=result.created;await selectElement(page,a);await page.locator('#wp-tab-content').click();
  const before=await snapshot(page);
  await page.locator('#ids-fe-content-panel > summary').focus();await page.keyboard.press('Enter');
  assert.equal(await isOpen(page,'ids-fe-content-panel'),false);
  await page.locator('#ci-notes > summary').click();assert.equal(await isOpen(page,'ci-notes'),true);
  assert.equal(await isOpen(page,'ids-fe-content-panel'),false);
  await selectElement(page,b);await page.locator('#wp-tab-content').click();
  assert.equal(await isOpen(page,'ids-fe-content-panel'),false);
  await selectElement(page,widget);await page.locator('#wp-tab-content').click();
  assert.equal(await isOpen(page,'ids-component-widget-fields'),true);
  await page.locator('#ids-component-widget-fields > summary').click();
  await selectElement(page,a);await page.locator('#wp-tab-content').click();
  assert.equal(await isOpen(page,'ids-fe-content-panel'),false);
  await selectElement(page,widget);await page.locator('#wp-tab-content').click();
  assert.equal(await isOpen(page,'ids-component-widget-fields'),false);
  assert.equal(await isOpen(page,'ci-notes'),true);
  const after=await snapshot(page);assert.equal(after.revision,before.revision);assert.deepEqual(after.state,before.state);
  assert.deepEqual(errors,[]);
 }finally{await page.close();}
});

test('collapsed text retains pending edits and explicit slide navigation reveals its editor',async()=>{
 const {page,errors}=await openExample(browser,'template');try{
  const slideId=(await snapshot(page)).state.slides[0].id;
  const result=await operations(page,[{type:'block.create',slideId,kind:'text'}]);
  await selectElement(page,result.created[0]);await page.locator('#wp-tab-content').click();
  await page.locator('#fe-block-text').focus();await page.locator('#fe-block-text').fill('Retained through collapse');
  await page.locator('#ids-fe-content-panel > summary').click();
  assert.equal(await isOpen(page,'ids-fe-content-panel'),false);
  await page.locator('#ids-fe-content-panel > summary').click();
  assert.equal(await page.locator('#fe-block-text').inputValue(),'Retained through collapse');
  await page.locator('#fe-block-text').press('Tab');
  await page.locator('#ic-slide-settings').click();await page.locator('#ids-fe-content-panel > summary').click();
  assert.equal(await page.locator('#fe-slide-title').isVisible(),false);
  await selectElement(page,result.created[0]);await page.locator('#wp-tab-content').click();
  await page.locator('#ic-slide-settings').click();assert.equal(await page.locator('#fe-slide-title').isVisible(),true);
  assert.match(JSON.stringify((await snapshot(page)).state.slides[0].tree),/Retained through collapse/);
  assert.deepEqual(errors,[]);
 }finally{await page.close();}
});

test('media crop shortcut reveals its collapsed section and focuses numeric crop controls',async()=>{
 const {page,errors}=await openExample(browser,'template');try{
  await page.locator('#component-open').click();await page.locator('#component-search').fill('Circle frame');
  await page.getByRole('button',{name:'Insert Circle frame',exact:true}).click();
  await page.locator('#wp-tab-content').click();
  await page.locator('#ids-mask-panel > summary').click();
  assert.equal(await isOpen(page,'ids-mask-panel'),false);
  const before=await snapshot(page);
  await page.locator('#fe-preview .media-box').last().dblclick();
  assert.equal(await isOpen(page,'ids-mask-panel'),true);
  assert.equal(await page.evaluate(()=>document.activeElement.id),'mask-zoom');
  assert.equal((await snapshot(page)).revision,before.revision);
  assert.deepEqual(errors,[]);
 }finally{await page.close();}
});


test('text has one disclosure and shares the content scroller with notes and help',async()=>{
 const {page,errors}=await openExample(browser,'template');try{
  const slideId=(await snapshot(page)).state.slides[0].id;
  const made=await operations(page,[{type:'block.create',slideId,kind:'text'}]);
  await selectElement(page,made.created[0]);await page.locator('#wp-tab-content').click();
  assert.equal(await page.locator('#fe-block-text').isVisible(),true);
  assert.equal(await page.locator('#ic-text-editor > summary').count(),0);
  assert.equal(await page.locator('#fe-block-text').evaluate(node=>{let count=0;for(let p=node.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')count++;return count;}),1);
  await page.locator('#ci-notes > summary').click();await page.locator('#ids-keyboard-help > summary').click();
  for(const [width,height] of [[1366,768],[1024,600]]){
   await page.setViewportSize({width,height});
   const layout=await page.evaluate(()=>{const fields=document.getElementById('wp-fields');return {notes:fields.contains(document.getElementById('ci-notes')),help:fields.contains(document.getElementById('ids-keyboard-help')),overflow:['sg-guide','ci-notes'].map(id=>getComputedStyle(document.getElementById(id)).overflowY)};});
   assert.equal(layout.notes,true);assert.equal(layout.help,true);assert.deepEqual(layout.overflow,['visible','visible']);
  }
  await page.locator('#fe-block-text').fill('Direct text editor');await page.locator('#fe-block-text').press('Tab');
  assert.match(JSON.stringify((await snapshot(page)).state),/Direct text editor/);
  assert.deepEqual(errors,[]);
 }finally{await page.close();}
});
