import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium} from 'playwright';
import {click} from './ui.mjs';
import {operations,snapshot,exportZip,importZip} from './collection-ui.mjs';

const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']});
test.after(()=>browser.close());
const examples=await Promise.all(['example','project-update','technical-walkthrough'].map(async name=>JSON.parse(await readFile(`docs/ai/${name}.json`,'utf8'))));
await mkdir('test-results',{recursive:true});
await writeFile('test-results/authoring-layouts-fixture.html',(await readFile('dist/presentation-studio.html','utf8')).replace('  projectInit();',`
window.__paTest={build:paBuild,measure:paMeasureFit,validate:paValidate,pack:()=>projectPack(),catalog:paCatalog,
  fields:()=>Object.fromEntries([...componentTypes].map(([key,value])=>[key,value.fields||[]]))};
  projectInit();`));
async function setup(){
  const page=await browser.newPage({acceptDownloads:true,viewport:{width:1366,height:900}}),errors=[],requests=[];
  page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));page.on('request',request=>{if(/^https?:/.test(request.url()))requests.push(request.url());});
  await page.goto('file://'+resolve('test-results/authoring-layouts-fixture.html'));await page.locator('#open-full-editor').click();
  return{page,errors,requests};
}
async function stage(page,document){
  await click(page,'#lw-open');await page.locator('#lw-tab-create').click();
  await page.locator('#lw-json').fill(JSON.stringify(document));await page.locator('#lw-validate').click();
  await page.waitForFunction(()=>document.querySelector('#lw-panel').getAttribute('aria-busy')==='false');
  assert.equal(await page.locator('#pa-preview-select').count(),1,await page.locator('#lw-message').textContent());
}
async function accept(page){
  await page.locator('#lw-review-open').click();
  if(await page.locator('#hub-switch').evaluate(el=>el.open))await page.locator('#hub-save-switch').click();
  await page.locator('#lw-panel').waitFor({state:'hidden'});
}
const blockID=node=>node.attrs.class.match(/\bblock-[\w-]+/)?.[0];

test('all bundled examples and old v1 use native Library definitions without mutating the active project',async()=>{
  const {page,errors}=await setup();try{
    const result=await page.evaluate(examples=>{
      const before=JSON.stringify(__paTest.pack()),packs=examples.map(document=>__paTest.build(document));
      return{same:JSON.stringify(__paTest.pack())===before,layouts:packs.map(item=>item.report.map(row=>row.selected)),
        fields:__paTest.fields(),catalog:__paTest.catalog(),states:packs.map(item=>item.pack.state),fits:packs.slice(1).map(item=>__paTest.measure(item.pack))};
    },examples);
    assert(result.same);assert.deepEqual(result.layouts[1],['hero','comparison','workflow']);assert.deepEqual(result.layouts[2],['hero','table','code','flexible']);
    for(const type of ['quote','metric','callout','step'])assert.deepEqual(result.fields[type].map(field=>field[2]),result.catalog.elements[type].fields);
    const steps=Object.values(result.states[1].design.slides['authoring-slide-3'].objects).filter(item=>item.annotation?.kind==='step');
    assert.deepEqual(steps.map(item=>item.annotation.number),[1,2,3]);
    assert(result.states[2].slides[1].tree.some(node=>node.attrs.class.includes('db-table')));
    assert.equal(result.states[2].slides[2].commands.language,'Python');assert.deepEqual(errors,[]);
    assert(result.fits.flat().every(messages=>messages.length===0),JSON.stringify(result.fits));
    const shipped=JSON.parse(await readFile('dist/ai-authoring/capabilities.json','utf8'));assert.deepEqual(shipped,result.catalog);
  }finally{await page.close();}
});

