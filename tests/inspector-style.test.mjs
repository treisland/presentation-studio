import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {resolve} from 'node:path';
import {addSlide,reveal} from './ui.mjs';

const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']});
test.after(()=>browser.close());
const read=page=>page.evaluate(()=>window.presentationStudioEditing.read());
async function open(){
  const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto('file://'+resolve('dist/presentation-studio.html'));
  await page.locator('#open-full-editor').click();await addSlide(page,'blank');
  return {page,errors};
}
async function block(page,kind='rectangle'){
  await reveal(page,'#db-palette');
  if(!await page.locator('#db-palette').evaluate(node=>node.open))await page.locator('#db-palette > summary').click();
  await page.locator('[data-db-kind="'+kind+'"]').click();
  return page.locator('#db-list').inputValue();
}
async function color(page,slot,tab='theme'){
  await reveal(page,'#is-color-'+slot);await page.locator('#is-color-'+slot).click();
  await page.locator('#is-tab-'+tab).click();
}
const apply=(page,operations)=>page.evaluate(operations=>{
  const api=window.presentationStudioEditing,s=api.read(),slideId=s.state.slides.find(slide=>slide.template==='blank').id;
  return api.apply({apiVersion:1,projectId:s.projectId,expectedRevision:s.revision,operations:operations.map(operation=>({slideId,...operation}))});
},operations);
function appearance(snapshot,id){const slide=snapshot.state.slides.find(slide=>slide.template==='blank');return snapshot.state.design?.slides?.[slide.id]?.objects?.[id]?.style;}

