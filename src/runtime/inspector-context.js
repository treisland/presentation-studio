// Selection-derived Inspector view state stays outside projects and Undo history.
let icReady = false, icPainting = false, icIdentity = '', icDestination = '', icSlide = '', icBlock = '', icMember = '';
let icInspectorTarget = null;
let icTableSignature = '';

function icContains(node, predicate) {
  return !!node && projectFind({tree:[node]}, predicate).length > 0;
}
function icSelection() {
  const model = projectModel(), entries = spEntries(), keys = wpKind === 'slide' ? [] : spActiveKeys();
  const selected = entries.filter(entry => keys.includes(entry.key));
  const target=icInspectorTarget, targetRoot=target&&entries.find(entry=>entry.node===model.tree[Number(target.path.split('.')[0])]);
  const retainedPath=target?.slide===projectSelected&&targetRoot?.key===target.key&&['text','block'].includes(wpKind)?target.path:'';
  const activePath=document.activeElement===$('fe-block-text')&&selected.some(entry=>entry.node===model.tree[Number(projectBlockPath.split('.')[0])])?projectBlockPath:'';
  const inspectorPath=activePath||retainedPath;
  if (!selected.length && inspectorPath && projectAt(model,inspectorPath)) {
    const entry=entries.find(item=>item.node===model.tree[Number(inspectorPath.split('.')[0])]);
    if(entry){selected.push(entry);keys.push(entry.key);}
  }
  const candidate = vbSelected?.slideID === projectSelected && typeof vbSelected.path === 'string' && vbSelected.el?.isConnected ? vbSelected : null;
  const inline = candidate && (!selected.length || selected.some(entry=>entry.node === model.tree[Number(candidate.path.split('.')[0])])) ? candidate : null;
  const inlineNode = inline && projectAt(model, inline.path);
  const rootIndex = inline ? Number(inline.path.split('.')[0]) : -1;
  const editingChild = inline?.kind === 'text' && !!vbSession;
  const member = selected.find(entry=>entry.key===icMember);
  let entry = member || selected[0];
  if (editingChild) entry = entries.find(item => item.node === model.tree[rootIndex]) || entry;
  const node = entry?.node || (inline && model.tree[rootIndex]);
  let kind = 'slide', title = 'Slide settings', detail = model?.title || '', path = '';
  if (icDestination) kind = icDestination;
  else if (selected.length > 1 && !editingChild && !member) {
    kind = 'multiple';
    const group = selected[0].meta.group;
    title = group && selected.every(item => item.meta.group === group) ? 'Group' : 'Multiple objects';
    detail = selected.length + ' objects · shared appearance and group actions';
  } else if (wpKind === 'grid') { kind = 'grid'; title = wpSelection().title; detail = wpSelection().detail; }
  else if (wpKind === 'media') { kind = 'media'; title = ceConfig() ? ceConfig().kind === 'video' ? 'Video' : 'Image' : 'Media'; detail = ceConfig()?.name || 'Choose or upload media for this slide.'; }
  else if (icContains(node, item => mgHas(item,'terminal'))) kind = 'code';
  else if (icContains(node, item => item.tag === 'table')) kind = 'table';
  else if (icContains(node, item => mgHas(item,'component-widget'))) kind = 'widget';
  else if (node && wpKind !== 'slide') kind = 'text';

  if (kind === 'code') { title = 'Code / Commands'; detail = 'Snippet, labels, variants and initial choice'; }
  if (kind === 'table') {
    title = 'Table'; detail = 'Edit cells on the canvas or use the table fields below.';
    const tables = projectFind(model, item => item.tag === 'table');
    const table = icDestination === 'table' ? tables.find(item=>item.path===projectTablePath)||tables[0] : tables.find(item => !node || icContains(node, candidate => candidate === item.node));
    path = table?.path || '';
    if (inlineNode && ['td','th','caption'].includes(inlineNode.tag)) {
      const cell = inline.el.closest('td,th');
      detail = cell ? 'Table → Row '+(cell.parentElement.rowIndex+1)+' → Column '+(cell.cellIndex+1) : 'Table → Caption';
    }
  }
  if (kind === 'widget') {
    const definition = [...componentTypes].find(([type]) => mgHas(node,'component-'+type))?.[1];
    title = definition?.name || 'Widget'; detail = 'Edit named fields below or edit text on the canvas.';
    if (editingChild) {const child = Number(inline.path.split('.')[2]);detail = title+' → '+(definition?.fields?.[child]?.[0] || inlineNode?.tag?.toUpperCase() || 'Text');}
  }
  if (kind === 'text') {
    const fields = projectFields(model, {includeTitle:true}), root = entry?.node ? model.tree.indexOf(entry.node) : rootIndex;
    const field = fields.find(item => item.path === (inspectorPath || inline?.path)) || fields.find(item => inline?.path?.startsWith(item.path+'.')) || fields.find(item => Number(item.path.split('.')[0]) === root) || (icDestination === 'text' ? fields.find(item=>item.path===projectBlockPath) : null);
    path = field?.path || '';
    title = inlineNode?.tag || inspectorPath || icDestination === 'text' ? 'Text · '+(inlineNode?.tag||field?.node.tag||'content').toUpperCase() : wpSelection().title;
    detail = path ? projectText(projectAt(model,path)).slice(0,90) : 'Select text inside this object to edit it.';
  }
  if (kind === 'notes') { title = 'Slide notes'; detail = model?.title || ''; }
  if (entry?.meta.name && !['multiple','slide','notes'].includes(kind)) title += ' · '+entry.meta.name;
  if (entry?.meta.group && kind !== 'multiple') detail = 'Group → '+detail;
  const locked = !weEditing() || vbMode !== 'edit' || ceLocked() || selected.some(spProtected);
  return {kind,title,detail,path,locked,selected,identity:projectMeta.id+':'+projectSelected+':'+kind+':'+keys.join(',')+':'+(['text','table'].includes(kind)?path:inline?.path || '')+':'+(member?.key||'')};
}
function icVisible(id, visible) { if ($(id)) $(id).dataset.icVisible = String(!!visible); }
function icPaint() {
  if (!icReady || icPainting || !projectReady) return;
  icPainting = true;
  try {
    const slide = projectMeta.id+':'+projectSelected;
    if (slide !== icSlide) {icSlide = slide; icDestination = '';icInspectorTarget=null;}
    const context = icSelection(), {kind,locked} = context, changed = context.identity !== icIdentity;
    if (changed) {
      icIdentity = context.identity;
      if ($('we-inspector').dataset.icKind !== kind) $('wp-fields').scrollTop = 0;
    }
    $('we-inspector').dataset.icKind = kind;
    $('wp-selection-title').textContent = context.title;
    $('wp-selection-detail').textContent = context.detail;
    $('wp-selection-status').textContent = locked ? 'Locked / read-only' : 'Changes can be undone';
    icVisible('code-panel',kind === 'code');
    icVisible('component-widget-fields',kind === 'widget');
    icVisible('fe-commands-panel',false); // Extended code editor replaces duplicate legacy fields.
    icVisible('fe-content-panel',['slide','text'].includes(kind));
    if (['slide','text'].includes(kind)) $('fe-content-panel').hidden = false;
    icVisible('ic-slide-fields',kind === 'slide');
    icVisible('ic-text-editor',kind === 'text');
    icVisible('ic-text-hint',kind === 'text');
    icVisible('fe-block-select',kind === 'slide' || icDestination === 'text');
    icVisible('ic-block-label',kind === 'slide' || icDestination === 'text');
    icVisible('fe-slide-title',kind === 'slide');
    icVisible('ic-title-label',kind === 'slide');
    icVisible('we-slide-transition',kind === 'slide');
    icVisible('ic-transition-label',kind === 'slide');
    icVisible('fe-notes-panel',true);
    $('fe-notes-panel').hidden = false;
    icVisible('fe-table-panel',kind === 'table');
    $('fe-table-panel').hidden = kind !== 'table';
    icVisible('ce-panel',kind === 'media' || kind === 'grid');
    $('ce-panel').hidden = !['media','grid'].includes(kind);
    icVisible('mg-panel',kind === 'grid');
    icVisible('db-arrange',['text','widget','table','code'].includes(kind) && !!dbNode());
    icVisible('sp-clear',kind === 'slide');
    if ($('visibility-panel')) for (const child of $('visibility-panel').children) {
      const selectedControl = child.contains($('visibility-hide')) || child.contains($('visibility-show-hidden')) || child.tagName === 'H3';
      child.dataset.icVisible = String(selectedControl || kind === 'slide');
    }
    icVisible('ic-convert',kind === 'table' || kind === 'code');
    for (const button of $('ic-convert')?.querySelectorAll('button') || []) button.hidden = !button.textContent.toLowerCase().includes(kind);
    icVisible('wp-empty-hint',kind === 'slide');
    icVisible('wp-style-hint',false);
    icVisible('ic-content-hint',kind === 'multiple' || kind === 'code' && !projectModel().commands);
    icVisible('ic-member-field',context.selected.length>1);
    const memberSelect=$('ic-member');
    const memberIdentity=context.selected.map(entry=>entry.key).join(',');
    if(memberSelect.dataset.identity!==memberIdentity){memberSelect.dataset.identity=memberIdentity;memberSelect.replaceChildren(new Option('Shared selection',''),...context.selected.map(entry=>new Option(entry.meta.name||entry.name,entry.key)));}
    memberSelect.value=icMember;
    $('ic-content-hint').textContent = kind === 'multiple' ? 'Choose a member below to edit its content. Style shows shared and mixed values; use the toolbar for group arrangement.' : kind === 'code' ? 'No code on this slide. Insert it from Add / Library → Data & Code.' : '';
    if (kind === 'text' && context.path && document.activeElement !== $('fe-block-text')) {
      projectBlockPath = context.path; $('fe-block-select').value = context.path;
      $('fe-block-text').value = projectText(projectAt(projectModel(),context.path));
    }
    const tableSignature=kind==='table'?projectSelected+':'+context.path+':'+JSON.stringify(projectAt(projectModel(),context.path)):'';
    if (kind === 'table' && context.path && (projectTablePath !== context.path || icTableSignature !== tableSignature) && !document.activeElement?.matches('#fe-table-grid input')) {
      projectTablePath = context.path; projectTableForm();icTableSignature=tableSignature;
    }
    $('fe-block-text').disabled = locked || !projectBlockPath;
    for (const input of $('fe-table-panel').querySelectorAll('input,button,select')) input.disabled = locked || !projectTablePath;
    for (const input of $('code-panel').querySelectorAll('input,textarea,select,button')) {
      input.disabled = locked || (input.id === 'code-remove-variant' && $('code-edit-choice').value === 'shared');
    }
    $('ic-edit-inline').disabled = locked || !context.path;
    $('ic-select-parent').hidden = !vbSession;
    if (kind === 'multiple') {
      for (const id of ['wp-delete','wp-duplicate','db-remove','db-duplicate','vb-delete','vb-duplicate']) icVisible(id,false);
    } else for (const id of ['wp-delete','wp-duplicate','db-remove','db-duplicate','vb-delete','vb-duplicate']) icVisible(id,true);
    const button=context.selected.length===1&&mgHas(context.selected[0].node,'nav-button');
    const primary=button&&$('nav-panel')?'nav-panel':{text:'fe-content-panel',widget:'component-widget-fields',code:'code-panel',table:'fe-table-panel',media:$('mi-content')?'mi-content':'ce-panel',grid:$('mi-content')?'mi-content':'mg-panel',multiple:'ic-member-field',notes:'fe-notes-panel'}[kind];
    const fields=$('wp-fields'),panel=primary&&$(primary),guide=$('sg-guide');
    if(panel?.parentElement===fields){
      if(guide?.parentElement===fields){if(guide.nextElementSibling!==panel)guide.after(panel);}
      else if(fields.firstElementChild!==panel)fields.prepend(panel);
    }
  } finally { icPainting = false; }
}

