export async function reveal(page, selector) {
  if(await page.locator('#ld-tabs').count()) {
    const navigator = await page.locator(selector).evaluate(element=>element.closest('#sp-layer-panel')?'layers':element.closest('#ld-slides-pane')?'slides':null);
    if(navigator==='layers')await page.locator('#ld-reveal-layers').click();
    if(navigator==='slides') {if(!await page.locator('#we-slides').isVisible())await page.locator('#we-toggle-slides').click();await page.locator('#ld-tab-slides').click();}
  }
  const popup=await page.locator(selector).evaluate(element=>element.closest('[popover]')?.id);
  if(popup==='is-color-popover') {
    if(!await page.locator('#'+popup).evaluate(element=>element.matches(':popover-open')))await openColorEditor(page,await page.locator('#sp-slot').inputValue());
    const colorTab=await page.locator(selector).evaluate(element=>element.closest('#is-panel-custom')?'custom':element.closest('#is-panel-project')?'project':element.closest('#is-panel-theme')?'theme':null);
    if(colorTab)await page.locator('#is-tab-'+colorTab).click();
  }else if(popup&&!await page.locator('#'+popup).evaluate(element=>element.matches(':popover-open'))){const trigger='[data-component-target="'+popup+'"]';await reveal(page,trigger);await page.locator(trigger).click();}
  if (await page.locator('#wp-tabs').count()) {
    const part = await page.locator(selector).evaluate(el => el.closest('[data-wp-part]')?.dataset.wpPart || (el.closest('#we-inspector .fe-tabs') ? 'content' : null));
    if (['content','arrange','style'].includes(part)) {if(!await page.locator('#we-inspector').isVisible())await page.locator('#we-toggle-inspector').click();await page.locator('#wp-tab-' + part).click();}
  }
  // Contextual Inspector fields require the explicit destination when no matching object is selected.
  const mediaContext = await page.locator(selector).evaluate(el => !!el.closest('#ce-panel,#mi-content,#mi-placement'));
  if (mediaContext && await page.locator('#ce-panel').getAttribute('data-ic-visible') === 'false') {
    await inspectContent(page,'Media');
    const part=await page.locator(selector).evaluate(el=>el.closest('[data-wp-part]')?.dataset.wpPart);
    if(['content','arrange','style'].includes(part))await page.locator('#wp-tab-'+part).click();
  }
  const slideContext=await page.locator(selector).evaluate(el=>el.id==='fe-slide-title'||!!el.closest('#ic-slide-fields'));
  if(slideContext&&await page.locator('#fe-slide-title').getAttribute('data-ic-visible')==='false')await page.locator('#ic-slide-settings').click();
  const gridContext=await page.locator(selector).evaluate(el=>!!el.closest('#mg-panel'));
  if(gridContext&&await page.locator('#mg-panel').getAttribute('data-ic-visible')==='false')await page.locator('#fe-preview .mg-cell-action').first().click();
  const ids = await page.locator(selector).evaluate((element) => {
    const ids = [];
    for (let node = element.parentElement; node; node = node.parentElement)
      if (node.tagName === "DETAILS") ids.unshift(node.id);
    return ids;
  });
  for (const id of ids)
    if ((await page.locator("#" + id).getAttribute("open")) === null)
      await page.locator("#" + id + ">summary").click();
}
export async function openColorEditor(page, slot, tab='theme') {
  const popup=page.locator('#is-color-popover');
  if(await popup.evaluate(element=>element.matches(':popover-open')))await page.getByRole('button',{name:'Close color picker',exact:true}).click();
  if(!await page.locator('#we-inspector').isVisible())await page.locator('#we-toggle-inspector').click();
  await page.locator('#wp-tab-style').click();
  await reveal(page,'#is-color-'+slot);await page.locator('#is-color-'+slot).click();
  await page.locator('#is-tab-'+tab).click();
}
export async function click(page, selector) {
  if(await page.locator('#ci-notes').count()&&['#we-context-media','#we-context-slide'].includes(selector)){await inspectContent(page,selector.endsWith('media')?'Media':'Slide');return;}
  await reveal(page, selector);
  await page.locator(selector).click();
}
export async function selectStartingExample(page, choice) {
  await page.locator('#nx-wizard').waitFor({state:'visible'});
  await click(page,'#lc-examples-wizard');
  const id=choice==='template'?'studio':choice.split('-')[0],mode=choice==='template'?'demo':choice.split('-')[1];
  await page.locator('.lc-example-card[data-example="'+id+'"] button').click();
  await page.locator(mode==='starter'?'#lc-use-starter':'#lc-use-demo').click();
  if(await page.locator('#hub-switch').evaluate(n=>n.open))await page.locator('#hub-save-switch').click();
  await page.locator('#lc-examples').waitFor({state:'hidden'});
  await page.locator('#nx-wizard-name').waitFor({state:'visible'});
  // Return to the start page so existing setup tests exercise all four steps.
  await page.locator('#nx-wizard-back').click();
}
export async function addSlide(page, template) {
  await page.locator("#studio-gallery-open").click();
  await page.locator('[data-template="' + template + '"]').click();
  await page.locator("#studio-gallery-apply").click();
}
export async function selectTab(page, name) {
  if(name==='Layers'&&await page.locator('#ld-reveal-layers').count()){await page.locator('#ld-reveal-layers').click();return;}
  if (await page.locator("#we-settings-open").count()) {
    const project = [
      "Branding",
      "Presentation settings",
      "Sections",
      "Kiosk loops",
      "Recovery & reset",
    ].includes(name);
    const open = await page.locator("#we-settings").evaluate((el) => el.open);
    if (project && !open) await page.locator("#we-settings-open").click();
    else if (!project && open) await page.locator("#we-settings-close").click();
    if (name === "Content") name = "Slide";
  }
  if(await page.locator('#ci-notes').count()&&['Slide','Text','Tables','Commands','Notes','Media'].includes(name)){await inspectContent(page,name);return;}
  if (await page.locator('#wp-tabs').count() && !await page.locator('#we-settings').evaluate(el=>el.open)) await page.locator('#wp-tab-content').click();
  await page.getByRole("tab", { name, exact: true }).click();
}
export async function inspectContent(page, name) {
  if(!await page.locator('#we-inspector').isVisible())await page.locator('#we-toggle-inspector').click();
  if(name==='Slide'){await page.locator('#wp-tab-content').click();if(await page.locator('#ic-slide-settings').isVisible())await page.locator('#ic-slide-settings').click();return;}
  if(name==='Notes'){if(!await page.locator('#ci-notes').evaluate(node=>node.open))await page.locator('#ci-notes > summary').click();return;}
  await page.locator('#wp-tab-content').click();
  const kind=await page.locator('#we-inspector').getAttribute('data-ic-kind');
  if(name==='Media'&&['media','grid'].includes(kind))return;
  const selector={Media:'.media-box',Tables:'table',Commands:'.terminal',Text:'h1,p'}[name];
  const element=page.locator('#fe-preview').locator(selector).first();
  if(await element.count()) {
    const key=await element.evaluate(node=>node.closest('[data-sp-key]')?.dataset.spKey);
    if(key)await selectElement(page,key);
    else await element.click();
    const prefix={Tables:'table:',Commands:'code:',Text:'text:'}[name];
    if(prefix&&await page.locator('#ci-field-target').isVisible()){
      const value=await page.locator('#ci-field-select option').evaluateAll((options,prefix)=>options.find(option=>option.value.startsWith(prefix))?.value,prefix);
      if(value)await page.locator('#ci-field-select').selectOption(value);
    }
    if(name==='Tables')await reveal(page,'#fe-table-grid');
    return;
  }
  if(name==='Media'){
    await page.locator('#component-open').click();await page.getByRole('tab',{name:'Blocks',exact:true}).click();await page.locator('#component-search').fill('image');
    const chooser=page.waitForEvent('filechooser');
    await page.getByRole('button',{name:'Insert image or video…',exact:true}).click();
    await chooser;
  }
}
export async function selectElement(page,key) {
  const slides=await page.locator('#ld-tab-slides').getAttribute('aria-selected')==='true';
  await page.locator('#ld-reveal-layers').click();
  await page.locator('.sp-layer-row[data-key="'+key+'"] button').first().click();
  if(slides)await page.locator('#ld-tab-slides').click();
}

export async function chooseViewerSlide(page,index) {
  const label=await page.locator('#dots .dot').nth(index).getAttribute('aria-label');
  const title=label.replace(/^Slide \d+: /,'');
  await page.locator('#menu').click();
  await page.locator('#vf-search').fill(title);
  await page.locator('#vf-results .vf-slide').filter({hasText:title}).first().click();
}
