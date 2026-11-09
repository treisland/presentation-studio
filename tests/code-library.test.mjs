import test from 'node:test';import assert from 'node:assert/strict';import {chromium} from 'playwright';import {openExample,snapshot,operations,exportZip,importZip} from './collection-ui.mjs';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']});test.after(()=>browser.close());
test('Inspector adds custom variants and edits optional language and environment independently',async()=>{
 const {page,errors}=await openExample(browser,'portfolio-demo');try{
  await page.locator('#component-open').click();await page.getByRole('tab',{name:'Data & Code',exact:true}).click();await page.locator('#component-items textarea').fill('npm install');await page.getByRole('button',{name:'Insert Code / Commands',exact:true}).click();
  await page.locator('#code-add-variant').click();const variant=await page.locator('#code-edit-choice').inputValue();assert.match(variant,/^variant-/);
  await page.locator('#code-name').fill('Python');await page.locator('#code-name').press('Tab');await page.locator('#code-text').fill('print("Hi")');await page.locator('#code-text').press('Tab');await page.locator('#code-language').fill('Python');await page.locator('#code-language').press('Tab');await page.locator('#code-initial').selectOption(variant);
  assert.equal(await page.locator('#fe-preview .terminal pre').textContent(),'print("Hi")');assert.equal(await page.locator('#fe-preview .command-labels').textContent(),'Python');assert.deepEqual(errors,[]);
 }finally{await page.close();}
});
test('Library inserts a table and a shared command without labels or platform duplication',async()=>{
 const {page,errors}=await openExample(browser,'portfolio-demo');try{
  await page.locator('#component-open').click();await page.getByRole('tab',{name:'Data & Code',exact:true}).click();await page.getByRole('button',{name:'Insert Table',exact:true}).click();assert.equal(await page.locator('#fe-preview table tbody tr').count(),3);
  await page.locator('#component-open').click();await page.getByRole('tab',{name:'Data & Code',exact:true}).click();await page.locator('#component-items textarea').fill('python app.py');await page.getByRole('button',{name:'Insert Code / Commands',exact:true}).click();
  assert.equal(await page.locator('#fe-preview .terminal pre').textContent(),'python app.py');assert.equal(await page.locator('#fe-preview .terminal select').isVisible(),false);assert.equal(await page.locator('#fe-preview .command-labels').isVisible(),false);
  const expected=await snapshot(page),restored=await importZip(browser,await exportZip(page),expected.projectId);try{assert.deepEqual((await snapshot(restored)).state,expected.state);assert.equal(await restored.locator('#fe-preview .terminal pre').textContent(),'python app.py');}finally{await restored.close();}assert.deepEqual(errors,[]);
 }finally{await page.close();}
});
test('custom variants retain defaults, labels, empty suppression, hiding, locks and Undo',async()=>{
 const {page,errors}=await openExample(browser,'portfolio-demo');try{
  const id=(await snapshot(page)).state.slides[0].id,commands={shared:'npm install',language:'',environment:'',initial:'variant-python',hidden:false,detectOS:false,variants:[{id:'variant-python',name:'Python',text:'print("Hello")',language:'Python',environment:''},{id:'variant-empty',name:'Later',text:'',language:'',environment:''}]};
  assert.equal((await operations(page,[{type:'code.update',slideId:id,commands}])).ok,true);assert.equal(await page.locator('#fe-preview .terminal pre').textContent(),'print("Hello")');assert.equal(await page.locator('#fe-preview .terminal select option').count(),2);assert.equal(await page.locator('#fe-preview .command-labels').textContent(),'Python');
  const before=await snapshot(page);assert.equal((await operations(page,[{type:'code.update',slideId:id,commands:{...commands,hidden:true}}])).ok,true);assert.equal(await page.locator('#fe-preview .terminal').isVisible(),false);await page.locator('#fe-undo').click();assert.deepEqual((await snapshot(page)).state,before.state);
  const restored=await importZip(browser,await exportZip(page),before.projectId);try{assert.deepEqual((await snapshot(restored)).state,before.state);}finally{await restored.close();}
  assert.equal((await operations(page,[{type:'table.insert',slideId:id,rows:0,columns:4,header:true}])).ok,false);assert.deepEqual((await snapshot(page)).state,before.state);assert.deepEqual(errors,[]);
 }finally{await page.close();}
});
