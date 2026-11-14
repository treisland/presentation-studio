// Audio metadata is authored data; playback/activation state never belongs here.
const audioCore=(()=>{
  const types={mp3:['audio/mpeg'],wav:['audio/wav','audio/x-wav'],m4a:['audio/mp4'],aac:['audio/aac'],ogg:['audio/ogg']};
  const maxBytes=250*1024*1024,maxDurationMs=86400000,maxPaddingMs=600000;
  function plain(value,keys,label){if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>!keys.includes(key)))throw Error('Invalid '+label+' metadata.');}
  function number(value,min,max,label,integer=false){if(!Number.isFinite(value)||value<min||value>max||(integer&&!Number.isSafeInteger(value)))throw Error('Invalid audio '+label+'.');return value;}
  function mime(name,type=''){
    const ext=String(name).split('.').pop().toLowerCase(),allowed=types[ext];
    if(!allowed||type&&!allowed.includes(type.toLowerCase()))throw Error('Choose a supported local MP3, WAV, M4A/AAC or Ogg audio file.');
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
    plain(raw,['version','mode','slides','overall','music'],'audio settings');
    if(raw.version!==1||!['none','slide','overall'].includes(raw.mode))throw Error('Unsupported audio settings.');
    if(!raw.slides||typeof raw.slides!=='object'||Array.isArray(raw.slides))throw Error('Invalid slide narration map.');
    const slides=Object.create(null);
    for(const [id,value]of Object.entries(raw.slides)){if(!/^[\w-]+$/.test(id)||ids&&!ids.has(id))throw Error('Narration references an unknown slide.');slides[id]=track(value,'slide');if(!slides[id])throw Error('Empty slide narration.');}
    return {version:1,mode:raw.mode,slides,overall:track(raw.overall,'overall'),music:track(raw.music,'music')};
  }
  function empty(){return {version:1,mode:'none',slides:Object.create(null),overall:null,music:null};}
  function tracks(state){return state?.audio?[...Object.values(state.audio.slides||{}),state.audio.overall,state.audio.music].filter(Boolean):[];}
  async function probe(blob,name=blob.name,type=blob.type){
    const kind=mime(name,type);number(blob.size,1,maxBytes,'size',true);
    const node=document.createElement('audio'),url=URL.createObjectURL(blob);node.preload='metadata';
    try{return await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(Error('Audio metadata timed out. Choose a supported, complete file.')),15000);
      node.onloadedmetadata=()=>{clearTimeout(timer);try{const durationMs=Math.round(node.duration*1000);number(durationMs,1,maxDurationMs,'duration',true);resolve({mime:kind,durationMs});}catch(error){reject(error);}};
      node.onerror=()=>{clearTimeout(timer);reject(Error('This browser cannot decode the audio file. Try MP3 or WAV.'));};node.src=url;node.load();
    });}finally{node.pause();node.removeAttribute('src');node.load();URL.revokeObjectURL(url);}
  }
  return {track,settings,empty,tracks,mime,probe,maxBytes,maxDurationMs,maxPaddingMs};
})();
