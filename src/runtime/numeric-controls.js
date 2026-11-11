// Editor-only numeric views. Dragging previews DOM; existing handlers commit once.
const numericControls=new Map();
let numericBusy=0,numericSyncing=false;
function numericStamp(){return projectReady?JSON.stringify([projectMeta.id,projectSelected,studioEditing.read().revision,icSelection().identity,spActiveKeys(),dbSelected,ceSelected,mgSelected,mediaSelected,$('sp-slot')?.value]):'';}
function numericPaint(elements,paint){
  const saved=elements.filter(Boolean).map(element=>[element,element.getAttribute('style')]);
  return {paint:value=>saved.forEach(([element])=>{if(element.isConnected)paint(element,value);}),restore:()=>saved.forEach(([element,style])=>{if(element.isConnected){if(style==null)element.removeAttribute('style');else element.setAttribute('style',style);}})};
}
function numericSelected(){const slide=projectPreviewNode?.querySelector('.slide');return slide?spEntries().filter(entry=>spActiveKeys().includes(entry.key)).map(entry=>spElement(slide,entry)).filter(Boolean):[];}
function numericStyle(property,unit=''){return()=>numericPaint(numericSelected(),(element,value)=>{element.style[property]=value+unit;});}
function numericAttach(input,options={}){
  if(!input||numericControls.has(input.id))return;
  const name=options.label||input.labels?.[0]?.textContent.trim().replace(/\s+/g,' ')||input.id;
  const spokenUnit=({'%':'percent',px:'pixels','°':'degrees',s:'seconds'})[options.unit]||options.unit||'';
  const min=Number(options.min??input.min??0),max=Number(options.max??input.max??100),step=Number(options.step||input.step||1);
  const oldInput=input.oninput,oldChange=input.onchange;
  const label=input.labels?.[0]||input.closest('label');if(options.label&&label){const text=[...label.childNodes].find(node=>node.nodeType===Node.TEXT_NODE&&node.textContent.trim());if(text)text.textContent=options.label+' ';}
  if(options.output&&$(options.output))$(options.output).hidden=true;
  const box=document.createElement('div');box.className='nc-control'+(options.compact?' nc-stacked':'');box.dataset.numeric=input.id;
  input.before(box);input.type='number';input.classList.add('nc-number');input.min=min;input.max=max;input.step=step;input.setAttribute('aria-label',options.numberLabel||name+(spokenUnit?' in '+spokenUnit:''));
  const track=document.createElement('div');track.className='nc-track';const range=document.createElement('input');range.type='range';range.id=input.id+'-range';range.className='nc-range';range.min=min;range.max=max;range.step=step;range.setAttribute('aria-label',name);track.append(range);
  const value=document.createElement('div');value.className='nc-value';value.append(input);
  const unit=document.createElement('span');unit.className='nc-unit';unit.textContent=options.unit||'';unit.setAttribute('aria-hidden','true');value.append(unit);
  const actions=document.createElement('div');actions.className='nc-actions';
  const reset=document.createElement('button');reset.type='button';reset.className='nc-reset';reset.textContent='↺';reset.setAttribute('aria-label','Reset '+name);reset.title='Reset '+name;reset.hidden=options.reset===false;
  actions.append(reset);
  const status=document.createElement('span');status.id=input.id+'-numeric-status';status.className='nc-status';status.setAttribute('aria-live','polite');
  input.setAttribute('aria-describedby',[input.getAttribute('aria-describedby'),status.id].filter(Boolean).join(' '));range.setAttribute('aria-describedby',status.id);
  box.append(track,value,actions,status);
  let mark=null;if(Number.isFinite(defaultValue())){mark=document.createElement('span');mark.className='nc-default-mark';mark.setAttribute('aria-hidden','true');track.append(mark);}
  function defaultValue(){return typeof options.default==='function'?options.default():options.default;}
  let sample=null;if(options.sample){const row=document.createElement('span');row.className='nc-sample-row';row.textContent='Opacity preview ';const frame=document.createElement('span');frame.className='nc-sample';sample=document.createElement('span');frame.append(sample);row.append(frame);box.append(row);}
  if(options.reverse){const ends=document.createElement('span');ends.className='nc-ends';ends.innerHTML='<span>Slow</span><span>Fast</span>';track.append(ends);}
  let gesture=null,last=input.value;
  const position=value=>options.reverse?max+min-value:value;
  const invoke=()=>{const handler=options.commit||oldChange||oldInput;if(handler){numericBusy++;try{handler.call(input,{target:input,currentTarget:input,preventDefault(){},stopPropagation(){}});}finally{numericBusy--;}}};
  const valid=()=>input.value.trim()!==''&&Number.isFinite(input.valueAsNumber)&&input.valueAsNumber>=min&&input.valueAsNumber<=max&&(!options.integer||Number.isInteger(input.valueAsNumber));
  function display(){
    const number=Number(input.value);range.value=position(input.value===''?min+(max-min)/2:number);const percent=(Number(range.value)-min)/(max-min)*100;
    range.style.setProperty('--nc-progress',percent+'%');box.classList.toggle('nc-mixed',input.value===''&&!input.disabled);input.placeholder=input.value===''?(input.disabled?'—':'Mixed'):'';
    range.setAttribute('aria-valuetext',input.value===''?(input.disabled?'Unavailable':'Mixed — adjust to set one value'):input.value+(spokenUnit?' '+spokenUnit:'')+(options.reverse?' per cycle':''));
    if(options.output&&$(options.output))$(options.output).textContent=input.value+(options.unit==='%'?'%':' '+(options.unit||''));
    if(sample)sample.style.backgroundColor=options.sample(Number.isFinite(input.valueAsNumber)?input.valueAsNumber:100);
  }
  function begin(){
    if(gesture||input.disabled)return;
    if(!options.staged&&!options.viewOnly&&projectReady)projectFlush();
    gesture={before:last,stamp:numericStamp(),preview:options.preview?.(),captured:options.capture?.(),dirty:false};
  }
  function paint(){
    if(!gesture||!valid())return;gesture.dirty=input.value!==gesture.before;display();status.textContent='';input.removeAttribute('aria-invalid');
    gesture.preview?.paint(input.valueAsNumber);if(options.live)invoke();
  }
  function cancel(stale=false){
    if(!gesture)return;const old=gesture;gesture=null;
    if(!stale){old.preview?.restore();input.value=old.before;if(options.live&&old.dirty)invoke();options.cancel?.(old.captured);}
    input.removeAttribute('aria-invalid');status.textContent=stale?'Selection changed; adjustment cancelled.':'';last=input.value;display();
  }
  function commit(){
    if(!gesture)return;
    if(input.disabled||gesture.stamp!==numericStamp()){cancel(true);return;}
    if(!valid()){input.setAttribute('aria-invalid','true');status.textContent='Enter '+(options.integer?'a whole number':'a value')+' from '+min+' to '+max+'.';return;}
    const old=gesture;gesture=null;old.preview?.restore();const dirty=input.value!==old.before;
    last=input.value;input.removeAttribute('aria-invalid');status.textContent='';
    const focus=document.activeElement;if(dirty&&!options.live)invoke();numericRefreshScope();display();
    if([input,range,reset].includes(focus)&&focus.isConnected&&!focus.disabled)focus.focus({preventScroll:true});
  }
  input.addEventListener('focus',begin);
  input.addEventListener('input',event=>{event.stopImmediatePropagation();begin();paint();},true);
  input.addEventListener('change',event=>{event.stopImmediatePropagation();begin();paint();commit();},true);
  input.addEventListener('blur',()=>{commit();if(input.getAttribute('aria-invalid')==='true'){const message=status.textContent;cancel();status.textContent=message+' Previous value restored.';}});
  range.addEventListener('pointerdown',begin);range.addEventListener('input',()=>{begin();input.value=String(position(Number(range.value)));paint();});range.addEventListener('change',commit);range.addEventListener('pointerup',commit);range.addEventListener('pointercancel',()=>cancel());
  for(const element of [input,range]){
    const adjustmentKey=key=>(element===input?['ArrowUp','ArrowDown','PageUp','PageDown']:['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown']).includes(key);
    element.addEventListener('keydown',event=>{
      if(event.key==='Escape'&&gesture){const local=gesture.dirty&&!box.closest('[popover]');cancel();if(local){event.preventDefault();event.stopPropagation();}return;}
      if(event.key==='Enter'&&element===input){event.preventDefault();commit();return;}
      if(!adjustmentKey(event.key))return;
      event.preventDefault();event.stopPropagation();begin();const current=element===range?Number(range.value):Number(input.value||min),delta=step*(event.shiftKey||event.key.startsWith('Page')?10:1);
      const next=event.key==='Home'?min:event.key==='End'?max:current+(['ArrowLeft','ArrowDown','PageDown'].includes(event.key)?-delta:delta);
      const bounded=Math.max(min,Math.min(max,next));input.value=String(Number((element===range?position(bounded):bounded).toFixed(6)));paint();
    });
    element.addEventListener('keyup',event=>{if(adjustmentKey(event.key))commit();});
    element.addEventListener('wheel',event=>{event.preventDefault();let parent=box.parentElement;while(parent){if(parent.scrollHeight>parent.clientHeight&&/(auto|scroll)/.test(getComputedStyle(parent).overflowY)){parent.scrollBy({top:event.deltaY*(event.deltaMode===1?16:1),left:event.deltaX});break;}parent=parent.parentElement;}},{passive:false});
  }
  reset.onclick=()=>{if(input.disabled)return;cancel();if(typeof options.reset==='function'){options.reset();numericRefreshScope();if(reset.isConnected)reset.focus({preventScroll:true});return;}begin();input.value=String(defaultValue()??min);paint();commit();};
  const control={input,box,range,cancel,sync(){
    if(gesture&&gesture.stamp!==numericStamp())cancel(true);
    range.disabled=input.disabled;reset.disabled=input.disabled||!!(options.canReset&&!options.canReset());
    if(mark){mark.style.left=((position(defaultValue())-min)/(max-min)*100)+'%';track.title='Default: '+defaultValue()+(options.unit||'');}
    if(gesture)return;last=input.value;display();
  }};numericControls.set(input.id,control);control.sync();new MutationObserver(()=>control.sync()).observe(input,{attributes:true,attributeFilter:['disabled']});
}
function numericRefreshScope(scope=document){
  if(numericSyncing||numericBusy)return;numericSyncing=true;
  try{for(const control of numericControls.values())if(scope===document||scope.contains(control.input))control.sync();for(const row of document.querySelectorAll('.nc-presets'))for(const button of row.children)button.disabled=!!$(row.id.replace(/-presets$/,''))?.disabled;}finally{numericSyncing=false;}
}
function numericFontReset(){
  const target=weTextTarget();if(!target||ceLocked()||!/(?:^|;)\s*font-size\s*:/i.test(target.node.attrs?.style||''))return;const path=target.path;vbEnd(false);
  projectChange(()=>{const node=projectAt(projectModel(),path);node.attrs??={};node.attrs.style=(node.attrs.style||'').split(';').filter(rule=>!/^\s*font-size\s*:/i.test(rule)).join(';');});vbFocusPath(path);
}
function numericInstall(){
  const add=(id,options)=>numericAttach($(id),options);
  for(const scope of ['presentation','slide'])for(const [field,label,unit,fallback]of [['intensity','Intensity','%',45],['scale','Scale','%',100],['speed','Motion speed','s',60]])add('bg-'+scope+'-'+field,{label,numberLabel:field==='speed'?'Cycle duration in seconds':label,unit,default:()=>scope==='slide'?(projectState.backgroundEffects?.defaults?.[field]??fallback):fallback,reverse:field==='speed',staged:true,live:true,capture:()=>$('bg-'+scope+'-source').value,cancel:source=>{if(source==='inherit'){const select=$('bg-'+scope+'-source');select.value='inherit';select.dispatchEvent(new Event('change',{bubbles:true}));}}});
  add('sp-opacity',{label:'Color opacity',unit:'%',default:100,staged:true,sample:value=>spCSS({hex:/^#[0-9a-f]{6}$/i.test($('sp-hex').value)?$('sp-hex').value:$('sp-color-picker').value,opacity:value/100},studioPalette(projectState.brand))});
  add('component-opacity',{label:'Color opacity',unit:'%',default:100,staged:true,compact:true});
  for(const id of ['sp-border-width','component-border-width'])add(id,{label:'Border width',unit:'px',default:0,compact:id.startsWith('component'),preview:()=>numericPaint(numericSelected(),(element,value)=>{element.style.borderWidth=value+'px';element.style.borderStyle='solid';})});
  add('sp-rotation',{label:'Rotation',unit:'°',default:0,preview:numericStyle('rotate','deg')});
  add('we-font-size',{label:'Font size',unit:'px',reset:numericFontReset,canReset:()=>/(?:^|;)\s*font-size\s*:/i.test(weTextTarget()?.node.attrs?.style||''),preview:()=>numericPaint([weTextTarget()?.el],(element,value)=>{element.style.fontSize=value+'px';})});
  add('an-stroke',{label:'Arrow stroke width',unit:'px',default:4,integer:true,preview:()=>numericPaint(numericSelected().flatMap(element=>[...element.querySelectorAll('.an-line')]),(element,value)=>{element.style.height=value+'px';})});
  add('nx-logo-size',{label:'Logo height',unit:'px',default:40,output:'nx-logo-size-value',preview:()=>numericPaint([...document.querySelectorAll('.project-logo')],(element,value)=>{element.style.height=value+'px';}),commit:()=>projectChange(()=>{if(!ceLocked())projectState.brand.logoSize=Number($('nx-logo-size').value);})});
  add('me-overlay',{label:'Background overlay',unit:'%',default:55,output:'me-overlay-value',commit:mediaReadControls,preview:()=>numericPaint([...$('me-preview').querySelectorAll('.media-shade')],(element,value)=>{element.style.opacity=String(value/100);})});
  add('mg-gap',{label:'Grid spacing',unit:'%',default:2,integer:true,staged:true});
  for(const axis of ['x','y'])add('mg-crop-'+axis,{label:'Crop '+axis.toUpperCase(),unit:'%',default:50,preview:()=>numericPaint([ceFigure()],(element)=>{element.style.setProperty('--media-pos',$('mg-crop-x').value+'% '+$('mg-crop-y').value+'%');})});
  for(const [name,fallback]of [['slides',210],['inspector',335]])add('we-size-'+name,{label:name==='slides'?'Slides panel width':'Inspector width',unit:'px',default:fallback,viewOnly:true,live:true});
  for(const prefix of ['db','ce'])for(const key of ['x','y','w','h'])add(prefix+'-'+key,{label:({x:'Left',y:'Top',w:'Width',h:'Height'})[key],unit:'%',compact:true,reset:false,preview:()=>numericPaint(prefix==='ce'?[ceFigure()]:numericSelected(),(element,value)=>{element.style[({x:'left',y:'top',w:'width',h:'height'})[key]]=value+'%';})});
  for(const index of [0,1])for(const axis of ['x','y'])add('an-'+index+axis,{label:(index?'End ':'Start ')+axis.toUpperCase(),unit:'%',compact:true,reset:false});
  numericPresets('fe-duration',[[12,'Default · 12 s'],[15,'15 s'],[30,'30 s'],[60,'60 s']]);
  numericPresets('booth-idle',[[0,'Off'],[30,'30 s'],[60,'1 min'],[300,'5 min']]);
  $('sp-hex').addEventListener('input',()=>numericRefreshScope());$('sp-color-picker').addEventListener('input',()=>numericRefreshScope());
  numericRefreshScope();
}
function numericPresets(id,choices){const input=$(id);if(!input||$(id+'-presets'))return;const row=document.createElement('div');row.id=id+'-presets';row.className='nc-presets';row.setAttribute('role','group');row.setAttribute('aria-label',id==='fe-duration'?'Slide duration presets':'Booth idle presets');for(const [value,label]of choices){const button=document.createElement('button');button.type='button';button.textContent=label;button.onclick=()=>{if(input.disabled)return;projectFlush();input.value=String(value);input.dispatchEvent(new Event('input',{bubbles:true}));projectFlush();};row.append(button);}input.after(row);}
const numericInit=projectInit;
projectInit=function(...args){const result=numericInit(...args);numericInstall();return result;};
for(const name of ['pointercancel','blur'])window.addEventListener(name,()=>{for(const control of numericControls.values())control.cancel();});
const numericForm=projectForm;projectForm=function(...args){const result=numericForm(...args);numericRefreshScope();return result;};
const numericPaintWorkspace=wpPaint;wpPaint=function(...args){const result=numericPaintWorkspace(...args);numericRefreshScope();return result;};
const numericPanels=bgRefreshPanels;bgRefreshPanels=function(...args){const result=numericPanels(...args);numericRefreshScope();return result;};
const numericMediaSelect=mediaSelect;mediaSelect=function(...args){const result=numericMediaSelect(...args);numericRefreshScope();return result;};
const numericPanelView=wePanelView;wePanelView=function(...args){const result=numericPanelView(...args);numericRefreshScope();return result;};
