// Free blocks reuse the safe AST. IDs are class tokens, scoped to their slide.
let dbSelected = "", dbDrag = null;
const dbKinds = ["text", "rectangle", "circle", "callout"];
const dbID = node => /\bdb-block\b/.test(node?.attrs?.class || "") ? (node.attrs.class.match(/\bblock-[\w-]+\b/)?.[0] || "") : "";
const dbStyle = projectSafeStyle;
projectSafeStyle = function (value) {
  return String(value || "").split(";").map(rule => {
    const match = rule.trim().match(/^(left|top|width|height):\s*(\d+(?:\.\d+)?)%$/i);
    if (match && Number(match[2]) <= 100) return rule.trim();
    if (/^\s*position:\s*absolute\s*$/i.test(rule) || /^\s*z-index:\s*(?:\d{1,3}|1000)\s*$/i.test(rule)) return rule.trim();
    return dbStyle(rule);
  }).filter(Boolean).join(";");
};
const dbTree = projectValidateTree;
projectValidateTree = function (tree, depth = 0, budget = { count: 0 }) {
  budget.blockIDs ||= new Set();
  for (const node of tree || []) {
    const id = dbID(node);
    if (/\bdb-block\b/.test(node?.attrs?.class || "") && !id) throw new Error("Content block ID is missing.");
    if (id) {
      if (budget.blockIDs.has(id)) throw new Error("Duplicate content block ID.");
      budget.blockIDs.add(id);
    }
  }
  const result = dbTree(tree, depth, budget);
  for (const node of result) if (dbID(node)) dbPlace(node, dbRect(node));
  return result;
};
function dbRect(node) {
  const style = document.createElement("div").style;
  style.cssText = node.attrs.style || "";
  return { x: parseFloat(style.left) / 100, y: parseFloat(style.top) / 100,
    w: parseFloat(style.width) / 100, h: parseFloat(style.height) / 100, layer: Number(style.zIndex || 4) };
}
function dbClampPlacement(node,placement){
  if(!mgHas(node,'db-template'))return cePlacement(placement);
  const x=Math.max(0,Math.min(.995,placement.x)),y=Math.max(0,Math.min(.995,placement.y));
  return {...placement,x,y,w:Math.max(.005,Math.min(1-x,placement.w)),h:Math.max(.005,Math.min(1-y,placement.h))};
}
function dbResize(p, direction, dx, dy, min, snap = null) {
  let left = p.x, top = p.y, right = p.x + p.w, bottom = p.y + p.h;
  if (direction.includes("w")) left = Math.max(0, Math.min(right - min, left + dx));
  if (direction.includes("e")) right = Math.max(p.x + min, Math.min(1, right + dx));
  if (direction.includes("n")) top = Math.max(0, Math.min(bottom - min, top + dy));
  if (direction.includes("s")) bottom = Math.max(p.y + min, Math.min(1, bottom + dy));
  if (snap) {
    const x = direction.includes("w") ? left : right, y = direction.includes("n") ? top : bottom;
    const snapped = snap({ x: 0, y: 0, w: x, h: y });
    if (/[ew]/.test(direction) && x >= .05) {
      if (direction.includes("w")) left = Math.max(0, Math.min(p.x + p.w - min, snapped.w));
      else right = Math.max(p.x + min, Math.min(1, snapped.w));
    }
    if (/[ns]/.test(direction) && y >= .05) {
      if (direction.includes("n")) top = Math.max(0, Math.min(p.y + p.h - min, snapped.h));
      else bottom = Math.max(p.y + min, Math.min(1, snapped.h));
    }
  }
  return { ...p, x: left, y: top, w: Math.max(min, right - left), h: Math.max(min, bottom - top) };
}
const dbView = weView;
weView = function (...args) {
  const result = dbView(...args);
  if (projectPreviewNode && weMounted) $("fe-preview").style.setProperty("--db-scale", weScale());
  return result;
};
function dbPlace(node, placement, layer = dbRect(node).layer) {
  if (!placement || !["x", "y", "w", "h"].every(k => Number.isFinite(placement[k])) ||
      placement.x < 0 || placement.y < 0 || placement.w < (mgHas(node,'db-template')?.005:.05) || placement.h < (mgHas(node,'db-template')?.005:.05) ||
      placement.x + placement.w > 1.000001 || placement.y + placement.h > 1.000001 ||
      !Number.isInteger(layer) || layer < 0 || layer > 1000) editingFail("INVALID", "Block placement must fit inside the slide; layer must be 0–1000.");
  const p = mgHas(node,'db-template') ? {...placement} : cePlacement(placement);
  node.attrs.style = (node.attrs.style || "").split(";").filter(rule => !/^\s*(position|left|top|width|height|z-index)\s*:/i.test(rule)).join(";") +
    `;position:absolute;left:${Number((p.x * 100).toFixed(6))}%;top:${Number((p.y * 100).toFixed(6))}%;width:${Number((p.w * 100).toFixed(6))}%;height:${Number((p.h * 100).toFixed(6))}%;z-index:${layer}`;
}
function dbOperation(state, op, created) {
  if (!op?.type?.startsWith("block.")) return false;
  const slide = editingSlide(state, op.slideId);
  const found = slide.tree.find(node => dbID(node) === op.blockId);
  if (op.type === "block.create") {
    if (!dbKinds.includes(op.kind) || slide.tree.filter(dbID).length >= 60) editingFail("INVALID", "Choose a supported block; at most 60 free blocks per slide.");
    const id = op.blockId || projectID("block");
    if (!/^block-[\w-]+$/.test(id) || slide.tree.some(n => dbID(n) === id)) editingFail("INVALID", "Invalid or duplicate block ID.");
    const node = projectNode("div", "db-block card db-" + op.kind + " " + id,
      [projectNode("p", "", [op.kind === "text" ? "Edit this text" : op.kind === "callout" ? "Key message" : "Shape"])]);
    dbPlace(node, op.placement || { x: 0.55, y: 0.25, w: op.kind === "circle" ? 0.18 : 0.3, h: op.kind === "circle" ? 0.32 : 0.25 }, op.layer ?? 4);
    slide.tree.push(node); created.push(id);
  } else {
    if (!found) editingFail("NOT_FOUND", "Content block not found.");
    if (op.type === "block.place") dbPlace(found, op.placement, op.layer ?? dbRect(found).layer);
    else if (op.type === "block.remove") slide.tree.splice(slide.tree.indexOf(found), 1);
    else if (op.type === "block.duplicate") {
      if (slide.tree.filter(dbID).length >= 60) editingFail("INVALID", "At most 60 free blocks per slide.");
      const copy = projectCopy(found), id = projectID("block"), p = dbRect(copy);
      copy.attrs.class = copy.attrs.class.replace(dbID(copy), id);
      dbPlace(copy, cePlacement({ ...p, x: p.x + 0.02, y: p.y + 0.02 }), Math.min(1000, p.layer + 1));
      slide.tree.push(copy); created.push(id);
    } else editingFail("INVALID", "Unsupported block operation.");
  }
  return true;
}
// Media wrapping may narrow its original-content pane. Free blocks remain slide-relative.
const dbMediaApply = mediaApply;
mediaApply = function (slide) {
  dbMediaApply(slide);
  for (const node of slide.querySelectorAll(":scope > .media-original > .db-block")) slide.append(node);
};
function dbRun(operation, snapshot = null) {
  if (!snapshot) { vbEnd(false); projectFlush(); snapshot = studioEditing.read(); }
  const result = studioEditing.apply({ apiVersion: 1, projectId: snapshot.projectId, expectedRevision: snapshot.revision,
    operations: [{ slideId: projectSelected, ...operation }] });
  if (result.ok && result.created.length) dbSelected = result.created.at(-1);
  if (!result.ok) projectMessage(result.message);
  dbAttach();
  return result;
}
function dbNode() { return projectModel()?.tree.find(n => dbID(n) === dbSelected); }
function dbAlign(choice) {
  const node = dbNode();
  if (!node || !weEditing() || vbMode !== 'edit' || ceLocked() || spMeta(dbSelected).locked) return;
  const p = dbRect(node);
  if (['left', 'center', 'right'].includes(choice)) p.x = choice === 'left' ? 0 : choice === 'center' ? (1 - p.w) / 2 : 1 - p.w;
  else if (['top', 'middle', 'bottom'].includes(choice)) p.y = choice === 'top' ? 0 : choice === 'middle' ? (1 - p.h) / 2 : 1 - p.h;
  else return;
  dbRun({ type: 'block.place', blockId: dbSelected, placement: p });
}
function dbPanel() {
  if (!$("db-list")) return;
  const nodes = projectModel()?.tree.filter(dbID) || [], select = $("db-list");
  select.replaceChildren(new Option("Choose a content block", ""));
  for (const node of nodes) select.add(new Option(projectText(node).slice(0, 60) || "Shape", dbID(node)));
  const node = dbNode();
  select.value = node ? dbSelected : "";
  $("db-arrange").hidden = !node;
  if (node) {
    const p = dbRect(node);
    for (const key of ["x", "y", "w", "h"]) $("db-" + key).value = Math.round(p[key] * 1000) / 10;
    $("db-layer").value = p.layer;
  }
  for (const root of projectPreviewNode?.querySelectorAll(".db-block") || []) root.classList.toggle("db-selected", root.classList.contains(dbSelected) && !!node);
}
function dbAttach() {
  if (!projectPreviewNode || !$("db-list")) return;
  for (const block of projectPreviewNode.querySelectorAll(".db-block")) {
    block.querySelectorAll(":scope > .db-handle").forEach(el => el.remove());
    const content = block.querySelector(':scope > .db-circle-content');
    if (content && vbMode !== 'edit') content.replaceWith(...content.childNodes);
    if (vbMode !== "edit") continue;
    if (block.classList.contains('db-circle') && !content) {
      const clip = document.createElement('div');
      clip.className = 'db-circle-content';
      clip.append(...block.childNodes);
      block.append(clip);
    }
    block.tabIndex = 0;
    for (const direction of ["move", "se", "s", "sw", "w", "nw", "n", "ne", "e"]) {
      const move = direction === "move", kind = move ? "move" : "resize";
      const button = document.createElement("button");
      button.type = "button"; button.className = "db-handle " + (move ? "db-move" : direction === "se" ? "db-resize db-resize-se" : "db-resize-" + direction); button.dataset.dbDrag = kind;
      if (!move) button.dataset.dbDirection = direction;
      const names = { se: "bottom right", s: "bottom", sw: "bottom left", w: "left", nw: "top left", n: "top", ne: "top right", e: "right" };
      button.setAttribute("aria-label", move ? "Move content block" : "Resize content block" + (direction === "se" ? "" : " " + names[direction]));
      button.title = move ? "Move content block" : "Resize " + names[direction];
      button.textContent = move ? "⠿" : "";
      button.disabled = ceLocked() || !!spMeta(dbID({attrs:{class:block.className}})).locked;
      button.onclick = () => { dbSelected = [...block.classList].find(c => c.startsWith("block-")); dbPanel(); button.focus(); };
      block.append(button);
    }
  }
  dbPanel();
}
const dbPreview = projectPreview;
projectPreview = function (...args) { const result = dbPreview(...args); dbAttach(); return result; };
const dbSelect = vbSetSelection;
vbSetSelection = function (selection) {
  dbSelect(selection);
  const block = selection?.el.closest(".db-block");
  dbSelected = block ? [...block.classList].find(c => c.startsWith("block-")) : "";
  dbPanel();
};
const dbModify = vbModify;
vbModify = function (action) {
  const id = dbID(vbNode());
  if (id && ["delete", "duplicate"].includes(action)) {
    dbSelected = id;
    return dbRun({ type: action === "delete" ? "block.remove" : "block.duplicate", blockId: id });
  }
  return dbModify(action);
};
function dbFinish(cancel = false) {
  spClearGuides();
  const gesture = dbDrag;
  if (!gesture) return;
  dbDrag = null;
  try { gesture.el.releasePointerCapture(gesture.pointer); } catch {}
  gesture.el.style.cssText = gesture.style;
  if (!cancel && projectSelected === gesture.slideId && weEditing() && vbMode === "edit" && !ceLocked() && !spMeta(gesture.id).locked && ["x", "y", "w", "h"].some(key => Math.abs(gesture.next[key] - gesture.p[key]) > .00000001)) dbRun({ type: "block.place", blockId: gesture.id, placement: gesture.next }, gesture.snapshot);
  else dbAttach();
}
const dbInit = projectInit;
projectInit = function () {
  dbInit();
  const palette = document.createElement("details"); palette.id = "db-palette";
  palette.innerHTML = '<summary>Add block</summary><div>' + dbKinds.map(kind => '<button data-db-kind="' + kind + '">' + kind[0].toUpperCase() + kind.slice(1) + '</button>').join("") + '<button id="db-add-media">Media…</button></div>';
  $("we-panel-tools").append(palette);
  palette.addEventListener("keydown", e => {
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); palette.open = false; palette.querySelector("summary").focus(); }
  });
  palette.querySelectorAll("[data-db-kind]").forEach(button => button.onclick = () => {
    dbRun({ type: "block.create", kind: button.dataset.dbKind }); palette.open = false;
    wePanels.inspector.open = true; wePanelView(); $("db-list").focus();
  });
  $("db-add-media").onclick = () => { palette.open = false; wePanels.inspector.open = true; wePanelView(); weInspect("media"); $("ce-upload").click(); };
  const panel = document.createElement("section"); panel.id = "db-panel";
  panel.innerHTML = '<label for="db-list">Content blocks</label><select id="db-list"></select><div id="db-arrange" hidden><div class="db-fields">' +
    ["x", "y", "w", "h"].map(k => '<label>' + ({x:"Left",y:"Top",w:"Width",h:"Height"}[k]) + ' %<input id="db-' + k + '" type="number" min="0" max="100" step="0.5"></label>').join("") +
    '<label>Layer<input id="db-layer" type="number" min="0" max="40" step="1"></label></div><p class="db-align-label">Align to slide</p><div id="db-alignment"></div><button id="db-duplicate">Duplicate block</button><button id="db-remove">Remove block</button><p>Move/resize handles support arrows. Shift moves faster; Escape cancels dragging. Alt bypasses snapping.</p></div>';
  $("we-common").append(panel);
  for (const [axis, choices] of [['Horizontal', ['left', 'center', 'right']], ['Vertical', ['top', 'middle', 'bottom']]]) {
    const group = document.createElement('fieldset'), legend = document.createElement('legend');
    legend.textContent = axis; group.append(legend);
    const actions = document.createElement('div');
    for (const choice of choices) {
      const button = document.createElement('button'); button.type = 'button'; button.id = 'db-align-' + choice;
      const name = 'Align block ' + choice + ' to slide'; button.setAttribute('aria-label', name); button.title = name;
      button.append(workbenchIcon('align' + choice[0].toUpperCase() + choice.slice(1)));
      button.onclick = () => dbAlign(choice); actions.append(button);
    }
    group.append(actions); $('db-alignment').append(group);
  }
  $("db-list").onchange = e => { dbSelected = e.target.value; dbPanel(); };
  for (const key of ["x", "y", "w", "h", "layer"]) $("db-" + key).onchange = e => {
    const node = dbNode(); if (!node) return;
    const p = dbRect(node); p[key] = Number(e.target.value) / (key === "layer" ? 1 : 100);
    dbRun({ type: "block.place", blockId: dbSelected, placement: p, layer: p.layer });
  };
  $("db-duplicate").onclick = () => dbRun({ type: "block.duplicate", blockId: dbSelected });
  $("db-remove").onclick = () => dbRun({ type: "block.remove", blockId: dbSelected });
  window.addEventListener("pointerdown", e => {
    const handle = e.target.closest?.("[data-db-drag]");
    let block = handle?.closest(".db-block");
    if (!block || !projectPreviewNode.contains(block) || !weEditing() || vbMode !== "edit" || ceLocked() || spMeta(dbID({attrs:{class:block.className}})).locked || e.button !== 0 || weSpace || ceDrag || ceRelocate) return;
    e.preventDefault(); e.stopImmediatePropagation(); vbEnd(false); projectFlush();
    dbSelected = [...block.classList].find(c => c.startsWith("block-"));
    block = projectPreviewNode.querySelector('.' + dbSelected);
    if (!block) return;
    dbPanel();
    dbDrag = { el: block, id: dbSelected, slideId: projectSelected, p: dbRect(dbNode()), next: dbRect(dbNode()),
      bounds: block.closest(".slide").getBoundingClientRect(), x: e.clientX, y: e.clientY, mode: handle.dataset.dbDrag, direction: handle.dataset.dbDirection || "se",
      style: block.style.cssText, pointer: e.pointerId, snapshot: studioEditing.read() };
    block.setPointerCapture(e.pointerId);
  }, true);
  window.addEventListener("pointermove", e => {
    if (!dbDrag || e.pointerId !== dbDrag.pointer) return;
    e.preventDefault(); const d = dbDrag, p = { ...d.p }, dx = (e.clientX - d.x) / d.bounds.width, dy = (e.clientY - d.y) / d.bounds.height;
    if (d.mode === "move") {
      p.x = Math.max(0, Math.min(1 - p.w, p.x + dx)); p.y = Math.max(0, Math.min(1 - p.h, p.y + dy));
      const snapped = spSnap(p,d.el.closest('.slide'),d.id,false,e.altKey);
      Object.assign(p, dbClampPlacement(dbNode(), { ...p, x: snapped.x, y: snapped.y }));
    } else {
      Object.assign(p, dbResize(d.p, d.direction, dx, dy, d.el.classList.contains('db-template') ? .005 : .05,
        value => spSnap(value,d.el.closest('.slide'),d.id,true,e.altKey)));
      for (const guide of d.el.closest('.slide').querySelectorAll('.sp-snap-guide')) {
        if ((guide.style.height && !/[ew]/.test(d.direction)) || (guide.style.width && !/[ns]/.test(d.direction))) guide.remove();
      }
    }
    d.next = p; Object.assign(d.el.style, { left: p.x*100+"%", top:p.y*100+"%", width:p.w*100+"%", height:p.h*100+"%" });
  }, true);
  window.addEventListener("pointerup", e => { if (dbDrag?.pointer === e.pointerId) dbFinish(); }, true);
  window.addEventListener("pointercancel", () => dbFinish(true), true);
  window.addEventListener("lostpointercapture", e => { if (dbDrag?.pointer === e.pointerId) dbFinish(true); }, true);
  window.addEventListener("blur", () => dbFinish(true));
  window.addEventListener("keydown", e => {
    if (e.key === "Escape" && dbDrag) { e.preventDefault(); e.stopImmediatePropagation(); dbFinish(true); return; }
    const block = e.target.closest?.(".db-block");
    if(block&&spMeta(dbID({attrs:{class:block.className}})).locked)return;
    if (!block || !projectPreviewNode.contains(block) || !weEditing() || vbMode !== "edit" || ceLocked() || !["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(e.key) ||
        (e.target !== block && !e.target.matches(".db-handle"))) return;
    e.preventDefault(); e.stopImmediatePropagation(); dbSelected = [...block.classList].find(c => c.startsWith("block-"));
    let p = dbRect(dbNode());
    const delta = e.shiftKey ? 0.01 : 0.002, handleKind = e.target.dataset.dbDrag, direction = e.target.dataset.dbDirection || "se";
    const dx = e.key === "ArrowLeft" ? -delta : e.key === "ArrowRight" ? delta : 0, dy = e.key === "ArrowUp" ? -delta : e.key === "ArrowDown" ? delta : 0;
    if (handleKind === "resize") p = dbResize(p, direction, dx, dy, mgHas(dbNode(),'db-template') ? .005 : .05);
    else p = dbClampPlacement(dbNode(), { ...p, x: Math.max(0, Math.min(1 - p.w, p.x + dx)), y: Math.max(0, Math.min(1 - p.h, p.y + dy)) });
    const before = dbRect(dbNode());
    if (!["x", "y", "w", "h"].some(key => Math.abs(p[key] - before[key]) > .00000001)) return;
    dbRun({ type:"block.place", blockId: dbSelected, placement: p });
    const root = projectPreviewNode.querySelector('.' + dbSelected);
    (handleKind ? root?.querySelector(handleKind === "resize" ? '[data-db-direction="' + direction + '"]' : '.db-move') : root)?.focus();
  }, true);
  $("full-editor").addEventListener("close", () => dbFinish(true));
  dbAttach();
};
