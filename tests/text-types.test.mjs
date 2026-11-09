import test from 'node:test';
import {reveal} from './ui.mjs';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {openExample,snapshot,operations,exportZip,importZip} from './collection-ui.mjs';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']});test.after(()=>browser.close());
const text=n=>n?.text??(n?.children||[]).map(text).join('');
const slot=(tree,name)=>{for(const n of tree){if(n.attrs?.class?.split(/\s+/).includes('lc-slot-'+name))return n;const found=slot(n.children||[],name);if(found)return found;}};

test('layer locks and structured table content prevent text conversion without partial mutations',async()=>{
 const{page:p,errors}=await openExample(browser,'portfolio-demo');try{
  const first=await snapshot(p),id=first.state.slides[0].id,path=await p.locator('#fe-preview .lc-slot-context').getAttribute('data-vb-path');assert.equal((await operations(p,[{type:'design.meta',slideId:id,keys:['node-'+path.split('.')[0]],changes:{locked:true}}])).ok,true);const locked=await snapshot(p);assert.equal((await operations(p,[{type:'text.type',slideId:id,path,tag:'h1'}])).code,'LOCKED');assert.deepEqual((await snapshot(p)).state,locked.state);
  const result=await operations(p,[{type:'slide.create',sectionId:first.state.sections[0].id,template:'table',title:'Structured table'}]);assert.equal(result.ok,true);const tableId=result.created[0];await p.locator('.fe-slide-button[data-slide-id="'+tableId+'"]').click();const cell=p.locator('#fe-preview td[data-vb-path]').first(),cellPath=await cell.getAttribute('data-vb-path');await cell.dblclick();assert.equal(await p.locator('#tt-control').isVisible(),false);await cell.press('Escape');const before=await snapshot(p);assert.equal((await operations(p,[{type:'text.type',slideId:tableId,path:cellPath,tag:'p'}])).code,'INVALID');assert.deepEqual((await snapshot(p)).state,before.state);assert.deepEqual(errors,[]);
 }finally{await p.close();}
});

test('Content text style preserves rich text, selection, slots, title identity and one-step Undo',async()=>{
 const{page:p,errors}=await openExample(browser,'portfolio-demo');try{
  const body=p.locator('#fe-preview .lc-slot-context');await body.dblclick();await p.evaluate(()=>{const e=document.querySelector('#fe-preview .lc-slot-context');e.innerHTML='<strong>Preserved bold</strong> and <i>italic text</i>';e.dispatchEvent(new InputEvent('input',{bubbles:true}));});await body.press('Escape');
  await body.dblclick();await body.evaluate(el=>{const t=el.querySelector('strong').firstChild;window.getSelection().setBaseAndExtent(t,2,t,9);});const before=await snapshot(p);const path=await body.getAttribute('data-vb-path');
  await reveal(p,'#tt-type');await p.locator('#tt-type').selectOption('h3');const after=await snapshot(p),old=slot(before.state.slides[0].tree,'context'),next=slot(after.state.slides[0].tree,'context');assert.equal(next.tag,'h3');assert.deepEqual(next.children,old.children);assert.deepEqual({...next.attrs,class:old.attrs.class},old.attrs);for(const c of old.attrs.class.split(/\s+/))assert(next.attrs.class.split(/\s+/).includes(c));assert.equal(after.state.slides[0].title,before.state.slides[0].title);assert.equal(await p.locator('#fe-preview .lc-slot-context').getAttribute('data-vb-path'),path);assert.equal(await p.evaluate(()=>window.getSelection().toString()),'eserved');assert.equal(await p.locator('#tt-type').inputValue(),'h3');
  await p.locator('#fe-undo').click();assert.deepEqual((await snapshot(p)).state,before.state);
  const title=p.locator('#fe-preview .lc-slot-title');await title.dblclick();await reveal(p,'#tt-type');await p.locator('#tt-type').selectOption('p');assert.equal(await p.locator('#fe-preview p.lc-slot-title').count(),1);await p.locator('#fe-slide-title').fill('Still the slide title');await p.locator('#fe-slide-title').press('Tab');await p.waitForFunction(()=>document.querySelector('#fe-preview .lc-slot-title')?.textContent==='Still the slide title');assert.equal(text(slot((await snapshot(p)).state.slides[0].tree,'context')),text(old));assert.deepEqual(errors,[]);await p.screenshot({path:'test-results/text-type-content.png'});
 }finally{await p.close();}
});

