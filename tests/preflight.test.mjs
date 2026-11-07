import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { click } from './ui.mjs';

const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE_PATH, args: ['--no-sandbox'] });
test.after(() => browser.close());
async function setup() {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, acceptDownloads: true });
  await page.goto('file://' + resolve('dist/presentation-studio.html'));
  await page.locator('#open-full-editor').click();
  return page;
}
async function exported(page, selector = '#fe-export-json') {
  const event = page.waitForEvent('download');
  await click(page, selector);
  return readFile(await (await event).path());
}
async function scan(page) {
  await page.locator('#pf-open').click();
  await page.waitForFunction(() => document.querySelector('#pf-summary').textContent.includes('blocker(s)'));
}

test('clean demo preflight is read-only, keyboard accessible, and identifies selected-loop exclusions', async () => {
  const page = await setup();
  try {
    const before = JSON.parse(await exported(page));
    await page.locator('#pf-open').focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelector('#pf-summary').textContent.includes('blocker(s)'));
    assert.equal(await page.locator('#pf-findings [data-severity="blocker"]').count(), 0, await page.locator('#pf-findings').innerText());
    assert.equal(await page.locator('#pf-findings [data-kind="backup"]').count(), 1);
    await page.locator('#pf-loop').selectOption('studio-main');
    await page.waitForFunction(() => !document.querySelector('#pf-scan').disabled);
    assert.match(await page.locator('[data-kind="excluded"]').innerText(), /Questions|question/i);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#full-editor').evaluate(element => element.open), true);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'pf-open');
    assert.deepEqual(JSON.parse(await exported(page)), before);
    await exported(page, '#fe-export');
    await scan(page);
    assert.equal(await page.locator('[data-kind="backup"]').count(), 0);
    await page.locator('#pf-close').click();
    await page.locator('#fe-slide-title').fill('Changed after backup');
    await page.locator('#fe-slide-title').press('Tab');
    await page.waitForTimeout(400);
    await scan(page);
    assert.equal(await page.locator('[data-kind="backup"]').count(), 1);
    await page.keyboard.press('Control+z');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#fe-slide-title').inputValue(), 'Changed after backup');
  } finally { await page.close(); }
});

test('synthetic missing media, recovery assets, overflow, visibility and video findings have direct actions', async () => {
  const page = await setup();
  try {
    const pack = JSON.parse(await readFile('templates/studio/presentation.json', 'utf8'));
    pack.meta.id = 'preflight-fixture';
    pack.state.slides[0].tree = [{ tag: 'div', attrs: {}, children: [{ tag: 'h1', attrs: {}, children: [{ text: 'Overflow '.repeat(160) }] }] }];
    pack.state.slides[1].hidden = true;
    pack.state.sections.find(section => section.kind === 'qa').hidden = true;
    pack.state.media['studio-media'].src = 'assets/missing.png';
    pack.state.media['studio-closing'] = { kind: 'video', src: 'assets/unsupported.bin', name: 'Unsupported video' };
    const recovery = structuredClone(pack.state);
    recovery.media['studio-media'].src = 'assets/recovery.png';
    pack.checkpoints = [{ id: 'preflight-checkpoint', name: 'Recovery fixture', created: '2026-11-07', state: recovery }];
    await page.locator('#fe-import-file').setInputFiles({ name: 'preflight.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(pack)) });
    if (await page.locator('#fe-confirm').isVisible()) await page.locator('#fe-confirm-accept').click();
    await page.waitForFunction(() => document.querySelector('#fe-title').textContent === 'From idea to presentation');
    const before = JSON.parse(await exported(page));
    await scan(page);
    assert(await page.locator('[data-kind="missing-asset"]').count() >= 3);
    assert.match(await page.locator('#pf-findings').innerText(), /assets\/recovery.png/);
    assert(await page.locator('[data-kind="overflow"]').count() >= 1);
    assert.equal(await page.locator('[data-kind="visibility"]').count(), 2);
    assert.match(await page.locator('[data-kind="visibility"]').last().innerText(), /hidden section/);
    assert.equal(await page.locator('[data-kind="video"][data-severity="advisory"]').count(), 1);
    assert.match(await page.locator('[data-kind="video"]').innerText(), /does not verify/);
    await mkdir('test-results', { recursive: true });
    await page.screenshot({ path: 'test-results/preflight.png' });
    await page.locator('[data-kind="overflow"] button').first().click();
    assert.equal(await page.locator('#fe-slide-title').inputValue(), pack.state.slides[0].title);
    assert.deepEqual(JSON.parse(await exported(page)), before);
    await scan(page);
    await page.locator('[data-kind="missing-asset"]').filter({ hasText: 'assets/recovery.png' }).getByRole('button').click();
    assert.equal(await page.locator('#we-settings').evaluate(element => element.open), true);
    assert.equal(await page.getByRole('tab', { name: 'Recovery & reset' }).getAttribute('aria-selected'), 'true');
  } finally { await page.close(); }
});
