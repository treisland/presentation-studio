// Audio metadata is authored data; playback/activation state never belongs here.
const audioCore=(()=>{
  const types={mp3:['audio/mpeg'],wav:['audio/wav','audio/x-wav'],m4a:['audio/mp4'],aac:['audio/aac'],ogg:['audio/ogg'],webm:['audio/webm']};
  const maxBytes=250*1024*1024,maxDurationMs=86400000,maxPaddingMs=600000;
  function plain(value,keys,label){if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>!keys.includes(key)))throw Error('Invalid '+label+' metadata.');}
  function number(value,min,max,label,integer=false){if(!Number.isFinite(value)||value<min||value>max||(integer&&!Number.isSafeInteger(value)))throw Error('Invalid audio '+label+'.');return value;}
  function mime(name,type=''){
    const ext=String(name).split('.').pop().toLowerCase(),allowed=types[ext];
    if(!allowed||type&&!allowed.includes(type.toLowerCase()))throw Error('Choose a supported local MP3, WAV, M4A/AAC, Ogg or audio WebM audio file.');
    return type.toLowerCase()||allowed[0];
  }
  function track(raw,role){
    if(raw===null||raw===undefined)return null;
    const keys=['src','name','mime','bytes','durationMs','volume',...(role==='music'?['loop']:role==='slide'?['advanceOnEnd','paddingMs']:[])];
    plain(raw,keys,'audio track');
    if(typeof raw.src!=='string'||raw.src.length>500||!/^assets\/[a-zA-Z0-9_./-]+$/.test(raw.src)||raw.src.split('/').some(part=>!part||part==='.'||part==='..'))throw Error('Audio needs a safe relative assets/ path.');
    if(typeof raw.name!=='string'||!raw.name.length||raw.name.length>255||typeof raw.mime!=='string')throw Error('Invalid audio filename or MIME.');
    const result={src:raw.src,name:raw.name,mime:mime(raw.name,raw.mime),bytes:number(raw.bytes,1,maxBytes,'size',true),durationMs:number(raw.durationMs,1,maxDurationMs,'duration',true),volume:number(raw.volume,0,1,'volume')};
    if(role==='music'){if(typeof raw.loop!=='boolean')throw Error('Invalid music loop.');result.loop=raw.loop;}
    if(role==='slide'){if(typeof raw.advanceOnEnd!=='boolean')throw Error('Invalid narration advancement.');result.advanceOnEnd=raw.advanceOnEnd;result.paddingMs=number(raw.paddingMs,0,maxPaddingMs,'padding',true);}
    return result;
  }
  function settings(raw,ids){
    plain(raw,['version','mode','slides','overall','music','advancement'],'audio settings');
    if(raw.version!==1||!['none','slide','overall'].includes(raw.mode))throw Error('Unsupported audio settings.');
    if(!raw.slides||typeof raw.slides!=='object'||Array.isArray(raw.slides))throw Error('Invalid slide narration map.');
    const slides=Object.create(null);
    for(const [id,value]of Object.entries(raw.slides)){if(!/^[\w-]+$/.test(id)||ids&&!ids.has(id))throw Error('Narration references an unknown slide.');slides[id]=track(value,'slide');if(!slides[id])throw Error('Empty slide narration.');}
    const result={version:1,mode:raw.mode,slides,overall:track(raw.overall,'overall'),music:track(raw.music,'music')};if(raw.advancement!==undefined)result.advancement=advancement(raw.advancement,ids);return result;
  }
  function advancement(raw,ids){
    plain(raw,['mode','seconds','paddingMs','overrides'],'advancement');
    if(!['manual','auto'].includes(raw.mode))throw Error('Invalid default advancement.');
    const result={mode:raw.mode,seconds:number(raw.seconds,3,600,'slide time'),paddingMs:number(raw.paddingMs,0,maxPaddingMs,'padding',true),overrides:Object.create(null)};
    plain(raw.overrides,Object.keys(raw.overrides||{}),'advancement overrides');
    for(const [id,value]of Object.entries(raw.overrides)){if(!/^[\w-]+$/.test(id)||ids&&!ids.has(id))throw Error('Advancement references an unknown slide.');plain(value,['mode','seconds','paddingMs'],'slide advancement');if(!['manual','narration','timed','legacy'].includes(value.mode))throw Error('Invalid slide advancement.');result.overrides[id]={mode:value.mode,seconds:number(value.seconds,3,600,'slide time'),paddingMs:number(value.paddingMs,0,maxPaddingMs,'padding',true)};}
    return result;
  }
  function empty(){return {version:1,mode:'none',slides:Object.create(null),overall:null,music:null};}
  function tracks(state){return state?.audio?[...Object.values(state.audio.slides||{}),state.audio.overall,state.audio.music].filter(Boolean):[];}
  async function probe(blob,name=blob.name,type=blob.type,{decodeDuration=false}={}){
    const kind=mime(name,type);number(blob.size,1,maxBytes,'size',true);
    const node=document.createElement('audio'),url=URL.createObjectURL(blob);node.preload='metadata';
    try{return await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(Error('Audio metadata timed out. Choose a supported, complete file.')),15000);
      node.onloadedmetadata=async()=>{try{let duration=node.duration;
        // Measure duration-less recorder WebM without re-encoding the original.
        if(decodeDuration||!Number.isFinite(duration)&&kind==='audio/webm'){
          const Context=window.AudioContext||window.webkitAudioContext;if(!Context)throw Error('Recording duration is unavailable in this browser.');
          const context=new Context();try{duration=(await context.decodeAudioData(await blob.arrayBuffer())).duration;}finally{await context.close();}
        }
        const durationMs=Math.round(duration*1000);number(durationMs,1,maxDurationMs,'duration',true);clearTimeout(timer);resolve({mime:kind,durationMs});}catch(error){clearTimeout(timer);reject(error);}};
      node.onerror=()=>{clearTimeout(timer);reject(Error('This browser cannot decode the audio file. Try MP3 or WAV.'));};node.src=url;node.load();
    });}finally{node.pause();node.removeAttribute('src');node.load();URL.revokeObjectURL(url);}
  }
  return {track,settings,advancement,empty,tracks,mime,probe,maxBytes,maxDurationMs,maxPaddingMs};
})();
