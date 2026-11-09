// Build a detached candidate with the Library's state handlers. No live-project transaction occurs until import acceptance.
function paChooseLayout(slide, index) {
  const blocks = slide.blocks, requested = slide.layout || "auto";
  const compatible = name => {
    const layout = paLayoutCatalog[name];
    return blocks.length >= layout.min && blocks.length <= layout.max &&
      (!layout.types || blocks.every(block => layout.types.includes(block.type))) &&
      (!layout.requires || blocks.some(block => block.type === layout.requires));
  };
  if (requested !== "auto") return compatible(requested)
    ? { requested, selected: requested, notices: [] }
    : { requested, selected: "flexible", notices: [`${paLayoutCatalog[requested].name} is incompatible with these elements; Flexible preserves all content.`] };
  const selected = blocks.length >= 2 && blocks.every(block => block.type === "step") && blocks.length <= 4 ? "workflow"
    : blocks.some(block => block.type === "table") ? "table"
    : blocks.some(block => block.type === "code") ? "code"
    : blocks.length === 2 && index > 0 ? "comparison"
    : index === 0 && blocks.length > 0 && blocks.length <= 2 ? "hero" : "flexible";
  return { requested, selected, notices: [] };
}
function paPlacements(blocks, layout, sources) {
  if (!blocks.length) return [];
  const area = { x: .055, y: .265, w: .89, h: sources ? .49 : .59 }, gap = .025;
  if (["table", "code"].includes(layout) && blocks.length > 1) {
    const featured = blocks.findIndex(block => block.type === layout), rest = blocks.filter((_, i) => i !== featured);
    const other = paPlacements(rest, "flexible", sources).map(rect => ({ x: .66 + (rect.x - area.x) * .32, y: rect.y, w: rect.w * .32, h: rect.h }));
    let index = 0;
    return blocks.map((_, i) => i === featured ? { ...area, w: .58 } : other[index++]);
  }
  const columns = layout === "workflow" ? blocks.length : ["comparison", "hero"].includes(layout) ? blocks.length : blocks.length <= 2 ? 1 : blocks.length <= 6 ? 2 : 3;
  const rows = Math.ceil(blocks.length / columns), w = (area.w - gap * (columns - 1)) / columns, h = (area.h - gap * (rows - 1)) / rows;
  // 30 elements is a schema bound, not a promise of readable fit. Preserve them and warn in review.
  return blocks.map((_, i) => ({ x: area.x + (i % columns) * (w + gap), y: area.y + Math.floor(i / columns) * (h + gap), w, h: Math.max(.05, h) }));
}
function paNativeOperation(state, operation) {
  const created = [], handler = editingOperations.get(operation.type);
  if (!handler) throw new Error("Unsupported native element operation: " + operation.type);
  handler(state, operation, created);
  editingAfterOperation(state, operation, created);
  return created.at(-1);
}
function paNativeElement(state, slide, block, placement, notices, codeUsed) {
  const op = { slideId: slide.id }, text = (tag, value, cls = "") => projectNode(tag, cls, [value]);
  let key, node;
  if (block.type === "table") {
    key = paNativeOperation(state, { ...op, type: "table.insert", rows: Math.max(1, block.rows.length), columns: block.headers.length, header: true });
    node = slide.tree.find(item => dbID(item) === key);
    projectWriteTable(projectFind({ tree: [node] }, item => item.tag === "table")[0].node, block.headers, block.rows);
  } else if (block.type === "code" && !codeUsed) {
    key = paNativeOperation(state, { ...op, type: "code.update", commands: {
      shared: block.text, language: block.language || "", environment: "", variants: [], initial: "shared", detectOS: false, hidden: false,
    } });
    node = slide.tree.find(item => dbID(item) === key);
  } else if (Object.hasOwn(paWidgetCatalog, block.type)) {
    key = paNativeOperation(state, { ...op, type: "block.create", kind: block.type, placement });
    node = slide.tree.find(item => dbID(item) === key);
    if (block.type === "arrow") paNativeOperation(state, { ...op, type: "annotation.arrow", key, label: block.label || "", description: block.description || "" });
    else for (const [index, field] of paWidgetCatalog[block.type].fields.entries()) {
      const value = block[field[2]];
      if (block.type === "step" && index === 0) {
        if (value != null) paNativeOperation(state, { ...op, type: "annotation.step", key, number: value });
      } else paNativeOperation(state, { ...op, type: "component.field", blockId: key, index, text: value ?? (field[2] === "icon" ? "★" : "") });
    }
  } else {
    key = paNativeOperation(state, { ...op, type: "block.create", kind: "text", placement });
    node = slide.tree.find(item => dbID(item) === key);
    if (block.type === "list") node.children = [projectNode("ul", "", block.items.map(item => text("li", item)))];
    else if (block.type === "heading") node.children = [text("h" + (block.level || 2), block.text)];
    else if (block.type === "code") {
      node.children = [...(block.language ? [text("small", block.language)] : []), projectNode("pre", "", [text("code", block.text)])];
      notices.push("Additional code snippet kept as an editable text/code container; Studio supports one native Code block per slide.");
    } else node.children = [text("p", block.type === "image-placeholder" ? "Image placeholder: " + block.text : block.text)];
    if (block.type === "image-placeholder") notices.push("Image placeholder: add appropriately licensed media in Studio; no image was fetched.");
  }
  node.attrs.class += " pa-element pa-" + block.type;
  paNativeOperation(state, { ...op, type: "block.place", blockId: key, placement });
  return key;
}
function paBuild(raw, identity) {
  paValidate(raw);
  const state = { projectName: raw.title, slides: [], trash: [], loops: {}, brand: {}, media: {} }, report = [];
  raw.slides.forEach((input, index) => {
    const layout = paChooseLayout(input, index), notices = [...layout.notices];
    const slide = { id: "authoring-slide-" + (index + 1), title: input.title, group: "overview",
      template: ["hero", "comparison", "workflow", "table", "code"].includes(layout.selected) ? layout.selected : "blank",
      classes: "wide pa-slide pa-layout-" + layout.selected, tree: [], notes: input.notes || "", duration: 30, commands: null };
    state.slides.push(slide);
    const title = paNativeElement(state, slide, { type: "heading", level: 1, text: input.title }, { x: .055, y: .065, w: .89, h: .17 }, notices, false);
    slide.tree.find(node => dbID(node) === title).attrs.class += " pa-title";
    const placements = paPlacements(input.blocks, layout.selected, input.sources?.length);
    let codeUsed = false;
    for (const [i, block] of input.blocks.entries()) {
      paNativeElement(state, slide, block, placements[i], notices, codeUsed);
      if (block.type === "code") codeUsed = true;
    }
    if (input.sources?.length) {
      const key = paNativeElement(state, slide, { type: "paragraph", text: "" }, { x: .055, y: .79, w: .89, h: .13 }, notices, codeUsed);
      const sources = slide.tree.find(node => dbID(node) === key); sources.attrs.class += " pa-sources";
      sources.children = input.sources.map(source => projectNode("p", "", [{ tag: "a", attrs: { href: source.url }, children: [{ text: source.label }] }]));
    }
    if (input.blocks.length > 6) notices.push("Many elements on one slide; consider splitting it for readable text.");
    slide.templateBase = projectCopy(slide.tree); slide.templateClasses = slide.classes; slide.templateCommands = projectCopy(slide.commands);
    report.push({ ...layout, notices, elements: input.blocks.map(block => block.type) });
  });
  const pack = projectValidatePack({ schemaVersion: 2, kind: "presentation-studio-project", meta: {
    id: identity || projectID("project"), name: raw.title, updatedAt: new Date().toISOString(),
  }, state, checkpoints: [], history: { past: [], future: [] } });
  return { pack, report };
}
function paNodeType(node) {
  const recorded = paBlockTypes.find(type => mgHas(node, "pa-" + type));
  if (recorded) return recorded;
  const widget = Object.keys(paWidgetCatalog).find(type => mgHas(node, "component-" + type) || mgHas(node, "db-" + type));
  if (widget) return widget;
  if (projectFind({ tree: [node] }, item => item.tag === "table").length) return "table";
  if (projectFind({ tree: [node] }, item => mgHas(item, "terminal")).length) return "code";
  return "paragraph";
}
editingRegisterOperation("authoring.layout", (state, operation) => {
  if (!Object.hasOwn(paLayoutCatalog, operation.layout)) editingFail("INVALID", "Choose a supported authoring layout.");
  const slide = editingSlide(state, operation.slideId);
  if (!/\bpa-slide\b/.test(slide.classes)) editingFail("INVALID", "Select a slide imported with the AI authoring workflow.");
  const entries = spEntries(slide, state);
  if (entries.some(spProtected)) editingFail("LOCKED", "Unlock all slide elements before reflowing.");
  if (entries.some(entry => entry.meta.group)) editingFail("INVALID", "Ungroup the slide elements before reflowing.");
  const body = slide.tree.filter(node => dbID(node) && !mgHas(node, "pa-title") && !mgHas(node, "pa-sources"));
  if (body.length > paLimits.blocks) editingFail("INVALID", "Reflow supports at most 30 content elements. Arrange this slide manually.");
  const blocks = body.map(node => ({ type: paNodeType(node) }));
  const selected = paChooseLayout({ layout: operation.layout, blocks }, state.slides.indexOf(slide)).selected;
  const placements = paPlacements(blocks, selected, slide.tree.some(node => mgHas(node, "pa-sources")));
  body.forEach((node, i) => {
    if (!mgHas(node, "pa-element")) node.attrs.class += " pa-element pa-" + blocks[i].type;
    dbPlace(node, placements[i]);
  });
  slide.classes = slide.classes.replace(/\bpa-layout-[\w-]+\b/g, "").trim() + " pa-layout-" + selected;
  slide.template = ["hero", "comparison", "workflow", "table", "code"].includes(selected) ? selected : "blank";
});
