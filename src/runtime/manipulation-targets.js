// Editor-only handle geometry. Never write these view coordinates to project data.
let mhFrame=0;
function mhQueue(){if(!mhFrame)mhFrame=requestAnimationFrame(()=>{mhFrame=0;mhPaint();});}
function mhPaint(){
  const slide=projectPreviewNode?.querySelector('.slide'),viewport=$('we-viewport');
  if(!slide||!viewport||!weEditing()||vbMode!=='edit')return;
  const view=viewport.getBoundingClientRect(),canvas=slide.getBoundingClientRect(),scale=weScale();
  const clip={left:Math.max(view.left,canvas.left)+20,right:Math.min(view.right,canvas.right)-20,top:Math.max(view.top,canvas.top)+20,bottom:Math.min(view.bottom,canvas.bottom)-20};
  if(clip.right<=clip.left||clip.bottom<=clip.top)return;
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  for(const root of slide.querySelectorAll('.db-selected,.ce-selected,.gs-bounds')){
    const handles=[...root.children].filter(node=>node.matches('.db-handle,.ce-handle,.gs-handle'));
    if(!handles.length)continue;
    const rect=root.getBoundingClientRect(),visible=rect.right>=view.left&&rect.left<=view.right&&rect.bottom>=view.top&&rect.top<=view.bottom;
    const angle=parseFloat(getComputedStyle(root).rotate)||0,rad=angle*Math.PI/180,c=Math.cos(rad),s=Math.sin(rad);
    const width=root.offsetWidth,height=root.offsetHeight,cx=(rect.left+rect.right)/2,cy=(rect.top+rect.bottom)/2;
    // Thin selections still need distinct handles; keep the whole grip grid reachable.
    const halfX=Math.min(Math.max(width*scale/2,32),(clip.right-clip.left)/2),halfY=Math.min(Math.max(height*scale/2,32),(clip.bottom-clip.top)/2);
    const extentX=Math.abs(c)*halfX+Math.abs(s)*halfY,extentY=Math.abs(s)*halfX+Math.abs(c)*halfY;
    const centerX=clamp(cx,clip.left+Math.min(extentX,(clip.right-clip.left)/2),clip.right-Math.min(extentX,(clip.right-clip.left)/2));
    const centerY=clamp(cy,clip.top+Math.min(extentY,(clip.bottom-clip.top)/2),clip.bottom-Math.min(extentY,(clip.bottom-clip.top)/2));
    for(const handle of handles){
      const move=handle.matches('.db-move,.ce-move,.gs-move');
      const direction=handle.dataset.dbDirection||handle.dataset.corner||(handle.matches('.gs-resize')?'se':'');
      let x=move?-halfX+30:direction.includes('w')?-halfX:direction.includes('e')?halfX:0;
      let y=move?-halfY-26:direction.includes('n')?-halfY:direction.includes('s')?halfY:0;
      let sx=clamp(centerX+c*x-s*y,clip.left,clip.right),sy=clamp(centerY+s*x+c*y,clip.top,clip.bottom);
      // At the top edge, put Move inside and apart from the corner/edge resize targets.
      if(move&&sy<=clip.top+1){sx=clamp(centerX,clip.left+24,clip.right-24);sy=clamp(centerY,clip.top+26,clip.bottom);}
      const dx=sx-cx,dy=sy-cy;
      Object.assign(handle.style,{left:(width/2+(c*dx+s*dy)/scale)+'px',top:(height/2+(-s*dx+c*dy)/scale)+'px',right:'auto',bottom:'auto',margin:'0',rotate:(-angle)+'deg',visibility:visible?'':'hidden'});
      handle.style.setProperty('--mh-scale',scale);
      if(handle.disabled){handle.title='Unlock this item or presentation to move or resize it.';handle.setAttribute('aria-description',handle.title);}
    }
  }
}
const mhPreview=projectPreview;projectPreview=function(...args){const value=mhPreview(...args);mhQueue();return value;};
const mhView=weView;weView=function(...args){const value=mhView(...args);mhQueue();return value;};
const mhBlocks=dbPanel;dbPanel=function(...args){const value=mhBlocks(...args);mhQueue();return value;};
const mhMedia=ceDecorate;ceDecorate=function(...args){const value=mhMedia(...args);mhQueue();return value;};
const mhGroups=gsPaint;gsPaint=function(...args){const value=mhGroups(...args);mhQueue();return value;};
window.addEventListener('pointermove',()=>{if(dbDrag?.mode==='resize'||ceDrag?.corner||gsGesture?.mode==='resize')mhQueue();});
window.addEventListener('resize',mhQueue);
