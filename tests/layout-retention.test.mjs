import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {resolve} from 'node:path';
import {readFile} from 'node:fs/promises';
import {click} from './ui.mjs';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']});
test.after(()=>browser.close());
const node=(tag,children=[],attrs={})=>({tag,attrs,children:children.map(n=>typeof n==='string'?{text:n}:n)});
const find=(nodes,tag)=>{for(const n of nodes){if(n.tag===tag)return n;const child=find(n.children||[],tag);if(child)return child;}};
const read=p=>p.evaluate(()=>window.presentationStudioEditing.read());
test('layout retention preserves empty table cells/rows and empty protected structures through Undo and editable ZIP reopening',async()=>{
 const p=await browser.newPage({acceptDownloads:true}),errors=[];p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(10000);
 try{
  const pack=JSON.parse(await readFile('templates/blank/presentation.json','utf8')),slide=pack.state.slides[0];
  const table=node('table',[node('thead',[node('tr',['First','Middle','Last'].map(x=>node('th',[x],{scope:'col'})))]),node('tbody',[node('tr',['A','','C'].map(x=>node('td',[x]))),node('tr',['','',''].map(x=>node('td',[x])))])],{class:'detection-table'});
  slide.tree=[node('h2',['Retain empty cells']),node('div',[table]),node('ul',[node('li',['']),node('li',['Keep second item'])]),node('pre',['']),node('div',[node('pre',[''])],{class:'terminal'})];slide.templateBase=structuredClone(slide.tree);delete pack.state.startingState;
  await p.goto('file://'+resolve('dist/presentation-studio.html'));await p.locator('#open-full-editor').click();await p.locator('#fe-import-file').setInputFiles({name:'empty-cells.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(pack))});
  const before=await read(p),id=before.state.slides[0].id,original=find(before.state.slides[0].tree,'table');
  const apply=()=>p.evaluate(id=>{const a=window.presentationStudioEditing,s=a.read();return a.apply({apiVersion:1,projectId:s.projectId,expectedRevision:s.revision,operations:[{type:'layout.apply',slideId:id,template:'portfolio-case',keep:true}]});},id);
  assert.equal((await apply()).ok,true);let after=await read(p);assert.deepEqual(find(after.state.slides[0].tree,'table'),original);assert.deepEqual(find(after.state.slides[0].tree,'ul'),find(before.state.slides[0].tree,'ul'));assert.deepEqual(find(after.state.slides[0].tree,'pre'),find(before.state.slides[0].tree,'pre'));
  await p.locator('#fe-undo').click();assert.deepEqual((await read(p)).state,before.state);assert.equal((await apply()).ok,true);
  const d=p.waitForEvent('download');await click(p,'#fe-export');const bytes=await readFile(await(await d).path());
  const q=await browser.newPage();try{q.on('pageerror',e=>errors.push(e.message));await q.context().setOffline(true);await q.goto('file://'+resolve('dist/presentation-studio.html'));await q.locator('#open-full-editor').click();await q.locator('#fe-import-file').setInputFiles({name:'retained.zip',mimeType:'application/zip',buffer:bytes});await q.waitForFunction(id=>window.presentationStudioEditing.read().projectId===id,pack.meta.id);const restored=await read(q);assert.deepEqual(find(restored.state.slides[0].tree,'table'),original);assert.equal(find(restored.state.slides[0].tree,'table').children[1].children[1].children.length,3);}finally{await q.close();}
  assert.deepEqual(errors,[]);
 }finally{await p.close();}
});
