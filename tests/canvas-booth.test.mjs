import {selectStartingExample} from './ui.mjs';
import { reveal } from './ui.mjs';
import { selectTab, addSlide } from './ui.mjs';
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { resolve, dirname } from "node:path";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import vm from "node:vm";
import { click } from "./ui.mjs";
import { archivePath } from "./archive-path.mjs";
const { chromium } = createRequire(import.meta.url)("playwright");
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_EXECUTABLE_PATH,
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
  await readFile("vendor/jszip-3.10.1.min.js", "utf8"),
  sandbox,
);
async function setup() {
  const context = await browser.newContext({
      acceptDownloads: true,
      viewport: { width: 1366, height: 768 },
    }),
    p = await context.newPage(),
    errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.emulateMedia({ reducedMotion: "reduce" });
  await p.goto("file://" + resolve("dist/presentation-studio.html"));
  await p.locator("#open-full-editor").click();
  return { p, context, errors };
}
async function mediaSlide(p) {
  await p
    .locator(".fe-slide-button")
    .filter({ hasText: "Bring your content to life" })
    .click();
}
async function json(p) {
  const event = p.waitForEvent("download");
  await click(p, "#fe-export-json");
  const file = await event;
  return JSON.parse(await readFile(await file.path(), "utf8"));
}
async function upload(p, name = "second.svg", zone = "floating") {
  await reveal(p,'#ce-zone');
  if (zone !== "replace") await p.locator("#ce-zone").selectOption(zone);
  await p.locator(zone === "replace" ? "#ce-replace-file" : "#ce-file").setInputFiles({
    name,
    mimeType: "image/svg+xml",
    buffer: Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="orange"/></svg>',
    ),
  });
}
async function confirmedUpload(p, name, zone) {
  await upload(p, name, zone);
  if (zone === "replace" && await p.locator('#fe-confirm').isVisible()) await p.locator('#fe-confirm-accept').click();
}
async function boothDialog(p) {
  await selectTab(p, "Presentation settings");
  await p.locator("#booth-open").click();
  await p.locator("#booth-password").fill("conference-test-passphrase");
  await p.locator("#booth-confirm").fill("conference-test-passphrase");
  await p.locator("#booth-loop").selectOption("studio-main");
}
async function zipDownload(p, selector) {
  const event = p.waitForEvent("download");
  await click(p, selector);
  const file = await event;
  return sandbox.JSZip.loadAsync(
    new Uint8Array(await readFile(await file.path())),
  );
}
async function unpack(zip, folder) {
  for (const [name, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;
    const path = archivePath(folder, name);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, await entry.async("uint8array"));
  }
}

