// Shared action chrome only. Existing buttons, guards, focus and transactions remain authoritative.
let acReady = false, acTooltip, acOwner = null, acHover = null, acFocus = null;
let acOpenTimer, acCloseTimer, acOverTip = false;
function acButton(button, icon, label, labeled = false) {
  if (!button) return;
  label ||= button.querySelector('.ac-label')?.textContent || button.textContent.trim();
  if (button.dataset.acIcon !== icon || button.querySelector('.ac-label')?.textContent !== label) {
    const text = document.createElement('span'); text.className = 'ac-label'; text.textContent = label;
    button.replaceChildren(workbenchIcon(icon), text); button.dataset.acIcon = icon;
  }
  button.classList.add('ac-action'); button.classList.toggle('ac-icon-only', !labeled);
  button.classList.toggle('ac-danger', icon === 'trash');
  button.setAttribute('aria-label', label); button.dataset.acTooltip = label;
  // The shared tooltip handles focus and disabled hover too; avoid a competing native tooltip.
  button.removeAttribute('title');
}
function acPaint() {
  if (!acReady) return;
  for (const [id,icon,label,labeled] of [
    ['fe-undo','undo','Undo'], ['fe-redo','redo','Redo'],
    ['fe-duplicate','duplicate','Duplicate slide'], ['fe-trash-slide','trash','Delete slide'],
    ['fe-up','arrowUp','Move selected slide up'], ['fe-down','arrowDown','Move selected slide down'],
    ['wp-duplicate','duplicate'], ['wp-delete','trash'], ['db-duplicate','duplicate','Duplicate block'],
    ['db-remove','trash'], ['vb-duplicate','duplicate','Duplicate block'], ['vb-delete','trash'],
    ['component-more-trigger','more','More actions'],
    ['vb-edit-mode','edit','Edit blocks',true], ['vb-preview-mode','preview','Preview',true]
  ]) acButton($(id),icon,label,labeled);
  for (const button of document.querySelectorAll('.wp-slide-actions button')) {
    const remove = button.dataset.control === 'fe-trash-slide';
    acButton(button,remove?'trash':'duplicate',button.getAttribute('aria-label'));
  }
  for (const button of document.querySelectorAll('.ld-icon-action,.ld-reorder-options button')) {
    button.dataset.acTooltip = button.getAttribute('aria-label') || button.title;
    button.removeAttribute('title');
  }
  if (acOwner) acPosition();
}
function acDescription(button, add) {
  const ids = new Set((button.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean));
  if (add) ids.add('ac-tooltip'); else ids.delete('ac-tooltip');
  if (ids.size) button.setAttribute('aria-describedby',[...ids].join(' ')); else button.removeAttribute('aria-describedby');
}
function acHide() {
  clearTimeout(acOpenTimer); clearTimeout(acCloseTimer);
  if (acOwner) acDescription(acOwner,false);
  acOwner = null; acOverTip = false;
  if (acTooltip?.matches(':popover-open')) acTooltip.hidePopover();
}
function acPosition() {
  if (!acOwner?.isConnected || !acOwner.checkVisibility() || !$('full-editor').open) { acHide(); return; }
  let text = acOwner.dataset.acTooltip;
  if (acOwner.disabled) {
    text += acOwner.id === 'fe-undo' ? (projectDraftPending ? ' — Recovery is loading' : ' — Nothing to undo') :
      acOwner.id === 'fe-redo' ? (projectDraftPending ? ' — Recovery is loading' : ' — Nothing to redo') : ' — Unavailable for this selection or editing mode';
  }
  acTooltip.textContent = text;
  if (!acTooltip.matches(':popover-open')) return;
  const rect = acOwner.getBoundingClientRect(), tip = acTooltip.getBoundingClientRect();
  acTooltip.style.left = Math.max(8,Math.min(innerWidth-tip.width-8,rect.left+(rect.width-tip.width)/2))+'px';
  acTooltip.style.top = Math.max(8,rect.bottom+tip.height+14<=innerHeight ? rect.bottom+7 : rect.top-tip.height-7)+'px';
}
function acShow(button, delay = 350) {
  clearTimeout(acOpenTimer); clearTimeout(acCloseTimer);
  if (!button || !button.checkVisibility()) { acHide(); return; }
  if (acOwner === button && acTooltip.matches(':popover-open')) { acPosition(); return; }
  acHide(); acOwner = button;
  acOpenTimer = setTimeout(() => {
    if (acOwner !== button || !button.isConnected || !button.checkVisibility() || !$('full-editor').open) { acHide(); return; }
    acPosition(); acTooltip.showPopover(); acPosition(); acDescription(button,true);
  },delay);
}
function acLeave() {
  clearTimeout(acCloseTimer);
  acCloseTimer = setTimeout(() => {
    if (acOverTip) return;
    const next = acHover || acFocus;
    if (next) acShow(next,0); else acHide();
  },120);
}
function acTarget(node) { return node instanceof Element ? node.closest('#full-editor [data-ac-tooltip]') : null; }
function acInstall() {
  if (acReady) return;
  acTooltip = document.createElement('div'); acTooltip.id = 'ac-tooltip';
  acTooltip.setAttribute('popover','manual'); acTooltip.setAttribute('role','tooltip');
  $('full-editor').append(acTooltip);
  acTooltip.addEventListener('pointerenter',()=>{acOverTip=true;clearTimeout(acCloseTimer);});
  acTooltip.addEventListener('pointerleave',()=>{acOverTip=false;acLeave();});
  document.addEventListener('pointerover',event=>{
    const button=acTarget(event.target);if (!button || button.contains(event.relatedTarget)) return;
    acHover=button;acShow(button);
  });
  document.addEventListener('pointerout',event=>{
    const button=acTarget(event.target);if (!button || button.contains(event.relatedTarget)) return;
    if(acHover===button)acHover=null;acLeave();
  });
  document.addEventListener('focusin',event=>{acFocus=acTarget(event.target);if(acFocus)acShow(acFocus,0);else acLeave();});
  document.addEventListener('focusout',event=>{if(acTarget(event.target)===acFocus)acFocus=null;acLeave();});
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape' && acOwner && acTooltip.matches(':popover-open')) {
      event.preventDefault();event.stopPropagation();acHide();
    }
  },true);
  document.addEventListener('click',()=>acHide(),true);
  document.addEventListener('scroll',()=>{
    // Focus can itself scroll a control into view after focusin. Keep that tooltip attached.
    if(acFocus===acOwner && document.activeElement===acFocus)acPosition();else acHide();
  },true);
  window.addEventListener('resize',()=>{
    if(acOwner && acFocus===acOwner && document.activeElement===acFocus)acPosition();else acHide();
  });
  window.addEventListener('blur',acHide);
  $('full-editor').addEventListener('close',()=>{acHover=null;acFocus=null;acHide();});
  // Selection grips are manual popovers too; repainting them must not dismiss a focused tooltip.
  $('full-editor').addEventListener('toggle',event=>{if(event.target.getAttribute('popover')!=='manual')acHide();},true);
  acReady=true;acPaint();
}
const acInit=projectInit;
projectInit=function(...args){const result=acInit(...args);acInstall();return result;};
const acWorkspacePaint=wpPaint;
wpPaint=function(...args){const result=acWorkspacePaint(...args);acPaint();return result;};
const acBlockToolbar=vbToolbar;
vbToolbar=function(...args){const result=acBlockToolbar(...args);acPaint();return result;};
const acLayers=spPaint;
spPaint=function(...args){const result=acLayers(...args);acPaint();return result;};
const acList=projectList;
projectList=function(...args){const result=acList(...args);acPaint();return result;};
const acStatus=projectStatus;
projectStatus=function(...args){const result=acStatus(...args);if(acOwner)acPosition();return result;};
