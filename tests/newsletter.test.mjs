import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {snapshot,openExample,exportZip,importZip,dropDiagram} from './collection-ui.mjs';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']});test.after(()=>browser.close());
test('Newsletter starter offers four readable slide compositions without claiming email output',async()=>{
 for(const dark of [false,true]){const{page:p,errors}=await openExample(browser,'newsletter-starter',dark);try{
  const before=await snapshot(p);assert.equal(before.state.slides.length,4);assert.equal(Object.keys(before.state.media).length,0);assert.equal(await p.locator('[name=nx-start][value=newsletter-demo]').count(),0);assert.match(await p.locator('[name=nx-start][value=newsletter-starter]').locator('..').textContent(),/not email HTML/);
  for(const size of [{width:1366,height:768},{width:1920,height:1080}]){await p.setViewportSize(size);for(const slide of before.state.slides){await p.locator('.fe-slide-button[data-slide-id="'+slide.id+'"]').click();assert.equal(await p.locator('#fe-layout-warning').isVisible(),false,slide.template);assert.equal(await p.locator('#fe-preview .mg-cell-action').count(),1);}}
  assert.deepEqual((await snapshot(p)).state,before.state);assert.deepEqual(errors,[]);
 }finally{await p.close();}}
});
test('Newsletter image addition and recovery survive a clean offline editable ZIP import',async()=>{const{page:p,errors}=await openExample(browser,'newsletter-starter');try{
 const before=await snapshot(p);await dropDiagram(p);const expected=await snapshot(p);assert.equal(expected.state.mediaObjects[before.state.slides[0].id].length,1);const bytes=await exportZip(p),q=await importZip(browser,bytes,expected.projectId);try{const restored=await snapshot(q);assert.deepEqual(restored.state.slides,expected.state.slides);assert.deepEqual(restored.state.mediaObjects,expected.state.mediaObjects);assert.equal(await q.locator('#fe-preview .media-box img').evaluateAll(nodes=>nodes.every(n=>n.complete&&n.naturalWidth>0)),true);}finally{await q.close();}
 await p.locator('#fe-undo').click();assert.deepEqual((await snapshot(p)).state,before.state);assert.deepEqual(errors,[]);
}finally{await p.close();}});
