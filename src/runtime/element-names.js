// Names are optional editor metadata. Reading an older project does not rewrite it.
function enType(entry) {
  if(entry.media)return entry.media.kind==='video'?'Video':'Image';
  const node=entry.node;
  for(const [token,type]of [['db-step','Step'],['db-arrow','Arrow'],['db-pointer','Arrow'],['component-quote','Quote'],['component-metric','Metric'],['component-callout','Callout'],['db-circle','Circle'],['db-rectangle','Rectangle']])if(mgHas(node,token))return type;
  if(icContains(node,item=>item.tag==='table'))return'Table';
  if(icContains(node,item=>mgHas(item,'terminal')))return'Code';
  if(entry.kind==='grid')return'Grid';
  if(node?.tag==='div'&&(!dbID(node)||mgHas(node,'db-template')))return icContains(node,item=>mgHas(item,'card'))||mgHas(node,'card')?'Card':'Section';
  return'Text';
}
const enEntries=spEntries;
spEntries=function(model=projectModel(),state=projectState){
  const entries=enEntries(model,state).filter(entry=>!mgHas(entry.node,'tp-placeholder')),counts={};
  return entries.map(entry=>{const type=enType(entry),number=(counts[type]||0)+1;counts[type]=number;const preview=mgHas(entry.node,'component-widget')?entry.node.children.map(projectText).filter(Boolean).join(' · '):entry.name;return{...entry,type,preview,autoName:entry.meta.autoName||type+' '+number};});
};
function enLabel(entry){return entry.meta.name||entry.autoName||entry.name;}
function enCounter(state,slide,type,exclude=[]){
  const data=spData(state,slide.id,true);data.counters??={};
  let max=data.counters[type]||0;
  for(const entry of spEntries(slide,state).filter(entry=>!exclude.includes(entry.key)))if(entry.type===type){const match=entry.autoName.match(/ (\d+)$/);max=Math.max(max,Number(match?.[1]||0));}
  data.counters[type]=max+1;return type+' '+(max+1);
}
function enGroupLabel(state,id,group){return spData(state,id).groups?.[group]?.name||spData(state,id).groups?.[group]?.autoName||'Group';}
const enValidate=projectValidateState;
projectValidateState=function(raw,...args){
  const state=enValidate(raw,...args);
  for(const [id,data]of Object.entries(raw.design?.slides||{}))if(state.design?.slides[id]){
    const target=state.design.slides[id];
    for(const [key,meta]of Object.entries(data.objects||{}))if(target.objects[key]&&meta.autoName!=null){if(typeof meta.autoName!=='string'||!meta.autoName.trim()||meta.autoName.length>80)editingFail('INVALID','Invalid automatic element name.');target.objects[key].autoName=meta.autoName;}
    for(const field of ['counters','groups'])if(data[field]!=null){if(typeof data[field]!=='object'||Array.isArray(data[field]))editingFail('INVALID','Invalid element names.');target[field]={};}
    for(const [type,count]of Object.entries(data.counters||{})){if(!/^[A-Z][a-z]+$/.test(type)||!Number.isSafeInteger(count)||count<0||count>1000000)editingFail('INVALID','Invalid element counter.');target.counters[type]=count;}
    for(const [group,value]of Object.entries(data.groups||{})){if(!/^group-[\w-]+$/.test(group)||!value||typeof value.autoName!=='string'||value.autoName.length>80||value.name!=null&&(typeof value.name!=='string'||value.name.length>80))editingFail('INVALID','Invalid group name.');target.groups[group]={autoName:value.autoName,...(value.name?{name:value.name}:{})};}
  }
  return state;
};
const enResolve=spResolve;
spResolve=function(state,slide,keys){const before=spEntries(slide,state),result=enResolve(state,slide,keys);for(const [i,entry]of result.entries())if(!spProtected(entry)){const meta=spData(state,slide.id,true).objects[entry.key]??={};meta.autoName??=before.find(item=>item.key===keys[i])?.autoName||entry.name;}return result;};
const enAfter=editingAfterOperation;
editingAfterOperation=function(state,operation,created){
  enAfter(state,operation,created);const slide=state.slides.find(slide=>slide.id===operation.slideId);if(!slide)return;
  const entries=spEntries(slide,state),data=spData(state,slide.id);
  for(const key of created){const entry=entries.find(entry=>entry.key===key);if(!entry)continue;const target=spData(state,slide.id,true);const meta=target.objects[key]??={};
    if(operation.type!=='template.reset'&&!(operation.type==='template.customize'&&meta.autoName))meta.autoName=enCounter(state,slide,entry.type,created);
    if(meta.name){const base=meta.name.replace(/ — Copy(?: \d+)?$/,'').slice(0,65);let name=base+' — Copy',n=2;const used=new Set(entries.filter(item=>item.key!==key).map(item=>item.meta.name));while(used.has(name))name=base+' — Copy '+n++;meta.name=name;}
  }
  const groups=[...new Set(spEntries(slide,state).map(entry=>entry.meta.group).filter(Boolean))];
  for(const group of groups)if(!data.groups?.[group]){const target=spData(state,slide.id,true);target.groups??={};const record=target.groups[group]={autoName:enCounter(state,slide,'Group')};const sourceKey=operation.keys?.[0]||operation.blockId,sourceGroup=entries.find(entry=>entry.key===sourceKey)?.meta.group,sourceName=operation.type.endsWith('duplicate')&&target.groups[sourceGroup]?.name;if(sourceName){const base=sourceName.replace(/ — Copy(?: \d+)?$/,'').slice(0,65),used=new Set(Object.values(target.groups).map(item=>item.name));let name=base+' — Copy',n=2;while(used.has(name))name=base+' — Copy '+n++;record.name=name;}}
};
editingRegisterOperation('element.rename',(state,operation)=>{
  const slide=editingSlide(state,operation.slideId),targets=componentTargets(state,slide,operation.keys,false),data=spData(state,slide.id,true);
  if(operation.name!==null&&(typeof operation.name!=='string'||!operation.name.trim()||operation.name.length>80))editingFail('INVALID','Use a name of 1–80 characters, or reset to automatic.');
  const group=targets.length>1&&targets.every(entry=>entry.meta.group===targets[0].meta.group)?targets[0].meta.group:null;
  if(group){data.groups??={};const meta=data.groups[group]??={autoName:enCounter(state,slide,'Group')};if(operation.name===null)delete meta.name;else meta.name=operation.name.trim();}
  else if(targets.length===1){const meta=data.objects[targets[0].key]??={};meta.autoName??=targets[0].autoName;if(operation.name===null)delete meta.name;else meta.name=operation.name.trim();}
  else editingFail('INVALID','Rename one element or group.');
});
const enPaint=spPaint;
spPaint=function(...args){const result=enPaint(...args);if(!$('en-search'))return result;const query=$('en-search').value.trim().toLowerCase();for(const row of $('sp-layers').querySelectorAll('.sp-layer-row')){const entry=spEntries().find(entry=>entry.key===row.dataset.key);if(entry){const group=entry.meta.group?enGroupLabel(projectState,projectSelected,entry.meta.group):'';if(group){const preview=row.querySelector('.en-preview');preview.textContent=group+' · '+entry.preview;}row.querySelector('input').setAttribute('aria-label','Include '+enLabel(entry)+' in selection');row.hidden=!!query&&!([enLabel(entry),entry.type,entry.preview,group].join(' ').toLowerCase().includes(query));}}
  const selected=spEntries().filter(entry=>spActiveKeys().includes(entry.key)),group=selected.length>1&&selected.every(entry=>entry.meta.group===selected[0].meta.group)?selected[0].meta.group:null;
  if(group&&document.activeElement!==$('sp-name'))$('sp-name').value=spData().groups?.[group]?.name||'';
  return result;};
const enInit=projectInit;
projectInit=function(){enInit();const label=document.createElement('label');label.textContent='Find an element';const search=document.createElement('input');search.id='en-search';search.type='search';search.placeholder='Name or content';label.append(search);$('sp-layers').before(label);search.oninput=()=>spPaint();$('sp-name').onchange=()=>componentRun({type:'element.rename',keys:spActiveKeys(),name:$('sp-name').value.trim()||null});$('sp-name').after(componentButton('Reset to automatic name',()=>componentRun({type:'element.rename',keys:spActiveKeys(),name:null})));};
