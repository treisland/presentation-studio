// Styling and Layers share selection, validation and atomic editing operations.
let spPainting=false,spPicking=false,spSnapEnabled=true;
function spClearGuides(){document.querySelectorAll('.sp-snap-guide,.sp-snap-label').forEach(n=>n.remove());}
function spSnap(input,slide,exclude,resize=false,bypass=false,axes=['x','y']){
  spClearGuides();if(!slide||!spSnapEnabled||bypass)return input;
  const p={...input},bounds=slide.getBoundingClientRect(),model=projectModel(slide.dataset.mediaId),rects=[],excluded=new Set(Array.isArray(exclude)?exclude:[exclude]);
  for(const e of spEntries(model)){
    if(excluded.has(e.key)||e.meta.hidden||e.media?.canvas?.hidden||spProtected(e))continue;
    const el=spElement(slide,e);if(!el||el.classList.contains('sp-hidden'))continue;
    const b=el.getBoundingClientRect();if(!b.width||!b.height)continue;
    rects.push({x:(b.left-bounds.left)/bounds.width,y:(b.top-bounds.top)/bounds.height,w:b.width/bounds.width,h:b.height/bounds.height});
  }
  for(const [axis,size,pixels] of [['x','w',bounds.width],['y','h',bounds.height]]){
    if(!axes.includes(axis))continue;
    const guides=[0,.025,.05,.5,.95,.975,1,...rects.flatMap(r=>[r[axis],r[axis]+r[size]/2,r[axis]+r[size]])],anchors=resize?[p[axis]+p[size]]:[p[axis],p[axis]+p[size]/2,p[axis]+p[size]];
    let best=null;for(const guide of guides)for(const anchor of anchors){const delta=guide-anchor;if(Math.abs(delta)<=6/pixels&&(!best||Math.abs(delta)<Math.abs(best.delta)))best={delta,guide,label:'Alignment'};}
    if(!resize)for(let a=0;a<rects.length;a++)for(let b=a+1;b<rects.length;b++){
      const left=rects[a][axis]<rects[b][axis]?rects[a]:rects[b],right=left===rects[a]?rects[b]:rects[a],gap=right[axis]-left[axis]-left[size];
      if(gap<p[size])continue;const target=(left[axis]+left[size]+right[axis]-p[size])/2,delta=target-p[axis];
      if(Math.abs(delta)<=6/pixels&&(!best||Math.abs(delta)<Math.abs(best.delta)))best={delta,guide:target+p[size]/2,label:'Equal spacing'};
    }
    if(best){
      if(resize)p[size]+=best.delta;else p[axis]+=best.delta;
      const line=document.createElement('div');line.className='sp-snap-guide';line.style.cssText=axis==='x'?`left:${best.guide*100}%;top:0;height:100%`:`top:${best.guide*100}%;left:0;width:100%`;slide.append(line);
      if(best.label==='Equal spacing'){const label=document.createElement('span');label.className='sp-snap-label';label.textContent=best.label;label.style.cssText=`left:${p.x*100}%;top:${p.y*100}%`;slide.append(label);}
    }
  }
  return resize?cePlacement(p):{...p,x:Math.max(0,Math.min(1-p.w,p.x)),y:Math.max(0,Math.min(1-p.h,p.y))};
}
let spGestureHint=null;
function spMoveHint(axis,bypass){
  const node=$('vb-mode-hint');if(!node)return;
  if(!spGestureHint)spGestureHint={node,previous:node.textContent,last:''};
  const text=(axis?(axis==='x'?'Horizontal':'Vertical')+' axis locked':'Move · Shift locks axis')+' · '+(bypass?'Snapping bypassed':'Alt bypasses snap')+' · Esc cancels';
  if(node.textContent!==text)node.textContent=text;node.dataset.spGesture='move';spGestureHint.last=text;
}
function spMoveEnd(){
  if(!spGestureHint)return;const {node,previous,last}=spGestureHint;spGestureHint=null;
  if(node.textContent===last)node.textContent=previous;delete node.dataset.spGesture;
}
function spMove(gesture,origin,dx,dy,event,slide,exclude){
  const raw={x:dx,y:dy},m=gesture.movement??={active:false,raw:{x:0,y:0},anchorRaw:{x:0,y:0},anchor:{x:origin.x,y:origin.y},position:{x:origin.x,y:origin.y},shift:false,axis:null};
  if(!m.active){
    if(Math.hypot(dx*gesture.bounds.width,dy*gesture.bounds.height)<=4){spClearGuides();return null;}
    m.active=true;m.raw={x:0,y:0};
  }
  if(m.shift!==event.shiftKey){m.shift=event.shiftKey;m.axis=null;m.anchorRaw={...m.raw};m.anchor={...m.position};}
  const delta={x:raw.x-m.anchorRaw.x,y:raw.y-m.anchorRaw.y};
  if(m.shift&&!m.axis&&(delta.x||delta.y))m.axis=Math.abs(delta.x*gesture.bounds.width)>=Math.abs(delta.y*gesture.bounds.height)?'x':'y';
  const p={...origin,x:m.anchor.x+(m.axis==='y'?0:delta.x),y:m.anchor.y+(m.axis==='x'?0:delta.y)};
  p.x=Math.max(0,Math.min(1-p.w,p.x));p.y=Math.max(0,Math.min(1-p.h,p.y));
  const result=spSnap(p,slide,exclude,false,event.altKey,m.axis?[m.axis]:['x','y']);
  m.position={x:result.x,y:result.y};m.raw=raw;spMoveHint(m.axis,event.altKey);return result;
}
function spActiveKeys(){
  const entries=spEntries(),existing=spSelected.filter(k=>entries.some(e=>e.key===k));if(existing.length)return existing;
  if(wpKind==='media')return['media-'+ceSelected].filter(k=>entries.some(e=>e.key===k));
  if(wpKind==='block'&&dbSelected)return[dbSelected];
  if(wpKind==='grid'){const root=mgRoot(projectModel());return root?[spNodeID(root)||'node-'+projectModel().tree.indexOf(root)]:[];}
  if(wpKind==='text'&&vbSelected?.path){const i=Number(vbSelected.path.split('.')[0]),e=entries.find(e=>e.node===projectModel().tree[i]);if(e)return[e.key];}
  return[];
}
function spSelect(key,add=false){
  const entry=spEntries().find(e=>e.key===key);if(!entry)return;
  if(add){const keys=spActiveKeys();spSelected=keys.includes(key)?keys.filter(k=>k!==key):[...keys,key];spPaint();return;}
  spSelected=[key];spPicking=true;
  try{
    if(entry.media)ceSelect(entry.object);
    else if(entry.kind==='block'){dbSelected=key;dbPanel();weInspect('text');}
    else if(entry.kind==='grid'){mgChoose(mgCellID(entry.node.children[0]));}
    else{const index=projectModel().tree.indexOf(entry.node),el=spElement(projectPreviewNode.querySelector('.slide'),entry);if(el)vbSetSelection({el,path:String(index),kind:'card',slideID:projectSelected});else weInspect('text');}
  }finally{spPicking=false;}
  spPaint();
}
function spAction(type,extra={}){return spRun({type,keys:spActiveKeys(),...extra});}
function spCommon(entries,read){const values=entries.map(read);return values.every(v=>JSON.stringify(v)===JSON.stringify(values[0]))?values[0]:'mixed';}
function spButton(text,action,label=text){const b=document.createElement('button');b.type='button';b.textContent=text;b.setAttribute('aria-label',label);b.onclick=action;return b;}
function spPaint(){
  if(!spReady||spPainting||!projectReady)return;spPainting=true;
  try{
    const key=projectMeta.id+':'+projectSelected;if(key!==spSelectionSlide){spSelectionSlide=key;spSelected=[];}
    const entries=spEntries(),keys=spActiveKeys(),selected=entries.filter(e=>keys.includes(e.key)),readOnly=!weEditing()||vbMode!=='edit'||ceLocked(),locked=readOnly||selected.some(spProtected);
    const canvas=projectPreviewNode?.querySelector('.slide');if(canvas)for(const entry of entries){const el=spElement(canvas,entry);if(el)el.dataset.spSelected=String(keys.includes(entry.key));}
    $('sp-selection').textContent=selected.length?selected.length===1?(selected[0].meta.name||selected[0].name):selected.length+' layers selected':'Slide background';
    $('sp-slot').querySelector('[value="background"]').disabled=selected.length>0;
    for(const option of $('sp-slot').options)if(option.value!=='background')option.disabled=!selected.length;
    if(selected.length&&$('sp-slot').value==='background')$('sp-slot').value='text';if(!selected.length)$('sp-slot').value='background';
    const slot=$('sp-slot').value,value=selected.length?spCommon(selected,e=>e.meta.style?.[slot]??null):spData().background??null;
    $('sp-value').textContent=value==='mixed'?'Mixed':value===null?'Inherit from theme':value==='transparent'?'Transparent':value.role?'Theme: '+value.role:value.hex;
    $('sp-hex').value=value?.hex||studioPalette(projectState.brand)[value?.role]||'#0066ff';$('sp-color-picker').value=$('sp-hex').value;$('sp-hex').removeAttribute('aria-invalid');$('sp-opacity').value=Math.round((typeof value==='object'&&value?.opacity!=null?value.opacity:1)*100);
    $('sp-hex').disabled=locked;$('sp-color-picker').disabled=locked;
    $('sp-border-width').value=selected.length?spCommon(selected,e=>e.meta.style?.borderWidth??0)==='mixed'?'':selected[0].meta.style?.borderWidth??0:0;
    $('sp-rotation').value=selected.length?spCommon(selected,e=>e.meta.rotation??0)==='mixed'?'':selected[0].meta.rotation??0:0;
    $('sp-name').value=selected.length===1?selected[0].meta.name||selected[0].name:'';
    $('sp-copy').disabled=!selected.length;$('sp-paste').disabled=locked||!selected.length||!spClipboard;
    for(const id of ['sp-custom','sp-inherit','sp-transparent','sp-border-width','sp-rotation','sp-preset','sp-delete-selection'])$(id).disabled=locked||(id!=='sp-custom'&&id!=='sp-inherit'&&id!=='sp-transparent'&&!selected.length);
    $('sp-rotation').disabled=locked||!selected.length||selected.some(e=>e.kind==='grid');
    if(mgMember(ceSelected)){const root=mgRoot(projectModel());if(root&&spMeta(spNodeID(root)).locked)$('ce-object-lock').disabled=true;}
    for(const id of ['ce-back','ce-front'])if(mgMember(ceSelected))$(id).disabled=true;
    $('sp-clear').disabled=readOnly||entries.some(spProtected);$('sp-name').disabled=locked||selected.length!==1;
    const palette=studioPalette(projectState.brand),swatches=$('sp-swatches');swatches.replaceChildren();
    for(const role of spRoles){const b=spButton(role,()=>spSetColor({role,opacity:Number($('sp-opacity').value)/100}),'Theme '+role);b.style.setProperty('--sp-color',palette[role]);b.className='sp-swatch';b.setAttribute('aria-pressed',String(value?.role===role));b.disabled=locked;swatches.append(b);}
    const custom=$('sp-project-colors');custom.replaceChildren();
    for(const [index,color] of (projectState.design?.palette||[]).entries()){
      const row=document.createElement('div'),b=spButton(color.name,()=>spSetColor({hex:color.hex,opacity:Number($('sp-opacity').value)/100}),color.name+' '+color.hex);b.className='sp-swatch';b.style.setProperty('--sp-color',color.hex);b.disabled=locked;b.setAttribute('aria-pressed',String(value?.hex===color.hex));const remove=spButton('×',()=>spRun({type:'design.palette',colors:projectState.design.palette.filter((_,i)=>i!==index)}),'Remove swatch '+color.name);remove.disabled=readOnly;row.append(b,remove);custom.append(row);
    }
    $('sp-save-color').disabled=readOnly||(projectState.design?.palette?.length||0)>=24;
    const colorHex=v=>v&&v!=='transparent'?(v.hex||palette[v.role]):null,lum=hex=>{const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];};
    const first=selected[0],fg=first&&colorHex(first.meta.style?.text)||palette.ink,bg=first&&colorHex(first.meta.style?.fill)||colorHex(spData().background)||palette.background;
    const ratio=(Math.max(lum(fg),lum(bg))+.05)/(Math.min(lum(fg),lum(bg))+.05);
    $('sp-contrast').textContent=ratio.toFixed(2)+':1 text contrast'+(ratio<4.5?' — below 4.5:1':'')+'. Estimate for solid colors; opacity and images can change contrast.';
    const list=$('sp-layers'),focus=document.activeElement?.dataset.spFocus;list.replaceChildren();
    const background=document.createElement('p');background.className='sp-background-label';background.textContent='Background — pinned below content';
    for(const entry of [...entries].sort((a,b)=>-spStackOrder(a,b))){
      const row=document.createElement('div');row.className='sp-layer-row';row.dataset.key=entry.key;row.draggable=!readOnly&&!spProtected(entry)&&!(entry.media?.layout==='background'&&!entry.media.canvas?.placement);row.classList.toggle('selected',keys.includes(entry.key));
      const check=document.createElement('input');check.type='checkbox';check.checked=keys.includes(entry.key);check.dataset.spFocus=entry.key+'-multi';check.setAttribute('aria-label','Include '+(entry.meta.name||entry.name)+' in selection');check.onchange=()=>spSelect(entry.key,true);
      const choose=spButton(enLabel(entry),()=>spSelect(entry.key),entry.type+': '+enLabel(entry));choose.title=entry.preview;choose.setAttribute('aria-pressed',String(keys.includes(entry.key)));choose.dataset.spFocus=entry.key;const preview=document.createElement('small');preview.textContent=entry.preview.slice(0,55);preview.className='en-preview';choose.append(preview);row.append(check,choose);
      const concealed=visibilityEntryHidden(projectState,projectSelected,entry),hide=spButton(concealed?'Show':'Hide',()=>spRun({type:'design.meta',keys:[entry.key],changes:{hidden:!concealed}}),(concealed?'Show ':'Hide ')+(entry.meta.name||entry.name));hide.disabled=readOnly||spProtected(entry);
      if(concealed){const status=document.createElement('small');status.textContent='Hidden';row.append(status);}
      const ownLock=!!entry.meta.locked||!!entry.media?.canvas?.locked,lock=spButton(ownLock?'Unlock':'Lock',()=>{if(entry.media?.canvas?.locked){ceSelect(entry.object);$('ce-object-lock').click();}else spRun({type:'design.meta',keys:[entry.key],changes:{locked:!entry.meta.locked}});},(ownLock?'Unlock ':'Lock ')+(entry.meta.name||entry.name));lock.disabled=readOnly;row.append(hide,lock);
      for(const [text,direction] of [['↑','forward'],['↓','backward']]){const b=spButton(text,()=>spRun({type:'design.reorder',keys:[entry.key],direction}),'Move '+(entry.meta.name||entry.name)+' '+direction);b.disabled=!row.draggable;row.append(b);}
      row.ondragstart=e=>{e.dataTransfer.setData('text/x-studio-layer',entry.key);};row.ondragover=e=>{if(e.dataTransfer.types.includes('text/x-studio-layer'))e.preventDefault();};
      row.ondrop=e=>{const source=e.dataTransfer.getData('text/x-studio-layer');if(!source)return;e.preventDefault();if(source!==entry.key)spRun({type:'design.reorder',keys:[source],target:entry.key});};
      row.onkeydown=e=>{if(e.altKey&&['ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();spRun({type:'design.reorder',keys:[entry.key],direction:e.key==='ArrowUp'?'forward':'backward'});}};
      choose.prepend({block:'■ ',grid:'▦ ',media:'▧ ',content:'¶ '}[entry.kind]);
      for(const [i,button] of [...row.querySelectorAll('button')].entries())if(button!==choose)button.dataset.spFocus=entry.key+'-action-'+i;
      const group=document.createElement('div');group.setAttribute('role','listitem');group.append(row);list.append(group);
      if(entry.kind==='grid'){const cells=document.createElement('div');cells.setAttribute('role','list');cells.setAttribute('aria-label','Grid cells');group.append(cells);for(const [i,cell] of entry.node.children.entries()){
        const cfg=mgConfig(projectState,projectSelected,mgObjectID(cell)),child=spButton('↳ Cell '+(i+1)+': '+(cfg?.name||'empty'),()=>{spSelected=[];mgChoose(mgCellID(cell));},'Select Grid cell '+(i+1)),item=document.createElement('div');child.className='sp-grid-child';item.setAttribute('role','listitem');item.append(child);cells.append(item);
      }}
    }
    background.setAttribute('role','listitem');list.append(background);if(focus)(list.querySelector('[data-sp-focus="'+focus+'"]')||list.querySelector('.selected button'))?.focus();
  }finally{spPainting=false;}
}
function spSetColor(color){const slot=$('sp-slot').value;spRun(slot==='background'?{type:'design.background',color}:{type:'design.appearance',keys:spActiveKeys(),style:{[slot]:color}});}
const spPaintWorkspace=wpPaint;
wpPaint=function(...args){spPaintWorkspace(...args);spPaint();};
const spWorkspaceSelection=wpSelection;
wpSelection=function(){const s=spWorkspaceSelection(),keys=spActiveKeys();return{...s,locked:s.locked||spEntries().some(e=>keys.includes(e.key)&&spProtected(e))};};
const spStartText=vbStart;
vbStart=function(selection){
  const i=Number(selection?.path?.split('.')[0]),root=projectModel()?.tree[i];
  if(root&&spMeta(spNodeID(root)).locked){vbSetSelection(selection);return;}
  return spStartText(selection);
};
const spSelectText=vbSetSelection;
vbSetSelection=function(...args){if(!spPicking)spSelected=[];const r=spSelectText(...args);spPaint();return r;};
const spSelectMedia=ceSelect;
ceSelect=function(...args){if(!spPicking)spSelected=[];const r=spSelectMedia(...args);spPaint();return r;};
let spLastBlock='';
const spSelectBlock=dbPanel;
dbPanel=function(...args){if(!spPicking&&spLastBlock!==dbSelected)spSelected=[];spLastBlock=dbSelected;return spSelectBlock(...args);};
const spSelectGrid=mgChoose;
mgChoose=function(...args){if(!spPicking)spSelected=[];return spSelectGrid(...args);};
const spInspect=weInspect;
weInspect=function(context,select=true){if(context==='slide'&&select&&!spPicking)spSelected=[];return spInspect(context,select);};
const spInit=projectInit;
projectInit=function(){
  spInit();wpNames.layers='Layers';const tab=spButton('Layers',()=>wpChooseTab('layers'));tab.id='wp-tab-layers';tab.setAttribute('role','tab');tab.setAttribute('aria-controls','wp-fields');tab.setAttribute('aria-selected','false');tab.tabIndex=-1;$('wp-tabs').append(tab);
  $('wp-style-hint').textContent='Use Appearance for object styles; select text on the canvas for inline Bold/Italic formatting.';
  $('db-layer').max='1000';
  const style=document.createElement('section');style.id='sp-style';style.dataset.wpPart='style';style.innerHTML='<h3>Appearance</h3><p id="sp-selection"></p><label>Color target<select id="sp-slot"><option value="text">Text</option><option value="fill">Fill</option><option value="border">Border</option><option value="background">Slide background</option></select></label><p id="sp-value" role="status"></p><div id="sp-swatches" aria-label="Theme swatches"></div><label>Custom hex<input id="sp-hex" maxlength="7" value="#0066ff"></label><label>Opacity (%)<input id="sp-opacity" type="number" min="0" max="100" value="100"></label><div class="sp-actions"><button id="sp-custom">Apply custom</button><button id="sp-inherit">Inherit from theme</button><button id="sp-transparent">Transparent</button></div><p id="sp-contrast" role="status"></p><label>Border width (px)<input id="sp-border-width" type="number" min="0" max="24"></label><label>Style preset<select id="sp-preset"><option value="">Choose a preset</option><option value="accent">Accent</option><option value="outline">Outline</option><option value="quiet">Quiet</option></select></label><div class="sp-actions"><button id="sp-copy">Copy appearance</button><button id="sp-paste">Paste appearance</button></div><h4>Project colors</h4><div id="sp-project-colors"></div><label>Swatch name<input id="sp-swatch-name" maxlength="40"></label><button id="sp-save-color">Save custom color</button>';
  $('wp-fields').prepend(style);
  const customHex=$('sp-hex').closest('label'),customColor=document.createElement('div');customColor.className='sp-custom-color';customHex.before(customColor);
  const pickerLabel=document.createElement('label');pickerLabel.textContent='Color picker';const picker=document.createElement('input');picker.id='sp-color-picker';picker.type='color';picker.value='#0066ff';pickerLabel.append(picker);customColor.append(pickerLabel,customHex);
  $('sp-swatches').setAttribute('role','group');
  const layers=document.createElement('section');layers.id='sp-layer-panel';layers.dataset.wpPart='layers';layers.innerHTML='<h3>Layers</h3><p>Frontmost first. Select rows to inspect; check boxes to style several layers. Alt+Up/Down reorders one step.</p><div id="sp-layers" aria-label="Slide layers"></div><label>Layer name<input id="sp-name" maxlength="80"></label><button id="sp-delete-selection">Clear selected objects</button>';$('wp-fields').append(layers);
  $('sp-layers').setAttribute('role','list');
  const arrange=document.createElement('section');arrange.dataset.wpPart='arrange';arrange.innerHTML='<label>Rotation (degrees)<input id="sp-rotation" type="number" min="-180" max="180"></label><label><input id="sp-snap" type="checkbox" checked> Snap to alignment and equal spacing</label><p>Alt bypasses snapping. Guides use a consistent screen-pixel tolerance.</p>';$('wp-fields').prepend(arrange);
  const clear=spButton('Clear slide contents…',()=>{const id=projectSelected,snapshot=studioEditing.read();projectConfirm('Clear this slide?','All content and media will be removed. Slide identity, section, theme and background remain. Undo and recovery retain the removed content.',()=>{if(id!==projectSelected||snapshot.revision!==studioEditing.read().revision){projectMessage('The project changed. Review the slide again.');return;}spRun({type:'design.clear'});});});clear.id='sp-clear';clear.dataset.wpPart='content';$('wp-fields').append(clear);
  $('sp-slot').onchange=spPaint;$('sp-custom').onclick=()=>spSetColor({hex:$('sp-hex').value,opacity:Number($('sp-opacity').value)/100});$('sp-inherit').onclick=()=>spSetColor(null);$('sp-transparent').onclick=()=>spSetColor('transparent');
  $('sp-color-picker').oninput=()=>{$('sp-hex').value=$('sp-color-picker').value;$('sp-hex').removeAttribute('aria-invalid');};
  $('sp-hex').oninput=()=>{const valid=/^#[0-9a-f]{6}$/i.test($('sp-hex').value);$('sp-hex').setAttribute('aria-invalid',String(!valid));if(valid)$('sp-color-picker').value=$('sp-hex').value.toLowerCase();};
  $('sp-border-width').onchange=()=>spAction('design.appearance',{style:{borderWidth:Number($('sp-border-width').value)}});
  $('sp-rotation').onchange=()=>spAction('design.meta',{changes:{rotation:Number($('sp-rotation').value)}});
  $('sp-name').onchange=()=>spAction('design.meta',{changes:{name:$('sp-name').value}});
  $('sp-copy').onclick=()=>{const e=spEntries().find(e=>spActiveKeys().includes(e.key));if(e){spClipboard=projectCopy({text:null,fill:null,border:null,borderWidth:0,...e.meta.style});spPaint();}};
  $('sp-paste').onclick=()=>spAction('design.appearance',{style:spClipboard});
  $('sp-preset').onchange=()=>{const value=$('sp-preset').value;if(value)spAction('design.appearance',{style:{text:{role:value==='accent'?'accentInk':'ink'},fill:value==='accent'?{role:'accent'}:value==='quiet'?{role:'surface'}:'transparent',border:{role:'accent'},borderWidth:value==='outline'?2:0}});};
  $('sp-save-color').onclick=()=>spRun({type:'design.palette',colors:[...(projectState.design?.palette||[]),{name:$('sp-swatch-name').value.trim(),hex:$('sp-hex').value}]});
  $('sp-delete-selection').onclick=()=>spAction('design.remove');$('sp-snap').onchange=()=>{spSnapEnabled=$('sp-snap').checked;};
  spReady=true;spPaint();
};
