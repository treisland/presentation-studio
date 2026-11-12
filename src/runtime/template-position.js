// Conversion is explicit. An empty measured placeholder preserves the source layout.
function tpNode(slide,path){if(typeof path!=='string'||!/^\d+(?:\.children\.\d+)*$/.test(path))editingFail('INVALID','Select template content.');return projectAt(slide,path);}
function tpParent(slide,path){const parts=path.split('.'),index=Number(parts.pop());return{parent:parts.reduce((node,key)=>node[key],slide.tree),index};}
function tpAnchor(slide,record){return projectFind(slide,node=>mgHas(node,record.anchor)&&mgHas(node,'tp-placeholder'))[0];}
// Pure DOM helper is also embedded into the standalone booth player.
function authoringGeometry(root){
  const nodes=[root,...root.querySelectorAll('.tp-placeholder,.db-template,.an-line')];
  for(const element of nodes){const tokens=element.getAttribute('class')||'',read=name=>Number(tokens.match(new RegExp('\\ban-'+name+'-(\\d+)'))?.[1]||0);
    if(element.classList.contains('tp-placeholder')){element.style.width=(tokens.match(/\btp-w-(\d+)/)?.[1]||0)+'px';element.style.height=(tokens.match(/\btp-h-(\d+)/)?.[1]||0)+'px';element.setAttribute('aria-hidden','true');}
    if(element.classList.contains('db-template')){element.style.setProperty('--tp-display',tokens.match(/\btp-display-([\w-]+)/)?.[1]||'block');element.style.setProperty('--tp-padding',(tokens.match(/\btp-pad-([\d-]+)/)?.[1]||'0').split('-').map(n=>n+'px').join(' '));}
    if(element.classList.contains('an-line')){const box=element.parentElement;if(!box)continue;const dx=(read('ex')-read('x'))/10000*box.clientWidth,dy=(read('ey')-read('y'))/10000*box.clientHeight;element.style.left=read('x')/100+'%';element.style.top=read('y')/100+'%';element.style.width=Math.hypot(dx,dy)+'px';element.style.height=read('s')+'px';element.style.transform='rotate('+Math.atan2(dy,dx)*180/Math.PI+'deg)';}
  }
}
const tpValidate=projectValidateState;
projectValidateState=function(raw,...args){const state=tpValidate(raw,...args);for(const [id,data]of Object.entries(raw.design?.slides||{}))for(const [key,meta]of Object.entries(data.objects||{}))if(meta.templatePosition&&state.design?.slides[id]?.objects[key]){
  const record=meta.templatePosition;
  if(!/^tp-anchor-[\w-]+$/.test(record.anchor)||typeof record.originalClass!=='string'||record.originalClass.length>2000||typeof record.originalStyle!=='string'||record.originalStyle.length>4000)editingFail('INVALID','Invalid template reset record.');
  const valid=projectValidateTree([projectNode('div',record.originalClass,[])]);record.originalClass=valid[0].attrs.class||'';record.originalStyle=projectSafeStyle(record.originalStyle);
  state.design.slides[id].objects[key].templatePosition=projectCopy(record);
}return state;};
editingRegisterOperation('template.customize',(state,op,created)=>{
  const slide=editingSlide(state,op.slideId),node=tpNode(slide,op.path);if(!node?.tag||dbID(node)||mgHas(node,'tp-placeholder')||icContains(node,item=>mgHas(item,'mg-grid')||item.tag==='table'||mgHas(item,'terminal')||item.tag==='figure'))editingFail('INVALID','Use the existing media/grid/table controls for structured content. Select ordinary template text, a card or section.');
  const root=spEntries(slide,state).find(entry=>entry.node===slide.tree[Number(op.path.split('.')[0])]);if(root&&spProtected(root))editingFail('LOCKED','Unlock template content first.');
  const {x,y,w,h}=op.placement||{};if(![x,y,w,h,op.width,op.height,...(op.padding||[])].every(Number.isFinite)||!['block','flex','grid','inline-block'].includes(op.display)||op.padding.length!==4||op.padding.some(n=>n<0||n>400)||op.width<1||op.width>1920||op.height<1||op.height>1080)editingFail('INVALID','Measure the selected template content first.');
  const location=tpParent(slide,op.path),anchor=projectID('tp-anchor'),id=projectID('block'),originalClass=node.attrs?.class||'',originalStyle=node.attrs?.style||'';
  const placeholder=projectCopy(node);placeholder.children=[];placeholder.attrs={class:originalClass.split(/\s+/).filter(token=>!/^layer-|^block-/.test(token)).join(' ')+' tp-placeholder '+anchor+' tp-w-'+Math.round(op.width)+' tp-h-'+Math.round(op.height)};
  location.parent.splice(location.index,1,placeholder);node.attrs??={};node.attrs.class=originalClass+' db-block db-template '+id+' tp-display-'+op.display+' tp-pad-'+op.padding.map(Math.round).join('-');
  dbPlace(node,op.placement,root?.z||4);slide.tree.push(node);
  const data=spData(state,slide.id,true),meta=data.objects[id]=root&&op.path===String(slide.tree.indexOf(placeholder))?projectCopy(root.meta):{};
  if(root&&op.path===String(slide.tree.indexOf(placeholder)))meta.autoName=root.autoName;
  meta.templatePosition={anchor,originalClass,originalStyle};created.push(id);
});
editingRegisterOperation('template.reset',(state,op,created)=>{
  const slide=editingSlide(state,op.slideId),entry=componentTargets(state,slide,[op.key],false)[0],record=entry.meta.templatePosition,anchor=record&&tpAnchor(slide,record);if(!anchor)editingFail('NOT_FOUND','This independent copy has no template position to reset.');if(entry.meta.group)editingFail('INVALID','Ungroup this element before resetting its template position.');
  const node=entry.node;node.attrs.style=record.originalStyle+';'+(node.attrs.style||'').split(';').filter(rule=>!/^\s*(position|left|top|width|height|z-index)\s*:/i.test(rule)).join(';');
  node.attrs.class=node.attrs.class.split(/\s+/).filter(token=>!/^db-(block|template)$|^block-|^tp-(display|pad)-/.test(token)).join(' ');
  const stable=spNodeID(node)||projectID('layer');if(!spNodeID(node))node.attrs.class+=' '+stable;
  slide.tree.splice(slide.tree.indexOf(node),1);const location=tpParent(slide,tpAnchor(slide,record).path);location.parent.splice(location.index,1,node);const meta=projectCopy(entry.meta);delete meta.templatePosition;spData(state,slide.id,true).objects[stable]=meta;delete spData(state,slide.id,true).objects[entry.key];created.push(stable);
});
const tpDOM=projectDOM;
projectDOM=function(node){const element=tpDOM(node);if(element.nodeType===1){const tokens=node.attrs?.class||'';
  if(mgHas(node,'tp-placeholder')){element.style.width=(tokens.match(/\btp-w-(\d+)/)?.[1]||0)+'px';element.style.height=(tokens.match(/\btp-h-(\d+)/)?.[1]||0)+'px';element.setAttribute('aria-hidden','true');}
  if(mgHas(node,'db-template')){element.style.setProperty('--tp-display',tokens.match(/\btp-display-([\w-]+)/)?.[1]||'block');element.style.setProperty('--tp-padding',(tokens.match(/\btp-pad-([\d-]+)/)?.[1]||'0').split('-').map(n=>n+'px').join(' '));}
}return element;};
const tpAfter=editingAfterOperation;
editingAfterOperation=function(state,op,created){tpAfter(state,op,created);if(op.type!=='template.customize')for(const key of created){const meta=spData(state,op.slideId).objects[key];if(meta)delete meta.templatePosition;}if(op.type==='layout.apply'){const slide=state.slides.find(slide=>slide.id===op.slideId);for(const entry of spEntries(slide,state))if(entry.meta.templatePosition){delete entry.meta.templatePosition;projectWalk([entry.node],node=>{if(node.tag){node.attrs??={};node.attrs.class=(node.attrs.class||'').replace(/\b(editor-title|lc-slot-[\w-]+)\b/g,'')+' editor-body';}});}}};
function tpSelection(){const context=icSelection(),inline=vbSelected?.path;const keys=spActiveKeys(),entry=spEntries().find(item=>keys.includes(item.key));return{entry,path:inline||entry?.node&&String(projectModel().tree.indexOf(entry.node)),context};}
function tpCustomize(){const {path,entry}=tpSelection();vbEnd(false);projectFlush();const element=[...projectPreviewNode.querySelectorAll('[data-vb-path]')].find(element=>element.dataset.vbPath===path)||(!path?.includes('.children.')&&entry?spElement(projectPreviewNode.querySelector('.slide'),entry):null);if(!element){projectMessage('Select template text or a section on the canvas or in Layers.');return;}const slide=element.closest('.slide'),bounds=slide.getBoundingClientRect(),box=element.getBoundingClientRect(),style=getComputedStyle(element),scale=projectPreviewNode.getBoundingClientRect().width/1920;
  const result=componentRun({type:'template.customize',path,placement:{x:(box.left-bounds.left)/bounds.width,y:(box.top-bounds.top)/bounds.height,w:box.width/bounds.width,h:box.height/bounds.height},width:box.width/scale,height:box.height/scale,display:['flex','grid','inline-block'].includes(style.display)?style.display:'block',padding:['Top','Right','Bottom','Left'].map(side=>parseFloat(style['padding'+side])||0)});if(result.ok&&result.created[0])spSelect(result.created[0]);
}
function tpPanel(){if(!$('tp-panel')||!projectReady)return;const {entry,path,context}=tpSelection(),custom=entry?.meta.templatePosition,locked=context.locked||!!entry&&spProtected(entry);const template=entry?.node&&!dbID(entry.node),structured=template&&icContains(entry.node,node=>mgHas(node,'mg-grid')||node.tag==='table'||mgHas(node,'terminal')),valid=template&&!structured&&context.selected.length===1;
  if($('tp-layout-note'))$('tp-layout-note').hidden=!spEntries().some(entry=>entry.meta.templatePosition);
  $('tp-panel').hidden=!custom&&!template;
  const explanation=context.selected.length>1?'Select one template item to enable free positioning.':structured?'This structured item follows its layout. Use Content for table, code or grid settings; media uses Arrange → Change placement. Free positioning is unavailable here.':'Template-managed position. Enable free positioning to move this item independently of its layout.';
  $('tp-status').textContent=(custom?'Free positioning · content remains editable. Reset to template position restores its layout.':explanation)+(locked?' Unlock the item or presentation before changing its position.':'');
  $('tp-customize').hidden=!!custom||!valid;$('tp-reset').hidden=!custom;$('tp-customize').disabled=locked||!path||!valid;$('tp-reset').disabled=locked||!custom||!tpAnchor(projectModel(),custom);
}
const tpPaint=icPaint;
icPaint=function(...args){const result=tpPaint(...args);tpPanel();return result;};
const tpInit=projectInit;
projectInit=function(){tpInit();const panel=document.createElement('section');panel.id='tp-panel';panel.dataset.wpPart='arrange';panel.innerHTML='<h3>Template position</h3><p id="tp-status"></p><button id="tp-customize" aria-describedby="tp-status">Enable free positioning</button><button id="tp-reset" aria-describedby="tp-status">Reset to template position</button>';$('wp-fields').prepend(panel);const note=document.createElement('p');note.id='tp-layout-note';note.textContent='Retaining content keeps customized blocks at their current positions as independent blocks. A new layout removes their old Reset-to-template link; Undo restores it. Replacing content uses the new template prompts.';$('studio-gallery').append(note);$('tp-customize').onclick=tpCustomize;$('tp-reset').onclick=()=>{const entry=tpSelection().entry;const result=componentRun({type:'template.reset',key:entry.key});if(result.ok&&result.created[0])spSelect(result.created[0]);};tpPanel();};
