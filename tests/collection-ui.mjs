import {selectStartingExample} from './ui.mjs';
import {resolve} from 'node:path';
import {readFile} from 'node:fs/promises';
import {click} from './ui.mjs';
export const snapshot=page=>page.evaluate(()=>window.presentationStudioEditing.read());
export const operations=(page,ops)=>page.evaluate(operations=>{const api=window.presentationStudioEditing,s=api.read();return api.apply({apiVersion:1,projectId:s.projectId,expectedRevision:s.revision,operations});},ops);
export async function openExample(browser,choice,dark=false){
 const page=await browser.newPage({acceptDownloads:true,viewport:{width:1366,height:768}}),errors=[];page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));
 await page.goto('file://'+resolve('dist/presentation-studio.html'));await page.locator('#open-full-editor').click();await chooseExample(page,choice,dark);return{page,errors};
}
export async function chooseExample(page,choice,dark=false){
 await click(page,'#studio-new-open');if(await page.locator('#hub-switch').evaluate(d=>d.open))await page.locator('#hub-save-switch').click();await page.locator('#nx-wizard').waitFor({state:'visible'});await selectStartingExample(page,choice);
 if(dark){for(let i=0;i<3;i++)await page.locator('#nx-wizard-next').click();await page.locator('#nx-wizard-theme').selectOption('dark');await page.locator('#nx-wizard-next').click();}else await page.locator('#nx-wizard-defaults').click();
 await page.locator('#nx-wizard').waitFor({state:'hidden'});
}
export async function exportZip(page,selector='#fe-export'){const event=page.waitForEvent('download');await click(page,selector);return readFile(await(await event).path());}
export async function importZip(browser,bytes,projectId){
 const page=await browser.newPage();page.setDefaultTimeout(10000);await page.context().setOffline(true);await page.goto('file://'+resolve('dist/presentation-studio.html'));await page.locator('#open-full-editor').click();await page.locator('#fe-import-file').setInputFiles({name:'collection.zip',mimeType:'application/zip',buffer:bytes});await page.waitForFunction(id=>window.presentationStudioEditing.read().projectId===id,projectId);return page;
}
export async function dropDiagram(page,index=0){
 const before=(await snapshot(page)).revision;
 await page.locator('#fe-preview .mg-cell-action').nth(index).evaluate(el=>{const data=new DataTransfer();data.items.add(new File(['<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="320" height="180" fill="#286875"/></svg>'],'original-diagram.svg',{type:'image/svg+xml'}));el.dispatchEvent(new DragEvent('drop',{bubbles:true,dataTransfer:data}));});if(await page.locator('#fe-confirm').evaluate(d=>d.open))await page.locator('#fe-confirm-accept').click();await page.waitForFunction(revision=>window.presentationStudioEditing.read().revision!==revision,before);await page.locator('#fe-preview .media-box img').waitFor({state:'attached'});
}
