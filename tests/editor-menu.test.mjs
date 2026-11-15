import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {resolve} from 'node:path';
import {mkdir,readFile} from 'node:fs/promises';
import {snapshot,operations} from './collection-ui.mjs';
import {selectElement,reveal} from './ui.mjs';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']});
test.after(()=>browser.close());
async function open(width=1440){const page=await browser.newPage({viewport:{width,height:900},acceptDownloads:true});page.setDefaultTimeout(10000);const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(('file://'+resolve('dist/presentation-studio.html')) + '?start=present');await page.locator('#open-full-editor').click();return{page,errors};}
async function menu(page,name){const host=page.locator(name==='File'?'#hub-project-menu':'#em-'+name.toLowerCase());await host.locator(':scope > summary').click();return host.locator(':scope > .hub-menu-items');}
async function shape(page){const slideId=(await snapshot(page)).state.slides[0].id,result=await operations(page,[{type:'block.create',slideId,kind:'rectangle'}]);assert.equal(result.ok,true);await selectElement(page,result.created[0]);return{slideId,key:result.created[0]};}

test('Windows-style menus preserve view state and expose Inspector destinations including audio/background',async()=>{
 const {page,errors}=await open();try{
  assert.deepEqual(await page.locator('#em-menubar > details > summary').allTextContents(),['File','Edit','View','Insert','Format','Arrange','Slide','Help']);
  const before=await snapshot(page);
  for(const name of ['File','Edit','View','Insert','Format','Arrange','Slide','Help']){await menu(page,name);assert.equal(await page.locator('.mh-target:popover-open').count(),0);assert.equal(await page.locator('.mh-target:visible').count(),0);await page.keyboard.press('Escape');}
  assert.deepEqual(await snapshot(page),before);
  for(const [label,target]of [['Background…','#cb-source'],['Sound / narration…','#au-slide-file'],['Layout…','#fe-slide-template'],['Presenter notes…','#fe-notes-text']]){
   const panel=await menu(page,'Slide');await panel.getByRole('menuitem',{name:label,exact:true}).click();assert.equal(await page.locator(target).isVisible(),true,label);assert.equal(await page.locator(target).evaluate(n=>document.activeElement===n),true,label);
  }
  let panel=await menu(page,'Insert');await panel.getByRole('menuitem',{name:'Presentation audio…',exact:true}).click();assert.equal(await page.locator('#fe-audio-panel').isVisible(),true);await page.locator('#we-settings-close').click();
  panel=await menu(page,'Insert');await panel.getByRole('menuitem',{name:'Tables & code…',exact:true}).click();assert.equal(await page.locator('#component-category').inputValue(),'Data');await page.locator('#component-close').click();
  assert.deepEqual(await snapshot(page),before);assert.deepEqual(errors,[]);
 }finally{await page.close();}
});

