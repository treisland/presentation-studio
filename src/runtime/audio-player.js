// Shared by normal playback and serialized offline booth exports. No authoring state.
function studioAudioPlayer({resolve,advance,notice=()=>{},createMedia=()=>document.createElement('audio'),now=()=>performance.now(),schedule=setTimeout,cancel=clearTimeout}){
 let context=null,armed=false,bypass=false,muted=false,volume=1,generation=0,padding=null,timer=null,failed='',ended=false,nodes=new Map(),lastNotice='';
 const emit=text=>{if(text!==lastNotice){lastNotice=text;notice(text);}};
 function clearTimer(freeze=false){if(timer!==null){cancel(timer);timer=null;if(freeze&&padding)padding.remaining=Math.max(0,padding.due-now());}}
 function pauseItem(item){if(item.pending||!item.node.paused){item.attempt++;item.pending=false;}item.node.pause();}
 function drop(role){const item=nodes.get(role);if(!item)return;nodes.delete(role);item.disposed=true;item.attempt++;item.pending=false;item.node.pause();item.node.onended=item.node.onerror=item.node.onloadedmetadata=item.node.onseeked=null;item.node.removeAttribute('src');item.node.load();}
 function stop(){clearTimer();padding=null;generation++;for(const role of [...nodes.keys()])drop(role);}
 function active(){return !!context?.owner&&context.visible!==false;}
 function valid(item){return active()&&!item.disposed&&nodes.get(item.role)===item&&item.project===context.project&&(item.role!=='slide'||item.id===context.id);}
 function problem(text){failed=text;clearTimer(true);for(const item of nodes.values())pauseItem(item);emit(text+' Retry audio or choose Continue without audio.');}
 function effective(){return active()&&context.playing&&armed&&!bypass&&!failed&&!ended;}
 function hold(){if(!active()||bypass||!nodes.size)return false;if(!armed||failed||ended)return true;return !!nodes.get('slide')?.track.advanceOnEnd;}
 function armPadding(item){
  if(!valid(item)||item.advanced||!item.track.advanceOnEnd||!effective()||!Number.isFinite(item.node.duration)||item.node.duration<=0)return;
  if(!padding)padding={item,remaining:item.track.paddingMs,due:0,generation};
  if(padding.item!==item||timer!==null)return;
  padding.due=now()+padding.remaining;const token=generation;
  timer=schedule(()=>{timer=null;if(!padding||token!==generation||!valid(item)||!effective()||item.advanced)return;item.advanced=true;padding=null;advance(context.id);},padding.remaining);
 }
 function play(item){
  if(!valid(item)||item.pending||item.node.ended||!item.node.paused)return;
  item.pending=true;const attempt=++item.attempt;
  let promise;try{promise=item.node.play();}catch(error){item.pending=false;if(valid(item)&&effective())problem('Audio playback was blocked or failed.');return;}
  Promise.resolve(promise).then(()=>{if(attempt!==item.attempt)return;item.pending=false;if(!valid(item)||!effective())pauseItem(item);}).catch(()=>{if(attempt!==item.attempt)return;item.pending=false;if(valid(item)&&effective())problem('Audio playback was blocked or failed.');});
 }
 function get(role,track){
  const old=nodes.get(role),key=JSON.stringify([context.project,role==='slide'?context.id:'',track.src,track.name,track.mime]);
  if(old?.key===key){old.track=track;old.node.volume=track.volume*volume;old.node.muted=muted;old.node.loop=role==='music'&&track.loop;return old;}
  if(role==='slide'){clearTimer();padding=null;generation++;}drop(role);
  const node=createMedia(),item={role,track,node,key,id:context.id,project:context.project,disposed:false,pending:false,attempt:0,advanced:false};nodes.set(role,item);
  node.preload='metadata';node.volume=track.volume*volume;node.muted=muted;node.loop=role==='music'&&track.loop;
  node.onloadedmetadata=()=>{if(valid(item)&&(!Number.isFinite(node.duration)||node.duration<=0))problem('Audio has no finite playable duration.');};
  node.onerror=()=>{if(valid(item))problem('Audio file is missing or unsupported in this browser.');};
  node.onended=()=>{if(!valid(item)||role!=='slide'||item.advanced)return;if(!Number.isFinite(node.duration)||node.duration<=0){problem('Narration has no finite playable duration.');return;}if(!node.ended||node.currentTime<node.duration-.01)return;if(effective())armPadding(item);};
  node.onseeked=()=>{if(!valid(item)||role!=='slide')return;if(node.currentTime<node.duration-.01){clearTimer();padding=null;item.advanced=false;generation++;}else if(effective())armPadding(item);};
  const source=resolve(track.src);if(!source){problem('Audio source is missing.');return item;}node.src=source;node.load();return item;
 }
 function sync(next){
  const changedProject=context&&context.project!==next.project,idChanged=context&&context.id!==next.id,wasActive=active();
  if(changedProject){stop();armed=false;bypass=false;failed='';ended=false;}
  if(idChanged){ended=false;clearTimer();padding=null;generation++;drop('slide');bypass=false;failed='';}
  context={...next};
  if(!active()){if(wasActive||nodes.size)stop();armed=false;failed='';emit('');return;}
  const audio=context.audio||{mode:'none',slides:{}};
  const wanted={slide:audio.mode==='slide'?audio.slides?.[context.id]:null,overall:audio.mode==='overall'?audio.overall:null,music:audio.music};
  for(const role of [...nodes.keys()])if(!wanted[role]){if(role==='slide'){clearTimer();padding=null;generation++;}drop(role);}
  for(const [role,track]of Object.entries(wanted))if(track)get(role,track);
  if(!nodes.size){emit('');return;}
  if(!effective()){clearTimer(true);for(const item of nodes.values())pauseItem(item);if(ended)emit('Presentation ended. Choose Restart audio to replay.');else if(!armed&&!bypass)emit('Audio is paused until you choose Enable audio and play.');return;}
  for(const item of nodes.values())play(item);
  if(padding)armPadding(padding.item);else if(nodes.get('slide')?.node.ended)armPadding(nodes.get('slide'));
  emit('Audio enabled.');
 }
 function enable(){armed=true;bypass=false;failed='';if(context)sync(context);}
 function skip(){bypass=true;failed='';clearTimer();padding=null;for(const item of nodes.values())pauseItem(item);emit('Continuing without audio on this slide.');}
 function end(){ended=true;clearTimer();padding=null;for(const item of nodes.values())pauseItem(item);emit('Presentation ended. Choose Restart audio to replay.');}
 function restart(){ended=false;clearTimer();padding=null;generation++;failed='';bypass=false;for(const item of nodes.values()){pauseItem(item);item.advanced=false;try{item.node.currentTime=0;}catch{}}if(context)sync(context);}
 function seek(seconds){const item=nodes.get('slide')||nodes.get('overall');if(!item||!Number.isFinite(seconds)||!Number.isFinite(item.node.duration)||item.node.duration<=0)return;clearTimer();padding=null;generation++;item.advanced=false;item.node.currentTime=Math.max(0,Math.min(seconds,item.node.duration));}
 function snapshot(){const narration=nodes.get('slide')||nodes.get('overall');return {enabled:armed,bypassed:bypass,failed,ended,hasAudio:!!nodes.size,hold:hold(),time:narration?.node.currentTime||0,duration:Number.isFinite(narration?.node.duration)?narration.node.duration:0,playing:[...nodes.values()].some(item=>!item.node.paused&&!item.node.ended),muted,volume};}
 function dispose(){stop();armed=false;bypass=false;failed='';context=null;ended=false;emit('');}
 function mount(parent,prefix,onPlay=()=>{}){
  const panel=document.createElement('details');panel.id=prefix;panel.className='au-live-controls';panel.addEventListener('keydown',event=>{if(event.key!=='Escape'&&event.target.closest?.('input,textarea,select,button,summary,[contenteditable]'))event.stopPropagation();});const summary=document.createElement('summary');summary.textContent='Audio';const status=document.createElement('p');status.id=prefix+'-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');panel.append(summary,status);
  const button=(id,text,action)=>{const b=document.createElement('button');b.id=prefix+'-'+id;b.textContent=text;b.onclick=action;panel.append(b);return b;};
  button('enable','Enable audio and play',()=>{onPlay();enable();});button('retry','Retry audio',enable);button('skip','Continue without audio',skip);button('restart','Restart audio',()=>{onPlay();restart();enable();});
  const mute=button('mute','Mute audio',()=>{muted=!muted;mute.textContent=muted?'Unmute audio':'Mute audio';mute.setAttribute('aria-pressed',String(muted));if(context)sync(context);});mute.setAttribute('aria-pressed','false');
  const label=document.createElement('label');label.textContent='Session audio volume (%)';const gain=document.createElement('input');gain.type='number';gain.min=0;gain.max=100;gain.step=1;gain.value=100;gain.id=prefix+'-volume';label.append(gain);panel.append(label);gain.onchange=()=>{const n=Number(gain.value);if(!Number.isFinite(n)||n<0||n>100){gain.value=Math.round(volume*100);return;}volume=n/100;if(context)sync(context);};
  const seekLabel=document.createElement('label');seekLabel.textContent='Narration position (seconds)';const position=document.createElement('input');position.id=prefix+'-seek';position.type='number';position.min=0;position.step=.1;position.value=0;seekLabel.append(position);panel.append(seekLabel);button('seek-apply','Seek narration',()=>seek(Number(position.value)));
  const originalNotice=notice;notice=text=>{status.textContent=text;panel.hidden=!context?.audio||!active()||!nodes.size;if(text.includes('paused until')||failed)panel.open=true;originalNotice(text);};
  parent.append(panel);panel.hidden=true;return panel;
 }
 return {sync,enable,skip,restart,end,seek,hold,snapshot,dispose,mount};
}
