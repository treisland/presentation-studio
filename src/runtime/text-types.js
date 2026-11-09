// Expose existing safe text tags without replacing inline content or identity.
const ttTypes={h1:'Heading 1',h2:'Heading 2',h3:'Heading 3',p:'Paragraph'};
projectHeading=function(model){if(/\beditor-title-removed\b/.test(model.classes||''))return null;return projectFind(model,n=>!mgHas(n,'tp-placeholder')&&['h1','h2','h3','h4','p'].includes(n.tag)&&(mgHas(n,'editor-title')||mgHas(n,'lc-slot-title')))[0]||projectFind(model,n=>!mgHas(n,'tp-placeholder')&&['h1','h2'].includes(n.tag)&&!mgHas(n,'editor-body'))[0]||null;};
function ttTarget(state,slide,path){
  if(typeof path!=='string'||!/^\d+(?:\.children\.\d+)*$/.test(path))editingFail('INVALID','Select a text block.');
  const parts=path.split('.'),node=projectAt(slide,path);
  if(!node||!['h1','h2','h3','h4','p'].includes(node.tag))editingFail('INVALID','Choose a heading or paragraph, outside tables, lists and commands.');
  for(let i=1;i<parts.length;i+=2){const ancestor=projectAt(slide,parts.slice(0,i).join('.'));if(['table','ul','ol','pre','button','select','figure'].includes(ancestor?.tag)||mgHas(ancestor,'terminal'))editingFail('INVALID','This structured content keeps its existing type.');}
  const entry=spEntries(slide,state).find(e=>e.node===slide.tree[Number(parts[0])]);
  if(entry&&spProtected(entry))editingFail('LOCKED','Unlock the selected content first.');
  return node;
}
const ttOperation=dbOperation;
dbOperation=function(state,op,created){
  if(op?.type!=='text.type')return ttOperation(state,op,created);
  if(Object.keys(op).some(k=>!['type','slideId','path','tag'].includes(k)))editingFail('INVALID','Unsupported text style field.');
  if(!Object.hasOwn(ttTypes,op.tag))editingFail('INVALID','Choose Heading 1–3 or Paragraph.');
  const slide=editingSlide(state,op.slideId),node=ttTarget(state,slide,op.path);if(node.tag===op.tag)return true;
  const title=projectHeading(slide)?.node;
  node.attrs??={};const role=node===title?'editor-title':'editor-body';if(!mgHas(node,role))node.attrs.class=((node.attrs.class||'')+' '+role).trim();
  node.tag=op.tag;return true;
};
function ttPaint(){
  const control=$('tt-control'),select=$('tt-type');if(!control)return;
  const node=vbNode(),valid=vbSelected?.kind==='text'&&['h1','h2','h3','h4','p'].includes(node?.tag);control.hidden=!valid;
  if(!valid)return;select.value=Object.hasOwn(ttTypes,node.tag)?node.tag:'';
  select.options[0].textContent=node.tag==='h4'?'Heading 4 (existing)':'Choose text style';
  try{editingSlide(projectState,projectSelected);ttTarget(projectState,projectModel(),vbSelected.path);select.disabled=vbMode!=='edit'||!weEditing()||projectPlayback||boothActive||projectDraftPending;}catch{select.disabled=true;}
}
function ttSelection(el){
  const selection=window.getSelection();if(!selection?.rangeCount)return null;
  const offset=(node,n)=>{if(!el.contains(node)&&el!==node)return null;const r=document.createRange();r.selectNodeContents(el);r.setEnd(node,n);return r.toString().length;};
  const anchor=offset(selection.anchorNode,selection.anchorOffset),focus=offset(selection.focusNode,selection.focusOffset);return anchor===null||focus===null?null:{anchor,focus};
}
function ttRestore(el,saved){
  if(!el||!saved)return;const at=offset=>{const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let node,last;while(node=walker.nextNode()){last=node;if(offset<=node.length)return[node,offset];offset-=node.length;}return last?[last,last.length]:[el,0];};
  window.getSelection().setBaseAndExtent(...at(saved.anchor),...at(saved.focus));
}
function ttChange(tag){
  if(!vbSelected)return;const selected={...vbSelected},saved=ttSelection(selected.el);vbEnd(false);projectFlush();
  const snapshot=studioEditing.read(),result=studioEditing.apply({apiVersion:1,projectId:snapshot.projectId,expectedRevision:snapshot.revision,operations:[{type:'text.type',slideId:selected.slideID,path:selected.path,tag}]});
  if(!result.ok)projectMessage(result.message);
  vbFocusPath(selected.path,'text');ttRestore(vbSelected?.el,saved);weInspect('text');wpChooseTab('content');ttPaint();$('tt-type').focus();projectCheckLayout();
}
const ttToolbar=vbToolbar;
vbToolbar=function(...args){const result=ttToolbar(...args);ttPaint();return result;};
const ttPreview=projectPreview;
projectPreview=function(...args){const result=ttPreview(...args);ttPaint();return result;};
const ttInspect=wpPaint;
wpPaint=function(...args){const result=ttInspect(...args);ttPaint();return result;};
const ttInit=projectInit;
projectInit=function(){ttInit();const label=document.createElement('label');label.id='tt-control';label.dataset.wpPart='content';label.hidden=true;label.append('Text style');const select=document.createElement('select');select.id='tt-type';select.add(new Option('Choose text style',''));select.options[0].disabled=true;for(const [value,text]of Object.entries(ttTypes))select.add(new Option(text,value));label.append(select);$('we-common').prepend(label);select.onchange=()=>ttChange(select.value);label.addEventListener('focusout',()=>setTimeout(()=>{if(vbSession&&!label.contains(document.activeElement)&&!vbSession.el.contains(document.activeElement)&&!document.activeElement?.closest('#vb-toolbar,#we-font-controls,#wp-selection-header'))vbEnd(true);},0));};