test('post-import reflow keeps IDs and content, rejects locks and undoes as one change',async()=>{
  const {page,errors}=await setup();try{
    await stage(page,examples[1]);await accept(page);const before=await snapshot(page),slide=before.state.slides[0];
    await click(page,'#pa-reflow-open');await page.locator('#pa-reflow-layout').selectOption('flexible');await page.locator('#pa-reflow-apply').click();
    assert.match(await page.locator('#pa-reflow-message').textContent(),/Applied Flexible/);
    const after=await snapshot(page);assert.match(after.state.slides[0].classes,/pa-layout-flexible/);
    assert.deepEqual(after.state.slides[0].tree.map(blockID),slide.tree.map(blockID));
    assert.deepEqual(after.state.slides[0].tree.map(node=>node.children),slide.tree.map(node=>node.children));
    assert.equal(after.state.slides[0].notes,slide.notes);
    await page.locator('#pa-reflow-close').click();await page.locator('#fe-undo').click();assert.deepEqual((await snapshot(page)).state,before.state);
    const key=blockID(slide.tree[1]);assert.equal((await operations(page,[{type:'design.meta',slideId:slide.id,keys:[key],changes:{locked:true}}])).ok,true);
    const locked=await snapshot(page);const rejected=await operations(page,[{type:'authoring.layout',slideId:slide.id,layout:'comparison'}]);assert.equal(rejected.ok,false);
    assert.deepEqual((await snapshot(page)).state,locked.state);assert.deepEqual(errors,[]);
  }finally{await page.close();}
});

test('preview is inert and isolated; explicit overrides and incompatible layouts are explained without dropping content',async()=>{
  const {page,errors,requests}=await setup();try{
    const before=await snapshot(page),document=structuredClone(examples[1]);document.slides[0].layout='workflow';
    document.slides[0].sources=[{label:'Unverified demonstration source',url:'https://example.com/source'}];
    await stage(page,document);
    assert.match(await page.locator('#pa-review-warnings').innerText(),/incompatible.*Flexible/);
    assert.equal(await page.locator('.pa-review-viewport>.pa-review-stage').evaluate(el=>el.inert),true);
    assert.deepEqual((await snapshot(page)).state,before.state);assert.equal((await snapshot(page)).projectId,before.projectId);
    await page.locator('#pa-layout-override').selectOption('comparison');
    await page.waitForFunction(()=>document.querySelector('#pa-preview-description').textContent.includes('Comparison'));
    assert.equal(await page.locator('.pa-review-viewport .pa-layout-comparison').count(),1);
    assert.equal(await page.locator('.pa-review-viewport .component-callout').count(),1);
    assert.deepEqual((await snapshot(page)).state,before.state);
    await page.screenshot({path:'test-results/authoring-preview.png',fullPage:true});
    await page.setViewportSize({width:540,height:800});
    assert.equal(await page.locator('#lw-panel').evaluate(el=>el.scrollWidth<=el.clientWidth+2),true);
    await page.screenshot({path:'test-results/authoring-preview-small.png',fullPage:true});
    await page.setViewportSize({width:1366,height:900});
    await accept(page);assert.equal((await snapshot(page)).state.slides[0].classes.includes('pa-layout-comparison'),true);
    assert.equal((await snapshot(page)).state.slides[0].notes,document.slides[0].notes);
    assert.equal(await page.locator('#fe-preview .pa-sources a').getAttribute('href'),'https://example.com/source');
    assert.deepEqual(requests,[]);assert.deepEqual(errors,[]);
  }finally{await page.close();}
});

