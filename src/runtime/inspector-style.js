// Compact chrome over the existing precision controls; project edits remain in spRun.
let isReady = false, isTarget = '', isOpener = null;
const isRoleNames = {background:'Background',surface:'Surface',ink:'Text',muted:'Muted text',accent:'Accent',accentInk:'Text on accent',border:'Border',secondary:'Secondary'};
function isStamp() {
  return JSON.stringify([icSelection().identity, spActiveKeys(), $('sp-slot').value, studioEditing.read().revision]);
}
function isClose(restore = false) {
  const popup = $('is-color-popover');
  if (popup?.matches(':popover-open')) popup.hidePopover();
  isTarget = '';
  for (const button of document.querySelectorAll('[data-is-slot]')) button.setAttribute('aria-expanded','false');
  if (restore && isOpener?.isConnected && !isOpener.hidden) isOpener.focus({preventScroll:true});
}
function isTab(name, focus = false) {
  for (const tab of document.querySelectorAll('[data-is-tab]')) {
    const active = tab.dataset.isTab === name;
    tab.setAttribute('aria-selected',String(active)); tab.tabIndex = active ? 0 : -1;
    $('is-panel-'+tab.dataset.isTab).hidden = !active;
    if (active && focus) tab.focus();
  }
}
function isOpen(slot = $('sp-slot').value) {
  if (!isReady) return;
  isClose();
  $('sp-slot').value = slot;
  spPaint();
  isOpener = document.querySelector('[data-is-slot="'+$('sp-slot').value+'"]');
  isTarget = isStamp();
  const label = isOpener.querySelector('.is-row-label').textContent;
  $('is-color-title').textContent = label+' color';
  isTab('theme');
  $('is-color-popover').showPopover();
  const popup = $('is-color-popover'), anchor = isOpener.getBoundingClientRect(), bounds = popup.getBoundingClientRect();
  popup.style.left = Math.max(12,Math.min(anchor.left-bounds.width-12,innerWidth-bounds.width-12))+'px';
  popup.style.top = Math.max(12,Math.min(anchor.top,innerHeight-bounds.height-12))+'px';
  popup.style.right = 'auto';
  isOpener.setAttribute('aria-expanded','true');
  $('is-tab-theme').focus();
}
function isSummary(value) {
  if (value === 'mixed') return 'Mixed';
  if (value === 'transparent') return 'Transparent';
  if (!value) return 'Inherited';
  const name = value.role ? 'Theme · '+(isRoleNames[value.role] || value.role) : value.hex;
  return name+(value.opacity != null && value.opacity !== 1 ? ' · '+Math.round(value.opacity*100)+'%' : '');
}
function isPaint() {
  if (!isReady) return;
  const context = icSelection(), keys = spActiveKeys(), selected = spEntries().filter(entry=>keys.includes(entry.key));
  $('sp-selection').textContent = selected.length === 1 ? enLabel(selected[0]) : selected.length ? selected.length+' selected' : 'Slide background';
  const palette = studioPalette(projectState.brand);
  for (const button of document.querySelectorAll('[data-is-slot]')) {
    const slot = button.dataset.isSlot;
    button.hidden = slot === 'background' ? !!selected.length : !selected.length;
    const value = selected.length ? spCommon(selected,entry=>entry.meta.style?.[slot]??null) : spData().background??null;
    const summary = isSummary(value);
    button.querySelector('.is-row-value').textContent = summary;
    const swatch = button.querySelector('.is-row-swatch');
    let inherited = slot === 'background' ? palette.background : null;
    if (value == null && selected.length) {
      const canvas = projectPreviewNode?.querySelector('.slide'), element = canvas && spElement(canvas,selected[0]);
      if (element) inherited = getComputedStyle(element)[{text:'color',fill:'backgroundColor',border:'borderTopColor'}[slot]];
    }
    swatch.style.setProperty('--is-color',value?.hex || palette[value?.role] || inherited || 'transparent');
    swatch.dataset.inherited = String(value == null);
    swatch.dataset.mixed = String(value === 'mixed');
    button.setAttribute('aria-label',button.querySelector('.is-row-label').textContent+': '+summary+(context.locked?' · Locked / read-only':''));
  }
  $('is-scope').textContent = (context.locked ? 'Locked / read-only. ' : '') + (!selected.length ? 'Slide background only.' : context.path && context.path.includes('.') ? 'Nested text selected. Shared appearance styles the whole root element; use the text tools for inline formatting.' : selected.length > 1 ? selected.length+' whole elements · shared appearance.' : 'Whole element · shared appearance.');
  $('sp-opacity').disabled = context.locked;
  for (const button of $('sp-swatches').querySelectorAll('button')) {
    const role = button.getAttribute('aria-label')?.replace(/^Theme /,'');
    if (isRoleNames[role]) {button.textContent = isRoleNames[role]; button.title = 'Theme '+isRoleNames[role];}
  }
}
const isPreviousPaint = spPaint;
spPaint = function(...args) {
  const popup = isReady && $('is-color-popover'), open = popup && popup.matches(':popover-open');
  const hadFocus = open && popup.contains(document.activeElement);
  const same = open && isTarget === isStamp();
  const draft = same ? ['sp-hex','sp-color-picker','sp-opacity','sp-swatch-name'].map(id=>[id,$(id).value,$(id).getAttribute('aria-invalid')]) : null;
  const result = isPreviousPaint(...args);
  if (open && (!same || isTarget !== isStamp())) isClose(hadFocus);
  else if (draft) for (const [id,value,invalid] of draft) {$(id).value=value;if(invalid===null)$(id).removeAttribute('aria-invalid');else $(id).setAttribute('aria-invalid',invalid);}
  isPaint();
  return result;
};
const isPreviousInit = projectInit;
projectInit = function(...args) {
  const result = isPreviousInit(...args);
  if (isReady) return result;
  const style = $('sp-style'); style.classList.add('is-style');
  style.querySelector('h3').textContent = 'Style';
  $('sp-slot').closest('label').classList.add('is-legacy-target');
  const scope = document.createElement('p');scope.id='is-scope';scope.setAttribute('role','status');
  const rows = document.createElement('div');rows.id='is-rows';
  for (const [slot,label,icon] of [['text','Text','text'],['fill','Fill','shape'],['border','Border','card'],['background','Slide background','card']]) {
    const button = spButton('',()=>isOpen(slot));button.id='is-color-'+slot;button.dataset.isSlot=slot;
    button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-controls','is-color-popover');button.setAttribute('aria-expanded','false');
    if (typeof workbenchIcon === 'function') button.append(workbenchIcon(icon));
    for (const [name,text] of [['label',label],['swatch',''],['value','']]) {const span=document.createElement('span');span.className='is-row-'+name;span.textContent=text;if(name==='swatch')span.setAttribute('aria-hidden','true');button.append(span);}
    if (typeof workbenchIcon === 'function') button.append(workbenchIcon('chevron'));
    rows.append(button);
  }
  $('sp-selection').after(scope,rows);
  const popup = document.createElement('div');popup.id='is-color-popover';popup.setAttribute('popover','auto');popup.setAttribute('role','dialog');popup.setAttribute('aria-labelledby','is-color-title');
  const header=document.createElement('header'),title=document.createElement('strong');title.id='is-color-title';
  const close=spButton('Close',()=>isClose(true),'Close color picker');if(typeof workbenchIcon==='function')close.replaceChildren(workbenchIcon('close'));header.append(title,close);popup.append(header);
  const tabs=document.createElement('div');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Color source');popup.append(tabs);
  for (const name of ['theme','custom','project']) {
    const tab=spButton(name[0].toUpperCase()+name.slice(1),()=>isTab(name));tab.id='is-tab-'+name;tab.dataset.isTab=name;tab.setAttribute('role','tab');tab.setAttribute('aria-controls','is-panel-'+name);tabs.append(tab);
    const panel=document.createElement('div');panel.id='is-panel-'+name;panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',tab.id);popup.append(panel);
    tab.onkeydown=event=>{const names=['theme','custom','project'],index=names.indexOf(name);if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();isTab(event.key==='Home'?'theme':event.key==='End'?'project':names[(index+(event.key==='ArrowRight'?1:2))%3],true);}};
  }
  $('full-editor').append(popup);
  $('is-panel-theme').append($('sp-swatches'));
  $('is-panel-custom').append($('sp-hex').closest('.sp-custom-color'),$('sp-custom'));
  const projectHeading=$('sp-project-colors').previousElementSibling;
  if(projectHeading?.tagName==='H4')projectHeading.remove();
  $('is-panel-project').append($('sp-project-colors'),$('sp-swatch-name').closest('label'),$('sp-save-color'));
  const common=document.createElement('div');common.className='is-color-common';
  common.append($('sp-value'),$('sp-opacity').closest('label'),$('sp-inherit'),$('sp-transparent'),$('sp-contrast'));popup.append(common);
  $('sp-inherit').textContent='Reset to theme';$('sp-inherit').setAttribute('aria-label','Reset this color target to theme');
  for(const actions of style.querySelectorAll('.sp-actions'))if(!actions.children.length)actions.remove();
  const compact=document.createElement('div');compact.className='is-style-tools';
  compact.append($('sp-border-width').closest('label'),$('sp-preset').closest('label'),$('sp-copy'),$('sp-paste'));style.append(compact);
  popup.addEventListener('keydown',event=>{if(event.key==='Escape'&&!event.defaultPrevented){event.preventDefault();event.stopPropagation();isClose(true);}});
  // Guard every relocated mutation before its original handler can run.
  for(const type of ['click','change','input'])popup.addEventListener(type,event=>{
    if(isTarget && isTarget!==isStamp()){event.preventDefault();event.stopImmediatePropagation();isClose(true);spPaint();}
  },true);
  popup.addEventListener('toggle',()=>{if(!popup.matches(':popover-open')){isTarget='';for(const row of rows.children)row.setAttribute('aria-expanded','false');}});
  window.addEventListener('resize',()=>isClose(popup.contains(document.activeElement)));
  isReady=true;isTab('theme');isPaint();
  return result;
};
