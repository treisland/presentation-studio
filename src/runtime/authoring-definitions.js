// Shared capability definitions: Library fields, portable schema and downloadable catalog.
const paWidgetCatalog = {
  quote: { name: "Quote", category: "Widgets", description: "Quotation and attribution", purpose: "An attributed statement",
    fields: [["Quotation", "A useful idea worth sharing.", "text"], ["Attribution", "— Your source", "attribution"]], required: ["text"] },
  metric: { name: "Metric card", category: "Widgets", description: "Value, label and supporting text", purpose: "A numeric result or concise fact",
    fields: [["Value", "42%", "value"], ["Label", "Your metric", "label"], ["Supporting text", "Explain what this means.", "text"]], required: ["value", "label"] },
  callout: { name: "Callout", category: "Widgets", description: "Icon, heading and key message", purpose: "A key takeaway or warning",
    fields: [["Icon", "★", "icon"], ["Heading", "Key message", "heading"], ["Body", "Explain the important detail.", "text"]], required: ["heading", "text"] },
  step: { name: "Step number", category: "Widgets", description: "Numbered badge with optional title and description", purpose: "An ordered process; numbers increment per slide",
    fields: [["Number", "1", "number"], ["Title", "Your next step", "title"], ["Description", "Explain what happens here.", "text"]], required: ["title"] },
  arrow: { name: "Arrow / Pointer", category: "Shapes", description: "Free arrow with editable endpoints, label and arrowheads", purpose: "A directional cue, not an attached connector",
    fields: [], required: [], authoringFields: ["label", "description"] },
};
const paLayoutCatalog = {
  auto: { name: "Auto", purpose: "Choose a compatible composition from the content", min: 0, max: 30 },
  hero: { name: "Hero", purpose: "Opening statement or one key message", min: 1, max: 2 },
  comparison: { name: "Comparison", purpose: "Two contrasting ideas or equal cards", min: 2, max: 2 },
  workflow: { name: "Workflow", purpose: "Two to four ordered Step elements", min: 2, max: 4, types: ["step"] },
  table: { name: "Table", purpose: "Structured records, with optional supporting content", min: 1, max: 30, requires: "table" },
  code: { name: "Code", purpose: "One native code block with optional explanation", min: 1, max: 30, requires: "code" },
  flexible: { name: "Flexible", purpose: "Automatic free-block grid for mixed content; no supplied coordinates", min: 0, max: 30 },
};
function paCatalog() {
  return {
    format: "presentation-studio-authoring", version: 1,
    layouts: paLayoutCatalog,
    backgrounds:{presets:bgEngine.names,options:bgEngine.schema(),defaults:bgEngine.defaults,usage:'Optional background object at presentation and/or slide level. Slide objects override the complete presentation effect. Use effect none to remove it, or mode static for reduced motion. Use Studio 0.12.0+ for effect-enabled native v3 projects; no custom code or external assets.'},
    backdrops:{version:2,options:cbEngine.schema(),usage:'Use authoring version 2 and backdrop at presentation/slide level for Theme, Solid, Gradient or Image. Existing background remains decorative effects. Image assets must be included in the editable ZIP; no remote URLs. New background-aware projects use guarded native v4.'},
    elements: {
      heading: { purpose: "A secondary heading; the slide already has a title", fields: ["text", "level"] },
      paragraph: { purpose: "A concise explanation", fields: ["text"] }, list: { purpose: "Related points", fields: ["items"] },
      table: { purpose: "Structured records", fields: ["headers", "rows"] },
      code: { purpose: "Display/copy only; one native Code block per slide", fields: ["text", "language"] },
      "image-placeholder": { purpose: "Image description; add licensed media in Studio", fields: ["text"] },
      ...Object.fromEntries(Object.entries(paWidgetCatalog).map(([type, item]) => [type, {
        name: item.name, purpose: item.purpose, fields: item.authoringFields || item.fields.map(field => field[2]), required: item.required,
      }])),
    },
    selection: "Explicit layout suggestions are checked for compatibility. Auto prefers process/table/code/comparison, then Hero for a short opening, otherwise Flexible. Unsupported suggestions are errors; incompatible choices fall back with a notice. Content is never removed to fit.",
    limits: "See presentation.schema.json. Use short titles, about 50 visible words per slide and 3–5 content elements. Layout fit and facts require review.",
  };
}
function paCapabilityGuide() {
  const catalog = paCatalog();
  return "# Supported layouts and Library elements\n\nGenerated from Studio's shared capability definitions.\n\n" +
    Object.entries(catalog.layouts).map(([id, item]) => `- layout: ${id} — ${item.purpose}; ${item.min}–${item.max} content elements`).join("\n") +
    "\n\n## Element fields\n\n" + Object.entries(catalog.elements).map(([id, item]) => `- type: ${id} — ${item.purpose}. Fields: ${item.fields.join(", ")}.`).join("\n") +
    "\n\n## Background effects\n\n"+catalog.backgrounds.usage+"\nPresets: "+Object.keys(catalog.backgrounds.presets).join(', ')+". Options and bounds are listed in capabilities.json and presentation.schema.json.\n\n" + "\n\n## Custom backdrops (authoring v2)\n\n"+catalog.backdrops.usage+"\nUse presentation-v2.schema.json and custom-backgrounds-v2.json.\n\n" + catalog.selection + "\n\n" + catalog.limits + "\n";
}
