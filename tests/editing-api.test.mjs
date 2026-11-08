import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { resolve, dirname } from 'node:path';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { click } from './ui.mjs';
import { archivePath } from './archive-path.mjs';
import { legacyHTML } from './legacy-fixture.mjs';
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE_PATH, args: ['--no-sandbox'] });
test.after(() => browser.close());
async function setup() {
  const page = await browser.newPage({ acceptDownloads: true });
  await page.goto('file://' + resolve('dist/presentation-studio.html'));
  await page.locator('#open-full-editor').click();
  return page;
}
const read = page => page.evaluate(() => window.presentationStudioEditing.read());
async function apply(page, operations, snapshot) {
  snapshot ||= await read(page);
  return page.evaluate(({ operations, snapshot }) => window.presentationStudioEditing.apply({ apiVersion: 1,
    projectId: snapshot.projectId, expectedRevision: snapshot.revision, operations }), { operations, snapshot });
}
async function pack(page) {
  const download = page.waitForEvent('download');
  await click(page, '#fe-export-json');
  return JSON.parse(await readFile(await (await download).path(), 'utf8'));
}
test('shared API batches metadata and placement in one undo step with a pre-change checkpoint', async () => {
  const page = await setup();
  try {
    const initial = await read(page), before = await pack(page);
    await page.evaluate(() => { const copy = window.presentationStudioEditing.read(); copy.state.slides[0].title = 'Mutated copy'; });
    assert.deepEqual((await read(page)).state, initial.state);
    const result = await apply(page, [
      { type: 'slide.update', slideId: 'studio-welcome', changes: { title: 'API authored', notes: 'Review notes', duration: 25 } },
      { type: 'media.place', slideId: 'studio-media', placement: { x: 0.2, y: 0.2, w: 0.4, h: 0.4 } },
    ]);
    assert.equal(result.ok, true);
    const after = await pack(page);
    assert.equal(after.history.past.length, before.history.past.length + 1);
    assert.equal(after.checkpoints.length, before.checkpoints.length + 1);
    assert.deepEqual(after.checkpoints.at(-1).state, before.state);
    await page.locator('#fe-undo').click();
    assert.deepEqual((await read(page)).state, before.state);
    assert.equal((await apply(page, [{ type: 'slide.update', slideId: 'studio-welcome', changes: { title: 'Stale' } }], initial)).code, 'CONFLICT');
    await page.locator('#fe-redo').click();
    assert.deepEqual((await read(page)).state, after.state);
  } finally { await page.close(); }
});
test('partial failure, cancellation, locks and stale UI edits leave batches unapplied', async () => {
  const page = await setup();
  try {
    const snapshot = await read(page), before = await pack(page);
    const create = { type: 'slide.create', slideId: 'slide-api-test', sectionId: snapshot.state.sections[0].id, template: 'hero', title: 'Created' };
    assert.equal((await apply(page, [create, { type: 'unknown' }])).ok, false);
    assert.deepEqual(await pack(page), before);
    const cancelled = await page.evaluate(snapshot => {
      const controller = new AbortController(); controller.abort();
      return window.presentationStudioEditing.apply({ apiVersion: 1, projectId: snapshot.projectId,
        expectedRevision: snapshot.revision, operations: [] }, { signal: controller.signal });
    }, await read(page));
    assert.equal(cancelled.code, 'CANCELLED');
    assert.deepEqual(await pack(page), before);
    await page.locator('#ce-slide-lock').click();
    const locked = await pack(page);
    assert.equal((await apply(page, [{ type: 'slide.update', slideId: 'studio-welcome', changes: { title: 'Forbidden' } }])).code, 'LOCKED');
    assert.deepEqual(await pack(page), locked);
    await page.locator('#ce-slide-lock').click();
    const stale = await read(page);
    await page.locator('#fe-slide-title').fill('UI edit');
    await page.waitForTimeout(400);
    assert.equal((await apply(page, [create], stale)).code, 'CONFLICT');
    assert.equal((await read(page)).state.slides.some(s => s.id === create.slideId), false);
    assert.equal((await apply(page, [{ type: 'media.place', slideId: 'studio-media', placement: { x: 0.9, y: 0, w: 0.4, h: 0.4 } }])).code, 'INVALID');
    await page.locator('.fe-slide-button[data-slide-id="studio-media"]').click();
    await page.locator('#we-context-media').click();
    await page.locator('#ce-object-lock').click();
    const lockedObject = await pack(page);
    assert.equal((await apply(page, [{ type: 'media.place', slideId: 'studio-media', placement: { x: 0.1, y: 0.1, w: 0.4, h: 0.4 } }])).code, 'LOCKED');
    assert.deepEqual(await pack(page), lockedObject);
    await page.locator('#ce-object-lock').click();
    await page.locator('#ce-project-lock').click();
    assert.equal((await apply(page, [create])).code, 'LOCKED');
  } finally { await page.close(); }
});
test('created slide IDs, checkpoints and media survive editable and playback ZIP validation', async () => {
  const page = await setup();
  try {
    const snapshot = await read(page);
    assert.equal((await apply(page, [{ type: 'slide.create', slideId: 'slide-api-roundtrip', sectionId: snapshot.state.sections[0].id,
      template: 'table', title: 'API table' }])).ok, true);
    for (const selector of ['#fe-export', '#fe-playback']) {
      const download = page.waitForEvent('download'); await click(page, selector);
      const bytes = await readFile(await (await download).path());
      const validation = await page.evaluate(async data => {
        const zip = await JSZip.loadAsync(new Uint8Array(data));
        const pack = JSON.parse(await zip.file('presentation.json').async('string'));
        const entries = [];
        for (const entry of Object.values(zip.files)) if (!entry.dir)
          entries.push({ name: entry.name, bytes: await entry.async('base64') });
        return { pack, mediaPresent: !!zip.file('assets/studio-demo-workflow.svg'), entries };
      }, [...bytes]);
      assert(validation.pack.state.slides.some(s => s.id === 'slide-api-roundtrip' && s.title === 'API table'));
      assert(validation.mediaPresent);
      if (selector === '#fe-export') assert(validation.pack.checkpoints.length);
      else assert.equal(validation.pack.checkpoints.length, 0);
      const directory = resolve('test-results', 'api-' + (selector === '#fe-export' ? 'editable' : 'playback'));
      for (const entry of validation.entries) {
        const file = archivePath(directory, entry.name);
        await mkdir(dirname(file), { recursive: true });
        await writeFile(file, Buffer.from(entry.bytes, 'base64'));
      }
      const reopened = await browser.newPage();
      try {
        await reopened.route('http://**/*', route => route.abort());
        await reopened.route('https://**/*', route => route.abort());
        await reopened.goto('file://' + resolve(directory, 'index.html'));
        if (selector === '#fe-export') {
          await reopened.locator('#open-full-editor').click();
          assert((await read(reopened)).state.slides.some(s => s.id === 'slide-api-roundtrip'));
        } else {
          assert.equal(await reopened.locator('body').evaluate(el => el.classList.contains('playback-only')), true);
          assert.equal(await reopened.evaluate(() => { try { window.presentationStudioEditing.read(); return false; } catch (e) { return e.code === 'READ_ONLY'; } }), true);
        }
      } finally { await reopened.close(); }
    }
  } finally { await page.close(); }
});
test('commit interruption rolls back state/history/checkpoints and legacy slides retain IDs', async () => {
  const page = await setup();
  try {
    const before = await pack(page);
    await page.evaluate(() => {
      const node = document.querySelector('#fe-status'), property = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent');
      let fail = true;
      Object.defineProperty(node, 'textContent', { configurable: true, get() { return property.get.call(this); },
        set(value) { if (fail) { fail = false; throw new Error('Synthetic render interruption'); } property.set.call(this, value); } });
    });
    const failed = await apply(page, [{ type: 'slide.update', slideId: 'studio-welcome', changes: { title: 'Must roll back' } }]);
    assert.equal(failed.code, 'COMMIT_FAILED');
    await page.evaluate(() => delete document.querySelector('#fe-status').textContent);
    assert.deepEqual(await pack(page), before);
    await page.goto('file://' + await legacyHTML(resolve('.')));
    await page.locator('#open-full-editor').click();
    const legacy = await read(page), ids = legacy.state.slides.map(s => s.id);
    assert.equal((await apply(page, [{ type: 'slide.update', slideId: ids[0], changes: { title: 'Legacy API edit' } }])).ok, true);
    assert.deepEqual((await read(page)).state.slides.map(s => s.id), ids);
    await page.locator('#fe-undo').click();
    assert.deepEqual((await read(page)).state, legacy.state);
  } finally { await page.close(); }
});
