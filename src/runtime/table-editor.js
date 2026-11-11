// Table structure edits retain the original AST nodes, including rich text.
let tblReady = false, tblPainting = false, tblCell = null;
function tblGrid(table) {
  const rows = [];
  for (const child of table.children || []) {
    if (child.tag === 'tr') rows.push({node:child,parent:table,header:false});
    else if (['thead','tbody','tfoot'].includes(child.tag)) for (const row of child.children || [])
      if (row.tag === 'tr') rows.push({node:row,parent:child,header:child.tag === 'thead'});
  }
  if (!rows.some(row=>row.header) && rows[0]?.parent === table && rows[0].node.children.some(cell=>cell.tag === 'th')) rows[0].header = true;
  for (const row of rows) row.cells = row.node.children.filter(cell=>['th','td'].includes(cell.tag));
  const columns = Math.max(0,...rows.map(row=>row.cells.length));
  return {rows,columns,header:rows.find(row=>row.header),body:rows.filter(row=>!row.header),
    regular:rows.every(row=>row.cells.length === columns && row.cells.every(cell=>!['colspan','rowspan'].some(key=>Number(cell.attrs?.[key] || 1) !== 1))) && rows.filter(row=>row.header).length <= 1};
}
// The legacy panel and count use this reader too. Never treat the first data row
// as a header or drop tbody rows when a table was inserted without a header.
projectTableData = function(table) {
  const grid = tblGrid(table);
  return {heads:grid.header?.cells || [],rows:grid.body.map(row=>row.cells),columns:grid.columns};
};
function tblTarget(state, operation) {
  const slide = editingSlide(state,operation.slideId), table = projectAt(slide,operation.path);
  if (table?.tag !== 'table') editingFail('NOT_FOUND','Select a table first.');
  const root = slide.tree[Number(operation.path.split('.')[0])], entry = spEntries(slide,state).find(item=>item.node === root);
  if (entry && spProtected(entry)) editingFail('LOCKED','Unlock the table first.');
  return table;
}
editingRegisterOperation('table.structure',(state,operation)=>{
  const table = tblTarget(state,operation), grid = tblGrid(table);
  if (!grid.regular || !grid.columns) editingFail('INVALID','Structure editing needs a rectangular table without merged cells. Existing content is preserved.');
  const {action} = operation;
  if (action === 'header') {
    if (typeof operation.enabled !== 'boolean') editingFail('INVALID','Choose whether the table has a header.');
    if (!!grid.header === operation.enabled) return;
    if (!operation.enabled && grid.body.length >= 30) editingFail('INVALID','Removing the header would exceed 30 data rows. Remove a data row first.');
    const row = grid.header || grid.body[0];
    row.parent.children.splice(row.parent.children.indexOf(row.node),1);
    const sectionTag = operation.enabled ? 'thead' : 'tbody';
    let section = table.children.find(node=>node.tag === sectionTag);
    if (!section) {section = projectNode(sectionTag); const caption = table.children.findLastIndex(node=>node.tag === 'caption');table.children.splice(caption+1,0,section);}
    for (const cell of row.cells) {cell.tag = operation.enabled ? 'th' : 'td';cell.attrs ??= {};if(operation.enabled)cell.attrs.scope='col';else delete cell.attrs.scope;}
    section.children.unshift(row.node);
  } else {
    const rowIndex = operation.row, column = operation.column;
    if (!Number.isInteger(rowIndex) || rowIndex < 0 || rowIndex >= grid.rows.length || !Number.isInteger(column) || column < 0 || column >= grid.columns) editingFail('INVALID','Select a valid table cell.');
    const row = grid.rows[rowIndex];
    if (action === 'row-before' || action === 'row-after') {
      if (grid.body.length >= 30) editingFail('INVALID','A table supports at most 30 data rows.');
      const node = projectNode('tr','',Array.from({length:grid.columns},()=>projectNode('td','',[''])));
      if (row.header && row.parent === table) {
        table.children.splice(table.children.indexOf(row.node)+1,0,node);
      } else if (row.header) {
        let body = table.children.find(node=>node.tag === 'tbody');
        if (!body) {body=projectNode('tbody');const first=grid.body[0],index=first?.parent===table?table.children.indexOf(first.node):table.children.indexOf(row.parent)+1;table.children.splice(index,0,body);}body.children.unshift(node);
      } else row.parent.children.splice(row.parent.children.indexOf(row.node)+(action==='row-after'?1:0),0,node);
    } else if (action === 'row-delete') {
      if (grid.rows.length <= 1) editingFail('INVALID','Keep at least one table row.');
      row.parent.children.splice(row.parent.children.indexOf(row.node),1);
    } else if (action === 'column-before' || action === 'column-after') {
      if (grid.columns >= 12) editingFail('INVALID','A table supports at most 12 columns.');
      const index=column+(action==='column-after'?1:0);
      for (const item of grid.rows) {
        const cell=projectNode(item.header?'th':'td','',['']);if(item.header)cell.attrs.scope='col';
        const sibling=item.cells[index];item.node.children.splice(sibling?item.node.children.indexOf(sibling):item.node.children.length,0,cell);
      }
    } else if (action === 'column-delete') {
      if (grid.columns <= 1) editingFail('INVALID','Keep at least one table column.');
      for (const item of grid.rows) item.node.children.splice(item.node.children.indexOf(item.cells[column]),1);
    } else editingFail('INVALID','Choose a supported table action.');
  }
  table.children = table.children.filter(node=>!['thead','tbody','tfoot'].includes(node.tag) || node.children.some(child=>child.tag==='tr'));
});
const tblDefaults = {hfill:'accent',htext:'accentInk',fill:'surface',text:'ink',alternate:'background',banded:'off',border:'rows',spacing:'comfortable',halign:'left',align:'left',weight:'bold'};
const tblChoices = {banded:['on','off'],border:['none','rows','grid'],spacing:['compact','comfortable','spacious'],halign:['left','center','right'],align:['left','center','right'],weight:['bold','normal']};
const tblColorKeys = ['hfill','htext','fill','text','alternate'];
function tblStyle(table) {
  const style={...tblDefaults};
  for(const token of (table.attrs?.class || '').split(/\s+/)) {
    const match=token.match(/^ts-([a-z]+)-([\w]+)$/);if(!match)continue;
    const [,key,value]=match;
    if(tblChoices[key]?.includes(value) || tblColorKeys.includes(key) && (spRoles.includes(value) || /^c[0-9a-f]{6}$/.test(value)))style[key]=value;
  }
  return style;
}
editingRegisterOperation('table.style',(state,operation)=>{
  const table=tblTarget(state,operation);table.attrs??={};
  if(operation.reset){table.attrs.class=(table.attrs.class||'').split(/\s+/).filter(token=>!token.startsWith('ts-')&&token!=='ts-table').join(' ');return;}
  const style=tblStyle(table),presets={plain:{border:'none',banded:'off',hfill:'surface',htext:'ink'},header:{border:'rows',banded:'off',hfill:'accent',htext:'accentInk'},banded:{border:'rows',banded:'on',hfill:'accent',htext:'accentInk'},grid:{border:'grid',banded:'off',hfill:'accent',htext:'accentInk'}};
  if(operation.preset){if(!presets[operation.preset])editingFail('INVALID','Choose a table preset.');Object.assign(style,presets[operation.preset]);}
  for(const [key,value]of Object.entries(operation.changes||{})) {
    if(!(tblChoices[key]?.includes(value) || tblColorKeys.includes(key) && (spRoles.includes(value) || /^c[0-9a-f]{6}$/i.test(value))))editingFail('INVALID','Invalid table style.');
    style[key]=typeof value==='string'&&/^c[0-9a-f]{6}$/i.test(value)?value.toLowerCase():value;
  }
  const base=(table.attrs.class||'').split(/\s+/).filter(token=>token&&!token.startsWith('ts-')&&token!=='ts-table');
  table.attrs.class=[...base,'ts-table',...Object.entries(style).map(([key,value])=>'ts-'+key+'-'+value)].join(' ');
});
const tblDOM=projectDOM;
projectDOM=function(node){
  const element=tblDOM(node);
  if(node.tag==='table' && mgHas(node,'ts-table')) {
    const style=tblStyle(node),roles={background:'bg',accentInk:'accent-ink'};
    for(const key of tblColorKeys)element.style.setProperty('--ts-'+key,style[key].startsWith('c')&&/^c[0-9a-f]{6}$/.test(style[key])?'#'+style[key].slice(1):'var(--project-'+(roles[style[key]]||style[key])+')');
  }
  return element;
};
// Booth has a deliberately independent player. Bake colors into its disposable
// export copy rather than leaking authoring runtime or relying on theme variables.
const tblBoothData=boothExportData;
boothExportData=function(...args){
  const data=tblBoothData(...args),palette=studioPalette(projectState.brand);
  for(const slide of data.slides)projectWalk(slide.tree,node=>{
    if(node.tag!=='table'||!mgHas(node,'ts-table'))return;
    const style=tblStyle(node),rules=tblColorKeys.map(key=>'--ts-'+key+':'+(style[key].startsWith('c')&&/^c[0-9a-f]{6}$/.test(style[key])?'#'+style[key].slice(1):palette[style[key]]));
    node.attrs.style=(node.attrs.style||'')+';'+rules.join(';');
  });return data;
};
function tblCurrent() {
  if(!tblReady || !projectReady || icSelection().kind!=='table')return null;
  const path=icSelection().path,table=projectAt(projectModel(),path);if(table?.tag!=='table')return null;
  const grid=tblGrid(table),same=tblCell?.slide===projectSelected&&tblCell.path===path;
  return {table,path,grid,row:same?Math.min(tblCell.row,grid.rows.length-1):0,column:same?Math.min(tblCell.column,grid.columns-1):0,locked:icSelection().locked};
}
function tblRun(type, extra={}) {
  const current=tblCurrent();if(!current)return;
  const focus=document.activeElement?.id,token=projectSelected;
  vbEnd(false);projectFlush();
  const result=componentRun({type,path:current.path,row:current.row,column:current.column,...extra});
  if(result.ok && token===projectSelected){tblCell={slide:token,path:current.path,row:current.row,column:current.column};icDestination='table';projectTablePath=current.path;icTableSignature='';icPaint();tblPaint();if(focus)$(focus)?.focus({preventScroll:true});}
  return result;
}
function tblSelectCell(element) {
  const tableElement=element.closest('table'),path=tableElement?.dataset.tblPath||projectFind(projectModel(),node=>node.tag==='table').find(item=>vbIDs.get(item.node)===tableElement?.dataset.vbNode)?.path,table=path&&projectAt(projectModel(),path);
  if(!table)return;
  const grid=tblGrid(table),rows=[...tableElement.rows];tblCell={slide:projectSelected,path,row:rows.indexOf(element.parentElement),column:element.cellIndex};
  if(tblCell.row<0||tblCell.column>=grid.columns)tblCell=null;
}
const tblInlineSelection=vbSetSelection;
vbSetSelection=function(selection){
  if(tblReady&&selection?.slideID===projectSelected&&selection.el?.matches('td,th'))tblSelectCell(selection.el);
  return tblInlineSelection(selection);
};
projectTableForm=function(){
  if(!tblReady)return;
  const tables=projectFind(projectModel(),node=>node.tag==='table'),select=$('fe-table-select');
  select.replaceChildren(...tables.map((item,index)=>new Option('Table '+(index+1),item.path)));
  if(!tables.some(item=>item.path===projectTablePath))projectTablePath=tables[0]?.path||'';
  select.value=projectTablePath;const container=$('fe-table-grid');container.replaceChildren();
  const table=projectAt(projectModel(),projectTablePath);if(table?.tag!=='table')return;
  const grid=tblGrid(table),view=document.createElement('table');
  grid.rows.forEach((row,r)=>{const tr=document.createElement('tr');row.cells.forEach((node,c)=>{
    const td=document.createElement(row.header?'th':'td'),input=document.createElement('input');input.type='text';input.value=projectText(node);
    input.setAttribute('aria-label',row.header?'Column '+(c+1)+' heading':'Row '+(grid.body.indexOf(row)+1)+' column '+(c+1));
    // Panel fields own subsequent edits. Retain table selection, but end the
    // inline session without rebuilding this focused input or retaining stale DOM.
    input.onfocus=()=>{icDestination='table';vbEnd(false,false);tblCell={slide:projectSelected,path:projectTablePath,row:r,column:c};tblPaint();};
    input.oninput=()=>projectEdit(()=>projectSetText(node,input.value));td.append(input);tr.append(td);
  });view.append(tr);});container.append(view);
};
function tblPaint(){
  if(!tblReady||tblPainting||!projectReady)return;tblPainting=true;
  try{
    const current=tblCurrent(),active=!!current;
    $('tbl-toolbar').hidden=!active;$('tbl-style').hidden=!active;
    if(!active)return;
    const {table,grid,row,column,locked}=current,style=tblStyle(table);
    $('tbl-context').textContent='Row '+(row+1)+' · Column '+(column+1);
    $('ci-table-count').textContent=grid.body.length+' data rows · '+grid.columns+' columns'+(grid.header?' · Header row':'');
    for(const control of $('tbl-toolbar').querySelectorAll('button,select'))control.disabled=locked||!grid.regular;
    for(const control of $('tbl-style').querySelectorAll('button,input,select'))control.disabled=locked;
    $('tbl-header').checked=!!grid.header;$('tbl-header').disabled=locked||!grid.regular;
    $('tbl-banded').checked=style.banded==='on';
    for(const key of Object.keys(tblChoices))if($('tbl-'+key)&&key!=='banded')$('tbl-'+key).value=style[key];
    const palette=studioPalette(projectState.brand);
    for(const key of tblColorKeys){const value=style[key];$('tbl-'+key+'-source').value=value.startsWith('c')?'custom':value;$('tbl-'+key).value=value.startsWith('c')?'#'+value.slice(1):palette[value]||'#ffffff';}
    for(const button of $('tbl-presets').children){const preset=button.dataset.preset,selected=preset==='banded'?style.banded==='on'&&style.border==='rows':preset==='grid'?style.border==='grid':preset==='plain'?style.border==='none':style.border==='rows'&&style.banded==='off';button.setAttribute('aria-pressed',String(mgHas(table,'ts-table')&&selected));}
    for(const el of projectPreviewNode.querySelectorAll('table')){
      const match=projectFind(projectModel(),node=>node.tag==='table').find(item=>vbIDs.get(item.node)===el.dataset.vbNode);if(match)el.dataset.tblPath=match.path;
      el.querySelectorAll('.tbl-selected-cell').forEach(cell=>cell.classList.remove('tbl-selected-cell'));
      if(el.dataset.tblPath===current.path)el.rows[row]?.cells[column]?.classList.add('tbl-selected-cell');
    }
    const element=[...projectPreviewNode.querySelectorAll('table')].find(el=>el.dataset.tblPath===current.path);
    $('tbl-overflow').textContent=element&&(element.scrollHeight>element.clientHeight+2||element.closest('.db-block')&&element.getBoundingClientRect().bottom>element.closest('.db-block').getBoundingClientRect().bottom+2)?'Table content exceeds its frame. Enlarge the table or reduce cell spacing.':'';
    const generic=$('sp-style');generic.classList.toggle('tbl-generic-style',active);
  }finally{tblPainting=false;}
}
const tblPaintPrevious=icPaint;
icPaint=function(...args){const result=tblPaintPrevious(...args);if(tblReady){$('sp-style').classList.toggle('tbl-generic-style',!!tblCurrent());tblPaint();}return result;};
const tblPreview=projectPreview;
projectPreview=function(...args){const result=tblPreview(...args);if(tblReady)tblPaint();return result;};
const tblInit=projectInit;
projectInit=function(...args){
  const result=tblInit(...args);if(tblReady)return result;
  const tools=document.createElement('div');tools.id='tbl-toolbar';tools.hidden=true;tools.setAttribute('role','group');tools.setAttribute('aria-label','Selected table cell actions');
  const context=document.createElement('strong');context.id='tbl-context';context.setAttribute('role','status');tools.append(context);
  for(const [name,choices]of [['row',[['row-before','Insert row above'],['row-after','Insert row below'],['row-delete','Delete selected row']]],['column',[['column-before','Insert column left'],['column-after','Insert column right'],['column-delete','Delete selected column']]]]){
    const label=document.createElement('label');label.textContent=name==='row'?'Rows':'Columns';const select=document.createElement('select');select.id='tbl-action-'+name;select.setAttribute('aria-label',label.textContent+' actions');select.append(new Option('Choose action',''),...choices.map(([value,text])=>new Option(text,value)));select.onchange=()=>{const action=select.value;select.value='';if(action)tblRun('table.structure',{action});};label.append(select);tools.append(label);
  }
  const dock=document.createElement('div');dock.id='selection-action-dock';$('we-viewport').append(dock);dock.append(tools);
  const panel=document.createElement('section');panel.id='tbl-style';panel.dataset.wpPart='style';panel.hidden=true;
  panel.innerHTML='<h3>Table presets</h3><div id="tbl-presets"></div><label class="tbl-toggle"><input id="tbl-header" type="checkbox"> Header row</label>';
  for(const [preset,label]of [['plain','Plain'],['header','Header'],['banded','Banded'],['grid','Grid']]){const button=spButton(label,()=>tblRun('table.style',{preset}));button.dataset.preset=preset;const sample=document.createElement('span');sample.className='tbl-preset-preview tbl-preview-'+preset;sample.setAttribute('aria-hidden','true');button.prepend(sample);panel.querySelector('#tbl-presets').append(button);}
  for(const [title,keys]of [['Header appearance',['hfill','htext']],['Body rows',['fill','text']],['Alternating rows',['alternate']]]){
    const section=document.createElement('fieldset'),legend=document.createElement('legend');legend.textContent=title;section.append(legend);
    if(title==='Alternating rows'){const label=document.createElement('label');label.className='tbl-toggle';label.innerHTML='<input id="tbl-banded" type="checkbox"> Alternate row colors';section.append(label);}
    for(const key of keys){const field=document.createElement('label');field.className='tbl-color';field.textContent={hfill:'Header fill',htext:'Header text',fill:'Row A fill',text:'Body text',alternate:'Row B fill'}[key];
      const source=document.createElement('select');source.id='tbl-'+key+'-source';source.setAttribute('aria-label',field.textContent+' source');source.append(...spRoles.map(role=>new Option('Theme: '+role,role)),new Option('Custom','custom'));
      const color=document.createElement('input');color.type='color';color.id='tbl-'+key;color.setAttribute('aria-label',field.textContent+' custom color');color.onchange=()=>tblRun('table.style',{changes:{[key]:'c'+color.value.slice(1)}});source.onchange=()=>{if(source.value==='custom')color.click();else tblRun('table.style',{changes:{[key]:source.value}});};field.append(source,color);section.append(field);}
    if(title==='Header appearance'||title==='Body rows'){const key=title==='Header appearance'?'halign':'align',label=document.createElement('label');label.textContent='Text alignment';const select=document.createElement('select');select.id='tbl-'+key;select.append(...['left','center','right'].map(value=>new Option(value[0].toUpperCase()+value.slice(1),value)));select.onchange=()=>tblRun('table.style',{changes:{[key]:select.value}});label.append(select);section.append(label);}
    panel.append(section);
  }
  for(const [key,title]of [['weight','Header weight'],['border','Borders'],['spacing','Cell spacing']]){const label=document.createElement('label');label.textContent=title;const select=document.createElement('select');select.id='tbl-'+key;select.append(...tblChoices[key].map(value=>new Option(value[0].toUpperCase()+value.slice(1),value)));select.onchange=()=>tblRun('table.style',{changes:{[key]:select.value}});label.append(select);panel.append(label);}
  const reset=spButton('Reset table style',()=>tblRun('table.style',{reset:true}));reset.id='tbl-reset';const warning=document.createElement('p');warning.id='tbl-overflow';warning.setAttribute('role','status');panel.append(reset,warning);$('wp-fields').prepend(panel);
  $('tbl-header').onchange=()=>tblRun('table.structure',{action:'header',enabled:$('tbl-header').checked});$('tbl-banded').onchange=()=>tblRun('table.style',{changes:{banded:$('tbl-banded').checked?'on':'off'}});
  for(const id of ['fe-row-add','fe-column-add','fe-column-remove'])$(id).hidden=true;
  $('fe-row-add').onclick=()=>tblRun('table.structure',{action:'row-after'});$('fe-column-add').onclick=()=>tblRun('table.structure',{action:'column-after'});$('fe-column-remove').onclick=()=>tblRun('table.structure',{action:'column-delete'});
  $('fe-preview').addEventListener('click',event=>{const cell=event.target.closest('td,th');if(cell){tblSelectCell(cell);tblPaint();}},true);
  tblReady=true;projectTableForm();tblPaint();return result;
};
