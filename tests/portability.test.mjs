import { selectTab } from './ui.mjs';
import { archivePath } from './archive-path.mjs';
import { click, reveal } from './ui.mjs';
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import vm from "node:vm";
const { chromium } = createRequire(import.meta.url)("playwright");
const root = fileURLToPath(new URL("../", import.meta.url));
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROMIUM_EXECUTABLE_PATH
    ? { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH }
    : {}),
  args: ["--no-sandbox"],
});
test.after(() => browser.close());
const sandbox = {
  setImmediate,
  clearImmediate,
  setTimeout,
  clearTimeout,
  Uint8Array,
  ArrayBuffer,
  TextEncoder,
  TextDecoder,
};
vm.runInNewContext(
  await readFile(resolve(root, "vendor/jszip-3.10.1.min.js"), "utf8"),
  sandbox,
);
test('distributions have no external runtime scripts or stylesheets', async () => {
  const page = await browser.newPage();
  try {
    for (const file of ['presentation-studio.html', 'presentation-studio-blank.html']) {
      await page.goto('file://' + resolve(root, 'dist', file));
      assert.equal(await page.locator('script[src], link[rel~="stylesheet"]').count(), 0, file);
    }
    await page.setContent('<SCRIPT SRC = "data:text/javascript,"></SCRIPT><LINK REL="alternate StyleSheet" href="data:text/css,">');
    assert.equal(await page.locator('script[src], link[rel~="stylesheet"]').count(), 2);
  } finally {
    await page.close();
  }
});

