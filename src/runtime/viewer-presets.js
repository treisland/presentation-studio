let vcSession=null,vcReady=false,vcPolicy='';
const vcKeys=['autoHide','showNotes','showProgress','showCount'];
function vcClean(raw){
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).some(k=>!['version','preset',...vcKeys].includes(k))||raw.version!==1||!['presentation','playback'].includes(raw.preset)||vcKeys.some(k=>typeof raw[k]!=='boolean'))throw Error('Invalid viewer control defaults.');
  return {version:1,preset:raw.preset,...Object.fromEntries(vcKeys.map(k=>[k,raw[k]]))};
}
function vcDefaults(){return projectState.viewerDefaults||{version:1,preset:'playback',autoHide:kiosk,showNotes:true,showProgress:true,showCount:true};}
function vcSettings(){if(vcSession&&vcSession.project!==projectMeta.id)vcSession=null;return vcSession?.settings||vcDefaults();}
const vcValidate=projectValidateState;
projectValidateState=function(raw,...args){const state=vcValidate(raw,...args);if(Object.hasOwn(raw,'viewerDefaults'))state.viewerDefaults=vcClean(raw.viewerDefaults);return state;};
editingRegisterOperation('viewer.defaults',(state,operation)=>{
  editingSlide(state,operation.slideId);if(state.slides.some(s=>s.editLocked))editingFail('LOCKED','Unlock every slide before changing presentation defaults.');
  if(operation.reset)delete state.viewerDefaults;else state.viewerDefaults=vcClean(operation.config);
});
function vcPinned(){const controls=$('controls');return controls.matches(':hover')||controls.contains(document.activeElement)||!!document.querySelector('dialog[open],.hub-menu[open]');}
function vcSchedule(){
  clearTimeout(idleTimer);document.body.classList.remove('idle');
  if(vcReady&&vcSettings().autoHide&&!vcPinned())idleTimer=setTimeout(()=>{if(!vcPinned())document.body.classList.add('idle');},3000);
}
function vcSync(){
  if(!vcReady)return;const settings=vcSettings(),current=slides[index];
  $('play').hidden=settings.preset==='presentation';
  $('vf-countdown').classList.toggle('vc-concealed',settings.preset==='presentation');
  $('notes').hidden=!settings.showNotes||projectPlayback;
  const chrome=current?visibilitySettings(projectState,current.dataset.mediaId):{footer:true,number:true};
  $('vf-position').hidden=!settings.showProgress||!chrome.footer;
  $('vf-count').hidden=!settings.showCount||!chrome.number||slides.length<=1;
  const notesParent=settings.preset==='presentation'&&settings.showNotes&&!projectPlayback?document.querySelector('.vf-left'):$('vc-presenter-tools');
  if($('notes').parentElement!==notesParent)notesParent.append($('notes'));
  $('vc-preset').value=settings.preset;
  for(const key of vcKeys)$('vc-'+key).checked=settings[key];
  $('vc-pin').checked=!settings.autoHide;
  const locked=projectPlayback||projectState.editLocked||projectState.slides.some(s=>s.editLocked);
  for(const id of ['vc-save-defaults','vc-clear-defaults'])if($(id))$(id).disabled=!!locked;
  const policy=JSON.stringify([projectMeta.id,settings]);if(policy!==vcPolicy){vcPolicy=policy;vcSchedule();}
}
function vcOverride(changes){vcSession={project:projectMeta.id,settings:vcClean({...vcSettings(),...changes})};vcSync();$('vc-announcement').textContent=`${vcSettings().preset==='presentation'?'Presentation':'Playback'} controls. ${playing?'Playback continues.':'Playback is paused.'}`;}
const vcRender=render;
render=function(...args){const result=vcRender(...args);vcSync();return result;};
const vcActivity=activity;
activity=function(...args){const result=vcActivity(...args);if(vcReady)vcSchedule();return result;};
const vcPlay=setPlaying;
setPlaying=function(value,...args){const changed=value!==playing,result=vcPlay(value,...args);if(vcReady&&changed)$('vc-announcement').textContent=playing?'Playback started.':'Playback paused.';return result;};
const vcAccept=projectAcceptPack;
projectAcceptPack=function(...args){vcSession=null;vcPolicy='';const result=vcAccept(...args);vcSync();return result;};
const vcBooth=boothExportData;
boothExportData=function(...args){const data=vcBooth(...args);if(projectState.viewerDefaults)data.viewerDefaults=vcClean(projectState.viewerDefaults);return data;};
function vcMount(){
  const more=$('hub-player-more').querySelector('.hub-menu-items');
  const group=(id,label)=>{const fieldset=document.createElement('fieldset'),legend=document.createElement('legend');fieldset.id=id;fieldset.className='vc-group';legend.textContent=label;fieldset.append(legend);more.append(fieldset);return fieldset;};
  const presenter=group('vc-presenter-tools','Presenter tools'),appearance=group('vc-controls','Appearance and controls'),presentation=group('vc-presentation','Presentation'),help=group('vc-help','Help');
  for(const id of ['notes'])presenter.append($(id));
  for(const id of ['bg-viewer-motion','kiosk'])if($(id))appearance.append($(id));
  for(const id of ['hub-presentations','open-full-editor','browse-questions','qa','steps','detection'])if($(id)&&$(id).closest('#hub-player-more'))presentation.append($(id));
  help.append($('info'));
  const compact=()=>{const right=document.querySelector('.vf-right');if(innerWidth<640)presentation.append($('vf-count'),$('open-full-editor'));else{right.prepend($('vf-count'));right.insertBefore($('open-full-editor'),$('hub-player-more'));}};
  addEventListener('resize',compact);compact();
  const presetLabel=document.createElement('label');presetLabel.textContent='Control preset';const preset=document.createElement('select');preset.id='vc-preset';preset.add(new Option('Presentation','presentation'));preset.add(new Option('Playback','playback'));preset.onchange=()=>vcOverride({preset:preset.value});presetLabel.append(preset);appearance.prepend(presetLabel);
  for(const [key,label]of [['autoHide','Auto-hide controls'],['pin','Always visible'],['showNotes','Show Notes shortcut'],['showProgress','Show deck position'],['showCount','Show slide count']]){
    const wrapper=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.id='vc-'+key;wrapper.append(input,document.createTextNode(label));appearance.append(wrapper);input.onchange=()=>vcOverride(key==='pin'?{autoHide:!input.checked}:{[key]:input.checked});
  }
  const reset=componentButton('Reset session controls to defaults',()=>{vcSession=null;vcSync();$('vc-announcement').textContent='Session controls reset to deck defaults.';});appearance.append(reset);
  const hint=document.createElement('small');hint.textContent='Control layout does not change automatic playback. Viewer changes last for this loaded project only.';appearance.append(hint);
  const status=document.createElement('span');status.id='vc-announcement';status.className='vc-sr';status.setAttribute('role','status');status.setAttribute('aria-live','polite');document.body.append(status);
  const controls=$('controls');controls.addEventListener('pointerenter',()=>{clearTimeout(idleTimer);document.body.classList.remove('idle');});controls.addEventListener('pointerleave',vcSchedule);controls.addEventListener('focusin',()=>{clearTimeout(idleTimer);document.body.classList.remove('idle');});controls.addEventListener('focusout',()=>setTimeout(vcSchedule,0));
  for(const details of controls.querySelectorAll('details'))details.addEventListener('toggle',vcSchedule);
  document.addEventListener('close',vcSchedule,true);document.addEventListener('pointerdown',()=>{if(vcReady)vcSchedule();},true);
  $('kiosk').addEventListener('click',vcSync);
  const editor=document.createElement('fieldset');editor.id='vc-author-defaults';editor.className='vc-defaults';editor.innerHTML='<legend>Portable viewer defaults</legend><p>Save the current viewer control layout as deck defaults. This does not change playback state. Viewer-only changes are temporary until explicitly saved.</p><button id="vc-save-defaults">Save current viewer controls as deck defaults</button><button id="vc-clear-defaults">Use legacy viewer defaults</button><p id="vc-default-status" role="status"></p>';
  $('fe-settings-panel').prepend(editor);
  $('vc-save-defaults').onclick=()=>{const result=componentRun({type:'viewer.defaults',slideId:projectSelected,config:vcSettings()});if(result.ok){vcSession=null;vcSync();$('vc-default-status').textContent='Deck defaults saved. Undo restores the previous defaults.';}};
  $('vc-clear-defaults').onclick=()=>{const result=componentRun({type:'viewer.defaults',slideId:projectSelected,reset:true});if(result.ok){vcSession=null;vcSync();$('vc-default-status').textContent='Legacy viewer defaults restored.';}};
  vcReady=true;vcSync();
}
const vcInit=projectInit;
projectInit=function(...args){const result=vcInit(...args);vcMount();return result;};
