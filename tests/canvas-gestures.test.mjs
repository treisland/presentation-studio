import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {openExample,snapshot,operations} from './collection-ui.mjs';
import {selectElement} from './ui.mjs';
const browser=await chromium.launch({headless:true,args:['--no-sandbox'],executablePath:process.env.CHROMIUM_EXECUTABLE_PATH});
test.after(()=>browser.close());
const near=(a,b,t=.0001)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
async function setup(kind='block'){
  const {page,errors}=await openExample(browser,'portfolio-demo'),id=(await snapshot(page)).state.slides[0].id;
  await operations(page,[{type:'design.clear',slideId:id}]);
  let selector,keys=[];
  if(kind==='media'){
    await page.locator('#component-open').click();await page.getByRole('button',{name:'Insert Circle frame',exact:true}).click();
    await page.locator('#fe-preview .media-box').first().click();selector='#fe-preview .ce-selected';
  }else{
    const result=await operations(page,[{type:'block.create',slideId:id,kind:'text',placement:{x:.2,y:.31,w:.1,h:.1}},{type:'block.create',slideId:id,kind:'rectangle',placement:{x:.4,y:.31,w:.1,h:.1}},{type:'block.create',slideId:id,kind:'circle',placement:{x:.7,y:.315,w:.1,h:.1}}]);assert.equal(result.ok,true);keys=result.created;
    await selectElement(page,keys[0]);selector='#fe-preview .'+keys[0];
    if(kind==='batch'||kind==='group'){
      if(kind==='group'){await operations(page,[{type:'component.group',slideId:id,keys:keys.slice(0,2)}]);await page.locator('#ld-reveal-layers').click();await page.locator('.gs-layer-group button').first().click();}
      else{await page.locator('#ld-reveal-layers').click();await page.locator('.sp-layer-row[data-key="'+keys[1]+'"] input[type=checkbox]').check();}
      selector='#fe-preview .gs-bounds';
    }
  }
  const handle=selector+(kind==='media'?' .ce-move':kind==='batch'||kind==='group'?' .gs-move':' .db-move');
  return{page,errors,id,keys,selector,handle};
}
const rect=(page,selector)=>page.locator(selector).evaluate(el=>Object.fromEntries(['left','top','width','height'].map(k=>[k,parseFloat(el.style[k])/100])));
async function start(page,handle){const box=await page.locator(handle).boundingBox();assert.ok(box);const point={x:box.x+box.width/2,y:box.y+box.height/2};await page.mouse.move(point.x,point.y);await page.mouse.down();return point;}
for(const kind of ['block','media','batch','group']){
  test(kind+' move ignores sub-threshold motion and cancels without history changes',async()=>{
    const {page,errors,handle,selector}=await setup(kind);try{
      const before=await snapshot(page),original=await rect(page,selector),p=await start(page,handle);
      await page.mouse.move(p.x+2,p.y+1);await page.mouse.up();assert.deepEqual(await snapshot(page),before);assert.deepEqual(await rect(page,selector),original);
      const q=await start(page,handle);await page.mouse.move(q.x+45,q.y+17,{steps:4});await page.keyboard.press('Escape');await page.mouse.up();assert.deepEqual(await snapshot(page),before);assert.deepEqual(await rect(page,selector),original);assert.equal(await page.locator('[data-sp-gesture]').count(),0);assert.equal(await page.locator('.sp-snap-guide').count(),0);assert.deepEqual(errors,[]);
    }finally{await page.close();}
  });
  test(kind+' Shift movement locks one axis and releases without accumulating hidden movement',async()=>{
    const {page,errors,handle,selector}=await setup(kind);try{
      const before=await snapshot(page),origin=await rect(page,selector),slide=await page.locator('#fe-preview .slide').boundingBox();
      await page.keyboard.down('Shift');const p=await start(page,handle);await page.mouse.move(p.x+60,p.y+12,{steps:4});near((await rect(page,selector)).top,origin.top);assert.match(await page.locator('#vb-mode-hint').textContent(),/Horizontal axis locked/);await page.mouse.up();await page.keyboard.up('Shift');
      await page.locator('#fe-undo').click();assert.deepEqual((await snapshot(page)).state,before.state);
      await page.keyboard.down('Alt');const q=await start(page,handle);await page.mouse.move(q.x+25,q.y+15);const middle=await rect(page,selector);
      await page.keyboard.down('Shift');await page.mouse.move(q.x+45,q.y+18);near((await rect(page,selector)).top,middle.top);
      await page.keyboard.up('Shift');await page.mouse.move(q.x+46,q.y+19);const free=await rect(page,selector);near(free.top,middle.top+1/slide.height,.001);await page.mouse.up();await page.keyboard.up('Alt');
      await page.locator('#fe-undo').click();assert.deepEqual((await snapshot(page)).state,before.state);assert.deepEqual(errors,[]);
    }finally{await page.close();}
  });
}
test('batch snapping excludes its members, preserves spacing, and Alt bypasses guides at two zooms',async()=>{
  const {page,errors,handle,keys}=await setup('batch');try{
    for(const zoom of ['0.5','1'])for(const alt of [false,true]){
      await page.locator('#we-zoom').selectOption(zoom);const before=await snapshot(page),slide=await page.locator('#fe-preview .slide').boundingBox();if(alt)await page.keyboard.down('Alt');
      const p=await start(page,handle);await page.mouse.move(p.x+.5*slide.width-3,p.y,{steps:8});assert.equal((await page.locator('.sp-snap-guide').count())>0,!alt);await page.mouse.up();if(alt)await page.keyboard.up('Alt');
      const a=await rect(page,'#fe-preview .'+keys[0]),b=await rect(page,'#fe-preview .'+keys[1]);near(b.left-a.left,.2);near(a.top,b.top);
      if(!alt)near(a.left,.7,.001);else assert.ok(Math.abs(a.left-.7)>.001);
      await page.locator('#fe-undo').click();assert.deepEqual((await snapshot(page)).state,before.state);
    }assert.deepEqual(errors,[]);
  }finally{await page.close();}
});
test('capture loss and slide switches cancel batch movement; mixed locked items never partly move',async()=>{
  const {page,errors,handle,id,keys}=await setup('batch');try{
    const before=await snapshot(page),p=await start(page,handle);await page.mouse.move(p.x+30,p.y+20);
    await page.evaluate(()=>{for(const node of document.querySelectorAll('*'))if(node.hasPointerCapture?.(1))node.releasePointerCapture(1);});await page.mouse.up();assert.deepEqual(await snapshot(page),before);
    const q=await start(page,handle);await page.mouse.move(q.x+30,q.y+20);await page.locator('.fe-slide-button').nth(1).dispatchEvent('click');await page.mouse.up();assert.deepEqual((await snapshot(page)).state,before.state);
    await page.locator('#ld-tab-slides').click();await page.locator('.fe-slide-button').first().click();await operations(page,[{type:'design.meta',slideId:id,keys:[keys[1]],changes:{locked:true}}]);await selectElement(page,keys[0]);await page.locator('#ld-reveal-layers').click();await page.locator('.sp-layer-row[data-key="'+keys[1]+'"] input[type=checkbox]').check();assert.equal(await page.locator('#fe-preview .gs-move').isDisabled(),true);
    const locked=await snapshot(page);const result=await operations(page,[{type:'component.arrange',slideId:id,keys:keys.slice(0,2),action:'move',dx:.1,dy:.1}]);assert.equal(result.code,'LOCKED');assert.deepEqual(await snapshot(page),locked);assert.deepEqual(errors,[]);
  }finally{await page.close();}
});
