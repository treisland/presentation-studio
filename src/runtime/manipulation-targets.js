// Editor-only handle geometry. Never write these view coordinates to project data.
let mhFrame=0;
function mhQueue(){if(!mhFrame)mhFrame=requestAnimationFrame(()=>{mhFrame=0;mhPaint();});}
function mhHide(){for(const handle of document.querySelectorAll('.mh-target:popover-open'))handle.hidePopover();}
function mhPaint(){
  const slide=projectPreviewNode?.querySelector('.slide'),viewport=$('we-viewport');
  if(!slide||!viewport||!weEditing()||vbMode!=='edit'){mhHide();return;}
  const roots=[...slide.querySelectorAll('.db-selected,.ce-selected,.gs-bounds')].filter(root=>!slide.classList.contains('gs-multiple')||root.matches('.gs-bounds'));
  const active=new Set(roots.flatMap(root=>[...root.children].filter(node=>node.matches('.db-handle,.ce-handle,.gs-handle'))));
  for(const handle of document.querySelectorAll('.mh-target:popover-open'))if(!active.has(handle))handle.hidePopover();
  const view=viewport.getBoundingClientRect(),canvas=slide.getBoundingClientRect(),scale=weScale();
  const clip={left:Math.max(view.left,canvas.left)+20,right:Math.min(view.right,canvas.right)-20,top:Math.max(view.top,canvas.top)+20,bottom:Math.min(view.bottom,canvas.bottom)-20};
  if(clip.right<=clip.left||clip.bottom<=clip.top){mhHide();return;}
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  for(const root of roots){
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
    const positions=handles.map(handle=>{
      const move=handle.matches('.db-move,.ce-move,.gs-move');
      const direction=handle.dataset.dbDirection||handle.dataset.corner||(handle.matches('.gs-resize')?'se':'');
      let x=move?-halfX+30:direction.includes('w')?-halfX:direction.includes('e')?halfX:0;
      let y=move?-halfY-26:direction.includes('n')?-halfY:direction.includes('s')?halfY:0;
      let sx=clamp(centerX+c*x-s*y,clip.left,clip.right),sy=clamp(centerY+s*x+c*y,clip.top,clip.bottom);
      return {handle,move,sx,sy};
    });
    const occupied=[];
    const overlaps=(x,y,move)=>occupied.some(p=>Math.abs(x-p.sx)<(move?15:12)+(p.move?15:12)+2&&Math.abs(y-p.sy)<(move?13:12)+(p.move?13:12)+2);
    // Reserve resize targets first, then place Move; every grip keeps its own hit area.
    for(const position of positions.sort((a,b)=>Number(a.move)-Number(b.move))){
      const {handle,move}=position;let {sx,sy}=position;
      // Resolve collisions after rotation and clipping, on every canvas edge.
      if(overlaps(sx,sy,move)){
        const candidates=[];
        for(let x=clip.left;x<=clip.right;x+=26)for(let y=clip.top;y<=clip.bottom;y+=26)
          if(!overlaps(x,y,move))candidates.push({x,y,d:(x-sx)**2+(y-sy)**2});
        candidates.sort((a,b)=>a.d-b.d);
        if(candidates.length){sx=candidates[0].x;sy=candidates[0].y;}
      }
      occupied.push({sx,sy,move});
      // Native manual popovers keep only the grips above sibling stacking contexts.
      // Their DOM ownership/event path stays on the original object; content z-order is unchanged.
      handle.classList.add('mh-target');handle.popover='manual';
      Object.assign(handle.style,{left:sx+'px',top:sy+'px',right:'auto',bottom:'auto',margin:'0',rotate:'0deg'});
      if(visible&&!handle.matches(':popover-open'))handle.showPopover();
      if(!visible&&handle.matches(':popover-open'))handle.hidePopover();
      if(handle.disabled){handle.title='Unlock this item or presentation to move or resize it.';handle.setAttribute('aria-description',handle.title);}
    }
  }
}
const mhPreview=projectPreview;projectPreview=function(...args){const value=mhPreview(...args);mhQueue();return value;};
const mhView=weView;weView=function(...args){const value=mhView(...args);mhQueue();return value;};
const mhBlocks=dbPanel;dbPanel=function(...args){const value=mhBlocks(...args);mhQueue();return value;};
const mhMedia=ceDecorate;ceDecorate=function(...args){const value=mhMedia(...args);mhQueue();return value;};
const mhGroups=gsPaint;gsPaint=function(...args){const value=mhGroups(...args);mhQueue();return value;};
window.addEventListener('pointermove',()=>{if(dbDrag||ceDrag||gsGesture)mhQueue();});
window.addEventListener('resize',mhQueue);
document.addEventListener('close',event=>{if(event.target.id==='full-editor')mhHide();},true);
