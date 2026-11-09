// Collections describe composition, never a theme or a new document format.
function lcComposition(name,purpose,body,images=1,gallery=false) {
  return {name,purpose,collection:'Portfolio',format:'16:9 slides',body,images,gallery,
    imageBounds:gallery?{x:.05,y:.34,w:.9,h:.48}:{x:.55,y:.24,w:.4,h:.59},
    imageSlots:Array.from({length:images},(_,i)=>({id:'visual-'+(i+1),label:'Project visual '+(i+1),description:'Independent Fit/Fill, crop and alternative description.'})),
    readingOrder:['title',...body.map(s=>s.label),'visuals','credits'],
    slots:[{id:'title',label:'Project title',tag:'h2',limit:85},...body.map(s=>({...s,tag:'p',limit:s.limit??210})),{id:'credits',label:'Credits / image context',tag:'p',limit:140}]};
}
const lcLayouts = {
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
  'portfolio-process':lcComposition('Portfolio · Process','Show the decisions and tests behind your work.',[
    {id:'discover',label:'1. Discover',prompt:'Describe what you learned from the people or problem.'},
    {id:'decide',label:'2. Decide',prompt:'Explain a key design decision and the alternatives you considered.'},
    {id:'test',label:'3. Test',prompt:'Show how feedback changed your next iteration.'},
  ]),
  'portfolio-results':lcComposition('Portfolio · Results','Separate evidence, limitations and next steps.',[
    {id:'evidence',label:'Evidence',prompt:'Describe the result you can support. Include the source and period for any metric.'},
    {id:'limits',label:'Limitations',prompt:'State the size of the trial and what the result does not establish.'},
    {id:'next',label:'Next steps',prompt:'Explain what you would test or improve next.'},
  ]),
  'portfolio-gallery':lcComposition('Portfolio · Image gallery','Compare four independently editable project visuals.',[
    {id:'intro',label:'Visual story',prompt:'Introduce the images and explain the order in which to read them.'},
  ],4,true),
  'portfolio-details':lcComposition('Portfolio · Details and credits','Record roles, deliverables, collaborators and image credits.',[
    {id:'role',label:'Role',prompt:'Describe your own contribution and the people you worked with.'},
    {id:'deliverables',label:'Deliverables',prompt:'List what was produced and the constraints that shaped it.'},
    {id:'credits',label:'Acknowledgements',prompt:'Credit collaborators, image sources and licenses.'},
  ].map(s=>s.id==='credits'?{...s,id:'acknowledgements'}:s)),
};
const lcExamples={portfolio:{label:'Portfolio',starterDescription:'Five editable slides: case study, process, results, image gallery and credits.',demoDescription:'A five-slide fictional library case study with original offline diagrams.'}};
const lcLibraryAssets=JSON.parse($('studio-template-assets')?.textContent||'{}');
function lcLibraryAsset(path){
  const asset=Object.hasOwn(lcLibraryAssets,path)&&lcLibraryAssets[path];
  if(!mediaSafePath(path)||!asset||!['image/svg+xml','image/png'].includes(asset.type)||typeof asset.data!=='string')throw Error('Example artwork is unavailable: '+path.split('/').at(-1));
  const bytes=Uint8Array.from(atob(asset.data),c=>c.charCodeAt(0));if(!bytes.length)throw Error('Example artwork is empty.');
  return {blob:new Blob([bytes],{type:asset.type}),url:'data:'+asset.type+';base64,'+asset.data};
}
function lcExampleMedia(state){return [...Object.values(state.media||{}),...Object.values(state.mediaObjects||{}).flatMap(items=>items.map(o=>o.media))];}
function lcMaterializeExample(state){
  // Decode all original resources first. Never overwrite a current project's path.
  const assets=new Map();for(const cfg of lcExampleMedia(state))if(!assets.has(cfg.src))assets.set(cfg.src,{path:'assets/'+projectID('example')+'-'+mediaFilename(cfg.src.split('/').at(-1)),...lcLibraryAsset(cfg.src)});
  for(const asset of assets.values())mediaRemember(asset.path,asset.blob);
  for(const value of [state,state.startingState].filter(Boolean))for(const cfg of lcExampleMedia(value))if(assets.has(cfg.src))cfg.src=assets.get(cfg.src).path;
}
function lcExampleInfo(choice){const match=String(choice).match(/^([a-z]+)-(starter|demo)$/);return match&&Object.hasOwn(lcExamples,match[1])?{...lcExamples[match[1]],id:match[1],demo:match[2]==='demo'}:null;}
function lcExampleLabel(choice){if(choice==='template')return'Studio demo';const info=lcExampleInfo(choice);return info?info.label+(info.demo?' finished example':' starter'):null;}
function lcRegister(entries){for(const [id,layout]of Object.entries(entries)){if(Object.hasOwn(lcLayouts,id))throw Error('Duplicate composition '+id);lcLayouts[id]=layout;studioTemplateInfo[id]=[layout.name,layout.purpose];}}
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
  if(layout.body){
    const root=projectNode('div','mg-grid',Array.from({length:layout.images},mgNewCell));
    mgWrite(root,{rows:mgEqual(layout.rows??(layout.gallery?2:1)),cols:mgEqual(layout.cols??(layout.gallery?2:1)),gap:2});
    const body=layout.body.map(slot=>[projectNode('h3','lc-label',[slot.label]),text(slot.id,slot.prompt)]);
    const masthead=layout.masthead?text('masthead',layout.masthead):null;if(masthead)masthead.attrs.class+=' lc-masthead';
    return {classes:'wide mg-slide lc-case lc-'+type,tree:[...(masthead?[masthead]:[]),text('title',title||layout.name),
      projectNode('div','lc-copy',layout.columns||layout.cards?body.map(children=>projectNode('div',layout.columns?'lc-column':'lc-storycard',children)):body.flat()),
      root,text('credits','Add image descriptions, source credits and relevant project context.')]};
  }
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
  if(layout&&type===original.template){
    const labels=projectFind(source,n=>mgHas(n,'lc-label')),targets=projectFind(next,n=>mgHas(n,'lc-label'));
    labels.forEach(({node},i)=>{const target=targets[i];if(!target)return;used.add(node);const parts=target.path.split('.');let parent=next.tree;for(const key of parts.slice(0,-1))parent=parent[key];parent[parts.at(-1)]=node;});
  }
  for(const slot of destinations){
    const node=slot.id==='masthead'?fields.find(n=>!used.has(n)&&mgHas(n,'lc-masthead')):
      fields.find(n=>!used.has(n)&&(slot.id==='title'?n===projectHeading(source)?.node:mgHas(n,'lc-slot-'+slot.id)))||fields.find(n=>!used.has(n)&&!mgHas(n,'lc-masthead')&&(slot.id==='title'?['h1','h2'].includes(n.tag):n.tag==='p'));
    if(!node){mapping.push(slot.label+' ← editable prompt');continue;}
    used.add(node);const target=slot.target,parts=target.path.split('.');let parent=next.tree;
    for(const key of parts.slice(0,-1))parent=parent[key];
    node.attrs??={};node.attrs.class=(node.attrs.class||'').replace(/\blc-slot-[\w-]+\b/g,'').trim();if(layout)node.attrs.class=(node.attrs.class+' lc-slot-'+slot.id).trim();
    parent[parts.at(-1)]=node;
    mapping.push(slot.label+' ← '+projectText(node).trim().slice(0,100));
  }
  function remaining(nodes){return nodes.filter(n=>!used.has(n)).map(n=>{
    if(!n.tag||mgHas(n,'mg-grid')||spNodeID(n)||['table','pre','ul','ol'].includes(n.tag)||mgHas(n,'terminal'))return n;
    return {...n,children:remaining(n.children||[])};
  }).filter(n=>!n.tag||projectText(n).trim()||spNodeID(n)||mgHas(n,'mg-grid')||['table','pre','ul','ol'].includes(n.tag)||mgHas(n,'terminal')||n.children?.some(c=>c.tag));}
  if(!layout?.masthead)for(const node of fields)if(mgHas(node,'lc-masthead'))node.attrs.class=node.attrs.class.replace(/\blc-(?:masthead|slot-masthead)\b/g,'').trim();
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
  if(choice==='template')return lcStudioState(name);
  if(!['portfolio-starter','portfolio-demo'].includes(choice)){const info=lcExampleInfo(choice);return info?.make?info.make(name,info.demo):null;}
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
  lcPortfolioPages(state,demo);
  state.origin='imported';state.startingState=projectCopy(state);return state;
}
function lcPortfolioPages(state,demo){
  const pages=[
    {type:'portfolio-process',title:demo?'From observations to a testable guide':'How you approached the work',copy:{discover:'A fictional volunteer workshop mapped where visitors stopped to ask for directions.',decide:'The team chose plain-language zone names and a compact floor guide instead of adding more signs.',test:'Participants walked through the draft guide, marked unclear labels and suggested changes.'},assets:['workshop']},
    {type:'portfolio-results',title:demo?'What the workshop taught us':'Your evidence and next steps',copy:{evidence:'The workshop identified unclear labels before any permanent signs were made.',limits:'This is a fictional small concept study. It is not evidence of improved visitor outcomes or staff time saved.',next:'Revise the guide, run an accessible wayfinding trial and record how visitors use it.'},assets:['plan']},
    {type:'portfolio-gallery',title:demo?'Four views of the concept':'Your project in images',copy:{intro:'Read left to right, then top to bottom: visitor journey, sign concept, workshop steps and planned follow-up.'},assets:['library','signs','workshop','plan']},
    {type:'portfolio-details',title:demo?'Roles, deliverables and credits':'Your role and project details',copy:{role:'Fictional volunteer team: journey mapping, plain-language copy and a reusable sign concept.',deliverables:'A visitor journey, a sign sketch, a workshop outline and a plan for a larger trial.',acknowledgements:'All four diagrams are original Presentation Studio assets under Apache 2.0. No real library or participant data is used.'},assets:['signs']},
  ];
  for(const page of pages){
    const model=editingCreateModel(page.type,page.title,state.sections[0].id,projectID());
    if(demo){
      for(const [id,text]of Object.entries(page.copy))projectSetText(lcSlot(model,id).node,text);
      projectSetText(lcSlot(model,'credits').node,'Fictional concept study · Original diagrams: Presentation Studio · Apache 2.0.');
      const grid=mgRoot(model);
      for(const [i,name]of page.assets.entries()){
        const object=i===0?'primary':projectID('object'),media={...mediaDefaults,kind:'image',src:'assets/portfolio-'+name+'.svg',name:'Library '+name+' diagram',alt:{library:'Arrival, discovery and quiet reading form a visitor journey with a feedback loop.',signs:'A sign concept uses plain-language zones: Welcome, Find a book and Quiet spaces.',workshop:'Workshop steps are Observe, Sketch, Walk through and Revise.',plan:'Follow-up plan: revise wording, test access, observe use and share findings.'}[name],fit:'contain'};
        if(i===0)state.media[model.id]=media;else{state.mediaObjects??={};(state.mediaObjects[model.id]??=[]).push({id:object,media});}
        mgMark(grid.children[i],object);
      }
      mgArrange(state,model);
    }
    model.notes=demo?'Fictional example: describe what is shown, distinguish evidence from proposals, and read visual context aloud when needed.':'Replace prompts with your own work. Describe images and credit collaborators. Keep claims tied to evidence.';
    model.templateBase=projectCopy(model.tree);state.slides.push(model);
  }
  Object.values(state.loops)[0].slideIds=state.slides.map(s=>s.id);
}
const lcInit=projectInit;
projectInit=function(){
  lcInit();
  const mapping=document.createElement('section');mapping.id='lc-mapping';mapping.setAttribute('aria-label','Layout content mapping');
  const status=document.createElement('p');status.id='lc-mapping-status';status.setAttribute('role','status');
  $('studio-gallery-apply').before(mapping,status);
  for(const id of Object.keys(lcLayouts))for(const select of [$('fe-slide-template'),$('fe-new-template'),$('nx-wizard-layout')])if(select&&!Array.from(select.options).some(o=>o.value===id))select.add(new Option(lcLayouts[id].name,id));
};

