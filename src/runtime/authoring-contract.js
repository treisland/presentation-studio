// Portable authoring v1: declarative data only. Shared limits drive validation and schema.
const paLimits = { slides: 100, blocks: 30, text: 10000, notes: 20000, bytes: 2000000 };
const paBlockTypes = ["heading", "paragraph", "list", "table", "code", "image-placeholder", ...Object.keys(paWidgetCatalog)];
function paSchema() {
  const text = { type: "string", maxLength: paLimits.text };
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    title: "Presentation Studio portable authoring v1", type: "object", additionalProperties: false,
    required: ["format", "version", "title", "slides"],
    properties: {
      format: { const: "presentation-studio-authoring" }, version: { const: 1 },
      title: { type: "string", minLength: 1, maxLength: 200 },
      background: bgEngine.schema(),
      slides: { type: "array", minItems: 1, maxItems: paLimits.slides, items: {
        type: "object", additionalProperties: false, required: ["title", "blocks"],
        properties: {
          title: { type: "string", minLength: 1, maxLength: 200 },
          layout: { type: "string", enum: Object.keys(paLayoutCatalog) },
          background: bgEngine.schema(),
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
            const widget = paWidgetCatalog[type];
            if (widget) {
              for (const key of widget.authoringFields || widget.fields.map(field => field[2]))
                properties[key] = key === "number" ? { type: "integer", minimum: 1, maximum: 9999 } : { ...text };
              required.push(...widget.required);
              if (type === "arrow") { properties.label.maxLength = 200; properties.description.maxLength = 1000; }
            }
            return { type: "object", additionalProperties: false, properties, required };
          }) } },
        },
      } },
    },
  };
}
function paValidate(raw) {
  // Validate with the same schema shipped in the instruction pack; no remote refs/dependencies.
  const errors = [];
  function check(value, rule, path) {
    if (errors.length >= 20) return;
    const fail = message => { errors.push(path + ": " + message); };
    if (rule.oneOf) {
      const match = rule.oneOf.find(r => r.properties.type.const === value?.type);
      if (!match) return fail("unsupported block type; use " + paBlockTypes.join(", "));
      return check(value, match, path);
    }
    if (Object.hasOwn(rule, "const") && value !== rule.const) fail("expected " + JSON.stringify(rule.const));
    if (rule.enum && !rule.enum.includes(value)) fail("choose " + rule.enum.join(", "));
    if (rule.type === "object") {
      if (!value || typeof value !== "object" || Array.isArray(value)) return fail("expected an object");
      for (const key of rule.required || []) if (!Object.hasOwn(value, key)) fail("missing " + key);
      for (const key of Object.keys(value)) {
        if (!Object.hasOwn(rule.properties, key)) fail("unsupported field " + key);
        else check(value[key], rule.properties[key], path + "." + key);
      }
    } else if (rule.type === "array") {
      if (!Array.isArray(value)) return fail("expected an array");
      if (value.length < (rule.minItems || 0) || value.length > rule.maxItems) fail("item count outside supported limits");
      value.slice(0, rule.maxItems).forEach((item, i) => check(item, rule.items, path + "[" + i + "]"));
    } else if (rule.type === "string") {
      if (typeof value !== "string") return fail("expected text");
      if (value.length > rule.maxLength || (rule.minLength && !value.trim())) fail("text length outside supported limits");
      if (rule.pattern) {
        if (!new RegExp(rule.pattern).test(value)) return fail(rule.pattern==='^https?://'?'use an HTTP(S) source URL':'value does not match the supported format');
        if(rule.pattern==='^https?://')try { const url = new URL(value); if (url.username || url.password) fail("source URL must not contain credentials"); } catch { fail("invalid source URL"); }
      }
    } else if (['integer','number'].includes(rule.type) && (!Number.isFinite(value) || rule.type==='integer'&&!Number.isInteger(value) || value < rule.minimum || value > rule.maximum)) fail("invalid number");
    else if(rule.type==='boolean'&&typeof value!=='boolean')fail('expected a boolean');
  }
  check(raw, paSchema(), "presentation");
  if (errors.length) throw new Error(errors.join("\n") + (errors.length === 20 ? "\nShowing the first 20 errors." : ""));
  raw.slides.forEach((slide, i) => slide.blocks.forEach((block, j) => {
    if (block.type === "table" && block.rows.some(row => row.length !== block.headers.length))
      errors.push(`presentation.slides[${i}].blocks[${j}]: table rows must match header width`);
  }));
  if (errors.length) throw new Error(errors.slice(0, 20).join("\n"));
  return raw;
}
function paConvert(raw, identity) {
  return paBuild(raw, identity).pack;
}
