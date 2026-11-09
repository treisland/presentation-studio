function paPreviewStage(model) {
  const stage = document.createElement("div"); stage.className = "me-preview-stage pa-review-stage";
  const slide = document.createElement("section"); slide.className = "slide active " + model.classes;
  slide.setAttribute("aria-hidden", "false");
  model.tree.forEach(node => slide.append(projectDOM(node)));
  stage.append(slide); commandPaint(slide, model.commands);
  stage.inert = true;
  return stage;
}
function paMeasureFit(pack) {
  // Detached candidate DOM only: do not call the editor renderer or bind live selections/media.
  const host = document.createElement("div"); host.className = "pa-fit-host"; host.setAttribute("aria-hidden", "true");
  document.body.append(host);
  try {
    return pack.state.slides.map(model => {
      const stage = paPreviewStage(model); host.replaceChildren(stage);
      authoringGeometry(stage);
      const overflowing = [];
      for (const block of stage.querySelectorAll(".db-block")) {
        const bounds = block.getBoundingClientRect();
        const children = [...block.querySelectorAll("h1,h2,h3,p,ul,pre,table,.data-content")];
        const overflow = block.scrollHeight > block.clientHeight + 3 || block.scrollWidth > block.clientWidth + 3 || children.some(child => {
          const rect = child.getBoundingClientRect();
          return rect.bottom > bounds.bottom + 3 || rect.right > bounds.right + 3 || child.scrollWidth > child.clientWidth + 3 || child.scrollHeight > child.clientHeight + 3;
        });
        if (overflow) overflowing.push(block.classList.contains("pa-title") ? "Title" : (projectText(model.tree.find(node => dbID(node) && block.classList.contains(dbID(node)))) || "Element").slice(0, 70));
      }
      return overflowing.length ? ["Content does not fit: " + overflowing.join("; ") + ". Resize, choose another layout, split the slide or shorten the text. No content was removed."] : [];
    });
  } finally { host.remove(); }
}
function paRenderReview(candidate, summary) {
  const report = candidate.report || [], fit = paMeasureFit(candidate.pack);
  const label = document.createElement("label"); label.textContent = "Preview slide";
  const select = document.createElement("select"); select.id = "pa-preview-select";
  candidate.pack.state.slides.forEach((slide, i) => select.add(new Option((i + 1) + ". " + slide.title, String(i))));
  label.append(select); summary.append(label);
  const viewport = document.createElement("div"); viewport.className = "pa-review-viewport"; viewport.setAttribute("aria-label", "Non-interactive slide preview");
  const description = document.createElement("p"); description.id = "pa-preview-description";
  const layoutLabel = document.createElement("label"); layoutLabel.textContent = "Layout for this slide";
  const override = document.createElement("select"); override.id = "pa-layout-override";
  Object.entries(paLayoutCatalog).forEach(([key, item]) => override.add(new Option(item.name, key)));
  layoutLabel.append(override);
  summary.append(viewport, description, layoutLabel);
  let observer;
  const scale = () => {
    const stage = viewport.firstElementChild;
    if (stage) { stage.style.transform = "scale(" + viewport.clientWidth / 1920 + ")"; authoringGeometry(stage); }
  };
  const show = () => {
    const i = Number(select.value), model = candidate.pack.state.slides[i], details = report[i];
    viewport.replaceChildren(paPreviewStage(model));
    override.value = candidate.authoringDoc.slides[i].layout || "auto";
    description.textContent = "Slide " + (i + 1) + " · " + paLayoutCatalog[details.selected].name + " · " +
      (details.elements.length ? details.elements.join(", ") : "Title only") + ". Preview is inert; sources open only after import and user action.";
    scale();
  };
  select.onchange = show;
  override.onchange = () => lwRun(async () => {
    const index = Number(select.value), documentCopy = projectCopy(candidate.authoringDoc);
    documentCopy.slides[index].layout = override.value;
    const built = paBuild(documentCopy, candidate.pack.meta.id);
    // Retain the actual disk snapshot/fingerprint. A review-only layout choice is unsaved disk work.
    lwReview({ ...candidate, ...built, authoringDoc: documentCopy, reviewChanged: true, previewIndex: index });
  });
  const warnings = document.createElement("ul"); warnings.id = "pa-review-warnings";
  report.forEach((details, i) => {
    for (const message of [...details.notices, ...fit[i]]) {
      const item = document.createElement("li"); item.textContent = "Slide " + (i + 1) + ": " + message; warnings.append(item);
    }
  });
  if (!warnings.children.length) {
    const item = document.createElement("li"); item.textContent = "No measured text overflow detected. Review every slide, sources and reading order before presenting."; warnings.append(item);
  }
  summary.append(warnings);
  select.value = String(candidate.previewIndex || 0); show();
  // Only one visible preview observer at a time; disconnect when review is replaced or closed.
  lwPreviewCleanup();
  observer = new ResizeObserver(scale); observer.observe(viewport);
  lwPreviewCleanup = () => { observer.disconnect(); };
}
let lwPreviewCleanup = () => {};
function paMountReflow() {
  const dialog = document.createElement("dialog"); dialog.id = "pa-reflow"; dialog.setAttribute("aria-labelledby", "pa-reflow-title");
  dialog.innerHTML = '<h2 id="pa-reflow-title">AI slide layout</h2><p>Reposition native elements without regenerating their content. Changes can be undone. Ungroup and unlock elements first.</p><label>Layout<select id="pa-reflow-layout"></select></label><p id="pa-reflow-message" role="status"></p><button id="pa-reflow-apply">Apply layout</button><button id="pa-reflow-close">Close</button>';
  document.body.append(dialog);
  for (const [key, item] of Object.entries(paLayoutCatalog)) $("pa-reflow-layout").add(new Option(item.name, key));
  const button = document.createElement("button"); button.id = "pa-reflow-open"; button.textContent = "AI slide layout…";
  $("hub-project-menu").querySelector(".hub-menu-items").append(button);
  button.onclick = () => {
    if (projectPlayback || boothBlocked() || projectDraftPending) return;
    hubMenusClose(); const slide = projectModel();
    const supported = /\bpa-slide\b/.test(slide?.classes || "");
    $("pa-reflow-apply").disabled = !supported;
    $("pa-reflow-message").textContent = supported ? "Selected slide: " + slide.title : "Select a slide created by AI authoring import first.";
    $("pa-reflow-layout").value = slide?.classes.match(/\bpa-layout-([\w-]+)/)?.[1] || "auto";
    dialog.showModal();
  };
  $("pa-reflow-apply").onclick = () => {
    vbEnd(false); projectFlush();
    const before = studioEditing.read(), selected = $("pa-reflow-layout").value, slide = projectModel();
    const blocks = slide.tree.filter(node => dbID(node) && !mgHas(node, "pa-title") && !mgHas(node, "pa-sources")).map(node => ({ type: paNodeType(node) }));
    const choice = paChooseLayout({ layout: selected, blocks }, projectState.slides.indexOf(slide));
    const result = studioEditing.apply({ apiVersion: 1, projectId: before.projectId, expectedRevision: before.revision,
      operations: [{ type: "authoring.layout", slideId: slide.id, layout: selected }] });
    $("pa-reflow-message").textContent = result.ok
      ? ["Applied " + paLayoutCatalog[choice.selected].name + ".", ...choice.notices, ...paMeasureFit({ state: { slides: [projectModel()] } })[0]].join(" ")
      : result.message;
  };
  $("pa-reflow-close").onclick = () => dialog.close();
}
const paReflowInit = projectInit;
projectInit = function (...args) { const result = paReflowInit(...args); paMountReflow(); return result; };
