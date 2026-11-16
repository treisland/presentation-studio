// Optional authored policy. Absence preserves legacy slide/video timing exactly.
let adReady=false;
function adConfig(state=projectState){
 if(state.audio?.advancement)return projectCopy(state.audio.advancement);
 const overrides={};for(const slide of [...state.slides,...state.trash,...(state.sectionTrash||[]).flatMap(s=>s.slides)])overrides[slide.id]={mode:'legacy',seconds:slide.duration,paddingMs:state.audio?.slides?.[slide.id]?.paddingMs??500};
 return {mode:'manual',seconds:8,paddingMs:500,overrides};
}
editingRegisterOperation('slide.advancement',(state,op)=>{
 editingSlide(state,op.slideId);const audio=state.audio?audioCore.settings(state.audio):audioCore.empty(),cfg=adConfig(state);
 if(op.value===null)delete cfg.overrides[op.slideId];else cfg.overrides[op.slideId]=op.value;
 audio.advancement=audioCore.advancement(cfg,new Set([...state.slides,...state.trash,...(state.sectionTrash||[]).flatMap(s=>s.slides)].map(s=>s.id)));state.audio=audio;
});
function adRun(action){let failure;try{action();}catch(error){failure=error.message;auStatus(failure);}adPaint();if(failure)$('ad-message').textContent=failure;}
function adProjectChange(changes){if(auLocked('mode'))return;const cfg={...adConfig(),...changes};pmApply({type:'audio.settings',role:'advancement',slideId:projectSelected,advancement:cfg});}
function adSlideChange(prefix,field){if(auLocked('slide'))return;const selected=$(prefix+'-mode').value,mode=selected==='default'&&field==='pause'?'narration':selected,cfg=adConfig();pmApply({type:'slide.advancement',slideId:projectSelected,value:mode==='default'?null:{mode,seconds:Number($(prefix+'-seconds').value),paddingMs:Math.round(Number($(prefix+'-pause').value)*1000)}});}
function adStatus(id){const track=projectState.audio?.slides?.[id];return !track?'No narration':!mediaBlobs.has(track.src)?'Audio missing':'Narration · '+auTime(track.durationMs/1000)+(projectState.audio.mode!=='slide'?' · Inactive':'');}
function adLabel(rule){if(rule.mode==='legacy'&&rule.track?.advanceOnEnd)return 'After narration + '+rule.track.paddingMs/1000+' s pause';return rule.mode==='manual'?'Manual · click or key':rule.mode==='narration'?'After narration + '+(rule.track.paddingMs/1000)+' s pause':rule.mode==='timed'?'After '+rule.seconds+' seconds':'Existing timing · '+rule.seconds+' seconds';}
function adPaint(){
 if(!adReady||!projectReady)return;const cfg=adConfig(),audio=projectState.audio,track=auTrack('slide'),override=cfg.overrides[projectSelected],rule=auLive.rule(audio,projectSelected,projectModel()?.duration),missing=!!track&&!mediaBlobs.has(track.src),inactive=audio?.mode!=='slide';
 $('ad-defaults').hidden=audio?.mode==='overall';$('ad-default-mode').value=cfg.mode;$('ad-default-pause').value=cfg.paddingMs/1000;$('ad-default-seconds').value=cfg.seconds;
 for(const id of ['ad-default-mode','ad-default-pause','ad-default-seconds','ad-reset-all'])$(id).disabled=auLocked('mode');
 const ids=new Set(projectState.slides.map(s=>s.id)),count=Object.keys(cfg.overrides).filter(id=>ids.has(id)).length;
 $('ad-summary').textContent=(ids.size-count)+' slides follow defaults · '+count+' have overrides'+(!audio?.advancement?' · Existing timing is preserved until reset.':'');$('ad-review').disabled=!count;$('ad-reset-all').disabled=auLocked('mode')||!count;
 for(const prefix of ['ad-canvas','ad-inspector']){
  const select=$(prefix+'-mode');select.value=override?.mode||'default';select.options[0].textContent='Project default — '+(cfg.mode==='manual'?'Manual':'Automatic');
  select.querySelector('[value=narration]').disabled=!track||missing||inactive;
  select.querySelector('[value=legacy]').hidden=override?.mode!=='legacy';select.disabled=auLocked('slide')||!!recSession;
  $(prefix+'-seconds').value=override?.seconds??cfg.seconds;$(prefix+'-pause').value=(override?.paddingMs??cfg.paddingMs)/1000;
  $(prefix+'-seconds-label').hidden=override?.mode!=='timed';$(prefix+'-pause-label').hidden=rule.mode!=='narration';
  $(prefix+'-seconds').disabled=$(prefix+'-pause').disabled=select.disabled;$(prefix+'-reset').disabled=select.disabled||!override;$(prefix+'-reset').hidden=!override;
  $(prefix+'-status').textContent=adStatus(projectSelected);
  $(prefix+'-effective').textContent=missing?'Audio missing · manual advance until repaired.':override?.mode==='narration'&&inactive?'Narration inactive · manual advance.':adLabel(rule)+(override?' · Slide override':' · Project default');
 }
 $('fe-duration').hidden=rule.mode!=='legacy';const durationLabel=document.querySelector('label[for=fe-duration]');if(durationLabel)durationLabel.hidden=rule.mode!=='legacy';
 if(!recSession&&!recTake)$('rc-hint').textContent=adStatus(projectSelected);
 $('ad-canvas').hidden=!!recSession||!!recTake;$('ad-message').textContent=missing?'Repair or replace narration in Project media.':'';
}
function adControls(prefix){const el=document.createElement('div');el.id=prefix;el.className='ad-controls';el.innerHTML='<strong id="'+prefix+'-status"></strong><label>Advance slide<select id="'+prefix+'-mode"><option value="default">Project default</option><option value="manual">Manual — click or key</option><option value="narration">After narration</option><option value="timed">After a set time</option><option value="legacy">Existing timing</option></select></label><label id="'+prefix+'-seconds-label">Slide time (seconds)<input id="'+prefix+'-seconds" type="number" min="3" max="600" step="1"></label><label id="'+prefix+'-pause-label">End pause (seconds)<input id="'+prefix+'-pause" type="number" min="0" max="600" step="0.1"></label><small id="'+prefix+'-effective"></small><button id="'+prefix+'-reset">Use project default</button>';
 for(const suffix of ['mode','seconds','pause'])el.querySelector('#'+prefix+'-'+suffix).onchange=()=>adRun(()=>adSlideChange(prefix,suffix));el.querySelector('#'+prefix+'-reset').onclick=()=>adRun(()=>{if(!auLocked('slide'))pmApply({type:'slide.advancement',slideId:projectSelected,value:null});});return el;}
