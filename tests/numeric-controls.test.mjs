import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {openExample,snapshot,operations} from './collection-ui.mjs';
import {addSlide,reveal,openColorEditor,selectTab} from './ui.mjs';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']});
test.after(()=>browser.close());
async function block(page,create=true){if(create)await addSlide(page,'blank');await reveal(page,'#db-palette');if(!await page.locator('#db-palette').evaluate(el=>el.open))await page.locator('#db-palette > summary').click();await page.locator('[data-db-kind=rectangle]').click();return page.locator('#db-list').inputValue();}
async function drag(page,id,values,finish=true){await page.locator('#'+id+'-range').evaluate((range,{values,finish})=>{range.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));for(const value of values){range.value=value;range.dispatchEvent(new Event('input',{bubbles:true}));}if(finish)range.dispatchEvent(new PointerEvent('pointerup',{bubbles:true}));},{values,finish});}
function entry(state,id){const slide=state.slides.find(slide=>slide.template==='blank');return state.design?.slides?.[slide.id]?.objects[id];}

test('background sliders stage values, reverse speed, cancel inheritance and apply one undo step',async()=>{
  const {page,errors}=await openExample(browser,'portfolio-demo');try{
    const before=await snapshot(page);await page.locator('#we-settings-open').click();await page.locator('#we-tab-background').click();await page.locator('#bg-presentation .bg-advanced > summary').click();
    await drag(page,'bg-presentation-intensity',[60,70],false);assert.equal(await page.locator('#bg-presentation-intensity').inputValue(),'70');assert.deepEqual((await snapshot(page)).state,before.state);
    await page.locator('#bg-presentation-intensity-range').press('Escape');assert.equal(await page.locator('#bg-presentation-source').inputValue(),'inherit');
    await drag(page,'bg-presentation-intensity',[55,65,75]);assert.equal(await page.locator('#bg-presentation-strength').inputValue(),'expressive');
    await page.locator('#bg-presentation-speed-range').press('Home');assert.equal(await page.locator('#bg-presentation-speed').inputValue(),'120');
    await page.locator('#bg-presentation-speed-range').press('End');assert.equal(await page.locator('#bg-presentation-speed').inputValue(),'10');
    await page.locator('#bg-presentation-apply').click();assert.equal((await snapshot(page)).state.backgroundEffects.defaults.intensity,75);await page.locator('#we-settings-close').click();
    if(await page.locator('#ic-slide-settings').isVisible())await page.locator('#ic-slide-settings').click();
    await reveal(page,'.bg-slide-settings');
    if(!await page.locator('.bg-slide-settings').evaluate(el=>el.open))await page.locator('.bg-slide-settings > summary').click();
    await page.locator('.bg-slide-settings .bg-advanced > summary').click();
    await drag(page,'bg-slide-intensity',[60]);await page.locator('[data-numeric="bg-slide-intensity"] .nc-reset').click();assert.equal(await page.locator('#bg-slide-intensity').inputValue(),'75');assert.deepEqual((await snapshot(page)).state.backgroundEffects.slides,{});
    await page.locator('#fe-undo').click();assert.deepEqual((await snapshot(page)).state,before.state);assert.deepEqual(errors,[]);
  }finally{await page.close();}
});

