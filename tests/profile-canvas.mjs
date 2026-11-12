// Optional measurement harness; results are observations, never release-gate evidence.
import {chromium} from 'playwright';
import {cpus,platform,release,totalmem} from 'node:os';
import {execFileSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {openExample,snapshot,operations} from './collection-ui.mjs';
import {addSlide,selectElement,reveal} from './ui.mjs';

const browser=await chromium.launch({headless:true,args:['--no-sandbox'],executablePath:process.env.CHROMIUM_EXECUTABLE_PATH});
const {page,errors}=await openExample(browser,'portfolio-demo');
const results=[];
try{
  await addSlide(page,'blank');
  const slideId=await page.locator('#fe-preview .slide').getAttribute('data-media-id'),initial=await snapshot(page);
  const fixture=[];
  for(let i=0;i<40;i++)fixture.push({type:'block.create',slideId,blockId:'block-profile-'+i,kind:['text','rectangle','circle','callout'][i%4],placement:{x:.04+(i%8)*.115,y:.1+Math.floor(i/8)*.15,w:.09,h:.08}});
  fixture.push({type:'table.insert',slideId,rows:3,columns:3,header:true});
  for(let i=0;i<40;i++)fixture.push({type:'slide.create',slideId:'profile-slide-'+i,sectionId:initial.state.sections[0].id,template:'blank',title:'Neutral profile '+(i+1)});
  assert.equal((await operations(page,fixture)).ok,true);
  await page.locator('#ce-zone').selectOption('floating',{force:true});
  await page.locator('#ce-file').setInputFiles({name:'neutral.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="320" height="180" fill="#286875"/></svg>')});
  await page.locator('#fe-preview img').waitFor();
  await page.evaluate(()=>{
    const original=Element.prototype.getBoundingClientRect;
    window.profileSample=null;
    Element.prototype.getBoundingClientRect=function(...args){if(window.profileSample?.recording)window.profileSample.geometryReads++;return original.apply(this,args);};
    new PerformanceObserver(list=>{const p=window.profileSample;if(p?.recording)p.longTasks.push(...list.getEntries().map(e=>e.duration));}).observe({type:'longtask',buffered:false});
    new MutationObserver(records=>{const p=window.profileSample;if(p?.recording)for(const r of records)for(const node of r.addedNodes)if(node.nodeType===1){p.domAdds++;if(node.matches('.sp-snap-guide,.sp-snap-label'))p.guideAdds++;if(node.matches('.gs-bounds,.sp-layer-row'))p.selectionAdds++;if(node.matches('.fe-slide-button'))p.thumbnailAdds++;}}).observe(document.querySelector('#full-editor'),{childList:true,subtree:true});
    const frame=time=>{const p=window.profileSample;if(p?.recording){if(p.lastFrame)p.frameIntervals.push(time-p.lastFrame);p.lastFrame=time;}requestAnimationFrame(frame);};requestAnimationFrame(frame);
    document.querySelector('#fe-preview').addEventListener('pointermove',()=>{const p=window.profileSample;if(!p?.recording)return;const start=performance.now();requestAnimationFrame(()=>{if(p.recording)p.inputToFrame.push(performance.now()-start);});},true);
  });
  for(const batch of [false,true])for(const snapping of [false,true])for(let repeat=0;repeat<3;repeat++){
    await selectElement(page,'block-profile-0');
    if(batch){await page.locator('#ld-reveal-layers').click();await page.locator('.sp-layer-row[data-key="block-profile-1"] input[type=checkbox]').check();}
    await reveal(page,'#sp-snap');await page.locator('#sp-snap').setChecked(snapping);
    const handle=page.locator(batch?'#fe-preview .gs-move':'#fe-preview .block-profile-0 .db-move');
    const box=await handle.boundingBox();assert.ok(box);
    await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
    await page.evaluate(()=>{window.profileSample={recording:true,geometryReads:0,guideAdds:0,domAdds:0,selectionAdds:0,thumbnailAdds:0,longTasks:[],inputToFrame:[],frameIntervals:[]};});
    await page.mouse.down();
    for(let step=1;step<=24;step++){await page.mouse.move(box.x+box.width/2+step*2,box.y+box.height/2+step);await page.waitForTimeout(8);}
    const gesture=await page.evaluate(()=>{window.profileSample.recording=false;return window.profileSample;});
    await page.evaluate(()=>{window.profileCommit=performance.now();window.profileSample={recording:true,geometryReads:0,guideAdds:0,domAdds:0,selectionAdds:0,thumbnailAdds:0,longTasks:[],inputToFrame:[],frameIntervals:[]};});await page.mouse.up();
    const commitToFrame=await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(performance.now()-window.profileCommit)))));
    const sorted=gesture.inputToFrame.toSorted((a,b)=>a-b),p95=sorted[Math.floor((sorted.length-1)*.95)]??null;
    const commit=await page.evaluate(()=>{window.profileSample.recording=false;return window.profileSample;});
    const frames=gesture.frameIntervals.toSorted((a,b)=>a-b);
    results.push({batch,snapping,repeat,geometryReads:gesture.geometryReads,guideAdds:gesture.guideAdds,longTasks:gesture.longTasks,pointerSamples:sorted.length,inputToFrameP95Ms:p95,frameIntervalP95Ms:frames[Math.floor((frames.length-1)*.95)]??null,commitToTwoFramesMs:commitToFrame,commit:{geometryReads:commit.geometryReads,domAdds:commit.domAdds,selectionAdds:commit.selectionAdds,thumbnailAdds:commit.thumbnailAdds,longTasks:commit.longTasks}});
    console.log('Measured '+(batch?'batch':'single')+', snapping '+snapping+', repetition '+(repeat+1));
    await page.locator('#fe-undo').click();
  }
  assert.deepEqual(errors,[]);
  const output={commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),environment:{os:platform()+' '+release(),cpu:cpus()[0].model,logicalProcessors:cpus().length,memoryGiB:Math.round(totalmem()/2**30),node:process.version,chromium:browser.version(),headless:true,viewport:{width:1366,height:768}},fixture:{blocks:40,table:'3 × 3',media:'original inline SVG',deckSlides:(await snapshot(page)).state.slides.length},procedure:'3 repetitions per single/batch and snapping off/on; 24 pointer moves of (2,1) CSS pixels, 8ms requested interval. Input-to-rAF approximates frame readiness, not physical display latency. Commit includes driver round-trip and two rAFs. Geometry reads include all editor code during the gesture.',results};
  await mkdir('test-results',{recursive:true});await writeFile(resolve('test-results/canvas-profile.json'),JSON.stringify(output,null,2)+'\n');console.log(JSON.stringify(output,null,2));
}finally{await browser.close();}
