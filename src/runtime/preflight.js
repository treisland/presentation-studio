let pfRun = 0;
function pfAllowed() {
  return projectReady && !projectPlayback && !boothActive && !projectDraftPending && $("full-editor").open;
}
function pfPack() {
  return projectCopy({ state: projectState, checkpoints: projectCheckpoints, history: { past: projectPast, future: projectFuture } });
}
function pfNavigate(finding) {
  $("pf-dialog").close("navigate");
  if (!pfAllowed()) return;
  if (finding.slideId && projectModel(finding.slideId)) {
    projectSelected = finding.slideId;
    projectBlockPath = "";
    projectTablePath = "";
    $("fe-search").value = "";
    $("fe-group-filter").value = "all";
    projectSelectTab("content");
    projectList();
    projectForm();
    projectPreview();
    $("fe-slide-title").focus();
  } else {
    weOpenSettings(finding.tab || "recovery");
  }
}
function pfShow(findings) {
  const blockers = findings.filter(finding => finding.severity === "blocker").length;
  $("pf-summary").textContent = `${blockers} blocker(s), ${findings.length - blockers} advisory finding(s). ` +
    (blockers ? "Resolve blockers before delivery." : "No blockers found in these checks.");
  $("pf-findings").replaceChildren();
  for (const finding of findings) {
    const item = document.createElement("li");
    item.dataset.kind = finding.kind;
    item.dataset.severity = finding.severity;
    const title = document.createElement("strong"), detail = document.createElement("p"), action = document.createElement("button");
    title.textContent = `${finding.severity === "blocker" ? "Blocker" : "Advisory"}: ${finding.title}`;
    detail.textContent = finding.detail;
    action.textContent = finding.slideId ? "Edit slide" : "Open " + (finding.tab === "brand" ? "Branding" : "Recovery & reset");
    action.setAttribute("aria-label", action.textContent + ": " + finding.title);
    action.onclick = () => pfNavigate(finding);
    item.append(title, detail, action);
    $("pf-findings").append(item);
  }
}
async function pfScan() {
  if (!pfAllowed()) return;
  const run = ++pfRun;
  $("pf-summary").textContent = "Checking presentation…";
  $("pf-findings").replaceChildren();
  $("pf-scan").disabled = true;
  const measure = document.createElement("div");
  measure.className = "me-preview-stage pf-measure";
  measure.inert = true;
  measure.setAttribute("aria-hidden", "true");
  try {
    await document.fonts.ready;
    if (run !== pfRun || !$("pf-dialog").open || !pfAllowed()) return;
    const pack = pfPack(), state = pack.state, findings = [], loop = state.loops[$("pf-loop").value];
    const add = (kind, severity, title, detail, extra = {}) => findings.push({ kind, severity, title, detail, ...extra });
    const mediaFor = model => [state.media[model.id], ...(state.mediaObjects?.[model.id] || []).map(object => object.media)].filter(Boolean);
    for (const path of projectReferenced(pack)) {
      if (mediaBlobs.has(path)) continue;
      const slide = state.slides.find(model => mediaFor(model).some(media => media.src === path || media.poster === path));
      const logo = [state.brand.logo, state.brand.logoLight, state.brand.logoDark].includes(path);
      add("missing-asset", "blocker", slide ? `${slide.title}: missing media` : logo ? "Missing logo" : "Missing recovery or baseline asset", path + ". Import the complete editable ZIP containing this asset before saving or exporting.", { slideId: slide?.id, tab: logo ? "brand" : "recovery" });
    }
    if (hubBackupContent !== hubContent(pack)) add("backup", "advisory", "Portable backup needs attention", "No matching editable ZIP was created in this session. Export and keep an editable ZIP; browser-local saves are recovery copies, not portable backups.");
    $("full-editor").append(measure);
    for (const [position, model] of state.slides.entries()) {
      const section = state.sections.find(section => section.id === model.group);
      if (model.hidden || section?.hidden) add("visibility", "advisory", `${model.title}: hidden`, `This slide${section?.hidden ? " belongs to a hidden section" : " is hidden"}. Confirm that its visibility is intentional.`, { slideId: model.id });
      else if (loop && !loop.slideIds.includes(model.id)) add("excluded", "advisory", `${model.title}: outside selected loop`, `Not included in “${loop.name}”. This may be intentional for questions or optional material.`, { slideId: model.id });
      const source = allSlides.find(node => node.dataset.mediaId === model.id);
      if (source) {
        const slide = source.cloneNode(true), footer = $("stage").querySelector(":scope>footer").cloneNode(true);
        const content = slide.querySelector(":scope>.media-original") || slide;
        content.replaceChildren(...model.tree.map(projectDOM));
        projectBindSlide(slide, model);
        slide.classList.add("active");
        slide.querySelectorAll("[id]").forEach(node => node.removeAttribute("id"));
        footer.querySelectorAll("[id]").forEach(node => node.removeAttribute("id"));
        slide.querySelectorAll("video").forEach(video => { video.removeAttribute("autoplay"); video.removeAttribute("src"); video.preload = "none"; });
        measure.replaceChildren(slide, footer);
        if (projectLayoutOverflow(measure)) add("overflow", "blocker", `${model.title}: content reaches slide edge`, "Content reaches outside the slide or into its footer. Shorten content, reduce its size, or choose another layout.", { slideId: model.id });
      }
      for (const media of mediaFor(model).filter(media => media.kind === "video")) {
        const type = mediaBlobs.get(media.src)?.type || ({ mp4: "video/mp4", webm: "video/webm", ogg: "video/ogg" })[media.src.split(".").pop().toLowerCase()] || "";
        const support = type ? document.createElement("video").canPlayType(type) : "";
        add("video", "advisory", `${model.title}: verify video playback`, `${media.src}: ${support ? "Browser reports container support" : "Browser support is unknown or unavailable"}. This does not verify the encoded codec or autoplay. Preview the actual file in the delivery browser and OBS if used.`, { slideId: model.id });
      }
      if (position % 10 === 9) {
        await new Promise(resolve => requestAnimationFrame(resolve));
        if (run !== pfRun || !$("pf-dialog").open || !pfAllowed()) return;
      }
    }
    pfShow(findings);
  } catch (error) {
    if (run === pfRun) $("pf-summary").textContent = "Readiness check could not complete: " + error.message;
  } finally {
    measure.remove();
    if (run === pfRun) $("pf-scan").disabled = false;
  }
}
const pfInit = projectInit;
projectInit = function () {
  pfInit();
  const button = document.createElement("button");
  button.id = "pf-open";
  button.textContent = "Check readiness";
  document.querySelector("#full-editor .fe-top-actions").prepend(button);
  const dialog = document.createElement("dialog");
  dialog.id = "pf-dialog";
  dialog.setAttribute("aria-labelledby", "pf-title");
  dialog.innerHTML = '<div class="pf-heading"><h2 id="pf-title">Presentation readiness</h2><button id="pf-close">Back to editor</button></div><p>Read-only checks of assets, slide layout, visibility, backup freshness and video capability. No check guarantees successful playback.</p><label for="pf-loop">Playback scope</label><select id="pf-loop"></select><button id="pf-scan">Run checks again</button><p id="pf-summary" role="status" aria-live="polite"></p><ul id="pf-findings"></ul>';
  $("full-editor").append(dialog);
  button.onclick = () => {
    if (!pfAllowed()) return;
    const loops = $("pf-loop");
    loops.replaceChildren(new Option("All visible slides", ""));
    for (const [id, loop] of Object.entries(projectState.loops)) loops.append(new Option(loop.name, id));
    loops.value = projectState.loops[deck] ? deck : "";
    dialog.returnValue = "";
    dialog.showModal();
    $("pf-close").focus();
    pfScan();
  };
  $("pf-close").onclick = () => dialog.close();
  $("pf-scan").onclick = pfScan;
  $("pf-loop").onchange = pfScan;
  dialog.addEventListener("cancel", event => { event.preventDefault(); event.stopPropagation(); dialog.close(); });
  dialog.addEventListener("keydown", event => {
    event.stopPropagation();
    if (event.key === "Escape") {
      event.preventDefault();
      dialog.close();
    }
  });
  dialog.addEventListener("close", () => {
    pfRun++;
    $("pf-scan").disabled = false;
    if (dialog.returnValue !== "navigate") button.focus();
  });
};
