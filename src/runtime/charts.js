function chartData(node){return node?.attrs?.['data-studio-chart']?chartNormalize(JSON.parse(node.attrs['data-studio-chart'])):null;}
function chartFallback(data){
  const table=projectNode('table','chart-data',[
    projectNode('caption','',[data.title+' — data']),
    projectNode('thead','',[projectNode('tr','',['Category',...data.series.map(item=>item.name)].map(text=>projectNode('th','',[text])))]),
    projectNode('tbody','',data.labels.map((label,index)=>projectNode('tr','',[projectNode('th','',[label]),...data.series.map(item=>projectNode('td','',[String(item.values[index])]))])))
  ]);
  return [projectNode('h3','chart-title',[data.title]),table];
}
function chartSet(node,data){node.attrs['data-studio-chart']=JSON.stringify(chartNormalize(data));node.children=chartFallback(data);}
const chartTree=projectValidateTree;
projectValidateTree=function(tree,...args){
  const result=chartTree(tree,...args);
  for(const node of result)if(node?.attrs?.['data-studio-chart']){
    if(node.tag!=='div'||!dbID(node)||!mgHas(node,'ps-chart'))throw Error('Charts must be free chart blocks.');
    chartSet(node,chartData(node));
  }
  return result;
};
// Keep generated geometry outside the safe AST and the inline text/table editors.
const chartDOM=projectDOM;
projectDOM=function(node){const el=chartDOM(node);if(node?.attrs?.['data-studio-chart']){const data=chartData(node);el.replaceChildren();chartDraw(el,data);el.setAttribute('aria-label',data.title+' · '+chartKinds[data.kind]);}return el;};
const chartFields=projectFields;
projectFields=function(model,...args){return chartFields(model,...args).filter(field=>!model.tree[Number(field.path.split('.')[0])]?.attrs?.['data-studio-chart']);};
function chartDraw(root,data,mini=false){
  root.classList.add('chart-surface');
  const heading=document.createElement('h3');heading.className='chart-heading';heading.textContent=data.title;root.append(heading);
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 640 320');svg.setAttribute('aria-hidden','true');svg.classList.add('chart-plot');root.append(svg);
  const add=(tag,attrs,text)=>{const el=document.createElementNS(svg.namespaceURI,tag);for(const [key,value]of Object.entries(attrs))el.setAttribute(key,String(value));if(text!==undefined)el.textContent=text;svg.append(el);return el;};
  const palette=['var(--project-accent, #8450df)','var(--project-secondary, #159d99)','color-mix(in srgb, var(--project-accent, #8450df) 60%, var(--project-ink, #20283b))','color-mix(in srgb, var(--project-secondary, #159d99) 60%, var(--project-ink, #20283b))','#6080c7','#789545','#ae6c36','#7a6cb0','#3c8e9b','#ad748c','#73858f','#9d854d'];
  const color=index=>data.colors.length?data.colors[index%data.colors.length]:palette[index%palette.length];
  const format=value=>new Intl.NumberFormat('en',{notation:Math.abs(value)>=10000?'compact':'standard',maximumFractionDigits:2}).format(value);
  if(data.kind==='donut'){
    const values=data.series[0].values,total=values.reduce((sum,value)=>sum+value,0);let angle=-Math.PI/2;
    values.forEach((value,index)=>{if(!value)return;const end=angle+value/total*Math.PI*2,x=a=>210+105*Math.cos(a),y=a=>150+105*Math.sin(a);
      if(value===total)add('circle',{cx:210,cy:150,r:105,fill:'none',stroke:color(index),'stroke-width':48});
      else add('path',{d:`M ${x(angle)} ${y(angle)} A 105 105 0 ${end-angle>Math.PI?1:0} 1 ${x(end)} ${y(end)}`,fill:'none',stroke:color(index),'stroke-width':48});
      angle=end;
    });
    add('text',{x:210,y:151,'text-anchor':'middle','font-size':26,'font-weight':700},format(total));
    add('text',{x:210,y:176,'text-anchor':'middle','font-size':16},'Total');
    data.labels.forEach((label,index)=>{const y=22+index*24;add('rect',{x:365,y:y-11,width:12,height:12,fill:color(index)});add('text',{x:384,y,'font-size':14},label.slice(0,22)+' · '+format(values[index])+' ('+Math.round(values[index]/total*100)+'%)');});
  }else{
    const values=data.series.flatMap(item=>item.values),lo=Math.min(0,...values),hi=Math.max(0,...values),min=lo,max=hi===lo?lo+1:hi;
    const horizontal=data.kind==='bar',left=horizontal?122:64,right=616,top=20,bottom=268;
    const pos=value=>horizontal?left+(value-min)/(max-min)*(right-left):bottom-(value-min)/(max-min)*(bottom-top);
    for(let tick=0;tick<=4;tick++){const value=min+(max-min)*tick/4,p=pos(value);add('line',horizontal?{x1:p,x2:p,y1:top,y2:bottom}:{x1:left,x2:right,y1:p,y2:p});add('text',horizontal?{x:p,y:292,'text-anchor':'middle','font-size':13}:{x:left-9,y:p+5,'text-anchor':'end','font-size':13},format(value));}
    const span=(horizontal?bottom-top:right-left)/data.labels.length,zero=pos(0),count=data.series.length;
    data.labels.forEach((label,index)=>add('text',horizontal?{x:left-10,y:top+span*(index+.5)+5,'text-anchor':'end','font-size':14}:{x:left+span*(index+.5),y:292,'text-anchor':'middle','font-size':14},label.slice(0,horizontal?14:10)));
    data.series.forEach((series,s)=>{
      const points=[];
      series.values.forEach((value,index)=>{const p=pos(value),center=left+span*(index+.5);points.push(center+','+p);
        if(data.kind==='line'){add('circle',{cx:center,cy:p,r:4,fill:color(s)});return;}
        const size=span*.72/count,offset=span*.14+s*size;
        add('rect',horizontal?{x:Math.min(zero,p),y:top+index*span+offset,width:Math.abs(p-zero),height:size*.88,fill:color(s)}:{x:left+index*span+offset,y:Math.min(zero,p),width:size*.88,height:Math.abs(p-zero),fill:color(s)});
      });
      if(data.kind==='line')add('polyline',{points:points.join(' '),fill:'none',stroke:color(s),'stroke-width':3,'stroke-dasharray':s===0?'none':s===1?'9 4':s===2?'3 4':'12 3 3 3'});
    });
  }
  const legend=document.createElement('div');legend.className='chart-legend';
  if(data.kind!=='donut')data.series.forEach((item,index)=>{const entry=document.createElement('span'),swatch=document.createElement('i');swatch.style.backgroundColor=color(index);entry.append(swatch,document.createTextNode(item.name));legend.append(entry);});root.append(legend);
  if(!mini){
    const details=document.createElement('details'),summary=document.createElement('summary'),table=document.createElement('table'),caption=document.createElement('caption');details.className='chart-data-disclosure';summary.textContent='View chart data';caption.textContent=data.title+' — data';table.append(caption);
    const rows=[['Category',...data.series.map(item=>item.name)],...data.labels.map((label,index)=>[label,...data.series.map(item=>item.values[index])])];
    rows.forEach((values,r)=>{const row=document.createElement('tr');values.forEach((value,c)=>{const cell=document.createElement(r===0||c===0?'th':'td');if(r===0||c===0)cell.scope=r===0?'col':'row';cell.textContent=String(value);row.append(cell);});table.append(row);});details.append(summary,table);root.append(details);
  }
}
editingRegisterOperation('chart.insert',(state,op,created)=>{
  const data=chartNormalize(op.chart),slide=editingSlide(state,op.slideId),layer=Math.min(1000,Math.max(4,...spEntries(slide,state).map(entry=>entry.z+1)));
  dbOperation(state,{type:'block.create',slideId:op.slideId,kind:'rectangle',placement:op.placement||{x:.12,y:.18,w:.76,h:.66},layer},created);
  const node=editingSlide(state,op.slideId).tree.find(item=>dbID(item)===created.at(-1));node.attrs.class=node.attrs.class.replace('db-rectangle','ps-chart');chartSet(node,data);
});
editingRegisterOperation('chart.update',(state,op)=>{
  const slide=editingSlide(state,op.slideId),entry=componentTargets(state,slide,[op.blockId],false)[0];
  if(!entry?.node?.attrs?.['data-studio-chart'])editingFail('INVALID','Select a chart.');chartSet(entry.node,chartNormalize(op.chart));
});
let chartDialog=null,chartSession=null;
function chartOpen(data=chartSample(),blockId=''){
  vbEnd(false);projectFlush();
  const snapshot=studioEditing.read();chartSession={projectId:snapshot.projectId,revision:snapshot.revision,slideId:projectSelected,blockId,data:chartNormalize(data),colors:[...data.colors]};
  $('chart-color-pickers').dataset.signature='';
  $('chart-title').value=data.title;$('chart-kind').value=data.kind;$('chart-theme').checked=!data.colors.length;$('chart-paste').value=chartTSV(data);$('chart-error').textContent='';$('chart-apply').textContent=blockId?'Apply chart':'Insert chart';
  chartGrid();chartPreview();chartTab('data');chartDialog.showModal();
}
const chartInline=vbStart;
vbStart=function(selection){
  const node=projectModel(selection.slideID)?.tree[Number(selection.path?.split('.')[0])];
  if(node?.attrs?.['data-studio-chart']){
    if(weEditing()&&vbMode==='edit'&&!ceLocked()&&!spMeta(dbID(node)).locked)chartOpen(chartData(node),dbID(node));
    return;
  }
  return chartInline(selection);
};
function chartTab(name){for(const value of ['data','style']){$('chart-'+value+'-panel').hidden=value!==name;$('chart-tab-'+value).setAttribute('aria-pressed',String(value===name));}}
function chartRead(validate=true){
  const data={...chartSession.data,title:$('chart-title').value,kind:$('chart-kind').value,colors:$('chart-theme').checked?[]:[...chartSession.colors]};
  data.labels=[...$('chart-grid').querySelectorAll('[data-chart-label]')].map(input=>input.value);
  data.series=data.series.map((item,s)=>({name:$('chart-grid').querySelector('[data-chart-series="'+s+'"]').value,values:data.labels.map((_,r)=>{const value=$('chart-grid').querySelector('[data-chart-cell="'+r+'-'+s+'"]').value;return value.trim()?Number(value):NaN;})}));
  return validate?chartNormalize(data):data;
}
function chartThemeColor(index){
  const palette=['var(--project-accent, #8450df)','var(--project-secondary, #159d99)','color-mix(in srgb, var(--project-accent, #8450df) 60%, var(--project-ink, #20283b))','color-mix(in srgb, var(--project-secondary, #159d99) 60%, var(--project-ink, #20283b))','#6080c7','#789545','#ae6c36','#7a6cb0','#3c8e9b','#ad748c','#73858f','#9d854d'];
  const sample=document.createElement('span');sample.style.color=palette[index%palette.length];$('chart-live-preview').append(sample);
  const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const context=canvas.getContext('2d');context.fillStyle=getComputedStyle(sample).color;context.fillRect(0,0,1,1);sample.remove();
  return '#'+[...context.getImageData(0,0,1,1).data].slice(0,3).map(value=>value.toString(16).padStart(2,'0')).join('');
}
function chartEnsureColors(count){
  const current=chartSession.colors;
  chartSession.colors=Array.from({length:Math.max(count,current.length)},(_,index)=>current.length?current[index%current.length]:chartThemeColor(index));
}
function chartColorsPaint(){
  const data=chartRead(false),names=data.kind==='donut'?data.labels:data.series.map(item=>item.name),theme=$('chart-theme').checked,panel=$('chart-color-pickers');
  const signature=JSON.stringify([names,theme,data.kind]);if(panel.dataset.signature===signature)return;panel.dataset.signature=signature;panel.replaceChildren();
  $('chart-color-heading').textContent=data.kind==='donut'?'Category colors':'Series colors';
  names.forEach((name,index)=>{
    const row=document.createElement('div'),label=document.createElement('span'),picker=document.createElement('input'),hex=document.createElement('input');row.className='chart-color-row';label.textContent=name||'Unnamed '+(index+1);
    const value=theme?chartThemeColor(index):chartSession.colors[index%chartSession.colors.length]||chartThemeColor(index);
    picker.type='color';picker.value=/^#[\da-f]{6}$/i.test(value)?value:'#000000';picker.setAttribute('aria-label','Color for '+(name||'item '+(index+1)));picker.disabled=theme;
    hex.value=value;hex.maxLength=7;hex.spellcheck=false;hex.setAttribute('aria-label','Hex color for '+(name||'item '+(index+1)));hex.disabled=theme;
    const update=value=>{chartEnsureColors(names.length);chartSession.colors[index]=value;chartPreview();};
    picker.oninput=()=>{hex.value=picker.value;update(picker.value);};
    hex.oninput=()=>{if(/^#[\da-f]{6}$/i.test(hex.value))picker.value=hex.value;update(hex.value);};
    row.append(label,picker,hex);panel.append(row);
  });
}
function chartPreview(){
  const raw=chartRead(false);chartColorsPaint();
  $('chart-add-row').disabled=raw.labels.length>=12;$('chart-add-series').disabled=raw.series.length>=4||raw.kind==='donut';
  for(const button of $('chart-grid').querySelectorAll('[data-chart-remove-row]')){button.disabled=raw.labels.length<=1;button.setAttribute('aria-label','Remove category '+raw.labels[Number(button.dataset.chartRemoveRow)]);button.title=button.getAttribute('aria-label');}
  for(const button of $('chart-grid').querySelectorAll('[data-chart-remove-series]')){button.disabled=raw.series.length<=1;button.setAttribute('aria-label','Remove series '+raw.series[Number(button.dataset.chartRemoveSeries)].name);button.title=button.getAttribute('aria-label');}
  try{const data=chartNormalize(raw);$('chart-live-preview').replaceChildren();chartDraw($('chart-live-preview'),data);$('chart-error').textContent='';$('chart-apply').disabled=false;return data;}
  catch(error){$('chart-error').textContent=error.message;$('chart-apply').disabled=true;return null;}
}
function chartGrid(){
  const data=chartSession.data,table=$('chart-grid');table.replaceChildren();
  const input=(value,attrs)=>{const el=document.createElement('input');el.value=Number.isNaN(value)?'':value;for(const [name,content]of Object.entries(attrs))el.setAttribute(name,content);el.addEventListener('input',chartPreview);return el;};
  const remove=(axis,index,name)=>{const button=componentButton('×',()=>chartStructure(axis,-1,index));button.className='chart-remove';button.dataset[axis==='row'?'chartRemoveRow':'chartRemoveSeries']=index;button.setAttribute('aria-label','Remove '+(axis==='row'?'category ':'series ')+name);button.title=button.getAttribute('aria-label');return button;};
  const head=document.createElement('thead'),header=document.createElement('tr'),corner=document.createElement('th');corner.scope='col';corner.textContent='Category';header.append(corner);
  data.series.forEach((series,s)=>{const cell=document.createElement('th'),tools=document.createElement('div');cell.scope='col';tools.className='chart-cell-tools';tools.append(input(series.name,{'aria-label':'Series '+(s+1)+' name','data-chart-series':s,maxlength:80}),remove('series',s,series.name));cell.append(tools);header.append(cell);});
  const addCell=document.createElement('th'),addSeries=componentButton('+ Series',()=>chartStructure('series',1));addSeries.id='chart-add-series';addSeries.setAttribute('aria-label','Add series');addCell.append(addSeries);header.append(addCell);head.append(header);table.append(head);
  const body=document.createElement('tbody');
  data.labels.forEach((label,r)=>{const row=document.createElement('tr'),cell=document.createElement('th');cell.scope='row';cell.append(input(label,{'aria-label':'Category '+(r+1),'data-chart-label':r,maxlength:80}));row.append(cell);data.series.forEach((series,s)=>{const td=document.createElement('td');td.append(input(series.values[r],{'aria-label':'Row '+(r+1)+' series '+(s+1),type:'number',step:'any','data-chart-cell':r+'-'+s}));row.append(td);});const action=document.createElement('td');action.append(remove('row',r,label));row.append(action);body.append(row);});table.append(body);
  const foot=document.createElement('tfoot'),row=document.createElement('tr'),cell=document.createElement('td'),addRow=componentButton('+ Category',()=>chartStructure('row',1));cell.colSpan=data.series.length+2;addRow.id='chart-add-row';addRow.setAttribute('aria-label','Add category');cell.append(addRow);row.append(cell);foot.append(row);table.append(foot);
}
function chartStructure(axis,delta,index){
  const data=chartRead(false),count=axis==='row'?data.labels.length:data.series.length;
  if(delta>0&&(count>=(axis==='row'?12:4)||axis==='series'&&data.kind==='donut')||delta<0&&count<=1)return;
  const colorAxis=data.kind==='donut'?'row':'series',colorCount=data.kind==='donut'?data.labels.length:data.series.length;
  if(axis===colorAxis)chartEnsureColors(colorCount);
  if(axis==='row'){
    if(delta>0){let i=data.labels.length+1;while(data.labels.includes('Category '+i))i++;data.labels.push('Category '+i);data.series.forEach(item=>item.values.push(0));}
    else{data.labels.splice(index,1);data.series.forEach(item=>item.values.splice(index,1));}
  }else if(delta>0){let i=data.series.length+1;while(data.series.some(item=>item.name==='Series '+i))i++;data.series.push({name:'Series '+i,values:data.labels.map(()=>0)});}
  else data.series.splice(index,1);
  if(axis===colorAxis){if(delta<0)chartSession.colors.splice(index,1);else chartEnsureColors(colorCount+1);}
  chartSession.data=data;chartGrid();chartPreview();
  const target=delta>0?(axis==='row'?'[data-chart-label="'+(data.labels.length-1)+'"]':'[data-chart-series="'+(data.series.length-1)+'"]'):(axis==='row'?'[data-chart-label="'+Math.min(index,data.labels.length-1)+'"]':'[data-chart-series="'+Math.min(index,data.series.length-1)+'"]');
  $('chart-grid').querySelector(target)?.focus();
}
function chartInspector(){
  const panel=$('chart-inspector');if(!panel||!projectReady)return;const context=icSelection(),entry=context.selected.length===1&&context.selected[0],data=entry?.node&&chartData(entry.node);
  panel.hidden=!data;panel.dataset.icVisible=String(!!data);if(!data)return;
  $('chart-inspector-summary').textContent=chartKinds[data.kind]+' · '+data.labels.length+' categories · '+data.series.length+' series';$('chart-edit').disabled=context.locked;
}
const chartPaint=icPaint;icPaint=function(...args){const result=chartPaint(...args);chartInspector();return result;};
const chartList=componentList;
componentList=function(...args){
  const active=$('component-category').value==='Charts';$('component-items').classList.toggle('chart-library-results',active);
  if(!active)return chartList(...args);
  ctDispose();cnPaint();
  const list=$('component-items');list.replaceChildren();list.classList.remove('data-library-results');
  const intro=document.createElement('div');intro.className='chart-library-intro';intro.innerHTML='<h3>Charts &amp; Graphs</h3><p>Turn your data into a story. Choose a chart, paste your data and match your presentation.</p>';list.append(intro);
  const query=$('component-search').value.toLowerCase().trim();let count=0;
  for(const [kind,name]of Object.entries(chartKinds)){
    if(![name,kind,'chart graph'].join(' ').toLowerCase().includes(query))continue;count++;
    const card=document.createElement('article'),preview=document.createElement('div'),heading=document.createElement('h3');card.className='chart-library-card';preview.className='chart-card-preview';heading.textContent=name;chartDraw(preview,chartSample(kind),true);card.append(heading,preview,componentButton('Customize '+name,()=>chartOpen(chartSample(kind))));list.append(card);
  }
  if(!count){const empty=document.createElement('p');empty.textContent='No charts match your search.';list.append(empty);}
  for(const tab of $('component-tabs').children){const selected=tab.dataset.category==='Charts';tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;}
};
const chartInit=projectInit;
projectInit=function(...args){
  const result=chartInit(...args);
  const tab=componentButton('Charts & Graphs',()=>{$('component-category').value='Charts';componentList();});tab.setAttribute('role','tab');tab.setAttribute('aria-controls','component-items');tab.dataset.category='Charts';$('component-tabs').append(tab);$('component-category').add(new Option('Charts & Graphs','Charts'));
  const panel=document.createElement('section');panel.id='chart-inspector';panel.dataset.wpPart='content';panel.innerHTML='<h3>Chart</h3><p id="chart-inspector-summary"></p><button id="chart-edit" type="button">Edit chart data & style</button>';$('wp-fields').prepend(panel);
  $('chart-edit').onclick=()=>{const context=icSelection(),entry=context.selected[0];if(!context.locked&&entry?.node)chartOpen(chartData(entry.node),entry.key);};
  chartDialog=document.createElement('dialog');chartDialog.id='chart-editor';chartDialog.setAttribute('aria-labelledby','chart-editor-heading');
  chartDialog.innerHTML='<div class="chart-editor-header"><div><h2 id="chart-editor-heading">Chart studio</h2><p>Preview your data in your presentation theme.</p></div><button id="chart-cancel" type="button">Cancel</button></div><div class="chart-editor-layout"><section class="chart-preview-column"><label>Chart title<input id="chart-title" maxlength="80"></label><div id="chart-live-preview"></div></section><section class="chart-controls"><label>Chart type<select id="chart-kind"></select></label><div class="chart-editor-tabs" role="group" aria-label="Chart settings"><button id="chart-tab-data" type="button">Data</button><button id="chart-tab-style" type="button">Style</button></div><div id="chart-data-panel"><p>1–12 categories · 1–4 series. Donuts use one nonnegative series.</p><div class="chart-grid-scroll"><table id="chart-grid" aria-label="Editable chart data"></table></div><details><summary>Paste spreadsheet data</summary><p>Include a header row. Use tabs or simple commas, plain numbers and no quoted cells.</p><label>Tabular data<textarea id="chart-paste" rows="6" maxlength="16000" spellcheck="false"></textarea></label><button id="chart-paste-apply" type="button">Use pasted data</button></details></div><div id="chart-style-panel" hidden><label><input id="chart-theme" type="checkbox" checked> Use presentation theme</label><h3 id="chart-color-heading">Series colors</h3><div id="chart-color-pickers"></div><p>Turn off presentation theme to customize each color. Donut colors follow categories. Use a swatch or enter a hex color.</p></div><p id="chart-error" role="status" aria-live="polite"></p></section></div><div class="chart-editor-footer"><p>Changes apply together and can be undone.</p><button id="chart-apply" type="button">Insert chart</button></div>';
  document.body.append(chartDialog);
  for(const [kind,name]of Object.entries(chartKinds))$('chart-kind').add(new Option(name,kind));
  $('chart-cancel').onclick=()=>chartDialog.close();
  $('chart-theme').addEventListener('input',()=>{if(!$('chart-theme').checked){const data=chartRead(false);chartEnsureColors(data.kind==='donut'?data.labels.length:data.series.length);}});
  for(const id of ['chart-title','chart-kind','chart-theme'])$(id).addEventListener('input',chartPreview);
  for(const name of ['data','style'])$('chart-tab-'+name).onclick=()=>chartTab(name);
  $('chart-paste-apply').onclick=()=>{try{const current={...chartSession.data,kind:$('chart-kind').value,title:$('chart-title').value};chartSession.data=chartParse($('chart-paste').value,current);chartGrid();chartPreview();}catch(error){$('chart-error').textContent=error.message;}};
  $('chart-apply').onclick=()=>{
    const data=chartPreview();if(!data)return;
    const session=chartSession,snapshot=studioEditing.read();
    if(snapshot.projectId!==session.projectId||snapshot.revision!==session.revision||projectSelected!==session.slideId){$('chart-error').textContent='The project changed. Cancel and reopen the chart editor.';return;}
    const op={type:session.blockId?'chart.update':'chart.insert',slideId:session.slideId,blockId:session.blockId,chart:data};
    const applied=componentRun(op);if(!applied.ok){$('chart-error').textContent=applied.message;return;}
    chartDialog.close();if($('component-add').open)$('component-add').close();wpKind='block';icDestination='';wePanels.inspector.open=true;wePanelView();dbPanel();icPaint();
  };
  chartDialog.addEventListener('close',()=>{chartSession=null;if($('component-add').open)$('component-tabs').querySelector('[data-category="Charts"]').focus();else $('chart-edit')?.focus();});
  chartInspector();return result;
};
