// Local authoring contract. No transport, credentials, asset upload or format change.
let editingGeneration = 0, editingSignature = "";
let editingStateReference = null;
const editingSession = projectID("editing");
const editingOperations = new Map();
let editingAfterOperation = () => {};
let editingGestureBusy = () => false;
function editingRegisterOperation(type, handler) {
  if (editingOperations.has(type) || typeof handler !== 'function') throw new Error('Invalid or duplicate editing operation: ' + type);
  editingOperations.set(type, handler);
}
function editingFail(code, message) {
  throw Object.assign(new Error(message), { code });
}
function editingRevision() {
  const signature = JSON.stringify([projectMeta?.id, projectState, projectCheckpoints, projectPast, projectFuture]);
  if (signature !== editingSignature) {
    editingSignature = signature;
    editingGeneration++;
  }
  return editingSession + ":" + editingGeneration;
}
// Track legacy edits as well, including an edit followed by undo to the same value.
const editingModified = projectModified;
projectModified = function (...args) {
  editingGeneration++;
  return editingModified(...args);
};
const editingEdit = projectEdit;
projectEdit = function (...args) {
  editingGeneration++;
  return editingEdit(...args);
};
const editingRender = projectRender;
projectRender = function (...args) {
  if (projectState !== editingStateReference) {
    editingStateReference = projectState;
    editingGeneration++;
  }
  return editingRender(...args);
};
function editingGuard() {
  if (!projectReady || projectPlayback || boothActive || projectDraftPending)
    editingFail("READ_ONLY", "Open an editable project and resolve recovery/booth mode first.");
}
function editingSlide(state, id) {
  const slide = state.slides.find(s => s.id === id);
  if (!slide) editingFail("NOT_FOUND", "Slide not found: " + id);
  if (state.editLocked || slide.editLocked) editingFail("LOCKED", "Unlock the presentation or slide first.");
  return slide;
}
function editingValidateUpdate(changes) {
  if (!changes || typeof changes !== "object" || Array.isArray(changes) ||
      Object.keys(changes).some(k => !["title", "notes", "duration"].includes(k)))
    editingFail("INVALID", "Supported slide fields are title, notes and duration.");
  for (const [key, value] of Object.entries(changes)) {
    if (key === "duration") {
      if (!Number.isFinite(value) || value < 3 || value > 600) editingFail("INVALID", "Duration must be 3–600 seconds.");
    } else if (typeof value !== "string" || value.length > (key === "title" ? 500 : 20000)) {
      editingFail("INVALID", "Invalid slide " + key + ".");
    }
  }
}
function editingUpdate(state, id, changes) {
  const slide = editingSlide(state, id);
  editingValidateUpdate(changes);
  Object.assign(slide, changes);
  if (Object.hasOwn(changes, "title")) {
    slide.title ||= "Untitled slide";
    const heading = projectHeading(slide);
    if (heading) projectSetText(heading.node, slide.title);
  }
}
function editingCreateModel(template, title, group, id) {
  if ((!['hero', 'comparison', 'workflow', 'table', 'qa', 'code', 'media', 'media-grid', 'blank'].includes(template) && !Object.hasOwn(lcLayouts, template)) ||
      typeof title !== "string" || !title.length || title.length > 500 || !/^[\w-]+$/.test(id))
    editingFail("INVALID", "Invalid template, title or slide ID.");
  const preset = projectCreateTemplate(template, title),
    commands = template === "code" ? { powershell: 'Write-Output "Replace with your command"', bash: 'printf "%s\\n" "Replace with your command"' } : null;
  return { id, title, group, template, classes: preset.classes, tree: preset.tree,
    templateBase: projectCopy(preset.tree), templateClasses: preset.classes,
    duration: 12, hidden: false, notes: "", topic: "General", commands,
    templateCommands: projectCopy(commands) };
}
function editingPlace(state, id, object, placement) {
  editingSlide(state, id);
  const cfg = object === "primary" ? state.media[id] : state.mediaObjects?.[id]?.find(o => o.id === object)?.media;
  if (!cfg) editingFail("NOT_FOUND", "Media object not found.");
  if (cfg.canvas?.locked) editingFail("LOCKED", "Unlock the media object first.");
  if (!placement || Object.keys(placement).length !== 4 ||
      !["x", "y", "w", "h"].every(k => Number.isFinite(placement[k])) ||
      placement.w < 0.05 || placement.h < 0.05 || placement.w > 1 || placement.h > 1 ||
      placement.x < 0 || placement.y < 0 || placement.x + placement.w > 1.000001 || placement.y + placement.h > 1.000001)
    editingFail("INVALID", "Placement must fit inside normalized slide bounds.");
  cfg.canvas = { ...ceObject(cfg.canvas), placement: cePlacement(placement) };
}
const studioEditing = Object.freeze({
  version: 1,
  read() {
    editingGuard();
    return { apiVersion: 1, projectId: projectMeta.id, revision: editingRevision(), state: projectCopy(projectState) };
  },
  apply(request, { signal } = {}) {
    try {
      editingGuard();
      if (signal?.aborted) editingFail("CANCELLED", "The batch was cancelled.");
      if (request?.apiVersion !== 1) editingFail("VERSION", "Unsupported editing contract version.");
      if (request.projectId !== projectMeta.id || request.expectedRevision !== editingRevision())
        editingFail("CONFLICT", "The project changed. Read it again and review a fresh proposal.");
      if (projectPending || vbSession || ceDrag || ceRelocate || dbDrag || mgDrag || mgUploading || mfState || mediaExporting || editingGestureBusy())
        editingFail("BUSY", "Finish the current edit, gesture or export first.");
      if (!Array.isArray(request.operations) || !request.operations.length || request.operations.length > 100)
        editingFail("INVALID", "Supply 1–100 operations.");
      const before = projectCopy(projectState), candidate = projectCopy(projectState), created = [];
      for (const op of request.operations) {
        const createdBefore = created.length;
        if (editingOperations.has(op?.type)) editingOperations.get(op.type)(candidate, op, created);
        else if (op?.type === "slide.update") editingUpdate(candidate, op.slideId, op.changes);
        else if (op?.type === "media.place") editingPlace(candidate, op.slideId, op.objectId || "primary", op.placement);
        else if (op?.type === "slide.create") {
          if (candidate.editLocked) editingFail("LOCKED", "Unlock the presentation first.");
          const section = candidate.sections.find(s => s.id === op.sectionId);
          if (!section) editingFail("NOT_FOUND", "Section not found.");
          const id = op.slideId || projectID();
          const all = [...candidate.slides, ...candidate.trash, ...(candidate.sectionTrash || []).flatMap(s => s.slides)];
          if (all.some(s => s.id === id)) editingFail("INVALID", "Slide ID already exists.");
          candidate.slides.push(editingCreateModel(op.template, op.title || "New slide", section.id, id));
          if (candidate.loops[section.id]) candidate.loops[section.id].slideIds.push(id);
          if (candidate.origin === "blank" && Object.keys(candidate.loops).length === 1 && !candidate.loops[section.id])
            Object.values(candidate.loops)[0].slideIds.push(id);
          created.push(id);
        } else if (!dbOperation(candidate, op, created)) editingFail("INVALID", "Unsupported editing operation.");
        editingAfterOperation(candidate, op, created.slice(createdBefore));
      }
      const validatedCandidate=projectValidateState(candidate);
      if(candidate.design)candidate.design=validatedCandidate.design;
      if (ceViolates(before, candidate)) editingFail("LOCKED", "The batch changes protected content.");
      if (signal?.aborted) editingFail("CANCELLED", "The batch was cancelled.");
      if (JSON.stringify(before) === JSON.stringify(candidate))
        return { ok: true, revision: editingRevision(), created: [], changed: false };
      // No asynchronous boundary: only validated candidates reach this commit.
      const recovery = { state: projectState, past: [...projectPast], future: [...projectFuture],
        checkpoints: [...projectCheckpoints], meta: projectCopy(projectMeta), dirty: mediaDirty };
      try {
        projectState = candidate;
        projectCheckpoints.push({ id: projectID("checkpoint"), name: "Before editing batch", created: new Date().toISOString(), state: before });
        if (projectCheckpoints.length > 40) projectCheckpoints.shift();
        projectPush(before);
        projectRender(true);
      } catch (error) {
        clearTimeout(projectDraftTimer);
        projectState = recovery.state;
        projectPast = recovery.past;
        projectFuture = recovery.future;
        projectCheckpoints = recovery.checkpoints;
        projectMeta = recovery.meta;
        mediaDirty = recovery.dirty;
        mediaConfig.slides = projectCopy(projectState.media);
        try { projectRender(true); } catch {}
        if (mediaDirty) projectScheduleDraft();
        editingFail("COMMIT_FAILED", "The batch was rolled back: " + error.message);
      }
      return { ok: true, revision: editingRevision(), created, changed: true };
    } catch (error) {
      return { ok: false, code: error.code || "INVALID", message: error.message };
    }
  },
});
Object.defineProperty(window, "presentationStudioEditing", { value: studioEditing });
const editingInit = projectInit;
projectInit = function () {
  editingInit();
  $("fe-slide-title").oninput = event => {
    try {
      const changes = { title: event.target.value };
      editingSlide(projectState, projectSelected);
      editingValidateUpdate(changes);
      projectEdit(() => editingUpdate(projectState, projectSelected, changes));
    }
    catch (error) { projectMessage(error.message); }
  };
  $("ce-float").onclick = () => {
    vbEnd(false);
    projectFlush();
    const figure = ceFigure(), rect = figure ? ceDefaultRect(figure) : { x: 0.6, y: 0.5, w: 0.35, h: 0.4 };
    const snapshot = studioEditing.read();
    const result = studioEditing.apply({ apiVersion: 1, projectId: snapshot.projectId, expectedRevision: snapshot.revision,
      operations: [{ type: "media.place", slideId: projectSelected, objectId: ceSelected, placement: rect }] });
    if (!result.ok) projectMessage(result.message);
  };
};