test('path-like text saves and script delimiters survive editable and playback exports', async () => {
  const page = await browser.newPage({ acceptDownloads: true });
  const payload = '</script><script>globalThis.exportInjection=true</script>';
  const pack = JSON.parse(await readFile(resolve(root, 'templates/blank/presentation.json'), 'utf8'));
  pack.meta.name = 'assets/project.txt';
  pack.state.slides[0].title = payload;
  pack.state.slides[0].notes = 'assets/notes.txt';
  pack.state.slides[0].tree = [{ tag: 'p', children: [{ text: 'assets/example.png' }, { text: payload }] }];
  try {
    await page.goto('file://' + resolve(root, 'dist/presentation-studio-blank.html'));
    await page.locator('#hub-presentations').click();
    await page.locator('#hub-file').setInputFiles({ name: 'text-only.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(pack)) });
    await page.waitForFunction(() => document.getElementById('fe-status').dataset.saveState === 'saved');
    await page.locator('#open-full-editor').click();
    for (const [selector, name] of [['#fe-export', 'escaping-editable'], ['#fe-playback', 'escaping-playback']]) {
      const event = page.waitForEvent('download');
      await click(page, selector);
      const archive = resolve(root, 'test-results', name + '.zip');
      await mkdir(dirname(archive), { recursive: true });
      await (await event).saveAs(archive);
      const destination = resolve(root, 'test-results', name);
      const exported = await unpack(archive, destination);
      const reopened = await browser.newPage();
      try {
        await reopened.goto('file://' + resolve(destination, 'index.html'));
        assert.equal(await reopened.evaluate(() => globalThis.exportInjection), undefined);
        const embedded = await reopened.locator('#project-config').textContent();
        assert.equal(JSON.parse(embedded).state.slides[0].title, payload);
        assert.equal(exported.state.slides[0].title, payload);
        assert((await reopened.locator('#stage .slide').first().textContent()).includes(payload));
      } finally {
        await reopened.close();
      }
    }
  } finally {
    await page.close();
  }
});

async function unpack(file, destination) {
  const zip = await sandbox.JSZip.loadAsync(
    new Uint8Array(await readFile(file)),
  );
  for (const [name, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;
    const path = archivePath(destination, name);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, await entry.async("uint8array"));
  }
  return JSON.parse(await zip.file("presentation.json").async("string"));
}
test("theme logos, brand presets, and transition overrides survive editable and playback packages", async () => {
  const page = await browser.newPage({
    acceptDownloads: true,
    viewport: { width: 1366, height: 768 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const tab = (name) => selectTab(page, name);
  const download = async (selector, name) => {
    const event = page.waitForEvent("download");
    await click(page, selector);
    const path = resolve(root, "test-results", name);
    await mkdir(dirname(path), { recursive: true });
    await (await event).saveAs(path);
    return path;
  };
  try {
    await page.goto("file://" + resolve(root, "dist/presentation-studio.html"));
    await page.locator("#open-full-editor").click();
    await page
      .locator("#fe-import-file")
      .setInputFiles(resolve(root, "examples/layout-sampler.json"));
    await page.waitForTimeout(250);
    await tab("Branding");
    await reveal(page, "#nx-logo-variant");
    await page.locator("#nx-logo-variant").selectOption("logoDark");
    await page
      .locator("#fe-logo-file")
      .setInputFiles(resolve(root, "examples/sample-diagram.svg"));
    await page.waitForTimeout(200);
    await reveal(page, "#nx-preset-name");
    await page.locator("#nx-preset-name").fill("Portable sample");
    await reveal(page, "#nx-preset-save");
    await page.locator("#nx-preset-save").click();
    await page.waitForTimeout(200);
    await reveal(page, "#nx-preset-apply");
    await page.locator("#nx-preset-apply").click();
    await reveal(page, "#nx-title-logo");
    await page.locator("#nx-title-logo").check();
    await reveal(page, "#nx-logo-placement");
    await page.locator("#nx-logo-placement").selectOption("right");
    await page.locator("#studio-presentation-theme").selectOption("dark");
    await page.locator("#studio-theme-apply").click();
    await page.waitForFunction(
      () =>
        document.querySelector("#fe-preview .project-logo")?.naturalWidth > 0,
    );
    await tab("Presentation settings");
    await page.locator("#nx-transition").selectOption("fade");
    await page.locator("#nx-speed").selectOption("slow");
    await page.locator("#nx-section-transition").selectOption("zoom");
    await page.locator("#nx-slide-transition").selectOption("slide");
    await page.locator("#nx-disable-motion").check();
    const editable = await download("#fe-export", "experience-editable.zip");
    const playback = await download("#fe-playback", "experience-playback.zip");
    for (const [file, kind] of [
      [editable, "editable"],
      [playback, "playback"],
    ]) {
      const folder = resolve(root, "test-results/experience-" + kind),
        pack = await unpack(file, folder);
      assert.equal(pack.state.presentation.transition, "fade");
      assert.equal(pack.state.presentation.sectionTransition, "zoom");
      assert.equal(pack.state.presentation.disableMotion, true);
      assert.equal(pack.state.slides[0].transition, "slide");
      assert.equal(pack.state.brand.logoPlacement, "right");
      assert.equal(pack.state.brand.titleLogo, true);
      assert(pack.state.brand.logoDark.endsWith(".svg"));
      const reopened = await browser.newPage();
      reopened.on("pageerror", (e) => errors.push(e.message));
      await reopened.goto("file://" + resolve(folder, "index.html"));
      await reopened.waitForFunction(
        () => document.querySelector("#stage .project-logo")?.naturalWidth > 0,
      );
      assert.equal(await reopened.locator("#stage").evaluate(e => getComputedStyle(e).backgroundColor), "rgb(7, 17, 31)");
      assert(
        await reopened
          .locator("body")
          .evaluate((e) => e.classList.contains("nx-no-motion")),
      );
      if (kind === "editable") {
        await reopened.locator("#open-full-editor").click();
        await selectTab(reopened, "Presentation settings");
        assert.equal(
          await reopened.locator("#nx-slide-transition").inputValue(),
          "slide",
        );
      } else {
        assert.equal(pack.checkpoints.length, 0);
        assert(
          await reopened
            .locator("body")
            .evaluate((e) => e.classList.contains("playback-only")),
        );
      }
      await reopened.close();
    }
    // Check real playback without project motion suppression.
    await page.locator("#nx-disable-motion").uncheck();
    await page.locator("#fe-close").click();
    await page.emulateMedia({ reducedMotion: "no-preference" });
    // Hold the real slide animations rather than racing a wall-clock sleep
    // against a busy browser worker. Playback must stay paused until they end.
    const transition = await page.evaluate(() => {
      document.getElementById('play').click();
      document.getElementById('next').click();
      const animations=document.getAnimations().filter(animation=>animation.effect?.target.matches('#stage .slide')&&Number.isFinite(animation.effect.getComputedTiming().endTime));
      animations.forEach(animation=>animation.pause());
      return {active:document.body.classList.contains('nx-transitioning'),count:animations.length};
    });
    assert.equal(transition.active,true);assert(transition.count>0);
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    assert.equal(
      await page.locator("#fill").evaluate((e) => e.style.width),
      "0%",
    );
    await page.evaluate(()=>document.getAnimations().filter(animation=>animation.effect?.target.matches('#stage .slide')&&Number.isFinite(animation.effect.getComputedTiming().endTime)).forEach(animation=>animation.finish()));
    await page.waitForFunction(()=>!document.body.classList.contains('nx-transitioning')&&parseFloat(document.getElementById('fill').style.width)>0);
    assert(
      parseFloat(await page.locator("#fill").evaluate((e) => e.style.width)) >
        0,
    );
    await page.locator("#menu").click();
    const qa = page
      .locator(".section-options button")
      .filter({ hasText: "Questions" });
    await qa.click();
    assert.equal(await page.locator("#stage .nx-transition-ghost").count(), 0);
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
  }
});
