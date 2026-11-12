// Declarative background renderer shared by the app and standalone booth exports.
function customBackgroundEngine() {
  const roles=['background','ink','accent','secondary','muted'];
  const plain=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
  const fail=message=>{throw Error('Invalid custom background: '+message);};
  const exact=(value,keys)=>{if(!plain(value)||Object.keys(value).some(k=>!keys.includes(k)))fail('unsupported fields');};
  const color=value=>{if(typeof value!=='string'||!(/^#[a-fA-F0-9]{6}$/.test(value)||roles.includes(value)))fail('choose a hex color or theme role');return value;};
  const number=(value,min,max)=>{if(!Number.isFinite(value)||value<min||value>max)fail('number outside supported range');return value;};
  const safe=path=>typeof path==='string'&&/^assets\/[a-zA-Z0-9_./-]+$/.test(path)&&!path.split('/').some(p=>!p||p==='.'||p==='..');
  function clean(raw) {
    if(!plain(raw)||!['theme','solid','gradient','image'].includes(raw.kind))fail('choose Theme, Solid, Gradient or Image');
    const keys={theme:['kind'],solid:['kind','color'],gradient:['kind','colors','angle'],image:['kind','asset','fit','focal','fallback','overlay','protectText']}[raw.kind];
    exact(raw,keys);const value={kind:raw.kind};
    if(raw.kind==='solid')value.color=color(raw.color);
    if(raw.kind==='gradient'){
      if(!Array.isArray(raw.colors)||raw.colors.length!==2)fail('a gradient needs two colors');
      value.colors=raw.colors.map(color);value.angle=number(raw.angle,0,360);
    }
    if(raw.kind==='image'){
      if(!safe(raw.asset))fail('use a safe local image asset path');
      if(!['fill','fit'].includes(raw.fit))fail('choose Fill or Fit');
      exact(raw.focal,['x','y']);exact(raw.overlay,['color','opacity']);
      if(!['off','left','right'].includes(raw.protectText))fail('choose a text protection side');
      Object.assign(value,{asset:raw.asset,fit:raw.fit,focal:{x:number(raw.focal.x,0,1),y:number(raw.focal.y,0,1)},fallback:color(raw.fallback),overlay:{color:color(raw.overlay.color),opacity:number(raw.overlay.opacity,0,1)},protectText:raw.protectText});
    }
    return value;
  }
  function settings(raw,ids) {
    exact(raw,['version','defaults','slides']);if(raw.version!==1)fail('unsupported settings version');
    exact(raw.slides,Object.keys(raw.slides||{}));
    const result={version:1,defaults:raw.defaults===null?null:clean(raw.defaults),slides:Object.create(null)};
    for(const [id,value]of Object.entries(raw.slides)){
      if(!/^[\w-]+$/.test(id))fail('invalid slide identity');
      const config=clean(value);if(!ids||ids.has(id))result.slides[id]=config;
    }
    return result;
  }
  function resolve(state,id){return state.backgrounds?.slides?.[id]||state.backgrounds?.defaults||null;}
  function mount(root,assetURL=path=>path) {
    const layer=document.createElement('div');layer.className='cb-layer';layer.setAttribute('aria-hidden','true');layer.inert=true;root.prepend(layer);
    let signature='';
    const css=(value,palette)=>value?.startsWith('#')?value:palette[value]||palette.background||'#ffffff';
    return {update(config,palette={}){
      const key=JSON.stringify([config,palette,config?.asset&&assetURL(config.asset)]);if(key===signature)return;signature=key;
      layer.replaceChildren();layer.style.background='';root.classList.toggle('cb-active',!!config);
      layer.hidden=!config;if(layer.hidden)return;
      const c=clean(config);
      if(c.kind==='theme')layer.style.background=palette.background||'#ffffff';
      if(c.kind==='solid')layer.style.background=css(c.color,palette);
      if(c.kind==='gradient')layer.style.background=`linear-gradient(${c.angle}deg,${c.colors.map(v=>css(v,palette)).join(',')})`;
      if(c.kind==='image'){
        layer.style.background=css(c.fallback,palette);
        const image=document.createElement('img');image.alt='';image.draggable=false;image.src=assetURL(c.asset);image.style.objectFit=c.fit==='fill'?'cover':'contain';image.style.objectPosition=`${c.focal.x*100}% ${c.focal.y*100}%`;layer.append(image);
        const overlay=document.createElement('div');overlay.className='cb-overlay';overlay.style.background=css(c.overlay.color,palette);overlay.style.opacity=String(c.overlay.opacity);layer.append(overlay);
        if(c.protectText!=='off'){const protect=document.createElement('div');protect.className='cb-protect';protect.style.background=`linear-gradient(${c.protectText==='left'?'90':'270'}deg,${css(c.overlay.color,palette)},transparent 85%)`;layer.append(protect);}
      }
    },dispose(){layer.remove();root.classList.remove('cb-active');}};
  }
  function schema(){
    const c={type:'string',maxLength:20,pattern:'^(#[a-fA-F0-9]{6}|'+roles.join('|')+')$'},n={type:'number',minimum:0,maximum:1};
    const variant=(kind,properties)=>({type:'object',additionalProperties:false,required:['kind',...Object.keys(properties)],properties:{kind:{const:kind},...properties}});
    return {oneOf:[variant('theme',{}),variant('solid',{color:c}),variant('gradient',{colors:{type:'array',minItems:2,maxItems:2,items:c},angle:{type:'number',minimum:0,maximum:360}}),variant('image',{asset:{type:'string',maxLength:500,pattern:'^assets/[a-zA-Z0-9_./-]+$'},fit:{type:'string',enum:['fill','fit']},focal:{type:'object',additionalProperties:false,required:['x','y'],properties:{x:n,y:n}},fallback:c,overlay:{type:'object',additionalProperties:false,required:['color','opacity'],properties:{color:c,opacity:n}},protectText:{type:'string',enum:['off','left','right']}})]};
  }
  return {clean,settings,resolve,mount,schema,safe};
}
const cbEngine=customBackgroundEngine();
