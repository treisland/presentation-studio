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
const read = p => p.evaluate(() => window.presentationStudioEditing.read());
const blocks = state => state.slides.flatMap(s => s.tree.filter(n => /\bdb-block\b/.test(n.attrs?.class || '')));
const idOf = node => node.attrs.class.match(/\bblock-[\w-]+\b/)[0];
async function setup(legacy = false) {
  const p = await browser.newPage({ acceptDownloads: true, viewport: { width: 1366, height: 768 } });
  await p.goto('file://' + (legacy ? await legacyHTML(resolve('.')) : resolve('dist/presentation-studio.html')));
  await p.locator('#open-full-editor').click(); return p;
}
async function add(p, kind) {
  if (await p.locator('#db-palette').getAttribute('open') === null) await p.locator('#db-palette > summary').press('Enter');
  await p.locator('[data-db-kind="' + kind + '"]').press('Enter');
  return (await read(p)).state;
}
async function pack(p) {
  const d = p.waitForEvent('download'); await click(p, '#fe-export-json');
  return JSON.parse(await readFile(await (await d).path(), 'utf8'));
}
test('palette and keyboard arrangement preserve original content and unique IDs with undo', async () => {
  const p = await setup();
  try {
    const original = await read(p), before = await pack(p);
    for (const kind of ['text', 'rectangle', 'circle', 'callout']) await add(p, kind);
    const created = await read(p);
    assert.deepEqual(created.state.slides[0].tree.slice(0, original.state.slides[0].tree.length), original.state.slides[0].tree);
    assert.deepEqual(created.state.slides.map(s => s.id), original.state.slides.map(s => s.id));
    assert.equal(blocks(created.state).length, 4);
    const appearance = await p.locator('#fe-preview .db-block').evaluateAll(nodes => nodes.map(n => ({ background: getComputedStyle(n).backgroundColor, color: getComputedStyle(n).color, text: getComputedStyle(n.querySelector('p')).color, border: getComputedStyle(n).borderLeftColor })));
    assert.equal(appearance[0].background, 'rgba(0, 0, 0, 0)');
    assert.equal(appearance[1].background, appearance[3].border);
    assert.equal(appearance[1].background, appearance[2].background);
    assert.notEqual(appearance[1].background, appearance[3].background);
    assert.equal(appearance[1].text, appearance[1].color);
    assert.equal(appearance[2].text, appearance[2].color);
    const node = blocks(created.state).at(-1), id = idOf(node);
    const root = p.locator('#fe-preview .' + id);
    await root.focus(); await p.keyboard.press('ArrowLeft');
    assert.notEqual(blocks((await read(p)).state).at(-1).attrs.style, node.attrs.style);
    await p.locator('#fe-undo').click();
    assert.equal(blocks((await read(p)).state).at(-1).attrs.style, node.attrs.style);
    await p.locator('#db-palette > summary').press('Enter');
    await p.locator('[data-db-kind=text]').press('Escape');
    assert.equal(await p.locator('#db-palette').getAttribute('open'), null);
    assert.equal(await p.locator('#full-editor').evaluate(el => el.open), true);
    const resize = p.locator('#fe-preview .' + id + ' .db-resize');
    await resize.focus(); await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowRight');
    assert.equal(await p.evaluate(() => document.activeElement.dataset.dbDrag), 'resize');
    await p.locator('#db-w').fill('40'); await p.locator('#db-w').press('Tab');
    await p.locator('#db-layer').fill('8'); await p.locator('#db-layer').press('Tab');
    await p.locator('#db-align').selectOption('Center');
    const arranged = blocks((await read(p)).state).at(-1);
    assert(arranged.attrs.style.includes('width:40%'));
    assert(arranged.attrs.style.includes('left:30%'));
    assert(arranged.attrs.style.includes('z-index:8'));
    await p.locator('#db-duplicate').press('Enter');
    const duplicated = blocks((await read(p)).state);
    assert.equal(new Set(duplicated.map(idOf)).size, 5);
    await p.locator('#fe-undo').click();
    assert.equal(blocks((await read(p)).state).length, 4);
    assert((await pack(p)).history.past.length > before.history.past.length);
    await p.locator('#ce-slide-lock').click();
    const locked = await pack(p);
    await add(p, 'text');
    assert.deepEqual(await pack(p), locked);
  } finally { await p.close(); }
});
test('scaled pointer placement previews/cancels safely and commits one undo entry with snapping', async () => {
  const p = await setup();
  try {
    await p.locator('.fe-slide-button[data-slide-id="studio-media"]').click();
    await add(p, 'text');
    const original = await pack(p), node = blocks(original.state)[0], id = idOf(node);
    await p.locator('#we-zoom').selectOption('0.5');
    const handle = p.locator('#fe-preview .' + id + ' .db-move');
    const rect = await handle.boundingBox();
    const stage = await p.locator('#fe-preview .slide').boundingBox();
    const drag = async (dx, cancel = false) => {
      const h = await handle.boundingBox();
      await p.mouse.move(h.x+h.width/2, h.y+h.height/2); await p.mouse.down();
      await p.mouse.move(h.x+h.width/2+dx, h.y+h.height/2, { steps: 4 });
      if (cancel) await p.keyboard.press('Escape');
      await p.mouse.up();
    };
    assert(rect && stage);
    await drag(-35, true);
    assert.deepEqual(await pack(p), original);
    await drag(-stage.width * 0.195);
    const moved = await pack(p), changed = blocks(moved.state)[0];
    assert(Math.abs(parseFloat(changed.attrs.style.match(/left:([\d.]+)%/)[1])-35) < 0.1);
    assert.equal(moved.history.past.length, original.history.past.length + 1);
    const bounds = await p.locator('#fe-preview .' + id).boundingBox();
    assert(Math.abs((bounds.x-stage.x)/stage.width-0.35) < 0.01, 'Block stays slide-relative with structured media');
    await p.locator('#fe-undo').click();
    assert.deepEqual((await read(p)).state, original.state);
    assert.deepEqual((await read(p)).state.media, original.state.media);
  } finally { await p.close(); }
});
test('legacy projects retain block placement/content through editable and playback offline reopening', async () => {
  const p = await setup(true);
  try {
    const original = await read(p);
    await add(p, 'callout');
    const edited = await read(p), node = blocks(edited.state)[0], id = idOf(node);
    assert.deepEqual(edited.state.slides.map(s => s.id), original.state.slides.map(s => s.id));
    for (const selector of ['#fe-export', '#fe-playback']) {
      const d = p.waitForEvent('download'); await click(p, selector);
      const bytes = await readFile(await (await d).path());
      const entries = await p.evaluate(async data => {
        const zip = await JSZip.loadAsync(new Uint8Array(data)), result = [];
        for (const file of Object.values(zip.files)) if (!file.dir) result.push({ name: file.name, bytes: await file.async('base64') });
        return result;
      }, [...bytes]);
      const folder = resolve('test-results/blocks-' + (selector === '#fe-export' ? 'editable' : 'playback'));
      for (const entry of entries) { const file = archivePath(folder, entry.name); await mkdir(dirname(file), { recursive: true }); await writeFile(file, Buffer.from(entry.bytes, 'base64')); }
      const reopened = await browser.newPage();
      try {
        await reopened.context().setOffline(true); await reopened.goto('file://' + resolve(folder, 'index.html'));
        assert.equal(await reopened.locator('#stage .' + id).count(), 1);
        assert.equal(await reopened.locator('#stage .' + id + ' .db-handle').count(), 0);
        if (selector === '#fe-export') {
          await reopened.locator('#open-full-editor').click();
          assert.equal(blocks((await read(reopened)).state)[0].attrs.style, node.attrs.style);
          await reopened.locator('#fe-undo').click();
          assert.equal(blocks((await read(reopened)).state).length, 0);
        }
      } finally { await reopened.close(); }
    }
  } finally { await p.close(); }
});
