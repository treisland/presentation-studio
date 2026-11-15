// Editor commands are shortcuts into existing controls and transactions.
let emReady=false,emActive=null,emStamp='',emOrigin=null;
const emNames=['File','Edit','View','Insert','Format','Arrange','Slide','Help'];
// Selection grips use top-layer popovers. Keep them out of open command menus
// and dialogs, then restore their existing geometry when editing resumes.
const emPreviousHandles=mhPaint;
mhPaint=function(...args){if(emActive||document.querySelector('dialog[open]:not(#full-editor)')){mhHide();return;}return emPreviousHandles(...args);};
function emButton(label,id,extra=false){
  const control=$(id),disabled=!control||control.disabled||extra;
  return {label,disabled,danger:/^(Delete|Remove)/.test(label),reason:disabled?'Unavailable for the current selection, lock or editing mode.':'',action:()=>$(id)?.click()};
}
function emSection(tab,target){
  weCloseSettings();wePanels.inspector.open=true;if(innerWidth<760)wePanels.slides.open=false;
  wePanelView();wpChooseTab(tab);const node=typeof target==='function'?target():$(target);
  if(node){idsReveal(node,true);const section=node.closest('details')||node;section.classList.remove('em-revealed');void section.offsetWidth;section.classList.add('em-revealed');}
}
function emSlide(target){icNavigate('slide');emSection('content',target);}
function emLibrary(category){$('component-open').click();$('component-search').value='';$('component-category').value=category;componentList();$('component-search').focus();}
function emSelect(label,value){const control=$('component-align');return {label,disabled:!control||control.disabled||value.startsWith('distribute-')&&spActiveKeys().length<3,action:()=>{control.value=value;control.dispatchEvent(new Event('change',{bubbles:true}));}};}
function emRows(name){
  const context=icSelection(),placed=cmPlaced(),find=pattern=>placed.find(row=>pattern.test(row.label)),noSelection=context.kind==='slide',locked=context.locked||!weEditing()||vbMode!=='edit';
  const unavailable=label=>({label,disabled:true,reason:'Select an applicable unlocked object in Edit blocks mode.'});
  const action=(label,pattern)=>({...find(pattern)||unavailable(label),label});
  const destination=(label,tab,target,disabled=false)=>({label,disabled,action:()=>emSection(tab,target)});
  if(name==='Edit')return [emButton('Undo','fe-undo'),emButton('Redo','fe-redo'),null,action(noSelection?'Duplicate slide':'Duplicate selection',/^Duplicate/),action(noSelection?'Delete slide':context.kind==='grid'?'Remove media from cell':'Delete from slide',/^(Delete|Remove media)/),null,action('Rename in Layers…',/^Rename in Layers/),emButton('Save as component…','component-save-action',!componentCanSave()||locked)];
  if(name==='View')return [
    {label:'Slides panel',checked:wePanels.slides.open&&ldTab==='slides',action:()=>{wbPanelChoices.slides=true;const close=wePanels.slides.open&&ldTab==='slides';wePanels.slides.open=!close;if(!close&&innerWidth<760)wePanels.inspector.open=false;wePanelView();if(!close)ldChoose('slides',true);}},
    {label:'Layers panel',checked:wePanels.slides.open&&ldTab==='layers',action:()=>{if(wePanels.slides.open&&ldTab==='layers')$('we-toggle-slides').click();else ldOpen(true);}},
    {label:'Inspector',checked:wePanels.inspector.open,action:()=>$('we-toggle-inspector').click()},null,
    {label:'Zoom in',action:()=>weStepZoom(1)},{label:'Zoom out',action:()=>weStepZoom(-1)},
    {label:'Fit slide',checked:weZoom==='fit',action:()=>weSetZoom('fit')},
    {label:'Actual size',action:()=>weSetZoom(1)},null,
    {...emButton('Snap to guides','wb-snap'),checked:spSnapEnabled},
    emButton('Reset workspace','we-panel-reset'),null,emButton('Edit blocks','vb-edit-mode'),emButton('Interactive preview','vb-preview-mode'),
    {label:'Editor appearance…',action:()=>{weOpenSettings('brand');$('studio-editor-theme').focus();}}
  ];
  if(name==='Insert')return [['Text','Text'],['Shapes & annotations','Shapes'],['Image / video','Media'],['Widgets','Widgets'],['Tables & code','Data'],['My components','Library']].map(([label,category])=>({label:label+'…',disabled:$('component-open').disabled,action:()=>emLibrary(category)})).concat([null,emButton('Add slide…','studio-gallery-open'),{label:'Presentation audio…',action:()=>weOpenSettings('audio')}]);
  if(name==='Format')return [action('Edit selected content…',/^(Edit text|Edit table|Edit code|Configure widget|Appearance)/),null,
    destination('Appearance & colors…','style','is-color-fill',noSelection),
    {label:'Text formatting…',disabled:!vbSelected||vbSelected.kind!=='text'||locked,action:()=>$('component-text-trigger').click()},
    {...find(/^Crop \/ adjust/)||unavailable('Crop & frame…'),label:'Crop & frame…'},
    action('Replace media…',/^Replace media/),action('On-click action…',/^Edit action/),null,
    {label:'Presentation theme & branding…',action:()=>weOpenSettings('brand')},
    {label:'Presentation background…',action:()=>weOpenSettings('background')}
  ];
  if(name==='Arrange')return [emButton('Bring forward','component-forward',locked||noSelection),emButton('Send backward','component-backward',locked||noSelection),null,
    {label:'Align',children:[['Left','left'],['Center horizontally','center'],['Right','right'],['Top','top'],['Center vertically','middle'],['Bottom','bottom']].map(([label,value])=>emSelect(label,value))},
    {label:'Distribute',children:[emSelect('Horizontally','distribute-x'),emSelect('Vertically','distribute-y')]},null,
    emButton('Group','component-group',locked),emButton('Ungroup','component-ungroup',locked),action('Edit group members',/^Edit group/),action('Finish editing group',/^Finish editing/),null,
    action(find(/^(Unlock|Lock)/)?.label||'Lock',/^(Unlock|Lock)/),action(find(/^(Show|Hide)$/)?.label||'Hide',/^(Show|Hide)$/),null,
    destination('Position & size…','arrange',()=>[...$('wp-fields').querySelectorAll('[data-wp-part="arrange"] :is(input:not([disabled]),select:not([disabled]),summary)')].find(node=>node.checkVisibility()),noSelection),
    find(/^Placement$/)||unavailable('Placement'),emButton('Enable free positioning','wb-customize',$('wb-customize').hidden||locked)
  ];
  if(name==='Slide')return [emButton('Add slide…','studio-gallery-open'),emButton('Duplicate slide','fe-duplicate'),emButton('Delete slide','fe-trash-slide'),null,emButton('Move slide up','fe-up'),emButton('Move slide down','fe-down'),null,
    {label:'Slide settings…',action:()=>emSlide('fe-slide-title')},{label:'Layout…',action:()=>emSlide('fe-slide-template')},
    {label:'Background…',action:()=>emSlide('cb-source')},{label:'Sound / narration…',action:()=>emSlide('au-slide-file')},
    {label:'Presenter notes…',action:()=>emSlide('fe-notes-text')},null,
    {label:'Sections…',action:()=>weOpenSettings('sections')},{label:'Transitions…',action:()=>weOpenSettings('settings')},{label:'Kiosk loops…',action:()=>weOpenSettings('loops')}];
  if(name==='Help')return [
    {label:'Website & documentation ↗',action:()=>window.open('https://docs.pres-studio.com/','_blank','noopener,noreferrer')},
    {label:'Presentation gallery ↗',action:()=>window.open('https://gallery.pres-studio.com/','_blank','noopener,noreferrer')},null,
    emButton('Editor walkthrough…','lc-walkthrough-open'),emButton('About Presentation Studio…','app-menu-about'),null,
    {label:'Keyboard & menu help…',action:()=>{$('em-help-dialog').showModal();$('em-help-close').focus();}}];
  return [];
}
function emClose(restore=false){
  const active=emActive;emActive=null;
  delete $('full-editor').dataset.emMenuOpen;
  for(const menu of $('em-menubar').querySelectorAll('details[open]'))menu.open=false;
  for(const summary of $('em-menubar').querySelectorAll('summary'))summary.setAttribute('aria-expanded','false');
  mhQueue();
  if(restore)active?.querySelector('summary')?.focus({preventScroll:true});
}
function emHeadFocus(summary){
  for(const node of $('em-menubar').querySelectorAll(':scope > details > summary'))node.tabIndex=node===summary?0:-1;
  summary.focus({preventScroll:true});
}
function emPosition(menu){
  const summary=menu.querySelector(':scope > summary'),panel=menu.querySelector(':scope > .hub-menu-items'),rect=summary.getBoundingClientRect();
  panel.style.left=Math.max(8,Math.min(rect.left,innerWidth-panel.offsetWidth-8))+'px';
  panel.style.top=Math.max(8,Math.min(rect.bottom+3,innerHeight-panel.offsetHeight-8))+'px';
}
function emFocus(menu,last=false){const nodes=[...menu.querySelector(':scope > .hub-menu-items').querySelectorAll('button,summary')].filter(node=>node.checkVisibility()&&!node.disabled);(last?nodes.at(-1):nodes[0])?.focus({preventScroll:true});}
function emRender(panel,rows,back){
  panel.replaceChildren();
  if(back){const button=componentButton('‹ Back',()=>{});button.onclick=event=>{event.stopPropagation();back();};button.setAttribute('role','menuitem');panel.append(button);}
  for(const row of rows){
    if(!row){const separator=document.createElement('hr');separator.setAttribute('role','separator');panel.append(separator);continue;}
    const button=componentButton('',()=>{});button.setAttribute('role',row.checked===undefined?'menuitem':'menuitemcheckbox');
    if(row.checked!==undefined)button.setAttribute('aria-checked',String(row.checked));
    const label=document.createElement('span');label.textContent=row.label;button.append(label);
    if(row.children){const arrow=document.createElement('span');arrow.textContent='›';button.append(arrow);button.setAttribute('aria-haspopup','menu');button.setAttribute('aria-expanded','false');}
    button.disabled=!!row.disabled;button.title=row.reason||(row.disabled?'Unavailable for the current selection or editing mode.':'');
    if(row.danger)button.classList.add('em-danger');
    button.onclick=event=>{
      event.stopPropagation();
      if(emStamp!==cmStamp()){emClose(true);projectMessage('The selection or project changed. Open the menu again.');return;}
      if(row.children){const parent=[...panel.childNodes],menu=emActive;button.setAttribute('aria-expanded','true');emRender(panel,row.children,()=>{panel.replaceChildren(...parent);button.setAttribute('aria-expanded','false');button.focus();delete panel.dataset.emSubmenu;emPosition(menu);});panel.dataset.emSubmenu='true';emPosition(menu);emFocus(menu);return;}
      const origin=emOrigin;emClose();
      try{Promise.resolve(row.action?.()).catch(error=>projectMessage(error.message));}catch(error){projectMessage(error.message);}
      queueMicrotask(()=>{if(document.activeElement===document.body||!document.activeElement?.checkVisibility())(origin?.isConnected&&origin.checkVisibility()?origin:$('we-viewport')).focus({preventScroll:true});});
    };
    panel.append(button);
  }
  if(icSelection().locked){const note=document.createElement('p');note.className='em-menu-note';note.textContent='Locked or read-only. Unlock permitted objects in Layers.';panel.append(note);}
}
function emOpen(menu,focus=false,last=false){
  if(editingGestureBusy()||projectPlayback||boothActive)return;
  emOrigin=document.activeElement;
  if(emOrigin?.matches('input,textarea,select,[contenteditable="true"]'))emOrigin.blur();
  vbEnd(false);projectFlush();cmClose(false);
  emClose();emActive=menu;emStamp=cmStamp();$('full-editor').dataset.emMenuOpen='true';mhHide();
  if(menu.id!=='hub-project-menu')emRender(menu.querySelector(':scope > .hub-menu-items'),emRows(menu.dataset.emName));
  delete menu.querySelector(':scope > .hub-menu-items').dataset.emSubmenu;
  menu.open=true;menu.querySelector('summary').setAttribute('aria-expanded','true');emPosition(menu);if(focus)emFocus(menu,last);
}
const emPreviousInit=projectInit;
projectInit=function(...args){
  const result=emPreviousInit(...args);if(emReady||projectPlayback)return result;emReady=true;
  const top=document.querySelector('#full-editor .fe-top'),bar=document.createElement('nav');bar.id='em-menubar';bar.setAttribute('role','menubar');bar.setAttribute('aria-label','Editor commands');top.after(bar);
  for(const name of emNames){
    const menu=name==='File'?$('hub-project-menu'):document.createElement('details');menu.classList.add('hub-menu','em-menu');menu.dataset.emName=name;
    if(name!=='File'){menu.id='em-'+name.toLowerCase();menu.innerHTML='<summary></summary><div class="hub-menu-items" role="menu"></div>';}
    const summary=menu.querySelector(':scope > summary');summary.textContent=name;summary.tabIndex=name==='File'?0:-1;summary.setAttribute('role','menuitem');summary.setAttribute('aria-haspopup','menu');summary.setAttribute('aria-expanded','false');
    menu.querySelector(':scope > .hub-menu-items').setAttribute('role','menu');menu.querySelector(':scope > .hub-menu-items').setAttribute('aria-label',name+' commands');bar.append(menu);
    summary.addEventListener('click',event=>{event.preventDefault();emHeadFocus(summary);if(menu.open)emClose();else emOpen(menu,true);});
    summary.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse'&&emActive&&emActive!==menu)emOpen(menu);});
    menu.addEventListener('toggle',()=>{summary.setAttribute('aria-expanded',String(menu.open));if(menu.open)emPosition(menu);});
  }
  const toolbar=$('component-toolbar');bar.after(toolbar);toolbar.prepend($('fe-undo'),$('fe-redo'));$('component-open').textContent='Insert / Library';
  // Formatting buttons preserve text selection; history commands retain their
  // original header behavior and blur/commit a pending numeric field first.
  for(const id of ['fe-undo','fe-redo']){
    const button=$(id),historyAction=button.onclick;
    button.addEventListener('mousedown',event=>event.stopPropagation());
    button.onclick=event=>{vbEnd(false);return historyAction.call(button,event);};
  }
  // The title row carries identity and delivery. Values remain in the Inspector.
  $('fe-show').textContent='Present';
  for(const row of $('hub-project-menu').querySelectorAll('button'))row.setAttribute('role','menuitem');
  const settings=componentButton('Presentation settings…',()=>weOpenSettings('brand'));settings.setAttribute('role','menuitem');$('hub-project-menu').querySelector(':scope > .hub-menu-items').append(settings);
  const file=$('hub-project-menu'),exportSummary=$('hub-export-menu').querySelector('summary');exportSummary.setAttribute('role','menuitem');exportSummary.setAttribute('aria-haspopup','menu');exportSummary.setAttribute('aria-expanded','false');$('hub-export-menu').querySelector('.hub-menu-items').setAttribute('role','menu');
  $('hub-export-menu').addEventListener('toggle',()=>exportSummary.setAttribute('aria-expanded',String($('hub-export-menu').open)));
  file.addEventListener('click',event=>{
    if(emActive!==file||!file.open||!event.target.closest('button'))return;
    if(emStamp!==cmStamp()){event.preventDefault();event.stopImmediatePropagation();emClose(true);projectMessage('The selection or project changed. Open the menu again.');return;}
    // Keep the existing button as the action/focus origin until its handler runs.
    queueMicrotask(()=>{emClose();if(!document.activeElement?.checkVisibility())emHeadFocus(file.querySelector('summary'));});
  },true);
  // Retire only header duplication: Edit, Slide and the shared actions menu have parity.
  $('wp-selection-header').classList.add('em-selection-header');
  const help=document.createElement('dialog');help.id='em-help-dialog';help.setAttribute('aria-labelledby','em-help-title');help.innerHTML='<h2 id="em-help-title">Keyboard & menu help</h2><p>Press Alt+Shift+M to focus the editor menu bar. Left/Right moves between menus; Up/Down, Home/End move through commands. Enter or Space activates. Right opens a submenu; Left or Back returns. Escape closes and returns focus. Tab closes the menu and exits the menu bar in the chosen direction.</p><p>Ctrl/Cmd+Z undoes; Ctrl/Cmd+Shift+Z redoes. Native browser and text-editing shortcuts stay available. Shift+F10 opens actions for a focused object or Library card.</p><p>Commands with an ellipsis open existing controls. Inspector Content, Arrange and Style hold detailed values. File → Export → Editable ZIP is the complete portable backup.</p><button id="em-help-close">Back to editor</button>';$('full-editor').append(help);$('em-help-close').onclick=()=>help.close();help.addEventListener('close',()=>$('em-help').querySelector('summary').focus());
  document.addEventListener('pointerdown',event=>{if(emActive&&!bar.contains(event.target))emClose();},true);
  window.addEventListener('keydown',event=>{
    if(event.altKey&&event.shiftKey&&event.key.toLowerCase()==='m'&&$('full-editor').open&&!document.querySelector('dialog[open]:not(#full-editor)')){event.preventDefault();emHeadFocus(bar.querySelector('summary'));return;}
    if(!bar.contains(event.target))return;
    const menu=event.target.closest('.em-menu'),headings=[...bar.querySelectorAll(':scope > details > summary')],index=headings.indexOf(menu.querySelector(':scope > summary')),isHeading=headings.includes(event.target),panel=menu.querySelector(':scope > .hub-menu-items');
    if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();emClose(true);return;}
    if(event.key==='Tab'&&emActive){emHeadFocus(menu.querySelector(':scope > summary'));emClose();return;}
    if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){
      event.preventDefault();event.stopImmediatePropagation();if(isHeading){emOpen(menu,true,event.key==='ArrowUp'||event.key==='End');return;}
      const scope=event.target.closest('#hub-export-menu .hub-menu-items')||panel,nodes=[...scope.querySelectorAll('button,summary')].filter(node=>node.checkVisibility()&&!node.disabled),i=nodes.indexOf(document.activeElement),next=event.key==='Home'?0:event.key==='End'?nodes.length-1:(i+(event.key==='ArrowDown'?1:-1)+nodes.length)%nodes.length;nodes[next]?.focus();return;
    }
    if(event.key==='ArrowRight'&&!isHeading&&event.target.getAttribute('aria-haspopup')==='menu'){event.preventDefault();event.stopImmediatePropagation();if(event.target===exportSummary){$('hub-export-menu').open=true;$('hub-export-menu').querySelector('button')?.focus();}else event.target.click();return;}
    if(event.key==='ArrowLeft'&&event.target.closest('#hub-export-menu')){event.preventDefault();event.stopImmediatePropagation();$('hub-export-menu').open=false;exportSummary.focus();return;}
    if(event.key==='ArrowLeft'&&panel.dataset.emSubmenu){event.preventDefault();event.stopImmediatePropagation();panel.querySelector('button').click();return;}
    if(['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();event.stopImmediatePropagation();const next=headings[(index+(event.key==='ArrowRight'?1:-1)+headings.length)%headings.length];emHeadFocus(next);if(emActive)emOpen(next.parentElement,true);}
  },true);
  window.addEventListener('resize',()=>{if(emActive)emPosition(emActive);});bar.addEventListener('scroll',()=>{if(emActive)emPosition(emActive);});
  $('full-editor').addEventListener('close',()=>emClose());
  document.addEventListener('close',()=>mhQueue(),true);
  return result;
};
