import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {resolve} from 'node:path';
import {openExample,snapshot,operations} from './collection-ui.mjs';
import {addSlide,reveal} from './ui.mjs';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']});
test.after(()=>browser.close());
async function shape(page){await addSlide(page,'blank');await reveal(page,'#db-palette');if(!await page.locator('#db-palette').evaluate(el=>el.open))await page.locator('#db-palette > summary').click();await page.locator('[data-db-kind=rectangle]').click();return page.locator('#db-list').inputValue();}
async function tip(page,pattern){await page.waitForFunction(()=>document.querySelector('#ac-tooltip')?.matches(':popover-open'));assert.match(await page.getByRole('tooltip').textContent(),pattern);}

test('action icons keep contextual names and focus tooltips are hoverable, dismissible and transient',async()=>{
  const {page,errors}=await openExample(browser,'portfolio-demo');try{
    await page.locator('#fe-redo').hover();await tip(page,/Redo — Nothing to redo/);await page.mouse.move(10,10);
    await shape(page);const before=await snapshot(page),button=page.locator('#db-duplicate');
    assert.equal(await button.getAttribute('aria-label'),'Duplicate block');assert.equal(await button.locator('svg[aria-hidden=true]').count(),1);
    await button.focus();await tip(page,/^Duplicate block$/);assert.equal(await button.getAttribute('aria-describedby'),'ac-tooltip');
    await page.keyboard.press('Escape');assert.equal(await page.getByRole('tooltip').isVisible(),false);assert.equal(await page.locator('#full-editor').evaluate(el=>el.open),true);
    assert.equal(await button.evaluate(el=>document.activeElement===el),true);
    await page.locator('#wp-selection-title').focus();await button.hover();await tip(page,/Duplicate block/);
    await page.getByRole('tooltip').hover();await page.waitForTimeout(200);assert.equal(await page.getByRole('tooltip').isVisible(),true);
    await page.mouse.move(10,10);await page.waitForFunction(()=>!document.querySelector('#ac-tooltip').matches(':popover-open'));
    assert.deepEqual(await snapshot(page),before);assert.deepEqual(errors,[]);
  }finally{await page.close();}
});

test('touch actions retain readable modes and larger targets without requiring hover',async()=>{
  const context=await browser.newContext({hasTouch:true,viewport:{width:1366,height:900}}),page=await context.newPage();
  try{
    await page.goto('file://'+resolve('dist/presentation-studio.html'));await page.locator('#open-full-editor').click();
    const before=await snapshot(page);
    for(const id of ['fe-undo','fe-redo','wp-duplicate','vb-edit-mode','vb-preview-mode']){
      const bounds=await page.locator('#'+id).boundingBox();assert(bounds&&bounds.width>=44&&bounds.height>=44,id);
    }
    assert.equal(await page.locator('#vb-edit-mode .ac-label').isVisible(),true);assert.deepEqual(await snapshot(page),before);
  }finally{await context.close();}
});

test('icon activation preserves duplicate/delete and one-step Undo while Edit/Preview stay labeled',async()=>{
  const {page,errors}=await openExample(browser,'portfolio-demo');try{
    const id=await shape(page);const before=await snapshot(page);
    await page.locator('#db-duplicate').press('Enter');const duplicated=await snapshot(page);assert.notDeepEqual(duplicated.state,before.state);
    await page.locator('#fe-undo').click();assert.deepEqual((await snapshot(page)).state,before.state);
    await page.locator('#fe-preview .'+id).click();await page.locator('#db-remove').click();assert.notDeepEqual((await snapshot(page)).state,before.state);
    await page.locator('#fe-undo').click();assert.deepEqual((await snapshot(page)).state,before.state);
    for(const [id,label]of [['vb-edit-mode','Edit blocks'],['vb-preview-mode','Preview']])assert.equal(await page.locator('#'+id+' .ac-label').textContent(),label);
    await page.locator('#vb-preview-mode').click();assert.equal(await page.locator('#vb-preview-mode').getAttribute('aria-pressed'),'true');
    await page.locator('#vb-edit-mode').click();assert.equal(await page.locator('#vb-edit-mode').getAttribute('aria-pressed'),'true');
    assert.deepEqual((await snapshot(page)).state,before.state);assert.deepEqual(errors,[]);
  }finally{await page.close();}
});

test('layer tooltips follow hide/lock/rename without retaining a removed row or stale name',async()=>{
  const {page,errors}=await openExample(browser,'portfolio-demo');try{
    const key=await shape(page),slideId=(await snapshot(page)).state.slides.find(s=>s.template==='blank').id;
    await operations(page,[{type:'element.rename',slideId,keys:[key],name:'Callout 1'}]);await page.locator('#ld-reveal-layers').click();
    const row=page.locator('.sp-layer-row[data-key="'+key+'"]');
    await row.getByRole('button',{name:'Hide Callout 1',exact:true}).focus();await tip(page,/^Hide Callout 1$/);
    await row.getByRole('button',{name:'Hide Callout 1',exact:true}).click();
    await row.getByRole('button',{name:'Show Callout 1',exact:true}).focus();await tip(page,/^Show Callout 1$/);
    await row.getByRole('button',{name:'Show Callout 1',exact:true}).click();
    await row.getByRole('button',{name:'Lock Callout 1',exact:true}).click();
    await row.getByRole('button',{name:'Unlock Callout 1',exact:true}).focus();await tip(page,/^Unlock Callout 1$/);
    await row.getByRole('button',{name:'Unlock Callout 1',exact:true}).click();
    const renamed=await operations(page,[{type:'element.rename',slideId,keys:[key],name:'Renamed card'}]);assert.equal(renamed.ok,true,renamed.message);
    if(await page.getByRole('tooltip').isVisible())assert.doesNotMatch(await page.getByRole('tooltip').textContent(),/Callout 1/);
    await row.getByRole('button',{name:'Hide Renamed card',exact:true}).focus();await tip(page,/^Hide Renamed card$/);assert.deepEqual(errors,[]);
  }finally{await page.close();}
});

test('narrow dark and forced-color action targets and tooltips fit without hiding key mode labels',async()=>{
  const {page,errors}=await openExample(browser,'portfolio-demo');try{
    await shape(page);await page.setViewportSize({width:1024,height:768});
    await page.evaluate(()=>document.body.classList.add('editor-dark'));
    const button=page.locator('#db-remove');await button.focus();await tip(page,/Delete block/);
    const bounds=await page.getByRole('tooltip').boundingBox();assert(bounds.x>=0&&bounds.x+bounds.width<=1024);assert(bounds.y>=0&&bounds.y+bounds.height<=768);
    const target=await button.boundingBox();assert(target.width>=32&&target.height>=32);
    assert.equal(await page.locator('#vb-edit-mode .ac-label').isVisible(),true);assert.equal(await page.locator('#vb-preview-mode .ac-label').isVisible(),true);
    await page.emulateMedia({forcedColors:'active'});assert.equal(await button.locator('svg').isVisible(),true);
    const before=await snapshot(page);await page.locator('#component-more-trigger').focus();await tip(page,/More actions/);await page.keyboard.press('Escape');
    await page.locator('#component-more-trigger').click();assert.equal(await page.locator('#component-more-trigger').getAttribute('aria-expanded'),'true');
    assert.deepEqual(await snapshot(page),before);assert.deepEqual(errors,[]);
  }finally{await page.close();}
});
