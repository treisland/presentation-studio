// Editor chrome only: session state never enters the project or undo history.
let wpTab='content', wpKind='slide', wpSlide='', wpBlock='', wpReady=false;
const wpNames={content:'Content',arrange:'Arrange',style:'Style'};
function wpPart(node,part) {if(node)node.dataset.wpPart=part;}
function wpField(id,part) {wpPart($(id)?.closest('label')||$(id),part);}
function wpChooseTab(name,focus=false) {
  if(!wpNames[name]||!wpReady)return;
  wpTab=name;const inspector=$('we-inspector');inspector.dataset.wpTab=name;
  for(const key of Object.keys(wpNames)){const b=$('wp-tab-'+key);b.setAttribute('aria-selected',String(key===name));b.tabIndex=key===name?0:-1;}
  $('wp-fields').setAttribute('aria-labelledby','wp-tab-'+name);
  if(focus)$('wp-tab-'+name).focus();
}
function wpSelection() {
  const model=projectModel();
  if(wpKind==='block'&&dbSelected&&dbNode()){
    const node=dbNode(),kind=dbKinds.find(k=>(node.attrs.class||'').includes('db-'+k))||'content';
    return {kind:'block',title:kind[0].toUpperCase()+kind.slice(1)+' block',detail:projectText(node).slice(0,90),locked:ceLocked()};
  }
  if(wpKind==='grid'&&mgRoot(model)){
    const cells=mgRoot(model).children,i=cells.findIndex(c=>mgCellID(c)===mgSelected),cell=cells[i],cfg=cell&&mgConfig(projectState,model.id,mgObjectID(cell));
    return {kind:'grid',title:'Grid cell '+(i+1),detail:cfg?.name||'Empty media drop zone',locked:ceLocked()||!!cfg?.canvas?.locked,cfg};
  }
  if(wpKind==='media'&&ceConfig())return{kind:'media',title:ceConfig().kind==='video'?'Video':'Image',detail:ceConfig().name,locked:ceLocked(projectSelected,ceSelected),cfg:ceConfig()};
  if(wpKind==='text'&&vbSelected&&vbNode())return{kind:'text',title:$('vb-selection-label').textContent||'Content block',detail:projectText(vbNode()).slice(0,90),locked:ceLocked()};
  return{kind:'slide',title:'Slide',detail:model?.title||'Select a slide',locked:ceLocked()};
}
function wpPaint() {
  if(!wpReady||!projectReady)return;
  const key=projectMeta.id+':'+projectSelected;if(key!==wpSlide){wpSlide=key;wpKind='slide';}
  const s=wpSelection(),readOnly=s.locked||vbMode!=='edit'||boothActive||projectPlayback;
  $('wp-selection-title').textContent=s.title;$('wp-selection-detail').textContent=s.detail;
  $('wp-selection-status').textContent=readOnly?'Locked / read-only':'Changes can be undone';
  const remove=$('wp-delete'),duplicate=$('wp-duplicate');
  remove.textContent={block:'Delete block',text:'Delete block',media:'Remove media',grid:'Remove media from cell',slide:'Delete slide'}[s.kind];
  duplicate.textContent=s.kind==='slide'?'Duplicate slide':s.kind==='media'?'Duplicate media':'Duplicate block';
  remove.disabled=readOnly||(s.kind==='text'&&!vbCanRemove())||(s.kind==='grid'&&!s.cfg)||(s.kind==='slide'&&projectState.slides.length<=1);
  duplicate.disabled=readOnly||s.kind==='grid'||(s.kind==='text'&&!vbCanDuplicate())||(s.kind==='media'&&ceObjects().length>=30);
  duplicate.hidden=s.kind==='grid';
  for(const [kind,ids] of [['block',['db-duplicate','db-remove']],['text',['vb-duplicate','vb-delete']]])for(const id of ids){$(id).hidden=s.kind!==kind;$(id).disabled=readOnly||(kind==='text'&&(id==='vb-delete'?!vbCanRemove():!vbCanDuplicate()));}
  if(s.kind==='block')$('db-remove').textContent='Delete block';
  if(['block','text'].includes(s.kind)){remove.hidden=true;duplicate.hidden=true;}else remove.hidden=false;
  $('wp-empty-hint').hidden=s.kind!=='slide';
  $('wp-style-hint').hidden=!['block','slide'].includes(s.kind);
  for(const input of $('db-arrange').querySelectorAll('input,select,button'))input.disabled=readOnly||s.kind!=='block'||!!spMeta(dbSelected).locked;
  const cfg=ceConfig();for(const id of ['ce-fit','ce-crop','ce-caption','ce-alt','ce-hidden'])$(id).disabled=!cfg||ceLocked(projectSelected,ceSelected)||vbMode!=='edit';
  // Grid fields live in their existing panel; their guards remain authoritative.
  wpChooseTab(wpTab);
  for(const b of document.querySelectorAll('.wp-slide-actions button'))b.disabled=ceLocked(b.dataset.slideId)||!weEditing()||vbMode!=='edit'||(b.dataset.control==='fe-trash-slide'&&projectState.slides.length<=1);
  for(const name of ['slides','inspector']){
    const open=wePanels[name].open,b=$('we-toggle-'+name),left=name==='slides';
    b.textContent=open?(left?'‹':'›'):(left?'›':'‹');
    b.setAttribute('aria-label',(open?'Collapse ':'Reveal ')+(left?'Slides':'Inspector')+' panel');
    b.title=b.getAttribute('aria-label');
    b.closest('.wp-rail').dataset.open=String(open);
  }
}
function wpAct(action) {
  const button=$(action==='delete'?'wp-delete':'wp-duplicate');if(button.disabled)return;
  const s=wpSelection();vbEnd(false);projectFlush();
  if(s.kind==='block')dbRun({type:'block.'+(action==='delete'?'remove':'duplicate'),blockId:dbSelected});
  else if(s.kind==='text')vbModify(action);
  else if(s.kind==='grid')$('mg-remove').click();
  else if(s.kind==='media'){
    if(action==='delete')$('ce-delete').click();
    else {
      const cfg=projectCopy(ceConfig()),id=projectID('object');
      cfg.canvas=ceObject(cfg.canvas);cfg.canvas.placement=cePlacement({...cfg.canvas.placement,x:(cfg.canvas.placement?.x??.6)+.02,y:(cfg.canvas.placement?.y??.5)+.02});
      ceChange(()=>{projectState.mediaObjects??={};(projectState.mediaObjects[projectSelected]??=[]).push({id,media:cfg});const meta=spData().objects['media-'+ceSelected];if(meta)spData(projectState,projectSelected,true).objects['media-'+id]=projectCopy(meta);});ceSelect(id);
    }
  } else $(action==='delete'?'fe-trash-slide':'fe-duplicate').click();
  wpPaint();if(!button.disabled)button.focus();else $('wp-selection-title').focus();
}
const wpInspect=weInspect;
const wpSelectMedia=ceSelect;
ceSelect=function(...args){
  const cell=mgMember(args[0]);
  if(cell)mgSelected=mgCellID(cell);
  const result=wpSelectMedia(...args);
  if(cell)mgPanel();
  return result;
};
weInspect=function(context,select=true){wpInspect(context,select);if(select)wpKind=context==='media'?(mgMember(ceSelected)?'grid':'media'):context==='slide'?'slide':dbSelected&&dbNode()?'block':'text';wpPaint();};
const wpSelectText=vbSetSelection;
vbSetSelection=function(selection){wpSelectText(selection);if(selection){wpKind=selection.kind==='media'?(mgMember(ceSelected)?'grid':'media'):dbSelected&&dbNode()?'block':'text';wpPaint();}};
const wpDbPanel=dbPanel;
dbPanel=function(...args){wpDbPanel(...args);if(dbSelected!==wpBlock&&dbNode())wpKind='block';wpBlock=dbSelected;wpPaint();};
const wpMgChoose=mgChoose;
mgChoose=function(...args){wpMgChoose(...args);wpKind='grid';wpPaint();};
const wpMgPanel=mgPanel;
mgPanel=function(...args){wpMgPanel(...args);wpPaint();};
const wpPreview=projectPreview;
projectPreview=function(...args){const result=wpPreview(...args);wpPaint();return result;};
const wpPanels=wePanelView;
wePanelView=function(...args){const result=wpPanels(...args);wpPaint();return result;};
const wpReadinessNavigate=pfNavigate;
pfNavigate=function(...args){wpChooseTab('content');wePanels.inspector.open=true;wePanelView();return wpReadinessNavigate(...args);};
const wpList=projectList;
projectList=function(...args){wpList(...args);if(!wpReady)return;
  for(const button of document.querySelectorAll('#fe-slide-list .fe-slide-button')){
    const id=button.dataset.slideId,row=document.createElement('div');row.className='wp-slide-row';button.before(row);row.append(button);
    const actions=document.createElement('div');actions.className='wp-slide-actions';actions.setAttribute('aria-label','Actions for '+projectModel(id).title);
    for(const [label,control] of [['Duplicate slide','fe-duplicate'],['Delete slide','fe-trash-slide']]){
      const b=document.createElement('button');b.type='button';b.dataset.slideId=id;b.dataset.control=control;b.textContent=label==='Delete slide'?'Delete':'Duplicate';b.setAttribute('aria-label',label+': '+projectModel(id).title);b.disabled=ceLocked(id)||!weEditing()||vbMode!=='edit'||(control==='fe-trash-slide'&&projectState.slides.length<=1);
      b.onclick=()=>{button.click();if(!ceLocked(id))$(control).click();};actions.append(b);
    }
    row.append(actions);
  }
};
const wpInit=projectInit;
projectInit=function(){
  wpInit();const inspector=$('we-inspector'),header=document.createElement('div');header.id='wp-selection-header';
  header.innerHTML='<div class="wp-selection-heading"><strong id="wp-selection-title" tabindex="-1">Slide</strong><small id="wp-selection-status"></small></div><p id="wp-selection-detail"></p><div class="wp-selection-actions"><button id="wp-duplicate">Duplicate slide</button><button id="wp-delete">Delete slide</button></div><nav id="wp-tabs" role="tablist" aria-label="Inspector sections">'+Object.entries(wpNames).map(([id,name])=>`<button id="wp-tab-${id}" role="tab" aria-controls="wp-fields" aria-selected="${id==='content'}" tabindex="${id==='content'?0:-1}">${name}</button>`).join('')+'</nav>';
  const fields=document.createElement('div');fields.id='wp-fields';fields.setAttribute('role','tabpanel');fields.setAttribute('aria-labelledby','wp-tab-content');
  fields.append(...inspector.childNodes);inspector.append(header,fields);
  header.querySelector('.wp-selection-actions').addEventListener('mousedown',event=>{if(event.target.closest('button'))event.preventDefault();});
  const hint=document.createElement('p');hint.id='wp-empty-hint';hint.className='wp-hint';hint.textContent='Select text, a block, media or a grid cell on the canvas to inspect it.';fields.prepend(hint);
  const styleHint=document.createElement('p');styleHint.id='wp-style-hint';styleHint.className='wp-hint';styleHint.textContent='Select text inside a block to format it. Shape colors follow the presentation theme in Project settings.';wpPart(styleHint,'style');fields.prepend(styleHint);
  // Keep original controls/handlers; filter their existing groups by section.
  wpPart($('we-inspector-title'),'never');
  wpPart(inspector.querySelector('.fe-tabs'),'content');
  for(const id of ['fe-content-panel','fe-table-panel','fe-commands-panel','fe-notes-panel'])wpPart($(id),'content');
  wpPart($('vb-toolbar'),'style');wpPart($('we-font-controls'),'style');
  wpPart($('fe-slide-title'),'content');wpPart(document.querySelector('label[for=fe-slide-title]'),'content');wpPart($('ce-slide-lock').parentElement,'arrange');
  wpPart($('db-arrange'),'arrange');
  for(const id of ['ce-delete','mg-remove'])wpPart($(id),'never');
  for(const id of ['db-duplicate','db-remove','vb-duplicate','vb-delete'])header.querySelector('.wp-selection-actions').append($(id));
  for(const id of ['ce-x','ce-y','ce-w','ce-h'])wpField(id,'arrange');
  wpPart($('ce-float').parentElement,'arrange');
  for(const id of ['ce-back','ce-front','ce-object-lock'])wpPart($(id),'arrange');
  for(const id of ['ce-fit','ce-crop','ce-hidden'])wpField(id,'style');
  for(const id of ['ce-caption','ce-alt','ce-zone'])wpField(id,'content');
  wpPart($('ce-upload').parentElement,'content');wpPart($('ce-readonly'),'content');wpPart($('ce-panel').querySelector('summary'),'content');wpPart($('ce-panel').querySelector('.fe-hint'),'content');
  for(const id of ['mg-preset','mg-rows','mg-cols','mg-gap','mg-destination'])wpField(id,'arrange');
  for(const id of ['mg-configure','mg-swap','mg-detach'])wpPart($(id),'arrange');
  for(const id of ['mg-fit','mg-crop-x','mg-crop-y'])wpField(id,'style');
  wpPart($('mg-upload'),'content');
  for(const name of ['slides','inspector']){
    const rail=document.createElement('div');rail.className='wp-rail wp-rail-'+name;
    const label=document.createElement('span');label.textContent=name==='slides'?'Slides':'Inspector';label.setAttribute('aria-hidden','true');
    rail.append($('we-toggle-'+name),label);document.querySelector('.we-body').append(rail);
  }
  $('wp-delete').onclick=()=>wpAct('delete');$('wp-duplicate').onclick=()=>wpAct('duplicate');
  const openBlockPanel=$('vb-panel').onclick;
  $('vb-panel').onclick=(event)=>{wpChooseTab('content');openBlockPanel?.call($('vb-panel'),event);};
  $('fe-duplicate').onclick=()=>{
    if(ceLocked()||vbMode!=='edit')return;vbEnd(false);projectFlush();
    projectChange(()=>{
      const source=projectModel(),copy=projectCopy(source);copy.id=projectID();copy.title+=' (copy)';
      const heading=projectHeading(copy);if(heading)projectSetText(heading.node,copy.title);
      projectState.slides.splice(projectState.slides.indexOf(source)+1,0,copy);
      if(projectState.media[source.id])projectState.media[copy.id]=projectCopy(projectState.media[source.id]);
      if(ceObjects(source.id).length){projectState.mediaObjects??={};projectState.mediaObjects[copy.id]=projectCopy(ceObjects(source.id));}
      if(projectState.design?.slides[source.id])projectState.design.slides[copy.id]=projectCopy(projectState.design.slides[source.id]);
      for(const map of ['slides','groups'])if(projectState.visibility?.[map]?.[source.id])projectState.visibility[map][copy.id]=projectCopy(projectState.visibility[map][source.id]);
      if(projectState.backgroundEffects?.slides?.[source.id])projectState.backgroundEffects.slides[copy.id]=projectCopy(projectState.backgroundEffects.slides[source.id]);
      for(const loop of Object.values(projectState.loops)){const i=loop.slideIds.indexOf(source.id);if(i>=0)loop.slideIds.splice(i+1,0,copy.id);}
      projectSelected=copy.id;
    });
  };
  for(const name of Object.keys(wpNames))$('wp-tab-'+name).onclick=()=>{wpChooseTab(name);wpPaint();};
  $('wp-tabs').addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;const keys=Object.keys(wpNames),i=keys.indexOf(wpTab),next=e.key==='Home'?0:e.key==='End'?keys.length-1:(i+(e.key==='ArrowLeft'?-1:1)+keys.length)%keys.length;e.preventDefault();e.stopPropagation();wpChooseTab(keys[next],true);});
  wpReady=true;projectList();wpPaint();wePanelView();
};
