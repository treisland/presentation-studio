// Shared with the independent booth player by serialization. No authoring state,
// remote resources, timers or per-frame JavaScript belong in this engine.
function backgroundEffectsEngine() {
  const names={none:'None',orbit:'Orbit',aurora:'Aurora',waves:'Waves',constellation:'Constellation',drift:'Geometric Drift'};
  const defaults={effect:'orbit',mode:'animated',intensity:45,speed:60,scale:100,position:'right',quality:'standard',quiet:true,grid:true,colors:['accent','secondary','muted']};
  const roles=['accent','secondary','muted','background'];
  function clean(raw) {
    if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Invalid background effect settings.');
    for(const key of Object.keys(raw))if(!Object.hasOwn(defaults,key))throw Error('Unsupported background effect option: '+key);
    const value={...defaults,...raw};
    if(!Object.hasOwn(names,value.effect))throw Error('Unsupported background effect.');
    if(!['static','animated'].includes(value.mode)||!['left','right','full','corners'].includes(value.position)||!['standard','reduced'].includes(value.quality)||typeof value.quiet!=='boolean'||typeof value.grid!=='boolean')throw Error('Invalid background effect mode or placement.');
    for(const [key,min,max]of [['intensity',0,100],['speed',10,120],['scale',50,150]])if(!Number.isFinite(value[key])||value[key]<min||value[key]>max)throw Error('Background '+key+' is outside supported limits.');
    if(!Array.isArray(value.colors)||value.colors.length!==3||value.colors.some(color=>typeof color!=='string'||(!roles.includes(color)&&!/^#[0-9a-f]{6}$/i.test(color))))throw Error('Choose theme roles or six-digit colors for backgrounds.');
    value.colors=[...value.colors];return value;
  }
  function settings(raw,ids) {
    if(!raw||typeof raw!=='object'||Array.isArray(raw)||raw.version!==1||Object.keys(raw).some(key=>!['version','defaults','slides'].includes(key)))throw Error('Unsupported background effect settings version.');
    if(raw.slides!=null&&(!raw.slides||typeof raw.slides!=='object'||Array.isArray(raw.slides)))throw Error('Invalid background slide overrides.');
    const result={version:1,defaults:raw.defaults==null?null:clean(raw.defaults),slides:Object.create(null)};
    for(const [id,value]of Object.entries(raw.slides||{})){
      if(!/^[\w-]+$/.test(id)||['__proto__','prototype','constructor'].includes(id))throw Error('Invalid background slide identity.');
      const config=clean(value);if(!ids||ids.has(id))result.slides[id]=config;
    }
    return result;
  }
  function resolve(state,id) {return state?.backgroundEffects?.slides?.[id]||state?.backgroundEffects?.defaults||null;}
  function schema() {return {type:'object',additionalProperties:false,required:['effect'],properties:{effect:{type:'string',enum:Object.keys(names)},mode:{type:'string',enum:['static','animated']},intensity:{type:'number',minimum:0,maximum:100},speed:{type:'number',minimum:10,maximum:120},scale:{type:'number',minimum:50,maximum:150},position:{type:'string',enum:['left','right','full','corners']},quality:{type:'string',enum:['standard','reduced']},quiet:{type:'boolean'},grid:{type:'boolean'},colors:{type:'array',minItems:3,maxItems:3,items:{type:'string',maxLength:10,pattern:'^(accent|secondary|muted|background|#[0-9a-fA-F]{6})$'}}}};}
  function mount(root) {
    let layer=root.querySelector(':scope > .bg-effect'),signature='';
    function update(raw,palette,options={}) {
      if(!raw){layer?.remove();layer=null;signature='';root.classList.remove('bg-custom','bg-grid-off');return;}
      const config=clean(raw),colors=config.colors.map(role=>/^#/.test(role)?role:(palette?.[role]||'#0066ff'));
      if(colors.some(color=>!/^#[0-9a-f]{6}$/i.test(color)))throw Error('Invalid background palette.');
      root.classList.add('bg-custom');
      root.classList.toggle('bg-grid-off',!config.grid);
      const next=JSON.stringify([config,colors,palette?.background]);
      if(!layer){layer=document.createElement('div');layer.className='bg-effect';layer.setAttribute('aria-hidden','true');layer.inert=true;root.prepend(layer);}
      if(next!==signature){
        signature=next;layer.replaceChildren();layer.dataset.effect=config.effect;layer.dataset.position=config.position;layer.dataset.quiet=String(config.quiet);
        const background=palette?.background||'#f4f6f8',brightness=[1,3,5].reduce((sum,i)=>sum+parseInt(background.slice(i,i+2),16),0);
        // Thin lines/points need more contrast than broad filled decorations.
        const strength={none:0,orbit:.42,aurora:.38,waves:.75,constellation:.95,drift:.48}[config.effect];
        layer.style.setProperty('--bg-opacity',String(config.intensity/100*strength*(brightness<384?1.1:1)));layer.style.setProperty('--bg-duration',config.speed+'s');layer.style.setProperty('--bg-scale',String(config.scale/100));
        colors.forEach((color,i)=>{
          layer.style.setProperty('--bg-'+i,color);
          layer.style.setProperty('--bg-render-'+i,brightness<384&&!/^#/.test(config.colors[i])?'color-mix(in srgb, '+color+' 58%, white)':color);
        });
        const scene=document.createElement('div');scene.className='bg-scene';layer.append(scene);
        const counts={none:0,orbit:5,aurora:3,waves:10,constellation:22,drift:10},count=config.quality==='reduced'?Math.min(counts[config.effect],6):counts[config.effect];
        const points=[{x:9,y:24},{x:24,y:12},{x:39,y:31},{x:55,y:18},{x:76,y:8},{x:92,y:29},{x:17,y:64},{x:38,y:87},{x:59,y:57},{x:91,y:88}];
        const links=[[0,1],[0,2],[1,3],[2,3],[2,6],[2,8],[3,4],[3,8],[4,5],[5,9],[6,7],[7,8]];
        for(let i=0;i<count;i++){
          const element=document.createElement('span');element.className='bg-particle';element.style.setProperty('--bg-i',String(i));
          element.style.setProperty('--bg-x',((i*37+13)%90)+'%');element.style.setProperty('--bg-y',((i*23+17)%80)+'%');
          if(config.effect==='constellation'&&i<points.length){element.style.setProperty('--bg-x',points[i].x+'%');element.style.setProperty('--bg-y',points[i].y+'%');}
          if(config.effect==='constellation'&&i>=points.length){
            element.classList.add('bg-link');const [from,to]=links[i-points.length],a=points[from],b=points[to],aspect=['left','right'].includes(config.position)?1080*.96/(1920*.66):1080/1920,dx=b.x-a.x,dy=(b.y-a.y)*aspect;
            element.style.setProperty('--bg-x',a.x+'%');element.style.setProperty('--bg-y',a.y+'%');element.style.setProperty('--bg-link-length',Math.hypot(dx,dy)+'%');element.style.setProperty('--bg-link-angle',Math.atan2(dy,dx)*180/Math.PI+'deg');
          }
          scene.append(element);
        }
      }
      layer.dataset.motion=options.motion&&config.mode==='animated'&&config.effect!=='none'&&config.intensity>0&&!options.hidden?'on':'off';
      layer.hidden=config.effect==='none'||!!options.hidden;
    }
    return {update,dispose(){layer?.remove();root.classList.remove('bg-custom','bg-grid-off');layer=null;signature='';}};
  }
  return {names,defaults,roles,clean,settings,resolve,schema,mount};
}
const bgEngine=backgroundEffectsEngine();
