import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { snapshot, operations, exportZip, openExample } from './collection-ui.mjs';
import { reveal } from './ui.mjs';

const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE_PATH, args: ['--no-sandbox'] });
test.after(() => browser.close());
const initial = { x: .3, y: .3, w: .3, h: .3 };
const close = (actual, expected) => assert(Math.abs(actual - expected) < .00001, `${actual} != ${expected}`);
async function rect(page, key) {
  return page.locator('#fe-preview .' + key).evaluate(el => ({ x: parseFloat(el.style.left) / 100, y: parseFloat(el.style.top) / 100, w: parseFloat(el.style.width) / 100, h: parseFloat(el.style.height) / 100 }));
}
async function drag(page, key, direction, dx, dy, cancel = false) {
  const root = page.locator('#fe-preview .' + key);
  await root.focus();
  const h = await root.locator('[data-db-direction="' + direction + '"]').boundingBox();
  const slide = await page.locator('#fe-preview .slide').boundingBox();
  await page.keyboard.down('Alt');
  await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2);
  await page.mouse.down();
  await page.mouse.move(h.x + h.width / 2 + dx * slide.width, h.y + h.height / 2 + dy * slide.height, { steps: 4 });
  if (cancel) await page.keyboard.press('Escape');
  await page.mouse.up();
  await page.keyboard.up('Alt');
}
async function setup() {
  const page = await browser.newPage({ acceptDownloads: true, viewport: { width: 1366, height: 768 } });
  await page.goto('file://' + resolve('dist/presentation-studio.html'));
  await page.locator('#open-full-editor').click();
  const id = (await snapshot(page)).state.slides[0].id;
  const result = await operations(page, [{ type: 'block.create', slideId: id, kind: 'text', placement: initial }]);
  assert.equal(result.ok, true, JSON.stringify(result));
  return { page, id, key: result.created[0] };
}

test('eight handles resize only their edges, keep opposite edges anchored and undo atomically at Fit zoom', async () => {
  const { page, id, key } = await setup();
  try {
    const root = page.locator('#fe-preview .' + key);
    await root.focus();
    assert.equal(await root.locator('[data-db-direction]').count(), 8);
    const handle = root.locator('.db-resize');
    assert(Math.abs((await handle.boundingBox()).width - 24) < .1);
    for (const direction of ['se', 's', 'sw', 'w', 'nw', 'n', 'ne', 'e']) {
      await operations(page, [{ type: 'block.place', slideId: id, blockId: key, placement: initial }]);
      const before = await snapshot(page);
      await drag(page, key, direction, -.08, -.07);
      const p = await rect(page, key);
      close(p.x, direction.includes('w') ? .22 : .3);
      close(p.y, direction.includes('n') ? .23 : .3);
      close(p.x + p.w, direction.includes('e') ? .52 : .6);
      close(p.y + p.h, direction.includes('s') ? .53 : .6);
      await page.locator('#fe-undo').click();
      assert.deepEqual((await snapshot(page)).state, before.state);
    }
  } finally { await page.close(); }
});

test('resize cancellation, object lock and Preview preserve state and history', async () => {
  const { page, id, key } = await setup();
  try {
    const before = await exportZip(page);
    const history = bytes => page.evaluate(async data => JSON.parse(await (await JSZip.loadAsync(new Uint8Array(data))).file('presentation.json').async('string')).history, [...bytes]);
    const expected = await snapshot(page), expectedHistory = await history(before);
    await drag(page, key, 'nw', -.1, -.1, true);
    assert.deepEqual(await snapshot(page), expected);
    assert.deepEqual(await history(await exportZip(page)), expectedHistory);
    await operations(page, [{ type: 'design.meta', slideId: id, keys: [key], changes: { locked: true } }]);
    const locked = await snapshot(page);
    await page.locator('#fe-preview .' + key).focus();
    await page.keyboard.press('ArrowRight');
    assert.deepEqual(await snapshot(page), locked);
    assert.equal(await page.locator('#fe-preview .' + key + ' .db-resize').isDisabled(), true);
    await page.locator('#vb-preview-mode').click();
    assert.equal(await page.locator('#fe-preview .db-handle').count(), 0);
    assert.deepEqual(await snapshot(page), locked);
  } finally { await page.close(); }
});

test('north/west resizing clamps to slide bounds and minimums with keyboard focus retained', async () => {
  const { page, key } = await setup();
  try {
    await drag(page, key, 'nw', -1, -1);
    let p = await rect(page, key);
    close(p.x, 0); close(p.y, 0); close(p.w, .6); close(p.h, .6);
    await drag(page, key, 'nw', 1, 1);
    p = await rect(page, key);
    close(p.x, .55); close(p.y, .55); close(p.w, .05); close(p.h, .05);
    await page.locator('#fe-preview .' + key + ' [data-db-direction=w]').press('ArrowLeft');
    close((await rect(page, key)).x, .548);
    assert.equal(await page.evaluate(() => document.activeElement.dataset.dbDirection), 'w');
  } finally { await page.close(); }
});

test('customized template keeps its smaller minimum and content when north/west resized', async () => {
  const { page, errors } = await openExample(browser, 'template');
  try {
    await page.locator('#fe-preview h1').click();
    await reveal(page, '#tp-customize');
    await page.locator('#tp-customize').click();
    const state = (await snapshot(page)).state, id = state.slides[0].id;
    const node = state.slides[0].tree.find(n => n.attrs?.class?.includes('db-template'));
    const key = node.attrs.class.match(/\bblock-[\w-]+/)[0];
    await operations(page, [{ type: 'block.place', slideId: id, blockId: key, placement: initial }]);
    await drag(page, key, 'nw', 1, 1);
    const p = await rect(page, key);
    close(p.w, .005); close(p.h, .005); close(p.x + p.w, .6); close(p.y + p.h, .6);
    const before = await rect(page, key);
    await page.locator('#fe-preview .' + key + ' .db-move').press('ArrowLeft');
    close((await rect(page, key)).w, before.w);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});
