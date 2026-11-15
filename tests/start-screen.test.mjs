import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { click } from './ui.mjs';
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE_PATH, args: ['--no-sandbox'] });
test.after(() => browser.close());
const url = 'file://' + resolve('dist/presentation-studio.html');
await mkdir('test-results', { recursive: true });
async function open(width = 1366) {
  const page = await browser.newPage({ viewport: { width, height: 900 }, acceptDownloads: true });
  page.setDefaultTimeout(10000);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(url); await page.locator('#ss-screen').waitFor({ state: 'visible' });
  await page.locator('#ss-recents .ss-empty').waitFor();
  return { page, errors };
}
async function fileStart(page) { await click(page, '#ss-menu'); await page.locator('#ss-screen').waitFor({ state: 'visible' }); }
async function storedDraft(page, id) {
  return page.evaluate(async id => {
    const db = await new Promise((resolve, reject) => { const request = indexedDB.open('presentation-studio-editor-v1', 1); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    try {
      const tx = db.transaction(['projects', 'assets'], 'readonly');
      const read = request => new Promise((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
      const [record, keys, blobs] = await Promise.all([read(tx.objectStore('projects').get(id)), read(tx.objectStore('assets').getAllKeys()), read(tx.objectStore('assets').getAll())]);
      const assets = await Promise.all(keys.flatMap((key, index) => String(key).startsWith(id + '|') ? [(async () => [key, Array.from(new Uint8Array(await blobs[index].arrayBuffer()))])()] : []));
      return { record, assets };
    } finally { db.close(); }
  }, id);
}
async function pendingRecovery(page) {
  await page.locator('#ss-current').click();
  const id = await page.evaluate(() => {
    const api = window.presentationStudioEditing, s = api.read();
    const result = api.apply({ apiVersion: 1, projectId: s.projectId, expectedRevision: s.revision, operations: [{ type: 'slide.update', slideId: s.state.slides[0].id, changes: { title: 'Recovery must survive this switch' } }] });
    if (!result.ok) throw Error(JSON.stringify(result));
    return s.projectId;
  });
  await page.waitForFunction(() => document.getElementById('fe-status').dataset.saveState === 'saved');
  const saved = await storedDraft(page, id);
  await fileStart(page); await page.locator('#ss-startup').selectOption('blank');
  await page.reload(); await page.locator('#ss-screen').waitFor({ state: 'visible' });
  await page.waitForFunction(() => document.getElementById('ss-current').textContent.includes('recovery'));
  return { id, saved };
}
test('first visit, empty state, navigation, theme and narrow layout preserve project identity and history', async () => {
  const { page, errors } = await open();
  try {
    assert.match(await page.locator('#ss-recents').textContent(), /A fresh start/);
    const before = await page.evaluate(() => window.presentationStudioEditing.read());
    await page.locator('#ss-appearance').selectOption('dark');
    assert.equal(await page.locator('body').evaluate(el => el.classList.contains('editor-dark')), true);
    await page.screenshot({ path: 'test-results/start-screen-dark.png' });
    await page.locator('#ss-appearance').selectOption('light');
    await page.screenshot({ path: 'test-results/start-screen-light.png' });
    for (const width of [768, 390]) {
      await page.setViewportSize({ width, height: 844 });
      assert.equal(await page.locator('#ss-screen').evaluate(el => el.scrollWidth <= el.clientWidth), true);
      await page.locator('#ss-startup').focus(); await page.keyboard.press('Tab');
      assert.equal(await page.locator('#ss-appearance').evaluate(el => el === document.activeElement), true);
    }
    await page.screenshot({ path: 'test-results/start-screen-narrow.png' });
    await page.keyboard.press('Escape'); await page.locator('#full-editor').waitFor({ state: 'visible' });
    await fileStart(page);
    assert.deepEqual(await page.evaluate(() => window.presentationStudioEditing.read()), before);
    assert.equal(await page.locator('#ss-recents .ss-recent').count(), 0);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});
test('blank creation, recents and resume retain content and editable export reopens directly offline', async () => {
  const { page, errors } = await open();
  try {
    await page.locator('#ss-blank').click(); await page.locator('#full-editor').waitFor({ state: 'visible' });
    const created = await page.evaluate(() => window.presentationStudioEditing.read());
    assert.equal(created.state.slides[0].tree.length, 0);
    assert.notEqual(created.projectId, 'presentation-studio-demo-v1');
    await page.waitForFunction(() => document.getElementById('fe-status').dataset.saveState === 'saved');
    await fileStart(page);
    await page.locator('#ss-recents .ss-recent').filter({ hasText: 'Untitled presentation' }).waitFor();
    await page.screenshot({ path: 'test-results/start-screen-recents.png' });
    await page.locator('#ss-startup').selectOption('resume');
    await page.reload(); await page.locator('#full-editor').waitFor({ state: 'visible' });
    assert.equal(await page.evaluate(() => window.presentationStudioEditing.read().projectId), created.projectId);
    assert.equal(await page.locator('#ss-screen').isVisible(), false);
    const download = page.waitForEvent('download'); await click(page, '#fe-export');
    const bytes = await readFile(await (await download).path());
    // The ZIP's embedded HTML carries a disabled generic-entry marker.
    const html = await page.evaluate(async bytes => {
      const zip = await JSZip.loadAsync(new Uint8Array(bytes)); return zip.file('index.html').async('string');
    }, Array.from(bytes));
    assert.match(html, /<script id="studio-entry" type="application\/json">false<\/script>/);
    await writeFile('test-results/start-screen-export.html', html);
    const restored = await browser.newPage();
    try {
      await restored.context().setOffline(true);
      await restored.goto('file://' + resolve('test-results/start-screen-export.html'));
      await restored.locator('#open-full-editor').click();
      assert.equal(await restored.locator('#ss-screen').isVisible(), false);
      assert.equal(await restored.evaluate(() => window.presentationStudioEditing.read().projectId), created.projectId);
    } finally { await restored.close(); }
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});
test('recent switching and start-screen ZIP opening preserve identity; invalid import preserves current work', async () => {
  const { page, errors } = await open();
  try {
    await page.locator('#ss-blank').click();
    await page.waitForFunction(() => document.getElementById('fe-status').dataset.saveState === 'saved');
    const first = await page.evaluate(() => window.presentationStudioEditing.read());
    const download = page.waitForEvent('download'); await click(page, '#fe-export');
    const bytes = await readFile(await (await download).path());
    await fileStart(page); await page.locator('#ss-blank').click();
    await page.waitForFunction(id => window.presentationStudioEditing.read().projectId !== id && document.getElementById('fe-status').dataset.saveState === 'saved', first.projectId);
    await fileStart(page);
    await page.locator('.ss-recent[data-project-id="' + first.projectId + '"]').click();
    await page.locator('#hub-switch').waitFor({ state: 'visible' });
    await page.locator('#hub-cancel-switch').click();
    assert.equal(await page.locator('#ss-screen').isVisible(), true);
    assert.notEqual(await page.evaluate(() => window.presentationStudioEditing.read().projectId), first.projectId);
    await page.locator('.ss-recent[data-project-id="' + first.projectId + '"]').click();
    await page.locator('#hub-save-switch').click();
    await page.locator('#ss-screen').waitFor({ state: 'hidden' });
    assert.equal(await page.evaluate(() => window.presentationStudioEditing.read().projectId), first.projectId);
    await fileStart(page);
    await page.locator('#hub-file').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"unsafe":true}') });
    await page.waitForFunction(() => !document.getElementById('ss-message').textContent.includes('Saved in this browser'));
    assert.equal(await page.locator('#ss-screen').isVisible(), true);
    assert.equal(await page.evaluate(() => window.presentationStudioEditing.read().projectId), first.projectId);
    await page.locator('#hub-file').setInputFiles({ name: 'restored.zip', mimeType: 'application/zip', buffer: bytes });
    await page.locator('#ss-screen').waitFor({ state: 'hidden' });
    assert.equal(await page.evaluate(() => window.presentationStudioEditing.read().projectId), first.projectId);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});
test('picker preference requires a gesture; cancelled picker remains on start screen; missing resume falls back', async () => {
  const { page, errors } = await open();
  try {
    await page.locator('#ss-startup').selectOption('picker'); await page.reload();
    await page.locator('#ss-screen').waitFor({ state: 'visible' });
    await page.waitForFunction(() => document.activeElement?.id === 'ss-open');
    assert.match(await page.locator('#ss-message').textContent(), /requires a click/);
    const chooser = page.waitForEvent('filechooser'); await page.locator('#ss-open').click(); await chooser;
    assert.equal(await page.locator('#ss-screen').isVisible(), true);
    await page.evaluate(() => { localStorage.setItem('presentation-studio-startup', 'resume'); localStorage.setItem('presentation-studio-last-project', 'missing'); });
    await page.reload(); await page.locator('#ss-screen').waitFor({ state: 'visible' });
    await page.waitForFunction(() => document.getElementById('ss-message').textContent.includes('Could not resume'));
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});
test('startup blank creates distinct projects and explicit presentation/editor routes override preferences', async () => {
  const { page, errors } = await open();
  try {
    await page.locator('#ss-startup').selectOption('blank'); await page.reload();
    await page.locator('#full-editor').waitFor({ state: 'visible' });
    const first = await page.evaluate(() => window.presentationStudioEditing.read().projectId);
    await page.waitForFunction(() => document.getElementById('fe-status').dataset.saveState === 'saved');
    await page.reload(); await page.locator('#full-editor').waitFor({ state: 'visible' });
    assert.notEqual(await page.evaluate(() => window.presentationStudioEditing.read().projectId), first);
    await page.goto(url + '?start=editor'); await page.locator('#full-editor').waitFor({ state: 'visible' });
    assert.equal(await page.evaluate(() => window.presentationStudioEditing.read().projectId), 'presentation-studio-demo-v1');
    await page.goto(url + '?start=present'); await page.locator('#open-full-editor').click();
    assert.equal(await page.locator('#ss-screen').isVisible(), false);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});
test('examples and templates use existing gallery and guarded project creation', async () => {
  const { page, errors } = await open();
  try {
    await page.locator('#ss-template').click(); await page.locator('#lc-examples').waitFor({ state: 'visible' });
    await page.locator('#lc-examples-close').click();
    assert.equal(await page.locator('#ss-screen').isVisible(), true);
    await page.locator('#ss-example').click(); await page.locator('#lc-examples').waitFor({ state: 'visible' });
    await page.locator('#lc-use-demo').click();
    await page.locator('#nx-wizard').waitFor({ state: 'visible' });
    await page.locator('#nx-wizard-defaults').click();
    await page.locator('#full-editor').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#ss-screen').isVisible(), false);
    assert.notEqual(await page.evaluate(() => window.presentationStudioEditing.read().projectId), 'presentation-studio-demo-v1');
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});
test('storage failure and recovery take precedence over automatic startup', async () => {
  const { page, errors } = await open();
  try {
    await page.locator('#ss-current').click();
    await page.locator('#fe-preview .slide').waitFor();
    // Persist a real edited bundled project, then force blank startup.
    await page.evaluate(() => { const api = window.presentationStudioEditing, s = api.read(); return api.apply({ apiVersion: 1, projectId: s.projectId, expectedRevision: s.revision, operations: [{ type: 'slide.update', slideId: s.state.slides[0].id, changes: { title: 'Recovered title' } }] }); });
    await page.waitForFunction(() => document.getElementById('fe-status').dataset.saveState === 'saved');
    await fileStart(page); await page.locator('#ss-startup').selectOption('blank');
    await page.reload(); await page.locator('#ss-screen').waitFor({ state: 'visible' });
    await page.waitForFunction(() => document.getElementById('ss-current').textContent.includes('recovery'));
    await page.locator('#ss-current').click();
    assert.equal(await page.locator('#fe-recovery').isVisible(), true);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
  const blocked = await browser.newPage();
  try {
    await blocked.addInitScript(() => { Storage.prototype.getItem = () => { throw Error('blocked'); }; Storage.prototype.setItem = () => { throw Error('blocked'); }; });
    await blocked.goto(url); await blocked.locator('#ss-screen').waitFor({ state: 'visible' });
    await blocked.locator('#ss-startup').selectOption('resume');
    assert.match(await blocked.locator('#ss-message').textContent(), /could not save/);
  } finally { await blocked.close(); }
  const noDatabase = await browser.newPage();
  try {
    await noDatabase.addInitScript(() => { localStorage.setItem('presentation-studio-startup', 'blank'); IDBFactory.prototype.open = () => { throw Error('Database blocked'); }; });
    await noDatabase.goto(url); await noDatabase.locator('#ss-screen').waitFor({ state: 'visible' });
    await noDatabase.waitForFunction(() => document.getElementById('ss-message').textContent.includes('automatic draft'));
    assert.equal(await noDatabase.evaluate(() => window.presentationStudioEditing.read().projectId), 'presentation-studio-demo-v1');
  } finally { await noDatabase.close(); }
});
test('blank creation from an already-open recovery editor clears the recovery banner and restores editing', async () => {
  const { page, errors } = await open();
  try {
    const { id, saved } = await pendingRecovery(page);
    await page.locator('#ss-current').click();
    assert.equal(await page.locator('#fe-recovery').isVisible(), true);
    await fileStart(page); await page.locator('#ss-blank').click();
    await page.locator('#ss-screen').waitFor({ state: 'hidden' });
    assert.equal(await page.locator('#fe-recovery').isVisible(), false);
    for (const selector of ['.fe-work', '.fe-sidebar', '#we-inspector'])
      assert.equal(await page.locator(selector).evaluate(element => element.inert), false);
    await click(page, '#studio-gallery-open');
    await page.locator('#studio-gallery').waitFor({ state: 'visible' });
    assert.deepEqual(await storedDraft(page, id), saved);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});
for (const action of ['blank', 'template', 'example', 'recent', 'file']) test(`pending recovery allows explicit ${action} and preserves its stored project and asset bytes`, async () => {
  const { page, errors } = await open();
  try {
    const { id, saved } = await pendingRecovery(page);
    assert(saved.assets.length > 0, 'Fixture includes real recovery media');
    if (action === 'blank') await page.locator('#ss-blank').click();
    if (action === 'template' || action === 'example') {
      await page.locator(action === 'template' ? '#ss-template' : '#ss-example').click();
      await page.locator('#lc-examples').waitFor({ state: 'visible' });
      if (action === 'template') await page.locator('[data-example="portfolio"] button').click();
      await page.locator(action === 'template' ? '#lc-use-starter' : '#lc-use-demo').click();
      await page.locator('#nx-wizard').waitFor({ state: 'visible' });
      await page.locator('#nx-wizard-defaults').click();
    }
    if (action === 'recent') await page.locator('.ss-recent[data-project-id="' + id + '"]').click();
    if (action === 'file') {
      const pack = JSON.parse(await readFile('templates/blank/presentation.json', 'utf8'));
      pack.meta.id = 'recovery-independent-import';
      const chooser = page.waitForEvent('filechooser'); await page.locator('#ss-open').click();
      await (await chooser).setFiles({ name: 'other.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(pack)) });
    }
    await page.locator('#ss-screen').waitFor({ state: 'hidden' });
    await page.locator('#full-editor').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#fe-recovery').isVisible(), false);
    const current = await page.evaluate(() => window.presentationStudioEditing.read());
    if (action === 'recent') {
      assert.equal(current.projectId, id);
      assert.equal(current.state.slides[0].title, 'Recovery must survive this switch');
    } else assert.notEqual(current.projectId, id);
    assert.deepEqual(await storedDraft(page, id), saved);
    await fileStart(page);
    await page.locator('.ss-recent[data-project-id="' + id + '"]').waitFor();
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});
test('cancelled setup and invalid file leave pending recovery available without changing stored bytes', async () => {
  const { page, errors } = await open();
  try {
    const { id, saved } = await pendingRecovery(page);
    await page.locator('#ss-template').click(); await page.locator('#lc-examples-close').click();
    await page.locator('#ss-example').click(); await page.locator('#lc-use-demo').click();
    await page.locator('#nx-wizard-close').click();
    await page.locator('#hub-file').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{}') });
    await page.waitForFunction(() => document.getElementById('ss-message').textContent !== '' && !document.getElementById('ss-message').textContent.includes('recovery draft is available'));
    assert.equal(await page.locator('#ss-screen').isVisible(), true);
    assert.deepEqual(await storedDraft(page, id), saved);
    await page.locator('#ss-current').click();
    assert.equal(await page.locator('#fe-recovery').isVisible(), true);
    await page.locator('#fe-recover').click();
    await page.locator('#fe-recovery').waitFor({ state: 'hidden' });
    assert.equal(await page.evaluate(() => window.presentationStudioEditing.read().state.slides[0].title), 'Recovery must survive this switch');
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});
test('opening a same-ID file with pending recovery keeps the recovery content and media as a previous local version', async () => {
  const { page, errors } = await open();
  try {
    const { id, saved } = await pendingRecovery(page);
    const incoming = structuredClone(saved.record.pack);
    incoming.state.slides[0].title = 'Explicitly opened file content';
    await page.locator('#hub-file').setInputFiles({ name: 'same-id.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(incoming)) });
    await page.locator('#ss-screen').waitFor({ state: 'hidden' });
    assert.equal(await page.evaluate(() => window.presentationStudioEditing.read().state.slides[0].title), 'Explicitly opened file content');
    await fileStart(page);
    const previous = page.locator('.ss-recent').filter({ hasText: '(previous local version)' });
    await previous.waitFor();
    const backupID = await previous.getAttribute('data-project-id');
    assert.notEqual(backupID, id);
    const backup = await storedDraft(page, backupID);
    assert.deepEqual(backup.record.pack.state.slides, saved.record.pack.state.slides);
    assert.deepEqual(backup.record.pack.history, saved.record.pack.history);
    assert.deepEqual(backup.record.pack.checkpoints, saved.record.pack.checkpoints);
    assert.deepEqual(backup.assets.map(([key, bytes]) => [key.slice(backupID.length), bytes]), saved.assets.map(([key, bytes]) => [key.slice(id.length), bytes]));
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});
