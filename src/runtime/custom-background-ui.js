let cbRefreshUI=()=>{};
function cbMountUI(){
  const panel=document.createElement('fieldset');panel.id='cb-panel';panel.className='cb-panel';
  panel.innerHTML='<legend>Background appearance</legend><p>Preview changes before applying. Existing slide overrides are preserved.</p><div class="cb-fields"><label>Scope<select id="cb-scope"><option value="presentation">Presentation</option><option value="slide">This slide</option></select></label><label>Settings source<select id="cb-source"><option value="inherit">Original / inherited background</option><option value="custom">Custom background</option></select></label><label>Background type<select id="cb-kind"><option value="theme">Theme</option><option value="solid">Solid</option><option value="gradient">Gradient</option><option value="image">Image</option></select></label><label data-cb-kind="solid">Color · hex or theme role<input id="cb-color" value="#10203a"></label><label data-cb-kind="gradient">First color<input id="cb-first" value="background"></label><label data-cb-kind="gradient">Second color<input id="cb-second" value="accent"></label><label data-cb-kind="gradient">Angle<input id="cb-angle" type="number" min="0" max="360" value="120"></label><label data-cb-kind="image">Image from this project<select id="cb-asset"></select></label><label data-cb-kind="image">Upload an image<input id="cb-file" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml"></label><label data-cb-kind="image">Image sizing<select id="cb-fit"><option value="fill">Fill · crop edges</option><option value="fit">Fit · show entire image</option></select></label><label data-cb-kind="image">Horizontal focal point (%)<input id="cb-x" type="number" min="0" max="100" value="50"></label><label data-cb-kind="image">Vertical focal point (%)<input id="cb-y" type="number" min="0" max="100" value="50"></label><label data-cb-kind="image">Fallback color · hex or theme role<input id="cb-fallback" value="background"></label></div><p id="cb-image-info" role="status"></p><p id="cb-inheritance"></p><div id="cb-preview" class="cb-preview" aria-label="Staged background preview"></div><div class="cb-actions"><button id="cb-start">Start from presentation background</button><button id="cb-reset">Reset to original / inheritance</button><button id="cb-cancel">Cancel changes</button><button id="cb-apply">Apply background</button></div><p id="cb-status" role="status"></p>';
  $('fe-background-panel').prepend(panel);
  const state={identity:'',revision:0,selected:'',project:'',dirty:false,uploadEpoch:0,uploads:new Map(),root:null,controller:null};
  function dispose(){imageInfoEpoch++;imageInfoKey='';state.uploadEpoch++;state.controller?.dispose();state.controller=null;state.root=null;for(const resource of state.uploads.values())URL.revokeObjectURL(resource.url);state.uploads.clear();}
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
    const original=cbEngine.resolve(projectState,state.selected);
    return cbEngine.clean({kind,asset:$('cb-asset').value,fit:$('cb-fit').value,focal:{x:Number($('cb-x').value)/100,y:Number($('cb-y').value)/100},fallback:$('cb-fallback').value,overlay:original?.kind==='image'?original.overlay:{color:'ink',opacity:0},protectText:original?.kind==='image'?original.protectText:'off'});
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
    studioGalleryRoots=studioGalleryRoots.filter(item=>item.root.isConnected);paint();
  }
  function fill(config){
    $('cb-kind').value=config.kind;$('cb-color').value=config.color||'background';$('cb-first').value=config.colors?.[0]||'background';$('cb-second').value=config.colors?.[1]||'accent';$('cb-angle').value=config.angle??120;
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
  $('cb-start').onclick=()=>{fill(projectState.backgrounds?.defaults||{kind:'theme'});$('cb-source').value='custom';state.dirty=true;paint();};
  $('cb-reset').onclick=()=>{$('cb-source').value='inherit';state.dirty=true;paint();};
  $('cb-cancel').onclick=load;
  $('cb-apply').onclick=()=>{
    vbEnd(false);projectFlush();
    if(state.project!==projectMeta.id||state.selected!==projectSelected||state.revision!==editingRevision()){$('cb-status').textContent='The presentation changed. Cancel changes to refresh this preview before applying.';return;}
    try{const config=read(),result=componentRun({type:'background.custom',slideId:state.selected,scope:$('cb-scope').value,...config?{config}:{reset:true}});if(!result.ok)return;
      for(const [path,resource]of state.uploads)if(projectReferenced().has(path))mediaRemember(path,resource.blob);
      cbSync();projectPreview();projectScheduleDraft();load();$('cb-status').textContent='Background applied. Undo restores the previous appearance.';
    }catch(error){$('cb-status').textContent=error.message;}
  };
  new ResizeObserver(()=>{if(state.root)state.root.style.transform=`scale($('cb-preview').clientWidth/1920)`;}).observe($('cb-preview'));
  cbRefreshUI=()=>{if(!$('full-editor').open||!panel.checkVisibility())return;const identity=JSON.stringify([projectMeta.id,projectSelected,$('cb-scope').value]);if(!state.root||identity!==state.identity&&!state.dirty)load();else paint();};
  const shortcut=componentButton('Edit slide background…',()=>{weOpenSettings('background');$('cb-scope').value='slide';load();panel.scrollIntoView({block:'start'});});
  shortcut.id='cb-slide-open';$('ic-slide-fields').append(shortcut);
  $('full-editor').addEventListener('close',()=>{dispose();state.identity='';});
  load();
}
const cbUIInit=projectInit;
projectInit=function(...args){const result=cbUIInit(...args);cbMountUI();return result;};
const cbUIForm=projectForm;
projectForm=function(...args){const result=cbUIForm(...args);cbRefreshUI();return result;};
const cbUISettings=weOpenSettings;
weOpenSettings=function(...args){const result=cbUISettings(...args);cbRefreshUI();return result;};
const cbUITab=projectSelectTab;
projectSelectTab=function(...args){const result=cbUITab(...args);cbRefreshUI();return result;};
