// View-only example browsing. The project changes only through the existing new-project guard.
const lcExampleCatalog={
  portfolio:{category:'case-study',purpose:'Show a project from problem to evidence and credits.',images:'multiple'},
  comic:{category:'story',purpose:'Explain an idea through editable speech and numbered panels.',images:'multiple'},
  editorial:{category:'editorial',purpose:'Tell a newspaper/blog-style story with columns and visuals.',images:'single'},
  newsletter:{category:'updates',purpose:'Organize a recurring update as newsletter-style slides.',images:'single'},
  flyer:{category:'announcement',purpose:'Introduce an event, announcement or portfolio project.',images:'single'},
};
let lcGalleryCurrent=null,lcGalleryReturn=null,lcGalleryUsing=false;
function lcPaintLibraryPreview(slide,state){
  const model=slide.studioPreviewModel,grid=mgRoot(model);if(!grid)return;
  slide.querySelectorAll(':scope > .media-box,:scope > .lc-example-image').forEach(n=>n.remove());
  const rects=mgRects(mgSettings(grid),lcBounds(model));
  grid.children.forEach((cell,i)=>{
    const object=mgObjectID(cell),cfg=mgConfig(state,model.id,object);if(!cfg)return;
    const r=rects[i],box=document.createElement('figure'),viewport=document.createElement('div'),img=document.createElement('img');box.className='media-box lc-library-visual';viewport.className='media-viewport';img.className='media-asset';img.alt=cfg.alt||'';img.src=lcLibraryAsset(cfg.src).url;
    Object.assign(box.style,{position:'absolute',left:r.x*100+'%',top:r.y*100+'%',width:r.w*100+'%',height:r.h*100+'%',overflow:'hidden'});
    Object.assign(img.style,{width:'100%',height:'100%',objectFit:cfg.fit||'contain',objectPosition:(cfg.canvas?.crop?.x??50)+'% '+(cfg.canvas?.crop?.y??50)+'%'});viewport.append(img);box.append(viewport);
    if(cfg.caption){const caption=document.createElement('figcaption');caption.textContent=cfg.caption;box.append(caption);}slide.append(box);
  });
}
function lcAvailable(state){try{for(const cfg of lcExampleMedia(state))lcLibraryAsset(cfg.src);return true;}catch{return false;}}
function lcExampleStateFor(id,mode){const entry=lcExamples[id];return lcExampleState(id+'-'+mode,entry.label+(mode==='demo'?' example':' starter'));}
function lcReadablePreview(model,state){
  const parent=$('lc-preview-readable');parent.replaceChildren();
  const masthead=projectFind(model,n=>mgHas(n,'lc-masthead'))[0];if(masthead){const p=document.createElement('p');p.textContent=projectText(masthead.node);parent.append(p);}
  const layout=lcLayouts[model.template];
  for(const slot of layout.slots.filter(s=>!['credits','masthead'].includes(s.id))){const p=document.createElement('p'),strong=document.createElement('strong');strong.textContent=slot.label+': ';p.append(strong,document.createTextNode(projectText(lcSlot(model,slot.id)?.node)));parent.append(p);}
  const root=mgRoot(model);root?.children.forEach((cell,i)=>{const cfg=mgConfig(state,model.id,mgObjectID(cell)),p=document.createElement('p');p.textContent='Visual '+(i+1)+': '+(cfg?[cfg.alt,cfg.caption].filter(Boolean).join(' · '):'Empty editable image target.');parent.append(p);});
  const credits=document.createElement('p');credits.textContent='Credits: '+projectText(lcSlot(model,'credits')?.node);parent.append(credits);
}
function lcRefreshExamplePreview(){
  const current=lcGalleryCurrent;if(!current)return;
  const {state,index,id,mode}=current,model=state.slides[index],entry=lcExamples[id];
  $('lc-preview-title').textContent=entry.label+' '+(mode==='demo'?'demo':'starter')+' · '+(index+1)+' of '+state.slides.length;
  $('lc-preview-prev').disabled=index===0;$('lc-preview-next').disabled=index===state.slides.length-1;
  lcReadablePreview(model,state);
  if(current.available){
    const root=studioPreviewModel({...model,previewLibrary:state},$('lc-example-preview'),studioPalette(state.brand)),brand=root.querySelector('header .brand');
    if(brand)brand.textContent=state.brand.headerTitle+' / '+state.projectName;
    const edition=root.querySelector('header .edition');if(edition){if(state.brand.edition)edition.textContent=state.brand.edition;else edition.remove();}
    root.querySelector('footer .meta').textContent='Example preview · '+model.title;
    $('lc-example-status').textContent='Preview only. Use creates a separate editable project.';
  }else{
    $('lc-example-preview').replaceChildren();$('lc-example-status').textContent='This example’s artwork is unavailable. Reopen a complete Studio build or choose an available starter. Your project is unchanged.';
  }
  $('lc-use-starter').textContent='Use '+entry.label+' starter';$('lc-use-demo').textContent='Use '+entry.label+' demo';$('lc-use-demo').hidden=!!entry.starterOnly;
  $('lc-use-starter').disabled=!lcAvailable(lcExampleStateFor(id,'starter'));
  $('lc-use-demo').disabled=!!entry.starterOnly||!lcAvailable(lcExampleStateFor(id,'demo'));
}
function lcSelectExample(id,mode){
  const entry=lcExamples[id];if(!entry)return;
  mode=entry.starterOnly?'starter':mode||'demo';const state=lcExampleStateFor(id,mode);
  lcGalleryCurrent={id,mode,state,index:0,available:lcAvailable(state)};
  $('lc-preview-kind').replaceChildren(new Option('Starter · editable prompts','starter'));
  if(!entry.starterOnly)$('lc-preview-kind').add(new Option('Demo · finished content','demo'));
  $('lc-preview-kind').value=mode;lcRefreshExamplePreview();
  $('lc-preview-kind').disabled=false;
}
function lcExampleCards(){
  const category=$('lc-example-purpose').value,images=$('lc-example-images').value,parent=$('lc-example-cards');parent.replaceChildren();let count=0;const visible=[];
  for(const [id,entry]of Object.entries(lcExamples)){
    const info=lcExampleCatalog[id];if((category!=='all'&&category!==info.category)||(images!=='all'&&images!==info.images))continue;
    const card=document.createElement('article'),title=document.createElement('h3'),description=document.createElement('p'),badge=document.createElement('p'),button=document.createElement('button');
    card.className='lc-example-card';card.dataset.example=id;title.textContent=entry.label;description.textContent=info.purpose;badge.className='lc-example-badge';badge.textContent='16:9 slides · '+(entry.starterOnly?'Starter':'Starter + finished demo')+' · '+(info.images==='multiple'?'Includes multi-image slides':'Single image per slide');
    button.textContent='Preview '+entry.label+(entry.starterOnly?' starter':' demo');button.onclick=()=>lcSelectExample(id);card.append(title,description,badge,button);parent.append(card);count++;visible.push(id);
  }
  $('lc-example-count').textContent=count+' collection'+(count===1?'':'s')+' shown';
  if(visible.includes(lcGalleryCurrent?.id))return;
  if(visible.length){lcSelectExample(visible[0]);return;}
  lcGalleryCurrent=null;$('lc-preview-title').textContent='No matching examples';$('lc-example-preview').replaceChildren();$('lc-preview-readable').replaceChildren();$('lc-preview-kind').replaceChildren();
  for(const id of ['lc-use-starter','lc-use-demo','lc-preview-prev','lc-preview-next','lc-preview-kind'])$(id).disabled=true;
  $('lc-example-status').textContent='Change the filters to browse available examples.';
}
function lcOpenExamples(){
  if(!projectReady||projectPlayback||boothActive||projectDraftPending){projectMessage('Open an editable project and resolve recovery before starting an example.');return;}
  const opener=document.activeElement;vbEnd(false);projectFlush();setPlaying(false);mediaPauseAll();lcGalleryReturn=opener;lcGalleryUsing=false;
  $('lc-example-purpose').value='all';$('lc-example-images').value='all';lcGalleryCurrent=null;$('lc-examples').showModal();lcExampleCards();
}
async function lcUseExample(mode){
  const current=lcGalleryCurrent;if(!current)return;
  const id=current.id,entry=lcExamples[id],choice=id+'-'+mode;
  if((entry.starterOnly&&mode==='demo')||!lcAvailable(lcExampleStateFor(id,mode))){$('lc-example-status').textContent='Choose an example whose artwork is available.';return;}
  try{await hubGuard(async()=>{
    const name=$('nx-wizard').open?$('nx-wizard-name').value.trim():'';
    lcGalleryUsing=true;$('lc-examples').close();nxOpenWizard();document.querySelector('input[name="nx-start"][value="'+choice+'"]').checked=true;
    $('nx-wizard-name').value=name&&name!=='Untitled presentation'?name:lcExampleLabel(choice);
    await nxFinishWizard(true);if(!$('nx-wizard').open)$('fe-slide-title').focus();lcGalleryUsing=false;
  });}catch{$('lc-example-status').textContent='The example could not be opened. Your current project remains available.';lcGalleryUsing=false;}
}
const lcGalleryInit=projectInit;
projectInit=function(){
  lcGalleryInit();
  const dialog=document.createElement('dialog');dialog.id='lc-examples';dialog.setAttribute('aria-labelledby','lc-examples-title');
  dialog.innerHTML='<div class="studio-dialog-head"><div><h2 id="lc-examples-title">Start from an example</h2><p>Starters contain editable prompts. Demos contain finished content. Every use creates a separate project.</p></div><button id="lc-examples-close">Close</button></div><div class="lc-example-filters"><label>Purpose<select id="lc-example-purpose"><option value="all">All purposes</option><option value="case-study">Case study</option><option value="story">Storytelling</option><option value="editorial">Editorial story</option><option value="updates">Recurring updates</option><option value="announcement">Announcement</option></select></label><label>Image layout<select id="lc-example-images"><option value="all">All image layouts</option><option value="single">Single image per slide</option><option value="multiple">Includes multi-image slides</option></select></label><p id="lc-example-count" role="status"></p></div><div class="lc-example-layout"><div id="lc-example-cards" aria-label="Example collections"></div><section aria-label="Example preview"><h3 id="lc-preview-title"></h3><label>Preview content<select id="lc-preview-kind"></select></label><div id="lc-example-preview"></div><div class="lc-example-actions" role="group" aria-label="Example slides"><button id="lc-preview-prev" aria-label="Previous example slide">Previous</button><button id="lc-preview-next" aria-label="Next example slide">Next</button></div><details><summary>Read preview text and image descriptions</summary><div id="lc-preview-readable"></div></details><p id="lc-example-status" role="status"></p><div class="lc-example-actions"><button id="lc-use-starter">Use starter</button><button id="lc-use-demo">Use demo</button></div></section></div>';
  document.body.append(dialog);
  const add=(id,parent,before=false)=>{const button=document.createElement('button');button.id=id;button.textContent='Start from an example';button.onclick=lcOpenExamples;if(before)parent.before(button);else parent.after(button);};
  add('lc-examples-open',$('studio-new-open'));add('lc-examples-wizard',document.querySelector('#nx-wizard .studio-start-options'),true);add('lc-examples-hub',$('hub-new'));
  $('lc-examples-close').onclick=()=>dialog.close();dialog.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();dialog.close();}});
  dialog.addEventListener('close',()=>{if(lcGalleryUsing)return;const target=lcGalleryReturn;if(target?.isConnected){target.focus();if(document.activeElement===target)return;}document.querySelector('#hub-project-menu > summary')?.focus();});
  $('lc-example-purpose').onchange=lcExampleCards;$('lc-example-images').onchange=lcExampleCards;
  $('lc-preview-kind').onchange=e=>{if(lcGalleryCurrent)lcSelectExample(lcGalleryCurrent.id,e.target.value);};
  $('lc-preview-prev').onclick=()=>{if(lcGalleryCurrent&&lcGalleryCurrent.index>0){lcGalleryCurrent.index--;lcRefreshExamplePreview();}};
  $('lc-preview-next').onclick=()=>{if(lcGalleryCurrent&&lcGalleryCurrent.index<lcGalleryCurrent.state.slides.length-1){lcGalleryCurrent.index++;lcRefreshExamplePreview();}};
  $('lc-use-starter').onclick=()=>lcUseExample('starter');$('lc-use-demo').onclick=()=>lcUseExample('demo');
};
