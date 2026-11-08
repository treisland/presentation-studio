import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {resolve} from 'node:path';
import {readFile} from 'node:fs/promises';
import {click,addSlide,reveal} from './ui.mjs';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']});
test.after(()=>browser.close());
async function setup(width=1280){const p=await browser.newPage({viewport:{width,height:720},acceptDownloads:true});const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('file://'+resolve('dist/presentation-studio.html'));await p.locator('#open-full-editor').click();return{p,errors};}
async function pack(p){const d=p.waitForEvent('download');await click(p,'#fe-export-json');return JSON.parse(await readFile(await(await d).path(),'utf8'));}
const read=p=>p.evaluate(()=>window.presentationStudioEditing.read().state);

test('Inspector media-list selection targets the matching Grid cell for removal and Undo',async()=>{const{p,errors}=await setup();try{
 await addSlide(p,'media-grid');
 for(let i=0;i<2;i++)await p.locator('#fe-preview .mg-cell-action').nth(i).evaluate((el,i)=>{const d=new DataTransfer();d.items.add(new File(['<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50"><rect width="50" height="50" fill="blue"/></svg>'],'cell-'+i+'.svg',{type:'image/svg+xml'}));el.dispatchEvent(new DragEvent('drop',{bubbles:true,dataTransfer:d}));},i);
 await p.locator('#fe-preview .mg-cell-action').first().click();
 await click(p,'#we-context-media');
 const before=await read(p),slide=before.slides.find(s=>s.template==='media-grid'),objects=before.mediaObjects[slide.id];
 await p.locator('#ce-objects button').filter({hasText:'cell-1.svg'}).click();
 assert.equal(await p.locator('#wp-selection-title').textContent(),'Grid cell 2');assert.equal(await p.locator('#wp-selection-detail').textContent(),'cell-1.svg');
 assert.match(await p.locator('#mg-cell option:checked').textContent(),/^Cell 2:/);
 await p.locator('#wp-delete').click();assert.match(await p.locator('#fe-confirm').innerText(),/Remove cell-1\.svg from this cell/);await p.locator('#fe-confirm-accept').click();
 const after=await read(p);assert.deepEqual(after.mediaObjects[slide.id],[objects[0]]);
 await p.locator('#fe-undo').click();assert.deepEqual(await read(p),before);assert.deepEqual(errors,[]);
 }finally{await p.close();}});

test('edge rails, sticky panel controls and keyboard tabs preserve project/history and session view state',async()=>{const{p,errors}=await setup();try{
 const before=await pack(p);
 await p.locator('#wp-tab-content').focus();await p.keyboard.press('ArrowRight');assert.equal(await p.locator('#wp-tab-arrange').getAttribute('aria-selected'),'true');
 await p.keyboard.press('End');assert.equal(await p.locator('#wp-tab-layers').getAttribute('aria-selected'),'true');await p.keyboard.press('ArrowLeft');assert.equal(await p.locator('#wp-tab-style').getAttribute('aria-selected'),'true');await p.keyboard.press('Home');
 const header=await p.locator('#wp-selection-header').boundingBox(),search=await p.locator('#fe-search').boundingBox();
 await p.locator('#wp-fields').evaluate(el=>el.scrollTop=el.scrollHeight);await p.locator('#fe-slide-list').evaluate(el=>el.scrollTop=el.scrollHeight);
 assert.equal((await p.locator('#wp-selection-header').boundingBox()).y,header.y);assert.equal((await p.locator('#fe-search').boundingBox()).y,search.y);
 for(const name of ['slides','inspector']){const b=p.locator('#we-toggle-'+name);assert.match(await b.getAttribute('aria-label'),/Collapse/);await b.press('Enter');assert.match(await b.getAttribute('aria-label'),/Reveal/);assert.equal(await p.locator('#we-'+name).isVisible(),false);assert.equal(await b.isVisible(),true);await b.press('Space');}
 await p.locator('#wp-tab-style').click();await p.locator('.fe-slide-button[data-slide-id="studio-media"]').click();assert.equal(await p.locator('#wp-tab-style').getAttribute('aria-selected'),'true');
 await p.locator('.fe-slide-button[data-slide-id="studio-welcome"]').click();assert.deepEqual(await pack(p),before);
 assert.deepEqual(errors,[]);
 }finally{await p.close();}});

test('top-level block actions work across sections, support undo and respect locks',async()=>{const{p,errors}=await setup();try{
 await p.locator('#db-palette > summary').click();await p.locator('[data-db-kind=circle]').click();
 assert.equal(await p.locator('#wp-selection-title').textContent(),'Circle block');
 await p.locator('#wp-tab-style').click();assert.equal(await p.locator('#db-remove').isVisible(),true);assert.equal(await p.locator('#db-remove').textContent(),'Delete block');
 const before=await read(p);await p.locator('#db-duplicate').click();assert.equal((await read(p)).slides[0].tree.length,before.slides[0].tree.length+1);await p.locator('#fe-undo').click();
 await p.locator('#db-list').selectOption({index:1});await p.locator('#db-remove').click();assert.equal((await read(p)).slides[0].tree.length,before.slides[0].tree.length-1);await p.locator('#fe-undo').click();assert.deepEqual(await read(p),before);
 await p.locator('#db-list').selectOption({index:1});await click(p,'#ce-slide-lock');assert.equal(await p.locator('#db-remove').isDisabled(),true);assert.equal(await p.locator('#db-duplicate').isDisabled(),true);
 assert.deepEqual(errors,[]);
 }finally{await p.close();}});

test('slide secondary actions are keyboard reachable and duplicate full grid media in one undo step',async()=>{const{p,errors}=await setup(1366);try{
 await addSlide(p,'media-grid');
 await p.locator('#fe-preview .mg-cell-action').first().evaluate(el=>{const d=new DataTransfer();d.items.add(new File(['<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50"><rect width="50" height="50" fill="blue"/></svg>'],'grid.svg',{type:'image/svg+xml'}));el.dispatchEvent(new DragEvent('drop',{bubbles:true,dataTransfer:d}));});
 const before=await pack(p),source=before.state.slides.find(s=>s.template==='media-grid');
 const row=p.locator('.wp-slide-row').filter({has:p.locator('.fe-slide-button[data-slide-id="'+source.id+'"]')});
 await row.locator('.fe-slide-button').focus();assert.equal(await row.locator('.wp-slide-actions').evaluate(el=>getComputedStyle(el).opacity),'1');
 await row.getByRole('button',{name:'Duplicate slide: '+source.title,exact:true}).press('Enter');
 const after=await pack(p),copy=after.state.slides.find(s=>s.title===source.title+' (copy)');assert(copy);assert.deepEqual(after.state.mediaObjects[copy.id],before.state.mediaObjects[source.id]);assert.equal(after.history.past.length,before.history.past.length+1);
 await p.locator('#fe-undo').click();assert.deepEqual(await read(p),before.state);
 assert.deepEqual(errors,[]);
 }finally{await p.close();}});
