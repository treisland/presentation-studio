import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {openExample,snapshot,operations,exportZip,importZip} from './collection-ui.mjs';
import {click} from './ui.mjs';
import {exportInteractiveBooth} from './interactive-ui.mjs';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']});
test.after(()=>browser.close());

test('standalone booth activates keyboard slide links offline and honors navigation permission',async()=>{
  const {page,errors}=await openExample(browser,'portfolio-demo');
  try{
    const initial=await snapshot(page),slideId=initial.state.slides[0].id,target=initial.state.slides[1].id;
    const result=await operations(page,[{type:'block.create',slideId,kind:'outline-button'}]);
    await operations(page,[{type:'navigation.set',slideId,keys:[result.created[0]],action:{type:'slide',slideId:target}}]);
    const folder=resolve('test-results/navigation-booth'),index=await exportInteractiveBooth(page,folder),restored=await browser.newPage();
    restored.on('pageerror',error=>errors.push(error.message));await restored.context().setOffline(true);
    try{
      await restored.goto('file://'+index);await restored.locator('.slide.active .nav-button').press('Enter');assert.equal(await restored.locator('.slide.active').getAttribute('id'),target);
      await writeFile(resolve(folder,'restricted.html'),(await readFile(index,'utf8')).replace('"navigation":true','"navigation":false'));
      await restored.goto('file://'+resolve(folder,'restricted.html'));await restored.locator('.slide.active .nav-button').press('Enter');assert.equal(await restored.locator('.slide.active').getAttribute('id'),slideId);
    }finally{await restored.close();}
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
});

test('reorder retains destinations and deletion warns without navigating to another slide',async()=>{
  const {page,errors}=await openExample(browser,'portfolio-demo');
  try{
    const before=await snapshot(page),slideId=before.state.slides[0].id,target=before.state.slides[1].id;
    const created=await operations(page,[{type:'block.create',slideId,kind:'navigation-arrow'}]),key=created.created[0];
    await operations(page,[{type:'navigation.set',slideId,keys:[key],action:{type:'slide',slideId:target}}]);
    await click(page,'#fe-down');assert.equal((await snapshot(page)).state.design.slides[slideId].objects[key].action.slideId,target);
    await page.locator('.fe-slide-button[data-slide-id="'+target+'"]').click();await click(page,'#fe-trash-slide');
    if(await page.locator('#fe-confirm').evaluate(dialog=>dialog.open))await page.locator('#fe-confirm-accept').click();
    await page.locator('.fe-slide-button[data-slide-id="'+slideId+'"]').click();await page.locator('#vb-preview-mode').click();await page.locator('#fe-preview .nav-button').press('Enter');
    assert.match(await page.locator('#fe-preview .nav-status').textContent(),/unavailable/);assert.equal(await page.locator('#fe-preview .slide').getAttribute('data-media-id'),slideId);
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
});

test('linked button labels remain editable and external resources open an isolated new tab',async()=>{
  const {page,errors}=await openExample(browser,'portfolio-demo');
  try{
    const initial=await snapshot(page),slideId=initial.state.slides[0].id;
    const result=await operations(page,[{type:'block.create',slideId,kind:'text-link'}]),key=result.created[0];
    await operations(page,[{type:'navigation.set',slideId,keys:[key],action:{type:'url',url:'https://example.com/resources'}}]);
    await page.locator('#fe-preview .nav-button p').dblclick();
    await page.keyboard.press('Control+a');await page.keyboard.type('Resource library');await page.keyboard.press('Escape');
    assert.match(await page.locator('#fe-preview .nav-button').textContent(),/Resource library/);
    await page.locator('#vb-preview-mode').click();await page.context().setOffline(true);
    const requests=[];page.context().on('request',request=>requests.push(request.url()));
    const popupEvent=page.waitForEvent('popup');await page.locator('#fe-preview .nav-button').press('Enter');const popup=await popupEvent;
    try{assert(requests.includes('https://example.com/resources'));assert.equal(await popup.evaluate(()=>window.opener),null);}finally{await popup.close();}
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
});

test('Library buttons preserve safe navigation across Undo and offline editable ZIP reopening',async()=>{
  const {page,errors}=await openExample(browser,'portfolio-demo');
  try{
    const before=await snapshot(page),slideId=before.state.slides[0].id,target=before.state.slides[1].id;
    await page.locator('#component-open').click();await page.getByRole('button',{name:'Insert Button',exact:true}).click();
    let current=await snapshot(page),node=current.state.slides[0].tree.find(node=>/nav-button/.test(node.attrs?.class)),key=node.attrs.class.match(/block-[\w-]+/)[0];
    assert.equal((await operations(page,[{type:'navigation.set',slideId,keys:[key],action:{type:'url',url:'javascript:alert(1)'}}])).ok,false);
    assert.equal((await operations(page,[{type:'navigation.set',slideId,keys:[key],action:{type:'slide',slideId:target}}])).ok,true);
    current=await snapshot(page);assert.equal(current.state.design.slides[slideId].objects[key].action.slideId,target);
    await page.locator('#fe-undo').click();assert.equal((await snapshot(page)).state.design?.slides[slideId]?.objects[key]?.action,undefined);
    await page.locator('#fe-redo').click();
    await page.locator('#vb-preview-mode').click();
    await page.locator('#fe-preview .nav-button').click();
    assert.equal(await page.locator('#fe-preview .slide').getAttribute('data-media-id'),target);
    const bytes=await exportZip(page),restored=await importZip(browser,bytes,current.projectId);
    try{const state=(await snapshot(restored)).state;assert.equal(state.design.slides[slideId].objects[key].action.slideId,target);}finally{await restored.close();}
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
});

