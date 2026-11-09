// Portable AI imports and downloads. Browser drafts remain independent recovery.
const lwPackFiles = /* @AUTHORING_PACK */;
const lwLimits = { input: 100 * 1024 * 1024, expanded: 200 * 1024 * 1024, json: 20 * 1024 * 1024, entries: 1000 };
let lwCandidate = null, lwBusy = false, lwEpoch = 0;
function lwMessage(message) { $("lw-message").textContent = message; }
function lwButton(label, id, action) {
  const button = document.createElement("button");
  button.textContent = label; if (id) button.id = id;
  button.onclick = () => lwRun(action); return button;
}
async function lwRun(action) {
  if (lwBusy || projectPlayback || boothBlocked()) return;
  lwBusy = true;
  $("lw-panel").setAttribute("aria-busy", "true");
  try { await action(); }
  catch (error) {
    lwMessage(error.name === "AbortError" ? "Operation cancelled. The current presentation remains open." : error.message || String(error));
  } finally {
    lwBusy = false; $("lw-panel").setAttribute("aria-busy", "false"); lwStatus();
  }
}
function lwStatus() {
  if (!$("lw-destination") || !projectReady) return;
  $("lw-destination").textContent = "Browser project · export an editable ZIP for a portable backup";
  $("lw-save-copy").disabled = lwBusy;
  $("lw-review-open").disabled = !lwCandidate || lwBusy;
  $("lw-review-copy").disabled = !lwCandidate || lwBusy;
}
function lwSafePath(path) {
  return typeof path === "string" && path.length <= 500 && /^assets\/[\w./ -]+$/i.test(path) &&
    !path.split("/").some(part => !part || part === "." || part === "..") && !/[\\:%?#]/.test(path);
}
function lwParseJSON(text) {
  try { return JSON.parse(text); }
  catch (error) {
    throw new Error("Could not parse JSON: " + error.message +
      (/end of JSON|unterminated|unexpected end/i.test(error.message) || !text.trim()
        ? ". The file may be empty or truncated. Ask your LLM to return the complete JSON, including closing brackets, and save/download the whole response."
        : ". Supply one complete JSON document without Markdown fences or commentary."));
  }
}
function lwCheckJSON(raw) {
  let count = 0;
  function visit(value, depth = 0) {
    if (++count > 400000 || depth > 80) throw new Error("Project is too complex to open safely.");
    if (value && typeof value === "object") for (const [key, child] of Object.entries(value)) {
      if (["__proto__", "prototype", "constructor"].includes(key)) throw new Error("Unsupported object key: " + key);
      visit(child, depth + 1);
    }
  }
  visit(raw);
  // Reject unsafe original paths before legacy sanitizers can omit them.
  function assets(state) {
    if (!state) return;
    const paths = [state.brand?.logo, state.brand?.logoLight, state.brand?.logoDark];
    for (const media of [...Object.values(state.media || {}), ...Object.values(state.mediaObjects || {}).flatMap(items => items.map(item => item.media))])
      if (media) paths.push(media.src, media.poster);
    if (paths.some(path => path && !lwSafePath(path))) throw new Error("Unsafe asset path; only relative assets/ paths inside the project are supported.");
    assets(state.startingState);
  }
  assets(raw.state);
  for (const item of raw.checkpoints || []) assets(item.state);
  for (const item of [...raw.history?.past || [], ...raw.history?.future || []]) assets(item);
}
async function lwLoad(file, { identity = null, browserAssets = false, allowLegacy = false, allowMissingAssets = false, cancelled = () => false } = {}) {
  if (file.size > lwLimits.input) throw new Error("File exceeds the 100 MB input limit.");
  if (!/\.(json|zip)$/i.test(file.name)) throw new Error("Choose a presentation JSON or editable ZIP.");
  let raw, zip = null, expanded = 0;
  const decoded = new Map();
  if (/\.zip$/i.test(file.name)) {
    zip = await JSZip.loadAsync(file);
    const entries = Object.values(zip.files);
    if (entries.length > lwLimits.entries) throw new Error("ZIP has too many entries.");
    for (const entry of entries) {
      const path = entry.unsafeOriginalName || entry.name;
      if (/^[\\/]|^[a-z]:/i.test(path) || path.split(/[\\/]/).includes("..")) throw new Error("Unsafe ZIP entry path.");
      if (!entry.dir && path !== "presentation.json" && !lwSafePath(path) && path !== "index.html" && path !== "README.txt")
        throw new Error("Unsupported ZIP entry: " + path);
      if (entry.dir || ["index.html", "README.txt"].includes(path)) continue;
      if (cancelled()) throw new DOMException("Cancelled", "AbortError");
      // Bound expansion while streaming, not after allocating a decompression bomb.
      const bytes = await new Promise((resolve, reject) => {
        const chunks = []; let length = 0;
        const stream = entry.internalStream("uint8array");
        stream.on("data", chunk => {
          length += chunk.length; expanded += chunk.length;
          if (expanded > lwLimits.expanded || (path === "presentation.json" && length > lwLimits.json) || cancelled()) {
            stream.pause(); reject(new Error("ZIP expansion limit exceeded or operation cancelled.")); return;
          }
          chunks.push(chunk);
        });
        stream.on("error", reject).on("end", () => {
          const all = new Uint8Array(length); let offset = 0;
          for (const chunk of chunks) { all.set(chunk, offset); offset += chunk.length; } resolve(all);
        }).resume();
      });
      decoded.set(path, bytes);
    }
    if (!decoded.has("presentation.json")) throw new Error("ZIP is missing presentation.json.");
    raw = lwParseJSON(new TextDecoder("utf-8", { fatal: true }).decode(decoded.get("presentation.json")));
  } else {
    if (file.size > lwLimits.json) throw new Error("JSON exceeds the 20 MB limit.");
    raw = lwParseJSON(await file.text());
  }
  lwCheckJSON(raw);
  if (allowLegacy && raw?.schemaVersion === 1) return { legacy: true };
  const authoring = raw?.format === "presentation-studio-authoring";
  if (authoring && file.size > paLimits.bytes) throw new Error("Authoring JSON exceeds the 2 MB limit.");
  const built = authoring ? paBuild(raw, identity) : { pack: projectValidatePack(raw) };
  const pack = built.pack;
  if (pack.playbackOnly) throw new Error("Choose an editable project, not a playback export.");
  const assets = new Map();
  for (const path of projectReferenced(pack)) {
    if (!lwSafePath(path)) throw new Error("Unsafe project asset path.");
    if (zip) {
      if (!decoded.has(path)) throw new Error("Missing asset: " + path);
      assets.set(path, new Blob([decoded.get(path)], { type: hubMime(path) }));
    } else if (browserAssets) {
      await hubDatabase();
      const blob = await projectDBGet("assets", pack.meta.id + "|" + path);
      // Legacy JSON imports intentionally allow readiness diagnostics and repair of incomplete projects.
      // Reviewed imports and all ZIP imports remain strict.
      if (!blob && allowMissingAssets) continue;
      if (!blob) throw new Error("Media is missing from this file. Open the complete editable ZIP; JSON alone does not include media bytes.");
      assets.set(path, blob);
    } else throw new Error("JSON references media. Use a complete editable ZIP.");
  }
  return { ...built, assets, authoring, ...(authoring ? { authoringDoc: raw } : {}) };
}
function lwReview(candidate) {
  lwPreviewCleanup();
  lwCandidate = candidate;
  const summary = $("lw-review"); summary.replaceChildren();
  const title = document.createElement("h3"); title.textContent = candidate.pack.meta.name; summary.append(title);
  const info = document.createElement("p");
  info.textContent = candidate.pack.state.slides.length + " slides · " + candidate.assets.size + " media assets. " +
    "Opening preserves a differing same-ID browser version; Open as copy assigns an independent project ID. " +
    "Validation does not verify facts, sources or guaranteed layout fit.";
  summary.append(info);
  const list = document.createElement("ol");
  for (const slide of candidate.pack.state.slides) {
    const item = document.createElement("li"), words = slide.tree.map(projectText).join(" ").split(/\s+/).length;
    item.textContent = slide.title + (words > 80 ? " — may be crowded; review layout" : ""); list.append(item);
  }
  const outline = document.createElement("details"), outlineTitle = document.createElement("summary");
  outlineTitle.textContent = "Slide outline (" + candidate.pack.state.slides.length + ")";
  outline.append(outlineTitle, list); summary.append(outline);
  if (candidate.authoringDoc) paRenderReview(candidate, summary);
  $("lw-repair").value = ""; lwStatus();
  summary.scrollIntoView({ block: "start" });
}
async function lwStage(file, options = {}) {
  const epoch = ++lwEpoch;
  lwCandidate = null; $("lw-review").replaceChildren();
  try {
    const loaded = await lwLoad(file, { ...options, cancelled: () => epoch !== lwEpoch });
    if (epoch !== lwEpoch) return;
    lwReview({ ...loaded, ...options, name: file.name, file });
    lwMessage("Validated. Review the summary before opening; no current project has changed.");
  } catch (error) {
    if (epoch !== lwEpoch) return;
    $("lw-repair").value = "Repair my presentation JSON using its original documented format. Use portable authoring v1 only for presentation-studio-authoring input. Error: " + error.message +
      ". Return only a complete corrected JSON document. Do not downgrade native project versions or convert away unsupported fields; request a compatible Studio version instead. Preserve intended content; do not add scripts or external assets.";
    throw error;
  }
}
async function lwAccept(copy = false) {
  if (!lwCandidate || boothBlocked() || projectPlayback) return;
  const incoming = lwCandidate;
  const pack = projectCopy(incoming.pack);
  if (copy || incoming.authoring) pack.meta.id = projectID("project");
  if (copy) { pack.meta.name = (pack.meta.name + " copy").slice(0, 200); pack.state.projectName = pack.meta.name; }
  await hubGuard(async () => {
    await hubKeepPriorVersion(pack);
    await hubPersist(pack, incoming.assets);
    for (const [path, blob] of incoming.assets) mediaRemember(path, blob);
    projectDraftPending = null; projectAcceptPack(pack);
    hubSaveState = "saved"; lwCandidate = null;
    lwPreviewCleanup(); $("lw-panel").close(); projectStatus(); projectRecoveryBanner();
    if ($("full-editor").open) { projectList(); projectForm(); projectPreview(); }
  });
}
async function lwDownload() {
  projectFlush();
  if (projectDraftPending) throw new Error("Recover or discard the pending browser draft before exporting.");
  await hubExportPack(projectPack(), new Map(mediaBlobs));
  lwMessage("Editable ZIP download started. Keep the downloaded file as your portable backup; browser recovery remains separate.");
}
async function lwOpen() {
  if (projectPlayback || boothBlocked() || document.body.classList.contains("obs")) return;
  hubMenusClose(); $("lw-panel").showModal(); lwStatus();
}
function lwMount() {
  const dialog = document.createElement("dialog"); dialog.id = "lw-panel"; dialog.setAttribute("aria-labelledby", "lw-title");
  dialog.innerHTML = `<div class="lw-heading"><h2 id="lw-title">AI presentations</h2><button id="lw-close">Close</button></div>
    <p id="lw-destination" role="status"></p>
    <p>Import JSON or an editable ZIP, review it, then open it. Export editable ZIPs for portable backups. Browser recovery stays in this browser profile.</p>
    <div id="lw-tabs" role="tablist" aria-label="AI presentation tools"></div>
    <section id="lw-create-panel" role="tabpanel" aria-labelledby="lw-tab-create"><h3>Create with your AI</h3><p>Download the generic instructions, schema and example. No project content is included.</p>
    <button id="lw-pack">Download AI instruction pack</button>
    <label>Presentation JSON or editable ZIP <input id="lw-file" type="file" accept=".json,.zip"></label>
    <label>Or paste authoring JSON<textarea id="lw-json" rows="5" maxlength="2000000" placeholder="Paste the complete JSON document"></textarea></label>
    <button id="lw-validate">Validate pasted JSON</button></section>
    <section id="lw-save-panel" role="tabpanel" aria-labelledby="lw-tab-save" hidden><h3>Export and recovery</h3><div class="lw-actions" id="lw-save-actions"></div>
    <p>Download an editable ZIP to keep content, media and recovery history together. Reopen it through Create / import or Presentations → Open file.</p>
    <details><summary>Browser recovery and portable backups</summary>
    <p>Browser recovery retains opened content and media in this browser profile. It can be lost if browser data is cleared. Export an editable ZIP before clearing data or switching browsers or devices.</p>
    <p>Downloads create portable copies; Studio does not link to or overwrite your original file. To use changes made outside Studio, import the updated file and review it before opening. Use the existing playback export for an offline viewing copy.</p>
    <p>Remove old browser copies through Presentations → Remove local copy after switching away. Existing files and saved folder preferences are retained; live folder access and linked saves are deferred.</p></details></section>
    <p id="lw-message" role="status" aria-live="polite"></p><div id="lw-review"></div>
    <div class="lw-actions" id="lw-review-actions"></div>
    <label>Repair feedback<textarea id="lw-repair" rows="3" readonly></textarea></label><button id="lw-copy-repair">Copy repair instructions</button>`;
  document.body.append(dialog);
  const tabNames = ["create", "save"];
  function selectTab(name) {
    for (const key of tabNames) {
      $("lw-" + key + "-panel").hidden = key !== name;
      $("lw-tab-" + key).setAttribute("aria-selected", String(key === name));
      $("lw-tab-" + key).tabIndex = key === name ? 0 : -1;
    }
  }
  for (const [i, name] of tabNames.entries()) {
    const tab = lwButton(["Create / import", "Export / recovery"][i], "lw-tab-" + name, () => selectTab(name));
    tab.setAttribute("role", "tab"); tab.setAttribute("aria-controls", "lw-" + name + "-panel");
    tab.onkeydown = event => {
      const next = event.key === "Home" ? 0 : event.key === "End" ? tabNames.length - 1 : event.key === "ArrowRight" ? (i + 1) % tabNames.length : event.key === "ArrowLeft" ? (i + tabNames.length - 1) % tabNames.length : -1;
      if (next < 0) return; event.preventDefault(); selectTab(tabNames[next]); $("lw-tab-" + tabNames[next]).focus();
    };
    $("lw-tabs").append(tab);
  }
  selectTab("create");
  const projectMenu = $("hub-project-menu").querySelector(".hub-menu-items");
  projectMenu.append(lwButton("AI presentations…", "lw-open", lwOpen));
  $("hub-open-file").parentElement.append(lwButton("AI presentations…", "lw-hub-open", lwOpen));
  $("lw-save-actions").append(lwButton("Download editable ZIP", "lw-save-copy", lwDownload));
  $("lw-review-actions").append(lwButton("Open reviewed version", "lw-review-open", () => lwAccept()), lwButton("Open as copy", "lw-review-copy", () => lwAccept(true)));
  $("lw-pack").onclick = () => lwRun(async () => {
    const zip = new JSZip(); for (const [name, content] of Object.entries(lwPackFiles)) zip.file(name, content);
    zip.file("presentation.schema.json", JSON.stringify(paSchema(), null, 2));
    zip.file("capabilities.json", JSON.stringify(paCatalog(), null, 2));
    mediaDownload(await zip.generateAsync({ type: "blob" }), "studio-ai-authoring-v1.zip");
  });
  $("lw-file").onchange = event => {
    const file = event.target.files[0]; event.target.value = ""; if (file) lwRun(() => lwStage(file));
  };
  const oldChooseFile = hubChooseFile;
  hubChooseFile = async function (file) {
    // The normal Open file entry point also recognizes portable authoring documents.
    if (file && /\.json$/i.test(file.name) && file.size <= paLimits.bytes) {
      try {
        const raw = JSON.parse(await file.text());
        if (raw?.format === "presentation-studio-authoring") {
          await lwOpen(); return lwRun(() => lwStage(file));
        }
      } catch { /* Ordinary importer supplies its existing actionable error. */ }
    }
    return oldChooseFile(file);
  };
  $("lw-validate").onclick = () => lwRun(() => lwStage(new File([$("lw-json").value], "authoring.json", { type: "application/json" })));
  $("lw-copy-repair").onclick = () => lwRun(async () => {
    try { await navigator.clipboard.writeText($("lw-repair").value); lwMessage("Repair instructions copied."); }
    catch { $("lw-repair").focus(); $("lw-repair").select(); lwMessage("Copy the selected repair text manually."); }
  });
  const close = () => {
    if (lwBusy) { lwEpoch++; lwMessage("Cancelling import after the current read. An export already preparing must finish before closing."); return; }
    lwCandidate = null; lwPreviewCleanup(); dialog.close();
  };
  $("lw-close").onclick = close;
  dialog.addEventListener("cancel", event => { event.preventDefault(); close(); });
  lwStatus();
}
const lwOldAccept = projectAcceptPack;
projectAcceptPack = function (...args) { lwEpoch++; return lwOldAccept(...args); };
const lwOldStatus = projectStatus;
projectStatus = function (...args) { const result = lwOldStatus(...args); lwStatus(); return result; };
const lwOldInit = projectInit;
projectInit = function (...args) { const result = lwOldInit(...args); lwMount(); return result; };
