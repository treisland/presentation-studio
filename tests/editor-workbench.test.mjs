import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {resolve} from 'node:path';
import {readFile, mkdir} from 'node:fs/promises';
import {snapshot} from './collection-ui.mjs';
import {reveal} from './ui.mjs';

const browser = await chromium.launch({headless:true, executablePath:process.env.CHROMIUM_EXECUTABLE_PATH, args:['--no-sandbox']});
test.after(() => browser.close());
async function open(width = 1440) {
  const page = await browser.newPage({viewport:{width,height:900},acceptDownloads:true});
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('file://' + resolve('dist/presentation-studio.html'));
  await page.locator('#open-full-editor').click();
  return {page,errors};
}
test('laptop workbench protects the canvas and preserves explicit panel choices and project data',async()=>{
  const {page,errors}=await open(1024);
  try {
    await page.setViewportSize({width:1024,height:768});
    const before=await snapshot(page);
    assert.equal(await page.locator('#we-slides').isVisible(),false);
    assert((await page.locator('#fe-preview').boundingBox()).width>=480);
    await page.locator('#we-toggle-slides').click();
    await page.setViewportSize({width:1440,height:900});await page.setViewportSize({width:1024,height:768});
    assert.equal(await page.locator('#we-slides').isVisible(),true);
    await page.locator('#we-toggle-slides').click();
    const resize=page.getByRole('separator',{name:'Resize Inspector panel'});
    const original=Number(await resize.getAttribute('aria-valuenow'));
    await resize.focus();await resize.press('ArrowLeft');
    assert.equal(Number(await resize.getAttribute('aria-valuenow')),original+10);
    await page.setViewportSize({width:1366,height:768});
    assert.equal(Number(await resize.getAttribute('aria-valuenow')),original+10);
    assert.deepEqual((await snapshot(page)).state,before.state);
    assert.equal((await snapshot(page)).revision,before.revision);
    assert.deepEqual(errors,[]);
  } finally {await page.close();}
});
test('snap is a shared view preference and header Export downloads a complete editable backup',async()=>{
  const {page,errors}=await open();
  try {
    const before=await snapshot(page);
    await page.locator('#wb-snap').click();assert.equal(await page.locator('#wb-snap').getAttribute('aria-pressed'),'false');
    await reveal(page,'#sp-snap');assert.equal(await page.locator('#sp-snap').isChecked(),false);
    await page.locator('#sp-snap').check();assert.equal(await page.locator('#wb-snap').getAttribute('aria-pressed'),'true');
    const download=page.waitForEvent('download');await page.locator('#wb-export').click();
    const exported=await download;assert.match(exported.suggestedFilename(),/\.zip$/);assert((await readFile(await exported.path())).length>1000);
    assert.deepEqual((await snapshot(page)).state,before.state);
    assert.equal((await snapshot(page)).revision,before.revision);assert.deepEqual(errors,[]);
  } finally {await page.close();}
});
test('template position shortcut is explicit, preserves appearance and can be undone',async()=>{
  const {page,errors}=await open();
  try {
    const before=await snapshot(page);
    await page.locator('#fe-preview h1').click();
    const geometry=await page.locator('#fe-preview h1').boundingBox();
    await page.locator('#wb-customize').click();
    const customized=await page.locator('#fe-preview h1.db-template').boundingBox();
    for(const key of ['x','y','width','height'])assert(Math.abs(geometry[key]-customized[key])<2);
    await page.locator('#fe-undo').click();
    assert.deepEqual((await snapshot(page)).state,before.state);assert.deepEqual(errors,[]);
  } finally {await page.close();}
});
test('Library and Inspector navigation remain readable across themes and narrow screens',async()=>{
  const {page,errors}=await open(1024);
  try {
    await mkdir('test-results/workbench',{recursive:true});
    for(const dark of [false,true]) {
      await page.evaluate(dark=>document.body.classList.toggle('editor-dark',dark),dark);
      await page.setViewportSize({width:1024,height:768});
      for(const tab of await page.locator('#wp-tabs [role=tab]').all())assert.equal(await tab.evaluate(element=>getComputedStyle(element).whiteSpace),'nowrap');
      await page.screenshot({path:'test-results/workbench/'+(dark?'dark':'light')+'-laptop.png'});
      await page.locator('#component-open').click();
      await page.locator('#component-search').fill('');
      assert.equal(await page.getByRole('button',{name:'Clear search',exact:true}).isDisabled(),true);
      await page.locator('#component-search').fill('quote');assert.equal(await page.getByRole('button',{name:'Clear search',exact:true}).isEnabled(),true);
      await page.locator('#component-close').click();
    }
    await page.setViewportSize({width:640,height:768});
    assert.equal(await page.locator('#full-editor').evaluate(element=>element.scrollWidth<=element.clientWidth+1),true);
    assert.deepEqual(errors,[]);
  } finally {await page.close();}
});
