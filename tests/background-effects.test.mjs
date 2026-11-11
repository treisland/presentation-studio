import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import vm from 'node:vm';
import {chromium} from 'playwright';
import {openExample,snapshot,operations,exportZip,importZip} from './collection-ui.mjs';
import {selectTab,click,reveal} from './ui.mjs';
import {archivePath} from './archive-path.mjs';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']});
test.after(()=>browser.close());
const context=vm.createContext({URL});vm.runInContext(await readFile('src/runtime/background-effects-core.js','utf8'),context);const engine=vm.runInContext('bgEngine',context);
const zipContext={setImmediate,clearImmediate,setTimeout,clearTimeout,Uint8Array,ArrayBuffer,TextEncoder,TextDecoder};vm.runInNewContext(await readFile('vendor/jszip-3.10.1.min.js','utf8'),zipContext);
const JSONcopy=value=>JSON.parse(JSON.stringify(value));
async function set(page,config,scope='presentation',extra={}){const id=(await snapshot(page)).state.slides[0].id;const result=await operations(page,[{type:'background.set',scope,slideId:id,config,...extra}]);assert.equal(result.ok,true,result.message);return result;}
async function jsonExport(page){const download=page.waitForEvent('download');await click(page,'#fe-export-json');return JSON.parse(await readFile(await(await download).path(),'utf8'));}
async function unpack(bytes,name){const zip=await zipContext.JSZip.loadAsync(new Uint8Array(bytes)),folder=resolve('test-results/bg-'+name);for(const file of Object.values(zip.files)){if(file.dir)continue;const path=archivePath(folder,file.name);await mkdir(dirname(path),{recursive:true});await writeFile(path,await file.async('uint8array'));}return folder;}

test('effect contract rejects executable/unknown options and exposes matching bounded AI schema',async()=>{
  assert.throws(()=>engine.clean({effect:'shader',url:'https://example.test'}),/Unsupported/);
  for(const raw of [{effect:'aurora',speed:0},{effect:'orbit',scale:1000},{effect:'waves',quiet:'yes'},{effect:'drift',colors:['url(a)','accent','muted']},{effect:'none',intensity:Infinity}])assert.throws(()=>engine.clean(raw));
  assert.throws(()=>engine.settings({version:2,slides:{}}),/version/);
  const schema=JSON.parse(await readFile('dist/ai-authoring/presentation.schema.json','utf8')),catalog=JSON.parse(await readFile('dist/ai-authoring/capabilities.json','utf8'));
  assert.deepEqual(schema.properties.background,JSONcopy(engine.schema()));assert.deepEqual(catalog.backgrounds.options,schema.properties.background);
  assert.deepEqual(catalog.backgrounds.presets,JSONcopy(engine.names));
  const palette={accent:'#0066ff',secondary:'#666666',muted:'#777777',background:'#f4f6f8'},before=JSONcopy(palette);
  const coordinated=engine.palette({effect:'aurora'},palette);assert.equal(coordinated[0],palette.accent);assert.notEqual(coordinated[1],palette.secondary);assert.notEqual(coordinated[2],palette.muted);
  assert.deepEqual(JSONcopy(engine.palette({effect:'aurora',colors:['#123456','#abcdef','#789abc']},palette)),['#123456','#abcdef','#789abc']);
  const monochrome=engine.palette({effect:'aurora'},{...palette,accent:'#888888'});assert.ok(monochrome.every(color=>color.slice(1,3)===color.slice(3,5)&&color.slice(3,5)===color.slice(5,7)));assert.deepEqual(palette,before);
});

