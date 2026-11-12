import vm from 'node:vm';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {archivePath} from './archive-path.mjs';
import {selectTab,click} from './ui.mjs';
import {exportZip} from './collection-ui.mjs';
const context={setImmediate,clearImmediate,setTimeout,clearTimeout,Uint8Array,ArrayBuffer,TextEncoder,TextDecoder};
vm.runInNewContext(await readFile('vendor/jszip-3.10.1.min.js','utf8'),context);
export async function exportInteractiveBooth(page,folder){
  await selectTab(page,'Presentation settings');await click(page,'#booth-open');
  await page.locator('#booth-password').fill('interactive-test-passphrase');await page.locator('#booth-confirm').fill('interactive-test-passphrase');await page.locator('#booth-navigation').check();
  const bytes=await exportZip(page,'#booth-export'),zip=await context.JSZip.loadAsync(new Uint8Array(bytes));
  for(const [name,item]of Object.entries(zip.files)){if(item.dir)continue;const target=archivePath(folder,name);await mkdir(dirname(target),{recursive:true});await writeFile(target,Buffer.from(await item.async('uint8array')));}
  return resolve(folder,'index.html');
}
