import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import vm from 'node:vm';
import {archivePath} from './archive-path.mjs';
import {reveal,selectTab} from './ui.mjs';
import {openExample,snapshot,operations,exportZip,importZip} from './collection-ui.mjs';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']});
test.after(()=>browser.close());
const blockID=node=>node.attrs?.class?.match(/\bblock-[\w-]+/)?.[0];
function findTable(state){
  const slide=state.slides[0];let result;
  const walk=(nodes,prefix='')=>nodes.forEach((node,i)=>{const path=prefix+i;if(node.tag==='table')result={node,path};if(node.children)walk(node.children,path+'.children.');});
  walk(slide.tree);return {...result,slideId:slide.id};
}
async function empty(){const value=await openExample(browser,'portfolio-demo');const id=(await snapshot(value.page)).state.slides[0].id;assert.equal((await operations(value.page,[{type:'design.clear',slideId:id}])).ok,true);return {...value,id};}
async function insertTable(page,id,header=true){assert.equal((await operations(page,[{type:'table.insert',slideId:id,rows:3,columns:3,header}])).ok,true);return findTable((await snapshot(page)).state);}
async function action(page,table,action,row=1,column=1,extra={}){const result=await operations(page,[{type:'table.structure',slideId:table.slideId,path:table.path,action,row,column,...extra}]);assert.equal(result.ok,true,result.message);return findTable((await snapshot(page)).state);}