// Examples remain ordinary validated projects, with fresh identities and a reset copy.
function lcMakeExample(name,collection,pages,demo){
  const state=studioBlankState(name);state.slides=[];state.brand.headerTitle=collection.toUpperCase();
  for(const page of pages){
    const layout=lcLayouts[page.type],model=editingCreateModel(page.type,demo?page.title:page.promptTitle||layout.name,state.sections[0].id,projectID());
    if(demo){
      for(const [id,text]of Object.entries(page.copy||{}))projectSetText(lcSlot(model,id).node,text);
      projectSetText(lcSlot(model,'credits').node,page.credits||'Original example by Presentation Studio · Apache 2.0.');
      const grid=mgRoot(model);
      for(const [i,asset]of (page.assets||[]).entries()){
        const object=i===0?'primary':projectID('object'),media={...mediaDefaults,kind:'image',src:asset.src,name:asset.name,alt:asset.alt,caption:asset.caption||'',fit:'contain'};
        if(i===0)state.media[model.id]=media;else{state.mediaObjects??={};(state.mediaObjects[model.id]??=[]).push({id:object,media});}mgMark(grid.children[i],object);
      }
      mgArrange(state,model);
    }
    model.templateBase=projectCopy(model.tree);model.notes=page.notes||'Replace prompts with your own story. Describe visuals and keep source credits. These examples use fictional, original content.';state.slides.push(model);
  }
  Object.values(state.loops)[0].slideIds=state.slides.map(s=>s.id);state.origin='imported';state.startingState=projectCopy(state);return state;
}

const lcMediaApply=mediaApply;
mediaApply=function(slide){
  const library=slide.studioPreviewModel?.previewLibrary;
  if(library&&!lcLayouts[slide.studioPreviewModel.template]){lcPaintStudioPreview(slide,library);return;}
  lcMediaApply(slide);if(!slide.classList.contains('lc-case'))return;
  if(library)lcPaintLibraryPreview(slide,library);
  const credits=slide.querySelector('.lc-slot-credits');if(credits)slide.append(credits);
};

const lcOverflow=projectLayoutOverflow;
projectLayoutOverflow=function(root){
  if(lcOverflow(root))return true;
  const slide=root.querySelector('.lc-case'),heading=slide?.querySelector('.lc-slot-title'),copy=slide?.querySelector('.lc-copy');
  const model=slide&&(slide.studioPreviewModel||projectModel(slide.dataset.mediaId)),bottom=lcLayouts[model?.template]?.bodyBottom;
  if(copy&&bottom&&copy.getBoundingClientRect().bottom>slide.getBoundingClientRect().top+bottom*slide.getBoundingClientRect().height)return true;
  return !!(heading&&copy&&heading.getBoundingClientRect().bottom>copy.getBoundingClientRect().top-2);
};
