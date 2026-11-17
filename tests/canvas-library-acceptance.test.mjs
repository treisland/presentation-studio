import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {openExample,snapshot,operations,exportZip,importZip} from './collection-ui.mjs';
import {blockKinds,frameNames,libraryBlock} from './canvas-library-fixture.mjs';
import {selectElement} from './ui.mjs';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});test.after(()=>browser.close());
async function exercise(page,key,media=false){
 await selectElement(page,key);const root=media?'#fe-preview .ce-selected':'#fe-preview .'+key,move=root+(media?' .ce-move':' .db-move'),resize=root+(media?' [data-corner=se]':' [data-db-direction=se]');
 for(const zoom of ['fit','0.5','1']){
  await page.locator('#we-zoom').selectOption(zoom);const before=await snapshot(page);
  await page.locator(move).press('ArrowRight');assert.notDeepEqual((await snapshot(page)).state,before.state,key+' moves at '+zoom);
  await page.locator('#fe-undo').click();assert.deepEqual((await snapshot(page)).state,before.state,key+' Undo');
  await page.locator(resize).press('ArrowRight');assert.notDeepEqual((await snapshot(page)).state,before.state,key+' resizes');await page.locator('#fe-undo').click();assert.deepEqual((await snapshot(page)).state,before.state);
  const box=await page.locator(move).boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+40,box.y+20);await page.keyboard.press('Escape');await page.mouse.up();assert.deepEqual((await snapshot(page)).state,before.state,key+' cancel');
 }
 const slideId=(await snapshot(page)).state.slides[0].id;assert.equal((await operations(page,[{type:'design.meta',slideId,keys:[key],changes:{locked:true}}])).ok,true);
 if(media)assert.equal(await page.locator(move).count(),0,key+' locked media has no active grip');else assert.equal(await page.locator(move).isDisabled(),true,key+' lock');assert.equal((await operations(page,[{type:'design.meta',slideId,keys:[key],changes:{locked:false}}])).ok,true);
}
test('every registered block family moves, resizes, cancels and locks at three zooms',async()=>{
 const {page,errors}=await openExample(browser,'portfolio-demo');try{
  for(const kind of blockKinds){const {key}=await libraryBlock(page,kind);await exercise(page,key);}
  assert.deepEqual(errors,[]);
 }finally{await page.close();}
});
test('all media frames and an uploaded image retain media geometry through manipulation',async()=>{
 const {page,errors}=await openExample(browser,'portfolio-demo',true);try{
  const slideId=(await snapshot(page)).state.slides[0].id;
  for(const name of frameNames){await operations(page,[{type:'design.clear',slideId}]);await page.locator('#component-open').click();await page.getByRole('button',{name:'Insert '+name,exact:true}).click();const id=await page.locator('#fe-preview .media-box').getAttribute('data-object-id');await exercise(page,'media-'+id,true);}
  await operations(page,[{type:'design.clear',slideId}]);await page.locator('#ce-zone').selectOption('floating',{force:true});await page.locator('#ce-file').setInputFiles({name:'neutral.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="320" height="180" fill="#286875"/></svg>')});
  const id=await page.locator('#fe-preview .media-box').getAttribute('data-object-id');await exercise(page,'media-'+id,true);assert.deepEqual(errors,[]);
 }finally{await page.close();}
});
test('tables, code and every chart kind retain their specialized content and editable restore',async()=>{
 const {page,errors}=await openExample(browser,'portfolio-demo');try{
  const slideId=(await snapshot(page)).state.slides[0].id;await operations(page,[{type:'design.clear',slideId}]);
  const table=await operations(page,[{type:'table.insert',slideId,rows:3,columns:3,header:true}]);assert.equal(table.ok,true);await exercise(page,table.created[0]);
  await page.locator('#component-open').click();await page.getByRole('tab',{name:'Data & Code',exact:true}).click();await page.locator('#component-items textarea').fill('original command');await page.getByRole('button',{name:'Insert Code / Commands',exact:true}).click();
  const code=await page.locator('#fe-preview .db-block').filter({has:page.locator('.terminal')}).getAttribute('class');await exercise(page,code.match(/block-[\w-]+/)[0]);
  for(const name of ['Column chart','Horizontal bars','Line chart','Donut chart']){
   await page.locator('#component-open').click();await page.getByRole('tab',{name:'Charts & Graphs',exact:true}).click();await page.getByRole('button',{name:'Customize '+name,exact:true}).click();await page.locator('#chart-apply').click();
   const chart=page.locator('#fe-preview .ps-chart').last(),classes=await chart.getAttribute('class');await exercise(page,classes.match(/block-[\w-]+/)[0]);
  }
  const expected=await snapshot(page),restored=await importZip(browser,await exportZip(page),expected.projectId);try{assert.deepEqual((await snapshot(restored)).state,expected.state);}finally{await restored.close();}assert.deepEqual(errors,[]);
 }finally{await page.close();}
});
