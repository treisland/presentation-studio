function commandNormalize(raw){
  if(raw==null)return null;
  if(typeof raw!=='object'||Array.isArray(raw))throw Error('Invalid command content.');
  const text=value=>String(value??'').slice(0,100000),label=value=>String(value??'').slice(0,80);
  if(!Object.hasOwn(raw,'shared'))return{powershell:text(raw.powershell),bash:text(raw.bash)};
  if(!Array.isArray(raw.variants)||raw.variants.length>12)throw Error('Use at most twelve command variants.');
  const ids=new Set(['shared']),names=new Set(),variants=raw.variants.map(item=>{
    if(!item||typeof item.id!=='string'||!/^variant-[\w-]+$/.test(item.id)||ids.has(item.id)||typeof item.name!=='string'||!item.name.trim())throw Error('Give each command variant a unique identity and name.');
    const name=label(item.name.trim());if(names.has(name.toLowerCase()))throw Error('Use distinct variant names.');names.add(name.toLowerCase());ids.add(item.id);return{id:item.id,name,text:text(item.text),language:label(item.language),environment:label(item.environment)};
  });
  const shared=text(raw.shared),initial=ids.has(raw.initial)?raw.initial:'shared',fallback=shared||variants.find(item=>item.id===initial)?.text||variants.find(item=>item.text.trim())?.text||'';
  return{shared,variants,initial,detectOS:!!raw.detectOS,hidden:!!raw.hidden,language:label(raw.language),environment:label(raw.environment),powershell:variants.find(item=>item.environment.toLowerCase()==='windows')?.text||fallback,bash:variants.find(item=>['linux','macos'].includes(item.environment.toLowerCase()))?.text||fallback};
}
function commandEditable(raw){
  const clean=commandNormalize(raw);if(!clean)return{shared:'',variants:[],initial:'shared',language:'',environment:'',detectOS:false,hidden:false};
  if(Object.hasOwn(clean,'shared'))return clean;
  const windows=clean.powershell,linux=clean.bash;
  if(windows===linux)return{...commandEditable(null),shared:windows};
  return{...commandEditable(null),variants:[...(windows?[{id:'variant-windows',name:'Windows',text:windows,language:'PowerShell',environment:'Windows'}]:[]),...(linux?[{id:'variant-linux',name:'Linux / macOS',text:linux,language:'Bash',environment:'Linux'}]:[])],initial:windows?'variant-windows':'variant-linux'};
}
function commandChoices(raw){const value=commandEditable(raw);return[...(value.shared.trim()?[{id:'shared',name:'Shared',text:value.shared,language:value.language,environment:value.environment}]:[]),...value.variants.filter(item=>item.text.trim())];}
function commandText(raw,key){if(!Object.hasOwn(raw||{},'shared'))return raw?.[key]||'';const choices=commandChoices(raw);return(choices.find(item=>item.id===key)||choices.find(item=>item.id===raw.initial)||choices[0])?.text||'';}
function commandPaint(node,raw){
  if(!raw)return;
  const terminal=node.querySelector('.terminal');if(!terminal)return;terminal.hidden=!!raw.hidden;
  const choices=Object.hasOwn(raw,'shared')?commandChoices(raw):raw.powershell===raw.bash?[{id:'shared',name:'Shared',text:raw.powershell,language:'',environment:''}]:[['powershell','Windows · PowerShell'],['bash','Linux / macOS · Bash']].filter(([id])=>raw[id]?.trim()).map(([id,name])=>({id,name,text:raw[id],language:'',environment:''}));let select=terminal.querySelector('select');
  if(!select){select=document.createElement('select');terminal.prepend(select);}
  select.setAttribute('aria-label','Code variant');select.replaceChildren(...choices.map(item=>new Option(item.name,item.id)));select.closest('label')?.setAttribute('aria-label','Code variant');
  let selected=node.dataset.commandVariant||raw.initial||environment;
  if(!node.dataset.commandVariant&&raw.detectOS){const os=/Win/i.test(navigator.platform)?'windows':/Mac/i.test(navigator.platform)?'macos':'linux';selected=choices.find(item=>item.environment.toLowerCase()===os)?.id||selected;}
  if(!choices.some(item=>item.id===selected))selected=choices[0]?.id;
  select.value=selected||'';select.hidden=choices.length<=1;if(select.parentElement?.matches('label'))select.parentElement.hidden=choices.length<=1;
  let info=terminal.querySelector('.command-labels');if(!info){info=document.createElement('p');info.className='command-labels';terminal.prepend(info);}
  const paint=()=>{const item=choices.find(choice=>choice.id===select.value)||choices[0];const pre=terminal.querySelector('pre');if(pre)pre.textContent=item?.text||'';info.textContent=[item?.language,item?.environment].filter(Boolean).join(' · ');info.hidden=!info.textContent;};
  select.onchange=()=>{if(Object.hasOwn(raw,'shared')){node.dataset.commandVariant=select.value;paint();}else{environment=select.value;updateEnvironment();}};paint();
}
editingRegisterOperation('code.update',(state,operation)=>{const slide=editingSlide(state,operation.slideId);if(spEntries(slide,state).some(entry=>entry.node&&projectFind({tree:[entry.node]},node=>mgHas(node,'terminal')).length&&spProtected(entry)))editingFail('LOCKED','Unlock the code block first.');slide.commands=commandNormalize(operation.commands);if(!projectFind(slide,node=>mgHas(node,'terminal')).length)slide.tree.push(projectCreateTemplate('code',slide.title).tree[1]);});
editingRegisterOperation('table.insert',(state,operation)=>{
  const slide=editingSlide(state,operation.slideId),rows=operation.rows,columns=operation.columns;
  if(!Number.isInteger(rows)||rows<1||rows>30||!Number.isInteger(columns)||columns<1||columns>12)editingFail('INVALID','Choose 1–30 rows and 1–12 columns.');
  const row=(tag,index)=>projectNode('tr','',Array.from({length:columns},(_,column)=>projectNode(tag,'',[tag==='th'?'Column '+(column+1):'Row '+(index+1)])));
  slide.tree.push(projectNode('table','editor-table',[...(operation.header?[projectNode('thead','',[row('th',0)])]:[]),projectNode('tbody','',Array.from({length:rows},(_,index)=>row('td',index)))]));
});
const codeBindSlide=projectBindSlide;
projectBindSlide=function(node,model){codeBindSlide(node,model);commandPaint(node,model.commands);};
const codeEnvironment=updateEnvironment;
updateEnvironment=function(...args){const result=codeEnvironment(...args);for(const node of allSlides)if(node._commands)commandPaint(node,node._commands);return result;};
const codePreview=projectPreview;
projectPreview=function(...args){const result=codePreview(...args),slide=projectPreviewNode?.querySelector('.slide');if(slide)commandPaint(slide,projectModel()?.commands);return result;};
const codeForm=projectForm;
projectForm=function(...args){const result=codeForm(...args);if($('code-panel'))codeInspector();return result;};
function codeInspector(force=false){
  const panel=$('code-panel'),raw=projectModel()?.commands;panel.hidden=!raw;if(!raw||!force&&panel.contains(document.activeElement))return;
  const value=commandEditable(raw),choices=$('code-edit-choice');choices.replaceChildren(new Option('Shared snippet','shared'),...value.variants.map(item=>new Option(item.name,item.id)));
  const selected=panel.dataset.variant||value.initial;choices.value=selected==='shared'||value.variants.some(item=>item.id===selected)?selected:'shared';
  const item=choices.value==='shared'?value:value.variants.find(entry=>entry.id===choices.value);
  $('code-text').value=choices.value==='shared'?value.shared:item.text;$('code-language').value=item.language;$('code-environment').value=item.environment;$('code-name').value=item.name||'';$('code-name').closest('label').hidden=choices.value==='shared';
  $('code-initial').replaceChildren(new Option('Shared snippet','shared'),...value.variants.map(entry=>new Option(entry.name,entry.id)));$('code-initial').value=value.initial;$('code-detect').checked=value.detectOS;$('code-hidden').checked=value.hidden;$('code-remove-variant').disabled=choices.value==='shared';
}
function codeCommit(change){const value=commandEditable(projectModel().commands);change(value);componentRun({type:'code.update',commands:value});codeInspector(true);}
const codeInit=projectInit;
projectInit=function(){
  codeInit();const panel=document.createElement('section');panel.id='code-panel';panel.dataset.wpPart='content';panel.innerHTML='<h3>Code / Commands</h3><p>Display and copy only. Labels are optional.</p><label>Editing<select id="code-edit-choice"></select></label><label>Variant name<input id="code-name" maxlength="80"></label><label>Content<textarea id="code-text" rows="7" spellcheck="false"></textarea></label><label>Language (optional)<input id="code-language" maxlength="80" placeholder="Plain text, Python, C++, Bash…"></label><label>Environment (optional)<input id="code-environment" maxlength="80" placeholder="Windows, Linux, npm, Docker…"></label><label>Initial variant<select id="code-initial"></select></label><label><input id="code-detect" type="checkbox"> Prefer viewer OS when a matching environment exists</label><label><input id="code-hidden" type="checkbox"> Hide code block in presentation</label><button id="code-add-variant">Add variant</button><button id="code-remove-variant">Remove variant</button>';$('wp-fields').prepend(panel);
  const legacy=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Legacy platform fields';legacy.append(summary);for(const id of ['fe-command-ps','fe-command-bash']){const field=$(id);const label=document.querySelector('label[for="'+id+'"]');if(label)legacy.append(label);legacy.append(field);} $('fe-commands-panel').prepend(legacy);
  $('code-edit-choice').onchange=()=>{panel.dataset.variant=$('code-edit-choice').value;$('code-edit-choice').blur();codeInspector();};
  for(const id of ['code-text','code-language','code-environment','code-name'])$(id).onchange=()=>{const selected=$('code-edit-choice').value;codeCommit(value=>{const item=selected==='shared'?value:value.variants.find(entry=>entry.id===selected),field={'code-text':selected==='shared'?'shared':'text','code-language':'language','code-environment':'environment','code-name':'name'}[id];item[field]=$(id).value;});};
  $('code-initial').onchange=()=>codeCommit(value=>value.initial=$('code-initial').value);$('code-detect').onchange=()=>codeCommit(value=>value.detectOS=$('code-detect').checked);$('code-hidden').onchange=()=>codeCommit(value=>value.hidden=$('code-hidden').checked);
  $('code-add-variant').onclick=()=>codeCommit(value=>{const id=projectID('variant');value.variants.push({id,name:'Variant '+(value.variants.length+1),text:'',language:'',environment:''});panel.dataset.variant=id;});
  $('code-remove-variant').onclick=()=>codeCommit(value=>{const id=$('code-edit-choice').value;value.variants=value.variants.filter(item=>item.id!==id);if(value.initial===id)value.initial='shared';panel.dataset.variant='shared';});
  $('fe-table-add').hidden=true;$('fe-enable-commands').hidden=true;codeLibrarySetup();codeInspector();
};
function codeLibrarySetup(){
  const tab=componentButton('Data & Code',()=>{$('component-category').value='Data';componentList();for(const sibling of $('component-tabs').children){const selected=sibling===tab;sibling.setAttribute('aria-selected',String(selected));sibling.tabIndex=selected?0:-1;}});tab.setAttribute('role','tab');tab.setAttribute('aria-controls','component-items');tab.dataset.category='Data';$('component-tabs').append(tab);$('component-category').add(new Option('Data & Code','Data'));
}
const codeList=componentList;
componentList=function(){
  if($('component-category').value!=='Data')return codeList();
  const list=$('component-items');list.replaceChildren();for(const type of ['Table','Code / Commands']){
    if(!type.toLowerCase().includes($('component-search').value.toLowerCase()))continue;
    const card=document.createElement('article'),heading=document.createElement('h3'),preview=document.createElement('div');heading.textContent=type;preview.className='component-card-preview';preview.textContent=type==='Table'?'▦':'</>';card.append(preview,heading);
    if(type==='Table'){
      const rows=document.createElement('input'),columns=document.createElement('input'),header=document.createElement('input');rows.type=columns.type='number';rows.min=columns.min=1;rows.max=30;columns.max=12;rows.value=3;columns.value=3;header.type='checkbox';header.checked=true;
      for(const [label,input]of [['Rows',rows],['Columns',columns],['Header row',header]]){const field=document.createElement('label');field.textContent=label;field.append(input);card.append(field);}
      card.append(componentButton('Insert Table',()=>{const result=componentRun({type:'table.insert',rows:Number(rows.value),columns:Number(columns.value),header:header.checked});if(result.ok){$('component-add').close();weInspect('table');}}));
    }else{
      const content=document.createElement('textarea'),field=document.createElement('label');field.textContent='Content';content.rows=5;content.placeholder='Paste code or commands';field.append(content);card.append(field,componentButton('Insert Code / Commands',()=>{const slide=projectSelected;const insert=()=>{if(projectSelected!==slide){projectMessage('The slide changed. Insert again.');return;}const result=componentRun({type:'code.update',commands:{...commandEditable(null),shared:content.value}});if(result.ok){$('component-add').close();weInspect('text');codeInspector(true);}};if(projectModel().commands)projectConfirm('Replace this slide’s code block?','The slide supports one code block. Existing content and variants can be restored with Undo.',insert);else insert();}));
    }list.append(card);
  }
};