test("Default addition preserves table/text, existing media and IDs with one-step undo", async () => {
  const { p, context, errors } = await setup();
  try {
    await addSlide(p, 'table');
    await reveal(p,"#we-context-media");
    await p.locator('#we-context-media').click();
    const id = await p.locator('.fe-slide-button[aria-current=true]').getAttribute('data-slide-id');
    const before = await json(p), model = before.state.slides.find(s => s.id === id);
    await upload(p, 'table-first.svg');
    const first = await json(p);
    assert.deepEqual(first.state.slides.find(s => s.id === id), model);
    assert.equal(first.history.past.length, before.history.past.length + 1);
    assert.equal(await p.locator('#fe-preview table').isVisible(), true);
    await upload(p, 'table-second.svg', 'left');
    const second = await json(p);
    assert.deepEqual(second.state.media[id], first.state.media[id]);
    assert.deepEqual(second.state.slides.find(s => s.id === id), model);
    assert.equal(second.state.mediaObjects[id].length, 1);
    await p.locator('#ce-file').setInputFiles(resolve('tests/fixtures/media/pattern.mp4'));
    const third = await json(p);
    assert.equal(third.state.mediaObjects[id].length, 2);
    assert.equal(third.state.mediaObjects[id][1].media.kind, 'video');
    await p.locator('#fe-undo').click();
    assert.deepEqual((await json(p)).state, second.state);
    await p.locator('#fe-redo').click();
    assert.deepEqual((await json(p)).state, third.state);
    const archive = await zipDownload(p, '#fe-export');
    for (const media of [third.state.media[id], ...third.state.mediaObjects[id].map(o => o.media)]) assert(archive.file(media.src));
    assert.deepEqual(Buffer.from(await archive.file(third.state.mediaObjects[id][1].media.src).async('uint8array')),
      await readFile('tests/fixtures/media/pattern.mp4'));
    for (const [kind, zip] of [['editable', archive], ['playback', await zipDownload(p, '#fe-playback')]]) {
      const folder = resolve('test-results/additive-' + kind);
      await unpack(zip, folder);
      const reopened = await browser.newPage();
      try {
        await reopened.context().setOffline(true);
        await reopened.goto('file://' + resolve(folder, 'index.html'));
        if (kind === 'editable') {
          await reopened.locator('#open-full-editor').click();
          await reopened.locator('.fe-slide-button[data-slide-id="' + id + '"]').click();
          assert.equal(await reopened.locator('#fe-preview table').isVisible(), true);
          assert.equal(await reopened.locator('#fe-preview .media-box').count(), 3);
        } else {
          const saved = JSON.parse(await zip.file('presentation.json').async('string'));
          assert.deepEqual(saved.state.slides.find(s => s.id === id).tree, model.tree);
          assert.equal(saved.state.mediaObjects[id].length, 2);
          assert.equal(await reopened.locator('#stage .slide[data-media-id="' + id + '"] .media-box').count(), 3);
        }
      } finally { await reopened.close(); }
    }
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
});

test("Background additions keep text foreground stacking in edit, Preview and offline playback", async () => {
  const { p, context, errors } = await setup();
  const foreground = root => root.evaluate(slide => {
    const content = slide.querySelector(':scope > .media-original');
    const frame = [...slide.querySelectorAll(':scope > .ce-floating')].find(el => getComputedStyle(el).zIndex === '0');
    return !!content && !!frame && Number(getComputedStyle(content).zIndex) > Number(getComputedStyle(frame).zIndex);
  });
  try {
    const before = await json(p);
    await reveal(p,"#we-context-media");
    await p.locator('#we-context-media').click();
    await upload(p, 'background.svg', 'background');
    const after = await json(p);
    assert.deepEqual(after.state.slides[0].tree, before.state.slides[0].tree);
    assert.equal(await foreground(p.locator('#fe-preview .slide')), true);
    await p.locator('#vb-preview-mode').click();
    assert.equal(await foreground(p.locator('#fe-preview .slide')), true);
    const zip = await zipDownload(p, '#fe-playback'), folder = resolve('test-results/background-playback');
    await unpack(zip, folder);
    const reopened = await browser.newPage();
    try {
      await reopened.context().setOffline(true);
      await reopened.goto('file://' + resolve(folder, 'index.html'));
      assert.equal(await foreground(reopened.locator('#stage .slide[data-media-id="studio-welcome"]')), true);
    } finally { await reopened.close(); }
    await p.locator('#vb-edit-mode').click();
    await p.locator('#fe-undo').click();
    assert.deepEqual((await json(p)).state, before.state);
    await mediaSlide(p);
    await upload(p, 'additional-background.svg', 'background');
    assert.equal(await foreground(p.locator('#fe-preview .slide')), true);
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
});

test("Replacement names/previews its target, cancels safely and rejects a stale project", async () => {
  const { p, context, errors } = await setup();
  try {
    await mediaSlide(p);
    await upload(p, 'keep-primary.svg');
    const before = await json(p), extra = before.state.mediaObjects['studio-media'][0];
    await upload(p, 'cancelled.svg', 'replace');
    assert((await p.locator('#fe-confirm-title').innerText()).includes(extra.media.name));
    assert.equal(await p.locator('#ce-replacement-preview').isVisible(), true);
    assert.equal(await p.locator('#fe-preview .ce-replace-target').count(), 1);
    await p.keyboard.press('Escape');
    await p.waitForSelector('#ce-replacement-preview', { state: 'detached' });
    assert.deepEqual(await json(p), before);
    await upload(p, 'stale.svg', 'replace');
    const changed = await p.evaluate(() => {
      const api = window.presentationStudioEditing, snapshot = api.read();
      return api.apply({ apiVersion: 1, projectId: snapshot.projectId, expectedRevision: snapshot.revision,
        operations: [{ type: 'slide.update', slideId: 'studio-welcome', changes: { notes: 'Changed during confirmation' } }] });
    });
    assert.equal(changed.ok, true);
    await p.locator('#fe-confirm-accept').click();
    assert.deepEqual((await json(p)).state.mediaObjects['studio-media'][0], extra);
    await confirmedUpload(p, 'accepted.svg', 'replace');
    const after = await json(p), replaced = after.state.mediaObjects['studio-media'][0];
    assert.equal(replaced.id, extra.id);
    assert.deepEqual(replaced.media.canvas, extra.media.canvas);
    assert.deepEqual(after.state.media['studio-media'], before.state.media['studio-media']);
    const archive = await zipDownload(p, '#fe-export');
    assert(archive.file(extra.media.src), 'Undo history retains the old asset');
    assert(archive.file(replaced.media.src));
    await p.locator('#fe-undo').click();
    assert.deepEqual((await json(p)).state.mediaObjects['studio-media'][0], extra);
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
});

test("Floating placement, scaled dragging, undo, crop, multiple objects and exports round-trip", async () => {
  const { p, context, errors } = await setup();
  try {
    await mediaSlide(p);
    await reveal(p,"#ce-float");
    await p.locator("#ce-float").click();
    const initial = (await json(p)).state.media["studio-media"].canvas
      .placement;
    const box = p.locator("#fe-preview .ce-floating");
    const before = await box.boundingBox();
    await p.mouse.move(
      before.x + before.width / 2,
      before.y + before.height / 2,
    );
    await p.mouse.down();
    await p.mouse.move(
      before.x + before.width / 2 - 25,
      before.y + before.height / 2 + 10,
      { steps: 4 },
    );
    await p.mouse.up();
    const moved = (await json(p)).state.media["studio-media"].canvas.placement;
    assert(moved.x < initial.x);
    await p.locator("#fe-undo").click();
    assert.deepEqual(
      (await json(p)).state.media["studio-media"].canvas.placement,
      initial,
    );
    await upload(p);
    assert.equal(await p.locator("#fe-preview .media-box").count(), 2);
    await reveal(p,"#ce-fit");
    await p.locator("#ce-fit").selectOption("cover");
    await reveal(p,"#ce-crop");
    await p.locator("#ce-crop").check();
    const extra = p.locator("#fe-preview .ce-selected");
    const bounds = await extra.boundingBox();
    await p.mouse.move(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
    );
    await p.mouse.down();
    await p.mouse.move(
      bounds.x + bounds.width / 2 + 10,
      bounds.y + bounds.height / 2,
    );
    await p.mouse.up();
    const data = await json(p);
    assert.equal(data.state.mediaObjects["studio-media"].length, 1);
    assert.notEqual(
      data.state.mediaObjects["studio-media"][0].media.canvas.crop.x,
      50,
    );
    const zipped = await zipDownload(p, "#fe-export");
    const saved = JSON.parse(
      await zipped.file("presentation.json").async("string"),
    );
    assert(zipped.file(saved.state.mediaObjects["studio-media"][0].media.src));
    const folder = resolve("test-results/canvas-reopen");
    await unpack(zipped, folder);
    const q = await context.newPage();
    q.on("pageerror", (e) => errors.push(e.message));
    await q.goto("file://" + resolve(folder, "index.html"));
    await q.locator("#open-full-editor").click();
    await mediaSlide(q);
    assert.equal(await q.locator("#fe-preview .media-box").count(), 2);
    await q.locator("#vb-preview-mode").click();
    await q
      .locator("#fe-preview .media-box")
      .nth(1)
      .locator(".mf-expand")
      .press("Enter");
    assert.equal(await q.locator("#media-focus").count(), 1);
    await q.keyboard.press("Escape");
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
});

test("Drop replacement retains placement; design locks prevent direct and indirect changes", async () => {
  const { p, context, errors } = await setup();
  try {
    await mediaSlide(p);
    await reveal(p,"#ce-float");
    await p.locator("#ce-float").click();
    const original = (await json(p)).state.media["studio-media"].canvas
      .placement;
    await confirmedUpload(p, "replacement.svg", "replace");
    assert.deepEqual(
      (await json(p)).state.media["studio-media"].canvas.placement,
      original,
    );
    await reveal(p,"#ce-object-lock");
    await p.locator("#ce-object-lock").click();
    await confirmedUpload(p, "blocked.svg", "replace");
    assert.equal(
      (await json(p)).state.media["studio-media"].name,
      "replacement.svg",
    );
    await reveal(p,"#ce-object-lock");
    await p.locator("#ce-object-lock").click();
    await reveal(p,"#ce-slide-lock");
    await p.locator("#ce-slide-lock").click();
    const locked = await json(p);
    await reveal(p,"#fe-slide-title");
    await p.locator("#fe-slide-title").fill("Must not persist");
    await p.waitForTimeout(400);
    assert.equal(
      (await json(p)).state.slides.find((s) => s.id === "studio-media").title,
      locked.state.slides.find((s) => s.id === "studio-media").title,
    );
    await selectTab(p, "Sections");
    await p
      .locator(".studio-section-row")
      .filter({ hasText: "Demonstration" })
      .click();
    await p.locator("#studio-section-name").fill("Blocked section");
    await p.waitForTimeout(400);
    assert.equal(
      (await json(p)).state.sections.find(
        (s) => s.id === "studio-demonstration",
      ).name,
      "Demonstration",
    );
    await selectTab(p, "Content");
    await reveal(p,"#ce-slide-lock");
    await p.locator("#ce-slide-lock").click();
    await reveal(p,"#ce-project-lock");
    await p.locator("#ce-project-lock").click();
    await reveal(p,"#fe-slide-title");
    await p.locator("#fe-slide-title").fill("No edits");
    await p.waitForTimeout(400);
    assert.equal((await json(p)).state.editLocked, true);
    await reveal(p,"#ce-project-lock");
    await p.locator("#ce-project-lock").click();
    assert.equal((await json(p)).state.editLocked, false);
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
});

test("Actual file drops choose placement and Present prevents browser navigation", async () => {
  const { p, context, errors } = await setup();
  try {
    await mediaSlide(p);
    const dt = await p.evaluateHandle(() => {
      const d = new DataTransfer();
      d.items.add(
        new File(
          [
            '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200"/>',
          ],
          "dropped.svg",
          { type: "image/svg+xml" },
        ),
      );
      return d;
    });
    await p
      .locator("#fe-preview")
      .dispatchEvent("dragover", { dataTransfer: dt });
    await p
      .locator("[data-drop-zone=floating]")
      .dispatchEvent("drop", { dataTransfer: dt });
    assert.equal(
      (await json(p)).state.mediaObjects["studio-media"][0].media.name,
      "dropped.svg",
    );
    await p.locator("#fe-close").click();
    const url = p.url();
    await p.locator("body").dispatchEvent("drop", { dataTransfer: dt });
    assert.equal(p.url(), url);
    assert.equal(await p.locator("#full-editor").isVisible(), false);
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
});

test("Booth permissions block authoring and project switching, survive refresh, and require unlock", async () => {
  const { p, context, errors } = await setup();
  try {
    await boothDialog(p);
    await p.locator("#booth-navigation").uncheck();
    await p.locator("#booth-focus").uncheck();
    await p.locator("#booth-start").click();
    await p.waitForSelector("body.booth-active", { state: "attached" });
    for (const key of ["j", "e", "p", "n", "m"]) await p.keyboard.press(key);
    assert.equal(await p.locator("#full-editor").isVisible(), false);
    assert.equal(await p.locator("#hub-picker").isVisible(), false);
    assert.equal(await p.locator("#presenter-notes").isVisible(), false);
    assert.equal(await p.locator("#next").isVisible(), false);
    await p.reload();
    await p.waitForSelector("body.booth-active", { state: "attached" });
    await p.locator("#booth-unlock").click();
    await p.locator("#booth-unlock-password").fill("wrong");
    await p.locator("#booth-unlock-form button").click();
    await p.waitForFunction(() =>
      document
        .querySelector("#booth-message")
        .textContent.includes("Incorrect"),
    );
    assert.equal(
      await p
        .locator("body")
        .evaluate((b) => b.classList.contains("booth-active")),
      true,
    );
    await p
      .locator("#booth-unlock-password")
      .fill("conference-test-passphrase");
    await p.locator("#booth-unlock-form button").click();
    await p.waitForFunction(
      () => !document.body.classList.contains("booth-active"),
    );
    await p.locator("#open-full-editor").click();
    assert.equal(await p.locator("#full-editor").isVisible(), true);
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
});

test("Booth export removes authoring, private notes/history and omitted slides, and reopens offline", async () => {
  const { p, context, errors } = await setup();
  try {
    await selectTab(p, "Notes");
    await p.locator("#fe-notes-text").fill("PRIVATE-NOTES-DO-NOT-SHIP");
    await p.waitForTimeout(400);
    await boothDialog(p);
    await p.locator("#booth-questions").uncheck();
    const zip = await zipDownload(p, "#booth-export");
    const html = await zip.file("index.html").async("string");
    assert(!html.includes("PRIVATE-NOTES-DO-NOT-SHIP"));
    assert(!html.includes("projectChange"));
    assert(!html.includes('id="full-editor"'));
    assert(!html.includes("studio-question"));
    assert(!zip.file("presentation.json"));
    assert(zip.file("assets/studio-demo-workflow.svg"));
    const folder = resolve("test-results/booth-reopen");
    await unpack(zip, folder);
    const q = await context.newPage();
    q.on("pageerror", (e) => errors.push(e.message));
    await q.goto("file://" + resolve(folder, "index.html"));
    assert.equal(await q.locator("#booth-slides .slide").count(), 7);
    assert.equal(await q.locator("#booth-questions").isVisible(), false);
    await q.locator("#booth-next").click();
    assert.equal(
      await q.locator(".slide.active").getAttribute("id"),
      "studio-story",
    );
    await q.locator("#booth-access").click();
    await q.locator("#booth-passphrase").fill("conference-test-passphrase");
    await q.locator("#booth-access-form button").first().click();
    await q.waitForFunction(
      () =>
        document.querySelector("#booth-access").textContent === "Relock booth",
    );
    await q.reload();
    assert.equal(
      await q.locator("#booth-access").textContent(),
      "🔒 Presenter unlock",
    );
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
});

test("Audience question browsing returns to the chosen loop after inactivity", async () => {
  const { p, context, errors } = await setup();
  try {
    await boothDialog(p);
    await p.locator("#booth-idle").fill("1");
    await p.locator("#booth-start").click();
    await p.waitForSelector("body.booth-active", { state: "attached" });
    await p.locator("#booth-audience-questions").click();
    await p.locator(".question-option").first().click();
    assert.equal(
      await p.locator("#stage .slide.active").getAttribute("data-media-id"),
      "studio-question",
    );
    await p.waitForFunction(
      () =>
        document.querySelector("#stage .slide.active")?.dataset.mediaId ===
        "studio-welcome",
      null,
      { timeout: 5000 },
    );
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
});

test("Resize and keyboard nudges are undoable; Escape cancels a drag", async () => {
  const { p, context, errors } = await setup();
  try {
    await mediaSlide(p);
    await reveal(p,"#ce-float");
    await p.locator("#ce-float").click();
    await reveal(p,"#ce-w");
    await p.locator("#ce-w").fill("35");
    await reveal(p,"#ce-w");
    await p.locator("#ce-w").press("Tab");
    await reveal(p,"#ce-h");
    await p.locator("#ce-h").fill("35");
    await reveal(p,"#ce-h");
    await p.locator("#ce-h").press("Tab");
    const before = (await json(p)).state.media["studio-media"].canvas.placement;
    const handle = p.locator("#fe-preview .ce-se");
    await handle.scrollIntoViewIfNeeded();
    const r = await handle.boundingBox();
    await p.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
    await p.mouse.down();
    await p.mouse.move(r.x + r.width / 2 + 20, r.y + r.height / 2 + 10, {
      steps: 3,
    });
    await p.mouse.up();
    const resized = (await json(p)).state.media["studio-media"].canvas
      .placement;
    assert(resized.w > before.w);
    await p.locator("#fe-undo").click();
    assert.deepEqual(
      (await json(p)).state.media["studio-media"].canvas.placement,
      before,
    );
    const box = p.locator("#fe-preview .ce-floating");
    await box.focus();
    await p.keyboard.press("Shift+ArrowLeft");
    const nudged = (await json(p)).state.media["studio-media"].canvas.placement;
    assert(nudged.x < before.x);
    const b = await box.boundingBox();
    await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await p.mouse.down();
    await p.mouse.move(b.x + b.width / 2 - 20, b.y + b.height / 2);
    await p.keyboard.press("Escape");
    await p.mouse.up();
    assert.deepEqual(
      (await json(p)).state.media["studio-media"].canvas.placement,
      nudged,
    );
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
});

test("Booth idle return waits for video playback and resumes after it pauses", async () => {
  const { p, context, errors } = await setup();
  try {
    await mediaSlide(p);
    const bytes = await p.evaluate(async () => {
      const canvas = document.createElement("canvas");
      canvas.width = 320;
      canvas.height = 180;
      const g = canvas.getContext("2d"),
        stream = canvas.captureStream(8),
        recorder = new MediaRecorder(stream, { mimeType: "video/webm" }),
        chunks = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      const stopped = new Promise((resolve) => (recorder.onstop = resolve));
      recorder.start();
      let n = 0;
      const interval = setInterval(() => {
        g.fillStyle = n++ % 2 ? "blue" : "cyan";
        g.fillRect(0, 0, 320, 180);
      }, 50);
      await new Promise((r) => setTimeout(r, 650));
      clearInterval(interval);
      recorder.stop();
      await stopped;
      stream.getTracks().forEach((t) => t.stop());
      return [
        ...new Uint8Array(
          await new Blob(chunks, { type: "video/webm" }).arrayBuffer(),
        ),
      ];
    });
    await p.locator("#ce-file").setInputFiles({
      name: "booth-video.webm",
      mimeType: "video/webm",
      buffer: Buffer.from(bytes),
    });
    await boothDialog(p);
    await p.locator("#booth-idle").fill("1");
    await p.locator("#booth-start").click();
    await p.waitForSelector("body.booth-active", { state: "attached" });
    await p.locator("#stage .dot").nth(4).click();
    await p.waitForFunction(() => {
      const v = document.querySelector("#stage .slide.active video");
      return v && !v.paused && v.readyState >= 2;
    });
    await p.waitForTimeout(1600);
    assert.equal(
      await p.locator("#stage .slide.active").getAttribute("data-media-id"),
      "studio-media",
    );
    await p.locator("#stage .slide.active video").evaluate((v) => v.pause());
    await p.waitForFunction(
      () =>
        document.querySelector("#stage .slide.active").dataset.mediaId ===
        "studio-welcome",
      null,
      { timeout: 5000 },
    );
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
});

test("A persistence failure refuses booth activation rather than losing the lock on refresh", async () => {
  const { p, context, errors } = await setup();
  try {
    await boothDialog(p);
    await p.evaluate(() => {
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) {
        if (key.startsWith("presentation-studio-booth:"))
          throw new Error("Storage unavailable for test");
        return original.call(this, key, value);
      };
    });
    await p.locator("#booth-start").click();
    await p.waitForFunction(() =>
      document
        .querySelector("#booth-message")
        .textContent.includes("Storage unavailable"),
    );
    assert.equal(
      await p
        .locator("body")
        .evaluate((b) => b.classList.contains("booth-active")),
      false,
    );
    assert.equal(await p.locator("#full-editor").isVisible(), true);
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
});

test("New presentation keeps the existing save-before-switch guard", async () => {
  const { p, context, errors } = await setup();
  try {
    await reveal(p,"#fe-slide-title");
    await p.locator("#fe-slide-title").fill("Unsaved conference draft");
    await click(p, "#studio-new-open");
    await p.locator("#hub-switch").waitFor({ state: "visible" });
    assert.equal(await p.locator("#nx-wizard").isVisible(), false);
    await p.locator("#hub-save-switch").click();
    await p.locator("#nx-wizard").waitFor({ state: "visible" });
    await selectStartingExample(p,'template');
    await p.locator("#nx-wizard-defaults").click();
    await p.locator("#nx-wizard").waitFor({ state: "hidden" });
    assert.equal(await p.locator(".fe-slide-button").count(), 8);
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
});

test("Existing media drags to placement zones, preserves settings, and undoes in one step", async () => {
  const { p, context, errors } = await setup();
  try {
    await mediaSlide(p);
    const initial = (await json(p)).state.media["studio-media"];
    const handle = p.locator("#fe-preview .ce-placement-handle");
    await handle.scrollIntoViewIfNeeded();
    const h = await handle.boundingBox();
    await p.mouse.move(h.x + h.width / 2, h.y + h.height / 2);
    await p.mouse.down();
    await p.locator(".ce-existing-grid").waitFor({ state: "visible" });
    assert.equal(
      await p.locator(".ce-existing-grid [data-drop-zone=replace]").count(),
      0,
    );
    const zone = await p
      .locator(".ce-existing-grid [data-drop-zone=left]")
      .boundingBox();
    await p.mouse.move(zone.x + zone.width / 2, zone.y + zone.height / 2, {
      steps: 5,
    });
    await p.mouse.up();
    assert.equal(await p.locator(".ce-existing-grid").count(), 0);
    const placed = (await json(p)).state.media["studio-media"];
    assert.equal(placed.layout, "left");
    for (const key of ["src", "caption", "fit", "alt", "frame"])
      assert.equal(placed[key], initial[key]);
    await p.locator("#fe-undo").click();
    assert.deepEqual((await json(p)).state.media["studio-media"], initial);
    await p.locator("#fe-preview .ce-placement-handle").focus();
    await p.keyboard.press("Enter");
    await p.locator(".ce-existing-grid [data-drop-zone=background]").click();
    assert.equal(
      (await json(p)).state.media["studio-media"].layout,
      "background",
    );
    assert.equal(
      await p
        .locator("#fe-preview [data-object-id=primary]")
        .evaluate((el) => getComputedStyle(el).zIndex),
      "0",
    );
    await p.locator("#fe-preview .ce-placement-handle").focus();
    await p.keyboard.press("Enter");
    await p.locator(".ce-existing-grid [data-drop-zone=floating]").click();
    assert((await json(p)).state.media["studio-media"].canvas.placement);
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
});

test("Placement grid cancels on Escape and outside release; normal floating dragging stays free", async () => {
  const { p, context, errors } = await setup();
  try {
    await mediaSlide(p);
    await reveal(p,"#ce-float");
    await p.locator("#ce-float").click();
    const before = (await json(p)).state.media["studio-media"];
    await p.locator("#fe-preview .ce-placement-handle").click();
    assert.equal(await p.locator(".ce-existing-grid").count(), 1);
    await p.keyboard.press("Escape");
    assert.equal(await p.locator(".ce-existing-grid").count(), 0);
    assert.deepEqual((await json(p)).state.media["studio-media"], before);
    const handle = p.locator("#fe-preview .ce-placement-handle");
    await handle.scrollIntoViewIfNeeded();
    const h = await handle.boundingBox();
    await p.mouse.move(h.x + h.width / 2, h.y + h.height / 2);
    await p.mouse.down();
    await p.mouse.move(5, 5, { steps: 4 });
    await p.mouse.up();
    assert.equal(await p.locator(".ce-existing-grid").count(), 0);
    assert.deepEqual((await json(p)).state.media["studio-media"], before);
    const figure = p.locator("#fe-preview .ce-floating");
    const r = await figure.boundingBox();
    await p.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
    await p.mouse.down();
    await p.mouse.move(r.x + r.width / 2 - 20, r.y + r.height / 2 + 10, {
      steps: 4,
    });
    assert.equal(await p.locator(".ce-existing-grid").count(), 0);
    await p.mouse.up();
    assert.notDeepEqual(
      (await json(p)).state.media["studio-media"].canvas.placement,
      before.canvas.placement,
    );
    await reveal(p,"#ce-object-lock");
    await p.locator("#ce-object-lock").click();
    assert.equal(
      await p.locator("#fe-preview .ce-placement-handle").count(),
      0,
    );
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
});

test("Structured placement of additional media keeps both assets and respects primary locks", async () => {
  const { p, context, errors } = await setup();
  try {
    await mediaSlide(p);
    await upload(p, "additional-layout.svg");
    const before = (await json(p)).state,
      extra = before.mediaObjects["studio-media"][0];
    await p.locator("#fe-preview .ce-placement-handle").focus();
    await p.keyboard.press("Enter");
    await p.locator(".ce-existing-grid [data-drop-zone=right]").click();
    const after = (await json(p)).state;
    assert.equal(after.media["studio-media"].src, extra.media.src);
    assert.equal(after.media["studio-media"].layout, "right");
    assert.equal(after.mediaObjects["studio-media"].length, 1);
    assert.equal(
      after.mediaObjects["studio-media"][0].media.src,
      before.media["studio-media"].src,
    );
    assert(after.mediaObjects["studio-media"][0].media.canvas.placement);
    await p.locator("#fe-undo").click();
    assert.deepEqual((await json(p)).state.mediaObjects, before.mediaObjects);
    await p.locator("#ce-objects button").first().click();
    await reveal(p,"#ce-object-lock");
    await p.locator("#ce-object-lock").click();
    await p.locator("#ce-objects button").nth(1).click();
    await p.locator("#fe-preview .ce-placement-handle").focus();
    await p.keyboard.press("Enter");
    await p.locator(".ce-existing-grid [data-drop-zone=left]").click();
    assert.equal(
      (await json(p)).state.media["studio-media"].src,
      before.media["studio-media"].src,
    );
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
});