test('menu keyboard arrows, submenus, Escape and Tab return to normal navigation',async()=>{
 const {page,errors}=await open();try{
  await shape(page);const before=await snapshot(page);await page.waitForFunction(()=>document.querySelectorAll('.mh-target:popover-open').length>0);
  await page.keyboard.press('Alt+Shift+m');assert.equal(await page.evaluate(()=>document.activeElement.textContent),'File');
  for(let i=0;i<5;i++)await page.keyboard.press('ArrowRight');assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Arrange');
  await page.keyboard.press('ArrowDown');assert.equal(await page.locator('.mh-target:popover-open').count(),0);assert.equal(await page.locator('.mh-target:visible').count(),0);await page.locator('#em-arrange [aria-haspopup=menu]').filter({hasText:'Align'}).focus();await page.keyboard.press('ArrowRight');assert.equal(await page.locator('#em-arrange .hub-menu-items').getByRole('menuitem',{name:'Left',exact:true}).isVisible(),true);
  await page.keyboard.press('ArrowLeft');assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Align›');await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Arrange');await page.waitForFunction(()=>document.querySelectorAll('.mh-target:popover-open').length>0);
  await page.keyboard.press('ArrowDown');await page.keyboard.press('Tab');assert.equal(await page.locator('#em-arrange').evaluate(n=>n.open),false);assert.equal(await page.evaluate(()=>!!document.activeElement.closest('#em-menubar')),false);
  await page.keyboard.press('Alt+Shift+m');await page.keyboard.press('ArrowDown');await page.keyboard.press('Shift+Tab');assert.equal(await page.locator('#hub-project-menu').evaluate(n=>n.open),false);assert.equal(await page.evaluate(()=>!!document.activeElement.closest('#em-menubar')),false);
  const file=await menu(page,'File');await file.locator('#hub-export-menu > summary').focus();await page.keyboard.press('ArrowRight');assert.equal(await page.evaluate(()=>document.activeElement.id),'fe-export');await page.keyboard.press('ArrowLeft');assert.equal(await page.locator('#hub-export-menu').evaluate(n=>n.open),false);
  await page.keyboard.press('Escape');
  const nativeShortcuts=await page.locator('#we-viewport').evaluate(node=>['l','h'].map(key=>{const event=new KeyboardEvent('keydown',{key,ctrlKey:true,bubbles:true,cancelable:true});node.dispatchEvent(event);return event.defaultPrevented;}));assert.deepEqual(nativeShortcuts,[false,false]);
  assert.deepEqual(await snapshot(page),before);assert.deepEqual(errors,[]);
 }finally{await page.close();}
});

test('selection commands reuse Undo, finish pending fields and reject stale targets including File',async()=>{
 const {page,errors}=await open();try{
  const {slideId,key}=await shape(page),before=await snapshot(page);
  let panel=await menu(page,'Edit');await panel.getByRole('menuitem',{name:'Duplicate selection',exact:true}).click();assert.notDeepEqual((await snapshot(page)).state,before.state);await page.locator('#fe-undo').click();assert.deepEqual((await snapshot(page)).state,before.state);
  await selectElement(page,key);panel=await menu(page,'Arrange');await panel.getByRole('menuitem',{name:'Position & size…',exact:true}).click();assert.equal(await page.locator('#wp-tab-arrange').getAttribute('aria-selected'),'true');assert.equal(await page.evaluate(()=>!!document.activeElement.closest('#we-inspector')),true);
  panel=await menu(page,'Edit');await operations(page,[{type:'element.rename',slideId,keys:[key],name:'Changed while menu open'}]);const stale=await snapshot(page);await panel.getByRole('menuitem',{name:'Duplicate selection',exact:true}).click();assert.deepEqual(await snapshot(page),stale);assert.match(await page.locator('#fe-message').textContent(),/changed/);
  panel=await menu(page,'File');await operations(page,[{type:'element.rename',slideId,keys:[key],name:'Changed again'}]);const fileStale=await snapshot(page);await panel.locator('#fe-import').click();assert.equal(await page.locator('#hub-project-menu').evaluate(n=>n.open),false);assert.deepEqual(await snapshot(page),fileStale);assert.match(await page.locator('#fe-message').textContent(),/changed/);
  await page.locator('#ic-slide-settings').click();await reveal(page,'#fe-slide-title');await page.locator('#fe-slide-title').fill('Committed through menu');panel=await menu(page,'Slide');await panel.getByRole('menuitem',{name:'Duplicate slide',exact:true}).click();const after=await snapshot(page);assert.equal(after.state.slides.find(s=>s.id===slideId).title,'Committed through menu');assert.equal(after.state.slides.filter(s=>s.title.startsWith('Committed through menu')).length,2);
  assert.deepEqual(errors,[]);
 }finally{await page.close();}
});

