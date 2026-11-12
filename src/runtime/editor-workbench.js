let wbReady = false;
const wbPanelChoices = { slides: false, inspector: false, inspectorWidth: false };
function wbToolbarLayout() {
  if (!wbReady) return;
  const toolbar = $('component-toolbar'), more = $('component-more-popover'), view = $('we-view-tools');
  const focused = document.activeElement;
  const optional = ['component-arrange-trigger', 'component-text-trigger', 'component-media-trigger', 'wb-customize', 'component-colors-trigger'];
  for (const id of optional) if ($(id).parentElement !== toolbar) view.before($(id));
  for (const id of optional) {
    if (toolbar.scrollWidth <= toolbar.clientWidth + 1) break;
    const control = $(id);
    if (!control.hidden) more.prepend(control);
  }
  view.classList.toggle('component-view-compact', toolbar.clientWidth < 350);
  if (focused?.isConnected && focused !== document.activeElement && focused.checkVisibility()) focused.focus({preventScroll:true});
}
function wbResponsive() {
  if (!wbReady) return;
  if (!wbPanelChoices.slides) wePanels.slides.open = innerWidth >= 1200;
  if (!wbPanelChoices.inspector) wePanels.inspector.open = innerWidth >= 760;
  if (!wbPanelChoices.inspectorWidth) wePanels.inspector.width = innerWidth < 1200 ? 260 : 300;
  wePanelView();
}
function wbPaint() {
  if (!wbReady) return;
  $('wb-snap').setAttribute('aria-pressed', String(spSnapEnabled));
  $('wb-snap').disabled = !weEditing();
  const customize = $('tp-customize');
  $('wb-customize').hidden = !customize || customize.hidden || $('tp-panel').hidden;
  $('wb-customize').disabled = customize?.disabled ?? true;
  $('wb-export').disabled = !weEditing();
  $('wb-arrange-fields').hidden = $('db-arrange').hidden || $('db-arrange').dataset.icVisible === 'false';
  $('full-editor').dataset.wbSelection = icSelection().kind;
  $('full-editor').style.setProperty('--wb-settings-left', wePanels.slides.open ? wePanels.slides.width + 48 + 'px' : '16px');
  for (const name of ['slides', 'inspector']) {
    const resize = $('wb-resize-' + name);
    resize.setAttribute('aria-valuenow', String(wePanels[name].width));
    resize.setAttribute('aria-valuetext', wePanels[name].width + ' pixels');
    resize.hidden = !wePanels[name].open;
  }
  wbToolbarLayout();
}
const wbComponentPaint = componentPaint;
componentPaint = function(...args) { const result = wbComponentPaint(...args); wbToolbarLayout(); return result; };
const wbContextPaint = icPaint;
icPaint = function(...args) { const result = wbContextPaint(...args); wbPaint(); return result; };
const wbPanelView = wePanelView;
wePanelView = function(...args) { const result = wbPanelView(...args); wbPaint(); return result; };
function wbResizeHandle(name) {
  const panel = wePanels[name], handle = document.createElement('div');
  handle.id = 'wb-resize-' + name; handle.className = 'wb-panel-resize'; handle.tabIndex = 0;
  handle.setAttribute('role', 'separator'); handle.setAttribute('aria-orientation', 'vertical');
  handle.setAttribute('aria-label', 'Resize ' + (name === 'slides' ? 'Slides' : 'Inspector') + ' panel');
  handle.setAttribute('aria-controls', 'we-' + name);
  handle.setAttribute('aria-valuemin', String(panel.min)); handle.setAttribute('aria-valuemax', String(panel.max));
  const apply = width => {
    if (name === 'inspector') wbPanelChoices.inspectorWidth = true;
    const input = $('we-size-' + name);
    input.value = Math.max(panel.min, Math.min(panel.max, width));
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };
  let drag = null;
  handle.onpointerdown = event => {
    if (event.button !== 0) return;
    event.preventDefault(); event.stopPropagation(); handle.focus();
    drag = { pointer: event.pointerId, start: event.clientX, width: panel.width };
    handle.setPointerCapture(event.pointerId);
  };
  handle.onpointermove = event => {
    if (drag?.pointer === event.pointerId) apply(drag.width + (event.clientX - drag.start) * (name === 'slides' ? 1 : -1));
  };
  const finish = cancelled => {
    if (!drag) return;
    const current = drag; drag = null;
    if (cancelled) apply(current.width);
    if (handle.hasPointerCapture(current.pointer)) handle.releasePointerCapture(current.pointer);
  };
  handle.onpointerup = () => finish(false);
  handle.onpointercancel = () => finish(true);
  handle.onlostpointercapture = () => finish(true);
  handle.onkeydown = event => {
    if (event.key === 'Escape' && drag) { event.preventDefault(); finish(true); return; }
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault(); event.stopPropagation();
    const direction = (event.key === 'ArrowRight' ? 1 : -1) * (name === 'slides' ? 1 : -1);
    apply(event.key === 'Home' ? panel.min : event.key === 'End' ? panel.max : panel.width + direction * (event.shiftKey ? 40 : 10));
  };
  document.querySelector('.wp-rail-' + name).append(handle);
}
const wbInit = projectInit;
projectInit = function(...args) {
  const result = wbInit(...args);
  const top = document.querySelector('#full-editor .fe-top'), identity = $('fe-title').parentElement;
  identity.id = 'wb-document';
  const brand = document.createElement('strong'); brand.id = 'wb-brand'; brand.textContent = 'Presentation Studio';
  top.prepend(brand);
  $('ic-slide-settings').textContent = '← Slide';
  $('ic-slide-settings').setAttribute('aria-label', 'Slide settings');
  const arrangeFields = document.createElement('section'); arrangeFields.id = 'wb-arrange-fields'; arrangeFields.dataset.wpPart = 'arrange';
  const arrangeTitle = document.createElement('h3'); arrangeTitle.textContent = 'Position and size';
  arrangeFields.append(arrangeTitle, $('db-arrange')); $('wp-fields').prepend(arrangeFields);
  const exportButton = document.createElement('button'); exportButton.id = 'wb-export'; exportButton.textContent = 'Export';
  exportButton.title = 'Download a complete editable ZIP'; exportButton.onclick = () => $('fe-export').click();
  $('fe-show').before(exportButton);
  const snap = document.createElement('button'); snap.id = 'wb-snap'; snap.textContent = 'Snap';
  snap.title = 'Snap to alignment and equal spacing; hold Alt while dragging to bypass';
  snap.onclick = () => { $('sp-snap').click(); wbPaint(); };
  $('sp-snap').addEventListener('change', wbPaint);
  const customize = document.createElement('button'); customize.id = 'wb-customize'; customize.textContent = 'Enable free positioning';
  customize.title = 'Move this item independently of its layout. Reset to template position restores its layout.';customize.setAttribute('aria-describedby','tp-status');
  customize.onclick = () => { $('component-more-popover').hidePopover(); $('tp-customize').click(); wbPaint(); };
  $('component-more-trigger').after(snap, customize);
  $('we-viewport').append($('component-overflow'));
  const clear = document.querySelector('.component-library-search button');
  const clearState = () => { clear.disabled = !$('component-search').value; };
  $('component-search').addEventListener('input', clearState); clear.addEventListener('click', clearState);
  const list = componentList;
  componentList = function(...args) { const current = list(...args); clearState(); return current; };
  for (const name of ['slides', 'inspector']) {
    $('we-toggle-' + name).addEventListener('click', () => {
      wbPanelChoices[name] = true;
      if (innerWidth < 760 && !wePanels[name].open) wePanels[name === 'slides' ? 'inspector' : 'slides'].open = false;
    }, true);
    $('we-size-' + name).addEventListener('input', () => { if (name === 'inspector') wbPanelChoices.inspectorWidth = true; });
    wbResizeHandle(name);
  }
  $('we-panel-reset').addEventListener('click', () => {
    for (const key of Object.keys(wbPanelChoices)) wbPanelChoices[key] = false;
    wbResponsive();
  });
  matchMedia('(max-width:1199px)').addEventListener('change', wbResponsive);
  matchMedia('(max-width:759px)').addEventListener('change', wbResponsive);
  wbReady = true; clearState(); wbResponsive(); wbPaint();
  return result;
};
