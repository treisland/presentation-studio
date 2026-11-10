// Selection-driven content chrome. Existing editors and transactions own data.
let ciReady = false, ciIdentity = '';
function ciDetails(id, title) {
  const details = document.createElement('details'), summary = document.createElement('summary');
  details.id = id; summary.textContent = title; details.append(summary); return details;
}
function ciFieldChoices(context) {
  const entry = context.selected.length === 1 && context.selected[0];
  if (!entry?.node || ['component-widget','db-code','terminal'].some(type=>mgHas(entry.node,type))) return [];
  const model = projectModel(), root = String(model.tree.indexOf(entry.node));
  const inside = path => path === root || path.startsWith(root+'.');
  const fields = projectFields(model,{includeTitle:true}).filter(field=>inside(field.path));
  const choices = fields.map(field=>({value:'text:'+field.path,label:field.node.tag.toUpperCase()+' · '+projectText(field.node).slice(0,55)}));
  for (const [index,table] of projectFind(model,node=>node.tag==='table').filter(field=>inside(field.path)).entries()) choices.push({value:'table:'+table.path,label:'Table '+(index+1)});
  if (icContains(entry.node,node=>mgHas(node,'terminal'))) choices.push({value:'code:',label:'Code / Commands'});
  return choices;
}
function ciChooseField(value) {
  const context = icSelection(), choice = ciFieldChoices(context).find(item=>item.value===value);
  if (!choice) return;
  $('ci-field-select').focus({preventScroll:true});
  vbEnd(false); projectFlush();
  const [kind,path] = value.split(':');
  vbSelected = null; icDestination = kind; icInspectorTarget = kind==='text'?{slide:projectSelected,path,key:context.selected[0]?.key}:null;
  if (kind==='text') projectBlockPath=path;
  if (kind==='table') {projectTablePath=path;icTableSignature='';}
  icPaint();
  if (kind==='text') {$('ic-text-editor').open=true;$('fe-block-text').focus();}
}
function ciPaint() {
  if (!ciReady || !projectReady) return;
  const context=icSelection(), changed=ciIdentity!==context.identity;
  if(changed){ciIdentity=context.identity;$('ci-table-editor').open=false;$('ci-code-advanced').open=false;}
  const legacy=$('ci-legacy-tabs');legacy.hidden=true;
  for(const tab of legacy.querySelectorAll('button'))tab.tabIndex=-1;
  for(const id of ['fe-content-panel','fe-table-panel','code-panel']){
    $(id).setAttribute('role','region');$(id).setAttribute('aria-labelledby','wp-selection-title');
  }
  $('fe-notes-panel').hidden=false;$('fe-notes-panel').dataset.icVisible='true';
  $('fe-notes-text').disabled=!weEditing()||ceLocked()||vbMode!=='edit';
  $('ci-notes-title').textContent=projectModel()?.title||'';
  $('ic-slide-settings').hidden=context.kind==='slide';
  $('ci-find-selection').hidden=context.kind!=='slide'&&context.kind!=='multiple';
  const choices=ciFieldChoices(context), select=$('ci-field-select');
  const signature=JSON.stringify(choices);
  if(select.dataset.signature!==signature){select.dataset.signature=signature;select.replaceChildren(...choices.map(item=>new Option(item.label,item.value)));}
  $('ci-field-target').hidden=choices.length<2;
  const current=context.kind==='text'?'text:'+context.path:context.kind==='table'?'table:'+context.path:'code:';
  select.value=current;
  $('ci-legacy-content').hidden=context.kind!=='slide';
  $('ci-content-title').textContent=context.kind==='slide'?'Slide settings':'Text content';
  if(context.kind==='table'&&context.path){
    const table=projectAt(projectModel(),context.path),data=projectTableData(table);
    $('ci-table-count').textContent=data.rows.length+' rows · '+data.heads.length+' columns';
  }
  // Structure controls retain their guarded target; disclosure state is view-only.
  $('ci-table-editor').querySelector('summary').setAttribute('aria-label','Edit cells in panel');
}
const ciPreviousPaint=icPaint;
icPaint=function(...args){const result=ciPreviousPaint(...args);ciPaint();return result;};
const ciPreviousNavigate=icNavigate;
icNavigate=function(kind){
  if(ciReady&&kind==='notes'){vbEnd(false);projectFlush();wePanels.inspector.open=true;wePanelView();$('ci-notes').open=true;$('fe-notes-text').focus();return;}
  return ciPreviousNavigate(kind);
};
const ciPreviousInit=projectInit;
projectInit=function(...args){
  const result=ciPreviousInit(...args);if(ciReady)return result;
  const inspector=$('we-inspector'),legacy=inspector.querySelector('.fe-tabs');
  legacy.id='ci-legacy-tabs';legacy.dataset.wpPart='never';legacy.hidden=true;
  $('ic-slide-settings').textContent='← Slide settings';
  $('ic-slide-settings').setAttribute('aria-label','Slide settings');
  const addMedia=$('db-add-media').onclick;
  $('db-add-media').onclick=event=>{icDestination='media';const result=addMedia.call($('db-add-media'),event);icPaint();return result;};
  $('ce-file').addEventListener('cancel',event=>{event.stopPropagation();if(icDestination==='media'&&!ceConfig())icNavigate('slide');});
  const find=componentButton('Find an element in Layers',()=>{ldOpen(true);$('en-search').focus();});find.id='ci-find-selection';find.dataset.wpPart='content';$('wp-empty-hint').after(find);
  const target=document.createElement('label');target.id='ci-field-target';target.dataset.wpPart='content';target.append('Edit within this element');
  const select=document.createElement('select');select.id='ci-field-select';select.onchange=()=>ciChooseField(select.value);target.append(select);$('wp-selection-header').append(target);
  for(const id of ['fe-block-select','ic-block-label','fe-table-select'])$(id).classList.add('ci-internal');
  document.querySelector('label[for="fe-table-select"]').classList.add('ci-internal');
  $('fe-remove-block').classList.add('ci-internal');
  $('ic-text-editor').querySelector('summary').textContent='Edit in panel';
  $('ic-text-hint').querySelector('p').textContent='Edit this element on the canvas, or use the panel editor below. Plain-text replacement removes inline formatting.';
  $('ic-edit-inline').textContent='Edit on canvas';
  const title=document.createElement('h3');title.id='ci-content-title';$('fe-content-panel').prepend(title);
  const playback=ciDetails('ci-playback','Playback');
  for(const id of ['we-slide-transition','fe-duration','fe-topic']){
    const field=$(id),label=document.querySelector('label[for="'+id+'"]');if(label)playback.append(label);playback.append(field);
  }
  playback.append($('fe-hidden').closest('label'));$('ic-slide-fields').append(playback);
  const legacyContent=ciDetails('ci-legacy-content','Legacy template content');legacyContent.dataset.wpPart='content';
  const legacyHint=document.createElement('p');legacyHint.textContent='Add flowing template paragraphs or lists. Use Add / Library for movable objects.';
  legacyContent.append(legacyHint,$('fe-add-paragraph'),$('fe-add-bullets'));$('ic-slide-fields').append(legacyContent);
  const table=$('fe-table-panel'),tableHint=document.createElement('p');tableHint.textContent='Click a cell on the canvas to edit it.';
  const tableEditor=ciDetails('ci-table-editor','Edit cells in panel');tableEditor.append($('fe-table-grid'));
  const count=document.createElement('p');count.id='ci-table-count';count.setAttribute('role','status');
  table.prepend(tableHint,tableEditor,count);
  const tableHelp=table.querySelector(':scope > .fe-hint');if(tableHelp)tableEditor.append(tableHelp);
  const code=$('code-panel'),advanced=ciDetails('ci-code-advanced','Variants & defaults');
  for(const id of ['code-initial','code-detect','code-name'])advanced.append($(id).closest('label'));
  advanced.append($('code-add-variant'),$('code-remove-variant'));code.append(advanced);
  $('code-hidden').closest('label').classList.add('ci-internal');
  const labels=document.createElement('div');labels.className='ci-code-labels';labels.append($('code-language').closest('label'),$('code-environment').closest('label'));advanced.before(labels);
  const notes=ciDetails('ci-notes','Slide notes'),scope=document.createElement('small');scope.id='ci-notes-title';
  notes.querySelector('summary').append(scope);notes.append($('fe-notes-panel'));inspector.append(notes);
  delete $('fe-notes-panel').dataset.wpPart;$('fe-notes-panel').setAttribute('role','region');$('fe-notes-panel').setAttribute('aria-label','Notes for this slide');
  $('fe-notes-text').rows=5;
  ciReady=true;ciPaint();return result;
};
