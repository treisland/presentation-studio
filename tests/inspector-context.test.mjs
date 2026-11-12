import {inspectContent} from './ui.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {openExample,snapshot,operations,exportZip,importZip} from './collection-ui.mjs';
import {reveal} from './ui.mjs';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']});
test.after(()=>browser.close());
async function selectLayer(page,key){
 await page.locator('#wp-tab-layers').click();
 await page.locator('#sp-layers [data-key="'+key+'"] button').first().click();
 await page.locator('#wp-tab-content').click();
}
test('selecting text and code exposes only relevant content and keeps pending text edits',async()=>{
 const {page,errors}=await openExample(browser,'portfolio-demo');try{
  const id=(await snapshot(page)).state.slides[0].id;
  const code=await operations(page,[{type:'code.update',slideId:id,commands:{shared:'python app.py',variants:[],initial:'shared'}}]);
  const text=await operations(page,[{type:'block.create',slideId:id,kind:'text'}]);
  await selectLayer(page,code.created[0]);assert.equal(await page.locator('#code-panel').isVisible(),true);assert.equal(await page.locator('#fe-content-panel').isVisible(),false);
  await selectLayer(page,text.created[0]);assert.equal(await page.locator('#code-panel').isVisible(),false);assert.equal(await page.locator('#ic-text-hint').isVisible(),true);
  assert.equal(await page.locator('#fe-block-text').isVisible(),true);
  await page.locator('#fe-block-text').focus();await page.locator('#fe-block-text').fill('Independent free text');
  await selectLayer(page,code.created[0]);
  assert.equal(await page.locator('#code-text').inputValue(),'python app.py');
  await selectLayer(page,text.created[0]);assert.equal(await page.locator('#fe-block-text').isVisible(),true);
  assert.equal(await page.locator('#fe-block-text').inputValue(),'Independent free text');
  const activeBefore=await page.locator('#fe-block-text').evaluate(el=>{el.focus();return document.activeElement.id;});
  await page.locator('#fe-block-text').fill('Another edit');await page.waitForTimeout(400);
  assert.equal(await page.evaluate(()=>document.activeElement.id),activeBefore);assert.equal(await page.locator('#fe-block-text').isVisible(),true);
  assert.deepEqual(errors,[]);
 }finally{await page.close();}
});
test('widget and multiple selection suppress unrelated editors; slide and notes stay reachable',async()=>{
 const {page,errors}=await openExample(browser,'portfolio-demo');try{
  const id=(await snapshot(page)).state.slides[0].id,result=await operations(page,[{type:'block.create',slideId:id,kind:'quote'},{type:'block.create',slideId:id,kind:'text'}]);
  await selectLayer(page,result.created[0]);assert.equal(await page.locator('#component-widget-fields textarea').count(),2);assert.equal(await page.locator('#component-widget-fields').isVisible(),true);assert.equal(await page.locator('#ic-text-editor').isVisible(),false);
  await page.locator('#wp-tab-layers').click();await page.locator('#sp-layers [data-key="'+result.created[1]+'"] input[type=checkbox]').check();await page.locator('#wp-tab-content').click();
  assert.match(await page.locator('#wp-selection-title').textContent(),/Multiple/);assert.equal(await page.locator('#component-widget-fields').isVisible(),false);assert.equal(await page.locator('#ic-content-hint').isVisible(),true);
  await inspectContent(page,'Slide');assert.equal(await page.locator('#fe-slide-title').isVisible(),true);assert.equal(await page.locator('#sp-clear').isVisible(),true);
  await page.locator('#ci-notes > summary').click();assert.equal(await page.locator('#fe-notes-text').isVisible(),true);assert.equal(await page.locator('#fe-slide-title').isVisible(),true);
  await selectLayer(page,result.created[0]);assert.equal(await page.locator('#fe-notes-panel').isVisible(),true);assert.equal(await page.locator('#component-widget-fields').isVisible(),true);assert.deepEqual(errors,[]);
 }finally{await page.close();}
});
test('table selection, nested cell identity, locks and deletion clear stale controls',async()=>{
 const {page,errors}=await openExample(browser,'portfolio-demo');try{
  const id=(await snapshot(page)).state.slides[0].id,result=await operations(page,[{type:'table.insert',slideId:id,rows:2,columns:2,header:true}]),key=result.created[0];
  await selectLayer(page,key);assert.equal(await page.locator('#fe-table-panel').isVisible(),true);assert.equal(await page.locator('#code-panel').isVisible(),false);
  await page.locator('#fe-preview .'+key+' td').first().click();assert.match(await page.locator('#wp-selection-detail').textContent(),/Row.*Column/);
  await page.keyboard.press('Escape');
  await operations(page,[{type:'design.meta',slideId:id,keys:[key],changes:{locked:true}}]);await selectLayer(page,key);
  assert.match(await page.locator('#wp-selection-status').textContent(),/Locked/);
  assert.equal((await operations(page,[{type:'design.meta',slideId:id,keys:[key],changes:{locked:false}}])).ok,true);
  const removed=await operations(page,[{type:'block.remove',slideId:id,blockId:key}]);assert.equal(removed.ok,true,JSON.stringify(removed));
  assert.equal(await page.locator('#fe-table-panel').isVisible(),false,await page.locator('#we-inspector').getAttribute('data-ic-kind')+' '+await page.locator('#wp-selection-detail').textContent());
  await page.locator('#fe-undo').click();await selectLayer(page,key);assert.equal(await page.locator('#fe-table-panel').isVisible(),true);assert.deepEqual(errors,[]);
 }finally{await page.close();}
});
test('collapsed Inspector preserves text alternative, tab and selection when reopened',async()=>{
 const {page,errors}=await openExample(browser,'portfolio-demo');try{
  const id=(await snapshot(page)).state.slides[0].id,result=await operations(page,[{type:'block.create',slideId:id,kind:'text'}]);await selectLayer(page,result.created[0]);
  await page.locator('#fe-block-text').focus();await page.locator('#fe-block-text').fill('Keep this selection');
  await page.locator('#we-toggle-inspector').click();await page.locator('#we-toggle-inspector').click();
  assert.equal(await page.locator('#fe-block-text').isVisible(),true);assert.equal(await page.locator('#fe-block-text').inputValue(),'Keep this selection');
  await reveal(page,'#ce-slide-lock');await page.locator('#ce-slide-lock').click();await page.locator('#wp-tab-content').click();assert.equal(await page.locator('#fe-block-text').isDisabled(),true);assert.deepEqual(errors,[]);
 }finally{await page.close();}
});

