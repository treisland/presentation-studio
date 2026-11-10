import test from 'node:test';import assert from 'node:assert/strict';import {chromium} from 'playwright';
import {openExample,snapshot,operations,exportZip,importZip} from './collection-ui.mjs';import {reveal} from './ui.mjs';
import {selectTab} from './ui.mjs';import {mkdir,writeFile} from 'node:fs/promises';import {resolve} from 'node:path';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']});test.after(()=>browser.close());
const meta=(state,id,key)=>state.design.slides[id].objects[key];
async function layer(page,key){await page.locator('#wp-tab-layers').click();await page.locator('#sp-layers [data-key="'+key+'"] button').first().click();}
test('type names increment without renumbering, custom copy names and reset/search persist',async()=>{
 const {page,errors}=await openExample(browser,'portfolio-demo');try{
  const id=(await snapshot(page)).state.slides[0].id,result=await operations(page,[{type:'block.create',slideId:id,kind:'text'},{type:'block.create',slideId:id,kind:'text'}]),[first,second]=result.created;
  const firstName=meta((await snapshot(page)).state,id,first).autoName,secondName=meta((await snapshot(page)).state,id,second).autoName;assert.equal(Number(secondName.split(' ').at(-1)),Number(firstName.split(' ').at(-1))+1);
  await operations(page,[{type:'block.remove',slideId:id,blockId:first}]);const third=(await operations(page,[{type:'block.create',slideId:id,kind:'text'}])).created[0];assert.equal(Number(meta((await snapshot(page)).state,id,third).autoName.split(' ').at(-1)),Number(secondName.split(' ').at(-1))+1);
  assert.equal((await operations(page,[{type:'element.rename',slideId:id,keys:[second],name:'Customer quote'},{type:'block.duplicate',slideId:id,blockId:second}])).ok,true);
  let state=(await snapshot(page)).state;assert(Object.values(state.design.slides[id].objects).some(item=>item.name==='Customer quote — Copy'));
  await layer(page,second);await page.locator('#en-search').fill('Customer quote');assert.equal(await page.locator('#sp-layers [data-key="'+third+'"]').isVisible(),false,await page.locator('#sp-layers [data-key="'+third+'"]').evaluate(el=>el.outerHTML)+' query='+await page.locator('#en-search').inputValue());
  await page.locator('#en-search').fill('');await reveal(page,'#sp-name');await page.locator('#sp-name').fill('A custom name');await page.locator('#sp-name').press('Tab');assert.equal(meta((await snapshot(page)).state,id,second).name,'A custom name');
  assert.equal((await operations(page,[{type:'element.rename',slideId:id,keys:[second],name:null}])).ok,true);assert.equal(meta((await snapshot(page)).state,id,second).autoName,secondName);
  const expected=await snapshot(page),restored=await importZip(browser,await exportZip(page),expected.projectId);try{assert.deepEqual((await snapshot(restored)).state,expected.state);}finally{await restored.close();}assert.deepEqual(errors,[]);
 }finally{await page.close();}
});
test('template text detaches without a jump, moves, edits and resets without reverting content',async()=>{
 const {page,errors}=await openExample(browser,'template');try{
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(300);
  const before=await snapshot(page);await page.locator('#fe-preview h1').click();const original=await page.locator('#fe-preview h1').boundingBox(),neighbor=await page.locator('#fe-preview .lead').boundingBox();
  await reveal(page,'#tp-customize');await page.locator('#tp-customize').click();assert.equal(await page.locator('#fe-preview h1.db-template').count(),1);
  const after=await page.locator('#fe-preview h1.db-template').boundingBox(),nextNeighbor=await page.locator('#fe-preview .lead').boundingBox();for(const key of ['x','y','width','height'])assert(Math.abs(after[key]-original[key])<2,key+' changed on conversion');assert(Math.abs(nextNeighbor.y-neighbor.y)<2,JSON.stringify({original,neighbor,nextNeighbor,placeholder:await page.locator('#fe-preview .tp-placeholder').boundingBox()}));
  let state=(await snapshot(page)).state;const id=state.slides[0].id,key=state.slides[0].tree.find(node=>node.attrs?.class?.includes('db-template')).attrs.class.match(/\bblock-[\w-]+/)[0];
  await operations(page,[{type:'block.place',slideId:id,blockId:key,placement:{x:.2,y:.2,w:.4,h:.2}}]);await page.locator('#fe-preview h1.db-template').click();await page.locator('#fe-preview h1.db-template').fill('A customized title');await page.keyboard.press('Escape');
  assert.equal((await operations(page,[{type:'template.reset',slideId:id,key}])).ok,true);assert.equal(await page.locator('#fe-preview .db-template').count(),0);assert.equal(await page.locator('#fe-preview h1').textContent(),'A customized title');assert.equal(await page.locator('#fe-preview .tp-placeholder').count(),0);
  assert.equal((await snapshot(page)).state.slides[0].id,before.state.slides[0].id);assert.deepEqual(errors,[]);
 }finally{await page.close();}
});
test('step sequences increment independently, preserve manual overrides and duplicate automatically',async()=>{
 const {page,errors}=await openExample(browser,'portfolio-demo');try{
  const id=(await snapshot(page)).state.slides[0].id,steps=await operations(page,[{type:'block.create',slideId:id,kind:'step'},{type:'block.create',slideId:id,kind:'step'}]);assert.equal(steps.ok,true,JSON.stringify(steps));const [first,second]=steps.created;
  assert.equal(meta((await snapshot(page)).state,id,first).annotation.number,1);assert.equal(meta((await snapshot(page)).state,id,second).annotation.number,2);
  assert.equal((await operations(page,[{type:'annotation.step',slideId:id,key:second,number:8},{type:'annotation.renumber',slideId:id,sequence:'Main'}])).ok,true);assert.equal(meta((await snapshot(page)).state,id,second).annotation.number,8);
  await operations(page,[{type:'annotation.step',slideId:id,key:first,sequence:'Another workflow'}]);assert.equal(meta((await snapshot(page)).state,id,first).annotation.number,1);
  const copied=await operations(page,[{type:'block.duplicate',slideId:id,blockId:first}]);assert.equal(meta((await snapshot(page)).state,id,copied.created[0]).annotation.number,2);assert.equal(meta((await snapshot(page)).state,id,copied.created[0]).annotation.manual,false);
  const before=await snapshot(page);await operations(page,[{type:'design.meta',slideId:id,keys:[first],changes:{locked:true}}]);const locked=await snapshot(page);assert.equal((await operations(page,[{type:'annotation.renumber',slideId:id,sequence:'Another workflow'}])).code,'LOCKED');assert.deepEqual((await snapshot(page)).state,locked.state);
  await page.locator('#fe-undo').click();assert.deepEqual((await snapshot(page)).state,before.state);assert.deepEqual(errors,[]);
 }finally{await page.close();}
});
test('arrow endpoints, styles, keyboard adjustment and annotations survive editable/playback reopening',async()=>{
 const {page,errors}=await openExample(browser,'portfolio-demo');try{
  const id=(await snapshot(page)).state.slides[0].id,result=await operations(page,[{type:'block.create',slideId:id,kind:'arrow'},{type:'block.create',slideId:id,kind:'step'}]);assert.equal(result.ok,true,JSON.stringify(result));const key=result.created[0];
  const changed=await operations(page,[{type:'annotation.arrow',slideId:id,key,points:[{x:.15,y:.3},{x:.65,y:.7}],heads:'both',stroke:8,label:'Follow this',description:'Continue from introduction to the next step'},{type:'design.appearance',slideId:id,keys:[key],style:{text:{hex:'#cc2277'}}}]);assert.equal(changed.ok,true,JSON.stringify(changed));
  assert.equal(await page.locator('#fe-preview .an-head-both').count(),1);assert.equal(await page.locator('#fe-preview .an-line').evaluate(el=>getComputedStyle(el).height),'8px');
  await page.locator('#fe-preview [data-an-end=end]').press('ArrowRight');assert.equal(await page.locator('#fe-preview .an-arrow-label').textContent(),'Follow this');
  const expected=await snapshot(page),restored=await importZip(browser,await exportZip(page),expected.projectId);try{assert.deepEqual((await snapshot(restored)).state,expected.state);}finally{await restored.close();}
  const pack=await page.evaluate(async bytes=>{const zip=await JSZip.loadAsync(new Uint8Array(bytes));return JSON.parse(await zip.file('presentation.json').async('string'));},[...await exportZip(page,'#fe-playback')]);assert.equal(meta(pack.state,id,key).annotation.heads,'both');assert.deepEqual(errors,[]);
 }finally{await page.close();}
});

