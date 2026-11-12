// Selection explanations and announcements are editor session state only.
let sgReady=false,sgSignature='';
function sgText(id,text){const node=$(id);if(node&&node.textContent!==text)node.textContent=text;}
function sgDescription(){
  const context=icSelection(),entries=context.selected,entry=entries.find(e=>e.key===icMember)||entries[0],group=entries[0]?.meta.group;
  let text=entries.length===1?enType(entry)+' · '+enLabel(entry):entries.length>1?(group&&entries.every(e=>e.meta.group===group)?enGroupLabel(projectState,projectSelected,group)+' · ':'Multiple selection · ')+entries.length+' items':'Slide background/settings · '+(projectModel()?.title||'Slide');
  if(gsEditing)text='Editing member '+(entry?enLabel(entry):'')+' in '+enGroupLabel(projectState,projectSelected,gsEditing);
  else if(icMember)text='Inspecting member '+(entry?enLabel(entry):'')+' of the shared selection';
  if(vbSession)text='Editing text · '+text;
  let reason='';
  if(vbMode!=='edit')reason='Preview is view-only. Choose Edit blocks to change content.';
  else if(projectState.editLocked)reason='Locked: make the presentation editable before changing its content.';
  else if(projectModel()?.editLocked)reason='Locked: unlock this slide in Arrange before changing its items.';
  else if(entries.some(spProtected))reason='Locked: unlock selected items in Layers. A group moves only when every member is unlocked.';
  else if(entries.length&&entries.some(e=>!gsFree(e)))reason='Template-managed: use Enable free positioning for eligible items, or their specialized Content/layout controls.';
  return {context,entries,text,reason};
}
function sgPaint(){
  if(!sgReady||!projectReady)return;
  const {context,entries,text,reason}=sgDescription();sgText('sg-context',text);sgText('sg-reason',reason);$('sg-reason').hidden=!reason;
  $('sg-exit').hidden=!gsEditing&&!icMember;$('sg-layers').disabled=!entries.length;
  const media=entries.length===1&&entries[0].kind==='media';
  sgText('sg-keyboard','Focus a Move grip and use Arrow keys: '+(media?'0.1%':'0.2%')+' of slide width/height per step; Shift uses 1%. Arrange offers numeric percentages for individual free items and alignment controls for selections. These are slide-relative units, not screen pixels. Escape cancels an active gesture.');
  const signature=[projectMeta.id,projectSelected,context.kind,entries.map(e=>e.key).join(','),text,reason].join('|');
  if(signature!==sgSignature){sgSignature=signature;sgText('sg-announcement',text+(reason?'. '+reason:''));}
}
function sgAnnounceMove(action='Moved'){
  if(!sgReady)return;const {entries,text}=sgDescription();if(!entries.length||!entries.every(gsFree))return;
  const p=gsBounds(entries),percent=value=>(value*100).toFixed(1)+'%';
  sgText('sg-announcement',action+' '+text+'. X '+percent(p.x)+', Y '+percent(p.y)+(action==='Resized'?', width '+percent(p.w)+', height '+percent(p.h):'')+'.');
}
const sgContext=icPaint;icPaint=function(...args){const value=sgContext(...args);sgPaint();return value;};
const sgInline=vbStart;vbStart=function(...args){const value=sgInline(...args);sgPaint();return value;};
const sgGroup=gsPaint;gsPaint=function(...args){const value=sgGroup(...args);sgPaint();return value;};
const sgInit=projectInit;projectInit=function(...args){
  const value=sgInit(...args);if(sgReady)return value;
  const guide=document.createElement('section');guide.id='sg-guide';guide.tabIndex=0;guide.setAttribute('aria-label','Canvas selection guidance');
  guide.innerHTML='<p id="sg-context"></p><p id="sg-reason"></p><div><button id="sg-exit">Back to group/shared selection</button><button id="sg-layers">Find in Layers</button></div><details><summary>Keyboard and positioning help</summary><p id="sg-keyboard"></p></details><p id="sg-announcement" class="we-sr-only" role="status" aria-live="polite" aria-atomic="true"></p>';
  $('wp-selection-header').after(guide);
  $('sg-exit').onclick=()=>{vbEnd(false);if(gsEditing)gsExit();else{icMember='';icPaint();componentPaint();}};
  $('sg-layers').onclick=()=>{const key=sgDescription().entries[0]?.key;$('ld-reveal-layers').click();[...$('sp-layers').querySelectorAll('.sp-layer-row')].find(row=>row.dataset.key===key)?.querySelector('button')?.focus({preventScroll:false});};
  sgReady=true;sgPaint();return value;
};