test('Style rows apply theme roles and custom opacity, cancel drafts, validate hex and restore row focus',async()=>{
  const {page,errors}=await open();try{
    await reveal(page,'#is-color-background');
    assert.equal(await page.locator('#is-color-background').isVisible(),true);
    const id=await block(page);await color(page,'fill');
    assert.equal(await page.locator('#is-color-background').isVisible(),false);
    await page.getByRole('button',{name:'Theme accent',exact:true}).focus();
    await page.keyboard.press('Enter');
    assert.equal(appearance(await read(page),id).fill.role,'accent');
    assert.match(await page.locator('#is-color-fill').textContent(),/Theme · Accent/);
    assert.equal(await page.evaluate(()=>document.activeElement.id),'is-color-fill');
    await color(page,'text','custom');const before=await read(page);
    await page.locator('#sp-hex').fill('#123456');await page.locator('#sp-opacity').fill('60');
    // Repainting the same slot must retain both valid and invalid drafts.
    await page.locator('#sp-slot').dispatchEvent('change');
    assert.equal(await page.locator('#sp-hex').inputValue(),'#123456');
    assert.equal(await page.locator('#sp-opacity').inputValue(),'60');
    await page.keyboard.press('Escape');assert.deepEqual((await read(page)).state,before.state);
    assert.equal(await page.evaluate(()=>document.activeElement.id),'is-color-text');
    await color(page,'text','custom');await page.locator('#sp-hex').fill('#oops');
    await page.locator('#sp-slot').dispatchEvent('change');
    assert.equal(await page.locator('#sp-hex').getAttribute('aria-invalid'),'true');
    await page.locator('#sp-custom').click();assert.deepEqual((await read(page)).state,before.state);
    await page.locator('#sp-hex').fill('#123456');await page.locator('#sp-opacity').fill('60');await page.locator('#sp-custom').click();
    assert.deepEqual(appearance(await read(page),id).text,{hex:'#123456',opacity:.6});
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
});

test('Mixed rows retain atomic locked batch protection',async()=>{
  const {page,errors}=await open();try{
    const a=await block(page),b=await block(page,'circle');
    assert.equal((await apply(page,[{type:'design.appearance',keys:[a],style:{fill:{hex:'#ff0000'}}},{type:'design.appearance',keys:[b],style:{fill:{hex:'#00ff00'}}}])).ok,true);
    await page.locator('#wp-tab-layers').click();await page.locator('.sp-layer-row[data-key="'+a+'"] input[type=checkbox]').check();
    await color(page,'fill');assert.match(await page.locator('#is-color-fill').textContent(),/Mixed/);
    await page.keyboard.press('Escape');
    assert.equal((await apply(page,[{type:'design.meta',keys:[a],changes:{locked:true}}])).ok,true);
    await color(page,'fill');assert.match(await page.locator('#is-scope').textContent(),/Locked/);
    assert.equal(await page.getByRole('button',{name:'Theme accent',exact:true}).isDisabled(),true);
    assert.equal(await page.locator('#sp-opacity').isDisabled(),true);
    const before=await read(page);
    assert.equal((await apply(page,[{type:'design.appearance',keys:[a,b],style:{fill:'transparent'}}])).code,'LOCKED');
    assert.deepEqual((await read(page)).state,before.state);assert.deepEqual(errors,[]);
  }finally{await page.close();}
});

test('selection, revision and legacy target changes invalidate pending color edits',async()=>{
  const {page,errors}=await open();try{
    const a=await block(page),b=await block(page,'circle');
    await color(page,'fill','custom');await page.locator('#sp-hex').fill('#abcdef');
    // Layers remains available while Style is active and changes the actual target.
    await page.locator('#ld-reveal-layers').click();
    await page.locator('.sp-layer-row[data-key="'+a+'"] button').first().click();
    assert.equal(await page.locator('#is-color-popover').evaluate(node=>node.matches(':popover-open')),false);
    assert.equal(appearance(await read(page),a)?.fill,undefined);
    assert.equal(appearance(await read(page),b)?.fill,undefined);
    await color(page,'fill','custom');await page.locator('#sp-hex').fill('#abcdef');
    assert.equal((await apply(page,[{type:'design.meta',keys:[a],changes:{name:'Renamed'}}])).ok,true);
    assert.equal(await page.locator('#is-color-popover').evaluate(node=>node.matches(':popover-open')),false);
    await color(page,'fill','custom');await page.locator('#sp-hex').fill('#abcdef');
    await page.locator('#sp-slot').evaluate(node=>{node.value='border';node.dispatchEvent(new Event('change',{bubbles:true}));});
    assert.equal(await page.locator('#is-color-popover').evaluate(node=>node.matches(':popover-open')),false);
    await color(page,'border','custom');assert.notEqual(await page.locator('#sp-hex').inputValue(),'#abcdef');
    await page.locator('#wb-brand').click();
    assert.equal(await page.locator('#is-color-popover').evaluate(node=>node.matches(':popover-open')),false);
    await color(page,'border');
    await page.locator('#is-color-text').click();
    assert.equal(await page.locator('#is-color-title').textContent(),'Text color');
    await page.locator('#is-color-popover header button').click();
    assert.equal(await page.evaluate(()=>document.activeElement.id),'is-color-text');
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
});

test('Project swatches, transparent and scoped reset preserve other targets; popup fits a narrow viewport',async()=>{
  const {page,errors}=await open();try{
    const id=await block(page);await color(page,'text','custom');
    await page.locator('#sp-hex').fill('#123456');await page.locator('#sp-custom').click();
    await color(page,'text','project');await page.locator('#sp-swatch-name').fill('Project navy');
    await page.locator('#sp-save-color').click();
    assert.deepEqual((await read(page)).state.design.palette,[{name:'Project navy',hex:'#123456'}]);
    await color(page,'fill','project');await page.getByRole('button',{name:'Project navy #123456',exact:true}).click();
    assert.equal(appearance(await read(page),id).fill.hex,'#123456');
    await color(page,'fill');await page.locator('#sp-transparent').click();
    assert.equal(appearance(await read(page),id).fill,'transparent');
    await color(page,'fill');await page.locator('#sp-inherit').click();
    assert.equal(appearance(await read(page),id).fill,null);
    assert.equal(appearance(await read(page),id).text.hex,'#123456');
    await page.setViewportSize({width:390,height:700});
    if(!await page.locator('#we-inspector').isVisible())await page.locator('#we-toggle-inspector').click();
    await color(page,'text','custom');
    const bounds=await page.locator('#is-color-popover').boundingBox();
    assert(bounds.x>=0&&bounds.y>=0&&bounds.x+bounds.width<=390&&bounds.y+bounds.height<=700);
    await page.locator('#sp-hex').fill('#abcdef');await page.keyboard.press('Escape');
    assert.equal(appearance(await read(page),id).text.hex,'#123456');
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
});