test('whole template sections customize from Layers and new layouts retain free content with an explicit reset policy',async()=>{
 const {page,errors}=await openExample(browser,'template');try{
  await page.emulateMedia({reducedMotion:'reduce'});const before=await snapshot(page),slide=before.state.slides[0],index=slide.tree.findIndex(node=>node.tag==='div'&&JSON.stringify(node).includes('"h1"'));assert(index>=0);
  await layer(page,'node-'+index);await reveal(page,'#tp-customize');await page.locator('#tp-customize').click();assert.equal(await page.locator('#fe-preview .db-template h1').count(),1);
  const custom=(await snapshot(page)).state.slides[0].tree.find(node=>node.attrs?.class?.includes('db-template')),key=custom.attrs.class.match(/\bblock-[\w-]+/)[0];assert(meta((await snapshot(page)).state,slide.id,key).templatePosition);
  assert.equal((await operations(page,[{type:'layout.apply',slideId:slide.id,template:'comparison',keep:true}])).ok,true);assert.equal(meta((await snapshot(page)).state,slide.id,key).templatePosition,undefined);assert.equal(await page.locator('#fe-preview .db-template h1').count(),1);
  await page.locator('#fe-undo').click();assert(meta((await snapshot(page)).state,slide.id,key).templatePosition);assert.deepEqual(errors,[]);
 }finally{await page.close();}
});