function adMount(){
 const card=document.createElement('fieldset');card.id='ad-defaults';card.innerHTML='<legend>Slide narration defaults</legend><label>Advance narrated slides<select id="ad-default-mode"><option value="manual">Manually</option><option value="auto">After narration ends</option></select></label><label>Pause after narration (seconds)<input id="ad-default-pause" type="number" min="0" max="600" step="0.1" value="0.5"></label><p>Applies to slides using the project default. Individual slide overrides are preserved. Manual holds slides; automatic uses the silent-slide timer when narration is absent. Background music never controls slide advancement.</p><p id="ad-summary"></p><button id="ad-review">Review overrides</button><button id="ad-reset-all">Reset all slides to project default…</button><button id="ad-timing-link">Silent-slide timing…</button>';$('au-mode').closest('label').after(card);
 const timing=document.createElement('fieldset');timing.id='ad-timing';timing.innerHTML='<legend>Automatic slide timing</legend><label>Slides without active narration (seconds)<input id="ad-default-seconds" type="number" min="3" max="600" step="1" value="8"></label><p>Used when narration defaults are automatic. Timed slide overrides retain their own duration.</p><button id="ad-audio-link">Narration defaults…</button>';$('fe-settings-panel').append(timing);
 $('ad-default-mode').onchange=()=>adRun(()=>adProjectChange({mode:$('ad-default-mode').value}));$('ad-default-pause').onchange=()=>adRun(()=>adProjectChange({paddingMs:Math.round(Number($('ad-default-pause').value)*1000)}));$('ad-default-seconds').onchange=()=>adRun(()=>adProjectChange({seconds:Number($('ad-default-seconds').value)}));
 $('ad-timing-link').onclick=()=>{projectSelectTab('settings');$('ad-timing').scrollIntoView({block:'nearest'});$('ad-default-seconds').focus();};$('ad-audio-link').onclick=()=>{projectSelectTab('audio');$('ad-default-mode').focus();};
 $('ad-reset-all').onclick=()=>adRun(()=>{if(!auLocked('mode')&&confirm('Reset all slide advancement overrides to the project default? You can Undo this change.'))adProjectChange({overrides:{}});});
 const review=document.createElement('div');review.id='ad-overrides';review.hidden=true;card.append(review);$('ad-review').onclick=()=>{review.hidden=!review.hidden;review.replaceChildren();for(const slide of projectState.slides)if(adConfig().overrides[slide.id]){const b=componentButton(slide.title+' · '+adLabel(auLive.rule(projectState.audio,slide.id,slide.duration)),()=>{projectFlush();$('we-settings').close();projectSelected=slide.id;projectBlockPath='';projectTablePath='';projectList();projectForm();projectPreview();$('ad-canvas-mode').focus();});review.append(b);}};
 document.querySelector('#rc-strip .rc-main').append(adControls('ad-canvas'));auCards.get('slide').card.append(adControls('ad-inspector'));const message=document.createElement('p');message.id='ad-message';message.setAttribute('role','status');$('rc-strip').append(message);
 adReady=true;adPaint();
}
const adForm=projectForm;projectForm=function(...args){const result=adForm(...args);adPaint();return result;};
const adAudioPaint=auPaint;auPaint=function(...args){const result=adAudioPaint(...args);adPaint();return result;};
const adRecordPaint=recPaint;recPaint=function(...args){const result=adRecordPaint(...args);adPaint();return result;};
const adList=projectList;projectList=function(...args){const result=adList(...args);if(!projectReady)return result;for(const badge of $('fe-slide-list').querySelectorAll('.pm-narration-badge'))badge.remove();for(const button of $('fe-slide-list').querySelectorAll('.fe-slide-button')){const badge=document.createElement('span');badge.className='pm-narration-badge';badge.textContent=adStatus(button.dataset.slideId);badge.dataset.missing=String(badge.textContent==='Audio missing');const previous=button.dataset.adStatus,label=button.getAttribute('aria-label')||projectModel(button.dataset.slideId).title;button.setAttribute('aria-label',(previous&&label.endsWith(' · '+previous)?label.slice(0,-previous.length-3):label)+' · '+badge.textContent);button.dataset.adStatus=badge.textContent;button.append(badge);}return result;};
const adInit=projectInit;projectInit=function(...args){const result=adInit(...args);adMount();return result;};