// Existing renderers retain their guards and transactions; the final view applies one context policy.
const icWorkspacePaint = wpPaint;
wpPaint = function(...args) { const result = icWorkspacePaint(...args); icPaint(); return result; };
const icComponentPaint = componentPaint;
componentPaint = function(...args) { const result = icComponentPaint(...args); icPaint(); return result; };
const icLayersPaint = spPaint;
spPaint = function(...args) { const result = icLayersPaint(...args); icPaint(); return result; };
const icCodeInspector = codeInspector;
codeInspector = function(...args) { const result = icCodeInspector(...args); icPaint(); return result; };
const icTextSelection = vbSetSelection;
vbSetSelection = function(selection) { if (selection) {icDestination = '';icMember='';icInspectorTarget=null;} const result = icTextSelection(selection); icPaint(); return result; };
const icLayerSelection = spSelect;
spSelect = function(...args) { icDestination = '';icMember='';icInspectorTarget=null; vbEnd(false); const result = icLayerSelection(...args); icPaint(); return result; };
const icMediaSelection = ceSelect;
ceSelect = function(...args) { icDestination = '';icInspectorTarget=null; const result = icMediaSelection(...args); icPaint(); return result; };
const icBlockPanel = dbPanel;
dbPanel = function(...args) {if(dbSelected !== icBlock){icBlock=dbSelected;if(dbSelected){icDestination='';icInspectorTarget=null;}}const result=icBlockPanel(...args);icPaint();return result;};
const icInlineStart = vbStart;
vbStart = function(...args) {const result=icInlineStart(...args);icPaint();return result;};
const icInlineEnd = vbEnd;
vbEnd = function(...args) {const result=icInlineEnd(...args);icPaint();return result;};
const icGridRun = mgRun;
mgRun = function(...args) {const result=icGridRun(...args);if(result.ok){icDestination='';wpKind='grid';icPaint();}return result;};
const icGuideShow = lcGuideShow;
lcGuideShow = function(...args) {
  const result=icGuideShow(...args);
  if(lcGuides[lcGuideFamily][lcGuideIndex][2]==='#mg-cell' && mgRoot(projectModel())) {
    icDestination='';mgChoose(mgSelected||mgCellID(mgRoot(projectModel()).children[0]));wpChooseTab('content');icPaint();
  }
  return result;
};

