import test from 'node:test';import assert from 'node:assert/strict';import {chromium} from 'playwright';
import {openExample,snapshot,operations} from './collection-ui.mjs';import {selectElement,openColorEditor,reveal} from './ui.mjs';
const browser=await chromium.launch({headless:true,args:['--no-sandbox'],executablePath:process.env.CHROMIUM_EXECUTABLE_PATH});test.after(()=>browser.close());
async function setup(){const {page,errors}=await openExample(browser,'portfolio-demo'),id=(await snapshot(page)).state.slides[0].id;const result=await operations(page,[{type:'design.clear',slideId:id},{type:'block.create',slideId:id,kind:'text',placement:{x:.2,y:.3,w:.3,h:.2}}]);assert.equal(result.ok,true);const key=result.created[0];await selectElement(page,key);return{page,errors,id,key};}
test('same-target refresh preserves Inspector text caret/scroll and explicit panel choices',async()=>{
 const {page,errors,id}=await setup();try{
  await page.setViewportSize({width:1000,height:650});await page.locator('#wp-tab-content').click();await page.locator('#ic-text-editor > summary').click();
  const field=page.locator('#fe-block-text');await field.fill('Neutral editing text retained through view refresh.');await field.press('Tab');await field.focus();await field.evaluate(el=>el.setSelectionRange(4,11));
  const scroll=await page.locator('#wp-fields').evaluate(el=>{el.scrollTop=Math.min(50,el.scrollHeight-el.clientHeight);return el.scrollTop;});assert.ok(scroll>0);
  const result=await operations(page,[{type:'design.background',slideId:id,color:{hex:'#f3f7fa'}}]);assert.equal(result.ok,true,JSON.stringify(result));
  const actual=await field.evaluate(el=>({focused:document.activeElement===el,start:el.selectionStart,end:el.selectionEnd,value:el.value}));assert.equal(actual.focused,true);assert.equal(actual.start,4);assert.equal(actual.end,11);assert.match(actual.value,/Neutral editing/);assert.ok(Math.abs(await page.locator('#wp-fields').evaluate(el=>el.scrollTop)-scroll)<2);
  const state=(await snapshot(page)).state,context=await page.locator('#sg-context').textContent();
  await page.locator('#we-toggle-inspector').click();await page.setViewportSize({width:1400,height:800});assert.equal(await page.locator('#we-inspector').isVisible(),false);await page.locator('#we-toggle-inspector').click();await page.setViewportSize({width:900,height:650});assert.equal(await page.locator('#we-inspector').isVisible(),true);assert.equal(await page.locator('#sg-context').textContent(),context);assert.deepEqual((await snapshot(page)).state,state);assert.deepEqual(errors,[]);
 }finally{await page.close();}
});
test('staged color and numeric drafts survive viewport/panel resize and Escape restores useful focus',async()=>{
 const {page,errors}=await setup();try{
  const before=(await snapshot(page)).state;await openColorEditor(page,'fill','custom');await page.locator('#sp-hex').fill('#369abc');await page.locator('#sp-opacity').fill('47');await page.locator('#sp-hex').focus();await page.locator('#sp-hex').evaluate(el=>el.setSelectionRange(2,5));
  await page.setViewportSize({width:1000,height:650});assert.equal(await page.locator('#is-color-popover').evaluate(el=>el.matches(':popover-open')),true);assert.equal(await page.locator('#sp-hex').inputValue(),'#369abc');assert.equal(await page.locator('#sp-opacity').inputValue(),'47');assert.equal(await page.locator('#sp-hex').evaluate(el=>el.selectionStart),2);
  await page.locator('#we-size-inspector').evaluate(el=>{el.value='280';el.dispatchEvent(new Event('input',{bubbles:true}));});assert.equal(await page.locator('#sp-hex').inputValue(),'#369abc');assert.deepEqual((await snapshot(page)).state,before);
  await page.keyboard.press('Escape');assert.equal(await page.locator('#is-color-popover').evaluate(el=>el.matches(':popover-open')),false);assert.equal(await page.evaluate(()=>document.activeElement.id),'is-color-fill');await openColorEditor(page,'fill','custom');await page.locator('#sp-hex').fill('#369abc');await page.setViewportSize({width:683,height:650});await page.locator('#we-inspector').waitFor({state:'hidden'});assert.equal(await page.locator('#we-inspector').isVisible(),false);assert.equal(await page.locator('#sp-hex').inputValue(),'#369abc');await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.activeElement.id),'we-toggle-inspector');assert.deepEqual(errors,[]);
 }finally{await page.close();}
});
test('secondary toolbar overlays return keyboard focus to a visible origin at narrow widths',async()=>{
 const {page,errors,key}=await setup();try{
  await page.setViewportSize({width:683,height:650});await page.locator('#fe-preview .'+key+' p').click();await reveal(page,'#component-text-trigger');await page.locator('#component-text-trigger').click();const popup=page.locator('#component-text-popover');assert.equal(await popup.evaluate(el=>el.matches(':popover-open')),true);await popup.locator('button:enabled').first().focus();await page.keyboard.press('Escape');
  const focus=await page.evaluate(()=>({id:document.activeElement.id,visible:document.activeElement.checkVisibility()}));assert.ok(['component-text-trigger','component-more-trigger'].includes(focus.id),JSON.stringify(focus));assert.equal(focus.visible,true);assert.deepEqual(errors,[]);
 }finally{await page.close();}
});
