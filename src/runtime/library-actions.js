// Permanent controls and contextual shortcuts share the original Library handlers.
function clAction(button, action, icon, label, accessible) {
  button.dataset.clAction = action;
  acButton(button,icon,label,true);
  if (accessible) button.setAttribute('aria-label',accessible);
  return button;
}
function clFocus(id,action='rename') {
  const cards=[...$('component-items').querySelectorAll('article')];
  const card=cards.find(card=>card.dataset.clSavedId===id);
  (card?.querySelector(`[data-cl-action="${action}"]`) || $('component-search')).focus();
}
function clCards() {
  const saved=$('component-category').value==='Library';
  const items=componentLibrary.filter(item=>item.name.toLowerCase().includes($('component-search').value.toLowerCase()));
  for (const [index,card] of [...$('component-items').querySelectorAll('article')].entries()) {
    for(const button of card.querySelectorAll('button')) {
      const label=button.textContent.trim();
      if(label.startsWith('Insert '))clAction(button,'insert','plus',label.includes('image or video')?'Choose media…':'Insert',label);
    }
    if(!saved)continue;
    const item=items[index],options=card.querySelector('details');if(!item||!options)continue;
    card.dataset.clSavedId=item.id;
    const input=options.querySelector('input');
    const oldButtons=[...options.querySelectorAll('button')];
    const commit=oldButtons.find(b=>b.textContent==='Rename'),copy=oldButtons.find(b=>b.textContent==='Duplicate preset'),remove=oldButtons.find(b=>b.textContent==='Delete preset');
    const panel=document.createElement('div');panel.className='cl-rename';panel.hidden=true;
    const label=document.createElement('label');label.textContent='Component name';label.append(input);
    const rename=componentButton('Rename',()=>{panel.hidden=false;input.value=item.name;input.focus();input.select();});
    clAction(rename,'rename','rename','Rename','Rename '+item.name);
    commit.hidden=false;clAction(commit,'commit','check','Save name','Save component name');
    const oldCommit=commit.onclick;commit.onclick=()=>{if(!input.value.trim()){input.setCustomValidity('Enter a component name.');input.reportValidity();return;}oldCommit();clFocus(item.id);};
    input.oninput=()=>input.setCustomValidity('');
    const cancel=componentButton('Cancel',()=>{input.value=item.name;input.setCustomValidity('');panel.hidden=true;rename.focus();});
    input.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();cancel.click();}if(event.key==='Enter'){event.preventDefault();commit.click();}});
    panel.append(label,commit,cancel);
    const actions=document.createElement('div');actions.className='cl-card-actions';actions.setAttribute('role','group');actions.setAttribute('aria-label','Manage saved '+item.name);
    copy.hidden=false;remove.hidden=false;
    clAction(copy,'duplicate','duplicate','Duplicate','Duplicate saved component '+item.name);
    clAction(remove,'delete','trash','Delete','Delete saved component '+item.name);
    const oldCopy=copy.onclick;copy.onclick=()=>{const count=componentLibrary.length;oldCopy();clFocus(componentLibrary.length>count?componentLibrary.at(-1)?.id:componentLibrary[Math.min(index,componentLibrary.length-1)]?.id);};
    const oldRemove=remove.onclick;remove.onclick=()=>{oldRemove();clFocus(componentLibrary[Math.min(index,componentLibrary.length-1)]?.id);};
    const count=document.createElement('small');count.className='cl-object-count';count.textContent=`${item.entries.length} object${item.entries.length===1?'':'s'}`;
    actions.append(rename,copy,remove);options.replaceWith(count,actions,panel);
  }
}
const clList=componentList;
componentList=function(...args){const result=clList(...args);clCards();clSaveState();return result;};
// Read the same permanent actions rather than matching icon-decorated text.
const clCatalog=cmCatalog;
cmCatalog=function(card){
  const inserts=[...card.querySelectorAll('[data-cl-action="insert"]')];
  if(!inserts.length)return clCatalog(card);
  const rows=inserts.map(button=>({label:button.getAttribute('aria-label'),disabled:button.disabled||!weEditing()||ceLocked(),action:()=>button.click()}));
  if(card.dataset.clSavedId){
    const action=key=>card.querySelector(`[data-cl-action="${key}"]`);
    rows.push({label:'Rename saved component…',action:()=>action('rename').click()},
      {label:'Duplicate saved component',action:()=>action('duplicate').click()},
      cmButton('Export library…','component-export'),
      {label:'Delete saved component',danger:true,action:()=>action('delete').click()});
  }
  return rows;
};
function clSaveState(){
  if(!$('cl-save-reason'))return;
  const available=componentCanSave();$('component-save').disabled=!available;
  $('cl-save-reason').textContent=available?'Selected objects are saved as an independent reusable component.':'Select unlocked free objects in Edit mode to save a component.';
}
const clPaint=componentPaint;
componentPaint=function(...args){const result=clPaint(...args);clSaveState();return result;};
const clInit=projectInit;
projectInit=function(...args){
  const result=clInit(...args);
  for(const [id,title] of [['component-save-panel','Save selection as component'],['component-manage','Library backup and recovery']]){
    const old=$(id),section=document.createElement('section'),heading=document.createElement('h3');
    section.id=id;heading.textContent=title;section.append(heading);
    for(const node of [...old.children])if(node.tagName!=='SUMMARY')section.append(node);
    old.replaceWith(section);
  }
  const reason=document.createElement('p');reason.id='cl-save-reason';reason.setAttribute('role','status');$('component-save').setAttribute('aria-describedby',reason.id);$('component-save-panel').append(reason);
  const open=$('component-open').onclick;$('component-open').onclick=()=>{open();$('component-save-panel').hidden=false;clSaveState();};
  clSaveState();return result;
};
