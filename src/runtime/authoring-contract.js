// Portable authoring v1: declarative data only. Shared limits drive validation and schema.
const paLimits = { slides: 100, blocks: 30, text: 10000, notes: 20000, bytes: 2000000 };
const paBlockTypes = ["heading", "paragraph", "list", "table", "code", "image-placeholder"];
function paSchema() {
  const text = { type: "string", maxLength: paLimits.text };
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    title: "Presentation Studio portable authoring v1", type: "object", additionalProperties: false,
    required: ["format", "version", "title", "slides"],
    properties: {
      format: { const: "presentation-studio-authoring" }, version: { const: 1 },
      title: { type: "string", minLength: 1, maxLength: 200 },
      slides: { type: "array", minItems: 1, maxItems: paLimits.slides, items: {
        type: "object", additionalProperties: false, required: ["title", "blocks"],
        properties: {
          title: { type: "string", minLength: 1, maxLength: 200 },
          notes: { type: "string", maxLength: paLimits.notes },
          sources: { type: "array", maxItems: 10, items: { type: "object", additionalProperties: false,
            required: ["label", "url"], properties: { label: text, url: { type: "string", pattern: "^https?://", maxLength: 2000 } } } },
          blocks: { type: "array", maxItems: paLimits.blocks, items: { oneOf: paBlockTypes.map(type => {
            const properties = { type: { const: type } }, required = ["type"];
            if (["heading", "paragraph", "code", "image-placeholder"].includes(type)) { properties.text = text; required.push("text"); }
            if (type === "heading") properties.level = { type: "integer", minimum: 1, maximum: 3 };
            if (type === "code") properties.language = { type: "string", maxLength: 80 };
            if (type === "list") { properties.items = { type: "array", minItems: 1, maxItems: 20, items: text }; required.push("items"); }
            if (type === "table") { properties.headers = { type: "array", minItems: 1, maxItems: 10, items: text };
              properties.rows = { type: "array", maxItems: 30, items: { type: "array", minItems: 1, maxItems: 10, items: text } }; required.push("headers", "rows"); }
            return { type: "object", additionalProperties: false, properties, required };
          }) } },
        },
      } },
    },
  };
}
function paValidate(raw) {
  // Validate with the same schema shipped in the instruction pack; no remote refs/dependencies.
  function check(value, rule, path) {
    const fail = message => { throw new Error(path + ": " + message); };
    if (rule.oneOf) {
      const match = rule.oneOf.find(r => r.properties.type.const === value?.type);
      if (!match) fail("unsupported block type; use " + paBlockTypes.join(", "));
      return check(value, match, path);
    }
    if (Object.hasOwn(rule, "const") && value !== rule.const) fail("expected " + JSON.stringify(rule.const));
    if (rule.type === "object") {
      if (!value || typeof value !== "object" || Array.isArray(value)) fail("expected an object");
      for (const key of rule.required || []) if (!Object.hasOwn(value, key)) fail("missing " + key);
      for (const key of Object.keys(value)) {
        if (!Object.hasOwn(rule.properties, key)) fail("unsupported field " + key);
        check(value[key], rule.properties[key], path + "." + key);
      }
    } else if (rule.type === "array") {
      if (!Array.isArray(value)) fail("expected an array");
      if (value.length < (rule.minItems || 0) || value.length > rule.maxItems) fail("item count outside supported limits");
      value.forEach((item, i) => check(item, rule.items, path + "[" + i + "]"));
    } else if (rule.type === "string") {
      if (typeof value !== "string") fail("expected text");
      if (value.length > rule.maxLength || (rule.minLength && !value.trim())) fail("text length outside supported limits");
      if (rule.pattern) {
        if (!/^https?:\/\//i.test(value)) fail("use an HTTP(S) source URL");
        try { const url = new URL(value); if (url.username || url.password) fail("source URL must not contain credentials"); } catch { fail("invalid source URL"); }
      }
    } else if (rule.type === "integer" && (!Number.isInteger(value) || value < rule.minimum || value > rule.maximum)) fail("invalid integer");
  }
  check(raw, paSchema(), "presentation");
  raw.slides.forEach((slide, i) => slide.blocks.forEach((block, j) => {
    if (block.type === "table" && block.rows.some(row => row.length !== block.headers.length))
      throw new Error(`presentation.slides[${i}].blocks[${j}]: table rows must match header width`);
  }));
  return raw;
}
function paConvert(raw, identity) {
  paValidate(raw);
  const text = (tag, value, cls = "") => projectNode(tag, cls, [value]);
  const slides = raw.slides.map((slide, i) => {
    const content = slide.blocks.map(block => {
      if (block.type === "heading") return text("h" + (block.level || 2), block.text);
      if (block.type === "paragraph") return text("p", block.text);
      if (block.type === "image-placeholder") return text("p", "Image placeholder: " + block.text, "pa-placeholder");
      if (block.type === "list") return projectNode("ul", "", block.items.map(item => text("li", item)));
      if (block.type === "code") return projectNode("div", "card", [
        ...(block.language ? [text("small", block.language)] : []), projectNode("pre", "", [text("code", block.text)]),
      ]);
      return projectNode("table", "", [projectNode("thead", "", [projectNode("tr", "", block.headers.map(cell => text("th", cell)))]),
        projectNode("tbody", "", block.rows.map(row => projectNode("tr", "", row.map(cell => text("td", cell)))))]);
    });
    if (slide.sources?.length) content.push(projectNode("div", "pa-sources", slide.sources.map(source => ({
      tag: "p", attrs: {}, children: [{ tag: "a", attrs: { href: source.url }, children: [{ text: source.label }] }],
    }))));
    const tree = [projectNode("div", "", [text("h1", slide.title)]), projectNode("div", "pa-content", content)];
    return { id: "authoring-slide-" + (i + 1), title: slide.title, group: "overview", template: "blank", classes: "wide pa-slide",
      tree, templateBase: projectCopy(tree), notes: slide.notes || "", duration: 30, commands: {} };
  });
  return projectValidatePack({ schemaVersion: 2, kind: "presentation-studio-project", meta: {
    id: identity || projectID("project"), name: raw.title, updatedAt: new Date().toISOString(),
  }, state: { projectName: raw.title, slides, trash: [], loops: {}, brand: {}, media: {} }, checkpoints: [], history: { past: [], future: [] } });
}