test('Help opens published website/docs and gallery separately without changing the project',async()=>{
 const {page,errors}=await open();try{
  const before=await snapshot(page);
  for(const [label,url]of [['Website & documentation ↗','https://docs.pres-studio.com/'],['Presentation gallery ↗','https://gallery.pres-studio.com/']]){
   await page.context().route(url,route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Help destination fixture</title>'}));
   const panel=await menu(page,'Help'),opened=page.context().waitForEvent('page');await panel.getByRole('menuitem',{name:label,exact:true}).click();
   const external=await opened;await external.waitForLoadState();assert.equal(external.url(),url);assert.equal(await external.evaluate(()=>window.opener),null);await external.close();
   assert.equal(await page.locator('#full-editor').evaluate(node=>node.open),true);assert.equal(await page.locator('#em-help').evaluate(node=>node.open),false);assert.deepEqual(await snapshot(page),before);
  }
  assert.deepEqual(errors,[]);
 }finally{await page.close();}
});

test('locked and mixed selections retain a stable menu inventory and guarded actions',async()=>{
 const {page,errors}=await open();try{
  const {slideId,key}=await shape(page);let panel=await menu(page,'Arrange');const labels=await panel.locator(':scope > button').allTextContents();await page.keyboard.press('Escape');
  await operations(page,[{type:'design.meta',slideId,keys:[key],changes:{locked:true}}]);await selectElement(page,key);panel=await menu(page,'Arrange');assert.equal(await panel.getByRole('menuitem',{name:'Group',exact:true}).isDisabled(),true);assert.equal(await panel.getByRole('menuitem',{name:'Bring forward',exact:true}).isDisabled(),true);assert.match(await panel.innerText(),/Locked or read-only/);assert.equal((await panel.locator(':scope > button').allTextContents()).length,labels.length);await page.keyboard.press('Escape');
  await operations(page,[{type:'design.meta',slideId,keys:[key],changes:{locked:false}},{type:'block.create',slideId,kind:'circle'}]);await page.locator('#ld-reveal-layers').click();await page.locator('.sp-layer-row input[type=checkbox]').first().check();await page.locator('.sp-layer-row input[type=checkbox]').last().check();panel=await menu(page,'Format');assert.equal(await panel.getByRole('menuitem',{name:'Edit selected content…',exact:true}).isDisabled(),true);await page.keyboard.press('Escape');assert.deepEqual(errors,[]);
 }finally{await page.close();}
});

test('File export remains a complete portable ZIP and closes the menu',async()=>{
 const {page,errors}=await open();try{
  const before=await snapshot(page),panel=await menu(page,'File');await panel.locator('#hub-export-menu > summary').click();const download=page.waitForEvent('download');await panel.locator('#fe-export').click();const result=await download;assert.match(result.suggestedFilename(),/\.zip$/);assert((await readFile(await result.path())).length>1000);assert.equal(await page.locator('#hub-project-menu').evaluate(n=>n.open),false);assert.deepEqual(await snapshot(page),before);assert.deepEqual(errors,[]);
 }finally{await page.close();}
});

test('desktop/light/dark and narrow menus fit the viewport with authentic review captures',async()=>{
 await mkdir('test-results/menu-review',{recursive:true});const {page,errors}=await open();try{
  await shape(page);const before=await snapshot(page);
  for(const [name,width,dark]of [['desktop-light',1440,false],['desktop-dark',1440,true],['laptop-dark',1024,true],['narrow-light',390,false]]){
   await page.setViewportSize({width,height:900});await page.evaluate(dark=>document.body.classList.toggle('editor-dark',dark),dark);const panel=await menu(page,'Arrange'),box=await panel.boundingBox();assert(box.x>=0&&box.x+box.width<=width+1);assert(box.y>=0&&box.y+box.height<=900);await page.screenshot({path:'test-results/menu-review/'+name+'.png'});
   const layout=await page.locator('#full-editor').evaluate(editor=>({width:editor.clientWidth,scroll:editor.scrollWidth,overflow:[...editor.querySelectorAll('[id]')].filter(node=>node.checkVisibility()&&!node.closest('#fe-preview')&&node.getBoundingClientRect().right>editor.getBoundingClientRect().right+1).slice(0,12).map(node=>({id:node.id,right:node.getBoundingClientRect().right,width:node.getBoundingClientRect().width}))}));assert(layout.scroll<=layout.width+1,name+' '+JSON.stringify(layout));await page.keyboard.press('Escape');
  }
  assert.deepEqual(await snapshot(page),before);assert.deepEqual(errors,[]);
 }finally{await page.close();}
});
