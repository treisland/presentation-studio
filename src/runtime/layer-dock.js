// Navigator chrome only. Existing layer handlers and project metadata remain authoritative.
let ldReady = false, ldTab = 'slides';
function ldIcon(control, name) {
  const icon = workbenchIcon(name);
  if (typeof icon === 'string') control.innerHTML = icon;
  else control.replaceChildren(icon);
  for (const svg of control.querySelectorAll('svg')) {
    svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false');
  }
}
function ldChoose(name, focus = false) {
  if (!ldReady) return;
  ldTab = name;
  for (const key of ['slides', 'layers']) {
    const tab = $(key === 'layers' ? 'wp-tab-layers' : 'ld-tab-slides');
    tab.setAttribute('aria-selected', String(name === key)); tab.tabIndex = name === key ? 0 : -1;
    $(key === 'layers' ? 'sp-layer-panel' : 'ld-slides-pane').hidden = name !== key;
  }
  $('we-slides').dataset.ldTab = name;
  if (focus) $(name === 'layers' ? 'wp-tab-layers' : 'ld-tab-slides').focus();
}
function ldOpen(focus = false) {
  if (!ldReady) return;
  wbPanelChoices.slides = true;
  wePanels.slides.open = true;
  if (innerWidth < 760) wePanels.inspector.open = false;
  wePanelView(); ldChoose('layers', focus);
}
const ldInspectorTab = wpChooseTab;
wpChooseTab = function(name, focus = false) {
  // Handle this before the inspector's wpNames guard: Layers is no longer a right tab.
  if (name === 'layers') { ldOpen(focus); return; }
  return ldInspectorTab(name, focus);
};
function ldRename(key) {
  const entry = spEntries().find(item => item.key === key);
  if (!entry || spProtected(entry) || !weEditing() || vbMode !== 'edit' || ceLocked()) return;
  const row = [...$('sp-layers').querySelectorAll('.sp-layer-row')].find(item => item.dataset.key === key);
  if (!row || row.querySelector('.ld-inline-name')) return;
  const snapshot = studioEditing.read(), slideId = projectSelected, choose = row.querySelector('button');
  const input = document.createElement('input'); input.type = 'text'; input.maxLength = 80;
  input.className = 'ld-inline-name'; input.value = enLabel(entry);
  input.setAttribute('aria-label', 'Rename ' + enLabel(entry));
  input.title = 'Enter saves; Escape cancels';
  choose.hidden = true; choose.after(input); row.draggable = false;
  let finished = false;
  const finish = (commit, restoreFocus = true) => {
    if (finished) return; finished = true;
    const current = studioEditing.read(), fresh = spEntries().find(item => item.key === key);
    const valid = input.isConnected && current.projectId === snapshot.projectId && projectSelected === slideId && current.revision === snapshot.revision;
    const name = input.value.trim(); input.remove(); choose.hidden = false;
    row.draggable = weEditing() && vbMode === 'edit' && !ceLocked() && !spProtected(entry) && !(entry.media?.layout === 'background' && !entry.media.canvas?.placement);
    if (commit && valid && fresh && !spProtected(fresh) && weEditing() && vbMode === 'edit' && !ceLocked() && name !== enLabel(fresh)) {
      const result = studioEditing.apply({apiVersion:1, projectId:snapshot.projectId, expectedRevision:snapshot.revision,
        operations:[{slideId, type:'element.rename', keys:[key], name:name || null}]});
      if (!result.ok) projectMessage(result.message);
      spPaint(); componentPaint();
    }
    if (valid && restoreFocus) [...$('sp-layers').querySelectorAll('.sp-layer-row')].find(item => item.dataset.key === key)?.querySelector('button')?.focus();
  };
  input.onkeydown = event => {
    event.stopPropagation();
    if (event.isComposing) return;
    if (event.key === 'Enter' || event.key === 'Escape') { event.preventDefault(); finish(event.key === 'Enter'); }
  };
  input.onblur = () => finish(false, false);
  input.onclick = event => event.stopPropagation();
  input.focus(); input.select();
}
function ldPaint() {
  if (!ldReady || !projectReady) return;
  const entries = spEntries(), keys = spActiveKeys();
  let visible = 0;
  for (const row of $('sp-layers').querySelectorAll('.sp-layer-row')) {
    const entry = entries.find(item => item.key === row.dataset.key); if (!entry) continue;
    if (!row.hidden) visible++;
    const buttons = [...row.querySelectorAll('button')], [choose, hide, lock, up, down] = buttons;
    if (!choose) continue;
    const concealed = visibilityEntryHidden(projectState, projectSelected, entry);
    const ownLock = !!entry.meta.locked || !!entry.media?.canvas?.locked;
    row.dataset.hidden = String(concealed); row.dataset.locked = String(spProtected(entry));
    if (!choose.querySelector('.ld-name')) {
      const preview = choose.querySelector('.en-preview'), name = document.createElement('span');
      name.className = 'ld-name'; name.textContent = enLabel(entry);
      const type = document.createElement('span'); type.className = 'ld-type';
      const icons = {Text:'text', Card:'card', Section:'card', Image:'image', Video:'image', Table:'table', Code:'code', Grid:'table'};
      ldIcon(type, icons[entry.type] || 'shape');
      const text = document.createElement('span'); text.className = 'ld-row-text';
      text.append(name); if (preview) text.append(preview);
      choose.replaceChildren(type, text); choose.classList.add('ld-choose');
      const select = choose.onclick;
      choose.onclick = event => {
        if (event.detail > 1) { ldRename(entry.key); return; }
        return select.call(choose, event);
      };
      choose.ondblclick = event => { event.preventDefault(); ldRename(entry.key); };
      choose.onkeydown = event => {
        if (event.key === 'F2') { event.preventDefault(); event.stopPropagation(); ldRename(entry.key); }
      };
      choose.setAttribute('aria-keyshortcuts', 'F2');
    }
    choose.title = entry.type + ': ' + enLabel(entry) + (entry.preview ? '\n' + entry.preview : '');
    const actions = [[hide, concealed ? 'eyeOff' : 'eye', concealed], [lock, ownLock ? 'lock' : 'unlock', ownLock], [up, 'arrowUp'], [down, 'arrowDown']];
    for (const [button, icon, pressed] of actions) if (button) {
      if (button.dataset.ldIcon !== icon) { ldIcon(button, icon); button.dataset.ldIcon = icon; }
      button.classList.add('ld-icon-action'); button.title = button.getAttribute('aria-label');
      if (pressed !== undefined) {
        button.removeAttribute('aria-pressed');
        button.dataset.ldState = button === hide ? (pressed ? 'hidden' : 'visible') : (pressed ? 'locked' : 'unlocked');
      }
    }
    up?.classList.add('ld-reorder'); down?.classList.add('ld-reorder');
    hide?.setAttribute('aria-label', (concealed ? 'Show ' : 'Hide ') + enLabel(entry));
    lock?.setAttribute('aria-label', (ownLock ? 'Unlock ' : 'Lock ') + enLabel(entry));
    if (hide) hide.title = hide.getAttribute('aria-label');
    if (lock) lock.title = lock.getAttribute('aria-label');
    let status = row.querySelector('.ld-state');
    if (!status) { status = document.createElement('small'); status.className = 'ld-state'; row.append(status); }
    status.textContent = [concealed && 'Hidden', spProtected(entry) && 'Locked'].filter(Boolean).join(' · ');
    // The old Hidden marker is represented by the combined, explicit state label.
    for (const child of [...row.children]) if (child.tagName === 'SMALL' && child !== status) child.remove();
  }
  const count = entries.filter(entry => keys.includes(entry.key)).length;
  $('ld-selection-count').textContent = count ? count + (count === 1 ? ' layer selected' : ' layers selected') : 'No layers selected';
  $('ld-search-status').textContent = visible + ' of ' + entries.length + ' layers';
  $('ld-reset-name').disabled = $('sp-name').disabled;
  const selectedRow = count === 1 ? [...$('sp-layers').querySelectorAll('.sp-layer-row')].find(row => keys.includes(row.dataset.key)) : null;
  for (const [id, index] of [['ld-move-forward', 3], ['ld-move-backward', 4]]) {
    const source = selectedRow?.querySelectorAll('button')[index];
    $(id).disabled = !source || source.disabled;
    // Delegate to the existing guarded reorder handler, including its current key.
    $(id).onclick = () => source?.click();
  }
  ldChoose(ldTab);
}
const ldLayersPaint = spPaint;
spPaint = function(...args) { const result = ldLayersPaint(...args); ldPaint(); return result; };
const ldInit = projectInit;
projectInit = function(...args) {
  const result = ldInit(...args); if (ldReady) return result;
  const navigator = $('we-slides'), layers = $('sp-layer-panel'), tab = $('wp-tab-layers');
  const pane = document.createElement('div'); pane.id = 'ld-slides-pane';
  pane.setAttribute('role', 'tabpanel'); pane.setAttribute('aria-labelledby', 'ld-tab-slides');
  pane.append(...navigator.childNodes); navigator.append(pane);
  const tabs = document.createElement('nav'); tabs.id = 'ld-tabs'; tabs.setAttribute('role', 'tablist'); tabs.setAttribute('aria-label', 'Slide navigator');
  const slides = spButton('Slides', () => ldChoose('slides')); slides.id = 'ld-tab-slides';
  slides.setAttribute('role', 'tab'); slides.setAttribute('aria-controls', pane.id);
  tab.setAttribute('aria-controls', layers.id); tab.onclick = () => wpChooseTab('layers');
  tabs.append(slides, tab); navigator.prepend(tabs);
  delete wpNames.layers;
  if (wpTab === 'layers') wpTab = 'content';
  delete layers.dataset.wpPart;
  layers.setAttribute('role', 'tabpanel'); layers.setAttribute('aria-labelledby', tab.id);
  navigator.append(layers);
  tabs.onkeydown = event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault(); event.stopPropagation();
    ldChoose(event.key === 'Home' ? 'slides' : event.key === 'End' ? 'layers' : ldTab === 'slides' ? 'layers' : 'slides', true);
  };
  const heading = layers.querySelector('h3'); heading.hidden = true;
  const intro = layers.querySelector('p'); intro.textContent = 'Frontmost first';
  intro.title = 'Select a row to inspect it; check boxes for a batch selection. Alt+Up/Down reorders a focused layer.';
  const count = document.createElement('p'); count.id = 'ld-selection-count'; count.setAttribute('role', 'status');
  const searchStatus = document.createElement('small'); searchStatus.id = 'ld-search-status'; searchStatus.setAttribute('role', 'status');
  $('en-search').setAttribute('aria-describedby', searchStatus.id);
  $('sp-layers').before(count, searchStatus);
  const options = document.createElement('details'); options.id = 'ld-options';
  const summary = document.createElement('summary'); summary.textContent = 'Layer options'; options.append(summary);
  const help = document.createElement('p');
  help.textContent = 'Select a row to inspect it; check boxes to style several layers. F2 or double-click a name to rename; Enter saves and Escape cancels. Alt+Up/Down reorders a focused layer one step.';
  options.append(help);
  const name = $('sp-name'), reset = name.nextElementSibling;
  options.append(name.closest('label'));
  if (reset?.tagName === 'BUTTON') { reset.id = 'ld-reset-name'; options.append(reset); }
  const reorder = document.createElement('div'); reorder.className = 'ld-reorder-options';
  for (const [direction, icon] of [['forward', 'arrowUp'], ['backward', 'arrowDown']]) {
    const button = spButton('', () => {}, 'Move selected layer ' + direction);
    button.id = 'ld-move-' + direction; button.title = button.getAttribute('aria-label');
    ldIcon(button, icon); reorder.append(button);
  }
  options.append(reorder);
  options.append($('sp-delete-selection')); layers.append(options);
  const visibility = document.createElement('div'); visibility.id = 'ld-visibility';
  options.append($('visibility-hide').parentElement);
  visibility.append($('visibility-show-hidden').closest('label'));
  layers.append(visibility);
  // Leave inherited slide chrome settings in Content, rather than moving their panel.
  $('visibility-panel').dataset.wpPart = 'content';
  const reveal = spButton('Layers', () => wpChooseTab('layers', true), 'Reveal Layers panel');
  reveal.id = 'ld-reveal-layers'; reveal.title = 'Reveal Layers panel'; reveal.setAttribute('aria-controls', layers.id);
  document.querySelector('.wp-rail-slides').append(reveal);
  ldReady = true; ldChoose('slides'); wpChooseTab(wpTab); ldPaint();
  return result;
};
