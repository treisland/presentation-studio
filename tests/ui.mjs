export async function reveal(page, selector) {
  const popup=await page.locator(selector).evaluate(element=>element.closest('[popover]')?.id);
  if(popup&&!await page.locator('#'+popup).evaluate(element=>element.matches(':popover-open'))){const trigger='[data-component-target="'+popup+'"]';await reveal(page,trigger);await page.locator(trigger).click();}
  if (await page.locator('#wp-tabs').count()) {
    const part = await page.locator(selector).evaluate(el => el.closest('[data-wp-part]')?.dataset.wpPart || (el.closest('#we-inspector .fe-tabs') ? 'content' : null));
    if (['content','arrange','style'].includes(part)) await page.locator('#wp-tab-' + part).click();
  }
  // Contextual Inspector fields require the explicit destination when no matching object is selected.
  const mediaContext = await page.locator(selector).evaluate(el => !!el.closest('#ce-panel'));
  if (mediaContext && await page.locator('#ce-panel').getAttribute('data-ic-visible') === 'false') {
    await page.locator('#wp-tab-content').click();await page.locator('#we-context-media').click();
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
export async function click(page, selector) {
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
  if (await page.locator('#wp-tabs').count() && !await page.locator('#we-settings').evaluate(el=>el.open)) await page.locator('#wp-tab-content').click();
  await page.getByRole("tab", { name, exact: true }).click();
}
