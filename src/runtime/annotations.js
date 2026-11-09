componentRegister('step',{name:'Step number',category:'Widgets',description:'Numbered badge with optional title and description',fields:[['Number','1'],['Title','Your next step'],['Description','Explain what happens here.']]});
componentRegister('arrow',{name:'Arrow / Pointer',category:'Shapes',description:'Free arrow with editable endpoints, label and arrowheads'});
function anMeta(state,id,key){return spData(state,id).objects[key]?.annotation;}
function anSequenceNext(state,slide,sequence,exclude=''){
  const data=spData(state,slide.id,true);data.stepCounters??={};let max=Object.hasOwn(data.stepCounters,sequence)?data.stepCounters[sequence]:0;
  for(const entry of spEntries(slide,state)){const item=entry.meta.annotation;if(entry.key!==exclude&&item?.kind==='step'&&item.sequence===sequence)max=Math.max(max,item.number);}
  if(max>=9999)editingFail('INVALID','Start a new sequence after step 9999.');data.stepCounters[sequence]=max+1;return max+1;
}
function anArrowPoints(entry){
  const rect=dbRect(entry.node),item=entry.meta.annotation,angle=(entry.meta.rotation||0)*Math.PI/180,cx=(rect.x+rect.w/2)*1920,cy=(rect.y+rect.h/2)*1080;
  return ['start','end'].map(key=>{const x=(rect.x+item[key].x*rect.w)*1920-cx,y=(rect.y+item[key].y*rect.h)*1080-cy;return{x:(cx+x*Math.cos(angle)-y*Math.sin(angle))/1920,y:(cy+x*Math.sin(angle)+y*Math.cos(angle))/1080};});
}
function anRefresh(node,item){
  if(item.kind==='step'){projectSetText(node.children[0],String(item.number));return;}
  const rect=dbRect(node),dx=(item.end.x-item.start.x)*rect.w*1920,dy=(item.end.y-item.start.y)*rect.h*1080;
  const line=node.children.find(node=>mgHas(node,'an-line'));line.attrs.class='an-line an-x-'+Math.round(item.start.x*10000)+' an-y-'+Math.round(item.start.y*10000)+' an-ex-'+Math.round(item.end.x*10000)+' an-ey-'+Math.round(item.end.y*10000)+' an-l-'+Math.round(Math.hypot(dx,dy))+' an-r-'+Math.round((Math.atan2(dy,dx)*180/Math.PI+180)*100)+' an-s-'+item.stroke;
  node.attrs.class=node.attrs.class.replace(/\ban-head-\w+\b/g,'').trim()+' an-head-'+item.heads;node.attrs['aria-label']=item.description||item.label||'Arrow';
  projectSetText(node.children.find(node=>mgHas(node,'an-arrow-label')),item.label);
}
const anValidate=projectValidateState;
projectValidateState=function(raw,...args){const state=anValidate(raw,...args);for(const [id,data]of Object.entries(raw.design?.slides||{}))if(state.design?.slides[id]){
  const target=state.design.slides[id];
  if(data.stepCounters){target.stepCounters={};for(const [sequence,number]of Object.entries(data.stepCounters)){if(!sequence.trim()||sequence.length>80||['__proto__','constructor','prototype'].includes(sequence)||!Number.isInteger(number)||number<0||number>9999)editingFail('INVALID','Invalid step sequence counter.');target.stepCounters[sequence]=number;}}
  for(const [key,meta]of Object.entries(data.objects||{}))if(meta.annotation&&target.objects[key]){
    const item=meta.annotation;if(item.kind==='step'){if(typeof item.sequence!=='string'||!item.sequence.trim()||item.sequence.length>80||['__proto__','constructor','prototype'].includes(item.sequence)||!Number.isInteger(item.number)||item.number<1||item.number>9999||typeof item.manual!=='boolean')editingFail('INVALID','Invalid step sequence.');}
    else if(item.kind==='arrow'){if(!['none','start','end','both'].includes(item.heads)||!Number.isInteger(item.stroke)||item.stroke<1||item.stroke>24||typeof item.label!=='string'||item.label.length>200||typeof item.description!=='string'||item.description.length>1000||!['start','end'].every(key=>item[key]&&['x','y'].every(axis=>Number.isFinite(item[key][axis])&&item[key][axis]>=0&&item[key][axis]<=1)))editingFail('INVALID','Invalid arrow.');}
    else editingFail('INVALID','Unknown annotation type.');target.objects[key].annotation=projectCopy(item);
  }
}return state;};
const anCreate=editingOperations.get('block.create');
editingOperations.set('block.create',(state,op,created)=>{
  if(!['step','arrow'].includes(op.kind))return anCreate(state,op,created);
  anCreate(state,{...op,kind:op.kind==='step'?'step':'rectangle',placement:op.placement||(op.kind==='step'?{x:.1,y:.15,w:.25,h:.3}:{x:.3,y:.45,w:.3,h:.1})},created);
  const slide=editingSlide(state,op.slideId),key=created.at(-1),node=slide.tree.find(node=>dbID(node)===key),meta=spData(state,slide.id,true).objects[key]??={};
  if(op.kind==='step'){node.attrs.class+=' db-step';meta.annotation={kind:'step',sequence:'Main',manual:false,number:anSequenceNext(state,slide,'Main')};}
  else{node.attrs.class=node.attrs.class.replace(/\bdb-rectangle\b/,'db-arrow');node.children=[projectNode('span','an-line',['➜']),projectNode('p','an-arrow-label',[])];meta.annotation={kind:'arrow',start:{x:0,y:.5},end:{x:1,y:.5},heads:'end',stroke:4,label:'',description:''};}
  anRefresh(node,meta.annotation);
});
const anField=editingOperations.get('component.field');
editingOperations.set('component.field',(state,op,created)=>{const item=anMeta(state,op.slideId,op.blockId);if(item?.kind==='step'&&op.index===0)return editingOperations.get('annotation.step')(state,{slideId:op.slideId,key:op.blockId,number:Number(op.text)});return anField(state,op,created);});
editingRegisterOperation('annotation.step',(state,op)=>{
  const slide=editingSlide(state,op.slideId),entry=componentTargets(state,slide,[op.key],false)[0],item=entry.meta.annotation;if(item?.kind!=='step')editingFail('INVALID','Select a step.');
  if(op.sequence!=null){if(typeof op.sequence!=='string'||!op.sequence.trim()||op.sequence.length>80||['__proto__','constructor','prototype'].includes(op.sequence))editingFail('INVALID','Name this sequence.');if(item.sequence!==op.sequence.trim()){item.sequence=op.sequence.trim();if(!item.manual)item.number=anSequenceNext(state,slide,item.sequence,entry.key);}}
  if(op.number!=null){if(!Number.isInteger(op.number)||op.number<1||op.number>9999)editingFail('INVALID','Use step numbers 1–9999.');item.number=op.number;item.manual=true;}
  if(op.automatic){item.manual=false;item.number=anSequenceNext(state,slide,item.sequence,entry.key);}
  anRefresh(entry.node,item);
});
editingRegisterOperation('annotation.renumber',(state,op)=>{
  if(typeof op.sequence!=='string'||!op.sequence.trim()||op.sequence.length>80||['__proto__','constructor','prototype'].includes(op.sequence))editingFail('INVALID','Choose a sequence to renumber.');
  const slide=editingSlide(state,op.slideId),targets=spEntries(slide,state).filter(entry=>entry.meta.annotation?.kind==='step'&&entry.meta.annotation.sequence===op.sequence);if(targets.some(spProtected))editingFail('LOCKED','Unlock every step in the sequence first.');
  const reserved=new Set(targets.filter(entry=>entry.meta.annotation.manual).map(entry=>entry.meta.annotation.number));let next=1;
  for(const entry of targets)if(!entry.meta.annotation.manual){while(reserved.has(next))next++;entry.meta.annotation.number=next++;anRefresh(entry.node,entry.meta.annotation);}
  spData(state,slide.id,true).stepCounters??={};spData(state,slide.id).stepCounters[op.sequence]=Math.max(0,...targets.map(entry=>entry.meta.annotation.number));
});
editingRegisterOperation('annotation.arrow',(state,op)=>{
  const slide=editingSlide(state,op.slideId),entry=componentTargets(state,slide,[op.key],false)[0],item=entry.meta.annotation;if(item?.kind!=='arrow')editingFail('INVALID','Select an arrow.');
  if(op.points){if(entry.meta.group)editingFail('INVALID','Ungroup before moving an individual endpoint.');const [start,end]=op.points;if(!start||!end||![start.x,start.y,end.x,end.y].every(number=>Number.isFinite(number)&&number>=0&&number<=1)||Math.hypot((start.x-end.x)*1920,(start.y-end.y)*1080)<20)editingFail('INVALID','Arrow endpoints must stay on the slide, at least 20 pixels apart.');
    const x=Math.min(start.x,end.x),y=Math.min(.95,Math.max(0,Math.min(start.y,end.y)-.025)),w=Math.max(.05,Math.abs(start.x-end.x)),h=Math.min(1-y,Math.max(.05,Math.max(start.y,end.y)-y+.025));
    const rect={x:Math.min(x,1-w),y,w,h};dbPlace(entry.node,rect);entry.meta.rotation=0;item.start={x:(start.x-rect.x)/w,y:(start.y-y)/h};item.end={x:(end.x-rect.x)/w,y:(end.y-y)/h};
  }
  for(const field of ['heads','stroke','label','description'])if(op[field]!=null)item[field]=op[field];anRefresh(entry.node,item);
});
// Step numbers are sequence-local; element names are independent. Copies receive fresh automatic numbers.
const anAfter=editingAfterOperation;
editingAfterOperation=function(state,op,created){anAfter(state,op,created);const slide=state.slides.find(slide=>slide.id===op.slideId);if(!slide)return;
  for(const key of created)if(op.type!=='block.create'){const item=anMeta(state,slide.id,key);if(item?.kind==='step'){item.manual=false;item.number=anSequenceNext(state,slide,item.sequence,key);}}
  for(const entry of spEntries(slide,state))if(entry.meta.annotation)anRefresh(entry.node,entry.meta.annotation);
};
const anDOM=projectDOM;
projectDOM=function(node){const element=anDOM(node);if(element.nodeType===1&&mgHas(node,'an-line')){const tokens=node.attrs.class,read=name=>Number(tokens.match(new RegExp('\\ban-'+name+'-(\\d+)'))?.[1]||0);element.style.left=read('x')/100+'%';element.style.top=read('y')/100+'%';element.style.width=read('l')+'px';element.style.height=read('s')+'px';element.style.transform='rotate('+(read('r')/100-180)+'deg)';}return element;};
function anSelection(){return spEntries().find(entry=>spActiveKeys().includes(entry.key)&&entry.meta.annotation);}
const anContext=icSelection;
icSelection=function(...args){const context=anContext(...args),entry=context.selected.find(entry=>entry.meta.annotation?.kind==='arrow');if(entry&&context.kind!=='multiple')return{...context,kind:'arrow',title:enLabel(entry),detail:entry.meta.annotation.description||'Free arrow / pointer',path:''};return context;};
const anStartText=vbStart;
vbStart=function(selection){const root=projectModel()?.tree[Number(selection?.path?.split('.')[0])];if(mgHas(root,'db-step')&&selection.path.endsWith('.children.0')){vbSetSelection(selection);icPaint();return;}return anStartText(selection);};
const anWriteText=vbWrite;
vbWrite=function(...args){const result=anWriteText(...args);if(vbSession&&projectPending&&!ceLocked()){const root=projectModel()?.tree[Number(vbSession.path.split('.')[0])],item=spMeta(dbID(root)).annotation;if(item?.kind==='arrow'&&mgHas(vbNode(),'an-arrow-label')&&!spMeta(dbID(root)).locked)item.label=projectText(vbNode()).slice(0,200);}return result;};
let anDrag=null;
function anSnapPoint(point,slide,key){
  spClearGuides();const bounds=slide.getBoundingClientRect(),guides={x:[0,.025,.05,.5,.95,.975,1],y:[0,.025,.05,.5,.95,.975,1]};
  for(const entry of spEntries())if(entry.key!==key&&!visibilityEntryHidden(projectState,projectSelected,entry)){const element=spElement(slide,entry);if(!element)continue;const box=element.getBoundingClientRect();guides.x.push((box.left-bounds.left)/bounds.width,(box.right-bounds.left)/bounds.width,(box.left+box.width/2-bounds.left)/bounds.width);guides.y.push((box.top-bounds.top)/bounds.height,(box.bottom-bounds.top)/bounds.height,(box.top+box.height/2-bounds.top)/bounds.height);}
  for(const axis of ['x','y']){const tolerance=6/(axis==='x'?bounds.width:bounds.height),nearest=guides[axis].filter(value=>value>=0&&value<=1).sort((a,b)=>Math.abs(a-point[axis])-Math.abs(b-point[axis]))[0];if(Math.abs(nearest-point[axis])<=tolerance){point[axis]=nearest;const line=document.createElement('span');line.className='sp-snap-guide';line.style.cssText=axis==='x'?'left:'+nearest*100+'%;top:0;height:100%':'top:'+nearest*100+'%;left:0;width:100%';slide.append(line);}}
  return point;
}
function anAttach(){if(!projectPreviewNode)return;authoringGeometry(projectPreviewNode);for(const entry of spEntries())if(entry.meta.annotation?.kind==='arrow'){
  const root=projectPreviewNode.querySelector('.'+entry.key);if(!root)continue;root.querySelectorAll('.an-endpoint').forEach(node=>node.remove());if(vbMode!=='edit'||spProtected(entry)||ceLocked())continue;
  for(const [i,point]of ['start','end'].entries()){const handle=document.createElement('button');handle.className='an-endpoint';handle.dataset.anEnd=point;handle.dataset.anKey=entry.key;handle.setAttribute('aria-label','Move arrow '+point+' endpoint');handle.textContent=i?'End':'Start';handle.disabled=!!entry.meta.group;handle.style.left=entry.meta.annotation[point].x*100+'%';handle.style.top=entry.meta.annotation[point].y*100+'%';root.append(handle);}
}}
function anPanel(){if(!$('an-panel')||!projectReady)return;const entry=anSelection(),item=entry?.meta.annotation;$('an-panel').hidden=!item;if(!item)return;
  if(item.kind==='step'&&$('component-widget-fields').firstElementChild)$('component-widget-fields').firstElementChild.hidden=true;
  if(item.kind==='arrow'){$('db-arrange').dataset.icVisible='true';if($('an-panel').parentElement.firstElementChild!==$('an-panel'))$('an-panel').parentElement.prepend($('an-panel'));}
  $('an-step').hidden=item.kind!=='step';$('an-arrow').hidden=item.kind!=='arrow';const locked=ceLocked()||spProtected(entry)||vbMode!=='edit';
  for(const input of $('an-panel').querySelectorAll('input,textarea,select,button'))input.disabled=locked;
  if($('an-panel').contains(document.activeElement))return;
  if(item.kind==='step'){$('an-sequence').value=item.sequence;$('an-number').value=item.number;$('an-step-status').textContent=item.manual?'Manual override':'Automatic sequence number';}
  else{$('an-heads').value=item.heads;$('an-stroke').value=item.stroke;$('an-label').value=item.label;$('an-description').value=item.description;anArrowPoints(entry).forEach((point,index)=>{for(const axis of ['x','y'])$('an-'+index+axis).value=Math.round(point[axis]*10000)/100;});}
}
const anPaint=icPaint;
icPaint=function(...args){const result=anPaint(...args);anPanel();return result;};
const anPreview=projectPreview;
projectPreview=function(...args){const result=anPreview(...args);anAttach();return result;};
const anApply=spApply;
spApply=function(slide,...args){const result=anApply(slide,...args);authoringGeometry(slide);return result;};
const anInit=projectInit;
projectInit=function(){anInit();const panel=document.createElement('section');panel.id='an-panel';panel.dataset.wpPart='content';panel.innerHTML='<h3>Annotation</h3><div id="an-step"><label>Sequence<input id="an-sequence" maxlength="80"></label><label>Step number<input id="an-number" type="number" min="1" max="9999"></label><p id="an-step-status"></p><button id="an-auto">Use automatic number</button><button id="an-renumber">Renumber sequence</button></div><div id="an-arrow"><p>Free arrow: endpoints stay where placed. Use Style for theme/custom color and Arrange for rotation.</p><label>Arrowheads<select id="an-heads"><option value="end">End</option><option value="start">Start</option><option value="both">Both</option><option value="none">None</option></select></label><label>Stroke width<input id="an-stroke" type="number" min="1" max="24"></label><label>Label<input id="an-label" maxlength="200"></label><label>Description<textarea id="an-description" maxlength="1000"></textarea></label><div class="db-fields">'+[0,1].flatMap(index=>['x','y'].map(axis=>'<label>'+(index?'End ':'Start ')+axis+' (%)<input id="an-'+index+axis+'" type="number" min="0" max="100" step="0.1"></label>')).join('')+'</div></div>';$('wp-fields').prepend(panel);
  const run=fields=>{const entry=anSelection();if(entry)componentRun({key:entry.key,...fields});};
  $('an-sequence').onchange=()=>run({type:'annotation.step',sequence:$('an-sequence').value});$('an-number').onchange=()=>run({type:'annotation.step',number:Number($('an-number').value)});$('an-auto').onclick=()=>run({type:'annotation.step',automatic:true});$('an-renumber').onclick=()=>run({type:'annotation.renumber',sequence:anSelection().meta.annotation.sequence});
  for(const [id,field]of [['an-heads','heads'],['an-stroke','stroke'],['an-label','label'],['an-description','description']])$(id).onchange=()=>run({type:'annotation.arrow',[field]:field==='stroke'?Number($(id).value):$(id).value});
  for(const index of [0,1])for(const axis of ['x','y'])$('an-'+index+axis).onchange=()=>run({type:'annotation.arrow',points:[0,1].map(index=>({x:Number($('an-'+index+'x').value)/100,y:Number($('an-'+index+'y').value)/100}))});
  window.addEventListener('pointerdown',event=>{const handle=event.target.closest?.('[data-an-end]');if(!handle)return;event.preventDefault();event.stopImmediatePropagation();vbEnd(false);projectFlush();const entry=spEntries().find(entry=>entry.key===handle.dataset.anKey);anDrag={key:entry.key,index:handle.dataset.anEnd==='start'?0:1,points:anArrowPoints(entry),bounds:handle.closest('.slide').getBoundingClientRect(),snapshot:studioEditing.read()};},true);
  window.addEventListener('pointermove',event=>{if(!anDrag)return;const point={x:Math.max(0,Math.min(1,(event.clientX-anDrag.bounds.left)/anDrag.bounds.width)),y:Math.max(0,Math.min(1,(event.clientY-anDrag.bounds.top)/anDrag.bounds.height))};if(!event.altKey)anSnapPoint(point,projectPreviewNode.querySelector('.slide'),anDrag.key);else spClearGuides();anDrag.points[anDrag.index]=point;let ghost=$('an-drag-preview');if(!ghost){ghost=document.createElement('span');ghost.id='an-drag-preview';ghost.textContent='●';projectPreviewNode.querySelector('.slide').append(ghost);}ghost.style.left=point.x*100+'%';ghost.style.top=point.y*100+'%';},true);
  window.addEventListener('pointerup',()=>{if(!anDrag)return;const drag=anDrag;anDrag=null;spClearGuides();$('an-drag-preview')?.remove();dbRun({type:'annotation.arrow',key:drag.key,points:drag.points},drag.snapshot);},true);
  for(const name of ['blur','pointercancel'])window.addEventListener(name,()=>{anDrag=null;spClearGuides();$('an-drag-preview')?.remove();});
  window.addEventListener('keydown',event=>{if(event.key==='Escape'&&anDrag){anDrag=null;spClearGuides();$('an-drag-preview')?.remove();event.preventDefault();}const handle=event.target.closest?.('[data-an-end]');if(!handle||!event.key.startsWith('Arrow'))return;event.preventDefault();event.stopImmediatePropagation();const entry=spEntries().find(entry=>entry.key===handle.dataset.anKey),points=anArrowPoints(entry),point=points[handle.dataset.anEnd==='start'?0:1],delta=event.shiftKey?.01:.002;point[event.key==='ArrowLeft'||event.key==='ArrowRight'?'x':'y']+=event.key==='ArrowLeft'||event.key==='ArrowUp'?-delta:delta;componentRun({type:'annotation.arrow',key:entry.key,points});},true);
  anPanel();anAttach();
};