test('existing template table retains cell context through focused row/column actions and Undo',async()=>{
  const {page,errors}=await openExample(browser,'template');try{
    const initial=await snapshot(page),slide=initial.state.slides.find(item=>item.template==='table');
    await page.locator('.fe-slide-button[data-slide-id="'+slide.id+'"]').click();
    await page.locator('#fe-preview tbody td').nth(1).click();
    const rowCount=await page.locator('#fe-preview table tr').count(),columnCount=await page.locator('#fe-preview table tr').first().locator('th,td').count();
    await page.locator('#tbl-action-row').focus();
    // Give the deferred inline-editor focusout handler a chance to run before changing the select.
    await page.waitForTimeout(100);
    assert.equal(await page.locator('#tbl-toolbar').isVisible(),true);
    assert.match(await page.locator('#tbl-context').textContent(),/Column 2/);
    await page.locator('#tbl-action-row').selectOption('row-after');
    assert.equal(await page.locator('#fe-preview table tr').count(),rowCount+1);
    await page.locator('#tbl-action-column').focus();await page.waitForTimeout(100);
    await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
    assert.equal(await page.locator('#fe-preview table tr').first().locator('th,td').count(),columnCount+1);
    await page.locator('#fe-undo').click();
    assert.equal(await page.locator('#fe-preview table tr').first().locator('th,td').count(),columnCount);
    await page.locator('#fe-redo').click();
    assert.equal(await page.locator('#fe-preview table tr').first().locator('th,td').count(),columnCount+1);
    await page.locator('#tbl-action-column').selectOption('column-delete');
    assert.equal(await page.locator('#fe-preview table tr').first().locator('th,td').count(),columnCount);
    await page.locator('#tbl-action-row').selectOption('row-delete');
    assert.equal(await page.locator('#fe-preview table tr').count(),rowCount);
    assert.equal((await snapshot(page)).state.slides.find(item=>item.id===slide.id).id,slide.id);
    await page.locator('.fe-slide-button[data-slide-id="'+initial.state.slides[0].id+'"]').click();
    assert.equal(await page.locator('#tbl-toolbar').isVisible(),false);
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
});

test('table actions retarget when selecting a second table instead of retaining the old cell',async()=>{
  const {page,errors,id}=await empty();try{
    await insertTable(page,id,false);await insertTable(page,id,false);
    const tables=page.locator('#fe-preview table');
    // Inserted tables overlap initially; DOM focus/click chooses each cell without dragging a frame.
    await tables.first().locator('td').first().evaluate(el=>el.click());
    await page.locator('#tbl-action-row').focus();await page.waitForTimeout(100);
    await page.locator('#tbl-action-row').selectOption('row-after');
    assert.equal(await tables.first().locator('tr').count(),4);
    await tables.last().locator('td').first().evaluate(el=>el.click());
    await page.locator('#tbl-action-column').focus();await page.waitForTimeout(100);
    await page.locator('#tbl-action-column').selectOption('column-after');
    assert.equal(await tables.first().locator('tr').first().locator('td').count(),3);
    assert.equal(await tables.last().locator('tr').first().locator('td').count(),4);
    assert.equal(await tables.last().locator('tr').count(),3);assert.deepEqual(errors,[]);
  }finally{await page.close();}
});

test('template table Inspector keeps pending cell edits and clears context for another object',async()=>{
  const {page,errors}=await openExample(browser,'template');try{
    const initial=await snapshot(page),slide=initial.state.slides.find(item=>item.template==='table');
    await page.locator('.fe-slide-button[data-slide-id="'+slide.id+'"]').click();
    const cell=page.locator('#fe-preview tbody td').first();await cell.click();await cell.fill('Pending template cell');
    await page.locator('#ci-table-editor > summary').click();
    await page.locator('#ci-table-editor input').last().focus();await page.waitForTimeout(100);
    assert.equal(await page.locator('#tbl-toolbar').isVisible(),true);
    assert.equal(await page.locator('#fe-preview tbody td').first().textContent(),'Pending template cell');
    await page.locator('#wp-tab-style').click();await page.locator('#tbl-spacing').focus();await page.waitForTimeout(100);
    assert.equal(await page.locator('#tbl-style').isVisible(),true);
    await page.locator('#tbl-spacing').selectOption('compact');
    assert.equal(await page.locator('#fe-preview table.ts-spacing-compact').count(),1);
    await page.locator('#fe-preview h1,#fe-preview h2').first().click();
    assert.equal(await page.locator('#tbl-toolbar').isVisible(),false);
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
});

test('panel cell edits repaint the canvas and survive returning to inline editing',async()=>{
  const {page,errors}=await openExample(browser,'template');try{
    const slide=(await snapshot(page)).state.slides.find(item=>item.template==='table');
    await page.locator('.fe-slide-button[data-slide-id="'+slide.id+'"]').click();
    const cell=page.locator('#fe-preview tbody td').first();await cell.click();await cell.fill('Inline before panel');
    await page.locator('#ci-table-editor > summary').click();
    const field=page.getByRole('textbox',{name:'Row 1 column 1',exact:true});await field.fill('Panel value');await page.waitForTimeout(500);
    assert.equal(await cell.textContent(),'Panel value');assert.equal(await field.evaluate(el=>el===document.activeElement),true);
    assert.equal(await page.locator('#tbl-toolbar').isVisible(),true);
    await cell.click();await cell.press('End');await page.keyboard.type(' plus inline');await page.waitForTimeout(500);
    assert.equal(await cell.textContent(),'Panel value plus inline');
    const pack=JSON.parse(await exportZip(page,'#fe-export-json'));
    assert.match(JSON.stringify(pack.state.slides.find(item=>item.id===slide.id).tree),/Panel value plus inline/);
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
});

test('headerless tables retain all cells through contextual insertion, deletion and header toggles',async()=>{
  const {page,errors,id}=await empty();try{
    let table=await insertTable(page,id,false);const original=table.node.children[0].children;
    table=await action(page,table,'column-before',1,1);assert.equal(table.node.children[0].children[0].children.length,4);
    table=await action(page,table,'column-delete',1,1);assert.deepEqual(table.node.children[0].children,original);
    table=await action(page,table,'row-before');assert.equal(table.node.children[0].children.length,4);
    table=await action(page,table,'row-delete');assert.deepEqual(table.node.children[0].children,original);
    table=await action(page,table,'header',0,0,{enabled:true});assert.equal(table.node.children.find(node=>node.tag==='thead').children[0].children[0].attrs.scope,'col');
    table=await action(page,table,'header',0,0,{enabled:false});assert.deepEqual(table.node.children.find(node=>node.tag==='tbody').children,original);
    await page.locator('#fe-preview td').nth(4).click();assert.match(await page.locator('#tbl-context').textContent(),/Row 2 · Column 2/);
    await page.locator('#tbl-action-row').selectOption('row-after');assert.equal(await page.locator('#fe-preview tbody tr').count(),4);
    await page.locator('#fe-undo').click();assert.equal(await page.locator('#fe-preview tbody tr').count(),3);
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
});

test('table structural edits preserve rich cells, lock guards, captions and undo boundaries',async()=>{
  const {page,errors,id}=await empty();try{
    let table=await insertTable(page,id);
    const cell=page.locator('#fe-preview tbody td').first();await cell.dblclick();await cell.press('ControlOrMeta+a');await cell.press('ControlOrMeta+b');await page.keyboard.type('Formatted');await page.locator('#ic-select-parent').click();
    const before=await snapshot(page);table=findTable(before.state);const preserved=table.node.children.find(node=>node.tag==='tbody').children[0];assert.match(JSON.stringify(preserved),/strong|"b"/);
    table=await action(page,table,'row-after',2,0);assert.deepEqual(table.node.children.find(node=>node.tag==='tbody').children[0],preserved);
    await page.locator('#fe-undo').click();assert.deepEqual((await snapshot(page)).state,before.state);
    const key=blockID(before.state.slides[0].tree[0]);assert.equal((await operations(page,[{type:'design.meta',slideId:id,keys:[key],changes:{locked:true}}])).ok,true);
    const locked=await snapshot(page);assert.equal((await operations(page,[{type:'table.structure',slideId:id,path:table.path,action:'column-delete',row:0,column:0}])).code,'LOCKED');assert.deepEqual((await snapshot(page)).state,locked.state);
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
});

test('table presets and custom colors survive independent library copies and editable ZIP restore',async()=>{
  const {page,errors,id}=await empty();try{
    const table=await insertTable(page,id);
    await page.locator('#fe-preview td').first().click();await page.locator('#wp-tab-style').click();
    await page.locator('#tbl-presets button[data-preset=banded]').click();
    const outline=await page.locator('#fe-preview .tbl-selected-cell').evaluate(el=>getComputedStyle(el).outlineColor);assert.notEqual(outline,'rgba(0, 0, 0, 0)');
    await page.locator('#tbl-border').selectOption('grid');await page.locator('#tbl-spacing').selectOption('compact');
    await page.locator('#tbl-alternate').fill('#e0efff');await page.locator('#tbl-alternate').dispatchEvent('change');
    const style=await page.locator('#fe-preview tbody tr').nth(1).locator('td').first().evaluate(el=>({fill:getComputedStyle(el).backgroundColor,padding:getComputedStyle(el).padding}));
    assert.equal(style.fill,'rgb(224, 239, 255)');assert.equal(style.padding,'8px 12px');
    const expected=await snapshot(page),restored=await importZip(browser,await exportZip(page),expected.projectId);
    try{assert.deepEqual((await snapshot(restored)).state,expected.state);assert.equal(await restored.locator('#fe-preview tbody tr').nth(1).locator('td').first().evaluate(el=>getComputedStyle(el).backgroundColor),style.fill);}finally{await restored.close();}
    await page.locator('#component-open').click();await page.locator('#component-save-panel > summary').click();await page.locator('#component-name').fill('Banded milestones');await page.locator('#component-save').click();await page.getByRole('tab',{name:'My components',exact:true}).click();await page.getByRole('button',{name:'Insert Banded milestones',exact:true}).click();
    assert.equal(await page.locator('#fe-preview table.ts-table').count(),2);
    const first=findTable(expected.state).node.attrs.class;assert.match(first,/ts-alternate-ce0efff/);
    assert.equal((await operations(page,[{type:'table.style',slideId:id,path:table.path,reset:true}])).ok,true);
    assert.equal(await page.locator('#fe-preview table.ts-table').count(),1);assert.deepEqual(errors,[]);
  }finally{await page.close();}
});

test('Shift+click toggles canvas selection and shortcuts group/ungroup without moving members',async()=>{
  const {page,errors,id}=await empty();try{
    const created=await operations(page,[{type:'block.create',slideId:id,kind:'rectangle',placement:{x:.12,y:.25,w:.2,h:.2}},{type:'block.create',slideId:id,kind:'circle',placement:{x:.45,y:.25,w:.2,h:.2}}]);assert.equal(created.ok,true);
    const [a,b]=created.created,first=page.locator('#fe-preview .'+a),second=page.locator('#fe-preview .'+b);
    await first.click({modifiers:['Shift']});await second.click({modifiers:['Shift']});assert.match(await page.locator('#gs-status').textContent(),/2 items/);
    await second.click({modifiers:['Shift']});assert.match(await page.locator('#gs-status').textContent(),/1 items/);await second.click({modifiers:['Shift']});
    const before=await snapshot(page);await page.locator('#gs-group').focus();await page.keyboard.press('ControlOrMeta+g');
    assert.equal(await page.locator('#fe-preview .gs-bounds').count(),1);assert.equal(await page.locator('#gs-ungroup').isVisible(),true);
    const grouped=await snapshot(page);assert.deepEqual(grouped.state.slides[0].tree,before.state.slides[0].tree);
    await page.locator('#gs-ungroup').focus();await page.keyboard.press('ControlOrMeta+Shift+g');
    const ungrouped=await snapshot(page);assert.deepEqual(ungrouped.state.slides[0].tree,before.state.slides[0].tree);assert.match(await page.locator('#gs-status').textContent(),/2 items/);
    await page.locator('#fe-undo').click();assert.deepEqual((await snapshot(page)).state,grouped.state);assert.deepEqual(errors,[]);
  }finally{await page.close();}
});

test('drag marquee fully encloses eligible objects and ignores locked/hidden members',async()=>{
  const {page,errors,id}=await empty();try{
    const result=await operations(page,[{type:'block.create',slideId:id,kind:'rectangle',placement:{x:.15,y:.3,w:.15,h:.15}},{type:'block.create',slideId:id,kind:'circle',placement:{x:.4,y:.3,w:.15,h:.15}},{type:'block.create',slideId:id,kind:'rectangle',placement:{x:.65,y:.3,w:.15,h:.15}}]);
    assert.equal(result.ok,true);assert.equal((await operations(page,[{type:'design.meta',slideId:id,keys:[result.created[2]],changes:{locked:true}}])).ok,true);
    const slide=await page.locator('#fe-preview .slide').boundingBox();
    await page.mouse.move(slide.x+slide.width*.08,slide.y+slide.height*.22);await page.mouse.down();await page.mouse.move(slide.x+slide.width*.9,slide.y+slide.height*.6,{steps:10});await page.mouse.up();
    assert.match(await page.locator('#gs-status').textContent(),/2 items/);assert.equal(await page.locator('#fe-preview .gs-selected.sp-locked').count(),0);
    await page.locator('#gs-group').click();assert.equal(await page.locator('.gs-layer-group').count(),1);assert.deepEqual(errors,[]);
  }finally{await page.close();}
});

test('group bounds move as a unit; edit group and Escape return; ungroup keeps released selection',async()=>{
  const {page,errors,id}=await empty();try{
    const result=await operations(page,[{type:'block.create',slideId:id,kind:'rectangle',placement:{x:.12,y:.3,w:.2,h:.2}},{type:'block.create',slideId:id,kind:'circle',placement:{x:.45,y:.3,w:.2,h:.2}}]);const keys=result.created;
    assert.equal((await operations(page,[{type:'component.group',slideId:id,keys}])).ok,true);
    await page.locator('#fe-preview .'+keys[0]).click();assert.equal(await page.locator('#fe-preview .gs-bounds').count(),1);
    const before=await snapshot(page),move=await page.getByRole('button',{name:'Move selected objects',exact:true}).boundingBox();
    await page.mouse.move(move.x+10,move.y+move.height/2);await page.mouse.down();await page.mouse.move(move.x+40,move.y+move.height/2+20,{steps:5});await page.mouse.up();
    assert.notDeepEqual((await snapshot(page)).state.slides[0].tree,before.state.slides[0].tree);
    await page.locator('#fe-undo').click();assert.deepEqual((await snapshot(page)).state,before.state);
    await page.locator('#gs-edit').click();assert.match(await page.locator('#gs-status').textContent(),/Editing Group/);assert.equal(await page.locator('#fe-preview .gs-selected').count(),1);
    await page.locator('#gs-exit').focus();await page.keyboard.press('Escape');assert.equal(await page.locator('#fe-preview .gs-selected').count(),2);
    await page.locator('#gs-ungroup').click();assert.equal(await page.locator('.gs-layer-group').count(),0);assert.equal(await page.locator('#fe-preview .gs-selected').count(),2);assert.deepEqual(errors,[]);
  }finally{await page.close();}
});

test('styled table playback and independent booth exports reopen offline with matching colors',async()=>{
  const {page,errors,id}=await empty();try{
    const table=await insertTable(page,id);
    assert.equal((await operations(page,[{type:'table.style',slideId:id,path:table.path,preset:'banded',changes:{hfill:'c123456',alternate:'ce0efff',spacing:'compact'}}])).ok,true);
    const sandbox={setImmediate,clearImmediate,setTimeout,clearTimeout,Uint8Array,ArrayBuffer,TextEncoder,TextDecoder};vm.runInNewContext(await readFile('vendor/jszip-3.10.1.min.js','utf8'),sandbox);
    const playback=await exportZip(page,'#fe-playback');
    await selectTab(page,'Presentation settings');await page.locator('#booth-open').click();await page.locator('#booth-password').fill('table-export-test');await page.locator('#booth-confirm').fill('table-export-test');
    await page.locator('#booth-loop').selectOption(Object.keys((await snapshot(page)).state.loops)[0]);
    const booth=await exportZip(page,'#booth-export');
    for(const [kind,bytes]of [['playback',playback],['booth',booth]]){
      const zip=await sandbox.JSZip.loadAsync(new Uint8Array(bytes)),folder=resolve('test-results/table-'+kind);
      for(const file of Object.values(zip.files)){if(file.dir)continue;const path=archivePath(folder,file.name);await mkdir(dirname(path),{recursive:true});await writeFile(path,await file.async('uint8array'));}
      const context=await browser.newContext();await context.setOffline(true);const restored=await context.newPage();restored.on('pageerror',e=>errors.push(e.message));
      try{await restored.goto('file://'+resolve(folder,'index.html'));const styles=await restored.locator('table.ts-table').first().evaluate(el=>({header:getComputedStyle(el.querySelector('th')).backgroundColor,alternate:getComputedStyle(el.querySelector('tbody tr:nth-child(2) td')).backgroundColor}));assert.deepEqual(styles,{header:'rgb(18, 52, 86)',alternate:'rgb(224, 239, 255)'});assert.equal(await restored.locator('.gs-bounds,.gs-marquee').count(),0);}finally{await context.close();}
    }
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
});

test('table controls remain compact and Shift-selection excludes hidden objects; ungroup in member mode selects all children',async()=>{
  const {page,errors,id}=await empty();try{
    await insertTable(page,id);await page.locator('#fe-preview td').first().click();await page.locator('#wp-tab-style').click();
    assert.equal(await page.locator('#tbl-presets').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length),4);
    await page.setViewportSize({width:1024,height:768});assert.equal(await page.locator('#we-inspector').evaluate(el=>el.scrollWidth<=el.clientWidth+1),true);assert.equal(await page.locator('#gs-actions').isVisible(),false);
    await page.locator('#ic-select-parent').click();
    const result=await operations(page,[{type:'block.create',slideId:id,kind:'rectangle',placement:{x:.1,y:.1,w:.15,h:.15}},{type:'block.create',slideId:id,kind:'circle',placement:{x:.4,y:.1,w:.15,h:.15}}]);assert.equal(result.ok,true,result.message);const keys=result.created;
    assert.equal((await operations(page,[{type:'component.group',slideId:id,keys}])).ok,true);
    await page.locator('#fe-preview .'+keys[0]).click();await page.locator('#gs-edit').click();await page.locator('#gs-ungroup').click();assert.equal(await page.locator('#fe-preview .gs-selected').count(),2);assert.equal(await page.locator('.gs-layer-group').count(),0);
    const before=await snapshot(page);assert.equal((await operations(page,[{type:'design.meta',slideId:id,keys:[keys[1]],changes:{hidden:true}}])).ok,true);
    // Selection rectangle crossing a hidden member includes only eligible visible objects.
    const slide=await page.locator('#fe-preview .slide').boundingBox();await page.mouse.move(slide.x+slide.width*.05,slide.y+slide.height*.05);await page.mouse.down();await page.mouse.move(slide.x+slide.width*.6,slide.y+slide.height*.27,{steps:5});await page.mouse.up();assert.equal(await page.locator('#fe-preview .gs-selected.sp-hidden').count(),0);assert.notDeepEqual((await snapshot(page)).state,before.state);assert.deepEqual(errors,[]);
  }finally{await page.close();}
});

test('active marquee rejects concurrent batches and Escape cancels without changing the project',async()=>{
  const {page,errors,id}=await empty();try{
    assert.equal((await operations(page,[{type:'block.create',slideId:id,kind:'rectangle',placement:{x:.3,y:.3,w:.2,h:.2}}])).ok,true);
    const before=await snapshot(page),slide=await page.locator('#fe-preview .slide').boundingBox();
    await page.mouse.move(slide.x+slide.width*.1,slide.y+slide.height*.2);await page.mouse.down();await page.mouse.move(slide.x+slide.width*.6,slide.y+slide.height*.6,{steps:5});
    const result=await operations(page,[{type:'slide.update',slideId:id,changes:{title:'Must not commit during selection'}}]);assert.equal(result.code,'BUSY');
    await page.keyboard.press('Escape');await page.mouse.up();assert.equal(await page.locator('.gs-marquee').count(),0);assert.deepEqual((await snapshot(page)).state,before.state);assert.deepEqual(errors,[]);
  }finally{await page.close();}
});

test('editing a grouped table keeps table structure and group actions reachable without overlap',async()=>{
  const {page,errors,id}=await empty();try{
    await insertTable(page,id);const tableKey=blockID((await snapshot(page)).state.slides[0].tree[0]);
    const created=await operations(page,[{type:'block.create',slideId:id,kind:'circle',placement:{x:.82,y:.1,w:.15,h:.15}}]);
    assert.equal((await operations(page,[{type:'component.group',slideId:id,keys:[tableKey,created.created[0]]}])).ok,true);
    await page.locator('#fe-preview td').first().click();await page.locator('#gs-edit').click();
    assert.equal(await page.locator('#tbl-toolbar').isVisible(),true);assert.equal(await page.locator('#gs-actions').isVisible(),true);
    const tableActions=await page.locator('#tbl-toolbar').boundingBox(),groupActions=await page.locator('#gs-actions').boundingBox();assert(tableActions.y+tableActions.height<=groupActions.y);
    const count=await page.locator('#fe-preview tbody tr').count();await page.locator('#tbl-action-row').selectOption('row-after');assert.equal(await page.locator('#fe-preview tbody tr').count(),count+1);await page.locator('#gs-ungroup').click();assert.equal(await page.locator('#fe-preview .gs-selected').count(),2);assert.deepEqual(errors,[]);
  }finally{await page.close();}
});

test('selecting another object exits group member editing instead of retaining stale group context',async()=>{
  const {page,errors,id}=await empty();try{
    const result=await operations(page,[{type:'block.create',slideId:id,kind:'rectangle',placement:{x:.1,y:.2,w:.15,h:.15}},{type:'block.create',slideId:id,kind:'circle',placement:{x:.35,y:.2,w:.15,h:.15}},{type:'block.create',slideId:id,kind:'rectangle',placement:{x:.7,y:.2,w:.15,h:.15}}]);const [first,second,outside]=result.created;
    assert.equal((await operations(page,[{type:'component.group',slideId:id,keys:[first,second]}])).ok,true);
    await page.locator('#fe-preview .'+first).click();await page.locator('#gs-edit').click();assert.equal(await page.locator('#gs-exit').isVisible(),true);
    await page.locator('#fe-preview .'+outside).click();assert.equal(await page.locator('#gs-exit').isVisible(),false);assert.equal(await page.locator('#fe-preview .gs-selected').count(),1);assert.deepEqual(errors,[]);
  }finally{await page.close();}
});

test('Tab and Shift+Tab retarget contextual column actions to the active cell',async()=>{
  const {page,errors,id}=await empty();try{
    await insertTable(page,id,false);const first=page.locator('#fe-preview td').first();await first.click();await first.press('Tab');
    assert.match(await page.locator('#tbl-context').textContent(),/Row 1 · Column 2/);
    await page.locator('#fe-preview td[contenteditable=true]').press('Shift+Tab');assert.match(await page.locator('#tbl-context').textContent(),/Row 1 · Column 1/);
    await page.locator('#fe-preview td[contenteditable=true]').press('Tab');await page.locator('#tbl-action-column').selectOption('column-delete');
    assert.equal(await page.locator('#fe-preview tbody tr').first().locator('td').count(),2);await page.locator('#fe-undo').click();assert.equal(await page.locator('#fe-preview tbody tr').first().locator('td').count(),3);assert.deepEqual(errors,[]);
  }finally{await page.close();}
});

test('imported direct-row headers insert immediately below the header and preserve captions and rich cells',async()=>{
  const {page,errors,id}=await empty();let imported;
  try{
    await insertTable(page,id);const pack=JSON.parse(await exportZip(page,'#fe-export-json'));
    const table=findTable(pack.state).node,head=table.children.find(node=>node.tag==='thead').children[0],rows=table.children.find(node=>node.tag==='tbody').children;
    const caption={tag:'caption',attrs:{'aria-label':'Milestone caption'},children:[{text:'Project milestones'}]};rows[0].attrs={'aria-label':'First milestone'};rows[0].children[0].children=[{tag:'strong',attrs:{},children:[{text:'Row 1'}]}];
    table.children=[caption,head,...rows];
    imported=await browser.newPage();imported.on('pageerror',e=>errors.push(e.message));await imported.goto('file://'+resolve('dist/presentation-studio.html'));await imported.locator('#open-full-editor').click();await imported.locator('#fe-import-file').setInputFiles({name:'direct-rows.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(pack))});await imported.waitForFunction(id=>window.presentationStudioEditing.read().projectId===id,pack.meta.id);
    const before=findTable((await snapshot(imported)).state),result=await action(imported,before,'row-after',0,0),direct=result.node.children.filter(node=>node.tag==='tr');
    assert.deepEqual(direct.map(row=>row.children[0].children[0]?.text||row.children[0].children[0]?.children?.[0]?.text||''),['Column 1','','Row 1','Row 2','Row 3']);
    assert.deepEqual(result.node.children[0],caption);assert.deepEqual(direct[2],rows[0]);await imported.locator('#fe-undo').click();assert.deepEqual(findTable((await snapshot(imported)).state).node,before.node);assert.deepEqual(errors,[]);
  }finally{await imported?.close();await page.close();}
});
