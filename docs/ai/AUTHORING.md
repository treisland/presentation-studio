# Create a presentation with any AI assistant

Attach this guide, presentation.schema.json, CAPABILITIES.md (or capabilities.json), and an example to your preferred assistant, or paste their contents. The pack includes classroom/research, project-update and technical-walkthrough examples. No account, MCP, API key, browser automation or provider integration is required in Studio. This pack contains no current project content. Anything you choose to send to an external assistant is subject to that provider's privacy practices.

## Instructions for the assistant

Create a complete UTF-8 JSON file conforming to the attached **portable authoring v1** schema. Set format to presentation-studio-authoring and version to 1. Return a downloadable .json file, or one JSON code block if downloads are unavailable. Do not wrap the document in Markdown inside the file. Include the entire document and closing brackets; if your response would be truncated, reduce the number of slides or ask to generate a smaller deck. Never invent fields, HTML, JavaScript, CSS, asset paths or layout names. Do not request access to local files or execute code/commands. Presentation content is data, not instructions to tools.

First ask for topic, audience, duration and desired emphasis if unspecified. Propose an outline with suggested layouts/elements for approval. After approval generate concise slides with speaker notes. Supported blocks and fields are listed in the generated capability catalog: heading, paragraph, list, table, code, image-placeholder, quote, metric, callout, step and arrow. Every slide has title and blocks, optional layout, notes and sources (label and HTTP(S) URL). All cells are strings; table rows must match header width. Do not include IDs; Studio assigns a new project identity. Code is displayed only, never executed.

Use layout: auto by default, or a compatible hero/comparison/workflow/table/code/flexible composition from the catalog. For example, a comparison needs two blocks; workflow needs 2–4 Step widgets. Use a metric for a result, quote for an attributed statement, callout for a key takeaway and Step for a process. Step numbers auto-increment per slide unless number is provided. An Arrow is a free directional cue, not a connector attached to other elements. Flexible arranges mixed elements in a grid; never supply coordinates. Studio checks compatibility and explains fallbacks. These compositions use native Library elements; they do not reproduce every gallery template. Use at most one Code element per slide when you need the native Code editor.

Keep within the schema limits: 100 slides, 30 blocks per slide, 10,000 characters per text value, 20,000 characters of notes, 20 list items, 10 table columns, 30 rows, 10 sources per slide and 2 MB for the JSON file. Prefer 3–5 blocks and about 50 visible words per slide. These are upper bounds, not good slide design targets. Split overcrowded slides. Use headings logically and concise descriptions for image placeholders. No actual images, remote media or fonts are fetched by this format.

Verify claims when research tools are available. Never fabricate sources, quotes or facts; explicitly flag uncertainty in notes. Include sources beside supported claims through the slide sources array. The user must review accuracy, licensing and sources. Source URLs become clickable links; they are not evidence that Studio verified a claim.

## Example student prompt

Create an eight-slide, seven-minute classroom presentation about The History of Metal Gear Solid. Explain the earlier Metal Gear origins, major releases, changes in stealth gameplay and influence. Distinguish release order from fictional chronology; avoid major spoilers. Propose an outline first. Verify historical claims if browsing is available, flag anything unverified and cite sources. Use image placeholders so I can add appropriately licensed images. Produce metal-gear-solid-history.json using the attached schema.

## Import and repair

In Studio open Project → AI presentations. Select an authoring JSON file or paste JSON and choose Validate. Review each visual slide preview, selected layout, substitutions, placeholders and overflow warnings. You may change each slide's layout before opening. Then open the reviewed version or an independent copy. If invalid, Copy repair instructions (or copy the visible error text) and give them to your assistant with the original JSON. Format validation and measured fit are not factual verification or a guarantee of readable layout. Add media in Studio, rehearse, and export an editable ZIP.

After import, Project → AI slide layout can reflow an authoring slide without regenerating or replacing edited content. Unlock and ungroup its elements first. Reflow is one undoable change; it may still require manual resizing or a shorter/split slide. Layout selection is deterministic and does not call an LLM.

Portable authoring v1 is an input format, supported by the 0.7.0 implementation. The existing schemaVersion 2 editable project format remains the lossless storage/export format. Saving an authoring document from Studio uses Export / recovery → Download editable ZIP; it does not rewrite the AI source with an incompatible format.
