import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {resolve} from 'node:path';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {addSlide,click,reveal,selectTab} from './ui.mjs';
import {archivePath} from './archive-path.mjs';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']});
test.after(()=>browser.close());
async function setup(){const p=await browser.newPage({viewport:{width:1366,height:768},acceptDownloads:true}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('file://'+resolve('dist/presentation-studio.html'));await p.locator('#open-full-editor').click();return{p,errors};}
const read=p=>p.evaluate(()=>window.presentationStudioEditing.read());
const apply=(p,operations)=>p.evaluate(operations=>{const api=window.presentationStudioEditing,s=api.read();return api.apply({apiVersion:1,projectId:s.projectId,expectedRevision:s.revision,operations:operations.map(o=>({slideId:s.state.slides.find(s=>s.template==='blank')?.id||s.state.slides[0].id,...o}))});},operations);
async function block(p,kind='rectangle'){await reveal(p,'#db-palette');await p.locator('#db-palette > summary').click();await p.locator('[data-db-kind='+kind+']').click();return await p.locator('#db-list').inputValue();}
async function pack(p){const event=p.waitForEvent('download');await click(p,'#fe-export-json');return JSON.parse(await readFile(await(await event).path(),'utf8'));}

test('theme swatches, custom colors, opacity, presets and named palette survive Undo and pack validation',async()=>{const{p,errors}=await setup();try{
 await addSlide(p,'blank');const id=await block(p);await p.locator('#wp-tab-style').click();
 await p.locator('#sp-slot').selectOption('fill');await p.getByRole('button',{name:'Theme accent',exact:true}).click();
 let s=(await read(p)).state,slide=s.slides.find(s=>s.template==='blank');assert.equal(s.design.slides[slide.id].objects[id].style.fill.role,'accent');
 await p.locator('#sp-slot').selectOption('text');await p.locator('#sp-hex').fill('#123456');await p.locator('#sp-opacity').fill('60');await p.locator('#sp-custom').click();
 s=(await read(p)).state;assert.deepEqual(s.design.slides[slide.id].objects[id].style.text,{hex:'#123456',opacity:.6});
 await p.locator('#sp-swatch-name').fill('Project navy');await p.locator('#sp-save-color').click();assert.deepEqual((await read(p)).state.design.palette,[{name:'Project navy',hex:'#123456'}]);
 const saved=await pack(p);await p.locator('#fe-import-file').setInputFiles({name:'styled.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(saved))});
 assert.deepEqual((await read(p)).state.design,saved.state.design);assert.deepEqual(errors,[]);
 }finally{await p.close();}});

test('theme-linked fill follows theme changes while custom text stays fixed',async()=>{const{p,errors}=await setup();try{
 await addSlide(p,'blank');const id=await block(p);
 assert.equal((await apply(p,[{type:'design.appearance',keys:[id],style:{fill:{role:'accent'},text:{hex:'#123456'}}}])).ok,true);
 const before=await p.locator('#fe-preview .'+id).evaluate(el=>({fill:getComputedStyle(el).backgroundColor,text:getComputedStyle(el).color}));
 await selectTab(p,'Branding');await p.locator('#te-open-gallery').click();await p.locator('[data-scheme="indigo"]').click();await p.locator('#te-appearance').selectOption('dark');const preview=await p.locator('#te-preview .'+id).evaluate(el=>getComputedStyle(el).backgroundColor);assert.notEqual(preview,before.fill);await p.locator('#te-apply').click();await p.locator('#we-settings-close').click();
 const after=await p.locator('#fe-preview .'+id).evaluate(el=>({fill:getComputedStyle(el).backgroundColor,text:getComputedStyle(el).color}));assert.notEqual(after.fill,before.fill);assert.equal(after.text,before.text);assert.deepEqual(errors,[]);
 }finally{await p.close();}});

test('snapping aligns object edges at two zooms, Alt bypasses, Escape cancels and release is one Undo',async()=>{const{p,errors}=await setup();try{
 await addSlide(p,'blank');const a=await block(p),b=await block(p,'circle');
 assert.equal((await apply(p,[{type:'block.place',blockId:a,placement:{x:.2,y:.15,w:.2,h:.2}},{type:'block.place',blockId:b,placement:{x:.65,y:.55,w:.15,h:.2}}])).ok,true);
 const left=async()=>{const s=(await read(p)).state.slides.find(s=>s.template==='blank').tree.find(n=>n.attrs.class.includes(b));return Number(s.attrs.style.match(/left:([\d.]+)%/)[1])/100;};
 for(const zoom of ['0.5','1']){
  await p.locator('#we-zoom').selectOption(zoom);const before=await pack(p),slide=await p.locator('#fe-preview .slide').boundingBox(),h=await p.locator('#fe-preview .'+b+' .db-move').boundingBox();
  const dx=(-.45*slide.width)+3;await p.mouse.move(h.x+h.width/2,h.y+h.height/2);await p.mouse.down();await p.mouse.move(h.x+h.width/2+dx,h.y+h.height/2,{steps:5});assert(await p.locator('.sp-snap-guide').count()>0);await p.mouse.up();assert(Math.abs(await left()-.2)<.001);assert.equal((await pack(p)).history.past.length,before.history.past.length+1);await p.locator('#fe-undo').click();
  const next=await p.locator('#fe-preview .'+b+' .db-move').boundingBox();await p.keyboard.down('Alt');await p.mouse.move(next.x+next.width/2,next.y+next.height/2);await p.mouse.down();await p.mouse.move(next.x+next.width/2+dx,next.y+next.height/2,{steps:4});assert.equal(await p.locator('.sp-snap-guide').count(),0);await p.mouse.up();await p.keyboard.up('Alt');assert(Math.abs(await left()-.2)>.001);await p.locator('#fe-undo').click();
  const cancel=await p.locator('#fe-preview .'+b+' .db-move').boundingBox();await p.mouse.move(cancel.x+cancel.width/2,cancel.y+cancel.height/2);await p.mouse.down();await p.mouse.move(cancel.x+cancel.width/2-30,cancel.y+cancel.height/2);await p.keyboard.press('Escape');await p.mouse.up();assert.deepEqual((await read(p)).state,before.state);
 }
 assert.deepEqual(errors,[]);
 }finally{await p.close();}});

test('styled layers and rotation survive editable and playback ZIP reopening offline',async()=>{const{p,errors}=await setup();try{
 await addSlide(p,'blank');const id=await block(p);assert.equal((await apply(p,[{type:'design.appearance',keys:[id],style:{fill:{hex:'#114477'},text:{hex:'#ffffff'},border:{role:'accent'},borderWidth:4}},{type:'design.meta',keys:[id],changes:{name:'Portable card',rotation:15}}])).ok,true);
 const expected=(await read(p)).state.design;
 for(const selector of ['#fe-export','#fe-playback']){
  const event=p.waitForEvent('download');await click(p,selector);const path=await(await event).path(),folder=resolve('test-results','precision-'+(selector==='#fe-export'?'editable':'playback'));
  // Use the repository's vendored ZIP implementation, identical to other portability tests.
  const {default:vm}=await import('node:vm');const sandbox={setImmediate,clearImmediate,setTimeout,clearTimeout,Uint8Array,ArrayBuffer,TextEncoder,TextDecoder};vm.runInNewContext(await readFile('vendor/jszip-3.10.1.min.js','utf8'),sandbox);const zip=await sandbox.JSZip.loadAsync(await readFile(path));
  await mkdir(folder,{recursive:true});for(const [name,file] of Object.entries(zip.files)){if(file.dir)continue;const target=archivePath(folder,name);await mkdir((await import('node:path')).dirname(target),{recursive:true});await writeFile(target,await file.async('uint8array'));}
  const q=await browser.newPage();try{q.on('pageerror',e=>errors.push(e.message));await q.goto('file://'+resolve(folder,'index.html'));assert.equal(await q.locator('.'+id).evaluateAll(nodes=>nodes.some(el=>el.style.rotate==='15deg'&&getComputedStyle(el).backgroundColor==='rgb(17, 68, 119)')),true);if(selector==='#fe-export'){await q.locator('#open-full-editor').click();assert.deepEqual((await read(q)).state.design,expected);}}finally{await q.close();}
 }
 assert.deepEqual(errors,[]);
 }finally{await p.close();}});

test('Layers batch appearance, naming, visibility, locks, reorder and rotation are atomic and preserve text',async()=>{const{p,errors}=await setup();try{
 await addSlide(p,'blank');const a=await block(p),b=await block(p,'circle');await p.locator('#wp-tab-layers').click();
 const before=await read(p),slide=before.state.slides.find(s=>s.template==='blank'),content=JSON.stringify(slide.tree.map(n=>n.children));
 let r=await apply(p,[{type:'design.appearance',keys:[a,b],style:{fill:{role:'accent'},border:{hex:'#ff0000'},borderWidth:3}}]);assert.equal(r.ok,true);
 let after=await read(p);assert.equal(after.state.design.slides[slide.id].objects[a].style.borderWidth,3);assert.equal(after.state.design.slides[slide.id].objects[b].style.borderWidth,3);assert.equal(after.state.slides.find(s=>s.id===slide.id).tree.map(n=>n.children).length,2);
 await p.locator('#fe-undo').click();assert.deepEqual((await read(p)).state,before.state);
 r=await apply(p,[{type:'design.meta',keys:[a],changes:{name:'Main panel',rotation:30}}]);assert.equal(r.ok,true);await p.locator('#wp-tab-layers').click();assert.equal(await p.getByRole('button',{name:'block: Main panel',exact:true}).count(),1);
 assert.equal(await p.locator('#fe-preview .'+a).evaluate(el=>el.style.rotate),'30deg');
 assert.equal((await apply(p,[{type:'design.meta',keys:[a],changes:{locked:true}}])).ok,true);
 const locked=await read(p);assert.equal((await apply(p,[{type:'block.remove',blockId:a}])).code,'LOCKED');assert.equal((await apply(p,[{type:'design.appearance',keys:[a,b],style:{fill:'transparent'}}])).code,'LOCKED');assert.deepEqual((await read(p)).state,locked.state);
 assert.equal((await apply(p,[{type:'design.meta',keys:[a],changes:{locked:false}}])).ok,true);
 assert.equal((await apply(p,[{type:'design.meta',keys:[a],changes:{hidden:true}}])).ok,true);assert.equal(await p.locator('#fe-preview .'+a).isVisible(),false);
 await p.getByRole('button',{name:'Show Main panel',exact:true}).click();assert.equal(await p.locator('#fe-preview .'+a).isVisible(),true);
 assert.equal((await apply(p,[{type:'design.reorder',keys:[a],direction:'forward'}])).ok,true);
 after=await read(p);assert(after.state.design.slides[slide.id].objects[a].z>after.state.design.slides[slide.id].objects[b].z);assert.equal(JSON.stringify(after.state.slides.find(s=>s.id===slide.id).tree.map(n=>n.children)),content);assert.deepEqual(errors,[]);
 await p.locator('#wp-tab-arrange').click();await p.locator('#db-list').selectOption(a);await reveal(p,'#db-layer');await p.locator('#db-layer').fill('500');await p.locator('#db-layer').press('Tab');assert.equal(await p.locator('#fe-preview .'+a).evaluate(el=>Number(getComputedStyle(el).zIndex)),500);
 }finally{await p.close();}});

test('blank and confirmed Clear keep slide identity/background and recover removed media in one Undo',async()=>{const{p,errors}=await setup();try{
 await addSlide(p,'blank');let s=await read(p),slide=s.state.slides.find(s=>s.template==='blank');assert.deepEqual(slide.tree,[]);
 assert.equal((await apply(p,[{type:'design.background',color:{role:'surface'}}])).ok,true);await block(p);const before=await pack(p);
  await p.locator('#ic-slide-settings').click();await p.locator('#sp-clear').click();await p.locator('#fe-confirm-cancel').click();assert.deepEqual((await read(p)).state,before.state);
 await p.locator('#sp-clear').click();await p.locator('#fe-confirm-accept').click();s=await read(p);const clear=s.state.slides.find(s=>s.id===slide.id);assert.deepEqual(clear.tree,[]);assert.equal(clear.group,slide.group);assert.deepEqual(s.state.design.slides[slide.id].background,{role:'surface',opacity:1});
 await p.locator('#fe-undo').click();assert.deepEqual((await read(p)).state,before.state);assert.deepEqual(errors,[]);
 }finally{await p.close();}});

test('design operations reject unsafe input atomically and preserve legacy projects without overrides',async()=>{const{p,errors}=await setup();try{
 const before=await read(p);assert.equal(before.state.design,undefined);
 for(const op of [{type:'design.background',color:{hex:'url(https://invalid)'}},{type:'design.palette',colors:[{name:'bad',hex:'#fff'}]},{type:'design.appearance',keys:['node-0'],style:{borderWidth:Infinity}},{type:'design.meta',keys:['node-0'],changes:{rotation:181}}]){assert.equal((await apply(p,[op])).ok,false);assert.deepEqual((await read(p)).state,before.state);}
 await p.locator('#wp-tab-layers').click();await p.locator('#wp-tab-style').click();assert.deepEqual((await read(p)).state,before.state);assert.deepEqual(errors,[]);
 }finally{await p.close();}});

test('Layers check boxes expose Mixed appearance and apply one preset atomically with keyboard focus retained',async()=>{const{p,errors}=await setup();try{
 await addSlide(p,'blank');const a=await block(p),b=await block(p,'circle');
 await apply(p,[{type:'design.appearance',keys:[a],style:{fill:{hex:'#ff0000'}}},{type:'design.appearance',keys:[b],style:{fill:{hex:'#00ff00'}}}]);
 await p.locator('#wp-tab-layers').click();await p.locator('.sp-layer-row[data-key="'+a+'"] input').check();await p.locator('#wp-tab-style').click();await p.locator('#sp-slot').selectOption('fill');assert.equal(await p.locator('#sp-value').textContent(),'Mixed');
 const before=await pack(p);await p.locator('#sp-preset').selectOption('outline');const after=await pack(p),slide=after.state.slides.find(s=>s.template==='blank');assert.equal(after.history.past.length,before.history.past.length+1);for(const id of [a,b])assert.equal(after.state.design.slides[slide.id].objects[id].style.fill,'transparent');
 await p.locator('#fe-undo').click();assert.deepEqual((await read(p)).state,before.state);await p.locator('#wp-tab-layers').click();const lock=p.locator('.sp-layer-row[data-key="'+a+'"] button').filter({hasText:/^Lock$/});await lock.focus();await p.keyboard.press('Enter');assert.match(await p.evaluate(()=>document.activeElement.getAttribute('aria-label')),/^Unlock/);assert.deepEqual(errors,[]);
 }finally{await p.close();}});

test('Grid Layers hide and lock apply to nested media without exposing independent stacking',async()=>{const{p,errors}=await setup();try{
 await addSlide(p,'media-grid');await p.locator('#fe-preview .mg-cell-action').first().evaluate(el=>{const d=new DataTransfer();d.items.add(new File(['<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50"><rect width="50" height="50" fill="blue"/></svg>'],'nested.svg',{type:'image/svg+xml'}));el.dispatchEvent(new DragEvent('drop',{bubbles:true,dataTransfer:d}));});
 const s=await read(p),slide=s.state.slides.find(s=>s.template==='media-grid'),index=slide.tree.findIndex(n=>n.attrs?.class?.startsWith('mg-grid '));
 assert.equal((await apply(p,[{slideId:slide.id,type:'design.meta',keys:['node-'+index],changes:{hidden:true}}])).ok,true);assert.equal(await p.locator('#fe-preview .media-box').first().isVisible(),false);
 const key=(await read(p)).state.slides.find(s=>s.id===slide.id).tree[index].attrs.class.match(/layer-[\w-]+/)[0];
 assert.equal((await apply(p,[{slideId:slide.id,type:'design.meta',keys:[key],changes:{hidden:false,locked:true}}])).ok,true);
 const locked=await read(p),cell=locked.state.slides.find(s=>s.id===slide.id).tree[index].children[0].attrs.class.match(/cell-[\w-]+/)[0];assert.equal((await apply(p,[{slideId:slide.id,type:'grid.appearance',cellId:cell,fit:'cover',x:20,y:40}])).code,'LOCKED');assert.deepEqual((await read(p)).state,locked.state);
 await p.locator('#wp-tab-layers').click();assert.equal(await p.locator('.sp-grid-child').count(),4);assert.equal(await p.locator('.sp-layer-row').count(),2);assert.deepEqual(errors,[]);
 }finally{await p.close();}});

test('reordering original content with media preserves layout geometry and matches visible stacking',async()=>{const{p,errors}=await setup();try{
 await click(p,'#we-context-media');await reveal(p,'#ce-zone');await p.locator('#ce-zone').selectOption('right');await p.locator('#ce-file').setInputFiles({name:'frame.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="blue"/></svg>')});await p.locator('#fe-preview .media-box').waitFor();
 const before=await p.locator('#fe-preview .media-original > :first-child').boundingBox();assert(before);
 const s=await read(p),slide=s.state.slides[0];assert.equal((await apply(p,[{slideId:slide.id,type:'design.reorder',keys:['node-0'],target:'media-primary'}])).ok,true);
 const key=(await read(p)).state.slides[0].tree[0].attrs.class.match(/layer-[\w-]+/)[0],after=await p.locator('#fe-preview .'+key).boundingBox();for(const field of ['x','y','width','height'])assert(Math.abs(after[field]-before[field])<2,field+' must not move during layer reorder');
 const z=await p.locator('#fe-preview .'+key).evaluate(el=>Number(getComputedStyle(el).zIndex)),mediaZ=await p.locator('#fe-preview [data-object-id=primary]').evaluate(el=>Number(getComputedStyle(el).zIndex));assert(z>mediaZ);assert.deepEqual(errors,[]);
 }finally{await p.close();}});

test('equal-spacing guides and Snap toggle share zoom-independent behavior and exclude locked references',async()=>{const{p,errors}=await setup();try{
 await addSlide(p,'blank');const a=await block(p),b=await block(p),c=await block(p,'circle');await apply(p,[{type:'block.place',blockId:a,placement:{x:.12,y:.1,w:.13,h:.1}},{type:'block.place',blockId:b,placement:{x:.67,y:.1,w:.17,h:.1}},{type:'block.place',blockId:c,placement:{x:.7,y:.6,w:.11,h:.15}}]);
 const bounds=await p.locator('#fe-preview .slide').boundingBox(),h=await p.locator('#fe-preview .'+c+' .db-move').boundingBox();await p.mouse.move(h.x+h.width/2,h.y+h.height/2);await p.mouse.down();await p.mouse.move(h.x+h.width/2+(.405-.7)*bounds.width+3,h.y+h.height/2,{steps:5});assert.equal(await p.locator('.sp-snap-label').textContent(),'Equal spacing');await p.mouse.up();await p.locator('#fe-undo').click();
 await reveal(p,'#sp-snap');await p.locator('#sp-snap').uncheck();const next=await p.locator('#fe-preview .'+c+' .db-move').boundingBox();await p.mouse.move(next.x+next.width/2,next.y+next.height/2);await p.mouse.down();await p.mouse.move(next.x+next.width/2+(.405-.7)*bounds.width+3,next.y+next.height/2,{steps:4});assert.equal(await p.locator('.sp-snap-guide').count(),0);await p.keyboard.press('Escape');await p.mouse.up();await p.locator('#sp-snap').check();
 await apply(p,[{type:'design.meta',keys:[a,b],changes:{locked:true}}]);const last=await p.locator('#fe-preview .'+c+' .db-move').boundingBox();await p.mouse.move(last.x+last.width/2,last.y+last.height/2);await p.mouse.down();await p.mouse.move(last.x+last.width/2+(.67-.7)*bounds.width+3,last.y+last.height/2,{steps:4});assert.equal(await p.locator('.sp-snap-guide').count(),0);await p.keyboard.press('Escape');await p.mouse.up();assert.deepEqual(errors,[]);
 }finally{await p.close();}});

test('clearing media rejects locked cells, retains recovery references and restores media with Undo',async()=>{const{p,errors}=await setup();try{
 await addSlide(p,'media-grid');await p.locator('#fe-preview .mg-cell-action').first().evaluate(el=>{const d=new DataTransfer();d.items.add(new File(['<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="red"/></svg>'],'recover.svg',{type:'image/svg+xml'}));el.dispatchEvent(new DragEvent('drop',{bubbles:true,dataTransfer:d}));});
 await p.locator('#mg-cell').selectOption({index:0});await click(p,'#we-context-media');await click(p,'#ce-object-lock');const locked=await read(p),slide=locked.state.slides.find(s=>s.template==='media-grid');assert.equal((await apply(p,[{slideId:slide.id,type:'design.clear'}])).code,'LOCKED');assert.equal((await apply(p,[{slideId:slide.id,type:'design.meta',keys:['node-1'],changes:{hidden:true}}])).code,'LOCKED');assert.deepEqual((await read(p)).state,locked.state);
 await click(p,'#ce-object-lock');const before=await pack(p),src=before.state.mediaObjects[slide.id][0].media.src;assert.equal((await apply(p,[{slideId:slide.id,type:'design.clear'}])).ok,true);const clear=await pack(p);assert.equal(clear.state.mediaObjects[slide.id],undefined);assert(JSON.stringify(clear.history).includes(src));await p.locator('#fe-undo').click();assert.deepEqual((await read(p)).state,before.state);assert.deepEqual(errors,[]);
 }finally{await p.close();}});

test('text colors override original layout typography without freezing theme colors into edited AST content',async()=>{const{p,errors}=await setup();try{
 assert.equal((await apply(p,[{type:'design.appearance',keys:['node-0'],style:{text:{role:'accent'}}}])).ok,true);
 const old=await p.locator('#fe-preview h1').evaluate(el=>getComputedStyle(el).color);await p.locator('#fe-preview h1').click();await p.locator('#fe-preview h1').fill('Styled original heading');await p.locator('#fe-preview h1').press('Escape');
 assert.equal(await p.locator('#fe-preview h1').evaluate(el=>getComputedStyle(el).color),old);assert.equal(JSON.stringify((await read(p)).state.slides[0].tree).includes('--sp-text'),false);assert.deepEqual(errors,[]);
 }finally{await p.close();}});

test('deleting an unlocked sibling preserves a locked absolute block despite changing its tree index',async()=>{const{p,errors}=await setup();try{
 await addSlide(p,'blank');const a=await block(p),b=await block(p,'circle');await apply(p,[{type:'design.meta',keys:[b],changes:{locked:true}}]);const before=await read(p),slide=before.state.slides.find(s=>s.template==='blank'),locked=slide.tree.find(n=>n.attrs.class.includes(b));
 assert.equal((await apply(p,[{type:'design.remove',keys:[a]}])).ok,true);const after=(await read(p)).state.slides.find(s=>s.id===slide.id);assert.deepEqual(after.tree,[locked]);assert.equal((await apply(p,[{type:'block.remove',blockId:b}])).code,'LOCKED');assert.deepEqual(errors,[]);
 }finally{await p.close();}});

test('custom picker and hex synchronize drafts, preserve opacity and commit only on Apply with lock/Undo protection',async()=>{const{p,errors}=await setup();try{
 await addSlide(p,'blank');const id=await block(p);await p.locator('#wp-tab-style').click();await p.locator('#sp-slot').selectOption('fill');await p.getByRole('button',{name:'Theme accent',exact:true}).click();
 const before=await pack(p),slide=before.state.slides.find(s=>s.template==='blank');assert.equal(await p.locator('#sp-color-picker').inputValue(),before.state.brand.accent.toLowerCase());
 await p.locator('#sp-color-picker').evaluate(el=>{el.value='#abcdef';el.dispatchEvent(new Event('input',{bubbles:true}));});assert.equal(await p.locator('#sp-hex').inputValue(),'#abcdef');
 await p.locator('#sp-hex').fill('#123ABC');assert.equal(await p.locator('#sp-color-picker').inputValue(),'#123abc');await p.locator('#sp-opacity').fill('45');assert.deepEqual(await pack(p),before);
 await p.locator('#sp-custom').click();const applied=await pack(p);assert.deepEqual(applied.state.design.slides[slide.id].objects[id].style.fill,{hex:'#123abc',opacity:.45});assert.equal(applied.history.past.length,before.history.past.length+1);assert.equal(await p.locator('#sp-color-picker').inputValue(),'#123abc');
 await p.locator('#fe-undo').click();assert.deepEqual((await read(p)).state,before.state);await p.locator('#sp-hex').fill('#12');assert.equal(await p.locator('#sp-hex').getAttribute('aria-invalid'),'true');await p.locator('#sp-custom').click();assert.deepEqual((await read(p)).state,before.state);
 assert.equal((await apply(p,[{type:'design.meta',keys:[id],changes:{locked:true}}])).ok,true);assert.equal(await p.locator('#sp-color-picker').isDisabled(),true);assert.equal(await p.locator('#sp-custom').isDisabled(),true);assert.deepEqual(errors,[]);
 }finally{await p.close();}});

test('duplicate layer removal keys reject atomically without deleting an unrelated root',async()=>{const{p,errors}=await setup();try{
 await addSlide(p,'blank');const a=await block(p);await block(p,'circle');await block(p,'text');const before=await pack(p);
 assert.equal((await apply(p,[{type:'design.remove',keys:[a,a]}])).code,'INVALID');assert.deepEqual(await pack(p),before);assert.deepEqual(errors,[]);
 }finally{await p.close();}});

test('clearing a selected Grid removes nested media atomically and Undo restores all references',async()=>{const{p,errors}=await setup();try{
 await addSlide(p,'media-grid');for(let i=0;i<3;i++)await p.locator('#fe-preview .mg-cell-action').nth(i).evaluate((el,i)=>{const d=new DataTransfer();d.items.add(new File(['<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30"><rect width="30" height="30" fill="blue"/></svg>'],'nested-'+i+'.svg',{type:'image/svg+xml'}));el.dispatchEvent(new DragEvent('drop',{bubbles:true,dataTransfer:d}));},i);
 const initial=(await read(p)).state,gridSlide=initial.slides.find(s=>s.template==='media-grid'),gridIndex=gridSlide.tree.findIndex(n=>n.attrs?.class?.startsWith('mg-grid ')),detachedCell=gridSlide.tree[gridIndex].children[2].attrs.class.match(/cell-[\w-]+/)[0];assert.equal((await apply(p,[{slideId:gridSlide.id,type:'grid.detach',cellId:detachedCell}])).ok,true);
 const before=await pack(p),slide=before.state.slides.find(s=>s.template==='media-grid'),index=slide.tree.findIndex(n=>n.attrs?.class?.startsWith('mg-grid ')),ids=before.state.mediaObjects[slide.id].map(n=>n.id),unrelated=before.state.mediaObjects[slide.id][2];
 assert.equal((await apply(p,[{slideId:slide.id,type:'design.remove',keys:['node-'+index]}])).ok,true);const after=await pack(p);assert.equal(after.state.slides.find(s=>s.id===slide.id).tree.length,slide.tree.length-1);assert.deepEqual(after.state.mediaObjects[slide.id],[unrelated]);assert.equal(await p.locator('#fe-preview .media-box').count(),1);assert.equal(after.history.past.length,before.history.past.length+1);for(const id of ids)assert(JSON.stringify(after.history).includes(id));
 await p.locator('#fe-undo').click();assert.deepEqual((await read(p)).state,before.state);assert.equal(await p.locator('#fe-preview .media-box').count(),3);assert.deepEqual(errors,[]);
 }finally{await p.close();}});
