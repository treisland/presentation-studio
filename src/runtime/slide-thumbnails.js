// Navigator snapshots are view state. Canvas rendering, persistence and Undo
// continue independently while the selected item is being edited.
let navReady=false, navTopology='', navProject='', navForce=false, navBoundaryTimer=0, navBoundaryForce=false;
const navSnapshots=new Map();
function navSignature(model) {
  return JSON.stringify([model,projectState.media[model.id],projectState.mediaObjects?.[model.id],
    projectState.design?.slides?.[model.id],projectState.design?.palette,
    projectState.visibility?.defaults,projectState.visibility?.slides?.[model.id],projectState.visibility?.groups?.[model.id],
    projectState.brand,projectState.settings,projectState.sections,
    projectState.backgroundEffects?.defaults,projectState.backgroundEffects?.slides?.[model.id]]);
}
function navBusy() {
  return !!(vbSession || ceDrag || ceRelocate || dbDrag || mgDrag || editingGestureBusy() ||
    document.activeElement?.closest('#we-inspector,#we-font-controls,#vb-toolbar'));
}
function navItem() {
  return projectSelected+':'+(vbSelected?.slideID===projectSelected?vbSelected.path:'')+':'+spActiveKeys().join(',');
}
const navOriginalThumb=weThumb;
weThumb=function(button,model,refresh=false){
  if(navReady && !navForce && model.id===projectSelected && navBusy() && button.querySelector('.we-thumbnail')?.firstChild)return;
  navOriginalThumb(button,model,refresh);
  if(button.querySelector('.we-thumbnail')?.firstChild)navSnapshots.set(model.id,navSignature(model));
};
const navOriginalList=projectList;
projectList=function(...args){
  if(!navReady)return navOriginalList(...args);
  const list=$('fe-slide-list'),query=$('fe-search').value.toLowerCase().trim(),group=$('fe-group-filter').value;
  const models=projectState.slides.filter(s=>(group==='all'||s.group===group)&&(!query||(s.title+' '+s.topic).toLowerCase().includes(query)));
  const topology=JSON.stringify([projectMeta.id,projectState.sections,models.map(s=>[s.id,s.group]),query,group]);
  const sameProject=navProject===projectMeta.id,scroll=list.scrollTop,focus=document.activeElement;
  const focusID=focus?.closest('[data-slide-id]')?.dataset.slideId,control=focus?.dataset.control;
  if(!sameProject){navSnapshots.clear();navProject=projectMeta.id;}
  const ids=new Set(projectState.slides.map(s=>s.id));
  for(const id of navSnapshots.keys())if(!ids.has(id))navSnapshots.delete(id);
  if(topology!==navTopology){
    navOriginalList(...args);navTopology=topology;
    if(sameProject){
      list.scrollTop=scroll;
      if(focusID && !focus.isConnected){
        const target=[...list.querySelectorAll('[data-slide-id]')].find(el=>el.dataset.slideId===focusID&&(control?el.dataset.control===control:el.matches('.fe-slide-button')));
        target?.focus({preventScroll:true});
      }
    }
  }
  for(const button of list.querySelectorAll('.fe-slide-button')){
    const model=projectModel(button.dataset.slideId);if(!model)continue;
    const selected=model.id===projectSelected,deferred=selected&&!navForce&&navBusy();
    button.classList.toggle('selected',selected);button.classList.toggle('is-hidden',!!model.hidden);
    button.setAttribute('aria-current',String(selected));
    button.draggable=!ceLocked(model.id)&&!query;
    const section=projectState.sections.find(s=>s.id===model.group),badges=button.querySelector('.we-slide-badges');
    badges.textContent=[model.hidden?'Hidden':'',model.editLocked?'🔒 Locked':''].filter(Boolean).join(' · ');
    if(!deferred){
      button.querySelector('strong').textContent=model.title;button.title=model.title;
      button.querySelector('small').textContent=projectGroupInfo.find(g=>g.id===model.group).label+(model.hidden?' · Hidden':'')+(projectState.media[model.id]?' · Media':'');
      button.setAttribute('aria-label',model.title+' · '+section.name+(badges.textContent?' · '+badges.textContent:''));
      if(button.querySelector('.we-thumbnail')?.firstChild && navSnapshots.get(model.id)!==navSignature(model))weThumb(button,model,true);
    }
    const actions=button.closest('.wp-slide-row')?.querySelector('.wp-slide-actions');
    if(actions){
      actions.setAttribute('aria-label','Actions for '+model.title);
      for(const action of actions.querySelectorAll('button')){
        const label=action.dataset.control==='fe-trash-slide'?'Delete slide':'Duplicate slide';
        action.setAttribute('aria-label',label+': '+model.title);
        action.disabled=ceLocked(model.id)||!weEditing()||vbMode!=='edit'||(action.dataset.control==='fe-trash-slide'&&projectState.slides.length<=1);
      }
    }
  }
};
function navCommit(force=false){
  if(!navReady||!projectReady||ceDrag||ceRelocate||dbDrag||mgDrag||editingGestureBusy()||(!force&&navBusy()))return;
  projectFlush();navForce=true;
  try{projectList();}finally{navForce=false;}
}
function navBoundary(force=false){
  if(!navReady)return;
  // Let the new selection/focus and pending inline-editor handlers settle first.
  navBoundaryForce ||= force;
  clearTimeout(navBoundaryTimer);navBoundaryTimer=setTimeout(()=>{const forced=navBoundaryForce;navBoundaryForce=false;navCommit(forced);},0);
}
const navInlineSelection=vbSetSelection;
vbSetSelection=function(...args){if(!navReady)return navInlineSelection(...args);const before=navItem(),result=navInlineSelection(...args);if(before!==navItem())navBoundary(true);return result;};
const navObjectSelection=spSelect;
spSelect=function(...args){if(!navReady)return navObjectSelection(...args);const before=navItem(),result=navObjectSelection(...args);if(before!==navItem())navBoundary(true);return result;};
const navInlineEnd=vbEnd;
vbEnd=function(...args){const result=navInlineEnd(...args);navBoundary();return result;};
const navUndo=projectUndo,navRedo=projectRedo;
projectUndo=function(...args){const result=navUndo(...args);navCommit(true);return result;};
projectRedo=function(...args){const result=navRedo(...args);navCommit(true);return result;};
const navChange=projectChange;
projectChange=function(...args){const result=navChange(...args);navBoundary(true);return result;};
const navInit=projectInit;
projectInit=function(...args){
  const result=navInit(...args);if(navReady)return result;navReady=true;projectList();
  $('full-editor').addEventListener('focusout',()=>navBoundary());
  window.addEventListener('pointerup',()=>navBoundary());
  $('full-editor').addEventListener('keyup',event=>{if(event.key==='Escape')navBoundary(true);});
  $('vb-done').addEventListener('click',()=>navBoundary(true));
  return result;
};
