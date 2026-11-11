const bgPanels=[];
function bgPanel(scope){
  const id='bg-'+scope,panel=document.createElement('fieldset');panel.className='bg-panel';panel.id=id;
  const legend=document.createElement('legend');legend.textContent=scope==='presentation'?'Presentation background':'Slide background';panel.append(legend);
  const hint=document.createElement('p');hint.className='bg-hint';hint.textContent='Theme-aware decoration behind your content. Editor and slide cards stay static. Effects use format v3; keep editable ZIP backups.';panel.append(hint);
  const gallery=document.createElement('div');gallery.className='bg-gallery';gallery.setAttribute('aria-label','Background presets');panel.append(gallery);
  const cards=[];
  for(const [effect,name]of Object.entries(bgEngine.names)){
    const button=document.createElement('button');button.type='button';button.className='bg-preset';button.setAttribute('aria-label','Choose '+name+' background');
    const frame=document.createElement('span');frame.className='bg-card-frame';const sample=document.createElement('span');sample.className='bg-card-stage';frame.append(sample);
    const title=document.createElement('span');title.textContent=name;button.append(frame,title);gallery.append(button);
    button.onclick=()=>{fields.effect.value=effect;change();};cards.push({effect,button,sample,controller:bgEngine.mount(sample),frame});
  }
  const controls=document.createElement('div');controls.className='bg-controls';panel.append(controls);
  const advanced=document.createElement('details');advanced.className='bg-advanced';const summary=document.createElement('summary');summary.textContent='Advanced appearance';advanced.append(summary);
  const advancedFields=document.createElement('div');advancedFields.className='bg-controls';advanced.append(advancedFields);
  const fields={},make=(key,label,type,choices)=>{
    const wrapper=document.createElement('label');wrapper.htmlFor=id+'-'+key;wrapper.textContent=label;
    const field=document.createElement(type==='select'?'select':'input');field.id=id+'-'+key;
    if(type==='select')for(const [value,text]of choices)field.add(new Option(text,value));else field.type=type;
    wrapper.append(field);(['source','effect','mode','position'].includes(key)?controls:advancedFields).append(wrapper);fields[key]=field;return field;
  };
  make('source','Settings source','select',scope==='presentation'?[['inherit','Original orb'],['custom','Custom background']]:[['inherit','Use presentation default'],['custom','Slide override']]);
  make('effect','Effect','select',Object.entries(bgEngine.names));
  make('mode','Motion','select',[['static','Static'],['animated','Animated']]);
  make('position','Placement','select',[['right','Right'],['left','Left'],['full','Full slide'],['corners','Corners']]);
  for(const [key,label,min,max]of [['intensity','Intensity (%)',0,100],['speed','Cycle duration (seconds)',10,120],['scale','Scale (%)',50,150]]){const field=make(key,label,'number');field.min=min;field.max=max;field.step=1;}
  make('quality','Rendering detail','select',[['standard','Standard'],['reduced','Simpler']]);
  const quiet=make('quiet','Keep a quiet area for content','checkbox');quiet.checked=true;
  const grid=make('grid','Show grid decoration','checkbox');grid.checked=true;
  const colors=document.createElement('div');colors.className='bg-colors';advancedFields.append(colors);
  const colorFields=[];
  for(let i=0;i<3;i++){
    const label=document.createElement('label');label.className='bg-color';label.textContent='Color '+(i+1);
    const source=document.createElement('select');source.id=id+'-color-'+i;source.setAttribute('aria-label','Color '+(i+1)+' source');
    for(const role of bgEngine.roles)source.add(new Option('Theme: '+role,role));source.add(new Option('Custom','custom'));
    const value=document.createElement('input');value.type='color';value.id=id+'-hex-'+i;value.setAttribute('aria-label','Custom background color '+(i+1));
    const reset=document.createElement('button');reset.type='button';reset.textContent='Reset to theme';reset.onclick=()=>{source.value=bgEngine.defaults.colors[i];change();};
    label.append(source,value,reset);colors.append(label);colorFields.push({source,value,reset});source.onchange=change;value.oninput=change;
  }
  const preview=document.createElement('div');preview.className='bg-preview';preview.setAttribute('aria-label','Background effect preview');
  const canvas=document.createElement('div');canvas.className='bg-preview-stage';
  const originalOrb=document.createElement('div');originalOrb.className='orb';originalOrb.style.animation='none';canvas.append(originalOrb);
  const copy=document.createElement('div');copy.className='bg-preview-copy';copy.textContent='Your story. Your style.';canvas.append(copy);preview.append(canvas);
  const body=document.createElement('div');body.className='bg-body';body.append(preview,controls);panel.append(body);
  const previewController=bgEngine.mount(canvas),actions=document.createElement('div');actions.className='bg-actions';panel.append(actions);
  const button=(text,handler,suffix)=>{const node=document.createElement('button');node.type='button';node.textContent=text;node.id=id+'-'+suffix;node.onclick=handler;actions.append(node);return node;};
  const status=document.createElement('p');status.className='bg-hint';status.setAttribute('role','status');panel.append(status);
  panel.append(advanced);
  let signature='',draft=null,playing=false,legacyPreview=false;
  function loadDraft(value){
    legacyPreview=!value;
    draft=value||bgEngine.defaults;
    for(const key of ['effect','mode','position','quality','intensity','speed','scale'])fields[key].value=draft[key];fields.quiet.checked=draft.quiet;fields.grid.checked=draft.grid;
    const palette=studioPalette(projectState.brand);
    colorFields.forEach(({source,value},i)=>{const color=draft.colors[i];source.value=color.startsWith('#')?'custom':color;value.value=color.startsWith('#')?color:palette[color];value.disabled=source.value!=='custom';});
  }
  function read(){return bgEngine.clean({effect:fields.effect.value,mode:fields.mode.value,position:fields.position.value,quality:fields.quality.value,quiet:fields.quiet.checked,grid:fields.grid.checked,intensity:Number(fields.intensity.value),speed:Number(fields.speed.value),scale:Number(fields.scale.value),colors:colorFields.map(({source,value})=>source.value==='custom'?value.value:source.value)});}
  function show(){
    const palette=studioPalette(projectState.brand);canvas.style.background=palette.background;copy.style.color=palette.ink;canvas.style.setProperty('--cyan',palette.secondary||palette.accent);originalOrb.hidden=!legacyPreview;
    for(const {source,value}of colorFields)if(source.value!=='custom')value.value=palette[source.value];
    canvas.style.transform='scale('+Math.max(1,preview.clientWidth)/1920+')';
    previewController.update(legacyPreview?null:draft,palette,{motion:playing&&!document.hidden&&!nxMotionDisabled()});
    for(const card of cards){card.sample.style.background=palette.background;card.sample.style.transform='scale('+Math.max(1,card.frame.clientWidth)/1920+')';card.controller.update({...draft||bgEngine.defaults,effect:card.effect,mode:'static'},palette,{motion:false});card.button.setAttribute('aria-pressed',String(fields.source.value==='custom'&&fields.effect.value===card.effect));}
    animate.textContent=playing?'Stop motion preview':'Preview motion';animate.setAttribute('aria-pressed',String(playing));
    animate.disabled=legacyPreview||draft.effect==='none'||draft.mode==='static';
    if(draft.mode==='static')status.textContent='Static background selected. Choose Animated to preview motion.';
    if(playing&&nxMotionDisabled())status.textContent='Reduced motion is active. Showing a static composition.';
  }
  function change(){
    try{draft=read();legacyPreview=false;fields.source.value='custom';for(const {source,value}of colorFields)value.disabled=source.value!=='custom';status.textContent='Preview only. Apply to save this background.';show();}
    catch(error){status.textContent=error.message;}
  }
  for(const [key,field]of Object.entries(fields))field.onchange=key==='source'?()=>{
    if(field.value==='inherit'){playing=false;loadDraft(scope==='slide'?bgEngine.resolve({...projectState,backgroundEffects:projectState.backgroundEffects?{...projectState.backgroundEffects,slides:{}}:undefined},projectSelected):null);show();status.textContent='Apply to use '+(scope==='slide'?'the presentation default.':'the original orb.');}
    else change();
  }:change;
  const animate=button('Preview motion',()=>{if(!playing)for(const item of bgPanels)if(item.panel!==panel)item.stop();playing=!playing;show();},'preview');
  const apply=button('Apply background',()=>{
    try{const result=componentRun({type:'background.set',scope,reset:fields.source.value==='inherit',config:read()});if(result.ok){signature='';refresh();navBoundary(true);status.textContent='Background saved. Changes can be undone.';}else status.textContent=result.message;}
    catch(error){status.textContent=error.message;}
  },'apply');
  const reset=button(scope==='slide'?'Use presentation default':'Restore original orb',()=>{
    const result=componentRun({type:'background.set',scope,reset:true});if(result.ok){signature='';refresh();navBoundary(true);status.textContent='Default restored. Changes can be undone.';}else status.textContent=result.message;
  },'reset');
  function refresh(){
    const raw=scope==='presentation'?projectState.backgroundEffects?.defaults:projectState.backgroundEffects?.slides?.[projectSelected];
    const next=projectMeta.id+':'+projectSelected+':'+JSON.stringify(raw);
    if(next!==signature){
      signature=next;playing=false;loadDraft(raw||bgEngine.resolve(projectState,projectSelected));fields.source.value=raw?'custom':'inherit';
    }
    const locked=ceLocked()||(scope==='presentation'&&projectState.slides.some(item=>item.editLocked));
    for(const control of panel.querySelectorAll('input,select,button'))control.disabled=locked;
    colorFields.forEach(({source,value})=>value.disabled=locked||source.value!=='custom');
    animate.disabled=false;apply.disabled=locked;reset.disabled=locked;
    if(!panel.getClientRects().length||!$('full-editor').open)playing=false;
    show();
  }
  bgPanels.push({scope,panel,refresh,stop(){playing=false;show();}});return panel;
}
function bgRefreshPanels(){for(const item of bgPanels)item.refresh();}
const bgSelectTab=projectSelectTab;
projectSelectTab=function(tab,...args){const result=bgSelectTab(tab,...args);const panel=$('fe-background-panel');if(panel){panel.hidden=tab!=='background';if(tab!=='background')bgPanels.find(item=>item.scope==='presentation')?.stop();if(bgReady)bgRefreshPanels();}return result;};
const bgForm=projectForm;
projectForm=function(...args){const result=bgForm(...args);if(bgReady)bgRefreshPanels();return result;};
const bgInit=projectInit;
projectInit=function(...args){
  const result=bgInit(...args);if(bgReady)return result;
  const panel=document.createElement('section');panel.id='fe-background-panel';panel.hidden=true;panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby','we-tab-background');panel.append(bgPanel('presentation'));$('we-project-panels').append(panel);
  weProjectTabs.add('background');const tab=document.createElement('button');tab.id='we-tab-background';tab.type='button';tab.dataset.feTab='background';tab.setAttribute('role','tab');tab.setAttribute('aria-controls',panel.id);tab.setAttribute('aria-selected','false');tab.tabIndex=-1;tab.textContent='Background';tab.onclick=()=>projectSelectTab('background');$('we-project-tabs').querySelector('[data-fe-tab="settings"]').after(tab);
  const slide=document.createElement('details');slide.className='bg-slide-settings';const summary=document.createElement('summary');summary.textContent='Background';slide.append(summary,bgPanel('slide'));slide.addEventListener('toggle',bgRefreshPanels);$('ic-slide-fields').append(slide);
  const toggle=document.createElement('button');toggle.id='bg-viewer-motion';toggle.type='button';toggle.onclick=()=>{bgViewerMotion=!bgViewerMotion;bgSync();};$('hub-player-more').querySelector('.hub-menu-items').append(toggle);
  bgReady=true;
  document.addEventListener('visibilitychange',()=>{bgSync();});matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',bgSync);
  window.addEventListener('resize',bgRefreshPanels);$('full-editor').addEventListener('close',()=>{for(const item of bgPanels)item.stop();bgSync();});
  $('we-settings').addEventListener('close',()=>{for(const item of bgPanels)item.stop();});
  bgSync();return result;
};
