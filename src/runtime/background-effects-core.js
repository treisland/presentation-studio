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
  function paintColors(config,palette){
    const colors=config.colors.map(role=>/^#/.test(role)?role:(palette?.[role]||'#0066ff'));
    if(colors.some(color=>!/^#[0-9a-f]{6}$/i.test(color)))throw Error('Invalid background palette.');
    const rgb=color=>[1,3,5].map(i=>parseInt(color.slice(i,i+2),16)/255),base=rgb(colors[0]),max=Math.max(...base),min=Math.min(...base),delta=max-min;
    const hue=delta===0?215:((max===base[0]?(base[1]-base[2])/delta:max===base[1]?(base[2]-base[0])/delta+2:(base[0]-base[1])/delta+4)*60+360)%360;
    const dark=rgb(palette?.background||'#f4f6f8').reduce((a,b)=>a+b,0)<1.5;
    const hex=values=>'#'+values.map(value=>Math.round(Math.max(0,Math.min(1,value))*255).toString(16).padStart(2,'0')).join('');
    const analogous=angle=>{const h=((hue+angle+360)%360)/60,s=.68,l=dark?.68:.56,c=(1-Math.abs(2*l-1))*s,x=c*(1-Math.abs(h%2-1)),m=l-c/2;const values=h<1?[c,x,0]:h<2?[x,c,0]:h<3?[0,c,x]:h<4?[0,x,c]:h<5?[x,0,c]:[c,0,x];return hex(values.map(value=>value+m));};
    const rendered=colors.map((color,i)=>{
      if(/^#/.test(config.colors[i]))return color;
      const values=rgb(color),neutral=Math.max(...values)-Math.min(...values)<.18;
      if(i>0&&['secondary','muted'].includes(config.colors[i])&&neutral&&delta>.05)return analogous(i===1?38:-38);
      return dark?hex(values.map(value=>value*.7+.3)):color;
    });
    return {colors,rendered,dark};
  }
  function schema() {return {type:'object',additionalProperties:false,required:['effect'],properties:{effect:{type:'string',enum:Object.keys(names)},mode:{type:'string',enum:['static','animated']},intensity:{type:'number',minimum:0,maximum:100},speed:{type:'number',minimum:10,maximum:120},scale:{type:'number',minimum:50,maximum:150},position:{type:'string',enum:['left','right','full','corners']},quality:{type:'string',enum:['standard','reduced']},quiet:{type:'boolean'},grid:{type:'boolean'},colors:{type:'array',minItems:3,maxItems:3,items:{type:'string',maxLength:10,pattern:'^(accent|secondary|muted|background|#[0-9a-fA-F]{6})$'}}}};}
  function mount(root) {
    let layer=root.querySelector(':scope > .bg-effect'),signature='';
    function update(raw,palette,options={}) {
      if(!raw){layer?.remove();layer=null;signature='';root.classList.remove('bg-custom','bg-grid-off');return;}
      const config=clean(raw),{colors,rendered,dark}=paintColors(config,palette);
      root.classList.add('bg-custom');
      root.classList.toggle('bg-grid-off',!config.grid);
      const next=JSON.stringify([config,colors,palette?.background]);
      if(!layer){layer=document.createElement('div');layer.className='bg-effect';layer.setAttribute('aria-hidden','true');layer.inert=true;root.prepend(layer);}
      if(next!==signature){
        signature=next;layer.replaceChildren();layer.dataset.effect=config.effect;layer.dataset.position=config.position;layer.dataset.quiet=String(config.quiet);
        // Thin lines/points need more contrast than broad filled decorations.
        const strength={none:0,orbit:.75,aurora:.55,waves:.75,constellation:.95,drift:.48}[config.effect];
        layer.style.setProperty('--bg-opacity',String(Math.min(1,config.intensity/100*strength*(dark?1.1:1))));layer.style.setProperty('--bg-duration',config.speed+'s');layer.style.setProperty('--bg-scale',String(config.scale/100));
        colors.forEach((color,i)=>{
          layer.style.setProperty('--bg-'+i,color);
          layer.style.setProperty('--bg-render-'+i,rendered[i]);
        });
        const scene=document.createElement('div');scene.className='bg-scene';layer.append(scene);
        const counts={none:0,orbit:1,aurora:3,waves:3,constellation:0,drift:6},count=config.quality==='reduced'?Math.min(counts[config.effect],3):counts[config.effect];
        const vector=(tag,attributes)=>{const node=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [key,value]of Object.entries(attributes))node.setAttribute(key,String(value));return node;};
        if(config.effect==='constellation'){
          const points=[[9,24],[24,12],[39,31],[55,18],[76,8],[92,29],[17,64],[38,87],[59,57],[91,88],[75,44],[78,72],[43,54],[8,88]],size=config.quality==='reduced'?4:points.length;
          const links=[[0,1],[0,2],[1,3],[2,3],[2,6],[2,8],[3,4],[3,8],[4,5],[5,9],[6,7],[7,8],[5,10],[8,10],[8,11],[9,11],[10,11],[2,12],[6,12],[8,12],[6,13],[7,13]];
          const svg=vector('svg',{class:'bg-particle bg-network',viewBox:'0 0 1200 1000',preserveAspectRatio:'none'});
          const lines=links.filter(([a,b])=>a<size&&b<size).map(([a,b])=>'M'+points[a][0]*12+','+points[a][1]*10+'L'+points[b][0]*12+','+points[b][1]*10).join(' ');
          svg.append(vector('path',{d:lines,class:'bg-network-lines',fill:'none'}));
          for(let i=0;i<size;i++)svg.append(vector('circle',{cx:points[i][0]*12,cy:points[i][1]*10,r:i%4===0?9:6,class:'bg-network-point'}));
          scene.append(svg);
        }
        for(let i=0;i<count;i++){
          const element=['waves','aurora','orbit'].includes(config.effect)?vector('svg',{class:'bg-particle',viewBox:'0 0 1200 1000',preserveAspectRatio:config.effect==='orbit'?'xMidYMid meet':'none'}):document.createElement('span');element.setAttribute('class','bg-particle');element.style.setProperty('--bg-i',String(i));
          const positions=[[14,20],[77,12],[38,47],[79,66],[26,81],[62,30]];
          element.style.setProperty('--bg-x',positions[i%6][0]+'%');element.style.setProperty('--bg-y',positions[i%6][1]+'%');
          if(config.effect==='orbit'){
            for(const radius of [460,350,240,130])element.append(vector('circle',{cx:600,cy:500,r:radius,class:'bg-orbit-ring'}));
            element.append(vector('circle',{cx:600,cy:40,r:13,class:'bg-orbit-dot'}));
          }
          if(config.effect==='aurora'){
            const shift=i*140;
            const edge='M-160,'+(1150-shift)+' C180,'+(750-shift)+' 480,'+(980-shift)+' 760,'+(420-shift)+' S1150,'+(310-shift)+' 1390,'+(-220-shift);
            element.append(vector('path',{class:'bg-aurora-veil bg-detail',d:edge+' L1390,'+(-40-shift)+' C1150,'+(490-shift)+' 1040,'+(600-shift)+' 760,'+(600-shift)+' S180,'+(930-shift)+' -160,'+(1330-shift)+' Z'}));
            element.append(vector('path',{class:'bg-aurora-edge',fill:'none',d:edge}));
          }
          if(config.effect==='waves'){
            const curve=(j)=>'M-100,'+(880+j*10)+' C250,'+(830+j*10)+' 390,'+(200+j*9)+' 700,'+(370+j*8)+' S1030,'+(330+j*10)+' 1300,'+(-80+j*12);
            element.append(vector('path',{class:'bg-wave-lines bg-detail',d:Array.from({length:config.quality==='reduced'?7:14},(_,j)=>curve(j+i*6)).join(' '),fill:'none'}));
            element.append(vector('path',{class:'bg-wave-ribbon bg-detail',d:curve(i*8)+' L1300,'+(160+i*90)+' C1050,800 700,510 540,630 S120,990 -100,1080 Z'}));
          }
          scene.append(element);
        }
      }
      layer.dataset.motion=options.motion&&config.mode==='animated'&&config.effect!=='none'&&config.intensity>0&&!options.hidden?'on':'off';
      layer.hidden=config.effect==='none'||!!options.hidden;
    }
    return {update,pause(){if(layer)layer.dataset.motion='off';},dispose(){layer?.remove();root.classList.remove('bg-custom','bg-grid-off');layer=null;signature='';}};
  }
  return {names,defaults,roles,clean,settings,resolve,schema,mount,palette(raw,palette){return paintColors(clean(raw),palette).rendered;}};
}
const bgEngine=backgroundEffectsEngine();
