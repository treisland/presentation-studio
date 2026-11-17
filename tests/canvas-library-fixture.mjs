// Neutral fixtures shared by baseline and behavioral regressions.
import assert from 'node:assert/strict';
import {operations,snapshot} from './collection-ui.mjs';
export const blockKinds=['text','rectangle','circle','quote','metric','callout','step','arrow','button','outline-button','text-link','navigation-arrow'];
export const frameNames=['Rectangle frame','Rounded frame','Circle frame','Oval frame'];
export async function libraryBlock(page,kind){
 const slideId=(await snapshot(page)).state.slides[0].id;
 assert.equal((await operations(page,[{type:'design.clear',slideId}])).ok,true);
 const result=await operations(page,[{type:'block.create',slideId,kind,placement:{x:.2,y:.3,w:.3,h:.3}}]);
 assert.equal(result.ok,true,result.message);return {slideId,key:result.created[0]};
}
