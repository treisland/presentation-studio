// Coalesce dependent view refreshes during a synchronous gesture transaction.
// Validation, model commit, history and recovery remain synchronous and unchanged.
let canvasViewDepth=0,canvasViewFlushing=false;
const canvasViewPending=new Map(),canvasViewDone=new Set();
function canvasViewCall(name,original,self,args){
 if(canvasViewDepth||canvasViewFlushing){
  if(!canvasViewDone.has(name))canvasViewPending.set(name,()=>original.apply(self,args));
  return;
 }
 return original.apply(self,args);
}
function canvasViewBatch(action){
 canvasViewDepth++;
 try{return action();}finally{
  if(!--canvasViewDepth&&!canvasViewFlushing){
   canvasViewFlushing=true;
   try{
    while(canvasViewPending.size){const [name,paint]=canvasViewPending.entries().next().value;canvasViewPending.delete(name);canvasViewDone.add(name);paint();}
   }finally{canvasViewFlushing=false;canvasViewPending.clear();canvasViewDone.clear();}
  }
 }
}
const canvasViewSp=spPaint;spPaint=function(...args){return canvasViewCall('layers',canvasViewSp,this,args);};
const canvasViewComponent=componentPaint;componentPaint=function(...args){return canvasViewCall('components',canvasViewComponent,this,args);};
const canvasViewInspector=icPaint;icPaint=function(...args){return canvasViewCall('inspector',canvasViewInspector,this,args);};
const canvasViewGroup=gsPaint;gsPaint=function(...args){return canvasViewCall('groups',canvasViewGroup,this,args);};
const canvasViewBlock=dbPanel;dbPanel=function(...args){return canvasViewCall('blocks',canvasViewBlock,this,args);};
const canvasBlockFinish=dbFinish;dbFinish=function(...args){return canvasViewBatch(()=>canvasBlockFinish(...args));};
const canvasGroupFinish=gsFinish;gsFinish=function(...args){return canvasViewBatch(()=>canvasGroupFinish(...args));};
const canvasMediaFinish=ceEnd;ceEnd=function(...args){return canvasViewBatch(()=>canvasMediaFinish(...args));};
