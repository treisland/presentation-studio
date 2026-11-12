import './build.mjs';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import vm from 'node:vm';
const root = fileURLToPath(new URL('../', import.meta.url));
const sandbox = { setImmediate, clearImmediate, setTimeout, clearTimeout, Uint8Array, ArrayBuffer, TextEncoder, TextDecoder };
vm.runInNewContext(await readFile(resolve(root, 'vendor/jszip-3.10.1.min.js'), 'utf8'), sandbox);
const zip = new sandbox.JSZip();
for (const file of ['docs/viewer-defaults-contract.md','docs/viewer-controls.md','docs/deployment.md','docs/import-compatibility.md','docs/navigation.md','docs/interactive-elements.md','docs/0.13.0-manual-test-plan.md']) zip.file(file,new Uint8Array(await readFile(resolve(root,file))),{date:new Date('2026-01-01T00:00:00Z')});
zip.file('docs/content-inspector.md', new Uint8Array(await readFile(resolve(root, 'docs/content-inspector.md'))), {date:new Date('2026-01-01T00:00:00Z')});
zip.file('docs/inspector-navigation.md', new Uint8Array(await readFile(resolve(root, 'docs/inspector-navigation.md'))), {date:new Date('2026-01-01T00:00:00Z')});
zip.file('docs/media-inspector.md', new Uint8Array(await readFile(resolve(root, 'docs/media-inspector.md'))), {date:new Date('2026-01-01T00:00:00Z')});
zip.file('docs/context-menus.md', new Uint8Array(await readFile(resolve(root, 'docs/context-menus.md'))), {date:new Date('2026-01-01T00:00:00Z')});
zip.file('docs/layers-style-workflow.md', new Uint8Array(await readFile(resolve(root, 'docs/layers-style-workflow.md'))), {date:new Date('2026-01-01T00:00:00Z')});
zip.file('docs/editor-workbench.md', new Uint8Array(await readFile(resolve(root, 'docs/editor-workbench.md'))), {date:new Date('2026-01-01T00:00:00Z')});
  zip.file('docs/canvas-manipulation.md', new Uint8Array(await readFile(resolve(root, 'docs/canvas-manipulation.md'))), {date:new Date('2026-01-01T00:00:00Z')});
for (const name of ['AUTHORING.md', 'example.json', 'project-update.json', 'technical-walkthrough.json', 'background-effects.json', 'presentation.schema.json', 'capabilities.json', 'CAPABILITIES.md'])
  zip.file('ai-authoring/' + name, new Uint8Array(await readFile(resolve(root, 'dist/ai-authoring', name))), {date:new Date('2026-01-01T00:00:00Z')});
