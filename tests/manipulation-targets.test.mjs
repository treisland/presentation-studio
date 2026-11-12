import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';
import {openExample,snapshot,operations} from './collection-ui.mjs';
import {selectElement} from './ui.mjs';
const browser=await chromium.launch({headless:true,args:['--no-sandbox'],executablePath:process.env.CHROMIUM_EXECUTABLE_PATH});
test.after(()=>browser.close());
async function reachable(page,selector){
  await page.waitForFunction(selector=>{
    const handles=[...document.querySelectorAll(selector)],v=document.querySelector('#we-viewport').getBoundingClientRect();
    return handles.length&&handles.every(h=>{const r=h.getBoundingClientRect();return r.width>=23.9&&r.height>=23.9&&r.left>=v.left-1&&r.top>=v.top-1&&r.right<=v.right+1&&r.bottom<=v.bottom+1;});
  },selector);
  const boxes=await page.locator(selector).evaluateAll(handles=>handles.map(h=>{const r=h.getBoundingClientRect(),top=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {width:r.width,height:r.height,hit:top===h||h.contains(top),name:h.getAttribute('aria-label')};}));
  for(const box of boxes){assert.ok(box.hit,JSON.stringify(box));assert.ok(box.name);assert.ok(box.width>=23.9&&box.height>=23.9);}
}
test('small edge blocks keep distinct reachable keyboard handles at Fit and narrow layouts',async()=>{
  const {page,errors}=await openExample(browser,'portfolio-demo');try{
    const id=(await snapshot(page)).state.slides[0].id;
    const result=await operations(page,[{type:'design.clear',slideId:id},{type:'block.create',slideId:id,kind:'text',placement:{x:0,y:0,w:.05,h:.05}}]);assert.equal(result.ok,true);const key=result.created[0];
    for(const width of [1366,683]){
      await page.evaluate(dark=>document.body.classList.toggle('editor-dark',dark),width===683);
      await page.setViewportSize({width,height:768});await page.locator('#we-zoom').selectOption('fit');
      for(const [x,y]of [[0,0],[.95,.95]]){
        await operations(page,[{type:'block.place',slideId:id,blockId:key,placement:{x,y,w:.05,h:.05}}]);await page.locator('#fe-preview .'+key).focus();
        await reachable(page,'#fe-preview .'+key+' > .db-handle');
      }
    }
    const before=await snapshot(page);await page.locator('#fe-preview .'+key+' .db-move').focus();await page.keyboard.press('ArrowLeft');assert.notDeepEqual((await snapshot(page)).state,before.state);await page.locator('#fe-undo').click();assert.deepEqual((await snapshot(page)).state,before.state);
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
});
test('media and group targets match block sizes at two zooms and preserve locks',async()=>{
  const {page,errors}=await openExample(browser,'portfolio-demo');try{
    const id=(await snapshot(page)).state.slides[0].id;await operations(page,[{type:'design.clear',slideId:id}]);
    await page.locator('#component-open').click();await page.getByRole('button',{name:'Insert Circle frame',exact:true}).click();
    const media=page.locator('#fe-preview .media-box').first();await media.click();
    for(const zoom of ['0.5','1']){await page.locator('#we-zoom').selectOption(zoom);await reachable(page,'#fe-preview .ce-selected > .ce-handle');}
    const result=await operations(page,[{type:'block.create',slideId:id,kind:'text',placement:{x:.4,y:.4,w:.08,h:.08}},{type:'block.create',slideId:id,kind:'rectangle',placement:{x:.5,y:.4,w:.08,h:.08}}]);const keys=result.created;
    await operations(page,[{type:'component.group',slideId:id,keys}]);await page.locator('#ld-reveal-layers').click();await page.locator('.gs-layer-group button').first().click();
    for(const zoom of ['0.5','2']){await page.locator('#we-zoom').selectOption(zoom);await reachable(page,'#fe-preview .gs-bounds > .gs-handle');}
    await operations(page,[{type:'design.meta',slideId:id,keys:[keys[0]],changes:{locked:true}}]);
    assert.equal(await page.locator('#fe-preview .gs-move').isDisabled(),true);assert.match(await page.locator('#fe-preview .gs-move').getAttribute('aria-description'),/Unlock/);
    await page.emulateMedia({forcedColors:'active'});await mkdir('test-results',{recursive:true});await page.screenshot({path:'test-results/manipulation-targets.png'});assert.deepEqual(errors,[]);
  }finally{await page.close();}
});
test('selected grips remain reachable above overlapping content without changing saved layer order',async()=>{
  const {page,errors}=await openExample(browser,'portfolio-demo');try{
    const id=(await snapshot(page)).state.slides[0].id;await operations(page,[{type:'design.clear',slideId:id}]);
    const result=await operations(page,[{type:'block.create',slideId:id,kind:'text',placement:{x:.2,y:.2,w:.08,h:.08},layer:4},{type:'block.create',slideId:id,kind:'rectangle',placement:{x:.1,y:.1,w:.5,h:.5},layer:20}]);const [key,cover]=result.created,before=await snapshot(page);
    await selectElement(page,key);await reachable(page,'#fe-preview .'+key+' > .db-handle');assert.deepEqual((await snapshot(page)).state,before.state);
    assert.equal(await page.locator('#fe-preview .'+cover).evaluate(el=>el.style.zIndex),'20');assert.equal(await page.locator('#fe-preview .'+key).evaluate(el=>el.style.zIndex),'4');
    await page.locator('#vb-preview-mode').click();assert.equal(await page.locator('.mh-target:popover-open').count(),0);assert.deepEqual(errors,[]);
  }finally{await page.close();}
});
