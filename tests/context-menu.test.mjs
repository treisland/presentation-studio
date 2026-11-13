import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {openExample,snapshot,operations} from './collection-ui.mjs';
import {selectElement} from './ui.mjs';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']});
test.after(()=>browser.close());
const menu=page=>page.locator('#cm-menu');
async function blocks(page){const slideId=(await snapshot(page)).state.slides[0].id;const result=await operations(page,[{type:'block.create',slideId,kind:'rectangle'},{type:'block.create',slideId,kind:'circle'}]);const [a,b]=result.created;await operations(page,[{type:'block.place',slideId,blockId:a,placement:{x:.1,y:.2,w:.25,h:.3}},{type:'block.place',slideId,blockId:b,placement:{x:.6,y:.2,w:.25,h:.3}}]);return{slideId,a,b};}

test('every built-in Library card has shared pointer and keyboard actions without view-only mutations',async()=>{
 const {page,errors}=await openExample(browser,'template');try{
  const before=await snapshot(page);await page.locator('#component-open').click();
  for(const category of ['Blocks','Widgets','Data & Code']){
    await page.getByRole('tab',{name:category,exact:true}).click();
    const cards=page.locator('#component-items article');assert(await cards.count()>0);assert.equal(await cards.locator(':scope > .cm-trigger').count(),await cards.count());
    const first=cards.first();await first.click({button:'right',position:{x:20,y:20}});assert.equal(await menu(page).isVisible(),true);assert.match(await menu(page).getByRole('menuitem').first().textContent(),/^Insert/);
    await page.keyboard.press('Escape');assert.equal(await first.locator('.cm-trigger').evaluate(node=>document.activeElement===node),true);
    await first.focus();await page.keyboard.press('Shift+F10');assert.equal(await menu(page).isVisible(),true);await page.keyboard.press('Escape');assert.equal(await first.evaluate(node=>document.activeElement===node),true);
  }
  assert.deepEqual((await snapshot(page)).state,before.state);assert.deepEqual(errors,[]);
 }finally{await page.close();}
});

test('right-click selects its object, preserves multiselection and duplicates through the shared Undo action',async()=>{
 const {page,errors}=await openExample(browser,'template');try{
  const {a,b}=await blocks(page);await selectElement(page,b);const before=await snapshot(page);
  await page.locator('#fe-preview .'+a).click({button:'right',position:{x:50,y:30}});
  assert.equal(await page.locator('.sp-layer-row[data-key="'+a+'"] button').first().getAttribute('aria-pressed'),'true');assert.equal((await snapshot(page)).revision,before.revision);
  await page.keyboard.press('Escape');await page.locator('#ld-reveal-layers').click();await page.locator('.sp-layer-row[data-key="'+b+'"] input').check();
  const both=await snapshot(page);await page.locator('#fe-preview .'+a).click({button:'right',position:{x:50,y:30}});
  assert.match(await page.locator('#wp-selection-title').textContent(),/Multiple/);
  await menu(page).getByRole('menuitem',{name:'Duplicate',exact:true}).click();assert.equal((await snapshot(page)).state.slides[0].tree.length,both.state.slides[0].tree.length+2);
  await page.locator('#fe-undo').click();assert.deepEqual((await snapshot(page)).state,both.state);assert.deepEqual(errors,[]);
 }finally{await page.close();}
});

test('ellipsis and keyboard submenus fit narrow dark layouts and return focus on Escape',async()=>{
 const {page,errors}=await openExample(browser,'template');try{
  const {a}=await blocks(page);await selectElement(page,a);await page.setViewportSize({width:640,height:680});await page.evaluate(()=>document.body.classList.add('editor-dark'));
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const before=await snapshot(page);
  if(!await page.locator('#we-inspector').isVisible())await page.locator('#we-toggle-inspector').click();
  await page.locator('#cm-selection').focus();assert.equal(await page.evaluate(()=>document.activeElement.id),'cm-selection');await page.keyboard.press('Shift+F10');
  await menu(page).waitFor({state:'visible'});await page.keyboard.press('Home');
  for(let step=0;step<12&&await page.evaluate(()=>document.activeElement.textContent)!=='Arrange ›';step++)await page.keyboard.press('ArrowDown');
  assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Arrange ›');await page.keyboard.press('ArrowRight');assert.match(await menu(page).getAttribute('aria-label'),/^Arrange/);
  await page.keyboard.press('ArrowLeft');assert.equal(await menu(page).getByRole('menuitem',{name:'Duplicate',exact:true}).count(),1);
  await page.keyboard.press('End');assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Delete from slide');
  const box=await menu(page).boundingBox();assert(box.x>=0&&box.y>=0&&box.x+box.width<=640&&box.y+box.height<=680);
  await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.activeElement.id),'cm-selection');assert.equal(await page.locator('#full-editor').evaluate(node=>node.open),true);
  assert.deepEqual((await snapshot(page)).state,before.state);
  assert.deepEqual(errors,[]);
 }finally{await page.close();}
});

