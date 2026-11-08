import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import vm from 'node:vm';
import { archivePath } from './archive-path.mjs';
import { click } from './ui.mjs';
import { waitForVideo, mediaDiagnostics } from './media-diagnostics.mjs';

const sandbox = { setImmediate, clearImmediate, setTimeout, clearTimeout, Uint8Array, ArrayBuffer, TextEncoder, TextDecoder };
vm.runInNewContext(await readFile('vendor/jszip-3.10.1.min.js', 'utf8'), sandbox);
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE_PATH, args: ['--no-sandbox'] });
test.after(() => browser.close());
async function playing(page, selector) {
  try {
    await waitForVideo(page, selector);
    await page.locator(selector).evaluate(async video => { video.muted = true; video.loop = true; await video.play(); });
    await page.waitForFunction(target => document.querySelector(target).currentTime > 0.1, selector);
  } catch (error) {
    throw new Error(JSON.stringify(await mediaDiagnostics(page)), { cause: error });
  }
}
for (const name of ['pattern.mp4', 'pattern.webm']) {
  test(`${name} plays, survives focus and editable/playback ZIP round trips`, async (testContext) => {
    testContext.diagnostic(`${process.platform}/${process.arch}; browser ${browser.version()}; fixture ${name}; file URLs; muted playback`);
    const context = await browser.newContext({ acceptDownloads: true });
    const page = await context.newPage();
    try {
      await page.goto('file://' + resolve('dist/presentation-studio.html'));
      await page.locator('#open-full-editor').click();
      await page.locator('.fe-slide-button[data-slide-id="studio-media"]').click();
      await page.locator('#fe-preview .media-box').click();
      await page.locator('#vb-panel').click();
      await page.locator('#me-file').setInputFiles(resolve('tests/fixtures/media', name));
      await page.locator('#me-close').click();
      await page.locator('#open-full-editor').click();
      await page.locator('.fe-slide-button[data-slide-id="studio-media"]').click();
      await page.locator('#vb-preview-mode').click();
      await playing(page, '#fe-preview video');
      await page.locator('#fe-preview video').evaluate(video => { window.roundtripVideo = video; video.pause(); video.currentTime = 0.5; });
      await page.locator('#fe-preview .mf-expand').press('Enter');
      await page.waitForSelector('#media-focus video');
      assert.equal(await page.locator('#media-focus video').evaluate(video => video === window.roundtripVideo), true);
      await page.keyboard.press('Escape');
      await page.waitForSelector('#media-focus', { state: 'detached' });
      assert.equal(await page.locator('#fe-preview video').evaluate(video => video.paused && Math.abs(video.currentTime - 0.5) < 0.15), true);
      for (const [kind, action] of [['editable', '#fe-export'], ['playback', '#fe-playback']]) {
        const download = page.waitForEvent('download');
        await click(page, action);
        const file = await download;
        const bytes = await readFile(await file.path());
        const zip = await sandbox.JSZip.loadAsync(new Uint8Array(bytes));
        const pack = JSON.parse(await zip.file('presentation.json').async('string'));
        const asset = pack.state.media['studio-media'].src;
        assert.deepEqual(Buffer.from(await zip.file(asset).async('uint8array')), await readFile(resolve('tests/fixtures/media', name)));
        const destination = resolve('test-results', `media-${name}-${kind}`);
        for (const entry of Object.values(zip.files).filter(entry => !entry.dir)) {
          const target = archivePath(destination, entry.name);
          await mkdir(dirname(target), { recursive: true });
          await writeFile(target, await entry.async('uint8array'));
        }
        const reopened = await context.newPage();
        const bootErrors=[];reopened.on('pageerror',e=>bootErrors.push(e.message));
        await reopened.goto('file://' + resolve(destination, 'index.html'));
        await reopened.locator('#stage .dot').nth(4).click();
        await playing(reopened, '#stage .slide.active video');
        assert.deepEqual(bootErrors,[]);
        if(kind==='editable') {
          await reopened.locator('#open-full-editor').click();
          assert.equal(await reopened.locator('#full-editor').evaluate(el=>el.open),true);
          assert.equal(await reopened.evaluate(()=>window.presentationStudioEditing.read().state.media['studio-media'].kind),'video');
        }
        await reopened.close();
        if (kind === 'editable') {
          const archive = resolve('test-results', `media-${name}.zip`);
          await writeFile(archive, bytes);
          const imported = await browser.newPage();
          try {
            await imported.goto('file://' + resolve('dist/presentation-studio-blank.html'));
            await imported.locator('#hub-presentations').click();
            await imported.locator('#hub-file').setInputFiles(archive);
            await imported.waitForFunction(() => document.querySelector('#fe-status').dataset.saveState === 'saved' && document.querySelector('#fe-title').textContent === 'From idea to presentation');
            await imported.locator('#open-full-editor').click();
            await imported.locator('.fe-slide-button[data-slide-id="studio-media"]').click();
            await imported.locator('#vb-preview-mode').click();
            await playing(imported, '#fe-preview video');
          } finally { await imported.close(); }
        }
      }
    } finally { await context.close(); }
  });
}