test('group member inspection edits the chosen widget without ungrouping or stale text targets',async()=>{
 const {page,errors}=await openExample(browser,'portfolio-demo');try{
  const id=(await snapshot(page)).state.slides[0].id,result=await operations(page,[{type:'block.create',slideId:id,kind:'quote'},{type:'block.create',slideId:id,kind:'text'}]),keys=result.created;
  assert.equal((await operations(page,[{type:'component.group',slideId:id,keys}])).ok,true);
  await selectLayer(page,keys[0]);assert.equal(await page.locator('#wp-selection-title').textContent(),'Group');
  await page.locator('#ic-member').selectOption(keys[0]);assert.equal(await page.locator('#component-widget-fields').isVisible(),true);
  await page.locator('#component-widget-fields textarea').first().fill('A grouped quotation');await page.locator('#component-widget-fields textarea').first().press('Tab');
  const before=await snapshot(page);assert.equal(before.state.design.slides[id].objects[keys[0]].group,before.state.design.slides[id].objects[keys[1]].group);
  await page.locator('#ic-member').selectOption(keys[1]);await page.locator('#fe-block-text').focus();await page.locator('#fe-block-text').fill('Independent grouped text');await page.locator('#fe-block-text').press('Tab');
  const state=(await snapshot(page)).state,quote=state.slides[0].tree.find(node=>node.attrs?.class?.includes(keys[0]));assert.equal(quote.children[0].children[0].text,'A grouped quotation');assert.deepEqual(errors,[]);
 }finally{await page.close();}
});

test('demo heading duplicates independently, deletes without renaming the slide, and survives recovery/export',async()=>{
 const {page,errors}=await openExample(browser,'template');try{
  await page.locator('.fe-slide-button[data-slide-id="studio-closing"]').click();
  const initial=await snapshot(page),original=initial.state.slides.find(slide=>slide.id==='studio-closing'),title=original.title;
  await page.locator('#fe-preview h1').click();assert.equal(await page.locator('#vb-duplicate').isEnabled(),true);assert.equal(await page.locator('#vb-delete').isEnabled(),true);
  assert.equal(await page.locator('#wp-selection-detail').textContent(),'Make it yours.');
  await page.locator('#vb-duplicate').click();const copy=page.locator('#fe-preview h1.editor-body');assert.equal(await copy.count(),1);
  assert.doesNotMatch(await copy.getAttribute('class'),/editor-title|lc-slot-/);
  await copy.click();await copy.fill('An independent copy');await page.waitForTimeout(400);
  assert.equal((await snapshot(page)).state.slides.find(slide=>slide.id===original.id).title,title);
  await page.locator('#fe-preview h1:not(.editor-body)').click();const beforeDelete=await snapshot(page);await page.locator('#vb-delete').click();
  let state=(await snapshot(page)).state,slide=state.slides.find(slide=>slide.id===original.id);assert.equal(slide.title,title);assert.equal(slide.id,original.id);assert.equal(await copy.textContent(),'An independent copy');assert.match(slide.classes,/editor-title-removed/);
  const removed=await snapshot(page),restored=await importZip(browser,await exportZip(page),removed.projectId);try{assert.deepEqual((await snapshot(restored)).state,removed.state);}finally{await restored.close();}
  const playback=await page.evaluate(async bytes=>{const zip=await JSZip.loadAsync(new Uint8Array(bytes));return JSON.parse(await zip.file('presentation.json').async('string'));},[...await exportZip(page,'#fe-playback')]);assert.equal(playback.state.slides.find(slide=>slide.id===original.id).title,title);
  await inspectContent(page,'Slide');await page.locator('#fe-slide-title').fill('A new navigation name');await page.locator('#fe-slide-title').press('Tab');await page.waitForTimeout(400);assert.equal(await copy.textContent(),'An independent copy');
  await page.locator('#fe-undo').click();assert.deepEqual((await snapshot(page)).state,removed.state);await page.locator('#fe-undo').click();assert.deepEqual((await snapshot(page)).state,beforeDelete.state);
  assert.equal(await page.locator('#fe-preview h1:not(.editor-body)').textContent(),'Make it yours.');assert.deepEqual(errors,[]);
 }finally{await page.close();}
});

