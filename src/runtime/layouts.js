// Collections describe composition, never a theme or a new document format.
const lcLayouts = Object.freeze({
  'portfolio-case': {
    name: 'Portfolio · Case study',
    purpose: 'Explain a problem, approach and outcome beside a project image.',
    collection: 'Portfolio', format: '16:9 slides',
    imageBounds: {x:.55,y:.24,w:.4,h:.59},
    imageSlots: [{id:'visual',label:'Project visual',description:'Use Fit/Fill, crop and a meaningful alternative description.'}],
    readingOrder: ['title','problem','approach','outcome','visual','credits'],
    slots: [
      {id:'title',label:'Project title',tag:'h2',limit:85},
      {id:'context',label:'Problem / context',tag:'p',limit:210},
      {id:'process',label:'Approach / process',tag:'p',limit:210},
      {id:'results',label:'Outcome / results',tag:'p',limit:210},
      {id:'credits',label:'Credits / image description',tag:'p',limit:140},
    ],
  },
});
function lcBounds(model) {
  return lcLayouts[model?.template]?.imageBounds || {x:.05,y:.23,w:.9,h:.72};
}
function lcSlot(model,id) {
  return projectFind(model,n=>(n.attrs?.class||'').split(/\s+/).includes('lc-slot-'+id))[0];
}
const lcTemplate = projectCreateTemplate;
projectCreateTemplate = function(type,title) {
  const layout=lcLayouts[type];if(!layout)return lcTemplate(type,title);
  const text=(id,value)=>{const slot=layout.slots.find(s=>s.id===id);return projectNode(slot.tag,'lc-slot-'+id,[value]);};
  const root=projectNode('div','mg-grid',[mgNewCell()]);
  mgWrite(root,{rows:[10000],cols:[10000],gap:2});
  return {classes:'wide mg-slide lc-case',tree:[
    text('title',title||'Your project'),
    projectNode('div','lc-copy',[
      projectNode('h3','lc-label',['Problem']),text('context','What problem did you set out to solve, and for whom?'),
      projectNode('h3','lc-label',['Approach']),text('process','Describe your role, the important decision and how you tested it.'),
      projectNode('h3','lc-label',['Outcome']),text('results','State what changed. Distinguish measured results from plans.'),
    ]),root,text('credits','Add image context, your role and any collaborators or asset credits.'),
  ]};
};
for(const [id,layout] of Object.entries(lcLayouts))studioTemplateInfo[id]=[layout.name,layout.purpose];

