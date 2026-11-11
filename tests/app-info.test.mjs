import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium} from 'playwright';
import {openExample,exportZip} from './collection-ui.mjs';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH});
test.after(()=>browser.close());
test('About reports loaded build offline, provides private-data-free diagnostics and returns keyboard focus',async()=>{
 const {page,errors}=await openExample(browser,'portfolio-demo');try{
  await page.context().setOffline(true);
  const expected=JSON.parse(await readFile('dist/version.json','utf8'));
  await page.locator('#app-editor-version').click();
  assert.equal(await page.locator('#app-about-version').textContent(),'v'+expected.version);
  assert.equal(await page.locator('#app-about-channel').textContent(),expected.channel);
  await page.locator('#app-about summary').click();assert.match(await page.locator('#app-about').textContent(),/Native editable projects: format v2/);
  await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{value:undefined,configurable:true}));
  await page.locator('#app-copy-diagnostics').click();const data=JSON.parse(await page.locator('#app-diagnostics').inputValue());
  assert.equal(data.commit,expected.commit);assert.deepEqual(Object.keys(data).sort(),['application','browser','channel','commit','dirty','imports','version']);
  assert(!JSON.stringify(data).includes('file:'));assert(!JSON.stringify(data).includes('community library'));
  await page.keyboard.press('Escape');assert.equal(await page.locator('#app-about').evaluate(d=>d.open),false);
  assert.equal(await page.locator('#app-editor-version').evaluate(e=>e===document.activeElement),true);
  await page.locator('#hub-project-menu > summary').click();await page.locator('#app-menu-about').click();assert.equal(await page.locator('#app-about').evaluate(d=>d.open),true);
  await page.locator('#app-about-close').click();
  assert.deepEqual(errors,[]);
 }finally{await page.close();}
});
test('playback exports retain embedded identity but never show authoring version controls',async()=>{
 const {page}=await openExample(browser,'portfolio-demo');try{
  const zip=await exportZip(page,'#fe-playback');
  const html=await page.evaluate(async bytes=>{const zip=await JSZip.loadAsync(new Uint8Array(bytes));return zip.file('index.html').async('string');},[...zip]);
  assert(html.includes('id="studio-build-info"'));
  const folder=resolve('test-results/app-info');await mkdir(folder,{recursive:true});await writeFile(resolve(folder,'playback.html'),html);
  const playback=await browser.newPage();try{await playback.goto('file://'+resolve(folder,'playback.html'));assert.equal(await playback.locator('.app-version:visible').count(),0);assert.equal(await playback.locator('#app-about').count(),0);}finally{await playback.close();}
 }finally{await page.close();}
});