function icNavigate(kind) {
  vbEnd(false); projectFlush();
  icDestination = kind === 'slide' ? '' : kind;
  spSelected = []; dbSelected = ''; vbSelected = null; wpKind = 'slide';
  icMember='';
  icInspectorTarget=null;
  weInspect(kind === 'code' ? 'commands' : kind); wpChooseTab('content');
  if (kind === 'text') idsReveal('fe-block-text');
  icPaint();
}
function icExpandTextEditor() {
  const context=icSelection();if(context.kind==='text'&&context.path)icInspectorTarget={slide:projectSelected,path:context.path,key:context.selected[0]?.key};
  vbEnd(false); projectFlush(); icPaint();
  wePanels.inspector.open = true; wePanelView(); wpChooseTab('content');
  idsReveal('fe-block-text'); $('fe-block-text').focus();
}
const icInit = projectInit;
projectInit = function() {
  icInit();
  const grid = $('fe-content-panel').querySelector('.fe-form-grid');
  grid.children[0].id = 'ic-slide-fields';
  const editor = document.createElement('section');
  editor.id = 'ic-text-editor'; editor.setAttribute('aria-label','Text editor');
  editor.append(...grid.children[1].childNodes); grid.children[1].replaceWith(editor);
  document.querySelector('label[for="fe-block-select"]').id = 'ic-block-label';
  document.querySelector('label[for="fe-slide-title"]').id = 'ic-title-label';
  document.querySelector('label[for="we-slide-transition"]').id='ic-transition-label';
  const hint = document.createElement('div'); hint.id = 'ic-text-hint';
  hint.innerHTML = '<p>Edit text on the canvas, or expand the Inspector editor below. Plain-text replacement removes inline formatting.</p><button id="ic-edit-inline">Edit text on canvas</button>';
  editor.before(hint);
  const multiple = document.createElement('p'); multiple.id = 'ic-content-hint'; multiple.dataset.wpPart = 'content'; $('wp-fields').prepend(multiple);
  const memberField=document.createElement('label');memberField.id='ic-member-field';memberField.dataset.wpPart='content';memberField.append('Inspect a member');const memberSelect=document.createElement('select');memberSelect.id='ic-member';memberField.append(memberSelect);multiple.after(memberField);
  memberSelect.onchange=()=>{const key=memberSelect.value;if(key){spSelect(key);icMember=key;componentPaint();}else{icMember='';icPaint();}};
  const parent = componentButton('Finish text editing',()=>{const key=dbSelected;vbEnd(false);vbSetSelection(null);if(key)spSelect(key);icPaint();});parent.id = 'ic-select-parent';$('wp-selection-header').prepend(parent);
  const slideSettings = componentButton('Slide settings',()=>icNavigate('slide'));slideSettings.id='ic-slide-settings';$('wp-selection-header').prepend(slideSettings);
  $('ic-edit-inline').onclick = () => {
    const context = icSelection(), node=projectAt(projectModel(),context.path),path=['ul','ol'].includes(node?.tag)?context.path+'.children.0':context.path;
    const element = [...projectPreviewNode.querySelectorAll('[data-vb-path]')].find(item => item.dataset.vbPath === path);
    if (element) vbStart({el:element,path,kind:'text',slideID:projectSelected});
    icPaint();
  };
  $('fe-block-text').addEventListener('focus',()=>{const context=icSelection();if(context.kind==='text'&&context.path)icInspectorTarget={slide:projectSelected,path:context.path,key:context.selected[0]?.key};vbEnd(false);});
  const panel = $('vb-panel').onclick;
  $('vb-panel').onclick = event => { const context = icSelection();if(context.kind === 'text')icExpandTextEditor();else if(context.kind === 'code')icNavigate('code');else panel?.call($('vb-panel'),event); };
  for (const [selector,kind] of [['#we-context-slide','slide'],['[data-fe-tab="commands"]','code'],['[data-fe-tab="table"]','table'],['[data-fe-tab="notes"]','notes'],['[data-fe-tab="content"]','text']]) {
    document.querySelector(selector).onclick = () => icNavigate(kind);
  }
  const conversion = [...$('wp-fields').children].find(node => node.textContent.includes('Make existing table movable'));
  if (conversion) conversion.id = 'ic-convert';
  $('full-editor').addEventListener('focusout',()=>{queueMicrotask(icPaint);});
  const preview = projectPreview;
  projectPreview = function(...args) {const result=preview(...args);icPaint();return result;};
  icReady = true; icPaint();
};
