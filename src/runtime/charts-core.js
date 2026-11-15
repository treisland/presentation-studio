// Additive, bounded chart configuration. SVG is generated, never imported as code.
const chartKinds = {column:'Column chart',bar:'Horizontal bars',line:'Line chart',donut:'Donut chart'};
const chartLimits = {categories:12,series:4,label:80,value:1e12,colors:12};
function chartAuthoringProperties(){
  const label={type:'string',minLength:1,maxLength:chartLimits.label,pattern:'^[^\\u0000-\\u001f\\u007f]*$'};
  return {
    kind:{type:'string',enum:Object.keys(chartKinds)},title:{...label},
    labels:{type:'array',minItems:1,maxItems:chartLimits.categories,uniqueItems:true,items:{...label}},
    series:{type:'array',minItems:1,maxItems:chartLimits.series,items:{type:'object',additionalProperties:false,required:['name','values'],properties:{name:{...label},values:{type:'array',minItems:1,maxItems:chartLimits.categories,items:{type:'number',minimum:-chartLimits.value,maximum:chartLimits.value}}}}},
    colors:{type:'array',maxItems:chartLimits.colors,items:{type:'string',maxLength:7,pattern:'^#[0-9a-fA-F]{6}$'}},
  };
}
function chartNormalize(raw) {
  if (!raw || raw.version !== 1 || !Object.hasOwn(chartKinds,raw.kind)) throw Error('Choose a supported chart type.');
  const label = value => {if(typeof value!=='string'||!value.trim()||value.length>chartLimits.label||/[\u0000-\u001f\u007f]/.test(value))throw Error('Use nonempty single-line labels of at most 80 characters.');return value.trim();};
  if(!Array.isArray(raw.labels)||raw.labels.length<1||raw.labels.length>chartLimits.categories||!Array.isArray(raw.series)||raw.series.length<1||raw.series.length>chartLimits.series)throw Error('Use 1–12 categories and 1–4 series.');
  const labels=raw.labels.map(label),series=raw.series.map(item=>{
    if(!item||!Array.isArray(item.values)||item.values.length!==labels.length)throw Error('Each series needs one number per category.');
    return {name:label(item.name),values:item.values.map(value=>{if(typeof value!=='number'||!Number.isFinite(value)||Math.abs(value)>chartLimits.value)throw Error('Use finite numbers between −1 trillion and 1 trillion.');return value;})};
  });
  if(new Set(labels).size!==labels.length||new Set(series.map(item=>item.name)).size!==series.length)throw Error('Use distinct category and series names.');
  if(raw.kind==='donut'&&(series.length!==1||series[0].values.some(value=>value<0)||!series[0].values.some(value=>value>0)))throw Error('Donut charts need one series, nonnegative values and a positive total.');
  const colors=raw.colors??[];
  if(!Array.isArray(colors)||colors.length>chartLimits.colors||colors.some(value=>typeof value!=='string'||!/^#[\da-f]{6}$/i.test(value)))throw Error('Custom colors must use six-digit hex values.');
  return {version:1,kind:raw.kind,title:label(raw.title),labels,series,colors:[...colors]};
}
function chartSample(kind='column') {
  return {version:1,kind,title:'Revenue by quarter',labels:['Q1','Q2','Q3','Q4'],series:[{name:'Product',values:[120,140,180,210]},...(kind==='donut'?[]:[{name:'Services',values:[80,100,130,160]}])],colors:[]};
}
function chartParse(text,base) {
  if(typeof text!=='string'||text.length>16000)throw Error('Paste at most 16,000 characters.');
  const lines=text.trim().split(/\r?\n/),separator=lines[0]?.includes('\t')?'\t':',';
  const rows=lines.map(line=>line.split(separator).map(cell=>cell.trim()));
  if(rows.length<2||rows[0].length<2||rows.some(row=>row.length!==rows[0].length))throw Error('Paste a header row and equally sized data rows, separated by tabs or commas.');
  const number=value=>{if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value))throw Error('Every data cell needs a plain number, without currency symbols or thousands separators.');return Number(value);};
  return chartNormalize({...base,labels:rows.slice(1).map(row=>row[0]),series:rows[0].slice(1).map((name,index)=>({name,values:rows.slice(1).map(row=>number(row[index+1]))}))});
}
function chartTSV(data){return [['Category',...data.series.map(item=>item.name)],...data.labels.map((label,index)=>[label,...data.series.map(item=>item.values[index])])].map(row=>row.join('\t')).join('\n');}