test('Inspector edits the selected primary heading instead of its eyebrow, with correct title synchronization',async()=>{
 const {page,errors}=await openExample(browser,'template');try{
  await page.locator('.fe-slide-button[data-slide-id="studio-closing"]').click();const before=await snapshot(page),eyebrow=await page.locator('#fe-preview .eyebrow').textContent();
  await page.locator('#fe-preview h1').click();await page.locator('#fe-block-text').focus();assert.equal(await page.locator('#fe-block-text').inputValue(),'Make it yours.');
  await page.locator('#fe-block-text').fill('The heading I selected');await page.waitForTimeout(400);await page.locator('#fe-block-text').fill('Still the selected heading');await page.locator('#fe-block-text').press('Tab');await page.waitForTimeout(400);
  assert.equal(await page.locator('#fe-preview h1').textContent(),'Still the selected heading');assert.equal(await page.locator('#fe-preview .eyebrow').textContent(),eyebrow);assert.equal((await snapshot(page)).state.slides.find(slide=>slide.id==='studio-closing').title,'Still the selected heading');
  await page.locator('#fe-undo').click();await page.locator('#fe-undo').click();assert.deepEqual((await snapshot(page)).state,before.state);assert.deepEqual(errors,[]);
 }finally{await page.close();}
});

test('template headings retain lock protection for duplicate and delete',async()=>{
 const {page,errors}=await openExample(browser,'template');try{
  await page.locator('#fe-preview h1').click();await reveal(page,'#ce-slide-lock');await page.locator('#ce-slide-lock').click();const locked=await snapshot(page);
  assert.equal(await page.locator('#vb-delete').isDisabled(),true);assert.equal(await page.locator('#vb-duplicate').isDisabled(),true);await page.locator('#fe-preview h1').press('Delete');assert.deepEqual((await snapshot(page)).state,locked.state);assert.deepEqual(errors,[]);
 }finally{await page.close();}
});

test('Inspector canvas-edit action preserves list items and table form refreshes after structural edits and Undo',async()=>{
 const {page,errors}=await openExample(browser,'template');try{
  const listSlide=(await snapshot(page)).state.slides[0];await page.locator('#fe-preview .lead').click();await reveal(page,'#vb-bullets');await page.locator('#vb-bullets').click();
  const list=page.locator('#fe-preview ul').first(),count=await list.locator('li').count();await list.locator('li').first().click();await page.locator('#wp-tab-content').click();await page.locator('#ic-edit-inline').click();
  await page.locator('#fe-preview li[contenteditable=true]').fill('Edited list item');await page.keyboard.press('Escape');assert.equal(await list.locator('li').count(),count);
  const id=listSlide.id,result=await operations(page,[{type:'table.insert',slideId:id,rows:2,columns:2,header:true}]);await selectLayer(page,result.created[0]);
  const before=await page.locator('#fe-table-grid input').count();await page.locator('#tbl-action-row').selectOption('row-after');assert.equal(await page.locator('#fe-table-grid input').count(),before+2);
  await reveal(page,'#fe-table-grid');await page.locator('#fe-table-grid input').last().fill('Fresh cell');await page.locator('#fe-table-grid input').last().press('Tab');await page.waitForTimeout(400);assert.equal(await page.locator('#fe-preview td').last().textContent(),'Fresh cell');
  await page.locator('#fe-undo').click();assert.notEqual(await page.locator('#fe-table-grid input').last().inputValue(),'Fresh cell');assert.deepEqual(errors,[]);
 }finally{await page.close();}
});
