import {reveal} from './ui.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import {chromium} from 'playwright';import {openExample,snapshot,operations,exportZip,importZip} from './collection-ui.mjs';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']});test.after(()=>browser.close());
test('existing layout tables and commands convert explicitly without losing content',async()=>{
 const {page,errors}=await openExample(browser,'template');try{
  const initial=await snapshot(page);
  for(const [kind,template]of [['table','table'],['code','code']]){
   const original=initial.state.slides.find(slide=>slide.template===template);assert(original);await page.locator('.fe-slide-button[data-slide-id="'+original.id+'"]').click();const before=await snapshot(page);
   const result=await operations(page,[{type:'data.convert',slideId:original.id,kind}]);assert.equal(result.ok,true);assert.match(result.created[0],/^block-/);
   assert.equal(await page.locator('#fe-preview .db-'+kind).count(),1);if(kind==='code')assert.deepEqual((await snapshot(page)).state.slides.find(slide=>slide.id===original.id).commands,original.commands);
   await page.locator('#fe-undo').click();assert.deepEqual((await snapshot(page)).state,before.state);
  }assert.deepEqual(errors,[]);
 }finally{await page.close();}
});
test('Table and Code containers move, resize, reject locked removal and restore deleted content with Undo',async()=>{
 const {page,errors}=await openExample(browser,'portfolio-demo');try{
  const id=(await snapshot(page)).state.slides[0].id;
  for(const operation of [{type:'table.insert',rows:3,columns:3,header:true},{type:'code.update',commands:{shared:'python app.py',variants:[],initial:'shared'}}]){
   const result=await operations(page,[{slideId:id,...operation}]);assert.equal(result.ok,true);const block=result.created[0];assert.match(block,/^block-/);
   assert.equal(await page.locator('#fe-preview .'+block+' .db-move').count(),1);assert.equal(await page.locator('#fe-preview .'+block+' .db-resize').count(),1);
   assert.equal((await operations(page,[{type:'block.place',slideId:id,blockId:block,placement:{x:.2,y:.15,w:.6,h:.6}}])).ok,true);
   const placed=await snapshot(page);assert.match(placed.state.slides[0].tree.find(node=>node.attrs?.class?.includes(block)).attrs.style,/left:20/);
   assert.equal((await operations(page,[{type:'design.meta',slideId:id,keys:[block],changes:{locked:true}}])).ok,true);const locked=await snapshot(page);
   assert.equal((await operations(page,[{type:'block.remove',slideId:id,blockId:block}])).code,'LOCKED');assert.deepEqual((await snapshot(page)).state,locked.state);
   assert.equal((await operations(page,[{type:'design.meta',slideId:id,keys:[block],changes:{locked:false}}])).ok,true);const unlocked=await snapshot(page);
   assert.equal((await operations(page,[{type:'block.remove',slideId:id,blockId:block}])).ok,true);if(operation.type==='code.update')assert.equal((await snapshot(page)).state.slides[0].commands,null);
   await page.locator('#fe-undo').click();assert.deepEqual((await snapshot(page)).state,unlocked.state);
  }
  const expected=await snapshot(page),restored=await importZip(browser,await exportZip(page),expected.projectId);try{assert.deepEqual((await snapshot(restored)).state,expected.state);}finally{await restored.close();}assert.deepEqual(errors,[]);
 }finally{await page.close();}
});
test('Inspector adds custom variants and edits optional language and environment independently',async()=>{
 const {page,errors}=await openExample(browser,'portfolio-demo');try{
  await page.locator('#component-open').click();await page.getByRole('tab',{name:'Data & Code',exact:true}).click();await page.locator('#component-items textarea').fill('npm install');await page.getByRole('button',{name:'Insert Code / Commands',exact:true}).click();
  await reveal(page,'#code-add-variant');await page.locator('#code-add-variant').click();const variant=await page.locator('#code-edit-choice').inputValue();assert.match(variant,/^variant-/);
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