zip.file('docs/local-workspaces.md', new Uint8Array(await readFile(resolve(root, 'docs/local-workspaces.md'))), {date:new Date('2026-01-01T00:00:00Z')});
zip.file('docs/ai-layouts-and-elements.md', new Uint8Array(await readFile(resolve(root, 'docs/ai-layouts-and-elements.md'))), {date:new Date('2026-01-01T00:00:00Z')});
for (const name of ['docs/blocks-components.md','docs/authoring-customization.md','docs/tables-and-grouping.md','docs/background-effects.md','docs/numeric-controls.md','docs/import-compatibility.md','docs/0.12.0-manual-test-plan.md']) zip.file(name, new Uint8Array(await readFile(resolve(root,name))), {date:new Date('2026-01-01T00:00:00Z')});
// Fixed timestamps make repeated packages reproducible.
for (const file of ['dist/presentation-studio.html', 'dist/presentation-studio-blank.html', 'README.md', 'LICENSE', 'THIRD_PARTY_NOTICES.md', 'CONTRIBUTING.md', 'docs/architecture.md', 'docs/editor-workspace.md', 'docs/direct-editing-and-booth.md', 'docs/content-and-branding.md', 'docs/open-source-release.md', 'docs/roadmap.md', 'docs/troubleshooting.md', 'docs/images/studio-demo.png', 'docs/images/theme-gallery.png', 'docs/images/block-editing.png', 'docs/quick-start.md', 'docs/content-and-branding.md', 'examples/layout-sampler.json', 'examples/README.md', 'examples/sample-diagram.svg', 'examples/portfolio-library.svg', 'examples/portfolio-signs.svg', 'examples/portfolio-workshop.svg', 'examples/portfolio-plan.svg', 'examples/comic-seed-1.svg', 'examples/comic-seed-2.svg', 'examples/comic-seed-3.svg', 'examples/flyer-gathering.svg', 'docs/layout-collections.md', 'docs/examples.md', 'docs/0.5.0-manual-test-plan.md', 'docs/0.5.0-validation.md', 'docs/0.5.1-manual-test-plan.md']) {
  zip.file(file.replace(/^dist\//, ''), new Uint8Array(await readFile(resolve(root, file))), { date: new Date('2026-01-01T00:00:00Z') });
}
// Include project artwork by its current filename, including nested assets.
async function addAssets(directory = 'assets') {
  const entries = await readdir(resolve(root, directory), { withFileTypes: true });
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
    const file = directory + '/' + entry.name;
    if (entry.isDirectory()) await addAssets(file);
    else if (entry.isFile()) zip.file(file, new Uint8Array(await readFile(resolve(root, file))), { date: new Date('2026-01-01T00:00:00Z') });
  }
}
await addAssets();
for (const file of ['AGENTS.md', 'docs/release-process.md', 'docs/media-compatibility.md', 'docs/accessibility-audit.md', 'docs/editing-api.md', 'docs/content-blocks.md', 'release-plan.json']) {
  zip.file(file, new Uint8Array(await readFile(resolve(root, file))), { date: new Date('2026-01-01T00:00:00Z') });
}
for (const name of (await readdir(resolve(root, 'docs/releases'))).sort()) {
  zip.file('docs/releases/' + name, new Uint8Array(await readFile(resolve(root, 'docs/releases', name))), { date: new Date('2026-01-01T00:00:00Z') });
}
zip.file('docs/media-grid.md', new Uint8Array(await readFile(resolve(root,'docs/media-grid.md'))), {date:new Date('2026-01-01T00:00:00Z')});
zip.file('docs/0.3.0-manual-test-plan.md', new Uint8Array(await readFile(resolve(root,'docs/0.3.0-manual-test-plan.md'))), {date:new Date('2026-01-01T00:00:00Z')});
for (const name of (await readdir(resolve(root, 'vendor/licenses'))).sort()) zip.file('vendor/licenses/' + name, new Uint8Array(await readFile(resolve(root, 'vendor/licenses', name))), { date: new Date('2026-01-01T00:00:00Z') });
const demo = JSON.parse(await readFile(resolve(root, 'templates/studio/presentation.json'), 'utf8'));
const demoZip = new sandbox.JSZip();
const demoFile = (name,data) => demoZip.file(name,data,{date:new Date("2026-01-01T00:00:00Z")});
demoFile('index.html', new Uint8Array(await readFile(resolve(root, 'dist/presentation-studio.html'))));
demoFile('presentation.json', JSON.stringify(demo,null,2));
demoFile('assets/studio-demo-workflow.svg', new Uint8Array(await readFile(resolve(root, 'examples/sample-diagram.svg'))));
demoFile('README.txt', 'Editable Studio demo. Unzip all files together, then open index.html. Import this ZIP through Presentations to edit it in another copy of the studio.');
const demoBytes = await demoZip.generateAsync({type:'uint8array',compression:'DEFLATE'});
zip.file('studio-demo-editable.zip',demoBytes,{date:new Date('2026-01-01T00:00:00Z')});
await mkdir(resolve(root, 'release'), {recursive:true});
await writeFile(resolve(root,'release/studio-demo-editable.zip'),demoBytes);
const { version } = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
await mkdir(resolve(root, 'release'), { recursive: true });
await writeFile(resolve(root, `release/presentation-studio-v${version}.zip`), await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' }));
console.log(`Packaged release/presentation-studio-v${version}.zip`);
