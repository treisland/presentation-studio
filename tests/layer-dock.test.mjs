import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {resolve} from 'node:path';
import {snapshot, operations} from './collection-ui.mjs';

const browser = await chromium.launch({headless:true, executablePath:process.env.CHROMIUM_EXECUTABLE_PATH, args:['--no-sandbox']});
test.after(() => browser.close());
async function open(width = 1440) {
  const page = await browser.newPage({viewport:{width,height:900}}), errors = [];
  page.setDefaultTimeout(10000);
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('file://' + resolve('dist/presentation-studio.html'));
  await page.locator('#open-full-editor').click();
  return {page,errors};
}
async function addLayers(page) {
  const slideId = (await snapshot(page)).state.slides[0].id;
  const result = await operations(page, [{type:'block.create',slideId,kind:'rectangle'}, {type:'block.create',slideId,kind:'circle'}]);
  assert.equal(result.ok, true);
  const [a,b] = result.created;
  assert.equal((await operations(page, [{type:'element.rename',slideId,keys:[a],name:'Focus panel'}, {type:'element.rename',slideId,keys:[b],name:'Other shape'}])).ok, true);
  return {slideId,a,b};
}
const row = (page,key) => page.locator('.sp-layer-row[data-key="' + key + '"]');
test('inline layer names cancel, commit with Enter and Undo without changing content; locked and stale drafts cannot rename', async () => {
  const {page,errors} = await open();
  try {
    const {slideId,a} = await addLayers(page);
    await page.locator('#wp-tab-style').click(); await page.locator('#wp-tab-layers').click();
    await row(page,a).locator('button').first().click();
    const before = await snapshot(page);
    await row(page,a).locator('button').first().press('F2');
    const editor = page.locator('.ld-inline-name');
    assert.equal(await editor.getAttribute('maxlength'), '80');
    await editor.fill('Composing draft');
    for (const key of ['Enter', 'Escape']) {
      await editor.evaluate((el,key) => el.dispatchEvent(new KeyboardEvent('keydown',{key,isComposing:true,bubbles:true,cancelable:true})),key);
      assert.equal(await editor.count(), 1);
      assert.equal(await editor.inputValue(), 'Composing draft');
      assert.deepEqual(await snapshot(page), before);
    }
    await editor.fill('Cancelled name'); await editor.press('Escape');
    assert.deepEqual(await snapshot(page), before);
    assert.equal(await row(page,a).locator('button').first().evaluate(el => document.activeElement === el), true);
    await row(page,a).locator('.ld-name').dblclick();
    await editor.fill('Inline panel'); await editor.press('Enter');
    const after = await snapshot(page);
    assert.equal(after.state.design.slides[slideId].objects[a].name, 'Inline panel');
    assert.deepEqual(after.state.slides, before.state.slides);
    assert.equal(await row(page,a).locator('.ld-name').textContent(), 'Inline panel');
    assert.equal(await page.locator('#wp-tab-style').getAttribute('aria-selected'), 'true');
    await page.locator('#fe-undo').click();
    assert.deepEqual((await snapshot(page)).state, before.state);
    await operations(page,[{type:'design.meta',slideId,keys:[a],changes:{locked:true}}]);
    await row(page,a).locator('button').first().press('F2');
    assert.equal(await editor.count(), 0);
    await operations(page,[{type:'design.meta',slideId,keys:[a],changes:{locked:false}}]);
    await row(page,a).locator('button').first().press('F2'); await editor.fill('Stale name');
    // Keep the old input to simulate a delayed Enter after a revision replaced its row.
    await editor.evaluate(el => { window.layerDockOldInput = el; });
    await operations(page,[{type:'design.background',slideId,color:{role:'surface'}}]);
    const revised = await snapshot(page);
    await page.evaluate(() => { window.layerDockOldInput.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})); delete window.layerDockOldInput; });
    assert.deepEqual(await snapshot(page), revised);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});