test('locks disable mutation shortcuts and a changed revision cannot retarget a pending action',async()=>{
 const {page,errors}=await openExample(browser,'template');try{
  const {slideId,a}=await blocks(page);await operations(page,[{type:'design.meta',slideId,keys:[a],changes:{locked:true}}]);await selectElement(page,a);await page.locator('#cm-selection').click();
  assert.equal(await menu(page).getByRole('menuitem',{name:'Delete from slide',exact:true}).isDisabled(),true);assert.equal(await menu(page).getByRole('menuitem',{name:'Duplicate',exact:true}).isDisabled(),true);
  await menu(page).getByRole('menuitem',{name:'Unlock',exact:true}).click();assert.equal((await snapshot(page)).state.design.slides[slideId].objects[a].locked,false);
  await page.locator('#cm-selection').click();await operations(page,[{type:'element.rename',slideId,keys:[a],name:'New name'}]);const changed=await snapshot(page);
  await menu(page).getByRole('menuitem',{name:'Duplicate',exact:true}).click();assert.deepEqual((await snapshot(page)).state,changed.state);assert.equal(await menu(page).isVisible(),false);assert.deepEqual(errors,[]);
 }finally{await page.close();}
});

test('saved-component menus manage originals without deleting placed copies and text fields keep native menus',async()=>{
 const {page,errors}=await openExample(browser,'template');try{
  await page.locator('#component-open').click();await page.getByRole('tab',{name:'Widgets',exact:true}).click();await page.getByRole('button',{name:'Insert Quote',exact:true}).click();
  await page.locator('#component-open').click();await page.locator('#component-name').fill('Menu quote');await page.locator('#component-save').click();await page.getByRole('tab',{name:'My components',exact:true}).click();
  const before=await snapshot(page);await page.getByRole('button',{name:'Actions for Menu quote',exact:true}).click();await menu(page).getByRole('menuitem',{name:'Rename saved component…',exact:true}).click();
  const input=page.getByRole('textbox',{name:'Component name',exact:true});await input.fill('Renamed quote');
  assert.equal(await input.evaluate(node=>{const event=new MouseEvent('contextmenu',{bubbles:true,cancelable:true});node.dispatchEvent(event);return event.defaultPrevented;}),false);assert.equal(await menu(page).isVisible(),false);
  await page.getByRole('button',{name:'Save component name',exact:true}).click();await page.getByRole('button',{name:'Actions for Renamed quote',exact:true}).click();await menu(page).getByRole('menuitem',{name:'Delete saved component',exact:true}).click();
  assert.equal(await page.getByRole('button',{name:'Insert Renamed quote',exact:true}).count(),0);assert.deepEqual((await snapshot(page)).state,before.state);assert.deepEqual(errors,[]);
 }finally{await page.close();}
});

test('table cell and media menus reveal existing controls and preserve independent targets',async()=>{
 const {page,errors}=await openExample(browser,'template');try{
  const slideId=(await snapshot(page)).state.slides[0].id,result=await operations(page,[{type:'table.insert',slideId,rows:2,columns:2,header:true}]),key=result.created[0];
  await page.locator('#fe-preview .'+key+' td').last().click({button:'right'});await menu(page).getByRole('menuitem',{name:'Rows and columns',exact:false}).click();
  await menu(page).getByRole('menuitem',{name:'Insert row below',exact:true}).click();assert.equal(await page.locator('#fe-preview .'+key+' tbody tr').count(),3);
  await page.locator('.fe-slide-button[data-slide-id="studio-media"]').click();await selectElement(page,'media-primary');await page.locator('#cm-selection').click();await menu(page).getByRole('menuitem',{name:'Crop / adjust frame…',exact:true}).click();assert.equal(await page.evaluate(()=>document.activeElement.id),'mi-fit');
  await page.locator('#cm-selection').click();await menu(page).getByRole('menuitem',{name:'Placement',exact:false}).click();await menu(page).getByRole('menuitem',{name:'Left of text',exact:true}).click();assert.equal((await snapshot(page)).state.media['studio-media'].layout,'left');assert.deepEqual(errors,[]);
 }finally{await page.close();}
});

test('widget, code and button commands focus the selected Inspector editor',async()=>{
 const {page,errors}=await openExample(browser,'template');try{
  const slideId=(await snapshot(page)).state.slides[0].id;
  const result=await operations(page,[{type:'block.create',slideId,kind:'quote'},{type:'block.create',slideId,kind:'button'},{type:'code.update',slideId,commands:{shared:'echo example',variants:[],initial:'shared'}}]);
  const [widget,button,code]=result.created;
  for(const [key,label,selector]of [[widget,'Configure widget…','#component-widget-fields textarea'],[button,'Edit action…','#nav-type'],[code,'Edit code…','#code-text']]){
    await selectElement(page,key);await page.locator('#cm-selection').click();await menu(page).getByRole('menuitem',{name:label,exact:true}).click();
    assert.equal(await page.locator(selector).first().evaluate(node=>node===document.activeElement),true,label);
  }
  assert.deepEqual(errors,[]);
 }finally{await page.close();}
});

