import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {openExample,snapshot,operations} from './collection-ui.mjs';
import {selectElement} from './ui.mjs';
const browser=await chromium.launch({headless:true,args:['--no-sandbox'],executablePath:process.env.CHROMIUM_EXECUTABLE_PATH});test.after(()=>browser.close());
async function setup(){const {page,errors}=await openExample(browser,'portfolio-demo'),id=(await snapshot(page)).state.slides[0].id;const made=await operations(page,[{type:'design.clear',slideId:id},{type:'block.create',slideId:id,kind:'text',placement:{x:.2,y:.3,w:.2,h:.2}},{type:'block.create',slideId:id,kind:'rectangle',placement:{x:.5,y:.3,w:.2,h:.2}}]);assert.equal(made.ok,true);return{page,errors,id,keys:made.created};}
test('selection context names its target, offers accurate units and announces completed keyboard movement',async()=>{
 const {page,errors,keys}=await setup();try{
  await selectElement(page,keys[0]);assert.match(await page.locator('#sg-context').textContent(),/Text/);await page.locator('#ids-keyboard-help summary').click();assert.match(await page.locator('#sg-keyboard').textContent(),/0.2%/);assert.match(await page.locator('#sg-keyboard').textContent(),/not screen pixels/);
  const before=await snapshot(page);await page.locator('#ld-reveal-layers').click();await page.locator('#en-search').fill('no matching item');const row=page.locator('.sp-layer-row[data-key="'+keys[0]+'"]');assert.equal(await row.isVisible(),false);await page.locator('#sg-layers').click();assert.equal(await page.locator('#en-search').inputValue(),'');assert.equal(await row.isVisible(),true);assert.equal(await page.evaluate(()=>document.activeElement.closest('.sp-layer-row')?.dataset.key),keys[0]);assert.deepEqual((await snapshot(page)).state,before.state);
  await page.locator('#fe-preview .'+keys[0]+' .db-move').focus();await page.keyboard.press('ArrowRight');await page.waitForTimeout(50);await page.keyboard.press('ArrowRight');assert.match(await page.locator('#sg-announcement').textContent(),/Moved.*X 20.4%/);
  await page.locator('#fe-preview .'+keys[0]+' p').click();assert.match(await page.locator('#sg-context').textContent(),/Editing text/);
  await page.locator('#component-open').click();await page.getByRole('button',{name:'Insert Circle frame',exact:true}).click();assert.match(await page.locator('#sg-keyboard').textContent(),/0.1%/);await page.locator('#fe-preview .ce-move').focus();await page.keyboard.press('ArrowRight');assert.match(await page.locator('#sg-announcement').textContent(),/^Moved/);assert.deepEqual(errors,[]);
 }finally{await page.close();}
});
test('group and member contexts expose an exit that retains the intended shared selection',async()=>{
 const {page,errors,id,keys}=await setup();try{
  await operations(page,[{type:'component.group',slideId:id,keys}]);await page.locator('#ld-reveal-layers').click();await page.locator('.gs-layer-group button').first().click();assert.match(await page.locator('#sg-context').textContent(),/2 items/);
  await page.locator('#gs-edit').click();assert.match(await page.locator('#sg-context').textContent(),/Editing member/);await page.locator('#sg-exit').click();assert.match(await page.locator('#sg-context').textContent(),/2 items/);assert.equal(await page.locator('.sp-layer-row.selected').count(),2);
  await operations(page,[{type:'design.meta',slideId:id,keys:[keys[1]],changes:{locked:true}}]);assert.match(await page.locator('#sg-reason').textContent(),/unlock selected items in Layers/i);assert.equal(await page.locator('#gs-edit').isDisabled(),true);assert.deepEqual(errors,[]);
 }finally{await page.close();}
});
test('pointer movement does not emit per-frame selection announcements and slide/preview context remains explicit',async()=>{
 const {page,errors,keys}=await setup();try{
  await selectElement(page,keys[0]);await page.evaluate(()=>{window.sgUpdates=0;new MutationObserver(()=>window.sgUpdates++).observe(document.querySelector('#sg-announcement'),{childList:true,subtree:true,characterData:true});});
  const h=await page.locator('#fe-preview .'+keys[0]+' .db-move').boundingBox();await page.mouse.move(h.x+h.width/2,h.y+h.height/2);await page.mouse.down();await page.mouse.move(h.x+h.width/2+30,h.y+h.height/2+10,{steps:12});assert.equal(await page.evaluate(()=>window.sgUpdates),0);await page.mouse.up();
  await page.locator('#ic-slide-settings').click();assert.match(await page.locator('#sg-context').textContent(),/Slide background\/settings/);await page.locator('#vb-preview-mode').click();assert.match(await page.locator('#sg-reason').textContent(),/Preview is view-only/);assert.deepEqual(errors,[]);
 }finally{await page.close();}
});
