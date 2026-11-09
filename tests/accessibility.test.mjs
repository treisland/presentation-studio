import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { readFile } from 'node:fs/promises';

const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE_PATH, args: ['--no-sandbox'] });
test.after(() => browser.close());
async function reach(page, selector) {
  for (let step = 0; step < 180; step++) {
    if (await page.locator(selector).evaluate(element => document.activeElement === element)) return;
    await page.keyboard.press('Tab');
  }
  throw new Error('Cannot reach by Tab: ' + selector);
}
async function openExport(page) {
  for (const id of ['hub-project-menu', 'hub-export-menu']) {
    if (await page.locator('#' + id).getAttribute('open') === null) {
      await reach(page, '#' + id + '>summary');
      await page.keyboard.press('Enter');
    }
  }
}
async function keyboardDownload(page, selector) {
  await openExport(page);
  await reach(page, selector);
  const event = page.waitForEvent('download');
  await page.keyboard.press('Enter');
  return readFile(await (await event).path());
}

test('keyboard authoring edits, reorders, undoes, exports, verifies backups and navigates named settings', async (testContext) => {
  testContext.diagnostic(`${process.platform}/${process.arch}; browser ${browser.version()}; keyboard workflow; file URLs`);
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, acceptDownloads: true });
  try {
    await page.goto('file://' + resolve('dist/presentation-studio.html'));
    await page.keyboard.press('j');
    await page.waitForFunction(() => document.querySelector('#full-editor').open);
    // Canvas focus now follows selection; explicitly choose slide settings before editing its title.
    await reach(page, '#ic-slide-settings');
    await page.keyboard.press('Enter');
    await reach(page, '#fe-slide-title');
    await page.keyboard.press('Control+a');
    await page.keyboard.type('Keyboard authored presentation');
    await page.keyboard.press('Tab');
    await page.waitForFunction(() => document.querySelector('#fe-status').dataset.saveState === 'saved');
    assert.equal(await page.getByRole('button', { name: 'Move selected slide down', exact: true }).count(), 1);
    await reach(page, '#fe-down');
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('.fe-slide-button').nth(1).getAttribute('aria-current'), 'true');
    await page.keyboard.press('Control+z');
    assert.equal(await page.locator('.fe-slide-button').first().getAttribute('aria-current'), 'true');
    const editable = await keyboardDownload(page, '#fe-export');
    const pack = JSON.parse(await keyboardDownload(page, '#fe-export-json'));
    assert.equal(pack.state.slides[0].title, 'Keyboard authored presentation');
    await openExport(page);
    await reach(page, '#bv-open');
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'bv-file');
    await page.locator('#bv-file').setInputFiles({ name: 'keyboard.zip', mimeType: 'application/zip', buffer: editable });
    await page.waitForFunction(() => document.querySelector('#bv-status').textContent.includes('checks passed'));
    for (const key of ['Shift+Tab', 'Shift+Tab', 'Tab', 'Tab', 'Tab']) {
      await page.keyboard.press(key);
      assert(await page.evaluate(() => !!document.activeElement.closest('#bv-dialog')));
    }
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.activeElement.id === 'bv-open');
    await reach(page, '#we-settings-open');
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'we-settings-close');
    await reach(page, '[data-fe-tab="brand"]');
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.getByRole('tabpanel', { name: 'Presentation settings', exact: true }).isVisible(), true);
    await page.keyboard.press('Escape');
    await reach(page, '#pf-open');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelector('#pf-summary').textContent.includes('blocker(s)'));
    for (let step = 0; step < 10; step++) {
      await page.keyboard.press('Tab');
      assert(await page.evaluate(() => !!document.activeElement.closest('#pf-dialog')));
    }
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.activeElement.id === 'pf-open');
    const activeTabName = await page.locator('#wp-tabs [role="tab"][aria-selected="true"]').innerText();
    assert.equal(await page.getByRole('tabpanel', { name: activeTabName, exact: true }).isVisible(), true);
    const after = JSON.parse(await keyboardDownload(page, '#fe-export-json'));
    assert.deepEqual(after, pack);
  } finally { await page.close(); }
});

test('keyboard slide creation and clean-profile ZIP import retain editable content', async () => {
  const page = await browser.newPage({ acceptDownloads: true });
  const imported = await browser.newPage({ acceptDownloads: true });
  try {
    await page.goto('file://' + resolve('dist/presentation-studio-blank.html'));
    await page.keyboard.press('j');
    await reach(page, '#studio-gallery-open');
    await page.keyboard.press('Enter');
    await reach(page, '[data-template="table"]');
    await page.keyboard.press('Enter');
    await reach(page, '#studio-gallery-apply');
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('.fe-slide-button').count(), 2);
    const bytes = await keyboardDownload(page, '#fe-export');
    await imported.goto('file://' + resolve('dist/presentation-studio-blank.html'));
    await imported.keyboard.press('p');
    await reach(imported, '#hub-open-file');
    // Verify keyboard activation in the DOM, then supply the OS-selected bytes.
    // Native chooser interception is not a reliable headless Windows boundary.
    await imported.locator('#hub-file').evaluate(input => {
      input.addEventListener('click', event => {
        event.preventDefault();
        input.dataset.keyboardRequested = String(
          document.activeElement.id === 'hub-open-file' && navigator.userActivation.isActive,
        );
      }, { once: true });
    });
    await imported.keyboard.press('Enter');
    await imported.waitForFunction(() => document.querySelector('#hub-file').dataset.keyboardRequested === 'true');
    await imported.locator('#hub-file').setInputFiles({ name: 'keyboard-import.zip', mimeType: 'application/zip', buffer: bytes });
    await imported.waitForFunction(() => document.querySelector('#fe-status').dataset.saveState === 'saved');
    await reach(imported, '#open-full-editor');
    await imported.keyboard.press('Enter');
    const pack = JSON.parse(await keyboardDownload(imported, '#fe-export-json'));
    assert.equal(pack.state.slides.length, 2);
    assert(pack.state.slides.some(slide => slide.template === 'table'));
  } finally { await page.close(); await imported.close(); }
});