test('Library offers steps/arrows and standalone booth retains their geometry, labels and custom color offline',async()=>{
 const {page,errors}=await openExample(browser,'template');try{
  await page.locator('#component-open').click();await page.getByRole('tab',{name:'Widgets',exact:true}).click();await page.getByRole('button',{name:'Insert Step number',exact:true}).click();
  await page.locator('#component-open').click();await page.getByRole('tab',{name:'Blocks',exact:true}).click();await page.getByRole('button',{name:'Insert Arrow / Pointer',exact:true}).click();
  const state=(await snapshot(page)).state,id=state.slides[0].id,key=Object.entries(state.design.slides[id].objects).find(([,meta])=>meta.annotation?.kind==='arrow')[0];
  assert.equal((await operations(page,[{type:'annotation.arrow',slideId:id,key,points:[{x:.2,y:.4},{x:.7,y:.6}],label:'Next step',stroke:7},{type:'design.appearance',slideId:id,keys:[key],style:{text:{hex:'#cc2277'}}}])).ok,true);
  await selectTab(page,'Presentation settings');await page.locator('#booth-open').click();await page.locator('#booth-password').fill('annotation-review-password');await page.locator('#booth-confirm').fill('annotation-review-password');await page.locator('#booth-loop').selectOption('studio-main');
  const bytes=await exportZip(page,'#booth-export'),html=await page.evaluate(async bytes=>{const zip=await JSZip.loadAsync(new Uint8Array(bytes));return zip.file('index.html').async('string');},[...bytes]);const folder=resolve('test-results/customization-booth');await mkdir(folder,{recursive:true});await writeFile(resolve(folder,'index.html'),html);
  const booth=await browser.newPage();booth.on('pageerror',error=>errors.push(error.message));try{await booth.context().setOffline(true);await booth.goto('file://'+resolve(folder,'index.html'));assert.equal(await booth.locator('.slide.active .db-step').count(),1);assert.equal(await booth.locator('.slide.active .an-arrow-label').textContent(),'Next step');assert.equal(await booth.locator('.slide.active .an-line').evaluate(el=>getComputedStyle(el).height),'7px');assert.equal(await booth.locator('.slide.active .db-arrow').evaluate(el=>getComputedStyle(el).color),'rgb(204, 34, 119)');}finally{await booth.close();}assert.deepEqual(errors,[]);
 }finally{await page.close();}
});

test('arrow endpoint dragging reaches slide edges and Escape cancels without history changes',async()=>{
 const {page,errors}=await openExample(browser,'portfolio-demo');try{
  const id=(await snapshot(page)).state.slides[0].id,result=await operations(page,[{type:'block.create',slideId:id,kind:'arrow'}]),key=result.created[0];
  const bounds=await page.locator('#fe-preview .slide').boundingBox();let handle=await page.locator('[data-an-key="'+key+'"][data-an-end=end]').boundingBox();
  await page.mouse.move(handle.x+handle.width/2,handle.y+handle.height/2);await page.mouse.down();await page.mouse.move(bounds.x+bounds.width*.98,bounds.y+bounds.height*.5,{steps:4});await page.mouse.up();
  const after=await snapshot(page),node=after.state.slides[0].tree.find(node=>node.attrs?.class?.includes(key));assert(parseFloat(node.attrs.style.match(/width:([\d.]+)%/)[1])>60);
  handle=await page.locator('[data-an-key="'+key+'"][data-an-end=end]').boundingBox();await page.mouse.move(handle.x+handle.width/2,handle.y+handle.height/2);await page.mouse.down();await page.mouse.move(bounds.x+bounds.width*.5,bounds.y+bounds.height*.4);await page.keyboard.press('Escape');await page.mouse.up();assert.deepEqual((await snapshot(page)).state,after.state);assert.equal(await page.locator('#an-drag-preview').count(),0);assert.deepEqual(errors,[]);
 }finally{await page.close();}
});
