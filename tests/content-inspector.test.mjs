import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {openExample,snapshot,operations,exportZip,importZip} from './collection-ui.mjs';
import {selectElement,reveal,inspectContent} from './ui.mjs';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']});
test.after(()=>browser.close());
async function content(page,key){await selectElement(page,key);if(!await page.locator('#we-inspector').isVisible())await page.locator('#we-toggle-inspector').click();await page.locator('#wp-tab-content').click();}

test('Content has one navigation strip and keeps Library insertion, widget fields and slide settings reachable',async()=>{
 const {page,errors}=await openExample(browser,'template');try{
  assert.equal(await page.locator('#ci-legacy-tabs').isVisible(),false);
  assert.deepEqual(await page.locator('#wp-tabs [role=tab]').allTextContents(),['Content','Arrange','Style']);
  for(const id of ['fe-block-select','fe-table-select','db-list'])assert.equal(await page.locator('#'+id).isVisible(),false);
  await page.locator('#component-open').click();await page.getByRole('tab',{name:'Widgets',exact:true}).click();await page.getByRole('button',{name:'Insert Quote',exact:true}).click();
  assert.equal(await page.locator('#component-widget-fields').isVisible(),true);
  assert.equal(await page.locator('#component-widget-fields textarea').count(),2);
  assert.equal(await page.locator('#ic-slide-settings').isVisible(),true);
  await page.locator('#ic-slide-settings').click();assert.equal(await page.locator('#fe-slide-title').isVisible(),true);
  assert.equal(await page.locator('#fe-duration').isVisible(),false);await reveal(page,'#fe-duration');assert.equal(await page.locator('#fe-duration').isVisible(),true);
  await page.locator('#ci-find-selection').click();assert.equal(await page.locator('#sp-layer-panel').isVisible(),true);
  assert.deepEqual(errors,[]);
 }finally{await page.close();}
});

test('scoped legacy field navigation preserves pending edits and never targets another card',async()=>{
 const {page,errors}=await openExample(browser,'template');try{
  await page.locator('#fe-preview h1').first().click();await page.locator('#wp-tab-content').click();
  const fields=await page.locator('#ci-field-select option').evaluateAll(options=>options.map(option=>({value:option.value,text:option.textContent})));
  assert(fields.length>1);assert(!fields.some(item=>item.text.includes('Start with something useful')));
  const heading=fields.find(item=>item.text.startsWith('H1')),lead=fields.find(item=>item.text.includes('Build a clear story'));
  assert(heading&&lead);const beforeHeading=await page.locator('#fe-preview h1').textContent();
  await page.locator('#ci-field-select').selectOption(lead.value);await page.locator('#fe-block-text').fill('Changed only the introduction');
  await page.locator('#ci-field-select').selectOption(heading.value);
  assert.equal(await page.locator('#fe-block-text').inputValue(),beforeHeading);
  assert.equal(await page.locator('#fe-preview .lead').first().textContent(),'Changed only the introduction');
  assert.equal(await page.locator('#fe-preview h1').textContent(),beforeHeading);
  assert.equal(await page.locator('#fe-preview .card h3').textContent(),'Start with something useful');
  await page.locator('#fe-undo').click();assert.notEqual(await page.locator('#fe-preview .lead').first().textContent(),'Changed only the introduction');
  assert.deepEqual(errors,[]);
 }finally{await page.close();}
});

test('slide notes preserve selection, pending text, object locks and independent slide scope through editable restore',async()=>{
 const {page,errors}=await openExample(browser,'template');try{
  const id=(await snapshot(page)).state.slides[0].id,result=await operations(page,[{type:'block.create',slideId:id,kind:'text'}]),key=result.created[0];
  await content(page,key);await page.locator('#fe-block-text').focus();await page.locator('#fe-block-text').fill('Pending object edit');
  const title=await page.locator('#wp-selection-title').textContent();await page.locator('#ci-notes > summary').click();
  await page.locator('#fe-notes-text').fill('Notes for the first slide');await page.locator('#fe-notes-text').press('Tab');
  assert.equal(await page.locator('#wp-selection-title').textContent(),title);
  assert.equal(await page.locator('.sp-layer-row[data-key="'+key+'"] button').first().getAttribute('aria-pressed'),'true');
  await operations(page,[{type:'design.meta',slideId:id,keys:[key],changes:{locked:true}}]);
  assert.equal(await page.locator('#fe-notes-text').isDisabled(),false);
  const other=(await snapshot(page)).state.slides.find(slide=>slide.id!==id);
  await page.locator('.fe-slide-button[data-slide-id="'+other.id+'"]').click();assert.notEqual(await page.locator('#fe-notes-text').inputValue(),'Notes for the first slide');
  await page.locator('#fe-notes-text').fill('Notes for another slide');await page.locator('#fe-notes-text').press('Tab');
  await page.locator('.fe-slide-button[data-slide-id="'+id+'"]').click();assert.equal(await page.locator('#fe-notes-text').inputValue(),'Notes for the first slide');
  await reveal(page,'#ce-slide-lock');await page.locator('#ce-slide-lock').click();assert.equal(await page.locator('#fe-notes-text').isDisabled(),true);
  const expected=await snapshot(page),restored=await importZip(browser,await exportZip(page),expected.projectId);
  try{assert.deepEqual((await snapshot(restored)).state,expected.state);}finally{await restored.close();}
  assert.match(JSON.stringify(expected.state.slides[0].tree),/Pending object edit/);assert.deepEqual(errors,[]);
 }finally{await page.close();}
});