test('appearance drag previews without mutations and release is one undo; invalid numbers and wheel are safe',async()=>{
  const {page,errors}=await openExample(browser,'portfolio-demo');try{
    const id=await block(page);await page.locator('#wp-tab-style').click();const before=await snapshot(page);
    await drag(page,'sp-border-width',[3,5,8],false);assert.deepEqual((await snapshot(page)).state,before.state);assert.equal(await page.locator('#fe-preview .'+id).evaluate(el=>el.style.borderWidth),'8px');
    await page.locator('#sp-border-width-range').dispatchEvent('pointerup');assert.equal(entry((await snapshot(page)).state,id).style.borderWidth,8);
    await page.locator('#fe-undo').click();assert.deepEqual((await snapshot(page)).state,before.state);
    await page.locator('#sp-border-width').fill('99');await page.locator('#sp-border-width').press('Tab');assert.equal(await page.locator('#sp-border-width').inputValue(),'0');assert.match(await page.locator('#sp-border-width-numeric-status').textContent(),/Previous value restored/);
    const unchanged=await snapshot(page);await page.locator('#sp-border-width-range').dispatchEvent('wheel',{deltaY:150});assert.deepEqual((await snapshot(page)).state,unchanged.state);assert.deepEqual(errors,[]);
  }finally{await page.close();}
});

test('opacity stays staged and formatting/geometry sliders are visible without reveal buttons',async()=>{
  const {page,errors}=await openExample(browser,'portfolio-demo');try{
    const id=await block(page);await page.locator('#wp-tab-style').click();await openColorEditor(page,'fill','custom');await page.locator('#sp-hex').fill('#123456');const before=await snapshot(page);
    await drag(page,'sp-opacity',[80,60]);assert.deepEqual((await snapshot(page)).state,before.state);assert.equal(await page.locator('#is-color-popover').evaluate(el=>el.matches(':popover-open')),true);
    await page.locator('#sp-custom').click();assert.equal(entry((await snapshot(page)).state,id).style.fill.opacity,.6);
    await page.locator('#wp-tab-arrange').click();const geometry=page.locator('[data-numeric="db-x"]');assert.equal(await geometry.locator('.nc-track').isVisible(),true);assert.equal(await page.locator('.nc-expand').count(),0);
    const positioned=await snapshot(page);await drag(page,'db-x',[25,30]);await page.locator('#fe-undo').click();assert.deepEqual((await snapshot(page)).state,positioned.state);
    await reveal(page,'#component-colors-trigger');await page.locator('#component-colors-trigger').click();
    assert.equal(await page.locator('#component-border-width-range').isVisible(),true);assert.equal(await page.locator('#component-opacity-range').isVisible(),true);assert.deepEqual(errors,[]);
  }finally{await page.close();}
});

test('panel widths are view-only and branding slider release is one undo step',async()=>{
  const {page,errors}=await openExample(browser,'portfolio-demo');try{
    const before=await snapshot(page);await drag(page,'we-size-inspector',[300,350,400]);assert.deepEqual((await snapshot(page)).state,before.state);assert.equal(await page.locator('#we-size-inspector').inputValue(),'400');
    await selectTab(page,'Branding');const brand=await snapshot(page);await drag(page,'nx-logo-size',[44,50,60]);await page.locator('#we-settings-close').click();assert.equal((await snapshot(page)).state.brand.logoSize,60);await page.locator('#fe-undo').click();assert.deepEqual((await snapshot(page)).state,brand.state);assert.deepEqual(errors,[]);
  }finally{await page.close();}
});

test('numeric keyboard modifiers, stale selections and locks preserve atomic editing',async()=>{
  const {page,errors}=await openExample(browser,'portfolio-demo');try{
    const id=await block(page);await page.locator('#wp-tab-arrange').click();
    await page.locator('#sp-rotation-range').press('Shift+ArrowRight');assert.equal(entry((await snapshot(page)).state,id).rotation,10);
    const current=await snapshot(page),slide=current.state.slides.find(slide=>slide.template==='blank');
    await drag(page,'sp-rotation',[15,20],false);assert.equal((await operations(page,[{type:'design.meta',slideId:slide.id,keys:[id],changes:{locked:true}}])).ok,true);
    await page.locator('#sp-rotation-range').dispatchEvent('pointerup');assert.equal(entry((await snapshot(page)).state,id).rotation,10);assert.equal(await page.locator('#sp-rotation-range').isDisabled(),true);assert.deepEqual(errors,[]);
  }finally{await page.close();}
});