// Move complete safe AST nodes, keeping inline formatting and identity tokens.
// Unmapped roots remain present, including free blocks, tables and command examples.
function lcMapped(original,type) {
  const preset=projectCreateTemplate(type,original.title),next={...projectCopy(original),template:type,...preset,
    templateBase:projectCopy(preset.tree),templateClasses:preset.classes};
  const layout=lcLayouts[type],source=projectCopy(original),used=new Set(),mapping=[];
  const destinations=layout?layout.slots.map(slot=>({...slot,target:lcSlot(next,slot.id)})):
    [projectHeading(next),...studioCoreFields(next)].filter(Boolean).map((target,i)=>({id:i===0?'title':'body-'+i,label:i===0?'Title':'Text '+i,target}));
  const fields=[];
  function walk(nodes,protectedRoot=false) {
    for(const node of nodes){
      const protectedNode=protectedRoot||!!spNodeID(node)||['table','pre','ul','ol'].includes(node.tag)||mgHas(node,'mg-grid')||mgHas(node,'terminal');
      if(!protectedNode&&['h1','h2','p'].includes(node.tag)&&!mgHas(node,'eyebrow')&&projectText(node).trim())fields.push(node);
      else if(!protectedNode)walk(node.children||[],false);
    }
  }
  walk(source.tree);
  if(layout&&lcLayouts[original.template]){
    const labels=projectFind(source,n=>mgHas(n,'lc-label')),targets=projectFind(next,n=>mgHas(n,'lc-label'));
    labels.forEach(({node},i)=>{const target=targets[i];if(!target)return;used.add(node);const parts=target.path.split('.');let parent=next.tree;for(const key of parts.slice(0,-1))parent=parent[key];parent[parts.at(-1)]=node;});
  }
  for(const slot of destinations){
    const node=fields.find(n=>!used.has(n)&&(slot.id==='title'?['h1','h2'].includes(n.tag):n.tag==='p'));
    if(!node){mapping.push(slot.label+' ← editable prompt');continue;}
    used.add(node);const target=slot.target,parts=target.path.split('.');let parent=next.tree;
    for(const key of parts.slice(0,-1))parent=parent[key];
    node.attrs??={};node.attrs.class=(node.attrs.class||'').replace(/\blc-slot-[\w-]+\b/g,'').trim();if(layout)node.attrs.class=(node.attrs.class+' lc-slot-'+slot.id).trim();
    parent[parts.at(-1)]=node;
    mapping.push(slot.label+' ← '+projectText(node).trim().slice(0,100));
  }
  function remaining(nodes){return nodes.filter(n=>!used.has(n)).map(n=>{
    if(!n.tag||mgHas(n,'mg-grid')||spNodeID(n))return n;
    return {...n,children:remaining(n.children||[])};
  }).filter(n=>!n.tag||projectText(n).trim()||spNodeID(n)||mgHas(n,'mg-grid'));}
  const leftovers=remaining(source.tree),grid=leftovers.find(n=>mgHas(n,'mg-grid'));
  if(grid){const index=next.tree.findIndex(n=>mgHas(n,'mg-grid'));if(index>=0)next.tree[index]=grid;else next.tree.push(grid);leftovers.splice(leftovers.indexOf(grid),1);mapping.push('Image slots ← existing grid (all cells retained)');}
  // Keep identified/free roots top-level: Layers and free-block editing depend on it.
  const free=leftovers.filter(n=>spNodeID(n)),other=leftovers.filter(n=>!spNodeID(n));
  next.tree.push(...free);
  if(other.length)next.tree.push(projectNode('div','lc-retained',other));
  if(leftovers.length)mapping.push(leftovers.length+' unmatched content groups retained on this slide; review overflow.');
  return {next,mapping};
}
function lcCandidate(original,type,keep=true) {
  if(keep)return lcMapped(original,type);
  const next={...projectCopy(original),template:type,...projectCreateTemplate(type,original.title)};
  return {next,mapping:['Text replaced by editable prompts; Undo and recovery preserve the previous slide.']};
}
function lcLocked(state,model) {
  return state.editLocked||model.editLocked||spEntries(model,state).some(spProtected)||
    Object.values(spData(state,model.id).objects).some(m=>m.locked)||
    [state.media[model.id],...(state.mediaObjects?.[model.id]||[]).map(o=>o.media)].some(m=>m?.canvas?.locked);
}
const lcOperation=dbOperation;
dbOperation=function(state,op,created){
  if(op?.type!=='layout.apply')return lcOperation(state,op,created);
  const model=editingSlide(state,op.slideId);
  if(!Object.hasOwn(studioTemplateInfo,op.template)||op.template==='original'||typeof op.keep!=='boolean')editingFail('INVALID','Choose a supported layout and content mode.');
  if(lcLocked(state,model))editingFail('LOCKED','Unlock slide contents before changing layout.');
  const {next}=lcCandidate(model,op.template,op.keep);
  if(!op.keep){next.commands=op.template==='code'?{powershell:'Write-Output "Replace with your command"',bash:'printf "%s\\n" "Replace with your command"'}:null;
    next.templateBase=projectCopy(next.tree);next.templateClasses=next.classes;next.templateCommands=projectCopy(next.commands);}
  state.slides[state.slides.indexOf(model)]=next;
  if(mgRoot(next)){
    const grid=mgRoot(next);
    // Attach the existing primary image only when there is no populated grid.
    if(!grid.children.some(c=>mgObjectID(c))&&state.media[model.id]&&state.media[model.id].layout!=='background')mgMark(grid.children[0],'primary');
    mgArrange(state,next);
  }
  return true;
};
function lcApplyGallery(){
  const model=projectModel(),type=studioGalleryTemplate;
  if(type==='original'||(!lcLayouts[type]&&!lcLayouts[model.template]))return false;
  const keep=document.querySelector('input[name="studio-layout-mode"]:checked').value==='keep',snapshot=studioEditing.read();
  const apply=()=>{
    const result=studioEditing.apply({apiVersion:1,projectId:snapshot.projectId,expectedRevision:snapshot.revision,
      operations:[{type:'layout.apply',slideId:model.id,template:type,keep}]});
    if(result.ok){$('studio-gallery').close();projectBlockPath='';projectTablePath='';projectForm();projectPreview();}
    else {$('lc-mapping-status').textContent=result.message;projectMessage(result.message);}
  };
  if(keep)apply();else projectConfirm('Replace slide text with prompts?','Text and commands are replaced. Media, notes and slide identity remain. A checkpoint and one Undo recover the previous slide.',apply);
  return true;
}
const lcGalleryCandidate=studioGalleryCandidate;
studioGalleryCandidate=function(type=studioGalleryTemplate){
  if(studioGalleryMode==='change'&&type!=='original'&&(lcLayouts[type]||lcLayouts[projectModel().template])){
    const next=lcCandidate(projectModel(),type,document.querySelector('input[name="studio-layout-mode"]:checked').value==='keep').next,grid=mgRoot(next);
    if(grid&&!grid.children.some(c=>mgObjectID(c))&&projectState.media[projectSelected]&&projectState.media[projectSelected].layout!=='background')mgMark(grid.children[0],'primary');return next;
  }
  return lcGalleryCandidate(type);
};
const lcRefresh=studioGalleryRefresh;
studioGalleryRefresh=function(){
  lcRefresh();const panel=$('lc-mapping');if(!panel)return;panel.replaceChildren();
  const changing=studioGalleryMode==='change',layout=lcLayouts[studioGalleryTemplate]||
    (changing&&lcLayouts[projectModel().template]&&studioGalleryTemplate!=='original'?{collection:'Layout change',format:'16:9 slides',slots:[]}:null);
  if(!layout){$('lc-mapping-status').textContent='';return;}
  const intro=document.createElement('p');intro.textContent=layout.collection+' · '+layout.format+' · Project theme inherited.'+(layout.readingOrder?' Reading order: '+layout.readingOrder.join(', ')+'.':' Review the target layout and retained content.');panel.append(intro);
  if(changing){const keep=document.querySelector('input[name="studio-layout-mode"]:checked').value==='keep';
    const list=document.createElement('ul');for(const text of lcCandidate(projectModel(),studioGalleryTemplate,keep).mapping){const li=document.createElement('li');li.textContent=text;list.append(li);}panel.append(list);
    const cfg=projectState.media[projectSelected];if(lcLayouts[studioGalleryTemplate]&&cfg&&!mgRoot(projectModel())&&cfg.layout!=='background'){const p=document.createElement('p');p.textContent='Primary image → '+layout.imageSlots[0].label+'. Additional media keep their IDs and placements.';panel.append(p);}
  }
  const model=studioGalleryCandidate(),findings=layout.slots.filter(s=>projectText(lcSlot(model,s.id)?.node).length>s.limit).map(s=>s.label);
  $('lc-mapping-status').textContent=changing&&lcLocked(projectState,projectModel())?'Unlock slide contents before applying a layout.':findings.length?'Long content to review: '+findings.join(', ')+'. Text is kept at readable size; shorten or rearrange it.':'Review the preview before applying. Empty visual slots are available in Edit mode.';
};