test('converted Heading 3 title retains its title role across layout changes, Undo and reopening',async()=>{
 const{page:p,errors}=await openExample(browser,'portfolio-demo');try{
  const id=(await snapshot(p)).state.slides[0].id;
  await p.locator('#fe-preview .lc-slot-title').dblclick();await reveal(p,'#tt-type');await p.locator('#tt-type').selectOption('h3');await p.locator('#fe-slide-title').fill('Retained Heading 3 title');await p.locator('#fe-slide-title').press('Tab');
  const before=await snapshot(p),title=slot(before.state.slides[0].tree,'title');assert.equal(title.tag,'h3');
  assert.equal((await operations(p,[{type:'layout.apply',slideId:id,template:'hero',keep:true}])).ok,true);
  const changed=await snapshot(p),slide=changed.state.slides[0];assert.equal(slide.title,'Retained Heading 3 title');assert.equal(await p.locator('#fe-preview h3.editor-title').textContent(),'Retained Heading 3 title');assert.equal(await p.locator('#fe-preview .lc-retained h3.editor-title').count(),0);
  await p.locator('#fe-undo').click();assert.deepEqual((await snapshot(p)).state,before.state);
  assert.equal((await operations(p,[{type:'layout.apply',slideId:id,template:'hero',keep:true}])).ok,true);const expected=await snapshot(p);
  const q=await importZip(browser,await exportZip(p),expected.projectId);try{assert.deepEqual((await snapshot(q)).state,expected.state);assert.equal(await q.locator('#fe-preview h3.editor-title').textContent(),'Retained Heading 3 title');}finally{await q.close();}assert.deepEqual(errors,[]);
 }finally{await p.close();}
});

test('text type rejects unsafe targets and locks atomically, and survives editable/playback reopening',async()=>{
 const{page:p,errors}=await openExample(browser,'editorial-demo');try{
  const before=await snapshot(p),slide=before.state.slides[0],path=await p.locator('#fe-preview .lc-slot-lead').getAttribute('data-vb-path');
  for(const op of [{path,tag:'div'},{path:'__proto__',tag:'h1'},{path:'0',tag:'li'}]){assert.equal((await operations(p,[{type:'text.type',slideId:slide.id,...op}])).ok,false);assert.deepEqual((await snapshot(p)).state,before.state);}
  assert.equal((await operations(p,[{type:'text.type',slideId:slide.id,path,tag:'h2'}])).ok,true);const expected=await snapshot(p);await p.locator('#fe-preview .lc-slot-lead').dblclick();await reveal(p,'#tt-type');await p.locator('#tt-type').selectOption('p');await p.locator('#fe-undo').click();assert.deepEqual((await snapshot(p)).state,expected.state);
  const q=await importZip(browser,await exportZip(p),expected.projectId);try{assert.deepEqual((await snapshot(q)).state,expected.state);}finally{await q.close();}
  const files=await p.evaluate(async bytes=>{const z=await JSZip.loadAsync(new Uint8Array(bytes));return{json:JSON.parse(await z.file('presentation.json').async('string')),html:await z.file('index.html').async('string')};},[...await exportZip(p,'#fe-playback')]);assert.equal(slot(files.json.state.slides[0].tree,'lead').tag,'h2');assert.match(files.html,/lc-slot-lead/);
  const bytes=await p.evaluate(async bytes=>{const z=await JSZip.loadAsync(new Uint8Array(bytes)),pack=JSON.parse(await z.file('presentation.json').async('string'));pack.meta.id='text-lock-test';pack.meta.name='Locked';pack.state.editLocked=true;z.file('presentation.json',JSON.stringify(pack));return [...await z.generateAsync({type:'uint8array'})];},[...await exportZip(p)]);await p.locator('#fe-import-file').setInputFiles({name:'locked.zip',mimeType:'application/zip',buffer:Buffer.from(bytes)});await p.waitForFunction(()=>window.presentationStudioEditing.read().projectId==='text-lock-test');const snapshotLocked=await snapshot(p);assert.equal((await operations(p,[{type:'text.type',slideId:slide.id,path,tag:'h3'}])).code,'LOCKED');assert.deepEqual((await snapshot(p)).state,snapshotLocked.state);assert.deepEqual(errors,[]);
 }finally{await p.close();}
});