test('Constellation renders all three custom palette colors in both quality modes',async()=>{
  const {page,errors}=await openExample(browser,'portfolio-demo');try{
    for(const quality of ['standard','reduced']){
      await set(page,{effect:'constellation',mode:'static',quality,colors:['#123456','#ab34cd','#e56789']});
      const points=page.locator('#fe-preview > .me-preview-stage > .bg-effect .bg-network-point');
      const colors=await points.evaluateAll(nodes=>nodes.map(node=>getComputedStyle(node).fill));
      assert.ok(colors.includes('rgb(18, 52, 86)'));assert.ok(colors.includes('rgb(171, 52, 205)'));assert.ok(colors.includes('rgb(229, 103, 137)'));
      await set(page,{effect:'constellation',mode:'static',quality,colors:['#123456','#ab34cd','#2468ac']});
      assert.equal(await points.nth(2).evaluate(node=>getComputedStyle(node).fill),'rgb(36, 104, 172)');
    }assert.deepEqual(errors,[]);
  }finally{await page.close();}
});

test('Orbit renders and updates every custom palette slot in both quality modes',async()=>{
  const {page,errors}=await openExample(browser,'portfolio-demo');try{
    for(const quality of ['standard','reduced']){
      await set(page,{effect:'orbit',mode:'static',quality,colors:['#123456','#ab34cd','#e56789']});
      const rings=page.locator('#fe-preview > .me-preview-stage > .bg-effect .bg-orbit-ring');
      const colors=await rings.evaluateAll(nodes=>nodes.map(node=>({fill:getComputedStyle(node).fill,stroke:getComputedStyle(node).stroke})));
      for(const color of ['rgb(18, 52, 86)','rgb(171, 52, 205)','rgb(229, 103, 137)'])assert.ok(colors.some(value=>value.fill===color&&value.stroke===color));
      await set(page,{effect:'orbit',mode:'static',quality,colors:['#123456','#3579bd','#2468ac']});
      assert.equal(await rings.nth(1).evaluate(node=>getComputedStyle(node).stroke),'rgb(53, 121, 189)');
      assert.equal(await rings.nth(2).evaluate(node=>getComputedStyle(node).stroke),'rgb(36, 104, 172)');
    }assert.deepEqual(errors,[]);
  }finally{await page.close();}
});

test('untouched projects stay v2; configured effects and their history use guarded v3',async()=>{
  const {page,errors}=await openExample(browser,'portfolio-demo');try{
    const initial=await jsonExport(page);assert.equal(initial.schemaVersion,2);
    await set(page,{effect:'aurora'});const configured=await jsonExport(page);assert.equal(configured.schemaVersion,3);assert.equal(configured.state.backgroundEffects.defaults.effect,'aurora');assert.equal(configured.meta.id,initial.meta.id);
    await page.locator('#fe-undo').click();const undone=await jsonExport(page);assert.equal(undone.schemaVersion,3);assert.equal(undone.state.backgroundEffects,undefined);assert.equal(undone.history.future.at(-1).backgroundEffects.defaults.effect,'aurora');
    await page.locator('#fe-redo').click();assert.equal((await snapshot(page)).state.backgroundEffects.defaults.effect,'aurora');assert.deepEqual(errors,[]);
  }finally{await page.close();}
});

