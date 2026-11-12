// Disclosure preferences are session-only UI state, never project data or Undo.
let idsReady = false;
const idsPreferences = new Map(), idsSections = new Map();
function idsType(context) {
  const entry = context.selected[0];
  if (context.kind === 'media') return ceConfig()?.kind || 'media';
  if (context.kind === 'text' && entry?.node) {
    return dbKinds.find(kind => mgHas(entry.node, 'db-' + kind)) || 'text';
  }
  return context.kind;
}
function idsRemember(section) {
  if (section.dataset.idsKind) idsPreferences.set(section.dataset.idsKind + ':' + section.id, section.open);
}
function idsRegister(section) {
  if (!section || idsSections.get(section.id)?.section === section) return;
  idsSections.set(section.id, {section, initial:section.open});
  section.classList.add('ids-section');
  section.addEventListener('toggle', () => idsRemember(section));
  // Remember user intent synchronously, before a selection-triggered repaint.
  section.querySelector(':scope > summary').addEventListener('click', event => {
    if (!event.defaultPrevented && section.dataset.idsKind)
      idsPreferences.set(section.dataset.idsKind + ':' + section.id, !section.open);
  });
}
function idsWrap(id, label) {
  const panel = $(id); if (!panel || panel.querySelector(':scope > .ids-section')) return;
  const section = document.createElement('details'), summary = document.createElement('summary');
  section.id = 'ids-' + id; section.open = true;
  const heading = panel.querySelector(':scope > h3');
  if (heading) {summary.append(heading);heading.classList.add('ids-heading');}
  else summary.append(label);
  const value = document.createElement('small'); value.className = 'ids-value';summary.append(value);
  section.append(summary, ...panel.childNodes); panel.append(section);idsRegister(section);
}
function idsPaint() {
  if (!idsReady || !projectReady) return;
  // Widget fields are rebuilt by their existing renderer; retain its handlers.
  idsWrap('component-widget-fields', 'Widget content');
  const context = icSelection(), kind = idsType(context);
  for (const {section,initial} of idsSections.values()) {
    if (!section.isConnected) continue;
    const scope = ['ci-notes','ids-keyboard-help'].includes(section.id) ? section.id : kind;
    if (section.dataset.idsKind !== scope) {
      section.dataset.idsKind = scope;
      section.open = idsPreferences.get(scope + ':' + section.id) ?? initial;
    }
    const value = section.querySelector(':scope > summary > .ids-value');
    if (value) {
      const text = section.id === 'ids-mask-panel' ? [$('mask-fit').selectedOptions[0]?.textContent,$('mask-shape').selectedOptions[0]?.textContent].filter(Boolean).join(' · ')
        : section.id === 'ids-nav-panel' ? $('nav-type')?.selectedOptions[0]?.textContent || 'None'
        : section.id === 'ids-wb-arrange-fields' ? 'Position and size'
        : section.id === 'ids-sp-style' ? $('sp-selection').textContent
        : context.kind === 'slide' ? projectModel().title : context.title;
      value.textContent = text;
    }
  }
}
// Shared entry point for shortcuts: open the existing section, never another editor.
function idsReveal(target, focus = false) {
  const node = typeof target === 'string' ? $(target) : target;
  if (!node) return;
  const ancestors = [];
  for (let parent = node.parentElement; parent && parent !== $('we-inspector'); parent = parent.parentElement)
    if (parent.tagName === 'DETAILS') ancestors.unshift(parent);
  for (const section of ancestors) {section.open = true;idsRemember(section);}
  if (focus) {node.scrollIntoView({block:'nearest'});node.focus({preventScroll:true});}
}
const idsPreviousPaint = icPaint;
icPaint = function(...args) {const result = idsPreviousPaint(...args);idsPaint();return result;};
const idsPreviousNavigate = icNavigate;
icNavigate = function(kind) {
  const result = idsPreviousNavigate(kind);
  const target = {slide:'fe-slide-title',text:'fe-block-text',table:'fe-table-grid',code:'code-text',notes:'fe-notes-text',media:'ce-replace'}[kind];
  if (target) idsReveal(target);
  return result;
};
const idsPreviousGuide = lcGuideShow;
lcGuideShow = function(...args) {
  const result = idsPreviousGuide(...args);
  if (lcGuideTarget && $('we-inspector')?.contains(lcGuideTarget)) idsReveal(lcGuideTarget);
  return result;
};
const idsPreviousInit = projectInit;
projectInit = function(...args) {
  const result = idsPreviousInit(...args);if (idsReady) return result;
  for (const [id,label] of [['fe-content-panel','Content'],['fe-table-panel','Table content'],['code-panel','Code content'],['nav-panel','Content & action'],['mask-panel','Crop & shape'],['sp-style','Appearance'],['wb-arrange-fields','Arrange']]) idsWrap(id,label);
  // Workspace previously kept the slide title outside its content panel.
  // Move the original fields so collapsing Content actually collapses its editor.
  $('ids-fe-content-panel').querySelector(':scope > summary').after($('ic-title-label'),$('fe-slide-title'));
  for (const id of ['ci-table-editor','ci-code-advanced','ci-playback','ci-legacy-content','ci-notes','ce-panel']) idsRegister($(id));
  delete $('ce-panel').querySelector(':scope > summary').dataset.wpPart;
  const background = document.querySelector('.bg-slide-settings');
  if (background) {background.id='ids-slide-background';idsRegister(background);}
  // Explicit Inspector navigation must reveal the destination even when collapsed.
  $('we-inspector').addEventListener('focusin', event => {
    if (!event.target.closest('summary')) idsReveal(event.target);
  });
  $('wp-fields').prepend($('sg-guide'));
  $('sg-guide').removeAttribute('tabindex');
  $('sg-guide').querySelector('details').id='ids-keyboard-help';
  $('sg-guide').querySelector('summary').textContent='Keyboard shortcuts and positioning';
  $('wp-fields').append($('ci-notes'),$('sg-guide').querySelector('details'));
  idsRegister($('ids-keyboard-help'));
  idsReady = true;idsPaint();return result;
};