test('group shortcuts preserve membership and Escape closes the menu before leaving member editing',async()=>{
 const {page,errors}=await openExample(browser,'template');try{
  const {a,b}=await blocks(page);await selectElement(page,a);await page.locator('#ld-reveal-layers').click();await page.locator('.sp-layer-row[data-key="'+b+'"] input').check();
  await page.locator('#cm-selection').click();await menu(page).getByRole('menuitem',{name:'Group selected',exact:true}).click();const grouped=await snapshot(page);
  await page.locator('#cm-selection').click();await menu(page).getByRole('menuitem',{name:'Edit group members',exact:true}).click();assert.equal(await page.locator('#gs-exit').isVisible(),true);
  await page.locator('#cm-selection').click();await page.keyboard.press('Escape');assert.equal(await menu(page).isVisible(),false);assert.equal(await page.locator('#gs-exit').isVisible(),true);
  await page.locator('#cm-selection').click();await menu(page).getByRole('menuitem',{name:'Finish editing group',exact:true}).click();assert.deepEqual((await snapshot(page)).state,grouped.state);
  await page.locator('#cm-selection').click();await menu(page).getByRole('menuitem',{name:'Ungroup',exact:true}).click();await page.locator('#fe-undo').click();assert.deepEqual((await snapshot(page)).state,grouped.state);assert.deepEqual(errors,[]);
 }finally{await page.close();}
});

test('touch ellipsis exposes the same actions with usable targets',async()=>{
 const context=await browser.newContext({hasTouch:true,viewport:{width:640,height:740}}),{page,errors}=await openExample(context,'template');try{
  const {a}=await blocks(page);await selectElement(page,a);if(!await page.locator('#we-inspector').isVisible())await page.locator('#we-toggle-inspector').click();
  await page.locator('#cm-selection').tap();assert.equal(await menu(page).isVisible(),true);
  const box=await menu(page).getByRole('menuitem',{name:'Duplicate',exact:true}).boundingBox();assert(box.width>=44&&box.height>=44);
  const before=await snapshot(page);await menu(page).getByRole('menuitem',{name:'Duplicate',exact:true}).tap();assert.equal((await snapshot(page)).state.slides[0].tree.length,before.state.slides[0].tree.length+1);assert.deepEqual(errors,[]);
 }finally{await context.close();}
});

test('catalog insertion reads current table settings and keeps the original Undo transaction',async()=>{
 const {page,errors}=await openExample(browser,'template');try{
  const before=await snapshot(page);await page.locator('#component-open').click();await page.getByRole('tab',{name:'Data & Code',exact:true}).click();
  const card=page.locator('#component-items article').filter({has:page.getByRole('heading',{name:'Table',exact:true})});
  await card.getByLabel('Rows',{exact:true}).fill('4');await card.getByLabel('Columns',{exact:true}).fill('2');await card.locator('.cm-trigger').click();
  await menu(page).getByRole('menuitem',{name:'Insert Table',exact:true}).click();assert.equal(await page.locator('#fe-preview table').last().locator('tbody tr').count(),4);assert.equal(await page.locator('#fe-preview table').last().locator('thead th').count(),2);
  await page.locator('#fe-undo').click();assert.deepEqual((await snapshot(page)).state,before.state);assert.deepEqual(errors,[]);
 }finally{await page.close();}
});

test('opening another object menu commits pending Inspector text against its original target',async()=>{
 const {page,errors}=await openExample(browser,'template');try{
  const slideId=(await snapshot(page)).state.slides[0].id,result=await operations(page,[{type:'block.create',slideId,kind:'text'},{type:'block.create',slideId,kind:'rectangle'}]),[text,shape]=result.created;
  await selectElement(page,text);await page.locator('#wp-tab-content').click();await page.locator('#fe-block-text').focus();await page.locator('#fe-block-text').fill('Keep this original text');
  await page.locator('#fe-preview .'+shape).click({button:'right',position:{x:40,y:30}});
  const state=(await snapshot(page)).state;assert.match(JSON.stringify(state.slides[0].tree.find(node=>node.attrs?.class?.includes(text))),/Keep this original text/);
  assert.equal(await page.locator('.sp-layer-row[data-key="'+shape+'"] button').first().getAttribute('aria-pressed'),'true');assert.equal(await menu(page).isVisible(),true);assert.deepEqual(errors,[]);
 }finally{await page.close();}
});