test('all presets remain inert/static in editor and thumbnail and retain bounded node counts',async()=>{
  const {page,errors}=await openExample(browser,'portfolio-demo');try{
    for(const effect of Object.keys(engine.names)){
      await set(page,{effect,intensity:70,colors:['#8a32bb','secondary','muted']});
      const layer=page.locator('#fe-preview > .me-preview-stage > .bg-effect');assert.equal(await layer.getAttribute('data-effect'),effect);
      assert.ok(await layer.locator('.bg-particle').count()<=24);assert.equal(await layer.getAttribute('data-motion'),'off');
      assert.ok(await layer.locator('*').count()<=23,'bounded complete decoration tree: '+effect);
      assert.equal(await layer.evaluate(el=>getComputedStyle(el).pointerEvents),'none');assert.equal(await layer.evaluate(el=>el.style.getPropertyValue('--bg-0')),'#8a32bb');
      assert.equal(await layer.isVisible(),effect!=='none');
      const thumb=page.locator('.fe-slide-button[aria-current=true] .bg-effect');await thumb.waitFor({state:'attached'});assert.equal(await thumb.getAttribute('data-motion'),'off');
    }
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
});

test('defaults, explicit None, static slide overrides, reset, duplication and locks are independent',async()=>{
  const {page,errors}=await openExample(browser,'portfolio-demo');try{
    await set(page,{effect:'waves'});await set(page,{effect:'none'},'slide');
    assert.equal(await page.locator('#fe-preview > .me-preview-stage > .bg-effect').getAttribute('data-effect'),'none');
    await set(page,{effect:'drift',mode:'static'},'slide');const before=await snapshot(page),id=before.state.slides[0].id;
    await page.locator('#fe-duplicate').click();const duplicate=await snapshot(page),copy=duplicate.state.slides[1];assert.notEqual(copy.id,id);assert.deepEqual(duplicate.state.backgroundEffects.slides[copy.id],before.state.backgroundEffects.slides[id]);
    await page.locator('#fe-undo').click();await set(page,null,'slide',{reset:true});assert.equal(await page.locator('#fe-preview > .me-preview-stage > .bg-effect').getAttribute('data-effect'),'waves');
    if(await page.locator('#ic-slide-settings').isVisible())await page.locator('#ic-slide-settings').click();await page.locator('#wp-tab-arrange').click();await page.locator('#ce-slide-lock').click();
    const locked=await snapshot(page),result=await operations(page,[{type:'background.set',slideId:id,scope:'presentation',config:{effect:'aurora'}}]);assert.equal(result.ok,false);assert.deepEqual((await snapshot(page)).state,locked.state);assert.deepEqual(errors,[]);
  }finally{await page.close();}
});

test('settings stage previews are explicit, theme colors reset, and reduced motion pauses rendering',async()=>{
  const {page,errors}=await openExample(browser,'portfolio-demo');try{
    await page.locator('#we-settings-open').click();await page.locator('#we-tab-background').click();
    await page.locator('#bg-presentation .bg-preset[aria-label="Choose Aurora background"]').click();
    const preview=page.locator('#bg-presentation .bg-preview .bg-effect');assert.equal(await preview.getAttribute('data-motion'),'off');
    await page.locator('#bg-presentation-preview').click();assert.equal(await preview.getAttribute('data-motion'),'on');
    await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await preview.locator('.bg-particle').first().evaluate(el=>getComputedStyle(el).animationPlayState),'paused');
    await page.locator('#bg-presentation .bg-advanced > summary').click();await page.locator('#bg-presentation-color-0').selectOption('custom');await page.locator('#bg-presentation-hex-0').fill('#112233');
    await page.locator('#bg-presentation-apply').click();assert.equal((await snapshot(page)).state.backgroundEffects.defaults.colors[0],'#112233');
    await page.locator('#bg-presentation .bg-color').first().getByRole('button',{name:'Reset to theme'}).click();await page.locator('#bg-presentation-apply').click();assert.equal((await snapshot(page)).state.backgroundEffects.defaults.colors[0],'accent');
    await page.locator('#we-settings-close').click();assert.equal(await preview.getAttribute('data-motion'),'off');assert.deepEqual(errors,[]);
  }finally{await page.close();}
});

