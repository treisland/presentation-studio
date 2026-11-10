import {inspectContent} from './ui.mjs';
import {selectStartingExample} from './ui.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {openExample,snapshot,operations,exportZip,importZip} from './collection-ui.mjs';
import {click,reveal} from './ui.mjs';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']});test.after(()=>browser.close());

test('retaining a custom Editorial masthead preserves article slots, portable state and Undo',async()=>{
 const{page:p,errors}=await openExample(browser,'editorial-demo');try{
  const heading=p.locator('#fe-preview .lc-masthead');await heading.dblclick();await heading.fill('MY CUSTOM NOTEBOOK');await heading.press('Escape');const before=await snapshot(p),id=before.state.slides[0].id;
  assert.equal((await operations(p,[{type:'layout.apply',slideId:id,template:'editorial-cover',keep:true}])).ok,true);
  assert.equal(await p.locator('#fe-preview > .me-preview-stage .lc-masthead').count(),1);assert.equal(await p.locator('#fe-preview .lc-masthead').textContent(),'MY CUSTOM NOTEBOOK');
  const text=tree=>JSON.stringify(tree);for(const field of ['lead','inside','credits'])assert.equal(await p.locator('#fe-preview .lc-slot-'+field).textContent(),await p.evaluate(({state,field})=>{const find=nodes=>{for(const n of nodes){if(n.attrs?.class?.split(/\s+/).includes('lc-slot-'+field))return n;const child=find(n.children||[]);if(child)return child;}};const value=n=>n?.text??(n?.children||[]).map(value).join('');return value(find(state.slides[0].tree));},{state:before.state,field}));
  assert.equal((await operations(p,[{type:'layout.apply',slideId:id,template:'portfolio-case',keep:true}])).ok,true);assert.equal(await p.locator('#fe-preview .lc-masthead').count(),0);assert.match(text((await snapshot(p)).state.slides[0].tree),/MY CUSTOM NOTEBOOK/);
  const expected=await snapshot(p),q=await importZip(browser,await exportZip(p),expected.projectId);try{assert.deepEqual((await snapshot(q)).state,expected.state);}finally{await q.close();}
  await p.locator('#fe-undo').click();await p.locator('#fe-undo').click();assert.deepEqual((await snapshot(p)).state,before.state);assert.deepEqual(errors,[]);
 }finally{await p.close();}
});

test('Comic image captions fit inside every gallery and wizard preview frame',async()=>{
 const{page:p,errors}=await openExample(browser,'comic-demo');try{
  const fits=async selector=>{await p.waitForFunction(selector=>[...document.querySelectorAll(selector+' img')].every(n=>n.complete&&n.naturalWidth>0),selector);const frames=await p.locator(selector+' .lc-library-visual').evaluateAll(nodes=>nodes.map(n=>{const b=n.getBoundingClientRect(),c=n.querySelector('figcaption')?.getBoundingClientRect(),v=n.querySelector('.media-viewport')?.getBoundingClientRect();return !!c&&!!v&&c.height>0&&v.height>0&&c.bottom<=b.bottom+1&&c.top>=v.bottom-1;}));assert(frames.length>0);assert(frames.every(Boolean));};
  await click(p,'#lc-examples-open');await p.getByRole('button',{name:'Preview Comic demo',exact:true}).click();await p.locator('#lc-preview-next').click();await fits('#lc-example-preview');assert.equal(await p.locator('#lc-example-preview figcaption').count(),3);await p.screenshot({path:'test-results/comic-preview-captions.png'});await p.locator('#lc-examples-close').click();
  await click(p,'#studio-new-open');if(await p.locator('#hub-switch').evaluate(n=>n.open))await p.locator('#hub-save-switch').click();await p.locator('#nx-wizard').waitFor({state:'visible'});await selectStartingExample(p,'comic-demo');await p.locator('#nx-wizard-next').click();await p.locator('#nx-wizard-next').click();await fits('#nx-wizard-preview');assert.deepEqual(errors,[]);
 }finally{await p.close();}
});

test('all visual guide cues use selected-cell controls without editing primary media or closing the guide',async()=>{
 const{page:p,errors}=await openExample(browser,'comic-demo');try{
  const state=(await snapshot(p)).state,slide=state.slides.find(s=>s.template==='comic-sequence');await p.locator('.fe-slide-button[data-slide-id="'+slide.id+'"]').click();await click(p,'#lc-walkthrough-open');
  for(const family of ['portfolio','comic','editorial']){await p.locator('#lc-guide-family').selectOption(family);for(let i=0;i<(family==='portfolio'?1:2);i++)await p.locator('#lc-guide-next').click();assert.equal(await p.locator('#mg-cell').evaluate(n=>n.classList.contains('lc-guide-target')),true);assert.equal(await p.locator('#fe-media.lc-guide-target').count(),0);}
  await p.locator('#wp-tab-content').click();await p.locator('#mg-cell').selectOption({index:1});await inspectContent(p,'Media');await reveal(p,'#ce-caption');await p.locator('#ce-caption').fill('Changed second panel only');await p.locator('#ce-caption').press('Tab');
  const after=(await snapshot(p)).state;assert.deepEqual(after.media[slide.id],state.media[slide.id]);assert.equal(after.mediaObjects[slide.id][0].media.caption,'Changed second panel only');assert.equal(await p.locator('#full-editor').isVisible(),true);assert.equal(await p.locator('#lc-walkthrough').isVisible(),true);assert.deepEqual(errors,[]);
 }finally{await p.close();}
});
