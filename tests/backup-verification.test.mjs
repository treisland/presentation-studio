import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import vm from 'node:vm';
import { click } from './ui.mjs';

const sandbox = { setImmediate, clearImmediate, setTimeout, clearTimeout, Uint8Array, ArrayBuffer, TextEncoder, TextDecoder };
vm.runInNewContext(await readFile('vendor/jszip-3.10.1.min.js', 'utf8'), sandbox);
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE_PATH, args: ['--no-sandbox'] });
test.after(() => browser.close());
async function setup() {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, acceptDownloads: true });
  await page.goto('file://' + resolve('dist/presentation-studio.html'));
  await page.locator('#open-full-editor').click();
  await page.locator('#fe-slide-title').fill('Active project must remain unchanged');
  await page.locator('#fe-slide-title').press('Tab');
  await page.waitForFunction(() => document.querySelector('#fe-status').dataset.saveState === 'saved');
  return page;
}
async function download(page, selector) {
  const event = page.waitForEvent('download');
  await click(page, selector);
  return readFile(await (await event).path());
}
async function database(page) {
  return page.evaluate(async () => {
    const result = {};
    for (const info of await indexedDB.databases()) {
      const db = await new Promise((resolve, reject) => { const request = indexedDB.open(info.name); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
      const stores = {};
      for (const name of db.objectStoreNames) {
        stores[name] = await new Promise((resolve, reject) => { const request = db.transaction(name).objectStore(name).getAll(); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
      }
      result[info.name] = JSON.parse(JSON.stringify(stores, (_, value) => value instanceof Blob ? { size: value.size, type: value.type } : value));
      db.close();
    }
    return result;
  });
}
async function verify(page, bytes, name = 'backup.zip') {
  await click(page, '#bv-open');
  await page.locator('#bv-file').setInputFiles({ name, mimeType: 'application/zip', buffer: Buffer.from(bytes) });
  await page.waitForFunction(() => /checks passed|Verification failed:/.test(document.querySelector('#bv-status').textContent));
  return page.locator('#bv-status').innerText();
}
async function fixture(page) {
  const bytes = await download(page, '#fe-export');
  const zip = await sandbox.JSZip.loadAsync(new Uint8Array(bytes));
  const pack = JSON.parse(await zip.file('presentation.json').async('string'));
  const image = await zip.file('assets/studio-demo-workflow.svg').async('uint8array');
  const recovery = structuredClone(pack.state);
  recovery.media['studio-media'].src = 'assets/recovery.svg';
  pack.checkpoints = [{ id: 'backup-checkpoint', name: 'Backup checkpoint', created: '2026-11-07', state: recovery }];
  pack.history.past = [structuredClone(recovery)];
  pack.state.trash.push({ ...structuredClone(pack.state.slides[0]), id: 'backup-trash' });
  pack.state.media['backup-trash'] = { ...pack.state.media['studio-media'], src: 'assets/trash.svg' };
  zip.file('assets/recovery.svg', image);
  zip.file('assets/trash.svg', image);
  zip.file('presentation.json', JSON.stringify(pack));
  return { zip, pack };
}

test('verification preserves active project, undo, local drafts and backup status; restore succeeds in clean profile', async () => {
  const page = await setup();
  try {
    const { zip, pack } = await fixture(page);
    const bytes = await zip.generateAsync({ type: 'uint8array', compression: 'STORE' });
    const before = JSON.parse(await download(page, '#fe-export-json'));
    const drafts = await database(page);
    const status = await page.locator('#fe-status').innerText();
    assert.match(await verify(page, bytes), /checks passed/);
    assert.match(await page.locator('#bv-result').innerText(), /Trashed slides: 1.*Checkpoints: 1.*Undo\/redo states: 1/);
    await mkdir('test-results', { recursive: true });
    await page.screenshot({ path: 'test-results/backup-verification.png' });
    assert.deepEqual(await database(page), drafts);
    await page.keyboard.press('Control+z');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.activeElement.id === 'bv-open');
    assert.equal(await page.locator('#fe-status').innerText(), status);
    assert.deepEqual(JSON.parse(await download(page, '#fe-export-json')), before);
    const restored = await browser.newPage({ acceptDownloads: true });
    try {
      await restored.goto('file://' + resolve('dist/presentation-studio-blank.html'));
      await restored.locator('#hub-presentations').click();
      await restored.locator('#hub-file').setInputFiles({ name: 'restore.zip', mimeType: 'application/zip', buffer: Buffer.from(bytes) });
      await restored.waitForFunction(() => document.querySelector('#fe-status').dataset.saveState === 'saved' && document.querySelector('#fe-title').textContent === 'From idea to presentation');
      await restored.locator('#open-full-editor').click();
      const result = JSON.parse(await download(restored, '#fe-export-json'));
      assert.deepEqual(result.state.slides.map(slide => slide.notes), pack.state.slides.map(slide => slide.notes));
      assert.deepEqual(result.state.sections, pack.state.sections);
      assert.equal(result.state.trash[0].id, 'backup-trash');
      assert.equal(result.checkpoints[0].state.media['studio-media'].src, 'assets/recovery.svg');
      assert.equal(result.history.past[0].media['studio-media'].src, 'assets/recovery.svg');
      const reexported = await sandbox.JSZip.loadAsync(new Uint8Array(await download(restored, '#fe-export')));
      assert.deepEqual(Buffer.from(await reexported.file('assets/recovery.svg').async('uint8array')), Buffer.from(await zip.file('assets/recovery.svg').async('uint8array')));
    } finally { await restored.close(); }
  } finally { await page.close(); }
});

test('invalid, missing-recovery, corrupt, unsafe and playback-only archives fail without importing HTML', async () => {
  const page = await setup();
  try {
    const { zip, pack } = await fixture(page);
    const before = JSON.parse(await download(page, '#fe-export-json'));
    const cases = [];
    zip.file('index.html', '<script>globalThis.backupExecuted=true</script>');
    zip.remove('assets/recovery.svg');
    cases.push([await zip.generateAsync({ type: 'uint8array' }), /assets\/recovery.svg/]);
    zip.file('assets/recovery.svg', await zip.file('assets/trash.svg').async('uint8array'));
    pack.playbackOnly = true;
    zip.file('presentation.json', JSON.stringify(pack));
    cases.push([await zip.generateAsync({ type: 'uint8array' }), /playback-only/]);
    pack.playbackOnly = false;
    pack.schemaVersion = 999;
    zip.file('presentation.json', JSON.stringify(pack));
    cases.push([await zip.generateAsync({ type: 'uint8array' }), /Unsupported project format/]);
    pack.schemaVersion = 2;
    zip.file('presentation.json', JSON.stringify(pack));
    const valid = await zip.generateAsync({ type: 'uint8array', compression: 'STORE' });
    const corrupt = Buffer.from(valid);
    const central = corrupt.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
    corrupt[central + 16] ^= 1;
    const local = corrupt.readUInt32LE(central + 42);
    corrupt[local + 14] ^= 1;
    cases.push([corrupt, /Corrupt archive entry/]);
    const oversized = Buffer.from(valid);
    oversized.writeUInt32LE(257 * 1024 * 1024, central + 24);
    cases.push([oversized, /verification limit/]);
    zip.file('../outside.txt', 'untrusted');
    cases.push([await zip.generateAsync({ type: 'uint8array' }), /Unsafe or (ambiguous|duplicate)/]);
    cases.push([Buffer.from('not a zip'), /corrupt ZIP directory/]);
    for (const [bytes, expected] of cases) {
      assert.match(await verify(page, bytes), expected);
      assert.equal(await page.evaluate(() => globalThis.backupExecuted), undefined);
      await page.locator('#bv-close').click();
      await page.waitForFunction(() => document.activeElement.id === 'bv-open' && !document.querySelector('#bv-dialog').open);
    }
    assert.deepEqual(JSON.parse(await download(page, '#fe-export-json')), before);
    assert.match(await verify(page, valid), /checks passed/);
    assert.equal(await page.evaluate(() => globalThis.backupExecuted), undefined);
  } finally { await page.close(); }
});

test('original duplicate ZIP members are rejected before deduplication, including a corrupt overwritten member', async () => {
  const page = await setup();
  try {
    const { zip } = await fixture(page);
    zip.file('extra-a.txt', 'first member');
    zip.file('extra-b.txt', 'last member');
    const duplicate = Buffer.from(await zip.generateAsync({ type: 'uint8array', compression: 'STORE' }));
    const oldName = Buffer.from('extra-b.txt'), newName = Buffer.from('extra-a.txt');
    for (let position = duplicate.indexOf(oldName); position !== -1; position = duplicate.indexOf(oldName, position + oldName.length)) newName.copy(duplicate, position);
    assert.match(await verify(page, duplicate), /duplicate archive path: extra-a.txt/);
    await page.locator('#bv-close').click();
    await page.waitForFunction(() => document.activeElement.id === 'bv-open');
    const corrupt = Buffer.from(duplicate);
    const firstName = corrupt.indexOf(newName);
    corrupt[firstName + newName.length] ^= 1;
    assert.match(await verify(page, corrupt), /duplicate archive path: extra-a.txt/);
    await page.locator('#bv-close').click();
    await page.waitForFunction(() => document.activeElement.id === 'bv-open');
    const excessive = Buffer.from(duplicate);
    const end = excessive.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
    excessive.writeUInt16LE(10001, end + 8);
    excessive.writeUInt16LE(10001, end + 10);
    assert.match(await verify(page, excessive), /too many entries/);
  } finally { await page.close(); }
});

test('cancelling verification prevents stale results after reopening', async () => {
  const page = await setup();
  try {
    const { zip } = await fixture(page);
    zip.file('extra.bin', new Uint8Array(2 * 1024 * 1024));
    const bytes = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
    await click(page, '#bv-open');
    await page.locator('#bv-file').setInputFiles({ name: 'cancel.zip', mimeType: 'application/zip', buffer: Buffer.from(bytes) });
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.activeElement.id === 'bv-open');
    await click(page, '#bv-open');
    assert.equal(await page.locator('#bv-status').innerText(), 'Choose a ZIP to verify.');
    assert.equal(await page.locator('#bv-result').innerText(), '');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#full-editor').evaluate(dialog => dialog.open), true);
  } finally { await page.close(); }
});
