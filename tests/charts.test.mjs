import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import vm from 'node:vm';
import {archivePath} from './archive-path.mjs';
import {click,selectTab} from './ui.mjs';
import {openExample,snapshot,operations,exportZip,importZip} from './collection-ui.mjs';
const core=vm.createContext({});vm.runInContext(await readFile('src/runtime/charts-core.js','utf8'),core);
test('chart data contract rejects malformed shapes and unsafe numeric input',()=>{
  for(const expression of ["chartNormalize({...chartSample(),labels:[]})","chartNormalize({...chartSample(),series:[{name:'x',values:[NaN,2,3,4]}]})","chartNormalize({...chartSample('donut'),series:[{name:'x',values:[0,0,0,0]}]})","chartNormalize({...chartSample(),colors:['url(evil)']})","chartParse('Category,X\\nQ1,',chartSample())","chartParse('Category,X\\nQ1,Infinity',chartSample())"]){assert.throws(()=>vm.runInContext(expression,core));}
  assert.equal(vm.runInContext("chartParse('Category\\tOne\\nA\\t-3\\nB\\t4',chartSample()).series[0].values[0]",core),-3);
});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']});
test.after(()=>browser.close());
async function openCharts(page){await page.locator('#component-open').click();await page.getByRole('tab',{name:'Charts & Graphs',exact:true}).click();}
const charts=pack=>pack.state.slides[0].tree.filter(node=>node.attrs?.['data-studio-chart']);
test('POC gallery, staged data editing, Inspector, Undo and offline editable restore',async()=>{
  const {page,errors}=await openExample(browser,'portfolio-demo');
  try{
    await openCharts(page);assert.equal(await page.locator('.chart-library-card').count(),4);
    await page.getByRole('button',{name:'Customize Column chart',exact:true}).click();
    await page.locator('#chart-title').fill('Bookings');await page.getByLabel('Row 1 series 1',{exact:true}).fill('250');
    await page.locator('#chart-apply').click();assert.equal(await page.locator('#fe-preview .ps-chart svg').count(),1);
    assert.equal(JSON.parse(charts(await snapshot(page))[0].attrs['data-studio-chart']).series[0].values[0],250);
    await page.locator('#chart-edit').click();await page.locator('#chart-title').fill('Updated bookings');await page.locator('#chart-apply').click();
    assert.equal(JSON.parse(charts(await snapshot(page))[0].attrs['data-studio-chart']).title,'Updated bookings');
    await page.locator('#fe-undo').click();assert.equal(JSON.parse(charts(await snapshot(page))[0].attrs['data-studio-chart']).title,'Bookings');
    const expected=await snapshot(page),restored=await importZip(browser,await exportZip(page),expected.projectId);
    try{assert.deepEqual((await snapshot(restored)).state,expected.state);assert.equal(await restored.locator('#fe-preview .ps-chart svg').count(),1);}finally{await restored.close();}
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
});
test('paste validation, negative values, every chart kind, Cancel and lock guard',async()=>{
  const {page,errors}=await openExample(browser,'portfolio-demo',true);
  try{
    await openCharts(page);await page.getByRole('button',{name:'Customize Line chart',exact:true}).click();
    await page.locator('#chart-data-panel details').evaluate(el=>el.open=true);
    await page.locator('#chart-paste').fill('Category\tActual\nA\t-4\nB\t9');await page.locator('#chart-paste-apply').click();
    await page.locator('#chart-apply').click();const first=await snapshot(page),block=charts(first)[0],id=block.attrs.class.match(/block-[\w-]+/)[0],slideId=first.state.slides[0].id;
    await page.locator('#chart-edit').click();await page.getByLabel('Row 1 series 1',{exact:true}).fill('');assert.equal(await page.locator('#chart-apply').isDisabled(),true);await page.locator('#chart-cancel').click();assert.deepEqual((await snapshot(page)).state,first.state);
    for(const kind of ['column','bar','line','donut']){const data={...JSON.parse(block.attrs['data-studio-chart']),kind};if(kind==='donut')data.series[0].values=[4,9];assert.equal((await operations(page,[{type:'chart.update',slideId,blockId:id,chart:data}])).ok,true);assert.equal(await page.locator('#fe-preview .ps-chart svg').count(),1);}
    assert.equal((await operations(page,[{type:'design.meta',slideId,keys:[id],changes:{locked:true}}])).ok,true);
    assert.equal((await operations(page,[{type:'chart.update',slideId,blockId:id,chart:JSON.parse(block.attrs['data-studio-chart'])}])).ok,false);
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
});
test('saved chart components copy independently and both playback exports render offline',async()=>{
  const {page,errors}=await openExample(browser,'portfolio-demo');
  const zipVM={setImmediate,clearImmediate,setTimeout,clearTimeout,Uint8Array,ArrayBuffer,TextEncoder,TextDecoder};vm.runInNewContext(await readFile('vendor/jszip-3.10.1.min.js','utf8'),zipVM);
  try{
    await openCharts(page);await page.getByRole('button',{name:'Customize Donut chart',exact:true}).click();
    await page.locator('#chart-tab-style').click();await page.locator('#chart-theme').uncheck();for(const [index,color]of ['#8450df','#159d99','#d88b10','#cb527c'].entries())await page.getByLabel('Hex color for Q'+(index+1),{exact:true}).fill(color);await page.locator('#chart-apply').click();
    const original=charts(await snapshot(page))[0];
    await page.locator('#component-open').click();await page.locator('#component-save-panel').evaluate(el=>el.open=true);await page.locator('#component-name').fill('Quarterly donut');await page.locator('#component-save').click();
    const event=page.waitForEvent('download');await page.locator('#component-export').click();const libraryBytes=await readFile(await(await event).path());
    await page.getByRole('tab',{name:'My components',exact:true}).click();await page.getByRole('button',{name:'Insert Quarterly donut',exact:true}).click();
    const state=await snapshot(page),copies=charts(state);assert.equal(copies.length,2);assert.notEqual(copies[0].attrs.class,copies[1].attrs.class);assert.equal(copies[0].attrs['data-studio-chart'],copies[1].attrs['data-studio-chart']);
    const copyId=copies[1].attrs.class.match(/block-[\w-]+/)[0];assert.equal((await operations(page,[{type:'chart.update',slideId:state.state.slides[0].id,blockId:copyId,chart:{...JSON.parse(original.attrs['data-studio-chart']),title:'Independent'}}])).ok,true);assert.equal(charts(await snapshot(page))[0].attrs['data-studio-chart'],original.attrs['data-studio-chart']);
    const {page:clean,errors:cleanErrors}=await openExample(browser,'portfolio-demo');
    try{await clean.context().setOffline(true);await clean.locator('#component-open').click();await clean.locator('#component-import').setInputFiles({name:'charts-library.json',mimeType:'application/json',buffer:libraryBytes});await clean.getByRole('tab',{name:'My components',exact:true}).click();await clean.getByRole('button',{name:'Insert Quarterly donut',exact:true}).click();assert.equal(charts(await snapshot(clean)).length,1);assert.equal(await clean.locator('#fe-preview .ps-chart svg path').count(),4);assert.deepEqual(cleanErrors,[]);}finally{await clean.close();}
    for(const mode of ['playback','booth']){
      if(mode==='booth'){await selectTab(page,'Presentation settings');await click(page,'#booth-open');await page.locator('#booth-password').fill('chart-test-passphrase');await page.locator('#booth-confirm').fill('chart-test-passphrase');}
      const bytes=await exportZip(page,mode==='booth'?'#booth-export':'#fe-playback'),zip=await zipVM.JSZip.loadAsync(new Uint8Array(bytes)),folder=resolve('test-results/charts-'+mode);
      for(const [name,entry]of Object.entries(zip.files)){if(entry.dir)continue;const path=archivePath(folder,name);await mkdir(dirname(path),{recursive:true});await writeFile(path,await entry.async('uint8array'));}
      const reopened=await browser.newPage();reopened.on('pageerror',error=>errors.push(error.message));
      try{await reopened.context().setOffline(true);await reopened.goto('file://'+resolve(folder,'index.html'));await reopened.locator('#stage .ps-chart svg').first().waitFor({state:'attached'});assert.equal(await reopened.locator('#stage .ps-chart svg').count(),2);assert.equal(await reopened.locator('#stage .ps-chart .chart-data-disclosure table').count(),2);assert.equal(await reopened.locator('#stage .ps-chart svg path').first().getAttribute('stroke'),'#8450df');}finally{await reopened.close();}
    }
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
});
test('chart studio stays within narrow viewports and prevents stale apply',async()=>{
  const {page,errors}=await openExample(browser,'portfolio-demo');
  try{
    await openCharts(page);await page.getByRole('button',{name:'Customize Column chart',exact:true}).click();
    for(const width of [1024,600,390]){await page.setViewportSize({width,height:850});assert.equal(await page.locator('#chart-editor').evaluate(el=>el.scrollWidth<=el.clientWidth+1),true);}
    const before=await snapshot(page);assert.equal((await operations(page,[{type:'slide.update',slideId:before.state.slides[0].id,changes:{notes:'Concurrent update'}}])).ok,true);
    await page.locator('#chart-apply').click();assert.match(await page.locator('#chart-error').textContent(),/project changed/);assert.equal(charts(await snapshot(page)).length,0);
    await page.locator('#chart-cancel').click();assert.deepEqual(errors,[]);
  }finally{await page.close();}
});
test('inline category/series controls preserve values, color identity, staged edits and focus',async()=>{
  const {page,errors}=await openExample(browser,'portfolio-demo');
  try{
    await openCharts(page);await page.getByRole('button',{name:'Customize Column chart',exact:true}).click();
    const before=await snapshot(page);
    await page.locator('#chart-tab-style').click();await page.locator('#chart-theme').uncheck();
    await page.getByLabel('Color for Product',{exact:true}).fill('#e94560');await page.getByLabel('Color for Services',{exact:true}).fill('#08a080');
    assert.equal(await page.getByLabel('Hex color for Product',{exact:true}).inputValue(),'#e94560');
    await page.locator('#chart-tab-data').click();await page.getByRole('button',{name:'Remove series Product',exact:true}).click();
    assert.equal(await page.getByLabel('Series 1 name',{exact:true}).inputValue(),'Services');assert.equal(await page.getByLabel('Row 1 series 1',{exact:true}).inputValue(),'80');
    await page.getByRole('button',{name:'Add series',exact:true}).click();assert.equal(await page.getByLabel('Series 2 name',{exact:true}).evaluate(el=>el===document.activeElement),true);await page.getByLabel('Series 2 name',{exact:true}).fill('Forecast');
    await page.getByRole('button',{name:'Remove category Q2',exact:true}).click();assert.equal(await page.getByLabel('Row 2 series 1',{exact:true}).inputValue(),'130');
    await page.getByRole('button',{name:'Add category',exact:true}).click();assert.equal(await page.getByLabel('Category 4',{exact:true}).evaluate(el=>el===document.activeElement),true);await page.getByLabel('Category 4',{exact:true}).fill('Launch');await page.getByLabel('Row 4 series 1',{exact:true}).fill('77');
    await page.getByLabel('Row 2 series 1',{exact:true}).fill('');assert.equal(await page.locator('#chart-apply').isDisabled(),true);await page.getByRole('button',{name:'Remove category Q3',exact:true}).click();assert.equal(await page.locator('#chart-apply').isEnabled(),true);
    await page.getByRole('button',{name:'Remove series Forecast',exact:true}).click();await page.locator('#chart-tab-style').click();assert.equal(await page.getByLabel('Hex color for Services',{exact:true}).inputValue(),'#08a080');
    assert.deepEqual((await snapshot(page)).state,before.state);await page.locator('#chart-apply').click();
    const data=JSON.parse(charts(await snapshot(page))[0].attrs['data-studio-chart']);assert.deepEqual(data.labels,['Q1','Q4','Launch']);assert.deepEqual(data.series,[{name:'Services',values:[80,160,77]}]);assert.deepEqual(data.colors,['#08a080']);
    await page.locator('#chart-edit').click();await page.getByRole('button',{name:'Remove category Q1',exact:true}).click();await page.getByRole('button',{name:'Remove category Q4',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Remove category Launch',exact:true}).isDisabled(),true);assert.equal(await page.getByRole('button',{name:'Remove series Services',exact:true}).isDisabled(),true);
    await page.locator('#chart-cancel').click();await page.locator('#fe-undo').click();assert.equal(charts(await snapshot(page)).length,0);assert.deepEqual(errors,[]);
  }finally{await page.close();}
});
test('donut category pickers follow category deletion and theme reset without losing drafts',async()=>{
  const {page,errors}=await openExample(browser,'portfolio-demo',true);
  try{
    await openCharts(page);await page.getByRole('button',{name:'Customize Donut chart',exact:true}).click();
    await page.locator('#chart-tab-style').click();assert.equal(await page.getByLabel('Color for Q2',{exact:true}).isDisabled(),true);await page.locator('#chart-theme').uncheck();await page.getByLabel('Hex color for Q2',{exact:true}).fill('#c867af');
    await page.locator('#chart-tab-data').click();await page.getByRole('button',{name:'Remove category Q1',exact:true}).click();await page.locator('#chart-tab-style').click();assert.equal(await page.getByLabel('Color for Q2',{exact:true}).inputValue(),'#c867af');
    await page.locator('#chart-theme').check();await page.locator('#chart-theme').uncheck();assert.equal(await page.getByLabel('Hex color for Q2',{exact:true}).inputValue(),'#c867af');
    await page.getByLabel('Hex color for Q2',{exact:true}).fill('#bad');assert.equal(await page.locator('#chart-apply').isDisabled(),true);await page.getByLabel('Hex color for Q2',{exact:true}).fill('#c867af');await page.locator('#chart-apply').click();
    assert.equal(JSON.parse(charts(await snapshot(page))[0].attrs['data-studio-chart']).colors[0],'#c867af');assert.deepEqual(errors,[]);
  }finally{await page.close();}
});
test('charts reopened from the actual editable HTML can Cancel and Apply repeatedly',async()=>{
  const {page,errors}=await openExample(browser,'portfolio-demo');
  const zipVM={setImmediate,clearImmediate,setTimeout,clearTimeout,Uint8Array,ArrayBuffer,TextEncoder,TextDecoder};vm.runInNewContext(await readFile('vendor/jszip-3.10.1.min.js','utf8'),zipVM);
  try{
    await openCharts(page);await page.getByRole('button',{name:'Customize Column chart',exact:true}).click();await page.locator('#chart-apply').click();
    const zip=await zipVM.JSZip.loadAsync(new Uint8Array(await exportZip(page))),folder=resolve('test-results/charts-editable-reopen');
    for(const [name,entry]of Object.entries(zip.files)){if(entry.dir)continue;const path=archivePath(folder,name);await mkdir(dirname(path),{recursive:true});await writeFile(path,await entry.async('uint8array'));}
    const reopened=await browser.newPage({viewport:{width:1366,height:768}});reopened.setDefaultTimeout(5000);reopened.on('pageerror',error=>errors.push(error.message));
    try{
      await reopened.goto('file://'+resolve(folder,'index.html'));await reopened.locator('#open-full-editor').click();
      await reopened.locator('#fe-preview .ps-chart').click();assert.equal(await reopened.locator('#chart-editor').isVisible(),false);
      for(let index=0;index<2;index++){
        await reopened.locator('#fe-preview .ps-chart').dblclick();await reopened.locator('#chart-editor').waitFor({state:'visible'});await reopened.locator('#chart-title').fill('Discard me');await reopened.locator('#chart-cancel').click();await reopened.locator('#chart-editor').waitFor({state:'hidden'});
        await reopened.locator('#fe-preview .ps-chart').dblclick();await reopened.locator('#chart-title').fill('Reopened '+index);await reopened.locator('#chart-apply').click();await reopened.locator('#chart-editor').waitFor({state:'hidden'});
        assert.equal(JSON.parse(charts(await snapshot(reopened))[0].attrs['data-studio-chart']).title,'Reopened '+index);
      }
      assert.equal(await reopened.locator('#chart-editor').count(),1);
      await reopened.locator('#fe-preview .ps-chart').focus();await reopened.locator('#fe-preview .ps-chart').press('Enter');await reopened.locator('#chart-editor').waitFor({state:'visible'});await reopened.locator('#chart-title').press('Escape');await reopened.locator('#chart-editor').waitFor({state:'hidden'});
    }finally{await reopened.close();}
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
});
test('fractional chart totals, legend values and axis ticks retain nonzero precision offline',async()=>{
  const {page,errors}=await openExample(browser,'portfolio-demo');
  try{
    const initial=await snapshot(page),slideId=initial.state.slides[0].id;
    for(const [kind,values]of [['donut',[.001,.002]],['column',[.001,.002]],['line',[-.0000001,.0000002]]]){
      const result=await operations(page,[{type:'chart.insert',slideId,chart:{version:1,kind,title:'Small values',labels:['A','B'],series:[{name:'Series',values}],colors:[]}}]);assert.equal(result.ok,true);
    }
    const plots=page.locator('#fe-preview .ps-chart svg');
    assert.match(await plots.nth(0).textContent(),/0\.003/);assert.match(await plots.nth(0).textContent(),/A · 0\.001/);assert.match(await plots.nth(0).textContent(),/B · 0\.002/);
    for(const index of [1,2]){const ticks=await plots.nth(index).locator('text').allTextContents();assert.equal(new Set(ticks.slice(0,5)).size,5);}
    const expected=await snapshot(page),restored=await importZip(browser,await exportZip(page),expected.projectId);
    try{assert.match(await restored.locator('#fe-preview .ps-chart svg').first().textContent(),/0\.003/);assert.deepEqual((await snapshot(restored)).state,expected.state);}finally{await restored.close();}
    const zipVM={setImmediate,clearImmediate,setTimeout,clearTimeout,Uint8Array,ArrayBuffer,TextEncoder,TextDecoder};vm.runInNewContext(await readFile('vendor/jszip-3.10.1.min.js','utf8'),zipVM);
    for(const mode of ['playback','booth']){
      if(mode==='booth'){await selectTab(page,'Presentation settings');await click(page,'#booth-open');await page.locator('#booth-password').fill('chart-test-passphrase');await page.locator('#booth-confirm').fill('chart-test-passphrase');}
      const zip=await zipVM.JSZip.loadAsync(new Uint8Array(await exportZip(page,mode==='booth'?'#booth-export':'#fe-playback'))),folder=resolve('test-results/chart-fractions-'+mode);
      for(const [name,entry]of Object.entries(zip.files)){if(entry.dir)continue;const path=archivePath(folder,name);await mkdir(dirname(path),{recursive:true});await writeFile(path,await entry.async('uint8array'));}
      const reopened=await browser.newPage();reopened.on('pageerror',error=>errors.push(error.message));try{await reopened.context().setOffline(true);await reopened.goto('file://'+resolve(folder,'index.html'));await reopened.locator('#stage .ps-chart svg').first().waitFor({state:'attached'});assert.match(await reopened.locator('#stage .ps-chart svg').first().textContent(),/0\.003/);}finally{await reopened.close();}
    }
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
});
