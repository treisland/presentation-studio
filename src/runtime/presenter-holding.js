// Holding screens are static public snapshots, never a second live playback deck.
let phState=null;
function phSafeDocument(html){
  const policy='<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src data:; style-src \'unsafe-inline\'">';
  return /<head\b[^>]*>/i.test(html)?html.replace(/<head\b[^>]*>/i,head=>head+policy):'<!doctype html><html><head>'+policy+'</head><body>'+html+'</body></html>';
}
function phBuiltin(){return '<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;width:1920px;height:1080px;overflow:hidden;background:#064bdb;color:white;font-family:Arial,sans-serif}main{width:1920px;height:1080px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(135deg,#07348b,#0868ff)}.pause{font-size:110px;border:6px solid white;border-radius:50%;width:160px;height:160px;display:grid;place-items:center}h1{font-size:92px;margin:55px 0 24px}p{font-size:42px;margin:0}</style></head><body><main><div class="pause">Ⅱ</div><h1>We’ll be right back</h1><p>Thank you for your patience</p></main></body></html>';}
function phFrame(html,title){const frame=document.createElement('iframe');frame.title=title;frame.setAttribute('sandbox','');frame.inert=true;frame.tabIndex=-1;frame.setAttribute('aria-hidden','true');frame.srcdoc=phSafeDocument(html);return frame;}
function phScale(frame,width,height){if(frame)frame.style.transform='translate(-50%,-50%) scale('+Math.min(width/1920,height/1080)+')';}
function phAudience(html){
  let output=$('pv-holding-output');
  if(html===null){output?.remove();return;}
  if(!output){output=document.createElement('div');output.id='pv-holding-output';document.body.append(output);}
  const frame=phFrame(html,'Static audience holding screen');output.replaceChildren(frame);phScale(frame,innerWidth,innerHeight);
}
addEventListener('resize',()=>phScale($('pv-holding-output')?.firstElementChild,innerWidth,innerHeight));
function phDispose(){
  const state=phState;if(!state)return;clearTimeout(state.timeout);state.pending?.reject(Error('Holding screen request cancelled.'));state.node?.port?.close();state.session.nodes=state.session.nodes.filter(n=>n!==state.node);$('ph-renderer')?.replaceChildren();$('ph-preview')?.replaceChildren();phState=null;
}
function phEnsure(){
  const s=pvSession;if(!s)return null;if(phState?.session===s)return phState;phDispose();
  const state=phState={session:s,node:null,pending:null,timeout:null,cache:new Map(),previewEpoch:0,showEpoch:0,busy:false};
  const saved=s.viewer.holdingScreen||{kind:'builtin'},available=saved.kind!=='slide'||s.ids.has(saved.slideId);
  $('ph-kind').value=available?saved.kind:'builtin';$('ph-slide').replaceChildren(...s.pack.state.slides.map((slide,index)=>new Option((index+1)+'. '+slide.title,slide.id)));
  if(available&&saved.kind==='slide')$('ph-slide').value=saved.slideId;
  $('ph-session-only').checked=true;$('ph-status').textContent=available?'Holding screens are static and silent.':'The saved holding slide is unavailable. Using the built-in design for this session.';
  phPreviewChoice();return state;
}
function phRead(){return vcHoldingClean($('ph-kind').value==='slide'?{kind:'slide',slideId:$('ph-slide').value}:{kind:'builtin'});}
function phDispatch(state){
  const request=state.pending;if(!request||!state.node?.connected||request.seq)return;
  pvSend(state.node,'thumbnail',request.id);request.seq=state.node.seq;

}
function phDocument(state,config){
  if(config.kind==='builtin')return Promise.resolve(phBuiltin());
  if(!state.session.ids.has(config.slideId))return Promise.reject(Error('Choose an available visible slide from this session.'));
  if(state.cache.has(config.slideId))return Promise.resolve(state.cache.get(config.slideId));
  if(state.pending?.id===config.slideId)return state.pending.promise;
  if(state.pending){clearTimeout(state.timeout);state.pending.reject(Error('Holding preview selection changed.'));state.pending=null;}
  let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});state.pending={id:config.slideId,seq:0,promise,resolve,reject};
  const request=state.pending;state.timeout=setTimeout(()=>{if(phState!==state||state.pending!==request)return;state.pending=null;state.node?.port?.close();state.session.nodes=state.session.nodes.filter(n=>n!==state.node);state.node=null;$('ph-renderer').replaceChildren();request.reject(Error('Holding preview timed out. Choose another slide or try again explicitly.'));},10000);
  if(!state.node){
    state.node=pvFrame(state.session,'holding',$('ph-renderer'));state.node.onConnected=()=>phDispatch(state);
    state.node.onThumbnail=data=>{const pending=state.pending;if(phState!==state||!pending||data.seq!==pending.seq||data.live!==pending.id)return;clearTimeout(state.timeout);state.pending=null;if(!data.html.includes('id="stage"')){pending.reject(Error('This slide cannot be rendered within the holding screen budget. Choose another slide or the built-in design.'));return;}state.cache.set(pending.id,data.html);while(state.cache.size>2)state.cache.delete(state.cache.keys().next().value);pending.resolve(data.html);};
  }
  phDispatch(state);return promise;
}
function phPreviewChoice(){
  const state=phState;if(!state)return;const epoch=++state.previewEpoch;state.showEpoch++;$('ph-slide-label').hidden=$('ph-kind').value!=='slide';
  let config;try{config=phRead();}catch(error){$('ph-status').textContent=error.message;return;}
  phDocument(state,config).then(html=>{if(phState!==state||epoch!==state.previewEpoch)return;const frame=phFrame(html,'Holding screen preview');$('ph-preview').replaceChildren(frame);phScale(frame,$('ph-preview').clientWidth,$('ph-preview').clientHeight);}).catch(error=>{if(phState===state&&epoch===state.previewEpoch)$('ph-status').textContent=error.message;});
}
function phCanSave(){return !projectPlayback&&!boothActive&&!projectState.editLocked&&!projectState.slides.some(n=>n.editLocked);}
async function phShow(){
  const state=phEnsure();if(!state||state.busy)return;const session=state.session,epoch=++state.showEpoch;state.busy=true;phPaint();
  try{
    const config=phRead(),html=await phDocument(state,config);if(phState!==state||pvSession!==session||epoch!==state.showEpoch)return;
    const audience=session.nodes.find(n=>n.kind==='audience');if(!audience?.connected)throw Error('Audience disconnected. Reopen it before showing a holding screen.');
    if($('ph-deck-default').checked){
      if(!phCanSave())throw Error('Unlock the presentation and all slides before saving a deck default.');
      const result=componentRun({type:'viewer.defaults',slideId:projectSelected,config:{...vcClean(vcDefaults()),holdingScreen:config}});if(!result.ok)throw Error(result.message);
    }
    session.viewer.holdingScreen=config;session.holdingHTML=html;pvSend(audience,'holding',null,{enabled:true,html});$('ph-status').textContent='Showing holding screen. Live slide and resume point are retained.';$('ph-settings').open=false;
  }catch(error){if(phState===state)$('ph-status').textContent=error.message;}
  finally{if(phState===state){state.busy=false;phPaint();}}
}
function phPaint(){
  const s=pvSession;if(!s)return;const state=phEnsure(),connected=s.nodes.some(n=>n.kind==='audience'&&n.connected),masked=s.blackout||s.holding;
  $('ph-restore').hidden=!masked;$('ph-restore').disabled=!connected;$('ph-show').disabled=!connected||state.busy;$('ph-save-label').hidden=!phCanSave();if(!phCanSave())$('ph-session-only').checked=true;
  $('ph-show').textContent=state.busy?'Preparing holding screen…':'Show holding screen';$('ph-open').setAttribute('aria-expanded',String($('ph-settings').open));
  $('ph-banner').hidden=!masked;$('ph-banner').textContent=s.blackout?'AUDIENCE BLACKED OUT · Live slide retained':'HOLDING SCREEN ACTIVE · Live slide retained';
}
const phMount=pvMount;pvMount=function(...args){
  const result=phMount(...args);if(pvOutput)return result;
  const banner=document.createElement('p');banner.id='ph-banner';banner.hidden=true;banner.setAttribute('role','status');$('pv-panel').querySelector('header').after(banner);
  const settings=document.createElement('details');settings.id='ph-settings';settings.innerHTML='<summary>Audience holding screen settings</summary><label>Holding screen content<select id="ph-kind"><option value="builtin">Built-in design</option><option value="slide">Choose a slide</option></select></label><label id="ph-slide-label">Visible slide from this session<select id="ph-slide"></select></label><div id="ph-preview" aria-label="Static holding screen preview"></div><p>Static and silent. Your live slide, timer and Q&amp;A resume point are retained.</p><label><input id="ph-session-only" type="radio" name="ph-persistence" checked> This session only</label><label id="ph-save-label"><input id="ph-deck-default" type="radio" name="ph-persistence"> Save as deck default</label><button id="ph-cancel">Cancel changes</button><p id="ph-status" role="status"></p>';
  $('pv-panel').append(settings);const actions=document.createElement('div');actions.className='pv-actions';actions.innerHTML='<button id="ph-open">Holding screen settings</button><button id="ph-show">Show holding screen</button><button id="ph-restore" hidden>Restore audience</button>';$('pc-controls').append(actions);
  const renderer=document.createElement('div');renderer.id='ph-renderer';renderer.setAttribute('aria-hidden','true');$('pv-panel').append(renderer);
  $('ph-open').onclick=()=>{phEnsure();settings.open=!settings.open;phPaint();if(settings.open){settings.scrollIntoView({block:'nearest'});$('ph-kind').focus();}};
  $('ph-cancel').onclick=()=>{const state=phEnsure();if(!state)return;const config=state.session.viewer.holdingScreen||{kind:'builtin'};$('ph-kind').value=config.kind;if(config.kind==='slide')$('ph-slide').value=config.slideId;$('ph-session-only').checked=true;phPreviewChoice();settings.open=false;$('ph-status').textContent='Holding screen changes cancelled.';$('ph-show').focus();};
  settings.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();$('ph-cancel').click();}});
  $('ph-show').onclick=phShow;$('ph-restore').onclick=()=>pcCommand('restore');$('ph-kind').onchange=phPreviewChoice;$('ph-slide').onchange=phPreviewChoice;
  settings.addEventListener('toggle',()=>{if(pvSession)phPaint();});new ResizeObserver(()=>phScale($('ph-preview').firstElementChild,$('ph-preview').clientWidth,$('ph-preview').clientHeight)).observe($('ph-preview'));
  return result;
};
const phPaintBase=pvPaint;pvPaint=function(...args){const result=phPaintBase(...args);if(pvSession)phPaint();return result;};
const phEnd=pvEnd;pvEnd=function(...args){phDispose();if($('ph-settings'))$('ph-settings').open=false;return phEnd(...args);};
