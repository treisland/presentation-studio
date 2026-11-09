import test from 'node:test';import assert from 'node:assert/strict';import {chromium} from 'playwright';import {openExample,snapshot,operations,exportZip,importZip} from './collection-ui.mjs';import {reveal} from './ui.mjs';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']});test.after(()=>browser.close());
test('hidden blocks remain editable/recoverable but are removed from playback packs',async()=>{
 const {page,errors}=await openExample(browser,'portfolio-demo');try{
  const id=(await snapshot(page)).state.slides[0].id,created=await operations(page,[{type:'block.create',slideId:id,kind:'text'}]),key=created.created[0];
  const before=await snapshot(page);assert.equal((await operations(page,[{type:'visibility.element',slideId:id,keys:[key],visible:false}])).ok,true);assert.equal(await page.locator('#fe-preview .'+key).isVisible(),false);
  await reveal(page,'#visibility-show-hidden');await page.locator('#visibility-show-hidden').check();assert.equal(await page.locator('#fe-preview .'+key).isVisible(),true);
  const expected=await snapshot(page),restored=await importZip(browser,await exportZip(page),expected.projectId);try{assert.deepEqual((await snapshot(restored)).state,expected.state);}finally{await restored.close();}
  const playback=await page.evaluate(async bytes=>{const zip=await JSZip.loadAsync(new Uint8Array(bytes));return JSON.parse(await zip.file('presentation.json').async('string'));},[...await exportZip(page,'#fe-playback')]);assert.equal(playback.state.slides[0].tree.some(node=>node.attrs?.class?.includes(key)),false);
  await page.locator('#fe-undo').click();assert.deepEqual((await snapshot(page)).state,before.state);assert.deepEqual(errors,[]);
 }finally{await page.close();}
});
test('chrome defaults inherit, slide overrides preserve layout and reset, and locks reject edits',async()=>{
 const {page,errors}=await openExample(browser,'portfolio-demo');try{
  const original=await snapshot(page),id=original.state.slides[0].id;
  assert.equal((await operations(page,[{type:'visibility.chrome',slideId:id,scope:'presentation',part:'header',visible:false}])).ok,true);
  assert.equal(await page.locator('#fe-preview header').evaluate(element=>getComputedStyle(element).visibility),'hidden');
  assert.equal((await operations(page,[{type:'visibility.chrome',slideId:id,scope:'slide',part:'header',visible:true}])).ok,true);assert.equal(await page.locator('#fe-preview header').evaluate(element=>getComputedStyle(element).visibility),'visible');
  assert.equal((await operations(page,[{type:'visibility.chrome',slideId:id,scope:'slide',reset:true}])).ok,true);assert.equal(await page.locator('#fe-preview header').evaluate(element=>getComputedStyle(element).visibility),'hidden');
  assert.deepEqual((await snapshot(page)).state.slides,original.state.slides);
  await reveal(page,'#ce-slide-lock');await page.locator('#ce-slide-lock').click();const locked=await snapshot(page);
  assert.equal((await operations(page,[{type:'visibility.chrome',slideId:id,scope:'presentation',part:'footer',visible:false}])).code,'LOCKED');assert.deepEqual((await snapshot(page)).state,locked.state);assert.deepEqual(errors,[]);
 }finally{await page.close();}
});
test('group hiding preserves individual hidden flags and refuses locked group mutations',async()=>{
 const {page,errors}=await openExample(browser,'portfolio-demo');try{
  const id=(await snapshot(page)).state.slides[0].id,result=await operations(page,[{type:'block.create',slideId:id,kind:'text'},{type:'block.create',slideId:id,kind:'circle'}]),keys=result.created;
  assert.equal((await operations(page,[{type:'visibility.element',slideId:id,keys:[keys[0]],visible:false},{type:'component.group',slideId:id,keys},{type:'visibility.element',slideId:id,keys:[keys[1]],visible:false},{type:'visibility.element',slideId:id,keys:[keys[1]],visible:true}])).ok,true);
  const state=(await snapshot(page)).state;assert.equal(state.design.slides[id].objects[keys[0]].hidden,true);assert.equal(await page.locator('#fe-preview .'+keys[1]).isVisible(),true);
  assert.equal((await operations(page,[{type:'design.meta',slideId:id,keys:[keys[0]],changes:{locked:true}}])).ok,true);const locked=await snapshot(page);assert.equal((await operations(page,[{type:'visibility.element',slideId:id,keys:[keys[1]],visible:false}])).code,'LOCKED');assert.deepEqual((await snapshot(page)).state,locked.state);assert.deepEqual(errors,[]);
 }finally{await page.close();}
});

test('table and code visibility agree across Layers, groups and code settings',async()=>{
 const {page,errors}=await openExample(browser,'portfolio-demo');try{
  const id=(await snapshot(page)).state.slides[0].id;
  const table=await operations(page,[{type:'table.insert',slideId:id,rows:2,columns:2,header:true}]);assert.equal(table.ok,true);
  const code=await operations(page,[{type:'code.update',slideId:id,commands:{shared:'python app.py',variants:[],initial:'shared'}}]);assert.equal(code.ok,true);
  const keys=[table.created[0],code.created[0]];
  assert.equal((await operations(page,[{type:'visibility.element',slideId:id,keys,visible:false}])).ok,true);
  assert.equal(await page.locator('#fe-preview .db-table').isVisible(),false);assert.equal(await page.locator('#fe-preview .terminal').isVisible(),false);
  const commands=(await snapshot(page)).state.slides[0].commands;
  assert.equal((await operations(page,[{type:'code.update',slideId:id,commands:{...commands,hidden:false}},{type:'visibility.element',slideId:id,keys:[keys[0]],visible:true},{type:'component.group',slideId:id,keys},{type:'visibility.element',slideId:id,keys:[keys[1]],visible:false},{type:'visibility.element',slideId:id,keys:[keys[0]],visible:true}])).ok,true);
  assert.equal(await page.locator('#fe-preview .terminal').isVisible(),true);assert.equal((await snapshot(page)).state.slides[0].commands.hidden,false);assert.deepEqual(errors,[]);
 }finally{await page.close();}
});
