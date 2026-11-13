function cnPaint(){
  if(!$('cn-filters'))return;
  const category=$('component-category').value,blocks=['All','Text','Shapes','Media'].includes(category);
  $('cn-filters').hidden=!blocks;
  for(const button of $('cn-filters').querySelectorAll('button'))button.setAttribute('aria-pressed',String(button.dataset.category===category));
  for(const tab of $('component-tabs').querySelectorAll('[role=tab]')){
    const name={All:['card','Blocks'],Widgets:['widgets','Widgets'],Library:['bookmark','My components'],Data:['code','Data & Code']}[tab.dataset.category];
    if(!name)continue;
    if(!tab.querySelector('.wb-icon')){const text=document.createElement('span');text.textContent=name[1];tab.replaceChildren(workbenchIcon(name[0]),text);tab.setAttribute('aria-label',name[1]);}
  }
  if(blocks)for(const card of $('component-items').querySelectorAll('article')){
    const preview=card.querySelector('.component-card-preview');if(!preview)continue;
    for(const [kind,label] of [['line','Line'],['arrow','Arrow / Pointer'],['button','Button'],['step','1']])if(preview.classList.contains('component-preview-'+kind)){
      preview.replaceChildren();const sample=document.createElement('span');sample.className='cn-sample-'+kind;sample.textContent=label;preview.append(sample);
    }
  }
}
const cnList=componentList;
componentList=function(...args){const result=cnList(...args);cnPaint();return result;};
const cnInit=projectInit;
projectInit=function(...args){
  const result=cnInit(...args),filters=document.createElement('div');filters.id='cn-filters';filters.setAttribute('role','group');filters.setAttribute('aria-label','Blocks filter');
  for(const name of ['All','Text','Shapes','Media']){
    const button=componentButton(name,()=>{$('component-category').value=name;componentList();});button.dataset.category=name;button.setAttribute('aria-pressed',String(name==='All'));filters.append(button);
  }
  $('component-tabs').after(filters);cnPaint();return result;
};