test('selected tables keep cell fallback, structure and Undo scoped to their own root',async()=>{
 const {page,errors}=await openExample(browser,'template');try{
  const id=(await snapshot(page)).state.slides[0].id,result=await operations(page,[{type:'table.insert',slideId:id,rows:2,columns:2,header:true},{type:'table.insert',slideId:id,rows:2,columns:2,header:true}]);
  const [a,b]=result.created;await content(page,a);
  assert.equal(await page.locator('#ci-table-editor').evaluate(node=>node.open),false);
  await page.locator('#ci-table-editor > summary').click();await page.locator('#fe-table-grid input').last().fill('Only first table');await page.locator('#fe-table-grid input').last().press('Tab');
  await content(page,b);assert.equal(await page.locator('#ci-table-editor').evaluate(node=>node.open),true);assert.notEqual(await page.locator('#fe-table-grid input').last().inputValue(),'Only first table');
  const before=await snapshot(page);await page.locator('#tbl-action-row').selectOption('row-after');assert.match(await page.locator('#ci-table-count').textContent(),/3 data rows/);
  await page.locator('#fe-undo').click();assert.deepEqual((await snapshot(page)).state,before.state);
  assert.equal(await page.locator('#fe-preview .'+a+' td').last().textContent(),'Only first table');
  await operations(page,[{type:'design.meta',slideId:id,keys:[b],changes:{locked:true}}]);assert.equal(await page.locator('#tbl-action-row').isDisabled(),true);assert.equal(await page.locator('#fe-table-grid input').last().isDisabled(),true);
  assert.deepEqual(errors,[]);
 }finally{await page.close();}
});

test('Library media uploads and Code variants remain available without category navigation',async()=>{
 const {page,errors}=await openExample(browser,'template');try{
  await page.locator('#component-open').click();await page.getByRole('tab',{name:'Blocks',exact:true}).click();await page.locator('#component-search').fill('image');
  const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'Insert image or video…',exact:true}).click();
  await(await chooser).setFiles({name:'content-review.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="blue"/></svg>')});
  await page.locator('#ce-caption').fill('Accessible media route');await page.locator('#ce-caption').press('Tab');
  assert.equal(await page.locator('#ce-alt').isVisible(),true);
  await page.locator('#component-open').click();await page.locator('#component-search').fill('');await page.getByRole('tab',{name:'Data & Code',exact:true}).click();
  await page.locator('#component-items textarea').fill('print("Hello")');await page.getByRole('button',{name:'Insert Code / Commands',exact:true}).click();
  assert.equal(await page.locator('#code-language').isVisible(),true);assert.equal(await page.locator('#ci-code-advanced').evaluate(node=>node.open),false);assert.equal(await page.locator('#ci-field-target').isVisible(),false);
  await page.locator('#ci-code-advanced > summary').click();await page.locator('#code-add-variant').click();await page.locator('#code-name').fill('Python example');await page.locator('#code-name').press('Tab');
  assert.equal(await page.locator('#code-name').inputValue(),'Python example');assert.equal(await page.locator('#ci-legacy-tabs').isVisible(),false);assert.deepEqual(errors,[]);
 }finally{await page.close();}
});

test('removing the active text target cannot retarget its panel to the next object',async()=>{
 const {page,errors}=await openExample(browser,'template');try{
  const id=(await snapshot(page)).state.slides[0].id,result=await operations(page,[{type:'block.create',slideId:id,kind:'text'},{type:'block.create',slideId:id,kind:'text'}]);
  const [a,b]=result.created;await content(page,a);await page.locator('#fe-block-text').focus();await page.locator('#fe-block-text').fill('First target only');
  // Finish the field before invoking the editing API, which rejects pending edits.
  await page.locator('#fe-block-text').press('Tab');
  const before=(await snapshot(page)).state.slides[0].tree.find(node=>node.attrs?.class?.includes(b));
  assert.equal((await operations(page,[{type:'block.remove',slideId:id,blockId:a}])).ok,true);
  assert.equal(await page.locator('#ic-text-editor').isVisible(),false);
  const after=(await snapshot(page)).state.slides[0].tree.find(node=>node.attrs?.class?.includes(b));assert.deepEqual(after,before);
  assert.deepEqual(errors,[]);
 }finally{await page.close();}
});

test('file cancellation preserves the editor and notes leave content scrollable in short panels',async()=>{
 const {page,errors}=await openExample(browser,'template');try{
  await page.locator('#component-open').click();await page.locator('#component-search').fill('image');
  const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'Insert image or video…',exact:true}).click();await chooser;
  await page.locator('#ce-file').dispatchEvent('cancel',{bubbles:true,cancelable:true});
  assert.equal(await page.locator('#full-editor').isVisible(),true);
  await page.locator('#fe-preview h1').first().click();await page.locator('#ci-notes > summary').click();
  for(const [width,height]of [[390,740],[640,480]]){
    await page.setViewportSize({width,height});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    if(!await page.locator('#we-inspector').isVisible())await page.locator('#we-toggle-inspector').click();
    await page.waitForFunction(()=>document.getElementById('wp-fields').clientHeight>24);
    assert.equal(await page.locator('#ci-notes > summary').isVisible(),true);
    const sizes=await page.evaluate(()=>Object.fromEntries(['we-inspector','wp-selection-header','wp-fields','ci-notes'].map(id=>{const node=document.getElementById(id);return[id,{height:node.clientHeight,max:getComputedStyle(node).maxHeight,flex:getComputedStyle(node).flex}];})));
    assert(sizes['wp-fields'].height>24,'Content retains a scrollable viewport at '+width+'×'+height+': '+JSON.stringify(sizes));
    assert.equal(await page.locator('#we-inspector').evaluate(node=>node.scrollWidth<=node.clientWidth),true);
  }
  assert.deepEqual(errors,[]);
 }finally{await page.close();}
});