test('font sliders preserve selected text and reset removes the explicit size override',async()=>{
  const {page,errors}=await openExample(browser,'portfolio-demo');try{
    const heading=page.locator('#fe-preview h1,#fe-preview h2').first();await heading.click();await reveal(page,'#we-font-size');const before=await snapshot(page);
    await drag(page,'we-font-size',[50,60,68]);assert.equal(await heading.evaluate(el=>getComputedStyle(el).fontSize),'68px');
    const sized=await snapshot(page);await page.locator('#we-font-size').fill('68.5');await page.locator('#we-font-size').press('ArrowLeft');assert.equal(await page.locator('#we-font-size').inputValue(),'68.5');assert.deepEqual((await snapshot(page)).state,sized.state);await page.locator('#we-font-size').press('Escape');
    await reveal(page,'#we-font-size');await page.locator('#we-font-size-range').press('ArrowUp');assert.equal(await page.evaluate(()=>document.activeElement.id),'we-font-size-range');await page.locator('#fe-undo').click();
    await heading.click();await reveal(page,'#we-font-size');await page.locator('[data-numeric="we-font-size"] .nc-reset').click();assert.notEqual(await heading.evaluate(el=>getComputedStyle(el).fontSize),'68px');
    await page.locator('#fe-undo').click();assert.equal(await heading.evaluate(el=>getComputedStyle(el).fontSize),'68px');await page.locator('#fe-undo').click();assert.deepEqual((await snapshot(page)).state,before.state);assert.deepEqual(errors,[]);
  }finally{await page.close();}
});

test('mixed batch values stay mixed until intentionally adjusted',async()=>{
  const {page,errors}=await openExample(browser,'portfolio-demo');try{
    const a=await block(page),b=await block(page,false),state=(await snapshot(page)).state,slideId=state.slides.find(slide=>slide.template==='blank').id;
    assert.equal((await operations(page,[{type:'design.appearance',slideId,keys:[a],style:{borderWidth:2}},{type:'design.appearance',slideId,keys:[b],style:{borderWidth:6}}])).ok,true);
    await selectTab(page,'Layers');await page.locator('.sp-layer-row[data-key="'+a+'"] input[type=checkbox]').check();await page.locator('.sp-layer-row[data-key="'+b+'"] input[type=checkbox]').check();await page.locator('#wp-tab-style').click();
    assert.equal(await page.locator('#sp-border-width').inputValue(),'');assert.match(await page.locator('#sp-border-width-range').getAttribute('aria-valuetext'),/Mixed/);const mixed=await snapshot(page);
    await page.locator('#sp-border-width-range').press('Home');assert.equal(entry((await snapshot(page)).state,a).style.borderWidth,0);assert.equal(entry((await snapshot(page)).state,b).style.borderWidth,0);
    await page.locator('#fe-undo').click();assert.deepEqual((await snapshot(page)).state,mixed.state);assert.deepEqual(errors,[]);
  }finally{await page.close();}
});

test('media overlay keeps its preview and commits one undo at slider release',async()=>{
  const {page,errors}=await openExample(browser,'template');try{
    await page.locator('.fe-slide-button[data-slide-id="studio-media"]').click();
    await page.locator('#fe-preview .media-box').first().click();await reveal(page,'#vb-panel');await page.locator('#vb-panel').click();
    await reveal(page,'#mi-layout');await page.locator('#mi-layout').selectOption('background');const before=await snapshot(page);
    await drag(page,'mi-overlay',[30,40,70],false);assert.deepEqual((await snapshot(page)).state,before.state);
    await page.locator('#mi-overlay-range').dispatchEvent('pointerup');assert.notDeepEqual((await snapshot(page)).state,before.state);
    await page.locator('#fe-undo').click();assert.deepEqual((await snapshot(page)).state,before.state);assert.deepEqual(errors,[]);
  }finally{await page.close();}
});
