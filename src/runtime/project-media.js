// Author workspace only. Asset paths are immutable identities; originals are retained.
const pmBudget=95*1024*1024;
const pmHealth=new Map();
let pmSelected='',pmRows=[],pmOrigin=null,pmBusy=false,pmEpoch=0,pmPreview=null;
function pmKind(path,blob){const type=blob?.type||hubMime(path);return type.startsWith('image/')?'image':type.startsWith('audio/')?'audio':/\.(mp3|wav|m4a|aac|oga)$/i.test(path)?'audio':'video';}
function pmLibrary(raw){
 if(!raw||raw.version!==1||!raw.entries||typeof raw.entries!=='object'||Array.isArray(raw.entries)||Object.keys(raw).some(k=>!['version','entries'].includes(k)))throw Error('Invalid media library.');
 const entries=Object.create(null);if(Object.keys(raw.entries).length>900)throw Error('Too many library assets.');
 for(const [path,item]of Object.entries(raw.entries)){
  if(!lwSafePath(path)||!item||Object.keys(item).some(k=>!['name','kind','origin','bytes','sha256','durationMs','width','height'].includes(k))||typeof item.name!=='string'||!item.name.length||item.name.length>255||!['image','video','audio','recording'].includes(item.kind)||!['imported','recorded'].includes(item.origin)||!Number.isSafeInteger(item.bytes)||item.bytes<1||item.bytes>lwLimits.expanded)throw Error('Invalid media library entry.');
  if(item.sha256!==undefined&&!/^[a-f0-9]{64}$/.test(item.sha256))throw Error('Invalid original digest.');
  for(const key of ['durationMs','width','height'])if(item[key]!==undefined&&(!Number.isSafeInteger(item[key])||item[key]<1||item[key]>(key==='durationMs'?86400000:100000)))throw Error('Invalid media dimensions or duration.');
  entries[path]={...item};
 }return {version:1,entries};
}
const pmValidateState=projectValidateState;
projectValidateState=function(raw,...args){const state=pmValidateState(raw,...args);if(Object.hasOwn(raw,'assetLibrary'))state.assetLibrary=pmLibrary(raw.assetLibrary);return state;};
function pmHas(pack){return auStates(pack).some(state=>Object.hasOwn(state,'assetLibrary'));}
const pmValidatePack=projectValidatePack;
projectValidatePack=function(raw){
 if(pmHas(raw)&&raw?.schemaVersion!==6)throw Error('Project media requires native format v6. Open in a media-library-capable Studio.');
 if(raw?.schemaVersion===6){const result=pmValidatePack({...raw,schemaVersion:auHas(raw)?5:cbHasSettings(raw)?4:bgHasSettings(raw)?3:2});result.schemaVersion=6;return result;}
 return pmValidatePack(raw);
};
const pmPack=projectPack;
projectPack=function(playback=false){const pack=pmPack(playback);if(playback)delete pack.state.assetLibrary;else if(pmHas(pack))pack.schemaVersion=6;return pack;};
const pmReferenced=projectReferenced;
projectReferenced=function(pack=projectPack()){const refs=pmReferenced(pack);if(pack&&!pack.playbackOnly)for(const state of auStates(pack))for(const path of Object.keys(state.assetLibrary?.entries||{}))refs.add(path);return refs;};
const pmLoad=lwLoad;
lwLoad=async function(file,options={}){const result=await pmLoad(file,options);if(!result.pack)return result;const hashes=new Map();for(const state of auStates(result.pack))for(const [path,item]of Object.entries(state.assetLibrary?.entries||{})){if(options.cancelled?.())throw Error('Import cancelled.');const blob=result.assets.get(path);if(!blob&&options.allowMissingAssets&&/\.json$/i.test(file.name))continue;if(!blob||blob.size!==item.bytes)throw Error('Missing or damaged library original: '+item.name);if(item.sha256){if(!hashes.has(path))hashes.set(path,await pmHash(blob));if(hashes.get(path)!==item.sha256)throw Error('Original digest mismatch: '+item.name);}}return result;};
async function pmHash(blob){if(!crypto.subtle)return undefined;return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer())),n=>n.toString(16).padStart(2,'0')).join('');}
function pmSize(pack=projectPack(),extra=0){let bytes=new TextEncoder().encode(JSON.stringify(pack)).length+extra;for(const path of projectReferenced(pack))bytes+=mediaBlobs.get(path)?.size||pack.state?.assetLibrary?.entries?.[path]?.bytes||0;return bytes;}
function pmCheckBudget(extra=0,pack=projectPack()){if(pmSize(pack,extra)>pmBudget)throw Error('This change exceeds the 95 MiB portable project budget, including retained originals and recovery. Download this file separately or use a clean project copy.');if(projectReferenced(pack).size>=900)throw Error('The project has reached the portable asset count limit.');}
// Mutable slots are derived from a candidate state, never captured across async work.
function pmSlots(state){
 const slots=[],slides=new Map((state.slides||[]).map((s,i)=>[s.id,{...s,index:i+1}]));
 const add=(holder,key,slideId,label,active=true,role=null)=>{if(holder?.[key]&&lwSafePath(holder[key]))slots.push({holder,key,path:holder[key],slideId,label,active:active&&(!slideId||slides.has(slideId)&&!slides.get(slideId).hidden),role});};
 for(const [id,cfg]of Object.entries(state.media||{})){add(cfg,'src',id,'Slide media',true);add(cfg,'poster',id,'Video poster',true);}
 for(const [id,objects]of Object.entries(state.mediaObjects||{}))for(const object of objects){add(object.media,'src',id,'Object '+object.id,!object.hidden);add(object.media,'poster',id,'Object poster '+object.id,!object.hidden);}
 for(const [id,track]of Object.entries(state.audio?.slides||{}))add(track,'src',id,'Slide narration',state.audio.mode==='slide','slide');
 add(state.audio?.overall,'src',null,'Presentation narration',state.audio?.mode==='overall','overall');add(state.audio?.music,'src',null,'Soundtrack',true,'music');
 for(const key of ['logo','logoLight','logoDark'])add(state.brand,key,null,'Brand '+key,true);
 for(const [id,cfg]of Object.entries(state.backgrounds?.slides||{}))add(cfg,'asset',id,'Background',true);
 add(state.backgrounds?.defaults,'asset',null,'Presentation background',true);
 return slots;
}
function pmCollect(pack=projectPack()){
 const states=auStates(pack),slots=pmSlots(pack.state),refs=projectReferenced(pack),entries=Object.assign({},...states.filter(state=>state!==pack.state).map(state=>state.assetLibrary?.entries||{}),pack.state.assetLibrary?.entries||{}),eligible=projectReferenced(projectPack(true)),historical=states.flatMap(state=>pmSlots(state));
 for(const slot of slots)slot.active=slot.active&&eligible.has(slot.path);
 const retained=new Set(pmReferenced(pack));for(const state of auStates(pack))if(state!==pack.state)for(const path of Object.keys(state.assetLibrary?.entries||{}))retained.add(path);
 return [...refs].sort().map(path=>{const uses=slots.filter(s=>s.path===path),blob=mediaBlobs.get(path),meta=entries[path],track=(uses.find(s=>s.role)||historical.find(s=>s.path===path&&s.role))?.holder;const status=uses.some(s=>s.active)?'In use':uses.length?'Inactive':retained.has(path)?'Retained for recovery':'Unused';return {path,blob,uses,status,name:meta?.name||track?.name||(uses.find(s=>s.key==='src')||historical.find(s=>s.path===path&&s.key==='src'))?.holder.name||path.split('/').pop(),kind:meta?.kind||(track?'audio':pmKind(path,blob)),meta};});
}
function pmGuard(){editingGuard();if(!weEditing()||vbMode!=='edit'||projectState.editLocked)throw Error('Open an unlocked project in Edit blocks mode.');}
function pmApply(operation){projectFlush();const snapshot=studioEditing.read(),result=studioEditing.apply({apiVersion:1,projectId:snapshot.projectId,expectedRevision:snapshot.revision,operations:[operation]});if(!result.ok)throw Error(result.message);return result;}
editingRegisterOperation('media.library',(state,op)=>{
 if(state.editLocked)editingFail('LOCKED','Unlock the project first.');
 if(op.entries){state.assetLibrary=pmLibrary({version:1,entries:op.entries});pmCheckBudget(8192,{state,history:{past:projectPast.concat([projectState]),future:projectFuture},checkpoints:projectCheckpoints.concat([{state:projectState}])});}
 if(op.action==='rename'){
  const item=state.assetLibrary?.entries[op.path];if(!item||typeof op.name!=='string'||!op.name.trim()||op.name.length>255)editingFail('INVALID','Enter a media name (1–255 characters).');item.name=op.name.trim();
 }
 if(['replace','remove'].includes(op.action)){
  const slots=pmSlots(state).filter(s=>s.path===op.path),chosen=op.all?slots:slots.filter((s,i)=>i===op.index);
  if(!chosen.length)editingFail('INVALID','Select an assignment.');
  for(const slot of chosen){if(slot.slideId)editingSlide(state,slot.slideId);else if(state.slides.some(s=>s.editLocked))editingFail('LOCKED','Unlock all slides before changing shared presentation media.');
   if(slot.holder.canvas?.locked)editingFail('LOCKED','Unlock this media object first.');
   if(op.action==='remove'){
    if(slot.role==='slide')delete state.audio.slides[slot.slideId];else if(slot.role)state.audio[slot.role]=null;
    else if(slot.key==='asset'){slot.holder.kind='theme';for(const k of Object.keys(slot.holder))if(k!=='kind')delete slot.holder[k];}
    else if(slot.key==='src'){
     let object='primary';if(state.media[slot.slideId]===slot.holder)delete state.media[slot.slideId];
     else {object=state.mediaObjects?.[slot.slideId]?.find(o=>o.media===slot.holder)?.id;state.mediaObjects[slot.slideId]=state.mediaObjects[slot.slideId].filter(o=>o.media!==slot.holder);}
     const root=mgRoot(state.slides.find(s=>s.id===slot.slideId));for(const cell of root?.children||[])if(mgObjectID(cell)===object)mgMark(cell,'');
    }else delete slot.holder[slot.key];
   }else{
    slot.holder[slot.key]=op.newPath;
    if(slot.role){const item=op.entries[op.newPath];slot.holder.name=item.name;slot.holder.bytes=item.bytes;slot.holder.mime=op.mime;slot.holder.durationMs=item.durationMs;}
    else if(slot.key==='src')slot.holder.name=op.entries[op.newPath].name;
   }
  }
 }
});
async function pmEntries(){const entries={...projectState.assetLibrary?.entries};for(const row of pmCollect())if(row.blob&&!entries[row.path])entries[row.path]={name:String(row.name).slice(0,255),kind:row.kind,origin:row.kind==='recording'?'recorded':'imported',bytes:row.blob.size,sha256:await pmHash(row.blob)};for(const entry of Object.values(entries))if(entry.sha256===undefined)delete entry.sha256;return entries;}
function pmMessage(text){$('pm-status').textContent=text;}
function pmStopPreview(){if(pmPreview){pmPreview.pause?.();pmPreview.removeAttribute('src');pmPreview.load?.();pmPreview=null;} $('pm-preview')?.replaceChildren();}
function pmText(tag,text,parent){const node=document.createElement(tag);node.textContent=text;parent?.append(node);return node;}
function pmButton(text,id,action,parent){const button=componentButton(text,()=>pmRun(action));if(id)button.id=id;parent.append(button);return button;}
async function pmRun(action){if(pmBusy)return;pmBusy=true;try{await action();}catch(error){if($('rec-dialog')?.open)recStatus(error.message);else pmMessage(error.message);}finally{pmBusy=false;}}
function pmSelect(path){pmSelected=path;pmPaint();}
function pmPaint(){
 if(!$('pm-dialog')?.open)return;pmRows=pmCollect();const query=$('pm-search').value.toLowerCase(),filter=$('pm-filter').value,body=$('pm-body');body.replaceChildren();
 const bytes=pmSize();$('pm-budget').value=Math.min(bytes,pmBudget);$('pm-budget-label').textContent=(bytes/1048576).toFixed(1)+' of 95 MiB portable project budget used';
 const rows=pmRows.filter(r=>(!query||(r.name+' '+r.path+' '+r.status).toLowerCase().includes(query))&&(filter==='all'||(filter==='attention'?!r.blob||pmHealth.has(r.path):r.kind===filter)));
 if(!pmRows.some(row=>row.path===pmSelected))pmSelected=rows[0]?.path||'';
 for(const row of rows){const tr=document.createElement('tr');tr.classList.toggle('pm-selected',row.path===pmSelected);const name=pmText('td','',tr),button=componentButton(row.name,()=>pmSelect(row.path));button.setAttribute('aria-pressed',String(row.path===pmSelected));name.append(button);pmText('td',row.kind,tr);pmText('td',row.blob?mediaBytes(row.blob.size):'—',tr);pmText('td',row.blob?(pmHealth.has(row.path)?'Unsupported preview':row.status):'Missing',tr);body.append(tr);}
 $('pm-empty').hidden=!!rows.length;const row=pmRows.find(r=>r.path===pmSelected)||rows[0];if(row)pmSelected=row.path;pmDetail(row);
}
function pmDetail(row){
 pmStopPreview();const detail=$('pm-detail');detail.replaceChildren();if(!row){pmText('p','No project media yet. Attach a file or record slide narration.',detail);return;}
 pmText('h3',row.name,detail);pmText('p',(row.meta?.origin==='recorded'?'Recorded in Studio':'Imported original')+' · '+row.kind+' · '+(row.blob?mediaBytes(row.blob.size):'Missing original'),detail);
 const preview=document.createElement('div');preview.id='pm-preview';detail.append(preview);
 if(row.blob){const node=document.createElement(row.kind==='image'?'img':row.kind==='video'?'video':'audio');node.src=mediaAssetURL(row.path);if(node.tagName==='IMG')node.alt=row.name;else{node.controls=true;node.preload='metadata';}preview.append(node);pmPreview=node;
  node.onerror=()=>{pmHealth.set(row.path,'Unsupported preview');pmMessage('Original bytes are available, but this browser cannot preview them. Download the original or replace with a supported file.');};
  if(node.tagName==='IMG')node.onload=()=>{if(node===pmPreview)pmText('p',node.naturalWidth+' × '+node.naturalHeight+' pixels',preview);};
  else node.onloadedmetadata=()=>{if(node===pmPreview)pmText('p',(Number.isFinite(node.duration)?auTime(node.duration):'Duration unavailable')+(node.videoWidth?' · '+node.videoWidth+' × '+node.videoHeight:''),preview);};
 }
 pmText('h4','Used in',detail);const select=document.createElement('select');select.id='pm-use';select.setAttribute('aria-label','Assignment to change');
 row.uses.forEach((use,i)=>{const slide=projectState.slides.find(s=>s.id===use.slideId),label=(slide?'Slide '+(projectState.slides.indexOf(slide)+1)+' · '+slide.title+' · ':'')+use.label+(use.active?' · Active':' · Inactive');const option=pmText('option',label,select);option.value=i;});detail.append(select);select.disabled=!row.uses.length;
 if(!row.uses.length)pmText('p',row.status==='Retained for recovery'?'Retained by Undo, checkpoints or Trash.':'No current assignments. Original retained in this project.',detail);
 const actions=document.createElement('div');actions.className='pm-actions';detail.append(actions);
 pmButton('Show slide','pm-show',()=>{const use=row.uses[Number(select.value)];if(!use?.slideId)return pmMessage('This is presentation-wide or retained media.');projectSelected=use.slideId;projectList();projectForm();projectPreview();$('pm-dialog').close();},actions).disabled=!row.uses.some(s=>s.slideId&&projectModel(s.slideId));
 const label=pmText('label','Display name',detail),rename=document.createElement('input');rename.id='pm-name';rename.value=row.name;rename.maxLength=255;label.append(rename);actions.before(label);
 pmButton('Rename','pm-rename',async()=>{pmGuard();const identity=auIdentity(),entries=await pmEntries();if(identity!==auIdentity())throw Error('Project changed. Try again.');pmApply({type:'media.library',action:'rename',path:row.path,name:rename.value,entries});pmPaint();pmMessage('Display name updated. Original identity and bytes retained.');},actions).disabled=!row.blob;
 pmButton('Download original','pm-download',()=>{if(!row.blob)throw Error('Original is missing. Locate an intact copy first.');mediaDownload(row.blob,pmDownloadName(row));pmMessage('Original download started.');},actions).disabled=!row.blob;
 pmText('p','Replacement preserves settings and creates one Undo step. Shared originals remain in recovery.',detail);
 const repair=document.createElement('details');repair.id='pm-repair';pmText('summary','Replace or locate original',repair);detail.append(repair);const replaceLabel=pmText('label','Choose replacement or locate original',repair),file=document.createElement('input');file.id='pm-file';file.type='file';replaceLabel.append(file);
 const allLabel=pmText('label','',repair),all=document.createElement('input');all.type='checkbox';all.id='pm-all';allLabel.append(all,document.createTextNode('Replace all current uses (including inactive attachments)'));
 pmButton('Review selected file','pm-replace',()=>pmReplace(row,file.files[0],all.checked,Number(select.value)),repair).disabled=!row.uses.length&&!!row.blob;
 const folderLabel=pmText('label','Locate candidates in a folder you select',repair),folder=document.createElement('input');folder.type='file';folder.multiple=true;folder.setAttribute('webkitdirectory','');folder.id='pm-folder';folderLabel.append(folder);
 folder.onchange=()=>pmRun(async()=>{const identity=auIdentity();pmText('p','Select a candidate below; names and sizes alone do not prove an exact match.',repair);for(const candidate of [...folder.files].slice(0,900)){if(identity!==auIdentity())throw Error('Project changed. Reopen media.');let exact=false;if(row.meta?.sha256&&candidate.size===row.meta.bytes)exact=await pmHash(candidate)===row.meta.sha256;if(!exact&&candidate.name!==row.name&&candidate.name!==row.path.split('/').pop())continue;pmButton((exact?'Exact original: ':'Candidate: ')+candidate.name,null,()=>pmReplace(row,candidate,all.checked,Number(select.value)),repair);}});
 const remove=pmButton('Remove selected assignment','pm-remove',async()=>{pmGuard();if(!confirm('Remove this assignment? Original bytes and other uses remain available.'))return;const entries=await pmEntries();pmApply({type:'media.library',action:'remove',path:row.path,index:Number(select.value),entries});pmPaint();pmMessage('Assignment removed. Original retained.');},detail);remove.disabled=!row.uses.length;
 if(!row.blob){const recover=pmButton('Check browser recovery copy','pm-recover',()=>pmRecover(row),repair);repair.open=true;replaceLabel.before(recover);}
}
async function pmRecover(row){pmGuard();const identity=auIdentity();await hubDatabase();const blob=await projectDBGet('assets',projectMeta.id+'|'+row.path);if(identity!==auIdentity())throw Error('Project changed. Reopen media.');if(!blob)throw Error('No intact copy at this asset identity in browser recovery. Select the original file or a reviewed replacement.');if(row.meta&&(blob.size!==row.meta.bytes||row.meta.sha256&&await pmHash(blob)!==row.meta.sha256))throw Error('Recovery copy does not match the original.');if(identity!==auIdentity())throw Error('Project changed. Reopen media.');mediaRemember(row.path,blob);projectModified();pmPaint();pmMessage('Restored original bytes from browser recovery.');}
function pmDownloadName(row){const extension=row.path.split('.').pop().replace(/[^a-z0-9]/gi,'').slice(0,12),name=mediaFilename(row.name).replace(/[. ]+$/,'')||'media';const safe=/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(name)?'media-'+name:name;return safe.toLowerCase().endsWith('.'+extension.toLowerCase())?safe:safe+'.'+extension;}
async function pmReplace(row,file,all,index){
 pmGuard();if(!file)throw Error('Choose a replacement file first.');if(!file.size||file.name.length>255)throw Error('Choose a nonempty file with a filename of at most 255 characters.');projectFlush();const identity=auIdentity(),dialogEpoch=pmEpoch;
 // Prefer intact local recovery at the original identity before asking for replacement.
 if(!row.blob){try{await pmRecover(row);return;}catch(error){if(identity!==auIdentity())throw error;}}
 pmCheckBudget(file.size+4096);let info={},kind=row.kind,mime=file.type;
 if(['audio','recording'].includes(kind)){info=await audioCore.probe(file,file.name,file.type);mime=info.mime;kind='audio';}
 else if(kind==='image'){await cbValidateImage(file);}
 else {if(!file.type.startsWith('video/'))throw Error('Choose a supported video file.');const url=URL.createObjectURL(file),node=document.createElement('video');try{await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Video metadata timed out.')),15000);node.onloadedmetadata=()=>{clearTimeout(timer);Number.isFinite(node.duration)?resolve():reject(Error('Video duration is unavailable.'));};node.onerror=()=>{clearTimeout(timer);reject(Error('Unsupported video.'));};node.src=url;});}finally{node.removeAttribute('src');node.load();URL.revokeObjectURL(url);}}
 const sha256=await pmHash(file),exact=!!row.meta?.sha256&&row.meta.sha256===sha256;
 if(identity!==auIdentity()||dialogEpoch!==pmEpoch||!$('pm-dialog').open)throw Error('Project or selection changed. Review again.');
 if(!confirm((exact?'Exact original bytes verified.':'This is a replacement; an exact original match has not been established.')+'\n'+file.name+' · '+mediaBytes(file.size)+'\nReplace '+(all?'all '+row.uses.length+' current uses':'the selected assignment')+'?'))return;
 if(exact&&!row.blob){mediaRemember(row.path,file);projectModified();pmPaint();pmMessage('Exact original restored at its stable identity.');return;}
 const entries=await pmEntries(),path='assets/media-'+projectID('asset')+'-'+mediaFilename(file.name);entries[path]={name:file.name.slice(0,255),kind,origin:'imported',bytes:file.size,...sha256?{sha256}:{},...info.durationMs?{durationMs:info.durationMs}:{}};
 if(identity!==auIdentity())throw Error('Project changed. Review again.');pmCheckBudget(file.size+new TextEncoder().encode(JSON.stringify(entries)).length);mediaRemember(path,file);
 try{pmApply({type:'media.library',action:'replace',path:row.path,newPath:path,index,all,entries,mime});}catch(error){URL.revokeObjectURL(mediaURLs.get(path));mediaURLs.delete(path);mediaBlobs.delete(path);throw error;}
 pmSelected=path;pmPaint();pmMessage('Replacement applied. Original bytes and settings retained for Undo.');
}
async function pmBulk(){
 const rows=pmCollect().filter(row=>$('pm-export-scope').value==='all'||row.uses.some(s=>s.active)),missing=rows.filter(row=>!row.blob);
 if(missing.length&&!$('pm-incomplete').checked)throw Error('Missing originals: '+missing.map(r=>r.name).join(', ')+'. Acknowledge an incomplete export to continue.');
 const zip=new JSZip(),used=new Set(['manifest.json']),manifest=[];
 for(const row of rows){let name=pmDownloadName(row),n=2;const dot=name.lastIndexOf('.'),base=dot>0?name.slice(0,dot):name,ext=dot>0?name.slice(dot):'';while(used.has(name.toLowerCase()))name=base+'-'+n+++ext;used.add(name.toLowerCase());
  if(row.blob)zip.file(name,row.blob);manifest.push({identity:row.path,name:row.name,file:row.blob?name:null,missing:!row.blob,kind:row.kind,origin:row.meta?.origin||'imported',bytes:row.blob?.size||null,sha256:row.blob?await pmHash(row.blob):row.meta?.sha256,usage:row.uses.map(u=>({slideId:u.slideId,role:u.label,active:u.active})),status:row.status});}
 zip.file('manifest.json',JSON.stringify({version:1,project:projectMeta.name,incomplete:!!missing.length,assets:manifest},null,2));mediaDownload(await zip.generateAsync({type:'blob',compression:'STORE'}),mediaFilename(projectMeta.name)+'-original-media.zip');pmMessage('Media ZIP download started'+(missing.length?' with acknowledged missing originals.':'.'));
}
function pmOpen(){try{pmGuard();projectFlush();auStopPreview();pmOrigin=document.activeElement;pmEpoch++;$('pm-incomplete').checked=false;$('pm-dialog').classList.toggle('editor-dark',document.body.classList.contains('editor-dark'));$('pm-dialog').showModal();pmPaint();$('pm-search').focus();}catch(error){projectMessage(error.message);}}
function pmMount(){
 const dialog=document.createElement('dialog');dialog.id='pm-dialog';dialog.className='pm-dialog';dialog.setAttribute('aria-labelledby','pm-title');dialog.innerHTML='<header><div><h2 id="pm-title">Project media</h2><p>Manage files, recordings and where they are used</p></div><button id="pm-close" aria-label="Close project media">×</button></header><label id="pm-budget-label" for="pm-budget"></label><progress id="pm-budget" max="99614720"></progress><p class="pm-muted">Includes originals, project data and recovery history</p><div class="pm-toolbar"><input id="pm-search" type="search" placeholder="Search media…" aria-label="Search media"><select id="pm-filter" aria-label="Filter media"><option value="all">All media</option><option value="image">Images</option><option value="video">Video</option><option value="audio">Audio</option><option value="recording">Recordings</option><option value="attention">Needs attention · missing</option></select><button id="pm-record">Record slide narration</button></div><div class="pm-columns"><section class="pm-list"><table><caption class="sr-only">Project originals and usage</caption><thead><tr><th scope="col">Name</th><th scope="col">Type</th><th scope="col">Size</th><th scope="col">Usage</th></tr></thead><tbody id="pm-body"></tbody></table><p id="pm-empty">No media matches this search.</p></section><section id="pm-detail" aria-label="Selected media"></section></div><footer><label>Download scope<select id="pm-export-scope"><option value="used">Used in presentation</option><option value="all">All available, including inactive and recovery</option></select></label><label><input id="pm-incomplete" type="checkbox">I acknowledge missing originals will be listed but omitted</label><button id="pm-bulk">Download media ZIP</button></footer><p id="pm-status" role="status" aria-live="polite">Shared originals remain available to other slides and recovery history.</p>';
 document.body.append(dialog);$('pm-close').onclick=()=>dialog.close();dialog.onclose=()=>{pmEpoch++;pmStopPreview();recStop('Project media closed.');pmOrigin?.focus();};$('pm-search').oninput=pmPaint;$('pm-filter').onchange=pmPaint;$('pm-bulk').onclick=()=>pmRun(pmBulk);$('pm-record').onclick=()=>recOpen();
 const button=componentButton('Project media…',pmOpen);button.id='pm-open';$('au-slide').append(button);
 const previous=emRows;emRows=function(name){const rows=previous(name);if(name==='Insert')rows.push({label:'Project media…',action:pmOpen});return rows;};
}
const pmInit=projectInit;projectInit=function(...args){const result=pmInit(...args);pmMount();recMount();return result;};
const pmAccept=projectAcceptPack;projectAcceptPack=function(...args){pmEpoch++;if($('pm-dialog')?.open)$('pm-dialog').close();recStop('Project changed. The take cannot replace narration.');return pmAccept(...args);};
const pmList=projectList;projectList=function(...args){const result=pmList(...args);if(!projectReady)return result;for(const badge of $('fe-slide-list').querySelectorAll('.pm-narration-badge'))badge.remove();for(const button of $('fe-slide-list').querySelectorAll('[data-slide-id]'))if(projectState.audio?.slides?.[button.dataset.slideId]){const badge=pmText('span','● Narration',button);badge.className='pm-narration-badge';}return result;};