test('shared navigator keyboard tabs preserve Style, project state and a single active pane', async () => {
  const {page,errors} = await open();
  try {
    await page.locator('#wp-tab-style').click();
    const before = await snapshot(page);
    await page.locator('#ld-tab-slides').focus(); await page.keyboard.press('End');
    assert.equal(await page.locator('#wp-tab-layers').getAttribute('aria-selected'), 'true');
    assert.equal(await page.locator('#wp-tab-layers').evaluate(el => document.activeElement === el), true);
    assert.equal(await page.locator('#ld-slides-pane').isVisible(), false);
    assert.equal(await page.locator('#sp-layer-panel').isVisible(), true);
    assert.equal(await page.locator('#wp-tab-style').getAttribute('aria-selected'), 'true');
    assert.equal(await page.locator('#wp-tabs #wp-tab-layers').count(), 0);
    assert.equal(await page.locator('#wp-tab-layers').count(), 1);
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('#ld-tab-slides').getAttribute('aria-selected'), 'true');
    await page.keyboard.press('ArrowLeft'); await page.keyboard.press('Home');
    assert.equal(await page.locator('#sp-layer-panel').isVisible(), false);
    assert.equal(await page.locator('#ld-slides-pane').isVisible(), true);
    assert.deepEqual(await snapshot(page), before); assert.deepEqual(errors, []);
  } finally { await page.close(); }
});
test('layer keyboard selection, visibility, locks, rename and search keep Style available', async () => {
  const {page,errors} = await open();
  try {
    const {slideId,a,b} = await addLayers(page);
    await page.locator('#wp-tab-style').click(); await page.locator('#wp-tab-layers').click();
    await row(page,a).locator('button').first().focus(); await page.keyboard.press('Enter');
    assert.equal(await row(page,a).locator('button').first().getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('#ld-selection-count').textContent(), '1 layer selected');
    assert.equal(await page.locator('#wp-tab-style').getAttribute('aria-selected'), 'true');
    assert.equal(await row(page,a).locator('.ld-name').textContent(), 'Focus panel');
    assert.equal(await row(page,a).getByRole('button',{name:/^Move .* forward$/}).isVisible(), false);
    await page.getByRole('button',{name:'Hide Focus panel',exact:true}).click();
    assert.equal(await page.getByRole('button',{name:'Show Focus panel',exact:true}).getAttribute('data-ld-state'), 'hidden');
    assert.equal(await page.getByRole('button',{name:'Show Focus panel',exact:true}).getAttribute('aria-pressed'), null);
    assert.equal(await page.locator('#fe-preview .' + a).isVisible(), false);
    await page.locator('#visibility-show-hidden').check();
    assert.equal(await page.locator('#fe-preview .' + a).isVisible(), true);
    await page.getByRole('button',{name:'Show Focus panel',exact:true}).click();
    await page.getByRole('button',{name:'Lock Focus panel',exact:true}).focus(); await page.keyboard.press('Enter');
    assert.equal(await page.getByRole('button',{name:'Unlock Focus panel',exact:true}).getAttribute('data-ld-state'), 'locked');
    assert.equal(await page.getByRole('button',{name:'Unlock Focus panel',exact:true}).getAttribute('aria-pressed'), null);
    assert.match(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), /^Unlock /);
    assert.equal(await page.getByRole('button',{name:'Hide Focus panel',exact:true}).isDisabled(), true);
    await row(page,b).locator('input').check();
    assert.equal(await page.locator('#ld-selection-count').textContent(), '2 layers selected');
    assert.equal(await page.locator('#visibility-hide').isDisabled(), true);
    const locked = await snapshot(page);
    assert.equal((await operations(page,[{type:'design.appearance',slideId,keys:[a,b],style:{fill:'transparent'}}])).code,'LOCKED');
    assert.deepEqual((await snapshot(page)).state, locked.state);
    await page.locator('#en-search').fill('Focus panel');
    assert.equal(await row(page,b).isVisible(), false);
    assert.equal(await row(page,a).isVisible(), true);
    assert.equal(await page.locator('#ld-selection-count').textContent(), '2 layers selected');
    await page.locator('#en-search').fill('');
    await page.getByRole('button',{name:'Unlock Focus panel',exact:true}).click();
    await row(page,a).locator('button').first().click();
    await page.locator('#ld-options summary').click();
    const beforeReorder = await snapshot(page);
    await page.locator('#ld-move-forward').click();
    assert.notDeepEqual((await snapshot(page)).state, beforeReorder.state);
    await page.locator('#fe-undo').click();
    assert.deepEqual((await snapshot(page)).state, beforeReorder.state);
    await page.locator('#sp-name').fill('Renamed panel'); await page.locator('#sp-name').press('Tab');
    assert.equal(await row(page,a).locator('.ld-name').textContent(), 'Renamed panel');
    await page.locator('#ld-reset-name').click();
    assert.notEqual(await row(page,a).locator('.ld-name').textContent(), 'Renamed panel');
    assert.equal(await page.locator('#wp-tab-style').getAttribute('aria-selected'), 'true');
    assert.equal(await page.locator('#ld-options #visibility-hide').count(),1);
    assert.equal(await page.locator('#ld-options #visibility-reveal').count(),1);
    assert.equal(await page.locator('#ld-visibility #visibility-show-hidden').count(),1);
    assert.equal(await page.locator('#visibility-panel #visibility-scope').count(),1);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});
