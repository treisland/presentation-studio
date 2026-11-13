import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {openExample,snapshot} from './collection-ui.mjs';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']});test.after(()=>browser.close());
test('Library tabs retain labels, icons and keyboard selection across all four categories',async()=>{
 const {page,errors}=await openExample(browser,'template');try{
  const before=await snapshot(page);await page.locator('#component-open').click();
  for(const name of ['Blocks','Widgets','My components','Data & Code']){const tab=page.getByRole('tab',{name,exact:true});await tab.click();assert.equal(await tab.locator('svg[aria-hidden=true]').count(),1);assert.equal(await tab.getAttribute('aria-selected'),'true');assert.equal(await page.locator('#cn-filters').isVisible(),name==='Blocks');}
  await page.getByRole('tab',{name:'Blocks',exact:true}).focus();await page.keyboard.press('ArrowRight');assert.equal(await page.getByRole('tab',{name:'Widgets',exact:true}).getAttribute('aria-selected'),'true');
  assert.deepEqual((await snapshot(page)).state,before.state);assert.deepEqual(errors,[]);
 }finally{await page.close();}
});
test('Blocks filters combine with scoped search and clear/no-results paths remain reachable',async()=>{
 const {page,errors}=await openExample(browser,'template');try{
  await page.locator('#component-open').click();
  for(const name of ['Text','Shapes','Media','All']){await page.locator('#cn-filters').getByRole('button',{name,exact:true}).click();assert.equal(await page.locator('#cn-filters [aria-pressed=true]').textContent(),name);assert(await page.locator('#component-items article').count()>0);}
  await page.locator('#cn-filters').getByRole('button',{name:'Shapes',exact:true}).click();await page.locator('#component-search').fill('image');assert.equal(await page.locator('#component-items article').count(),0);assert.match(await page.locator('.component-empty').textContent(),/No results/);
  await page.getByRole('button',{name:'Clear search',exact:true}).click();assert(await page.locator('#component-items article').count()>0);assert.equal(await page.locator('#component-search').evaluate(n=>n===document.activeElement),true);
  await page.locator('#cn-filters').getByRole('button',{name:'Media',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Insert image or video…',exact:true}).count(),1);assert.deepEqual(errors,[]);
 }finally{await page.close();}
});
