// Session-only alignment target; explicit actions use the existing transaction API.
function canvasArrangeUnits(){
 try{return componentUnits(spEntries().filter(entry=>spActiveKeys().includes(entry.key)));}catch{return [];}
}
function canvasArrangePaint(){
 const select=$('canvas-align-to');if(!select)return;
 const units=canvasArrangeUnits(),context=icSelection();
 select.disabled=context.locked||!units.length;
 select.querySelector('[value=selection]').disabled=units.length<2;
 const eligible=units.length>0&&!context.locked&&(select.value!=='selection'||units.length>=2);
 const controls=$('canvas-arrange-actions');controls.querySelectorAll('[data-align]').forEach(button=>button.disabled=!eligible);
 controls.querySelectorAll('[data-distribute]').forEach(button=>button.disabled=context.locked||units.length<3);
 $('canvas-arrange-reason').textContent=!units.length?'Select free objects; template and grid content use their placement controls.':context.locked?'Unlock selected items before arranging.':select.value==='selection'&&units.length<2?'Selection alignment needs two independent objects or groups.':units.length<3?'Space evenly needs three independent objects or groups.':'Groups count as one object; internal spacing is preserved.';
}
const canvasArrangeInspector=icPaint;
icPaint=function(...args){const result=canvasArrangeInspector(...args);canvasArrangePaint();return result;};
const canvasArrangeInit=projectInit;
projectInit=function(...args){
 const result=canvasArrangeInit(...args),panel=document.createElement('section');panel.dataset.wpPart='arrange';panel.id='canvas-arrangement';
 panel.innerHTML='<h3>Align &amp; space</h3><label>Align to<select id="canvas-align-to"><option value="slide">Slide</option><option value="selection">Selection bounds</option></select></label><div id="canvas-arrange-actions"></div><p id="canvas-arrange-reason"></p>';
 for(const [action,label]of [['left','Left'],['center','Center horizontally'],['right','Right'],['top','Top'],['middle','Center vertically'],['bottom','Bottom'],['distribute-x','Space evenly horizontally'],['distribute-y','Space evenly vertically']]){
  const button=componentButton(label,()=>componentRun({type:'component.arrange',keys:spActiveKeys(),action,alignTo:$('canvas-align-to').value}));
  button.dataset[action.startsWith('distribute-')?'distribute':'align']=action;panel.querySelector('#canvas-arrange-actions').append(button);
 }
 $('wp-fields').append(panel);$('canvas-align-to').onchange=canvasArrangePaint;canvasArrangePaint();return result;
};