test('long layer lists scroll through the shared footprint to reachable options and visibility', async () => {
  const {page,errors} = await open();
  try {
    const slideId = (await snapshot(page)).state.slides[0].id;
    assert.equal((await operations(page, Array.from({length:28}, () => ({type:'block.create',slideId,kind:'text'})))).ok, true);
    await page.locator('#wp-tab-layers').click();
    assert.equal(await page.locator('#sp-layer-panel').evaluate(el => el.scrollHeight > el.clientHeight && el.clientHeight > 100), true);
    await page.locator('#visibility-show-hidden').scrollIntoViewIfNeeded();
    const panel = await page.locator('#sp-layer-panel').boundingBox(), control = await page.locator('#visibility-show-hidden').boundingBox();
    assert(control.y >= panel.y && control.y + control.height <= panel.y + panel.height);
    await page.locator('#visibility-show-hidden').check();
    assert.equal(await page.locator('#visibility-show-hidden').isChecked(), true);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});
test('keyboard layer reorder is undoable and laptop reveal retains the inspector tab', async () => {
  const {page,errors} = await open(1024);
  try {
    const {a} = await addLayers(page);
    await page.locator('#wp-tab-style').click();
    assert.equal(await page.locator('#we-slides').isVisible(), false);
    await page.locator('#ld-reveal-layers').click();
    assert.equal(await page.locator('#we-slides').isVisible(), true);
    assert.equal(await page.locator('#we-toggle-slides').getAttribute('aria-expanded'), 'true');
    assert.equal(await page.locator('#wp-tab-style').getAttribute('aria-selected'), 'true');
    await row(page,a).locator('button').first().click();
    const before = await snapshot(page);
    await row(page,a).locator('button').first().press('Alt+ArrowUp');
    assert.notDeepEqual((await snapshot(page)).state, before.state);
    assert.equal(await row(page,a).locator('button').first().evaluate(el => document.activeElement === el), true);
    await page.locator('#fe-undo').click();
    assert.deepEqual((await snapshot(page)).state, before.state);
    await page.setViewportSize({width:1440,height:900}); await page.setViewportSize({width:1024,height:900});
    assert.equal(await page.locator('#we-slides').isVisible(), true);
    assert.equal(await page.locator('#wp-tab-style').getAttribute('aria-selected'), 'true');
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});