test('editable v3 ZIP restores effects, IDs and history in a clean profile',async()=>{
  const {page,errors}=await openExample(browser,'portfolio-demo');try{
    await set(page,{effect:'constellation',position:'corners'});await set(page,{effect:'orbit',mode:'static'},'slide');
    const expected=await snapshot(page),bytes=await exportZip(page),restored=await importZip(browser,bytes,expected.projectId);
    try{await restored.waitForFunction(()=>!!window.presentationStudioEditing.read().state.backgroundEffects);assert.deepEqual((await snapshot(restored)).state,expected.state);assert.equal(await restored.locator('#fe-preview > .me-preview-stage > .bg-effect').getAttribute('data-effect'),'orbit');}finally{await restored.close();}
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
});

test('each animated preset visibly changes geometry in explicit previews and playback; static mode is explicit',async()=>{
  const {page,errors}=await openExample(browser,'portfolio-demo');try{
    await page.emulateMedia({reducedMotion:'no-preference'});
    const probe=async selector=>page.locator(selector).first().evaluate(el=>{
      const animation=el.getAnimations()[0],running=animation?.playState;
      if(!animation)return {running,changed:false};
      animation.pause();animation.currentTime=0;const before=getComputedStyle(el).transform;
      animation.currentTime=Number(animation.effect.getTiming().duration)*.4;const after=getComputedStyle(el).transform;animation.play();
      return {running,changed:before!==after};
    });
    for(const effect of ['orbit','aurora','waves','constellation','drift']){
      await set(page,{effect});await page.locator('#we-settings-open').click();await page.locator('#we-tab-background').click();
      assert.equal(await page.locator('#we-project-tabs [data-fe-tab="settings"]').evaluate(el=>el.nextElementSibling.id),'we-tab-background');
      await page.locator('#bg-presentation-preview').click();
      assert.deepEqual(await probe('#bg-presentation .bg-preview .bg-particle'),{running:'running',changed:true},effect+' preview');
      if(['waves','aurora'].includes(effect))assert.deepEqual(await probe('#bg-presentation .bg-preview .bg-detail'),{running:'running',changed:true},effect+' internal flow');
      await page.locator('#we-settings-close').click();await page.locator('#fe-close').click();
      await page.waitForFunction(()=>document.querySelector('#stage > .bg-effect')?.dataset.motion==='on');
      if(!await page.locator('body').evaluate(el=>el.classList.contains('paused')))await page.locator('#play').click();
      assert.deepEqual(await probe('#stage > .bg-effect .bg-particle'),{running:'running',changed:true},effect+' playback');
      if(effect==='drift'){
        await page.locator('#hub-player-more > summary').click();await page.locator('#bg-viewer-motion').click();
        assert.equal(await page.locator('#stage > .bg-effect .bg-particle').first().evaluate(el=>getComputedStyle(el).animationPlayState),'paused');
        await page.locator('#hub-player-more > summary').click();await page.locator('#bg-viewer-motion').click();
      }
      await page.emulateMedia({reducedMotion:'reduce'});
      assert.equal(await page.locator('#stage > .bg-effect .bg-particle').first().evaluate(el=>getComputedStyle(el).animationPlayState),'paused');
      if(['waves','aurora'].includes(effect))assert.equal(await page.locator('#stage > .bg-effect .bg-detail').first().evaluate(el=>getComputedStyle(el).animationPlayState),'paused');
      await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('#open-full-editor').click();
    }
    await set(page,{effect:'constellation',mode:'static'});await page.locator('#we-settings-open').click();await page.locator('#we-tab-background').click();
    assert.equal(await page.locator('#bg-presentation-preview').isDisabled(),true);assert.match(await page.locator('#bg-presentation [role=status]').textContent(),/Choose Animated/);
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
});

test('composition and strength stage compatible settings while current-slide preview is inert and isolated',async()=>{
  const {page,errors}=await openExample(browser,'portfolio-demo');try{
    await set(page,{effect:'waves',intensity:63,position:'left',scale:110});const before=await snapshot(page),id=before.state.slides[0].id;
    await page.locator('#we-settings-open').click();await page.locator('#we-tab-background').click();
    assert.equal(await page.locator('#bg-presentation-strength').inputValue(),'custom');assert.equal(await page.locator('#bg-presentation-variation').inputValue(),'custom');
    await page.locator('#bg-presentation-content').selectOption('current');
    const current=page.locator('#bg-presentation .bg-preview-stage');assert.equal(await current.evaluate(el=>el.inert),true);
    assert.equal(await current.locator('.slide').getAttribute('data-media-id'),id);assert.equal(await current.locator('.slide h1,.slide h2').first().textContent(),await page.locator('#fe-preview .slide h1,#fe-preview .slide h2').first().textContent());
    assert.equal(await current.locator('video[autoplay],audio[autoplay]').count(),0);
    await page.locator('#bg-presentation-strength').selectOption('expressive');await page.locator('#bg-presentation-variation').selectOption('wide');
    assert.equal(await current.locator('.bg-effect').getAttribute('data-position'),'full');assert.deepEqual((await snapshot(page)).state,before.state);
    await page.locator('#bg-presentation .bg-advanced > summary').click();
    const displayed=await page.locator('#bg-presentation-hex-2').inputValue();assert.equal(displayed,await current.locator('.bg-effect').evaluate(el=>el.style.getPropertyValue('--bg-render-2')));
    await page.locator('#bg-presentation-color-2').selectOption('custom');assert.equal(await page.locator('#bg-presentation-hex-2').inputValue(),displayed);
    await page.locator('#bg-presentation-apply').click();const applied=(await snapshot(page)).state.backgroundEffects.defaults;
    assert.equal(applied.intensity,75);assert.equal(applied.position,'full');assert.equal(applied.scale,100);assert.equal(applied.colors[2],displayed);assert.equal(Object.hasOwn(applied,'variation'),false);assert.equal(Object.hasOwn(applied,'strength'),false);
    await page.locator('#bg-presentation-content').selectOption('sample');assert.equal(await page.locator('#bg-presentation .bg-preview .slide').count(),0);
    await page.locator('#bg-presentation-mode').selectOption('static');assert.equal(await page.locator('#bg-presentation-preview').getAttribute('aria-pressed'),'false');
    assert.match(await page.locator('#bg-presentation .bg-motion-status').textContent(),/Static/);await page.locator('#we-settings-close').click();
    const pack=await jsonExport(page);assert.equal(pack.schemaVersion,3);assert.deepEqual(pack.state.backgroundEffects.defaults,applied);assert.deepEqual(errors,[]);
  }finally{await page.close();}
});

test('AI background settings preview safely and create guarded native projects without mutating active work',async()=>{
  const {page,errors}=await openExample(browser,'portfolio-demo');try{
    await set(page,{effect:'orbit'});
    const before=await snapshot(page),document={format:'presentation-studio-authoring',version:1,title:'Motion study',background:{effect:'waves',colors:['accent','#3377aa','muted']},slides:[{title:'Theme and motion',background:{effect:'aurora',mode:'static'},blocks:[{type:'paragraph',text:'A clear story.'}]}]};
    await click(page,'#lw-open');await page.locator('#lw-tab-create').click();await page.locator('#lw-json').fill(JSON.stringify(document));await page.locator('#lw-validate').click();
    await page.locator('#pa-preview-select').waitFor();assert.deepEqual((await snapshot(page)).state,before.state);assert.equal(await page.locator('.pa-review-stage > .bg-effect').getAttribute('data-effect'),'aurora');
    await page.locator('#lw-review-open').click();if(await page.locator('#hub-switch').evaluate(el=>el.open))await page.locator('#hub-save-switch').click();await page.locator('#lw-panel').waitFor({state:'hidden'});
    const pack=await jsonExport(page);assert.equal(pack.schemaVersion,3);assert.equal(pack.state.backgroundEffects.defaults.effect,'waves');assert.equal(pack.state.backgroundEffects.slides[pack.state.slides[0].id].effect,'aurora');assert.deepEqual(errors,[]);
  }finally{await page.close();}
});

test('new-presentation previews do not inherit the active project background',async()=>{
  const {page,errors}=await openExample(browser,'portfolio-demo');try{
    await set(page,{effect:'aurora'});const before=await snapshot(page);
    await click(page,'#studio-new-open');if(await page.locator('#hub-switch').evaluate(el=>el.open))await page.locator('#hub-save-switch').click();
    await page.locator('#nx-wizard').waitFor();assert.equal(await page.locator('#nx-wizard .bg-effect').count(),0);assert.deepEqual((await snapshot(page)).state,before.state);
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
});

test('offline playback and independent booth retain matching effect colors and viewer motion controls',async()=>{
  const {page,errors}=await openExample(browser,'portfolio-demo');try{
    for(const effect of ['orbit','aurora','waves','constellation','drift']){
    await set(page,{effect,colors:['#123456','#ab34cd','#e56789']});
    const playback=await exportZip(page,'#fe-playback');await selectTab(page,'Presentation settings');await page.locator('#booth-open').click();await page.locator('#booth-password').fill('background-test');await page.locator('#booth-confirm').fill('background-test');await page.locator('#booth-loop').selectOption(Object.keys((await snapshot(page)).state.loops)[0]);const booth=await exportZip(page,'#booth-export');
    await page.locator('#booth-close').click();await page.locator('#we-settings-close').click();
    for(const [kind,bytes]of [['playback',playback],['booth',booth]]){
      const folder=await unpack(bytes,kind),context=await browser.newContext();await context.setOffline(true);const restored=await context.newPage();restored.on('pageerror',error=>errors.push(error.message));
      try{await restored.goto('file://'+resolve(folder,'index.html'));const layer=restored.locator('#stage > .bg-effect');await layer.waitFor();assert.equal(await layer.getAttribute('data-effect'),effect);assert.equal(await layer.evaluate(el=>el.style.getPropertyValue('--bg-0')),'#123456');
        if(effect==='orbit'){
          const colors=await layer.locator('.bg-orbit-ring').evaluateAll(nodes=>nodes.map(node=>getComputedStyle(node).stroke));
          for(const color of ['rgb(18, 52, 86)','rgb(171, 52, 205)','rgb(229, 103, 137)'])assert.ok(colors.includes(color),kind+': '+color);
        }
        const toggle=kind==='booth'?restored.locator('#booth-bg-motion'):restored.locator('#bg-viewer-motion');if(kind==='playback')await restored.locator('#hub-player-more > summary').click();await toggle.click();assert.equal(await layer.getAttribute('data-motion'),'off');assert.equal(await toggle.getAttribute('aria-pressed'),'true');
      }finally{await context.close();}
    }}assert.deepEqual(errors,[]);
  }finally{await page.close();}
});

test('theme-linked colors follow dark/light themes while explicit custom slots and grid choice persist',async()=>{
  const {page,errors}=await openExample(browser,'portfolio-demo');try{
    await set(page,{effect:'aurora',grid:false,colors:['accent','#aa33cc','muted']});
    for(const appearance of ['dark','light']){
      await selectTab(page,'Branding');await page.locator('#te-open-gallery').click();await page.locator('[data-scheme="indigo"]').click();await page.locator('#te-appearance').selectOption(appearance);await page.locator('#te-apply').click();await page.locator('#we-settings-close').click();
      const values=await page.locator('#fe-preview > .me-preview-stage').evaluate(root=>({accent:getComputedStyle(root).getPropertyValue('--project-accent').trim(),linked:root.querySelector('.bg-effect').style.getPropertyValue('--bg-0'),custom:root.querySelector('.bg-effect').style.getPropertyValue('--bg-1'),grid:getComputedStyle(root.querySelector('.grid')).visibility}));
      assert.equal(values.linked,values.accent);assert.equal(values.custom,'#aa33cc');assert.equal(values.grid,'hidden');
      const rendered=await page.locator('#fe-preview > .me-preview-stage > .bg-effect').evaluate(el=>({linked:el.style.getPropertyValue('--bg-render-0'),custom:el.style.getPropertyValue('--bg-render-1')}));
      assert.equal(rendered.custom,'#aa33cc');if(appearance==='dark'){assert.match(rendered.linked,/^#[a-f0-9]{6}$/i);assert.notEqual(rendered.linked,values.accent);}else assert.equal(rendered.linked,values.accent);
      for(const effect of Object.keys(engine.names))await set(page,{effect,grid:false,colors:['accent','#aa33cc','muted']});
    }assert.deepEqual(errors,[]);
  }finally{await page.close();}
});

test('unknown future native formats, disguised v2 effects and invalid settings leave active work unchanged',async()=>{
  const {page,errors}=await openExample(browser,'portfolio-demo');try{
    await set(page,{effect:'orbit'});const pack=await jsonExport(page),before=await snapshot(page);
    await click(page,'#lw-open');await page.locator('#lw-tab-create').click();
    const invalid=JSONcopy(pack);invalid.state.backgroundEffects.defaults.effect='javascript';
    for(const candidate of [{...pack,schemaVersion:99},{...pack,schemaVersion:2},invalid]){
      await page.locator('#lw-json').fill(JSON.stringify(candidate));await page.locator('#lw-validate').click();
      await page.waitForFunction(()=>document.querySelector('#lw-panel').getAttribute('aria-busy')==='false');
      assert.equal(await page.locator('#lw-review-open').isDisabled(),true);assert.deepEqual((await snapshot(page)).state,before.state);
      assert.match(await page.locator('#lw-message').textContent(),/Unsupported|require|effect/i);
    }assert.deepEqual(errors,[]);
  }finally{await page.close();}
});

test('a 50-slide presentation keeps one bounded animated layer and preserves continuity between matching slides',async()=>{
  const {page,errors}=await openExample(browser,'portfolio-demo');try{
    const start=await snapshot(page),sectionId=start.state.sections[0].id;
    const create=Array.from({length:50-start.state.slides.length},(_,i)=>({type:'slide.create',sectionId,title:'Performance sample '+i,template:'hero'}));
    assert.equal((await operations(page,create)).ok,true);await set(page,{effect:'constellation'});
    await page.emulateMedia({reducedMotion:'no-preference'});
    await page.locator('#fe-close').click();await page.waitForFunction(()=>!document.querySelector('#full-editor').open);
    await page.waitForFunction(()=>document.querySelector('#stage > .bg-effect')?.dataset.motion==='on');
    const layer=page.locator('#stage > .bg-effect');assert.equal(await layer.getAttribute('data-motion'),'on');assert.ok(await layer.locator('.bg-particle').count()<=24);
    await layer.evaluate(el=>window.backgroundContinuity=el.firstElementChild);
    for(let i=0;i<5;i++)await page.locator('#next').click();
    assert.equal(await layer.evaluate(el=>el.firstElementChild===window.backgroundContinuity),true);assert.equal(await page.locator('#stage > .bg-effect').count(),1);
    assert.equal(await page.locator('.we-thumbnail .bg-effect[data-motion=on]').count(),0);
    const state=(await snapshot(page)).state;await page.locator('#hub-player-more > summary').click();await page.locator('#bg-viewer-motion').click();assert.equal(await layer.getAttribute('data-motion'),'off');assert.deepEqual((await snapshot(page)).state,state);assert.deepEqual(errors,[]);
  }finally{await page.close();}
});

test('playback omits background overrides for hidden slides while editable recovery retains them',async()=>{
  const {page,errors}=await openExample(browser,'portfolio-demo');try{
    const before=await snapshot(page),id=before.state.slides[0].id;
    await set(page,{effect:'aurora'},'slide');
    // The existing slide hide control preserves the original in editable recovery.
    await selectTab(page,'Slide');await reveal(page,'#fe-hidden');await page.locator('#fe-hidden').check();
    const expected=await snapshot(page);assert.equal(expected.state.backgroundEffects.slides[id].effect,'aurora');
    const bytes=await exportZip(page,'#fe-playback'),zip=await zipContext.JSZip.loadAsync(new Uint8Array(bytes));
    const exported=JSON.parse(await zip.file('presentation.json').async('string'));
    assert.equal(exported.state.slides.some(slide=>slide.id===id),false);assert.equal(exported.state.backgroundEffects?.slides?.[id],undefined);
    const editable=await jsonExport(page);assert.equal(editable.schemaVersion,3);assert.equal(editable.state.backgroundEffects.slides[id].effect,'aurora');assert.deepEqual(errors,[]);
  }finally{await page.close();}
});
