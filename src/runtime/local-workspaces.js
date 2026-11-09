// Permission-scoped local files. Browser drafts remain recovery; disk writes are explicit.
const lwPackFiles = /* @AUTHORING_PACK */;
const lwLimits = { input: 100 * 1024 * 1024, expanded: 200 * 1024 * 1024, json: 20 * 1024 * 1024, entries: 1000, folder: 500 };
let lwFolder = null, lwRemembered = null, lwLinked = null, lwCandidate = null,
  lwBusy = false, lwBackupFolder = null, lwEpoch = 0, lwCheckRunning = false;
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
    if (error.name !== "AbortError") lwMessage(error.message || String(error));
  } finally {
    lwBusy = false; $("lw-panel").setAttribute("aria-busy", "false"); lwStatus();
  }
}
function lwNativeDirty() { return !!lwLinked && hubContent(projectPack()) !== lwLinked.content; }
function lwStatus() {
  if (!$("lw-destination") || !projectReady) return;
  if (lwLinked && lwLinked.loaded.pack.meta.id !== projectMeta.id) lwLinked = null;
  const state = lwLinked
    ? (lwLinked.changed ? "Disk changed externally" : lwNativeDirty() ? "Unsaved disk changes" : "Matches last disk load/save") + " · " + lwLinked.handle.name
    : "Browser project · use editable ZIP export for a portable backup";
  $("lw-destination").textContent = state;
  $("lw-save").disabled = !lwLinked || lwBusy;
  $("lw-reload").disabled = !lwLinked || lwBusy;
  $("lw-review-open").disabled = !lwCandidate || lwBusy;
  $("lw-review-copy").disabled = !lwCandidate || lwBusy;
  $("lw-backup-state").textContent = lwBackupFolder ? "Snapshots enabled · " + lwBackupFolder.name + " · newest five per project" : "Snapshots off";
  if (lwLinked) $("fe-status").textContent = state + " · Browser recovery: " + hubSaveState;
}
async function lwHandleStore(value, read = false) {
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open("presentation-studio-workspaces", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("handles");
    request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
  });
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction("handles", read ? "readonly" : "readwrite"), store = tx.objectStore("handles");
      const request = read ? store.get("folder") : value ? store.put(value, "folder") : store.delete("folder");
      let result; request.onsuccess = () => { result = request.result; };
      tx.oncomplete = () => resolve(result); tx.onabort = tx.onerror = () => reject(tx.error || new Error("Folder preference could not be saved."));
    });
  } finally { db.close(); }
}
async function lwPermission(handle, write = false) {
  const options = { mode: write ? "readwrite" : "read" };
  if (await handle.queryPermission(options) === "granted") return;
  if (await handle.requestPermission(options) !== "granted") throw new Error("Folder/file permission was not granted. Current edits remain in Studio.");
}
function lwSafePath(path) {
  return typeof path === "string" && path.length <= 500 && /^assets\/[\w./ -]+$/i.test(path) &&
    !path.split("/").some(part => !part || part === "." || part === "..") && !/[\\:%?#]/.test(path);
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
async function lwFingerprint(file) {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}
async function lwLoad(file, { folder = null, identity = null, browserAssets = false, allowLegacy = false, allowMissingAssets = false, cancelled = () => false } = {}) {
  if (file.size > lwLimits.input) throw new Error("File exceeds the 100 MB input limit.");
  if (!/\.(json|zip)$/i.test(file.name)) throw new Error("Choose a presentation JSON or editable ZIP.");
  const fingerprint = crypto.subtle ? await lwFingerprint(file) : null;
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
    raw = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(decoded.get("presentation.json")));
  } else {
    if (file.size > lwLimits.json) throw new Error("JSON exceeds the 20 MB limit.");
    raw = JSON.parse(await file.text());
  }
  lwCheckJSON(raw);
  if (allowLegacy && raw?.schemaVersion === 1) return { legacy: true };
  const authoring = raw?.format === "presentation-studio-authoring";
  if (authoring && file.size > paLimits.bytes) throw new Error("Authoring JSON exceeds the 2 MB limit.");
  const pack = authoring ? paConvert(raw, identity) : projectValidatePack(raw);
  if (pack.playbackOnly) throw new Error("Choose an editable project, not a playback export.");
  const assets = new Map();
  for (const path of projectReferenced(pack)) {
    if (!lwSafePath(path)) throw new Error("Unsafe project asset path.");
    if (zip) {
      if (!decoded.has(path)) throw new Error("Missing asset: " + path);
      assets.set(path, new Blob([decoded.get(path)], { type: hubMime(path) }));
    } else if (folder) {
      let directory = folder; const parts = path.split("/");
      for (const part of parts.slice(0, -1)) directory = await directory.getDirectoryHandle(part);
      const asset = await (await directory.getFileHandle(parts.at(-1))).getFile();
      expanded += asset.size;
      if (expanded > lwLimits.expanded) throw new Error("Project assets exceed the 200 MB limit.");
      assets.set(path, new Blob([await asset.arrayBuffer()], { type: hubMime(path) }));
    } else if (browserAssets) {
      await hubDatabase();
      const blob = await projectDBGet("assets", pack.meta.id + "|" + path);
      // Legacy JSON imports intentionally allow readiness diagnostics and repair of incomplete projects.
      // Linked folder/file opens and all ZIP imports remain strict.
      if (!blob && allowMissingAssets) continue;
      if (!blob) throw new Error("Media is missing from this file. Open the complete editable ZIP; JSON alone does not include media bytes.");
      assets.set(path, blob);
    } else throw new Error("JSON references media. Open it from its project folder or use a complete editable ZIP.");
  }
  return { pack, assets, fingerprint, authoring };
}
function lwReview(candidate) {
  lwCandidate = candidate;
  const summary = $("lw-review"); summary.replaceChildren();
  const title = document.createElement("h3"); title.textContent = candidate.pack.meta.name; summary.append(title);
  const info = document.createElement("p");
  info.textContent = candidate.pack.state.slides.length + " slides · " + candidate.assets.size + " media assets. " +
    (candidate.reload ? "Reload replaces the open version after preserving browser recovery. " : "Open as copy assigns an independent project ID. ") +
    (lwNativeDirty() ? "You have unsaved disk edits; keep them with Save a copy before reloading. " : "") +
    "Validation does not verify facts, sources or guaranteed layout fit.";
  summary.append(info);
  const list = document.createElement("ol");
  for (const slide of candidate.pack.state.slides) {
    const item = document.createElement("li"), words = slide.tree.map(projectText).join(" ").split(/\s+/).length;
    item.textContent = slide.title + (words > 80 ? " — may be crowded; review layout" : ""); list.append(item);
  }
  summary.append(list); $("lw-repair").value = ""; lwStatus();
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
  if (copy || (incoming.authoring && !incoming.reload)) pack.meta.id = projectID("project");
  if (copy) { pack.meta.name = (pack.meta.name + " copy").slice(0, 200); pack.state.projectName = pack.meta.name; }
  await hubGuard(async () => {
    await hubKeepPriorVersion(pack);
    await hubPersist(pack, incoming.assets);
    for (const [path, blob] of incoming.assets) mediaRemember(path, blob);
    projectDraftPending = null; projectAcceptPack(pack);
    if (!copy && incoming.handle) lwLinked = { handle: incoming.handle, folder: incoming.folder, fingerprint: incoming.fingerprint,
      content: hubContent(projectPack()), loaded: { pack: projectCopy(pack), assets: new Map(incoming.assets) }, authoring: incoming.authoring, changed: false };
    hubSaveState = "saved"; lwCandidate = null;
    $("lw-panel").close(); projectStatus(); projectRecoveryBanner();
    if ($("full-editor").open) { projectList(); projectForm(); projectPreview(); }
  });
}
async function lwRefresh() {
  if (!lwFolder) throw new Error("Connect or reconnect a folder first.");
  await lwPermission(lwFolder);
  const list = $("lw-files"), records = []; let count = 0;
  // Enumerate top-level metadata only. No recursive scan or background file content reads.
  for await (const [name, handle] of lwFolder.entries()) {
    if (++count > lwLimits.folder) throw new Error("Folder exceeds 500 top-level entries. Choose a smaller presentations folder.");
    if (handle.kind !== "file" || name.startsWith(".") || !/\.(json|zip)$/i.test(name)) continue;
    const file = await handle.getFile(); records.push({ handle, file });
  }
  list.replaceChildren();
  for (const { handle, file } of records.sort((a, b) => b.file.lastModified - a.file.lastModified)) {
    const row = document.createElement("li"); row.dataset.name = file.name.toLowerCase();
    const button = lwButton(file.name, null, async () => lwStage(await handle.getFile(), { handle, folder: lwFolder }));
    const details = document.createElement("small"); details.textContent = " · " + new Date(file.lastModified).toLocaleString() + " · " + Math.ceil(file.size / 1024) + " KB · validate on open";
    row.append(button, details); list.append(row);
  }
  lwFilter(); lwMessage("Connected read-only: " + lwFolder.name + " · " + records.length + " supported file(s). Validation happens when selected.");
}
function lwFilter() {
  const query = $("lw-search").value.trim().toLowerCase();
  for (const row of $("lw-files").children) row.hidden = !row.dataset.name.includes(query);
}
async function lwCheckDisk() {
  if (!lwLinked || lwBusy || lwCheckRunning) return;
  lwCheckRunning = true; const link = lwLinked;
  try {
    const file = await link.handle.getFile();
    if (file.size > lwLimits.input) throw new Error("Linked file now exceeds the input limit.");
    const changed = await lwFingerprint(file) !== link.fingerprint;
    if (lwLinked === link) {
      link.changed = changed;
      if (changed) {
        const message = "The linked presentation changed externally. Reload to validate it; current edits remain intact.";
        lwMessage(message); projectMessage(message);
      }
    }
  } catch (error) {
    if (lwLinked === link) { link.changed = true; lwMessage("Linked file unavailable. Keep editing or Save a copy. " + error.message); }
  } finally { lwCheckRunning = false; lwStatus(); }
}
async function lwSnapshot(link) {
  if (!lwBackupFolder) return;
  await lwPermission(lwBackupFolder, true);
  const prefix = "studio-backup-" + link.loaded.pack.meta.id + "-";
  const name = prefix + new Date().toISOString().replace(/[:.]/g, "-") + "-" + projectID("snapshot") + ".zip";
  await lwWrite(await lwBackupFolder.getFileHandle(name, { create: true }), await hubPackBlob(link.loaded.pack, link.loaded.assets));
  const owned = [];
  for await (const [entry, handle] of lwBackupFolder.entries()) if (handle.kind === "file" && entry.startsWith(prefix) && entry.endsWith(".zip")) owned.push(entry);
  owned.sort().reverse();
  for (const entry of owned.slice(5)) await lwBackupFolder.removeEntry(entry);
}
async function lwWrite(handle, blob) {
  const writer = await handle.createWritable();
  try { await writer.write(blob); await writer.close(); }
  catch (error) { try { await writer.abort(); } catch {} throw error; }
}
async function lwSavedFingerprint(handle, blob) {
  const expected = await lwFingerprint(blob), actual = await handle.getFile();
  if (actual.size > lwLimits.input || await lwFingerprint(actual) !== expected)
    throw new Error("The file changed during or immediately after saving. Current edits remain intact; review the disk version before retrying.");
  return expected;
}
async function lwSave(copy = false) {
  if (boothBlocked() || projectPlayback) throw new Error("Unlock authoring before saving local files.");
  projectFlush();
  if (projectDraftPending) throw new Error("Recover or discard the pending browser draft before saving to disk.");
  const id = projectMeta.id, pack = projectPack(), assets = new Map(mediaBlobs), link = lwLinked;
  if (new Blob([JSON.stringify(pack)]).size > lwLimits.json)
    throw new Error("Project JSON exceeds the supported 20 MB reopen limit. No file was written; keep an editable ZIP export and reduce project history/content before linking a save.");
  if (copy || !link) {
    if (!window.showSaveFilePicker || !window.isSecureContext) { await hubExportPack(pack, assets); lwMessage("Editable ZIP download started. This browser cannot link a save destination."); return; }
    const handle = await window.showSaveFilePicker({ suggestedName: mediaFilename(pack.meta.name) + "-editable.zip",
      types: [{ description: "Editable presentation ZIP", accept: { "application/zip": [".zip"] } }] });
    if (!/\.zip$/i.test(handle.name)) throw new Error("Save a copy requires a .zip filename so Studio can reopen it correctly.");
    await lwPermission(handle, true);
    // Save a copy must not overwrite the linked original through a second handle.
    if (link && await handle.isSameEntry(link.handle)) throw new Error("Choose a different filename for Save a copy. Use Save linked file for the original.");
    const blob = await hubPackBlob(pack, assets);
    if (blob.size > lwLimits.input) throw new Error("Editable ZIP exceeds the supported 100 MB reopen limit. No file was written; use the existing export workflow to retain a backup.");
    if (projectMeta.id !== id || boothActive) throw new Error("Project changed while preparing the save; try again.");
    await lwWrite(handle, blob);
    const fingerprint = await lwSavedFingerprint(handle, blob);
    lwLinked = { handle, folder: null, fingerprint, content: hubContent(pack),
      loaded: { pack, assets: new Map([...projectReferenced(pack)].map(path => [path, assets.get(path)])) }, authoring: false, changed: false };
    lwMessage("Saved editable ZIP to " + handle.name + ". Browser recovery remains separate."); projectStatus(); return;
  }
  if (link.authoring) throw new Error("AI authoring JSON is read-only source. Use Save a copy to create a lossless editable ZIP.");
  if (!/\.(json|zip)$/i.test(link.handle.name)) throw new Error("Unsupported save destination; use Save a copy.");
  if (/\.json$/i.test(link.handle.name) && projectReferenced(pack).size) throw new Error("This project includes media/recovery assets. Save a copy as editable ZIP to retain them.");
  await lwPermission(link.handle, true);
  const unchanged = async () => {
    const file = await link.handle.getFile();
    if (file.size > lwLimits.input || await lwFingerprint(file) !== link.fingerprint) {
      link.changed = true; throw new Error("Disk changed since opening. Reload and review, or Save a copy. No disk content was overwritten.");
    }
    if (lwLinked !== link || projectMeta.id !== id || boothActive) throw new Error("Project changed while saving; no write was made.");
  };
  await unchanged();
  const blob = /\.zip$/i.test(link.handle.name) ? await hubPackBlob(pack, assets) : new Blob([JSON.stringify(pack, null, 2)], { type: "application/json" });
  if (blob.size > (/\.json$/i.test(link.handle.name) ? lwLimits.json : lwLimits.input))
    throw new Error("Save exceeds the supported reopen limit. No file was written; use Save a copy or export a backup.");
  await lwSnapshot(link); await unchanged();
  await lwWrite(link.handle, blob);
  link.fingerprint = await lwSavedFingerprint(link.handle, blob); link.content = hubContent(pack); link.changed = false;
  link.loaded = { pack, assets: new Map([...projectReferenced(pack)].map(path => [path, assets.get(path)])) };
  lwMessage("Saved to " + link.handle.name + ". Browser recovery remains separate."); projectStatus();
}
async function lwOpen() {
  if (projectPlayback || boothBlocked() || document.body.classList.contains("obs")) return;
  hubMenusClose(); $("lw-panel").showModal(); lwStatus();
  lwRemembered = lwFolder || await lwHandleStore(null, true).catch(() => null);
  $("lw-reconnect").disabled = !lwRemembered;
}
function lwMount() {
  const dialog = document.createElement("dialog"); dialog.id = "lw-panel"; dialog.setAttribute("aria-labelledby", "lw-title");
  dialog.innerHTML = `<div class="lw-heading"><h2 id="lw-title">AI & local workspace</h2><button id="lw-close">Close</button></div>
    <p id="lw-destination" role="status"></p>
    <p>Files stay on your device. Browser recovery is separate from disk saves. Export editable ZIPs for portable backups.</p>
    <div id="lw-tabs" role="tablist" aria-label="Workspace tools"></div>
    <section id="lw-create-panel" role="tabpanel" aria-labelledby="lw-tab-create"><h3>Create with your AI</h3><p>Download the generic instructions, schema and example. No project content is included.</p>
    <button id="lw-pack">Download AI instruction pack</button>
    <label>Presentation JSON or editable ZIP <input id="lw-file" type="file" accept=".json,.zip"></label>
    <label>Or paste authoring JSON<textarea id="lw-json" rows="5" maxlength="2000000" placeholder="Paste the complete JSON document"></textarea></label>
    <button id="lw-validate">Validate pasted JSON</button></section>
    <section id="lw-folder-panel" role="tabpanel" aria-labelledby="lw-tab-folder" hidden><h3>Presentation folder</h3><p id="lw-support"></p>
    <div class="lw-actions" id="lw-folder-actions"></div>
    <label>Find a presentation<input id="lw-search" type="search" placeholder="Search filenames"></label><ul id="lw-files"></ul></section>
    <section id="lw-save-panel" role="tabpanel" aria-labelledby="lw-tab-save" hidden><h3>Save and recovery</h3><div class="lw-actions" id="lw-save-actions"></div>
    <p id="lw-backup-state"></p><details><summary>Recovery and backup details</summary>
    <p>Browser recovery retains opened content and media in this browser profile. Remove old copies through Presentations → Remove local copy after switching away. Disconnect forgets folder access here, but does not delete files or recovery; revoke permission in browser site settings.</p>
    <p>Optional pre-save ZIP snapshots retain the newest five Studio snapshots per project in your chosen backup folder. Choose a separate drive for protection against primary-drive loss. Network shares do not provide collaborative locking.</p></details></section>
    <p id="lw-message" role="status" aria-live="polite"></p><div id="lw-review"></div>
    <div class="lw-actions" id="lw-review-actions"></div>
    <label>Repair feedback<textarea id="lw-repair" rows="3" readonly></textarea></label><button id="lw-copy-repair">Copy repair instructions</button>`;
  document.body.append(dialog);
  const tabNames = ["create", "folder", "save"];
  function selectTab(name) {
    for (const key of tabNames) {
      $("lw-" + key + "-panel").hidden = key !== name;
      $("lw-tab-" + key).setAttribute("aria-selected", String(key === name));
      $("lw-tab-" + key).tabIndex = key === name ? 0 : -1;
    }
  }
  for (const [i, name] of tabNames.entries()) {
    const tab = lwButton(["Create / import", "Presentation folder", "Save / recovery"][i], "lw-tab-" + name, () => selectTab(name));
    tab.setAttribute("role", "tab"); tab.setAttribute("aria-controls", "lw-" + name + "-panel");
    tab.onkeydown = event => {
      const next = event.key === "Home" ? 0 : event.key === "End" ? 2 : event.key === "ArrowRight" ? (i + 1) % 3 : event.key === "ArrowLeft" ? (i + 2) % 3 : -1;
      if (next < 0) return; event.preventDefault(); selectTab(tabNames[next]); $("lw-tab-" + tabNames[next]).focus();
    };
    $("lw-tabs").append(tab);
  }
  selectTab("create");
  const projectMenu = $("hub-project-menu").querySelector(".hub-menu-items");
  projectMenu.append(lwButton("AI & local workspace…", "lw-open", lwOpen));
  $("hub-open-file").parentElement.append(lwButton("AI & local workspace…", "lw-hub-open", lwOpen));
  const supports = !!window.showDirectoryPicker && window.isSecureContext;
  $("lw-support").textContent = supports ? "Choose a dedicated presentations folder. Top-level JSON/ZIP files only; read access first." : "Folder access is unavailable in this browser/context. Use JSON/ZIP import and editable ZIP downloads.";
  const connect = lwButton("Open folder", "lw-connect", async () => {
    const folder = await window.showDirectoryPicker({ mode: "read" });
    await lwPermission(folder); lwFolder = folder; lwRemembered = folder;
    try { await lwHandleStore(folder); } catch { lwMessage("Folder connected for this session; could not remember permission."); }
    $("lw-reconnect").disabled = false; await lwRefresh();
  }); connect.disabled = !supports;
  const reconnect = lwButton("Reconnect remembered folder", "lw-reconnect", async () => { await lwPermission(lwRemembered); lwFolder = lwRemembered; await lwRefresh(); });
  $("lw-folder-actions").append(connect, reconnect, lwButton("Refresh folder", "lw-refresh", lwRefresh), lwButton("Disconnect", "lw-disconnect", async () => {
    await lwHandleStore(null); lwFolder = lwRemembered = lwLinked = lwBackupFolder = lwCandidate = null;
    $("lw-files").replaceChildren(); $("lw-review").replaceChildren(); $("lw-reconnect").disabled = true;
    lwMessage("Disconnected. Files and browser recovery were retained. Revoke permission in browser site settings if desired."); projectStatus();
  }));
  $("lw-save-actions").append(lwButton("Save linked file", "lw-save", () => lwSave()), lwButton("Save a copy…", "lw-save-copy", () => lwSave(true)),
    lwButton("Reload from disk", "lw-reload", async () => {
      const link = lwLinked;
      await lwStage(await link.handle.getFile(), { handle: link.handle, folder: link.folder, identity: projectMeta.id, reload: true });
    }), lwButton("Enable five-snapshot backups…", "lw-backups", async () => {
      if (!supports) throw new Error("Backup folders require a supported secure browser context.");
      // Selecting a folder is explicit consent to the five-snapshot policy described above.
      const folder = await window.showDirectoryPicker({ mode: "readwrite" }); await lwPermission(folder, true); lwBackupFolder = folder;
      lwMessage("Pre-save backups enabled. Studio retains only its newest five snapshots per project in this folder.");
    }), lwButton("Disable snapshots", "lw-backups-off", () => { lwBackupFolder = null; }));
  $("lw-review-actions").append(lwButton("Open reviewed version", "lw-review-open", () => lwAccept()), lwButton("Open as copy", "lw-review-copy", () => lwAccept(true)));
  $("lw-pack").onclick = () => lwRun(async () => {
    const zip = new JSZip(); for (const [name, content] of Object.entries(lwPackFiles)) zip.file(name, content);
    zip.file("presentation.schema.json", JSON.stringify(paSchema(), null, 2));
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
  $("lw-search").oninput = lwFilter;
  $("lw-copy-repair").onclick = () => lwRun(async () => {
    try { await navigator.clipboard.writeText($("lw-repair").value); lwMessage("Repair instructions copied."); }
    catch { $("lw-repair").focus(); $("lw-repair").select(); lwMessage("Copy the selected repair text manually."); }
  });
  const close = () => {
    if (lwBusy) { lwEpoch++; lwMessage("Cancelling import after the current read. Disk saves must finish before closing."); return; }
    lwCandidate = null; dialog.close();
  };
  $("lw-close").onclick = close;
  dialog.addEventListener("cancel", event => { event.preventDefault(); close(); });
  window.addEventListener("focus", lwCheckDisk);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) lwCheckDisk(); });
  lwStatus();
}
const lwOldAccept = projectAcceptPack;
projectAcceptPack = function (...args) { lwLinked = null; lwEpoch++; return lwOldAccept(...args); };
const lwOldStatus = projectStatus;
projectStatus = function (...args) { const result = lwOldStatus(...args); lwStatus(); return result; };
const lwOldInit = projectInit;
projectInit = function (...args) { const result = lwOldInit(...args); lwMount(); return result; };