function lcExampleState(choice,name){
  if(!['portfolio-starter','portfolio-demo'].includes(choice))return null;
  const state=studioBlankState(name),slide=state.slides[0],demo=choice==='portfolio-demo';
  const preset=projectCreateTemplate('portfolio-case',demo?'A calmer community library':'Your project story');
  Object.assign(slide,preset,{template:'portfolio-case',title:demo?'A calmer community library':'Your project story',templateBase:projectCopy(preset.tree),templateClasses:preset.classes});
  if(demo){
    for(const [id,text]of Object.entries({context:'Visitors needed a clearer way to find quiet reading spaces without interrupting library staff.',process:'Our fictional volunteer team mapped the visitor journey, tested a simple floor guide, and revised the signs after a small workshop.',results:'The workshop surfaced confusing labels early. The next step is a larger trial; no measured impact is claimed.',credits:'Concept study · Original diagram by Presentation Studio. Three zones connect arrival, discovery and quiet reading.'}))projectSetText(lcSlot(slide,id).node,text);
    const grid=mgRoot(slide);mgMark(grid.children[0],'primary');state.media[slide.id]={...mediaDefaults,kind:'image',src:'assets/portfolio-library.svg',name:'Library journey diagram',alt:'A visitor journey links arrival, discovery and quiet reading, with a feedback loop to improve signs.',fit:'contain'};
    mgArrange(state,slide);
  }
  slide.templateBase=projectCopy(slide.tree);state.brand.headerTitle='CASE STUDY';state.brand.headerSubtitle=name;
  slide.notes=demo?'Fictional demonstration. Explain the problem, approach and outcome, then describe the image. Replace this content with your own work.':'Walk through the problem, approach and result. Add a visual with a meaningful image description. Keep contributor credits.';
  state.origin='imported';state.startingState=projectCopy(state);return state;
}
const lcInit=projectInit;
projectInit=function(){
  lcInit();
  const mapping=document.createElement('section');mapping.id='lc-mapping';mapping.setAttribute('aria-label','Layout content mapping');
  const status=document.createElement('p');status.id='lc-mapping-status';status.setAttribute('role','status');
  $('studio-gallery-apply').before(mapping,status);
  for(const id of Object.keys(lcLayouts))for(const select of [$('fe-slide-template'),$('fe-new-template'),$('nx-wizard-layout')])if(select&&!Array.from(select.options).some(o=>o.value===id))select.add(new Option(lcLayouts[id].name,id));
  const options=document.querySelector('#nx-wizard .studio-start-options');
  if(options)for(const [value,title,description]of [
    ['portfolio-starter','Portfolio starter','One editable case-study slide with prompts and an image slot. 16:9 slide format.'],
    ['portfolio-demo','Portfolio finished example','A complete fictional library case study with an original offline diagram. 16:9 slide format.'],
  ]){const label=document.createElement('label'),input=document.createElement('input'),b=document.createElement('b'),span=document.createElement('span');input.type='radio';input.name='nx-start';input.value=value;input.onchange=()=>{$('nx-wizard-header').value='CASE STUDY';nxWizardPage();};b.textContent=title;span.textContent=description;label.append(input,b,span);options.append(label);}
};

const lcMediaApply=mediaApply;
mediaApply=function(slide){
  lcMediaApply(slide);if(!slide.classList.contains('lc-case'))return;
  const cfg=slide.studioPreviewModel?.previewMedia;
  if(cfg&&!slide.querySelector('.media-box')){const img=document.createElement('img'),r=lcBounds(slide.studioPreviewModel);img.className='lc-example-image';img.src=mediaAssetURL(cfg.src);img.alt=cfg.alt;Object.assign(img.style,{position:'absolute',left:r.x*100+'%',top:r.y*100+'%',width:r.w*100+'%',height:r.h*100+'%',objectFit:'contain'});slide.append(img);}
  const credits=slide.querySelector('.lc-slot-credits');if(credits)slide.append(credits);
};

const lcOverflow=projectLayoutOverflow;
projectLayoutOverflow=function(root){
  if(lcOverflow(root))return true;
  const slide=root.querySelector('.lc-case'),heading=slide?.querySelector('.lc-slot-title'),copy=slide?.querySelector('.lc-copy');
  return !!(heading&&copy&&heading.getBoundingClientRect().bottom>copy.getBoundingClientRect().top-2);
};
