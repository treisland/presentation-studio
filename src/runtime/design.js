// Additive, validated design metadata. Existing projects have no design overrides.
const spRoles=['background','surface','ink','muted','accent','accentInk','border','secondary'];
const spSlots=['text','fill','border'];
let spSelected=[],spSelectionSlide='',spClipboard=null,spReady=false;
const spNodeID=n=>dbID(n)||n?.attrs?.class?.match(/\blayer-[\w-]+\b/)?.[0]||'';
function spData(state=projectState,id=projectSelected,create=false){
  if(create){state.design??={palette:[],slides:{}};state.design.slides[id]??={objects:{}};}
  return state?.design?.slides?.[id]||{objects:{}};
}
function spEntries(model=projectModel(),state=projectState){
  if(!model)return[];
  const data=spData(state,model.id);
  const roots=model.tree.filter(n=>n.tag).map((node)=>{const i=model.tree.indexOf(node),key=spNodeID(node)||'node-'+i;return{key,node,meta:data.objects[key]||{},kind:dbID(node)?'block':/\bmg-grid\b/.test(node.attrs?.class||'')?'grid':'content',name:projectText(node).trim().slice(0,45)||'Content',z:dbID(node)?dbRect(node).layer:1};});
  for(const item of [{id:'primary',media:state.media[model.id]},...(state.mediaObjects?.[model.id]||[])])if(item.media&&!mgMember(item.id,model))roots.push({key:'media-'+item.id,media:item.media,object:item.id,meta:data.objects['media-'+item.id]||{},kind:'media',name:item.media.name||'Media',z:item.media.layout==='background'?0:item.media.canvas?.z??3});
  return roots.map((e,i)=>({...e,order:(e.kind==='block'?20000:e.kind==='media'||e.kind==='grid'?10000:0)+i,childLocked:e.kind==='grid'&&e.node.children.some(c=>mgConfig(state,model.id,mgObjectID(c))?.canvas?.locked),z:e.media?.layout==='background'&&!e.media.canvas?.placement?0:e.kind==='block'||e.kind==='media'?e.z:e.meta.z??(e.kind==='grid'?Math.max(1,...e.node.children.map(c=>mgConfig(state,model.id,mgObjectID(c))?.canvas?.z||1)):e.z)}));
}
function spMeta(key,state=projectState,id=projectSelected){return spData(state,id).objects[key]||{};}
function spColor(value){
  if(value===null||value===undefined)return null;
  if(value==='transparent')return 'transparent';
  if(!value||typeof value!=='object'||Array.isArray(value))editingFail('INVALID','Choose a theme color, hex color or transparent.');
  const opacity=value.opacity??1;
  if(!Number.isFinite(opacity)||opacity<0||opacity>1)editingFail('INVALID','Opacity must be 0–100%.');
  if(spRoles.includes(value.role))return{role:value.role,opacity};
  if(/^#[0-9a-f]{6}$/i.test(value.hex))return{hex:value.hex.toLowerCase(),opacity};
  editingFail('INVALID','Invalid color. Use a six-digit hex value.');
}
function spStyle(raw={}){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))editingFail('INVALID','Invalid appearance.');
  const style={};for(const slot of spSlots)if(Object.hasOwn(raw,slot))style[slot]=spColor(raw[slot]);
  if(Object.hasOwn(raw,'borderWidth')){if(!Number.isFinite(raw.borderWidth)||raw.borderWidth<0||raw.borderWidth>24)editingFail('INVALID','Border width must be 0–24 pixels.');style.borderWidth=raw.borderWidth;}
  return style;
}
const spValidate=projectValidateState;
projectValidateState=function(raw,...args){
  const result=spValidate(raw,...args);if(!raw.design)return result;
  if(!raw.design||typeof raw.design!=='object'||!Array.isArray(raw.design.palette)||raw.design.palette.length>24||!raw.design.slides||typeof raw.design.slides!=='object')editingFail('INVALID','Invalid project design data.');
  result.design={palette:raw.design.palette.map(c=>{if(typeof c.name!=='string'||!c.name.trim()||c.name.length>40||!/^#[0-9a-f]{6}$/i.test(c.hex))editingFail('INVALID','Invalid project swatch.');return{name:c.name,hex:c.hex.toLowerCase()};}),slides:{}};
  const all=[...result.slides,...result.trash,...(result.sectionTrash||[]).flatMap(s=>s.slides)];
  for(const model of all){const ids=new Set();for(const node of model.tree){const id=spNodeID(node);if(id&&ids.has(id))editingFail('INVALID','Duplicate layer identity.');if(id)ids.add(id);}}
  for(const [id,data] of Object.entries(raw.design.slides)){
    if(!/^[\w-]+$/.test(id)||['__proto__','constructor','prototype'].includes(id)||!all.some(s=>s.id===id))continue;
    if(!data||typeof data!=='object'||!data.objects||typeof data.objects!=='object'||Object.keys(data.objects).length>1000)editingFail('INVALID','Invalid slide design data.');
    const clean={objects:{}};if(data.background!=null)clean.background=spColor(data.background);
    for(const [key,m] of Object.entries(data.objects)){
      if(!/^(?:block-|layer-|media-(?:primary$|object-))[\w-]*$/.test(key)||!m||typeof m!=='object')editingFail('INVALID','Invalid layer identity.');
      if(m.name!=null&&(typeof m.name!=='string'||m.name.length>80))editingFail('INVALID','Layer names must be at most 80 characters.');
      if(m.rotation!=null&&(!Number.isFinite(m.rotation)||m.rotation< -180||m.rotation>180))editingFail('INVALID','Rotation must be -180–180 degrees.');
      if(m.z!=null&&(!Number.isInteger(m.z)||m.z<0||m.z>1000))editingFail('INVALID','Invalid layer order.');
      if(m.group!=null&&!/^group-[\w-]+$/.test(m.group))editingFail('INVALID','Invalid group identity.');
      clean.objects[key]={...(m.name!=null?{name:m.name}:{}),...(m.group?{group:m.group}:{}),locked:!!m.locked,hidden:!!m.hidden,...(m.rotation!=null?{rotation:m.rotation}:{}),...(m.z!=null?{z:m.z}:{}),style:spStyle(m.style||{}),...(m.action?{action:navAction(m.action)}:{}),...(m.frame?{frame:maskSettings(m.frame)}:{})};
    }
    result.design.slides[id]=clean;
  }
  return result;
};
function spResolve(state,slide,keys){
  const entries=spEntries(slide,state),targets=keys.map(key=>entries.find(e=>e.key===key));
  if(targets.some(e=>!e))editingFail('NOT_FOUND','The selected layer no longer exists.');
  for(const e of targets)if(e.node&&!spNodeID(e.node)){const key=projectID('layer');e.node.attrs??={};e.node.attrs.class=((e.node.attrs.class||'')+' '+key).trim();e.key=key;}
  return targets;
}
function spProtected(entry){return !!entry.meta.locked||!!entry.media?.canvas?.locked||!!entry.childLocked;}
const spStackOrder=(a,b)=>a.z-b.z||a.order-b.order;
const spViolates=ceViolates;
ceViolates=function(before,after){
  if(spViolates(before,after))return true;
  if(ceLockAction)return false;
  for(const model of [...before.slides,...before.trash,...(before.sectionTrash||[]).flatMap(s=>s.slides)]){
    const next=[...after.slides,...after.trash,...(after.sectionTrash||[]).flatMap(s=>s.slides)].find(s=>s.id===model.id);
    if(model.editLocked&&JSON.stringify(spData(before,model.id))!==JSON.stringify(spData(after,model.id)))return true;
    for(const e of spEntries(model,before))if(e.meta.locked){
      const n=next&&spEntries(next,after).find(n=>n.key===e.key);
      const withoutLock=x=>{const meta=projectCopy(x.meta);delete meta.locked;return{meta,node:x.node,media:x.media};};
      if(!n||JSON.stringify(withoutLock(e))!==JSON.stringify(withoutLock(n)))return true;
      if(e.kind==='grid')for(const cell of e.node.children){const object=mgObjectID(cell);if(object&&JSON.stringify(mgConfig(before,model.id,object))!==JSON.stringify(mgConfig(after,model.id,object)))return true;}
    }
  }
  return false;
};
const spCanvasLocked=ceLocked;
ceLocked=function(id=projectSelected,object=null){const model=projectState?.slides?.find(s=>s.id===id),root=model&&mgRoot(model);return spCanvasLocked(id,object)||(object&&(spMeta('media-'+object,projectState,id).locked||(root&&mgMember(object,model)&&spMeta(spNodeID(root),projectState,id).locked)));};
const spBlockOperation=dbOperation;
dbOperation=function(state,op,created){
  if(!op?.type?.startsWith('design.')){
    if(op?.type?.startsWith('block.')&&op.blockId&&spMeta(op.blockId,state,op.slideId).locked)editingFail('LOCKED','Unlock the block first.');
    const result=spBlockOperation(state,op,created),meta=op?.type==='block.duplicate'&&spData(state,op.slideId).objects[op.blockId];
    if(result&&meta){const copy=projectCopy(meta);if(copy.z!=null)copy.z=Math.min(1000,copy.z+1);spData(state,op.slideId,true).objects[created.at(-1)]=copy;}
    return result;
  }
  const slide=editingSlide(state,op.slideId),data=spData(state,slide.id,true);
  if(op.type==='design.palette'){
    if(!Array.isArray(op.colors)||op.colors.length>24)editingFail('INVALID','Save at most 24 project colors.');state.design.palette=projectCopy(op.colors);return true;
  }
  if(op.type==='design.background'){data.background=spColor(op.color);return true;}
  if(op.type==='design.clear'){
    if(spEntries(slide,state).some(spProtected)||mgRoot(slide)?.children.some(c=>mgConfig(state,slide.id,mgObjectID(c))?.canvas?.locked))editingFail('LOCKED','Unlock all slide contents before clearing.');
    slide.tree=[];slide.commands=null;delete state.media[slide.id];delete state.mediaObjects[slide.id];data.objects={};return true;
  }
  if(!Array.isArray(op.keys)||!op.keys.length||op.keys.length>100||new Set(op.keys).size!==op.keys.length)editingFail('INVALID','Select 1–100 distinct layers.');
  const lockOnly=op.type==='design.meta'&&op.changes&&Object.keys(op.changes).length===1&&typeof op.changes.locked==='boolean';
  const targets=spResolve(state,slide,op.keys);
  if(!lockOnly&&targets.some(spProtected))editingFail('LOCKED','Unlock selected layers first.');
  for(const e of targets){
    const meta=data.objects[e.key]??={};
    if(op.type==='design.appearance')meta.style={...meta.style,...spStyle(op.style)};
    else if(op.type==='design.meta'){
      const c=op.changes;if(!c||Object.keys(c).some(k=>!['name','locked','hidden','rotation'].includes(k)))editingFail('INVALID','Invalid layer properties.');
      if(e.kind==='grid'&&c.rotation)editingFail('INVALID','Detach Grid media before rotating individual items.');
      Object.assign(meta,c);
    }else if(op.type==='design.remove'){
      if(e.kind==='grid')for(const cell of e.node.children){const object=mgObjectID(cell);if(!object)continue;if(object==='primary')delete state.media[slide.id];else state.mediaObjects[slide.id]=(state.mediaObjects[slide.id]||[]).filter(n=>n.id!==object);delete data.objects['media-'+object];}
      if(e.node){projectMarkHeadingRemoved(slide,String(slide.tree.indexOf(e.node)));slide.tree.splice(slide.tree.indexOf(e.node),1);}
      else if(e.object==='primary')delete state.media[slide.id];else state.mediaObjects[slide.id]=state.mediaObjects[slide.id].filter(n=>n.id!==e.object);
      delete data.objects[e.key];
    }else if(op.type!=='design.reorder')editingFail('INVALID','Unsupported design operation.');
  }
  if(op.type==='design.reorder'){
    if(targets.length!==1||(!op.target&&!['forward','backward'].includes(op.direction)))editingFail('INVALID','Reorder one layer at a time.');
    const all=spEntries(slide,state).sort(spStackOrder),e=all.find(n=>n.key===targets[0].key),i=all.indexOf(e),j=op.target?all.findIndex(n=>n.key===op.target):i+(op.direction==='forward'?1:-1),other=all[j];
    if(e.media?.layout==='background'&&!e.media.canvas?.placement||!other||other.media?.layout==='background'&&!other.media.canvas?.placement)editingFail('INVALID','Background stays pinned below the content.');
    if(spProtected(other))editingFail('LOCKED','Unlock the adjacent layer before reordering.');
    // Normalize editable roots to a shared stack without changing their layout boxes.
    const ordered=spResolve(state,slide,all.map(n=>n.key)),moved=ordered.splice(i,1)[0];ordered.splice(j,0,moved);
    ordered.forEach((n,k)=>{if(spProtected(n))editingFail('LOCKED','Unlock layers before changing stacking order.');(data.objects[n.key]??={}).z=k+1;if(n.kind==='block')dbPlace(n.node,dbRect(n.node),k+1);if(n.media)n.media.canvas={...ceObject(n.media.canvas),z:k+1};if(n.kind==='grid')for(const cell of n.node.children){const cfg=mgConfig(state,slide.id,mgObjectID(cell));if(cfg)cfg.canvas={...ceObject(cfg.canvas),z:k+1};}});
  }
  return true;
};
function spRun(operation){
  vbEnd(false);projectFlush();
  try{const snapshot=studioEditing.read(),result=studioEditing.apply({apiVersion:1,projectId:snapshot.projectId,expectedRevision:snapshot.revision,operations:[{slideId:projectSelected,...operation}]});if(!result.ok)projectMessage(result.message);else{spSelected=operation.type==='design.remove'||operation.type==='design.clear'?[]:(operation.keys||[]).map(k=>k.startsWith('node-')?spNodeID(projectModel().tree[Number(k.slice(5))]):k).filter(Boolean);spPaint();}return result;}catch(e){projectMessage(e.message);return{ok:false,message:e.message};}
}
function spCSS(color,palette=studioPalette(projectState.brand)){
  if(!color)return'';if(color==='transparent')return'transparent';
  const hex=color.hex||palette[color.role]||'#000000';
  return 'rgba('+[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)).join(',')+','+(color.opacity??1)+')';
}
function spElement(slide,e){return e.node?e.key.startsWith('node-')?slide.querySelector('[data-vb-node="'+vbIDs.get(e.node)+'"]'):slide.querySelector('.'+e.key):slide.querySelector('[data-object-id="'+e.object+'"]');}
function spApply(slide,palette=projectState&&studioPalette(projectState.brand),state=projectState){
  if(!projectReady||!projectState)return;
  const model=slide.studioPreviewModel||projectModel(slide.dataset.mediaId);if(!model)return;
  const data=spData(state,model.id);if(data.background)slide.style.background=spCSS(data.background,palette);
  const entries=spEntries(model,state),pane=slide.querySelector(':scope > .media-original'),boxes=new Map();
  if(entries.some(e=>e.meta.z!=null)&&pane&&!pane.classList.contains('sp-stack-pane')){
    const bounds=slide.getBoundingClientRect();
    if(bounds.width&&bounds.height)for(const e of entries){const el=spElement(slide,e);if(e.node&&el&&pane.contains(el)){const b=el.getBoundingClientRect();boxes.set(el,{left:(b.left-bounds.left)/bounds.width*100+'%',top:(b.top-bounds.top)/bounds.height*100+'%',width:b.width/bounds.width*100+'%',height:b.height/bounds.height*100+'%'});}}
  }
  for(const e of entries){const el=spElement(slide,e);if(!el)continue;const m=e.meta,s=m.style||{};
    el.classList.toggle('sp-hidden',!!m.hidden);el.classList.toggle('sp-locked',!!m.locked);el.dataset.spKey=e.key;
    for(const [slot,property] of [['text','color'],['fill','backgroundColor'],['border','borderColor']])if(s[slot]!=null)el.style[property]=spCSS(s[slot],palette);
    if(s.text!=null){el.dataset.spText='true';el.style.setProperty('--sp-text',spCSS(s.text,palette));}
    if(s.borderWidth!=null||s.border!=null){el.style.borderStyle='solid';el.style.borderWidth=(s.borderWidth??1)+'px';}
    if(m.rotation!=null)el.style.rotate=m.rotation+'deg';
    if(m.z!=null){el.style.position=e.kind==='media'?'absolute':el.style.position||'relative';el.style.zIndex=String(e.z);}
    if(e.kind==='grid')for(const figure of slide.querySelectorAll('.media-box[data-mg-cell]')){figure.classList.toggle('sp-hidden',!!m.hidden);if(m.z!=null)figure.style.zIndex=String(m.z);}
  }
  if(boxes.size){pane.classList.add('sp-stack-pane');for(const [el,box] of boxes)Object.assign(el.style,box,{position:'absolute',boxSizing:'border-box',margin:'0'});}
}
const spMediaApply=mediaApply;
mediaApply=function(slide){spMediaApply(slide);spApply(slide);};
const spTheme=projectTheme;
const spCanvasVars=studioCanvasVars;
studioCanvasVars=function(root,palette){const result=spCanvasVars(root,palette);if(projectReady)for(const slide of root.querySelectorAll('.slide'))spApply(slide,palette);return result;};
projectTheme=function(...args){const result=spTheme(...args);if(projectReady){for(const slide of allSlides)spApply(slide);for(const slide of projectPreviewNode?.querySelectorAll('.slide')||[])spApply(slide);}return result;};
const spRenderPlayer=render;
render=function(...args){const result=spRenderPlayer(...args);if(projectReady&&slides[index])spApply(slides[index]);return result;};
const spTemplate=projectCreateTemplate;
projectCreateTemplate=function(template,...args){return template==='blank'?{classes:'wide studio-blank',tree:[]}:spTemplate(template,...args);};
function spCloneNode(node){const copy=projectCopy(node),id=spNodeID(node);if(id.startsWith('layer-')){const key=projectID('layer');copy.attrs.class=copy.attrs.class.replace(id,key);const meta=spData().objects[id];if(meta)spData(projectState,projectSelected,true).objects[key]=projectCopy(meta);}return copy;}
const spPack=projectPack;
projectPack=function(playback=false){const pack=spPack(playback);if(playback&&pack.state.design){const ids=new Set(pack.state.slides.map(s=>s.id));pack.state.design.slides=Object.fromEntries(Object.entries(pack.state.design.slides).filter(([id])=>ids.has(id)));}return pack;};