test('imported widgets edit, move, resize, rename, lock, remove and Undo through native operations, then reopen offline',async()=>{
  const {page,errors}=await setup();try{
    await stage(page,examples[1]);await accept(page);
    let current=await snapshot(page);const id=current.state.slides[1].id;
    const metric=current.state.slides[1].tree.find(node=>node.attrs.class.includes('component-metric')),key=blockID(metric);
    const result=await operations(page,[{type:'component.field',slideId:id,blockId:key,index:0,text:'4'},
      {type:'block.place',slideId:id,blockId:key,placement:{x:.1,y:.3,w:.35,h:.4}},
      {type:'element.rename',slideId:id,keys:[key],name:'Planning result'}]);assert.equal(result.ok,true,JSON.stringify(result));
    current=await snapshot(page);assert.equal(current.state.slides[1].tree.find(node=>blockID(node)===key).children[0].children[0].text,'4');
    assert.equal(current.state.design.slides[id].objects[key].name,'Planning result');
    assert.equal((await operations(page,[{type:'design.meta',slideId:id,keys:[key],changes:{locked:true}}])).ok,true);
    assert.equal((await operations(page,[{type:'block.remove',slideId:id,blockId:key}])).ok,false);
    assert.equal((await operations(page,[{type:'design.meta',slideId:id,keys:[key],changes:{locked:false}}])).ok,true);
    const before=await snapshot(page);assert.equal((await operations(page,[{type:'block.remove',slideId:id,blockId:key}])).ok,true);
    await page.locator('#fe-undo').click();assert.deepEqual((await snapshot(page)).state,before.state);
    const restored=await importZip(browser,await exportZip(page),before.projectId);
    try{assert.deepEqual((await snapshot(restored)).state,before.state);}finally{await restored.close();}
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
});

test('readable default fonts, long-title/overflow warnings, code substitutions and image placeholders preserve all text',async()=>{
  const {page,errors}=await setup();try{
    const document={format:'presentation-studio-authoring',version:1,title:'Fit review',slides:[{
      title:'A long title '.repeat(15),layout:'flexible',blocks:[
        {type:'paragraph',text:'A substantial explanation '.repeat(120)},
        {type:'code',language:'text',text:'first snippet'},
        {type:'code',language:'text',text:'second snippet'},
        {type:'image-placeholder',text:'Add an original diagram'}],
      sources:[{label:'Source for review',url:'https://example.com/source'}]}]};
    await stage(page,document);
    const warnings=await page.locator('#pa-review-warnings').innerText();assert.match(warnings,/Content does not fit/);assert.match(warnings,/Additional code snippet/);assert.match(warnings,/Image placeholder/);
    assert.equal(await page.locator('.pa-fit-host').count(),0);
    await accept(page);
    assert.equal(await page.locator('#fe-preview .pa-title h1').textContent(),document.slides[0].title);
    assert.equal(await page.locator('#fe-preview .pa-paragraph > p').first().textContent(),document.slides[0].blocks[0].text);
    const fonts=await page.evaluate(()=>['.pa-title h1','.pa-paragraph p','.pa-sources p'].map(selector=>parseFloat(getComputedStyle(document.querySelector('#fe-preview '+selector)).fontSize)));
    assert.deepEqual(fonts,[64,36,24]);assert.equal(await page.locator('#fe-preview .terminal').count(),1);
    assert.match(await page.locator('#fe-preview .pa-code').last().textContent(),/second snippet/);assert.deepEqual(errors,[]);
  }finally{await page.close();}
});

test('repair aggregates field errors, rejects invented capabilities and explains truncated JSON',async()=>{
  const {page,errors}=await setup();try{
    await click(page,'#lw-open');await page.locator('#lw-json').fill('{"format":');await page.locator('#lw-validate').click();
    await page.waitForFunction(()=>document.querySelector('#lw-repair').value.includes('Could not parse JSON'));
    assert.match(await page.locator('#lw-repair').inputValue(),/complete JSON|complete JSON document|complete document/);
    const document=structuredClone(examples[1]);document.slides[0].layout='invented';document.slides[1].blocks[0].type='personal-component';document.slides[2].blocks[0].number=0;
    await page.locator('#lw-json').fill(JSON.stringify(document));await page.locator('#lw-validate').click();
    await page.waitForFunction(()=>document.querySelector('#lw-repair').value.includes('unsupported block type'));
    const message=await page.locator('#lw-repair').inputValue();assert.match(message,/slides\[0\].layout/);assert.match(message,/slides\[1\].blocks\[0\]/);assert.match(message,/slides\[2\].blocks\[0\].number/);
    assert.equal(await page.locator('#lw-review-open').isDisabled(),true);assert.deepEqual(errors,[]);
  }finally{await page.close();}
});
