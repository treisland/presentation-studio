import {inspectContent} from './ui.mjs';
import { reveal } from './ui.mjs';
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { readFile } from "node:fs/promises";
import { click, selectTab } from "./ui.mjs";
const { chromium } = createRequire(import.meta.url)("playwright");
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_EXECUTABLE_PATH,
  args: ["--no-sandbox"],
});
test.after(() => browser.close());
async function setup() {
  const context = await browser.newContext({
      acceptDownloads: true,
      viewport: { width: 1440, height: 900 },
    }),
    p = await context.newPage(),
    errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.emulateMedia({ reducedMotion: "reduce" });
  await p.goto("file://" + resolve("dist/presentation-studio.html"));
  await p.locator("#open-full-editor").click();
  return { p, context, errors };
}
async function pack(p) {
  const d = p.waitForEvent("download");
  await click(p, "#fe-export-json");
  return JSON.parse(await readFile(await (await d).path(), "utf8"));
}
const slide = (p, id) =>
  p.locator('.fe-slide-button[data-slide-id="' + id + '"]');
async function media(p) {
  await slide(p, "studio-media").click();
  await p.locator('#wp-tab-content').click();await inspectContent(p,'Media');
}

test("Panel collapse and keyboard sizing refit the canvas without changing project or undo data", async () => {
  const { p, context, errors } = await setup();
  try {
    const before = await pack(p);
    const fits = async () => {
      await p.waitForFunction(() => {
        const v = document.querySelector('#we-viewport').getBoundingClientRect();
        const s = document.querySelector('#fe-preview').getBoundingClientRect();
        return s.left >= v.left && s.top >= v.top && s.right <= v.right && s.bottom <= v.bottom;
      });
    };
    for (const size of [{ width: 1280, height: 720 }, { width: 1366, height: 768 }]) {
      await p.setViewportSize(size);
      await fits();
      const initial = await p.locator('#we-viewport').boundingBox();
      await p.locator('#we-toggle-slides').press('Enter');
      await p.locator('#we-toggle-inspector').press('Space');
      assert.equal(await p.locator('#we-slides').isVisible(), false);
      assert.equal(await p.locator('#we-inspector').isVisible(), false);
      await fits();
      assert((await p.locator('#we-viewport').boundingBox()).width > initial.width);
      await p.locator('#we-toggle-slides').press('Enter');
      await p.locator('#we-toggle-inspector').press('Enter');
      await reveal(p,'#we-panel-sizes');await p.locator('#we-panel-sizes > summary').press('Enter');
      const slider = await p.locator('#we-size-slides').boundingBox();
      await p.mouse.click(slider.x + slider.width * 0.75, slider.y + slider.height / 2);
      assert.notEqual(await p.locator('#we-size-slides').inputValue(), '210');
      await p.locator('#we-size-slides').press('End');
      await p.locator('#we-size-inspector').press('End');
      await fits();
      await p.locator('#we-zoom').selectOption('0.75');
      await p.locator('#we-size-slides').press('Home');
      await p.setViewportSize({ width: size.width - 60, height: size.height });
      assert.equal(await p.locator('#we-zoom').inputValue(), '0.75');
      await p.locator('#we-size-inspector').press('Escape');
      assert.equal(await p.locator('#we-panel-sizes').getAttribute('open'), null);
      assert.equal(await p.locator('#full-editor').evaluate(el => el.open), true);
      await p.locator('#we-fit').click();
      await fits();
      await reveal(p,'#we-panel-sizes');await p.locator('#we-panel-sizes > summary').click();
      await p.locator('#we-panel-reset').click();
      assert.equal(await p.locator('#we-size-slides').inputValue(), '210');
      await p.locator('#we-panel-reset').press('Escape');
    }
    assert.deepEqual(await pack(p), before);
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
});

test("Compact editor keeps actions reachable and settings returns keyboard focus", async () => {
  const { p, context } = await setup();
  try {
    for (const size of [{ width: 1366, height: 768 }, { width: 1280, height: 720 }]) {
      await p.setViewportSize(size);
      for (const id of ['we-settings-open', 'fe-close', 'vb-preview-mode']) {
        const bounds = await p.locator('#' + id).boundingBox();
        assert(bounds && bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= size.width && bounds.y + bounds.height <= size.height);
      }
      await p.locator('#we-settings-open').click();
      assert.equal(await p.evaluate(() => document.activeElement.id), 'we-settings-close');
      await p.keyboard.press('Shift+Tab');
      assert(await p.evaluate(() => !!document.activeElement.closest('#we-settings')));
      await p.keyboard.press('Escape');
      assert.equal(await p.evaluate(() => document.activeElement.id), 'we-settings-open');
    }
    const downloaded = p.waitForEvent('download');
    await click(p, '#fe-export');
    await downloaded;
    await p.waitForFunction(() => document.querySelector('#fe-status').textContent.includes('Editable ZIP created'));
    await reveal(p,"#fe-slide-title");
    await p.locator('#fe-slide-title').fill('Changed after backup');
    await reveal(p,"#fe-slide-title");
    await p.locator('#fe-slide-title').press('Tab');
    await p.waitForFunction(() => document.querySelector('#fe-status').textContent.includes('Changes need an editable ZIP'));
  } finally {
    await context.close();
  }
});

test("Context inspector follows text, table and media selection and preserves media context after changes", async () => {
  const { p, context, errors } = await setup();
  try {
    await p.locator("#fe-preview h1").click();
    assert.equal(
      await p.locator("#we-inspector").getAttribute("data-context"),
      "text",
    );
    await reveal(p,"#we-font-size");
    await p.locator("#we-font-size").fill("68");
    await reveal(p,"#we-font-size");
    await p.locator("#we-font-size").press("Tab");
    await p.waitForTimeout(100);
    assert.equal(
      await p
        .locator("#fe-preview h1")
        .evaluate((el) => getComputedStyle(el).fontSize),
      "68px",
    );
    await media(p);
    assert.equal(await p.locator("#ce-panel").isVisible(), true);
    await reveal(p,"#ce-float");
    await p.locator("#ce-float").click();
    assert.equal(await p.locator("#ce-panel").isVisible(), true);
    await slide(p, "studio-table").click();
    await p.locator("#fe-preview tbody td").first().click();
    await p.locator('#wp-tab-content').click();
    assert.equal(
      await p.locator("#we-inspector").getAttribute("data-context"),
      "table",
    );
    assert.equal(await p.locator("#fe-table-panel").isVisible(), true);
    await reveal(p,"#we-context-slide");
    await inspectContent(p,'Slide');
    await reveal(p,"#fe-slide-title");
    await p.locator("#fe-slide-title").fill("Updated table title");
    await p.waitForTimeout(400);
    assert.equal(
      await p.locator("#fe-preview h2").innerText(),
      "Updated table title",
    );
    assert.equal(
      await p.locator("#we-inspector").getAttribute("data-context"),
      "slide",
    );
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
});

test("Zoom and space-drag pan change only the editor view and Fit resets the view", async () => {
  const { p, context, errors } = await setup();
  try {
    const before = await pack(p),
      stage = await p.locator("#stage").getAttribute("style");
    await p.locator("#we-zoom").selectOption("1");
    await p.locator("#we-viewport").focus();
    const v = await p.locator("#we-viewport").boundingBox();
    const initial = await p.locator("#fe-preview").getAttribute("style");
    await p.keyboard.down("Space");
    await p.mouse.move(v.x + v.width / 2, v.y + v.height / 2);
    await p.mouse.down();
    await p.mouse.move(v.x + v.width / 2 + 70, v.y + v.height / 2 + 30, {
      steps: 3,
    });
    await p.mouse.up();
    await p.keyboard.up("Space");
    assert.notEqual(
      await p.locator("#fe-preview").getAttribute("style"),
      initial,
    );
    const after = await pack(p);
    assert.deepEqual(after.state, before.state);
    assert.deepEqual(after.history, before.history);
    assert.equal(await p.locator("#stage").getAttribute("style"), stage);
    await p.locator("#we-fit").click();
    assert.equal(await p.locator("#we-zoom").inputValue(), "fit");
    await p.setViewportSize({ width: 1200, height: 800 });
    await p.waitForTimeout(100);
    const canvas = await p.locator("#fe-preview").boundingBox(),
      viewport = await p.locator("#we-viewport").boundingBox();
    assert(canvas.width <= viewport.width && canvas.height <= viewport.height);
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
});

test("Typing spaces is text editing; Escape cancels a pan and selecting another slide restores Fit", async () => {
  const { p, context, errors } = await setup();
  try {
    const h = p.locator("#fe-preview h1");
    await h.click();
    await h.fill("Hello");
    await h.press("End");
    await h.press("Space");
    await h.press("W");
    await h.press("Escape");
    assert.equal(await p.locator("#fe-preview h1").innerText(), "Hello W");
    await p.locator("#we-zoom").selectOption("1");
    await p.locator("#we-viewport").focus();
    const v = await p.locator("#we-viewport").boundingBox(),
      before = await p.locator("#fe-preview").getAttribute("style");
    await p.keyboard.down("Space");
    await p.mouse.move(v.x + 100, v.y + 100);
    await p.mouse.down();
    await p.mouse.move(v.x + 180, v.y + 130);
    await p.keyboard.press("Escape");
    await p.mouse.up();
    await p.keyboard.up("Space");
    assert.equal(await p.locator("#fe-preview").getAttribute("style"), before);
    await media(p);
    assert.equal(await p.locator("#we-zoom").inputValue(), "fit");
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
});

test("Thumbnails are inert previews, sections collapse/search, and indicators reflect locks and visibility", async () => {
  const { p, context, errors } = await setup();
  try {
    await p.waitForSelector(".we-thumb-canvas");
    assert.equal(
      await p
        .locator(
          ".we-thumb-canvas video,.we-thumb-canvas button,.we-thumb-canvas [contenteditable]",
        )
        .count(),
      0,
    );
    assert.equal(
      await p
        .locator(".we-thumb-canvas")
        .first()
        .evaluate((el) => el.inert),
      true,
    );
    const overview = p
      .locator(".we-section-toggle")
      .filter({ hasText: "Overview" });
    await overview.click();
    assert.equal(await overview.getAttribute("aria-expanded"), "false");
    await p.locator("#fe-search").fill("Tell a clear story");
    assert.equal(await p.locator(".fe-slide-button").count(), 1);
    assert.equal(await slide(p, "studio-story").isVisible(), true);
    await p.locator("#fe-search").fill("");
    await overview.click();
    await reveal(p,"#we-context-slide");
    await inspectContent(p,'Slide');
    await reveal(p,'#fe-hidden');await p.locator("#fe-hidden").check();
    await reveal(p,"#ce-slide-lock");
    await p.locator("#ce-slide-lock").click();
    assert((await slide(p, "studio-welcome").innerText()).includes("Locked"));
    assert((await slide(p, "studio-welcome").innerText()).includes("Hidden"));
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
});

test("Thumbnail drops reorder within a section in one undo step and refuse locked or cross-section targets", async () => {
  const { p, context, errors } = await setup();
  try {
    const before = (await pack(p)).state.slides.map((s) => s.id);
    const transfer = await p.evaluateHandle(() => new DataTransfer());
    await slide(p, "studio-story").dispatchEvent("dragstart", {
      dataTransfer: transfer,
    });
    const r = await slide(p, "studio-welcome").boundingBox();
    await slide(p, "studio-welcome").dispatchEvent("drop", {
      dataTransfer: transfer,
      clientY: r.y + 1,
    });
    const reordered = (await pack(p)).state.slides.map((s) => s.id);
    assert(
      reordered.indexOf("studio-story") < reordered.indexOf("studio-welcome"),
    );
    await p.locator("#fe-undo").click();
    assert.deepEqual(
      (await pack(p)).state.slides.map((s) => s.id),
      before,
    );
    await reveal(p,"#ce-slide-lock");
    await p.locator("#ce-slide-lock").click();
    assert.equal(
      await slide(p, "studio-welcome").getAttribute("draggable"),
      "false",
    );
    await transfer.evaluate((d) =>
      d.setData("application/x-presentation-slide", "studio-welcome"),
    );
    await slide(p, "studio-story").dispatchEvent("drop", {
      dataTransfer: transfer,
      clientY: 0,
    });
    assert.deepEqual(
      (await pack(p)).state.slides.map((s) => s.id),
      before,
    );
    await transfer.evaluate((d) =>
      d.setData("application/x-presentation-slide", "studio-story"),
    );
    await slide(p, "studio-workflow").dispatchEvent("drop", {
      dataTransfer: transfer,
      clientY: 0,
    });
    assert.deepEqual(
      (await pack(p)).state.slides.map((s) => s.id),
      before,
    );
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
});

test("Project settings stay reachable in their dialog and closing it retains the editor", async () => {
  const { p, context, errors } = await setup();
  try {
    await selectTab(p, "Branding");
    assert.equal(
      await p.locator("#we-settings").evaluate((el) => el.open),
      true,
    );
    await p.locator("#studio-header-title").fill("WORKSHOP");
    await p.waitForTimeout(350);
    await p.locator("#we-settings-close").click();
    assert.equal(await p.locator("#full-editor").isVisible(), true);
    await p.locator("#we-settings-open").click();
    await selectTab(p, "Presentation settings");
    assert.equal(await p.locator("#booth-open").isVisible(), true);
    await p.locator("#we-settings-close").focus();
    await p.keyboard.press("Escape");
    assert.equal(
      await p.locator("#we-settings").evaluate((el) => el.open),
      false,
    );
    assert.equal(await p.locator("#full-editor").isVisible(), true);
    assert.equal((await pack(p)).state.brand.headerTitle, "WORKSHOP");
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
});

test("Dragging media while zoomed uses slide coordinates, and view state is absent from exported projects", async () => {
  const { p, context, errors } = await setup();
  try {
    await media(p);
    await reveal(p,"#ce-float");
    await p.locator("#ce-float").click();
    for (const [key, value] of [
      ["x", "35"],
      ["y", "30"],
      ["w", "30"],
      ["h", "30"],
    ]) {
      await p.locator("#ce-" + key).fill(value);
      await p.locator("#ce-" + key).press("Tab");
    }
    const before = (await pack(p)).state.media["studio-media"].canvas.placement;
    await p.locator("#we-zoom").selectOption("0.5");
    await p.locator('#we-toggle-slides').click();
    await p.setViewportSize({ width: 1280, height: 720 });
    await p.waitForFunction(() => {
      const viewport = document.querySelector('#we-viewport');
      const transform = new DOMMatrix(getComputedStyle(document.querySelector('#fe-preview')).transform);
      return Math.abs(transform.e - (viewport.clientWidth - 960) / 2) < 1 &&
        Math.abs(transform.f - (viewport.clientHeight - 540) / 2) < 1;
    });
    const box = p.locator("#fe-preview .ce-floating");
    const r = await box.boundingBox(),
      width = await p
        .locator("#fe-preview .slide")
        .evaluate((el) => el.getBoundingClientRect().width);
    const hit = await p.evaluate(({x,y})=>{const target=document.elementFromPoint(x,y),viewport=document.querySelector('#we-viewport');return{floating:!!target?.closest('.ce-floating'),target:target?.outerHTML.slice(0,180),viewport:viewport.getBoundingClientRect().toJSON()};},{x:r.x+r.width/2,y:r.y+r.height/2});
    assert(hit.floating,JSON.stringify(hit));
    await p.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
    await p.mouse.down();
    await p.mouse.move(r.x + r.width / 2 - 30, r.y + r.height / 2, {
      steps: 3,
    });
    await p.mouse.up();
    const data = await pack(p);
    assert(
      Math.abs(
        data.state.media["studio-media"].canvas.placement.x -
          (before.x - 30 / width),
      ) < 0.015,
      JSON.stringify({ before, after: data.state.media['studio-media'].canvas.placement, r, width }),
    );
    assert(!JSON.stringify(data.state).includes("weZoom"));
    assert.equal(await p.locator("#we-zoom").inputValue(), "0.5");
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
});

test("Interactive Preview fits the canvas and keeps Media Focus controls visible", async () => {
  const { p, context, errors } = await setup();
  try {
    await media(p);
    await p.locator("#we-zoom").selectOption("1");
    await p.locator("#vb-preview-mode").click();
    assert.equal(await p.locator("#we-zoom").inputValue(), "fit");
    await p.locator("#fe-preview .mf-expand").press("Enter");
    await p.waitForSelector("#media-focus");
    await p.waitForTimeout(100);
    const control = await p.locator("#mf-close").boundingBox(),
      viewport = await p.locator("#we-viewport").boundingBox();
    assert(
      control.x >= viewport.x &&
        control.x + control.width <= viewport.x + viewport.width,
    );
    await p.keyboard.press("Escape");
    await p.waitForSelector("#media-focus", { state: "detached" });
    assert.equal(await p.locator("#full-editor").isVisible(), true);
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
});

test("Inspector and settings tabs support keyboard navigation without leaving their tablist", async () => {
  const { p, context, errors } = await setup();
  try {
    await p.locator('#wp-tab-content').focus();
    await p.keyboard.press("ArrowRight");
    assert.equal(
      await p.locator('#wp-tab-arrange').getAttribute('aria-selected'),
      'true',
    );
    await p.keyboard.press("End");
    assert.equal(
      await p.locator('#wp-tab-style').getAttribute('aria-selected'),
      'true',
    );
    await p.keyboard.press("Home");
    assert.equal(
      await p.locator('#wp-tab-content').getAttribute('aria-selected'),
      'true',
    );
    await p.locator("#we-settings-open").click();
    await p.getByRole("tab", { name: "Branding", exact: true }).focus();
    await p.keyboard.press("ArrowRight");
    assert.equal(await p.locator("#fe-settings-panel").isVisible(), true);
    await p.keyboard.press("Escape");
    assert.equal(
      await p.locator("#we-settings").evaluate((el) => el.open),
      false,
    );
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
});
