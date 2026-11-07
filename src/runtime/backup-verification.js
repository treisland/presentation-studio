const bvLimits = { archive: 256 * 1024 * 1024, total: 512 * 1024 * 1024, entry: 256 * 1024 * 1024, config: 8 * 1024 * 1024, entries: 10000 };
const bvCRC = Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  return crc >>> 0;
});
let bvRun = 0;
function bvSafeName(name) {
  return typeof name === "string" && name.length > 0 && !/^[\\/]|[\\:\x00-\x1f\x7f]/.test(name) &&
    !name.split("/").some(part => part === "." || part === ".." || part === "");
}
function bvRead(entry, limit, alive, keep = false) {
  return new Promise((resolve, reject) => {
    let size = 0, crc = 0xffffffff, failed = false;
    const chunks = [], stream = entry.internalStream("uint8array");
    function fail(error) { failed = true; stream.pause(); reject(error); }
    stream.on("data", bytes => {
      if (failed) return;
      if (!alive()) return fail(new Error("Verification cancelled."));
      size += bytes.length;
      if (size > limit) return fail(new Error("Archive expands beyond the verification limit: " + entry.name));
      for (const byte of bytes) crc = (crc >>> 8) ^ bvCRC[(crc ^ byte) & 255];
      if (keep) chunks.push(bytes);
    });
    stream.on("error", fail);
    stream.on("end", () => {
      if (failed) return;
      if (!alive()) return fail(new Error("Verification cancelled."));
      if (size !== entry._data.uncompressedSize || ((crc ^ 0xffffffff) >>> 0) !== (entry._data.crc32 >>> 0))
        return fail(new Error("Corrupt archive entry: " + entry.name));
      let bytes;
      if (keep) {
        bytes = new Uint8Array(size);
        let offset = 0;
        for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
      }
      resolve({ size, bytes });
    });
    stream.resume();
  });
}
async function bvVerify(file, alive, progress) {
  if (!file.name.toLowerCase().endsWith(".zip")) throw new Error("Choose an editable project ZIP, not JSON or a playback export.");
  if (file.size > bvLimits.archive) throw new Error("ZIP exceeds the 256 MiB verification limit. Keep the original and verify it outside this browser workflow.");
  let zip;
  try { zip = await JSZip.loadAsync(await file.arrayBuffer()); }
  catch { throw new Error("Cannot read ZIP archive. Choose a complete, uncorrupted editable project ZIP."); }
  if (!alive()) throw new Error("Verification cancelled.");
  const entries = Object.values(zip.files);
  if (entries.length > bvLimits.entries) throw new Error("Archive contains too many entries to verify safely.");
  let declared = 0;
  const originals = new Set();
  for (const entry of entries) {
    const original = entry.unsafeOriginalName || entry.name;
    const name = entry.dir && original.endsWith("/") ? original.slice(0, -1) : original;
    if (!bvSafeName(name) || originals.has(name)) throw new Error("Unsafe or ambiguous archive path: " + original);
    originals.add(name);
    if (entry.dir) continue;
    const size = entry._data.uncompressedSize;
    if (!Number.isSafeInteger(size) || size < 0 || size > bvLimits.entry) throw new Error("Archive entry exceeds the verification limit: " + entry.name);
    declared += size;
    if (declared > bvLimits.total) throw new Error("Archive expands beyond the 512 MiB verification limit.");
  }
  const config = zip.file("presentation.json");
  if (!config) throw new Error("No presentation.json found. Choose a complete editable project ZIP.");
  if (config._data.uncompressedSize > bvLimits.config) throw new Error("presentation.json exceeds the 8 MiB verification limit.");
  const data = await bvRead(config, bvLimits.config, alive, true);
  let raw;
  try { raw = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(data.bytes)); }
  catch { throw new Error("presentation.json is not valid UTF-8 project JSON."); }
  const pack = projectValidatePack(raw);
  if (pack.playbackOnly) throw new Error("This is a playback-only export. Choose the editable project ZIP containing recovery data.");
  const refs = [...projectReferenced(pack)];
  const missing = refs.filter(path => !zip.file(path));
  if (missing.length) throw new Error(`Missing ${missing.length} referenced asset(s), including recovery/baseline content: ` + missing.slice(0, 10).join(", "));
  let total = data.size, checked = 1;
  for (const entry of entries) {
    if (entry.dir || entry.name === "presentation.json") continue;
    progress("Checking archive integrity: " + entry.name);
    const result = await bvRead(entry, Math.min(bvLimits.entry, bvLimits.total - total), alive);
    total += result.size;
    checked++;
    if (refs.includes(entry.name) && !result.size) throw new Error("Referenced asset is empty: " + entry.name);
  }
  return { name: pack.meta.name, slides: pack.state.slides.length, notes: pack.state.slides.filter(slide => slide.notes).length,
    trash: pack.state.trash.length, sections: pack.state.sections.length, checkpoints: pack.checkpoints.length,
    history: pack.history.past.length + pack.history.future.length, assets: refs.length, entries: checked, player: !!zip.file("index.html") };
}
const bvInit = projectInit;
projectInit = function () {
  bvInit();
  const button = document.createElement("button");
  button.id = "bv-open";
  button.textContent = "Verify backup ZIP";
  $("hub-export-menu").querySelector(".hub-menu-items").append(button);
  const dialog = document.createElement("dialog");
  dialog.id = "bv-dialog";
  dialog.setAttribute("aria-labelledby", "bv-title");
  dialog.innerHTML = '<h2 id="bv-title">Verify an editable backup</h2><p>The ZIP is inspected without opening its HTML, importing it, or changing your active presentation or browser draft. This checks project structure and archive integrity, not rendering or codec playback.</p><label for="bv-file">Editable project ZIP</label><input id="bv-file" type="file" accept=".zip,application/zip"><p id="bv-status" role="status" aria-live="polite">Choose a ZIP to verify.</p><div id="bv-result"></div><p>Limits: 256 MiB ZIP, 512 MiB expanded, 10,000 entries. For stronger assurance, restore in a separate browser profile and test playback. Never clear the original profile first.</p><button id="bv-close">Back to editor / cancel verification</button>';
  $("full-editor").append(dialog);
  button.onclick = () => {
    if (!pfAllowed()) return;
    bvRun++;
    hubMenusClose();
    $("bv-file").value = "";
    $("bv-status").textContent = "Choose a ZIP to verify.";
    $("bv-result").replaceChildren();
    dialog.showModal();
    $("bv-file").focus();
  };
  $("bv-file").onchange = async () => {
    const file = $("bv-file").files[0];
    if (!file) return;
    const run = ++bvRun, project = projectMeta.id;
    const alive = () => run === bvRun && dialog.open && pfAllowed() && projectMeta.id === project;
    $("bv-status").textContent = "Inspecting " + file.name + "…";
    $("bv-result").replaceChildren();
    try {
      const result = await bvVerify(file, alive, text => { if (alive()) $("bv-status").textContent = text; });
      if (!alive()) return;
      $("bv-status").textContent = "Integrity and editable-project checks passed.";
      const details = document.createElement("p");
      details.textContent = `${result.name}. Slides: ${result.slides}. Sections: ${result.sections}. Slides with notes: ${result.notes}. Trashed slides: ${result.trash}. Checkpoints: ${result.checkpoints}. Undo/redo states: ${result.history}. Referenced assets: ${result.assets}. Archive files checked: ${result.entries}. ` +
        (result.player ? "index.html is present but was not executed or checked for playback." : "No index.html: restore by importing this ZIP in Studio.");
      $("bv-result").append(details);
    } catch (error) {
      if (alive()) $("bv-status").textContent = "Verification failed: " + error.message;
    }
  };
  $("bv-close").onclick = () => dialog.close();
  dialog.addEventListener("cancel", event => { event.preventDefault(); event.stopPropagation(); dialog.close(); });
  dialog.addEventListener("keydown", event => { event.stopPropagation(); if (event.key === "Escape") { event.preventDefault(); dialog.close(); } });
  dialog.addEventListener("close", () => {
    if (!dialog.open) { $("hub-project-menu").open = true; $("hub-export-menu").open = true; button.focus(); }
  });
};
