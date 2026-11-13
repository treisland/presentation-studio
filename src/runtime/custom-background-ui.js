let cbExtendBackgroundUI=null;
let cbRefreshUI=()=>{};
let cbPlaceUI=()=>{};
function cbMountUI(){
  const panel=document.createElement('fieldset');panel.id='cb-panel';panel.className='cb-panel';
  panel.innerHTML='<legend>Background appearance</legend><p>Preview changes before applying. Existing slide overrides are preserved.</p><div class="cb-fields"><label>Scope<select id="cb-scope"><option value="presentation">Presentation</option><option value="slide">This slide</option></select></label><label>Settings source<select id="cb-source"><option value="inherit">Original / inherited background</option><option value="custom">Custom background</option></select></label><label>Background type<select id="cb-kind"><option value="theme">Theme</option><option value="solid">Solid</option><option value="gradient">Gradient</option><option value="image">Image</option></select></label><label data-cb-kind="solid">Color · hex or theme role<input id="cb-color" value="#10203a"></label><label data-cb-kind="gradient">First color<input id="cb-first" value="background"></label><label data-cb-kind="gradient">Second color<input id="cb-second" value="accent"></label><label data-cb-kind="gradient">Angle<input id="cb-angle" type="number" min="0" max="360" value="120"></label><label data-cb-kind="image">Image from this project<select id="cb-asset"></select></label><label data-cb-kind="image">Upload an image<input id="cb-file" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml"></label><label data-cb-kind="image">Image sizing<select id="cb-fit"><option value="fill">Fill · crop edges</option><option value="fit">Fit · show entire image</option></select></label><label data-cb-kind="image">Horizontal focal point (%)<input id="cb-x" type="number" min="0" max="100" value="50"></label><label data-cb-kind="image">Vertical focal point (%)<input id="cb-y" type="number" min="0" max="100" value="50"></label><label data-cb-kind="image">Fallback color · hex or theme role<input id="cb-fallback" value="background"></label><label data-cb-kind="image">Overlay color · hex or theme role<input id="cb-overlay-color" value="ink"></label><label data-cb-kind="image">Overlay opacity (%)<input id="cb-overlay-opacity" type="number" min="0" max="100" value="0"></label><label data-cb-kind="image">Protect text area<select id="cb-protect"><option value="off">Off</option><option value="left">Left · fade toward right</option><option value="right">Right · fade toward left</option></select></label></div><fieldset class="cb-looks"><legend>Coordinated looks</legend><label>Look<select id="cb-look"><option value="theme">Theme blend</option><option value="horizon">Quiet horizon · original illustration</option></select></label><label>Composition<select id="cb-composition"><option value="title">Title · quiet left</option><option value="text-left">Content · text left</option><option value="text-right">Content · text right</option><option value="divider">Divider · centered</option></select></label><button id="cb-use-look">Preview selected look</button><p>The selected composition applies to the current scope only. Content is never analyzed, moved or recolored. Choose the variant that matches your layout.</p></fieldset><p>Check text, code and tables at playback size. Overlays and quiet areas can help contrast but cannot guarantee readability or accessibility on textured images.</p><p id="cb-image-info" role="status"></p><p id="cb-inheritance"></p><div id="cb-preview" class="cb-preview" aria-label="Staged background preview"></div><div class="cb-actions"><button id="cb-start">Start from presentation background</button><button id="cb-reset">Reset to original / inheritance</button><button id="cb-cancel">Cancel changes</button><button id="cb-apply">Apply background</button></div><p id="cb-status" role="status"></p>';
  const section=document.createElement('details');section.id='cb-inspector-background';section.className='ids-section';const summary=document.createElement('summary');summary.textContent='Background';const host=document.createElement('div');host.id='cb-inspector-host';section.append(summary,host);$('ic-slide-fields').append(section);idsRegister(section);
  $('fe-background-panel').prepend(panel);
  cbPlaceUI=()=>{const inSettings=$('we-settings').open,target=inSettings?$('fe-background-panel'):host;if(panel.parentElement===target)return;target.prepend(panel);panel.classList.toggle('cb-in-inspector',!inSettings);$('cb-scope').closest('label').hidden=!inSettings;$('cb-scope').value=inSettings?'presentation':'slide';state.identity='';state.dirty=false;load();};
  summary.addEventListener('click',()=>{if(!section.open){cbPlaceUI();cbRefreshUI(true);}});
  section.addEventListener('toggle',()=>{if(section.open){cbPlaceUI();cbRefreshUI();}});
  const state={identity:'',revision:0,selected:'',project:'',dirty:false,uploadEpoch:0,uploads:new Map(),root:null,controller:null};
  let bulk=null;
  function dispose(){bulk?.dispose();imageInfoEpoch++;imageInfoKey='';state.uploadEpoch++;state.controller?.dispose();state.controller=null;state.root=null;for(const resource of state.uploads.values())URL.revokeObjectURL(resource.url);state.uploads.clear();}
  function assets(selected){
    const paths=new Set([...mediaBlobs.keys(),...projectReferenced({state:projectState}),...state.uploads.keys()]);
    if(selected)paths.add(selected);$('cb-asset').replaceChildren();
    for(const path of [...paths].filter(p=>/\.(png|jpe?g|webp|svg)$/i.test(p)).slice(0,500))$('cb-asset').add(new Option(path.split('/').at(-1),path));
    if(selected)$('cb-asset').value=selected;
  }
  function read(){
    if($('cb-source').value==='inherit')return null;
    const kind=$('cb-kind').value;
    if(kind==='theme')return {kind};
    if(kind==='solid')return cbEngine.clean({kind,color:$('cb-color').value});
    if(kind==='gradient')return cbEngine.clean({kind,colors:[$('cb-first').value,$('cb-second').value],angle:Number($('cb-angle').value)});
    return cbEngine.clean({kind,asset:$('cb-asset').value,fit:$('cb-fit').value,focal:{x:Number($('cb-x').value)/100,y:Number($('cb-y').value)/100},fallback:$('cb-fallback').value,overlay:{color:$('cb-overlay-color').value,opacity:Number($('cb-overlay-opacity').value)/100},protectText:$('cb-protect').value});
  }
  let imageInfoEpoch=0,imageInfoKey='';
  async function imageInfo(){
    const path=$('cb-source').value==='custom'&&$('cb-kind').value==='image'?$('cb-asset').value:'';
    const key=JSON.stringify([state.identity,path,state.uploadEpoch]);if(key===imageInfoKey)return;imageInfoKey=key;const epoch=++imageInfoEpoch;
    $('cb-image-info').textContent='';if(!path)return;
    const blob=state.uploads.get(path)?.blob||mediaBlobs.get(path);
    if(!blob){$('cb-image-info').textContent='Image asset is missing. Reopen the complete editable ZIP or choose another image.';return;}
    const url=URL.createObjectURL(blob),image=new Image();image.src=url;
    try{await image.decode();if(epoch===imageInfoEpoch)$('cb-image-info').textContent=image.naturalWidth+' × '+image.naturalHeight+' pixels · '+(blob.size/1024).toFixed(1)+' KB · original retained';}
    catch{if(epoch===imageInfoEpoch)$('cb-image-info').textContent='Image could not be decoded. Choose a supported image.';}
    finally{URL.revokeObjectURL(url);}
  }
  function paint(){
    imageInfo();
    const inline=panel.parentElement===host;panel.querySelector(':scope > p').textContent=inline?'Applies to this slide only. Preview, then Apply; other slides and the presentation default stay unchanged.':'Preview changes before applying. Existing slide overrides are preserved.';$('cb-apply').textContent=inline?'Apply to this slide':'Apply background';$('cb-source').options[0].textContent=inline?'Use presentation background':'Original / inherited background';$('cb-source').options[1].textContent=inline?'Custom background for this slide':'Custom background';
    for(const node of panel.querySelectorAll('[data-cb-kind]'))node.hidden=node.dataset.cbKind!==$('cb-kind').value||$('cb-source').value==='inherit';
    $('cb-kind').disabled=$('cb-source').value==='inherit';
    $('cb-start').hidden=$('cb-scope').value!=='slide';
    const inherited=!projectState.backgrounds?.slides?.[state.selected],overrides=Object.keys(projectState.backgrounds?.slides||{}).length;
    $('cb-inheritance').textContent=$('cb-scope').value==='presentation'?`Presentation default · ${overrides} custom slide overrides preserved`:(inherited?'This slide inherits the presentation background.':'This slide has a complete custom override.');
    if(projectState.media?.[state.selected]?.layout==='background')$('cb-inheritance').textContent+=' Existing background media remains above this layer and may cover it; inspect that media in the canvas before applying.';
    if(!state.root)return;
    try{
      const config=read(),effective=config||($('cb-scope').value==='slide'?projectState.backgrounds?.defaults:null);
      state.controller.update(effective,studioPalette(projectState.brand));
      $('cb-apply').disabled=!!projectPlayback||ceLocked()||projectState.slides.some(s=>$('cb-scope').value==='presentation'&&s.editLocked);
      if(!state.dirty)$('cb-status').textContent='Preview only. Apply saves one undoable change.';
      bulk?.paint();
    }catch(error){$('cb-apply').disabled=true;$('cb-status').textContent=error.message;}
  }
  function load(){
    if(!projectReady||!projectModel())return;dispose();
    state.project=projectMeta.id;state.selected=projectSelected;state.revision=editingRevision();state.identity=JSON.stringify([state.project,state.selected,$('cb-scope').value]);state.dirty=false;
    const config=$('cb-scope').value==='presentation'?projectState.backgrounds?.defaults:projectState.backgrounds?.slides?.[state.selected];
    $('cb-source').value=config?'custom':'inherit';fill(config||cbEngine.resolve(projectState,state.selected)||{kind:'theme'});
    const root=studioPreviewModel(projectCopy(projectModel()),$('cb-preview'),studioPalette(projectState.brand));state.root=root;
    cbControllers.get(root)?.dispose();root.inert=true;root.setAttribute('aria-hidden','true');
    for(const video of root.querySelectorAll('video,audio')){video.removeAttribute('autoplay');video.pause();video.muted=true;const still=document.createElement('span');still.textContent='Video preview';video.replaceWith(still);}
    state.controller=cbEngine.mount(root,path=>state.uploads.get(path)?.url||mediaAssetURL(path));root.style.transform=`scale($('cb-preview').clientWidth/1920)`;
    studioGalleryRoots=studioGalleryRoots.filter(item=>item.root.isConnected);bulk?.load();paint();
  }
  function fill(config){
    $('cb-kind').value=config.kind;$('cb-color').value=config.color||'background';$('cb-first').value=config.colors?.[0]||'background';$('cb-second').value=config.colors?.[1]||'accent';$('cb-angle').value=config.angle??120;
    $('cb-overlay-color').value=config.overlay?.color||'ink';$('cb-overlay-opacity').value=(config.overlay?.opacity??0)*100;$('cb-protect').value=config.protectText||'off';
    assets(config.asset);$('cb-fit').value=config.fit||'fill';$('cb-x').value=(config.focal?.x??.5)*100;$('cb-y').value=(config.focal?.y??.5)*100;$('cb-fallback').value=config.fallback||'background';
  }
  for(const input of panel.querySelectorAll('input:not([type=file]),select:not(#cb-scope)'))input.addEventListener('input',()=>{state.dirty=true;paint();});
  $('cb-scope').onchange=load;
  $('cb-file').onchange=async event=>{
    const file=event.target.files[0],identity=state.identity,epoch=++state.uploadEpoch;event.target.value='';if(!file)return;
    if(file.size>50*1024*1024||!['image/png','image/jpeg','image/webp','image/svg+xml'].includes(file.type)){$('cb-status').textContent='Choose a PNG, JPEG, WebP or SVG image up to 50 MB.';return;}
    const url=URL.createObjectURL(file),image=new Image();image.src=url;
    try{await image.decode();if(!image.naturalWidth||image.naturalWidth>16000||image.naturalHeight>16000)throw Error('Choose an image no larger than 16000 pixels per side.');if(state.identity!==identity||epoch!==state.uploadEpoch){URL.revokeObjectURL(url);return;}
      const ext={'image/png':'png','image/jpeg':'jpg','image/webp':'webp','image/svg+xml':'svg'}[file.type],path='assets/'+projectID('background')+'.'+ext;
      for(const resource of state.uploads.values())URL.revokeObjectURL(resource.url);state.uploads.clear();
      state.uploads.set(path,{blob:file,url});assets(path);$('cb-kind').value='image';$('cb-source').value='custom';state.dirty=true;paint();
    }catch(error){URL.revokeObjectURL(url);$('cb-status').textContent='Image preview failed: '+error.message;}
  };
  $('cb-use-look').onclick=()=>{
    state.uploadEpoch++;
    const composition=$('cb-composition').value,right=composition==='text-right',divider=composition==='divider';
    let config={kind:'gradient',colors:divider?['background','muted']:['background','accent'],angle:right?270:90};
    if($('cb-look').value==='horizon'){
      // Original static geometry; no remote image or copied mock-up assets.
      const svg='<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080"><path fill="#dce6ef" d="M0 0h1920v1080H0z"/><path fill="#b2c8d8" d="M0 780 450 480 850 720 1270 340 1920 700v380H0z"/><path fill="#7898b2" d="m0 980 550-250 450 180 500-340 420 240v270H0z"/></svg>';
      const path='assets/'+projectID('quiet-horizon')+'.svg',blob=new Blob([svg],{type:'image/svg+xml'}),url=URL.createObjectURL(blob);
      for(const resource of state.uploads.values())URL.revokeObjectURL(resource.url);state.uploads.clear();
      state.uploads.set(path,{blob,url});
      config={kind:'image',asset:path,fit:'fill',focal:{x:.5,y:.5},fallback:'background',overlay:{color:'background',opacity:divider?.65:.4},protectText:divider?'off':right?'right':'left'};
    }
    fill(config);$('cb-source').value='custom';state.dirty=true;paint();$('cb-status').textContent='Look staged for '+composition+'. Review contrast before Apply; text and layout are unchanged.';
  };
  $('cb-start').onclick=()=>{fill(projectState.backgrounds?.defaults||{kind:'theme'});$('cb-source').value='custom';state.dirty=true;paint();};
  $('cb-reset').onclick=()=>{$('cb-source').value='inherit';state.dirty=true;paint();};
  $('cb-cancel').onclick=load;
  $('cb-apply').onclick=()=>{
    vbEnd(false);projectFlush();
    if(state.project!==projectMeta.id||state.selected!==projectSelected||state.revision!==editingRevision()){$('cb-status').textContent='The presentation changed. Cancel changes to refresh this preview before applying.';return;}
    try{if(bulk?.handles()){bulk.apply();return;}const config=read(),result=componentRun({type:'background.custom',slideId:state.selected,scope:$('cb-scope').value,...config?{config}:{reset:true}});if(!result.ok)return;
      for(const [path,resource]of state.uploads)if(projectReferenced().has(path))mediaRemember(path,resource.blob);
      cbSync();projectPreview();projectScheduleDraft();load();$('cb-status').textContent='Background applied. Undo restores the previous appearance.';
    }catch(error){$('cb-status').textContent=error.message;}
  };
  new ResizeObserver(()=>{if(state.root)state.root.style.transform=`scale($('cb-preview').clientWidth/1920)`;}).observe($('cb-preview'));
  cbRefreshUI=(force=false)=>{if(!$('full-editor').open||!force&&!panel.checkVisibility())return;const identity=JSON.stringify([projectMeta.id,projectSelected,$('cb-scope').value]);const changed=identity!==state.identity||state.revision!==editingRevision();if(!state.root||changed&&(!state.dirty||identity!==state.identity&&panel.parentElement===host))load();else paint();};
  $('we-settings').addEventListener('close',()=>{cbPlaceUI();cbRefreshUI();});
  $('full-editor').addEventListener('close',()=>{dispose();state.identity='';});
  bulk=cbExtendBackgroundUI?.({panel,state,read,fill,paint,load});
  cbPlaceUI();
  load();
}
const cbUIInit=projectInit;
projectInit=function(...args){const result=cbUIInit(...args);cbMountUI();return result;};
const cbUIForm=projectForm;
projectForm=function(...args){const result=cbUIForm(...args);cbRefreshUI();return result;};
const cbUISettings=weOpenSettings;
weOpenSettings=function(...args){const result=cbUISettings(...args);cbPlaceUI();cbRefreshUI();return result;};
const cbUICloseSettings=weCloseSettings;
weCloseSettings=function(...args){const result=cbUICloseSettings(...args);cbPlaceUI();cbRefreshUI();return result;};
const cbUITab=projectSelectTab;
projectSelectTab=function(...args){const result=cbUITab(...args);cbPlaceUI();cbRefreshUI();return result;};
